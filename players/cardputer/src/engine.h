// Moteur narratif Herodio — portage C++ (ESP32 et PC) de editor/src/engine/engine.ts.
// Mêmes règles, vérifiées par test/host_conformance.cpp sur spec/conformance/*.json.
#pragma once
#include <ArduinoJson.h>
#include <algorithm>
#include <map>
#include <set>
#include <string>
#include <vector>

namespace herodio {

struct Option { std::string text, audio, next; };

struct Test { std::string kind, item, var, op, node; int value = 0; };

struct Node {
    std::string id, type, title, text, audio, image, kind, op, item, var, next, then_, else_, target;
    int value = 0;
    bool reset = false;
    std::vector<Option> options;
    Test test;
};

struct Story {
    std::string id, title, author, description, start, cover, color;
    std::vector<std::pair<std::string, std::string>> items;   // id, nom
    std::vector<std::pair<std::string, int>> variables;       // id, valeur initiale
    std::vector<Node> nodes;
    std::map<std::string, size_t> index;

    std::string itemName(const std::string& id) const {
        for (auto& i : items) if (i.first == id) return i.second;
        return id;
    }
};

inline std::string str(JsonVariantConst v) { return v.is<const char*>() ? std::string(v.as<const char*>()) : std::string(); }

/// Lit story.json. Renvoie un message d'erreur, ou une chaîne vide si tout va bien.
inline std::string parse(const char* json, size_t len, Story& s) {
    JsonDocument doc;
    DeserializationError e = deserializeJson(doc, json, len);
    if (e) return std::string("story.json illisible : ") + e.c_str();
    if (str(doc["format"]) != "herodio-story") return "ce n'est pas une histoire Herodio";
    if ((doc["version"] | 1) > 1) return "histoire trop récente pour ce lecteur";
    s = Story();
    s.id = str(doc["id"]); s.title = str(doc["title"]); s.author = str(doc["author"]);
    s.description = str(doc["description"]); s.start = str(doc["start"]);
    s.cover = str(doc["cover"]); s.color = str(doc["color"]);
    for (JsonObjectConst i : doc["items"].as<JsonArrayConst>()) s.items.push_back({str(i["id"]), str(i["name"])});
    for (JsonObjectConst v : doc["variables"].as<JsonArrayConst>()) s.variables.push_back({str(v["id"]), v["initial"] | 0});
    for (JsonObjectConst j : doc["nodes"].as<JsonArrayConst>()) {
        Node n;
        n.id = str(j["id"]); n.type = str(j["type"]); n.title = str(j["title"]); n.text = str(j["text"]);
        n.audio = str(j["audio"]); n.image = str(j["image"]); n.kind = str(j["kind"]); n.op = str(j["op"]); n.item = str(j["item"]);
        n.var = str(j["var"]); n.value = j["value"] | 0; n.next = str(j["next"]); n.then_ = str(j["then"]);
        n.else_ = str(j["else"]); n.target = str(j["target"]); n.reset = j["reset"] | false;
        for (JsonObjectConst o : j["options"].as<JsonArrayConst>()) n.options.push_back({str(o["text"]), str(o["audio"]), str(o["next"])});
        JsonObjectConst t = j["test"];
        if (!t.isNull()) {
            n.test.kind = str(t["kind"]); n.test.item = str(t["item"]); n.test.var = str(t["var"]);
            n.test.op = str(t["op"]); n.test.node = str(t["node"]); n.test.value = t["value"] | 0;
        }
        s.index[n.id] = s.nodes.size();
        s.nodes.push_back(std::move(n));
    }
    return "";
}

enum Status { PLAYING, END, ERROR };

class Engine {
public:
    static const int MAX_AUTO_STEPS = 1000;
    const Story* story = nullptr;
    const Node* node = nullptr;
    Status status = END;
    std::vector<std::string> items;
    std::map<std::string, int> vars;

    explicit Engine(const Story& s) : story(&s) {}

    void start() { reset(); go(story->start); }

    void next() {
        if (status == PLAYING && node && node->type == "scene") go(node->next);
    }

    void choose(size_t i) {
        if (status == PLAYING && node && node->type == "choice" && i < node->options.size()) go(node->options[i].next);
    }

    std::string token() const {
        if (status == ERROR) return "#error";
        return node ? node->id : "#end";
    }

private:
    std::set<std::string> visited;

    void reset() {
        items.clear();
        vars.clear();
        for (auto& v : story->variables) vars[v.first] = v.second;
        visited.clear();
    }

    int var(const std::string& id) const {
        auto it = vars.find(id);
        return it == vars.end() ? 0 : it->second;
    }

    bool test(const Test& t) const {
        if (t.kind == "item") return std::find(items.begin(), items.end(), t.item) != items.end();
        if (t.kind == "visited") return visited.count(t.node) > 0;
        if (t.kind == "var") {
            int a = var(t.var), b = t.value;
            if (t.op == "==") return a == b;
            if (t.op == "!=") return a != b;
            if (t.op == "<") return a < b;
            if (t.op == "<=") return a <= b;
            if (t.op == ">") return a > b;
            if (t.op == ">=") return a >= b;
        }
        return false;
    }

    void go(std::string id) {
        for (int steps = 0; steps <= MAX_AUTO_STEPS; steps++) {
            auto it = id.empty() ? story->index.end() : story->index.find(id);
            if (it == story->index.end()) { node = nullptr; status = END; return; }
            const Node& n = story->nodes[it->second];
            visited.insert(n.id);
            if (n.type == "scene" || n.type == "choice") { node = &n; status = PLAYING; return; }
            if (n.type == "end") { node = &n; status = END; return; }
            if (n.type == "item") {
                auto f = std::find(items.begin(), items.end(), n.item);
                if (n.op == "give") { if (f == items.end()) items.push_back(n.item); }
                else if (f != items.end()) items.erase(f);
                id = n.next;
            } else if (n.type == "var") {
                // Débordement sur 32 bits comme les autres moteurs (calcul non signé, sans comportement indéfini).
                vars[n.var] = (int)((unsigned)(n.op == "set" ? 0 : var(n.var)) + (unsigned)n.value);
                id = n.next;
            } else if (n.type == "cond") {
                id = test(n.test) ? n.then_ : n.else_;
            } else if (n.type == "jump") {
                if (n.reset) reset();
                id = n.target;
            } else {
                break;  // type de bloc inconnu : erreur
            }
        }
        node = nullptr;
        status = ERROR;
    }
};

}  // namespace herodio
