// Langue de l'interface du Cardputer (français ou anglais). Les textes sont écrits en français dans le code :
// tr() donne leur traduction anglaise. Sans Arduino : testé sur PC par test/host_i18n.cpp.
#pragma once
#include <cstring>

namespace herodio {

inline bool& englishFlag() { static bool on = false; return on; }

static const char* const EN[][2] = {
    // Bibliothèque
    {"OK : écouter", "OK: listen"},
    {"Herodio - Mes histoires", "Herodio - My stories"},
    {"Insère la carte microSD contenant le dossier « herodio ».", "Insert the microSD card containing the “herodio” folder."},
    {"Aucune histoire. Exporte une histoire pour « Cardputer ADV » et décompresse-la à la racine de la carte.",
     "No stories. Export a story for “Cardputer ADV” and unzip it at the root of the card."},
    {";/. choisir  OK écouter  -/= volume  l langue", ";/. choose  OK listen  -/= volume  l language"},
    {"Histoire illisible ou trop grande", "Story unreadable or too big"},
    // Lecture
    {"OK : rejouer   t : texte   Del : menu", "OK: play again   t: text   Del: menu"},
    {"OK : suivant   t : texte   Del : menu", "OK: next   t: text   Del: menu"},
    {"Sac: ", "Bag: "},
    {"Oups !", "Oops!"},
    {"Boucle sans fin", "Endless loop"},
    {"Fin", "The end"},
    {"Fin heureuse", "Happy ending"},
    {"Fin triste", "Sad ending"},
    {"Fin secrète !", "Secret ending!"},
    {"Cette histoire tourne en rond. Demande à son auteur de la vérifier.", "This story goes round in circles. Ask its author to check it."},
    {"L'histoire s'arrête ici.", "The story stops here."},
    {"Choix ", "Choice "},
    {"Mon sac", "My bag"},
    {"(vide)", "(empty)"},
    {"OK rejouer  e réécouter  Del menu", "OK play again  e listen  Del menu"},
    {";/. choisir  OK valider  e réécouter  Del menu", ";/. choose  OK confirm  e listen  Del menu"},
    {"OK suivant  e réécouter  t image  Del menu", "OK next  e listen  t picture  Del menu"},
    // Erreurs de lecture de story.json (engine.h)
    {"story.json illisible : ", "unreadable story.json: "},
    {"ce n'est pas une histoire Herodio", "this is not a Herodio story"},
    {"histoire trop récente pour ce lecteur", "story too recent for this player"},
};

/// Traduction anglaise d'un texte français, ou nullptr s'il n'y en a pas.
inline const char* english(const char* fr) {
    for (auto& p : EN) if (!strcmp(p[0], fr)) return p[1];
    return nullptr;
}

inline const char* tr(const char* fr) {
    const char* en = englishFlag() ? english(fr) : nullptr;
    return en ? en : fr;
}

}  // namespace herodio
