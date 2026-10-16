// Chaque tr("…") du firmware a sa traduction anglaise (et engine.h renvoie des messages traduisibles).
// g++ -std=c++17 -I src test/host_i18n.cpp -o i18n && ./i18n src
#include "i18n.h"
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>

static std::string read(const std::string& path) {
    std::ifstream f(path);
    std::stringstream ss; ss << f.rdbuf();
    return ss.str();
}

int main(int argc, char** argv) {
    std::string dir = argc > 1 ? argv[1] : "src";
    int n = 0, bad = 0;
    std::string src = read(dir + "/main.cpp");
    for (size_t i = src.find("tr(\""); i != std::string::npos; i = src.find("tr(\"", i + 1)) {
        size_t a = i + 4, b = src.find("\")", a);
        std::string fr = src.substr(a, b - a);
        n++;
        if (!herodio::english(fr.c_str())) { std::cout << "✘ main.cpp : " << fr << "\n"; bad++; }
    }
    // Messages d'erreur renvoyés par parse() (engine.h)
    for (const char* fr : {"story.json illisible : ", "ce n'est pas une histoire Herodio", "histoire trop récente pour ce lecteur"}) {
        if (read(dir + "/engine.h").find(fr) == std::string::npos) { std::cout << "✘ engine.h ne contient plus : " << fr << "\n"; bad++; }
        if (!herodio::english(fr)) { std::cout << "✘ engine.h : " << fr << "\n"; bad++; }
    }
    herodio::englishFlag() = true;
    if (std::string(herodio::tr("Fin")) != "The end" || std::string(herodio::tr("inconnu")) != "inconnu") { std::cout << "✘ tr()\n"; bad++; }
    if (n < 20) { std::cout << "✘ seulement " << n << " textes trouvés\n"; bad++; }
    std::cout << (bad ? "ÉCHEC" : "OK") << " : " << n << " textes du firmware\n";
    return bad ? 1 : 0;
}
