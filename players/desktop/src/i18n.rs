//! Langue de l'interface (français ou anglais), choisie au premier démarrage et gardée dans `langue.txt`,
//! dans le dossier des histoires. Les textes sont écrits en français : tr() donne leur traduction anglaise.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};

static ENGLISH: AtomicBool = AtomicBool::new(false);

pub fn english() -> bool {
    ENGLISH.load(Ordering::Relaxed)
}

fn file(lib: &Path) -> PathBuf {
    lib.join("langue.txt")
}

/// Applique la langue enregistrée ; faux au premier démarrage (aucun choix enregistré).
pub fn load(lib: &Path) -> bool {
    match std::fs::read_to_string(file(lib)).as_deref().map(str::trim) {
        Ok("en") => { ENGLISH.store(true, Ordering::Relaxed); true }
        Ok("fr") => { ENGLISH.store(false, Ordering::Relaxed); true }
        _ => false,
    }
}

pub fn choose(lib: &Path, english: bool) {
    ENGLISH.store(english, Ordering::Relaxed);
    // Sans droit d'écriture, le choix ne vaut que pour cette fois.
    if let Err(e) = std::fs::write(file(lib), if english { "en" } else { "fr" }) { eprintln!("langue.txt : {e}"); }
}

/// Remplace chaque « {} » par l'argument suivant.
pub fn fill(template: &str, args: &[&str]) -> String {
    let mut out = template.to_string();
    for a in args { out = out.replacen("{}", a, 1); }
    out
}

pub fn tr(fr: &'static str) -> &'static str {
    if english() { en(fr).unwrap_or(fr) } else { fr }
}

fn en(fr: &str) -> Option<&'static str> {
    Some(match fr {
        // Bibliothèque
        "Mes histoires" => "My stories",
        "⟳ Actualiser" => "⟳ Refresh",
        "Glisse un fichier .aistory dans cette fenêtre pour l'ajouter · dossier : {}" => "Drop a .aistory file into this window to add it · folder: {}",
        "Aucune histoire pour l'instant." => "No stories yet.",
        "Dans Herodio Studio : « Exporter mon histoire » → Windows ou Raspberry Pi." => "In Herodio Studio: “Export my story” → Windows or Raspberry Pi.",
        "par {}" => "by {}",
        "Aucune sortie audio trouvée : les histoires seront muettes." => "No audio output found: the stories will be silent.",
        "Impossible d'ouvrir {} : {}" => "Cannot open {}: {}",
        "Histoire ajoutée : {}" => "Story added: {}",
        "{} n'a pas pu être ajoutée : {}" => "{} could not be added: {}",
        "Herodio — Lecteur d'histoires" => "Herodio — Story player",
        // Lecture
        "◀  Mes histoires" => "◀  My stories",
        "Suivant  ▶" => "Next  ▶",
        "⟲  Rejouer" => "⟲  Play again",
        "🔊 Réécouter" => "🔊 Listen again",
        "Flèches : choisir · Entrée : valider · 1-9 : réponse directe · E : réécouter · R : recommencer · Échap : retour · F11 : plein écran" =>
            "Arrows: choose · Enter: confirm · 1-9: pick an answer · E: listen again · R: start again · Esc: back · F11: full screen",
        "Choix {}" => "Choice {}",
        "Oups !" => "Oops!",
        "Cette histoire tourne en rond sans fin. Demande à son auteur de la vérifier." => "This story goes round in circles forever. Ask its author to check it.",
        "Fin" => "The end",
        "L'histoire s'arrête ici." => "The story stops here.",
        "Fin heureuse" => "Happy ending",
        "Fin triste" => "Sad ending",
        "Fin secrète !" => "Secret ending!",
        // Mode console
        "Sac : {}" => "Bag: {}",
        "[Entrée] suivant  [E] réécouter  [Échap] menu" => "[Enter] next  [E] listen again  [Esc] menu",
        "[↑↓] choisir  [Entrée] valider  [E] réécouter  [Échap] menu" => "[↑↓] choose  [Enter] confirm  [E] listen again  [Esc] menu",
        "[Entrée] rejouer   [Échap] menu" => "[Enter] play again   [Esc] menu",
        "== HERODIO - Mes histoires ==" => "== HERODIO - My stories ==",
        "Aucune histoire. Copie des fichiers .aistory dans {}" => "No stories. Copy .aistory files into {}",
        "[↑↓] choisir  [Entrée] écouter  [L] langue  [q] quitter" => "[↑↓] choose  [Enter] listen  [L] language  [q] quit",
        // Erreurs
        "Erreur : {}" => "Error: {}",
        "Impossible d'ouvrir la fenêtre ({}). Essaie : herodio-player --console" => "Cannot open the window ({}). Try: herodio-player --console",
        "story.json invalide : {}" => "invalid story.json: {}",
        "ce n'est pas une histoire Herodio" => "this is not a Herodio story",
        "histoire créée avec une version plus récente d'Herodio" => "story made with a newer version of Herodio",
        "chemin refusé : {}" => "path refused: {}",
        "archive abîmée : {}" => "damaged archive: {}",
        "Histoire ignorée {} : {}" => "Story skipped {}: {}",
        "importe un fichier .aistory" => "import a .aistory file",
        "nom de fichier invalide" => "invalid file name",
        "Pas de sortie audio : {}" => "No audio output: {}",
        "Son illisible : {}" => "Unreadable sound: {}",
        _ => return None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Chaque tr("…") du code a sa traduction, avec autant de « {} ».
    #[test]
    fn tout_est_traduit() {
        let sources = [include_str!("gui.rs"), include_str!("console.rs"), include_str!("session.rs"), include_str!("pack.rs"), include_str!("audio.rs"), include_str!("main.rs")];
        let mut n = 0;
        for src in sources {
            for part in src.split("tr(\"").skip(1) {
                let key = &part[..part.find("\")").expect("tr(\"…\") non fermé")];
                let t = en(key).unwrap_or_else(|| panic!("traduction manquante : {key}"));
                assert_eq!(key.matches("{}").count(), t.matches("{}").count(), "{key}");
                n += 1;
            }
        }
        assert!(n >= 40, "seulement {n} textes trouvés");
    }

    #[test]
    fn remplit_les_trous() {
        assert_eq!(fill("{} n'a pas pu être ajoutée : {}", &["a.aistory", "zip"]), "a.aistory n'a pas pu être ajoutée : zip");
    }
}
