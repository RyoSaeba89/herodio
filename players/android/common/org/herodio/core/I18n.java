package org.herodio.core;

import java.util.HashMap;
import java.util.Map;

/**
 * Langue de l'interface (français ou anglais). Les textes sont écrits en français dans le code :
 * tr() donne leur traduction anglaise ; chaque « {} » est remplacé par l'argument suivant.
 * Le choix est gardé par l'application (SharedPreferences), qui appelle setEnglish() au démarrage.
 */
public final class I18n {
    private static boolean english;
    static final Map<String, String> EN = new HashMap<String, String>();

    private I18n() {}

    public static boolean english() { return english; }
    public static void setEnglish(boolean on) { english = on; }

    public static String tr(String fr, Object... args) {
        String s = english && EN.containsKey(fr) ? EN.get(fr) : fr;
        for (Object a : args) {
            int i = s.indexOf("{}");
            if (i < 0) break;
            s = s.substring(0, i) + a + s.substring(i + 2);
        }
        return s;
    }

    private static void en(String fr, String en) { EN.put(fr, en); }

    static {
        // Bibliothèque
        en("Mes histoires", "My stories");
        en("+  Ajouter une histoire", "+  Add a story");
        en("Copie tes fichiers .aistory dans le dossier « Herodio » de la carte SD, puis relance l'application.",
            "Copy your .aistory files into the “Herodio” folder on the SD card, then restart the app.");
        en("Aucune histoire pour l'instant. Crée-en une avec Herodio Studio, puis « Exporter mon histoire » → Android.",
            "No stories yet. Make one with Herodio Studio, then “Export my story” → Android.");
        en("Appui long sur une histoire pour la supprimer.", "Long-press a story to delete it.");
        en("par {}", "by {}");
        en("Supprimer « {} » ?", "Delete “{}”?");
        en("Supprimer", "Delete");
        en("Annuler", "Cancel");
        en("{} nouvelle(s) histoire(s) ajoutée(s)", "{} new story(ies) added");
        en("Ajout de l'histoire…", "Adding the story…");
        en("Histoire ajoutée : {}", "Story added: {}");
        en("Ce fichier n'est pas une histoire Herodio valide.", "This file is not a valid Herodio story.");
        // Lecture
        en("Sac : {}", "Bag: {}");
        en("Suivant  ▶", "Next  ▶");
        en("Rejouer", "Play again");
        en("♪ Réécouter", "♪ Listen again");
        en("Choix {}", "Choice {}");
        en("Oups !", "Oops!");
        en("Fin", "The end");
        en("Cette histoire tourne en rond sans fin. Demande à son auteur de la vérifier.",
            "This story goes round in circles forever. Ask its author to check it.");
        en("L'histoire s'arrête ici.", "The story stops here.");
        en("Fin heureuse", "Happy ending");
        en("Fin triste", "Sad ending");
        en("Fin secrète !", "Secret ending!");
    }
}
