// Lecteur Herodio pour M5Stack Cardputer / Cardputer ADV.
// Les histoires sont copiées sur la carte microSD dans /herodio/<histoire>/ (export « Cardputer ADV » d'Herodio Studio).
// Le son est prémixé à l'export (WAV PCM 16 bits mono) : un seul flux lu en continu depuis la carte.
#include <SD.h>
#include <SPI.h>
#include <M5Cardputer.h>
#include "engine.h"

using namespace herodio;

// Brochage microSD du Cardputer (identique sur le Cardputer ADV).
static const int SD_SCK = 40, SD_MISO = 39, SD_MOSI = 14, SD_CS = 12;
static const char* ROOT = "/herodio";
static const size_t MAX_STORY_JSON = 256 * 1024;

static M5Canvas canvas(&M5Cardputer.Display);
static uint16_t C_BG, C_INK, C_MUTED, C_ACCENT, C_ORANGE, C_WHITE, C_VIOLET;

// ------------------------------------------------------------------ son

struct AudioStream {
    static const size_t CHUNK = 2048;  // échantillons par tampon (128 ms à 16 kHz)
    File f;
    uint32_t remaining = 0, rate = 16000;
    int16_t buf[3][CHUNK];
    int idx = 0;
    bool active = false;

    bool open(const std::string& path) {
        stop();
        if (path.find("..") != std::string::npos) return false;
        f = SD.open(path.c_str());
        if (!f) return false;
        char id[4];
        uint32_t size;
        if (f.read((uint8_t*)id, 4) != 4 || memcmp(id, "RIFF", 4) || f.read((uint8_t*)&size, 4) != 4 || f.read((uint8_t*)id, 4) != 4 || memcmp(id, "WAVE", 4)) { f.close(); return false; }
        uint16_t channels = 0, bits = 0;
        while (f.read((uint8_t*)id, 4) == 4 && f.read((uint8_t*)&size, 4) == 4) {
            if (!memcmp(id, "fmt ", 4)) {
                uint8_t fmt[16];
                f.read(fmt, 16);
                channels = fmt[2] | fmt[3] << 8;
                rate = fmt[4] | fmt[5] << 8 | fmt[6] << 16 | (uint32_t)fmt[7] << 24;
                bits = fmt[14] | fmt[15] << 8;
                if (size > 16) f.seek(f.position() + size - 16);
            } else if (!memcmp(id, "data", 4)) {
                if (channels != 1 || bits != 16) break;
                remaining = size;
                active = true;
                return true;
            } else {
                f.seek(f.position() + size + (size & 1));
            }
        }
        f.close();
        return false;
    }

    /// À appeler souvent : remplit la file du haut-parleur (2 tampons en attente au plus).
    void pump() {
        while (active && remaining > 0 && M5Cardputer.Speaker.isPlaying(0) < 2) {
            size_t n = f.read((uint8_t*)buf[idx], std::min<uint32_t>(CHUNK * 2, remaining));
            if (n < 2) { remaining = 0; break; }
            M5Cardputer.Speaker.playRaw(buf[idx], n / 2, rate, false, 1, 0, false);
            idx = (idx + 1) % 3;
            remaining -= n;
        }
    }

    bool finished() { return active && remaining == 0 && M5Cardputer.Speaker.isPlaying(0) == 0; }

    void stop() {
        M5Cardputer.Speaker.stop(0);
        if (f) f.close();
        active = false;
        remaining = 0;
    }
};

static AudioStream audio;

// ------------------------------------------------------------------ état

struct Entry { std::string dir, title, cover, color; };
static std::vector<Entry> library;
static int libSel = 0;
static Story story;
static Engine* engine = nullptr;
static std::string storyDir;
static int sel = 0;
static bool scenePlaying = false, showInventory = false, showText = false, dirty = true, sdOk = false;
static std::string message;
static uint8_t volume = 160;

// ------------------------------------------------------------------ dessin

/// Écrit `text` en coupant entre les mots ; renvoie l'ordonnée suivante. Ajoute « … » si tout ne tient pas.
static int drawWrapped(const std::string& text, int x, int y, int w, int maxY, int lineH) {
    std::string line, word;
    auto flush = [&](bool last) {
        if (y + lineH > maxY) return false;
        bool more = !last && y + 2 * lineH > maxY;
        canvas.drawString((more ? line + "…" : line).c_str(), x, y);
        y += lineH;
        line.clear();
        return !more;
    };
    for (size_t i = 0; i <= text.size(); i++) {
        char c = i < text.size() ? text[i] : ' ';
        if (c != ' ' && c != '\n') { word += c; continue; }
        std::string candidate = line.empty() ? word : line + " " + word;
        if (!line.empty() && canvas.textWidth(candidate.c_str()) > w) {
            if (!flush(false)) return y;
            line = word;
        } else {
            line = candidate;
        }
        word.clear();
        if (c == '\n' && !flush(false)) return y;
    }
    if (!line.empty()) flush(true);
    return y;
}

/// Couleur « #rrggbb » de l'histoire, ou la couleur par défaut.
static uint16_t storyColor(const std::string& hex) {
    if (hex.size() != 7 || hex[0] != '#') return C_ACCENT;
    long v = strtol(hex.c_str() + 1, nullptr, 16);
    return canvas.color565((v >> 16) & 255, (v >> 8) & 255, v & 255);
}

/// Affiche une illustration du pack (JPEG 240×135 préparé à l'export). Renvoie faux si elle manque.
static bool drawImage(const std::string& dir, const std::string& rel) {
    if (rel.empty() || rel.find("..") != std::string::npos) return false;
    std::string path = dir + "/" + rel;
    if (!SD.exists(path.c_str())) return false;
    return canvas.drawJpgFile(SD, path.c_str(), 0, 0);
}

/// Bandeau coloré en bas de l'écran, par-dessus l'illustration.
static void band(uint16_t color, const std::string& title, const char* small) {
    canvas.fillRect(0, 103, 240, 32, color);
    canvas.setFont(&fonts::efontJA_14_b);
    canvas.setTextColor(C_WHITE);
    canvas.drawString(title.c_str(), 6, 105);
    canvas.setFont(&fonts::efontJA_10);
    canvas.drawString(small, 6, 123);
}

const char* endLabel(const std::string& k);

static void hint(const char* s) {
    canvas.setFont(&fonts::efontJA_10);
    canvas.setTextColor(C_MUTED);
    canvas.drawString(s, 4, 124);
}

static void drawLibrary() {
    canvas.fillScreen(C_BG);
    if (sdOk && !library.empty()) {
        const Entry& e = library[libSel];
        uint16_t c = storyColor(e.color);
        if (!drawImage(e.dir, e.cover)) canvas.fillScreen(c);
        std::string pos = "< " + std::to_string(libSel + 1) + "/" + std::to_string(library.size()) + " >   OK : écouter";
        band(c, e.title, pos.c_str());
        if (!message.empty()) { canvas.fillRect(0, 0, 240, 16, C_ORANGE); canvas.setTextColor(C_WHITE); canvas.setFont(&fonts::efontJA_12); canvas.drawString(message.c_str(), 4, 1); }
        return;
    }
    canvas.fillRect(0, 0, 240, 18, C_ACCENT);
    canvas.setFont(&fonts::efontJA_14_b);
    canvas.setTextColor(C_WHITE);
    canvas.drawString("Herodio - Mes histoires", 4, 2);
    canvas.setFont(&fonts::efontJA_12);
    if (!sdOk) {
        canvas.setTextColor(C_INK);
        drawWrapped("Insère la carte microSD contenant le dossier « herodio ».", 6, 30, 228, 120, 14);
    } else if (library.empty()) {
        canvas.setTextColor(C_INK);
        drawWrapped("Aucune histoire. Exporte une histoire pour « Cardputer ADV » et décompresse-la à la racine de la carte.", 6, 26, 228, 120, 14);
    }
    int first = std::max(0, libSel - 3);
    for (int i = first; i < (int)library.size() && i < first + 6; i++) {
        int y = 22 + (i - first) * 16;
        if (i == libSel) canvas.fillRoundRect(2, y - 1, 236, 16, 4, C_ORANGE);
        canvas.setTextColor(i == libSel ? C_WHITE : C_INK);
        canvas.drawString(library[i].title.c_str(), 8, y);
    }
    if (!message.empty()) { canvas.setTextColor(C_ORANGE); canvas.drawString(message.c_str(), 4, 110); }
    hint(";/. choisir   OK écouter   -/= volume");
}

const char* endLabel(const std::string& k) {
    if (k == "happy") return "Fin heureuse";
    if (k == "sad") return "Fin triste";
    if (k == "secret") return "Fin secrète !";
    return "Fin";
}

static void drawPlay() {
    canvas.fillScreen(C_BG);
    const Node* cur = engine->node;
    uint16_t color = storyColor(story.color);
    bool picture = cur && !showText && !showInventory && (cur->type == "scene" || cur->type == "end") && drawImage(storyDir, cur->image);
    if (picture) {
        std::string t = cur->title + (audio.active ? "  ♪" : "");
        band(color, t, engine->status != PLAYING ? "OK : rejouer   t : texte   Del : menu" : "OK : suivant   t : texte   Del : menu");
        if (engine->status != PLAYING) {
            canvas.fillRoundRect(4, 4, 120, 18, 6, cur->kind == "secret" ? C_VIOLET : C_ORANGE);
            canvas.setFont(&fonts::efontJA_12);
            canvas.setTextColor(C_WHITE);
            canvas.drawString(endLabel(cur->kind), 10, 6);
        }
        return;
    }
    canvas.fillRect(0, 0, 240, 12, color);
    canvas.setFont(&fonts::efontJA_10);
    canvas.setTextColor(C_WHITE);
    canvas.drawString(story.title.c_str(), 4, 1);
    if (!engine->items.empty()) {
        std::string s = "Sac: " + std::to_string(engine->items.size()) + " (i)";
        canvas.setTextColor(C_WHITE);
        canvas.drawRightString(s.c_str(), 236, 1);
    }
    const Node* n = engine->node;
    int y = 13;
    if (engine->status != PLAYING) {
        canvas.setFont(&fonts::efontJA_12);
        canvas.setTextColor(C_ORANGE);
        canvas.drawString(engine->status == ERROR ? "Oups !" : endLabel(n ? n->kind : ""), 4, y);
        y += 14;
    }
    canvas.setFont(&fonts::efontJA_14_b);
    canvas.setTextColor(C_INK);
    std::string title = engine->status == ERROR ? "Boucle sans fin" : n ? n->title : "Fin";
    if (audio.active) title += "  ♪";
    canvas.drawString(title.c_str(), 4, y);
    y += 17;
    canvas.setFont(&fonts::efontJA_12);
    std::string text = engine->status == ERROR ? "Cette histoire tourne en rond. Demande à son auteur de la vérifier." : n ? n->text : "L'histoire s'arrête ici.";
    size_t nopt = n && engine->status == PLAYING && n->type == "choice" ? n->options.size() : 0;
    int optTop = 122 - (int)std::min<size_t>(nopt, 5) * 15;
    y = drawWrapped(text, 4, y, 232, nopt ? optTop : 122, 13);
    int first = std::max(0, sel - 4);
    for (int i = first; i < (int)nopt && i < first + 5; i++) {
        int oy = optTop + (i - first) * 15;
        if (i == sel) canvas.fillRoundRect(2, oy - 1, 236, 15, 4, C_ORANGE);
        canvas.setTextColor(i == sel ? C_WHITE : C_INK);
        canvas.drawString((std::to_string(i + 1) + " " + n->options[i].text).c_str(), 6, oy);
    }
    if (showInventory) {
        canvas.fillRoundRect(20, 20, 200, 95, 8, C_WHITE);
        canvas.drawRoundRect(20, 20, 200, 95, 8, C_VIOLET);
        canvas.setTextColor(C_VIOLET);
        canvas.drawString("Mon sac", 30, 26);
        canvas.setTextColor(C_INK);
        int iy = 42;
        if (engine->items.empty()) canvas.drawString("(vide)", 30, iy);
        for (auto& it : engine->items) { if (iy > 100) break; canvas.drawString(story.itemName(it).c_str(), 30, iy); iy += 14; }
    }
    if (engine->status != PLAYING) hint("OK rejouer   Del menu");
    else if (nopt) hint(";/. choisir  OK valider  Del menu");
    else hint("OK suivant   t image   Del menu");
}

static void render() {
    if (engine) drawPlay(); else drawLibrary();
    canvas.pushSprite(0, 0);
    dirty = false;
}

// ------------------------------------------------------------------ histoires

static void scanLibrary() {
    library.clear();
    File root = SD.open(ROOT);
    if (!root || !root.isDirectory()) return;
    for (File d = root.openNextFile(); d; d = root.openNextFile()) {
        if (!d.isDirectory()) continue;
        std::string dir = std::string(ROOT) + "/" + d.name();
        File f = SD.open((dir + "/story.json").c_str());
        if (!f) continue;
        JsonDocument filter, doc;
        filter["title"] = true;
        filter["cover"] = true;
        filter["color"] = true;
        if (!deserializeJson(doc, f, DeserializationOption::Filter(filter))) library.push_back({dir, doc["title"] | d.name(), doc["cover"] | "", doc["color"] | ""});
        f.close();
    }
    std::sort(library.begin(), library.end(), [](const Entry& a, const Entry& b) { return a.title < b.title; });
    libSel = std::min(libSel, std::max(0, (int)library.size() - 1));
}

static void enter() {
    sel = 0;
    showInventory = false;
    showText = false;
    const Node* n = engine->node;
    scenePlaying = false;
    audio.stop();
    if (n && !n->audio.empty() && audio.open(storyDir + "/" + n->audio)) scenePlaying = n->type == "scene";
    dirty = true;
}

static void playOption() {
    const Node* n = engine->node;
    scenePlaying = false;
    audio.stop();
    if (n && n->type == "choice" && sel < (int)n->options.size() && !n->options[sel].audio.empty()) audio.open(storyDir + "/" + n->options[sel].audio);
    dirty = true;
}

static void openStory(const Entry& e) {
    message.clear();
    File f = SD.open((e.dir + "/story.json").c_str());
    if (!f || f.size() > MAX_STORY_JSON) { message = "Histoire illisible ou trop grande"; dirty = true; return; }
    std::string json(f.size(), '\0');
    f.read((uint8_t*)&json[0], json.size());
    f.close();
    std::string err = parse(json.data(), json.size(), story);
    if (!err.empty()) { message = err; dirty = true; return; }
    storyDir = e.dir;
    delete engine;
    engine = new Engine(story);
    engine->start();
    enter();
}

static void closeStory() {
    audio.stop();
    delete engine;
    engine = nullptr;
    story = Story();
    scanLibrary();
    dirty = true;
}

static void confirm() {
    const Node* n = engine->node;
    if (engine->status == PLAYING && n->type == "scene") engine->next();
    else if (engine->status == PLAYING) engine->choose(sel);
    else engine->start();
    enter();
}

static void move(int d) {
    if (engine) {
        const Node* n = engine->node;
        if (engine->status != PLAYING || n->type != "choice" || n->options.empty()) return;
        int k = n->options.size();
        sel = ((sel + d) % k + k) % k;
        playOption();
    } else if (!library.empty()) {
        int k = library.size();
        libSel = ((libSel + d) % k + k) % k;
        dirty = true;
    }
}

// ------------------------------------------------------------------ Arduino

void setup() {
    auto cfg = M5.config();
    M5Cardputer.begin(cfg, true);
    M5Cardputer.Display.setRotation(1);
    M5Cardputer.Speaker.setVolume(volume);
    canvas.createSprite(240, 135);
    C_BG = canvas.color565(244, 241, 234); C_INK = canvas.color565(38, 35, 58); C_MUTED = canvas.color565(110, 106, 133);
    C_ACCENT = canvas.color565(91, 91, 214); C_ORANGE = canvas.color565(242, 138, 28); C_WHITE = TFT_WHITE; C_VIOLET = canvas.color565(139, 92, 246);
    SPI.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);
    sdOk = SD.begin(SD_CS, SPI, 25000000);
    if (sdOk) scanLibrary();
    render();
}

void loop() {
    M5Cardputer.update();
    audio.pump();

    if (engine && audio.finished()) {
        audio.stop();
        if (scenePlaying) { engine->next(); enter(); } else dirty = true;
    }

    if (!sdOk) {
        static uint32_t last = 0;
        if (millis() - last > 2000) { last = millis(); sdOk = SD.begin(SD_CS, SPI, 25000000); if (sdOk) { scanLibrary(); dirty = true; } }
    }

    if (M5Cardputer.BtnA.wasPressed()) { if (engine) confirm(); else if (!library.empty()) openStory(library[libSel]); }

    if (M5Cardputer.Keyboard.isChange() && M5Cardputer.Keyboard.isPressed()) {
        auto ks = M5Cardputer.Keyboard.keysState();
        if (ks.enter) { if (engine) confirm(); else if (!library.empty()) openStory(library[libSel]); }
        else if (ks.del) { if (engine) closeStory(); }
        for (char c : ks.word) {
            if (c == ';' || c == ',') move(-1);
            else if (c == '.' || c == '/') move(1);
            else if (c == '-' || c == '=') {
                volume = c == '-' ? (volume > 32 ? volume - 32 : 0) : (volume < 223 ? volume + 32 : 255);
                M5Cardputer.Speaker.setVolume(volume);
            } else if (engine && c >= '1' && c <= '9') {
                const Node* n = engine->node;
                if (engine->status == PLAYING && n->type == "choice" && c - '1' < (int)n->options.size()) { engine->choose(c - '1'); enter(); }
            } else if (engine && c == 'r') { engine->start(); enter(); }
            else if (engine && c == 'i') { showInventory = !showInventory; dirty = true; }
            else if (engine && c == 't') { showText = !showText; dirty = true; }
        }
    }

    static bool wasActive = false;
    if (audio.active != wasActive) { wasActive = audio.active; dirty = true; }
    if (dirty) render();
    delay(5);
}
