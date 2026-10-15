// Tests de conformance du moteur C++ sur PC.
// g++ -std=c++17 -I src -I .pio/libdeps/cardputer/ArduinoJson/src test/host_conformance.cpp -o conformance && ./conformance ../../spec/conformance
#include "engine.h"
#include <dirent.h>
#include <fstream>
#include <iostream>
#include <sstream>

int main(int argc, char** argv) {
    std::string dir = argc > 1 ? argv[1] : "../../spec/conformance";
    DIR* d = opendir(dir.c_str());
    if (!d) { std::cerr << "dossier introuvable : " << dir << "\n"; return 1; }
    int ok = 0, fail = 0;
    while (dirent* e = readdir(d)) {
        std::string name = e->d_name;
        if (name.size() < 5 || name.substr(name.size() - 5) != ".json") continue;
        std::ifstream f(dir + "/" + name);
        std::stringstream ss; ss << f.rdbuf();
        std::string text = ss.str();
        JsonDocument c;
        deserializeJson(c, text);
        std::string storyJson;
        serializeJson(c["story"], storyJson);
        herodio::Story s;
        std::string err = herodio::parse(storyJson.c_str(), storyJson.size(), s);
        if (!err.empty()) { std::cerr << name << " : " << err << "\n"; fail++; continue; }
        herodio::Engine eng(s);
        eng.start();
        std::vector<std::string> trace{eng.token()};
        for (JsonVariant in : c["inputs"].as<JsonArray>()) {
            std::string i = in.as<const char*>();
            if (i == "next") eng.next();
            else if (i == "restart") eng.start();
            else eng.choose(std::stoul(i.substr(7)));
            trace.push_back(eng.token());
        }
        bool good = true;
        JsonArray exp = c["trace"];
        if (exp.size() != trace.size()) good = false;
        for (size_t i = 0; good && i < trace.size(); i++) if (trace[i] != exp[i].as<const char*>()) good = false;
        std::vector<std::string> items = eng.items, want;
        for (JsonVariant v : c["final"]["items"].as<JsonArray>()) want.push_back(v.as<const char*>());
        std::sort(items.begin(), items.end());
        std::sort(want.begin(), want.end());
        if (items != want) good = false;
        for (JsonPair kv : c["final"]["vars"].as<JsonObject>()) if (eng.vars[kv.key().c_str()] != kv.value().as<int>()) good = false;
        if (good) ok++; else { fail++; std::cerr << "ÉCHEC " << name << "\n"; }
    }
    closedir(d);
    std::cout << "Conformance C++ : " << ok << " OK, " << fail << " échec(s)\n";
    return fail || ok < 4;
}
