//! Une partie en cours : moteur + son. Partagé par l'interface graphique et le mode console.

use crate::audio::Audio;
use crate::engine::{Engine, Node, Status};
use crate::pack::Pack;

pub struct Session {
    pub pack: Pack,
    pub engine: Engine,
    /// Réponse surlignée dans un choix (navigation au clavier ou aux boutons GPIO).
    pub selected: usize,
    /// Vrai pendant la lecture du son de la scène : à la fin, on passe automatiquement à la suite.
    scene_playing: bool,
}

impl Session {
    pub fn new(pack: Pack, audio: &mut Audio) -> Session {
        let engine = Engine::new(pack.story.clone());
        let mut s = Session { pack, engine, selected: 0, scene_playing: false };
        s.restart(audio);
        s
    }

    pub fn restart(&mut self, audio: &mut Audio) {
        self.engine.start();
        self.enter(audio);
    }

    fn enter(&mut self, audio: &mut Audio) {
        self.selected = 0;
        self.scene_playing = false;
        audio.stop();
        let Some(path) = self.engine.current().and_then(|n| n.audio()).map(str::to_owned) else { return };
        match self.pack.read(&path) {
            Ok(wav) => {
                audio.play(wav);
                self.scene_playing = audio.available() && matches!(self.engine.current(), Some(Node::Scene { .. }));
            }
            Err(e) => eprintln!("{e}"),
        }
    }

    /// À appeler régulièrement : enchaîne la scène suivante quand son son est terminé.
    pub fn tick(&mut self, audio: &mut Audio) {
        if self.scene_playing && !audio.busy() {
            self.next(audio);
        }
    }

    pub fn next(&mut self, audio: &mut Audio) {
        if matches!(self.engine.current(), Some(Node::Scene { .. })) {
            self.engine.next();
            self.enter(audio);
        }
    }

    pub fn choose(&mut self, i: usize, audio: &mut Audio) {
        if i < self.options().len() {
            self.engine.choose(i);
            self.enter(audio);
        }
    }

    /// Déplace la surbrillance et fait entendre la réponse (comme la molette d'une boîte à histoires).
    pub fn select(&mut self, delta: i32, audio: &mut Audio) {
        let n = self.options().len() as i32;
        if n == 0 { return; }
        self.selected = (self.selected as i32 + delta).rem_euclid(n) as usize;
        self.play_option(audio);
    }

    pub fn play_option(&mut self, audio: &mut Audio) {
        if let Some(Node::Choice { options, .. }) = self.engine.current() {
            if let Some(path) = options.get(self.selected).and_then(|o| o.audio.clone()) {
                if let Ok(wav) = self.pack.read(&path) { audio.play(wav); }
            }
        }
    }

    /// Valide : passe la scène, choisit la réponse surlignée, ou rejoue après la fin.
    pub fn confirm(&mut self, audio: &mut Audio) {
        match (self.engine.status, self.engine.current()) {
            (Status::Playing, Some(Node::Scene { .. })) => self.next(audio),
            (Status::Playing, Some(Node::Choice { .. })) => self.choose(self.selected, audio),
            _ => self.restart(audio),
        }
    }

    pub fn options(&self) -> Vec<String> {
        match self.engine.current() {
            Some(Node::Choice { options, .. }) => options.iter().enumerate().map(|(i, o)| if o.text.is_empty() { format!("Choix {}", i + 1) } else { o.text.clone() }).collect(),
            _ => vec![],
        }
    }

    pub fn title_text(&self) -> (String, String) {
        match (self.engine.status, self.engine.current()) {
            (Status::Error, _) => ("Oups !".into(), "Cette histoire tourne en rond sans fin. Demande à son auteur de la vérifier.".into()),
            (_, Some(Node::Scene { title, text, .. } | Node::Choice { title, text, .. } | Node::End { title, text, .. })) => (title.clone(), text.clone()),
            _ => ("Fin".into(), "L'histoire s'arrête ici.".into()),
        }
    }

    pub fn end_kind(&self) -> Option<&str> {
        match self.engine.current() {
            Some(Node::End { kind, .. }) => Some(kind),
            _ if self.engine.status != Status::Playing => Some("other"),
            _ => None,
        }
    }

    pub fn inventory(&self) -> Vec<String> {
        self.engine.items.iter().map(|id| self.engine.story.items.iter().find(|i| &i.id == id).map(|i| i.name.clone()).unwrap_or_else(|| id.clone())).collect()
    }
}

pub fn end_label(kind: &str) -> &'static str {
    match kind {
        "happy" => "Fin heureuse",
        "sad" => "Fin triste",
        "secret" => "Fin secrète !",
        _ => "Fin",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Un pack décompressé (comme sur une carte SD) avec l'histoire de conformance n°2.
    fn castle_pack(name: &str) -> Pack {
        let dir = std::env::temp_dir().join(format!("herodio-test-{}-{name}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let c: serde_json::Value = serde_json::from_str(include_str!("../../../spec/conformance/02-inventaire.json")).unwrap();
        std::fs::write(dir.join("story.json"), c["story"].to_string()).unwrap();
        Pack::open(&dir).unwrap()
    }

    #[test]
    fn partie_au_clavier() {
        let mut a = Audio::silent();
        let mut s = Session::new(castle_pack("partie"), &mut a);
        assert_eq!(s.title_text().1, "Un château");
        s.confirm(&mut a); // scène → choix
        assert_eq!(s.options(), vec!["La porte", "La forêt"]);
        s.select(1, &mut a); // surbrillance sur « La forêt »
        s.confirm(&mut a);
        assert_eq!(s.title_text().1, "Une clé !");
        assert_eq!(s.inventory(), vec!["Clé"]);
        s.tick(&mut a); // sans son, la scène attend qu'on appuie
        assert_eq!(s.engine.token(), "s_found");
        s.confirm(&mut a);
        s.choose(0, &mut a);
        s.confirm(&mut a);
        assert_eq!(s.end_kind(), Some("happy"));
        s.confirm(&mut a); // après la fin : rejouer
        assert_eq!(s.engine.token(), "s1");
    }

    #[test]
    fn refuse_les_chemins_hors_du_pack() {
        let p = castle_pack("chemins");
        assert!(p.read("../secret.txt").is_err());
        assert!(p.read("/etc/passwd").is_err());
        assert!(p.read("story.json").is_ok());
    }
}
