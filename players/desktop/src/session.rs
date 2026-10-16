//! Une partie en cours : moteur + son. Partagé par l'interface graphique et le mode console.

use crate::audio::Audio;
use crate::engine::{Engine, Node, Status};
use crate::pack::Pack;

pub struct Session {
    pub pack: Pack,
    pub engine: Engine,
    /// Réponse surlignée dans un choix (navigation au clavier ou aux boutons GPIO).
    pub selected: usize,
    /// Ce qui est lu à voix haute : 0 = le texte, i + 1 = la réponse i.
    pub reading: Option<usize>,
    /// Lecture enchaînée du texte puis de chaque réponse ; coupée dès qu'on choisit soi-même une réponse.
    chain: bool,
}

impl Session {
    pub fn new(pack: Pack, audio: &mut Audio) -> Session {
        let engine = Engine::new(pack.story.clone());
        let mut s = Session { pack, engine, selected: 0, reading: None, chain: false };
        s.restart(audio);
        s
    }

    pub fn restart(&mut self, audio: &mut Audio) {
        self.engine.start();
        self.enter(audio);
    }

    fn enter(&mut self, audio: &mut Audio) {
        self.selected = 0;
        self.chain = true;
        self.read_from(0, audio);
    }

    fn item_audio(&self, k: usize) -> Option<String> {
        match (k, self.engine.current()) {
            (0, n) => n.and_then(|n| n.audio()).map(str::to_owned),
            (_, Some(Node::Choice { options, .. })) => options.get(k - 1).and_then(|o| o.audio.clone()),
            _ => None,
        }
    }

    /// Joue l'élément k (0 = texte, i + 1 = réponse i) ; faux s'il est muet.
    fn play_item(&mut self, k: usize, audio: &mut Audio) -> bool {
        audio.stop();
        self.reading = None;
        let Some(path) = self.item_audio(k) else { return false };
        match self.pack.read(&path) {
            Ok(wav) if audio.available() => {
                audio.play(wav);
                self.reading = Some(k);
                true
            }
            Ok(_) => false,
            Err(e) => { eprintln!("{e}"); false }
        }
    }

    /// Lit le premier élément sonore à partir de k, en surlignant la réponse lue.
    fn read_from(&mut self, k: usize, audio: &mut Audio) {
        for k in k..=self.options().len() {
            if self.play_item(k, audio) {
                if k > 0 { self.selected = k - 1; }
                return;
            }
        }
        self.selected = 0; // tout est lu : la surbrillance revient sur le choix 1
    }

    /// À appeler régulièrement : quand un son se termine, lit la suite ou enchaîne la scène suivante.
    pub fn tick(&mut self, audio: &mut Audio) {
        let Some(k) = self.reading else { return };
        if audio.busy() { return; }
        self.reading = None;
        if matches!(self.engine.current(), Some(Node::Scene { .. })) {
            self.next(audio);
        } else if self.chain {
            self.read_from(k + 1, audio);
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
        self.chain = false;
        self.play_item(self.selected + 1, audio);
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

    /// WAV muet de 30 ms (16 bits, 8 kHz, mono).
    fn wav() -> Vec<u8> {
        let data = 480u32;
        let mut w = b"RIFF".to_vec();
        w.extend((36 + data).to_le_bytes());
        w.extend(b"WAVEfmt ");
        w.extend([16u32.to_le_bytes(), u32::from_le_bytes([1, 0, 1, 0]).to_le_bytes(), 8000u32.to_le_bytes(), 16000u32.to_le_bytes(), u32::from_le_bytes([2, 0, 16, 0]).to_le_bytes()].concat());
        w.extend(b"data");
        w.extend(data.to_le_bytes());
        w.extend(vec![0u8; data as usize]);
        w
    }

    #[test]
    fn lit_le_texte_puis_chaque_reponse() {
        let p = castle_pack("lecture");
        let mut story: serde_json::Value = serde_json::from_slice(&p.read("story.json").unwrap()).unwrap();
        story["nodes"][1]["audio"] = "q.wav".into();
        story["nodes"][1]["options"][0]["audio"] = "a.wav".into();
        story["nodes"][1]["options"][1]["audio"] = "b.wav".into();
        std::fs::write(p.path.join("story.json"), story.to_string()).unwrap();
        for f in ["q.wav", "a.wav", "b.wav"] { std::fs::write(p.path.join(f), wav()).unwrap(); }
        let wait = |s: &mut Session, a: &mut Audio| { std::thread::sleep(std::time::Duration::from_millis(40)); s.tick(a); };

        let mut a = Audio::muted();
        let mut s = Session::new(Pack::open(&p.path).unwrap(), &mut a);
        s.confirm(&mut a); // scène muette → choix
        assert_eq!((s.reading, s.selected), (Some(0), 0)); // la question
        wait(&mut s, &mut a);
        assert_eq!((s.reading, s.selected), (Some(1), 0)); // « La porte »
        wait(&mut s, &mut a);
        assert_eq!((s.reading, s.selected), (Some(2), 1)); // « La forêt »
        wait(&mut s, &mut a);
        assert_eq!((s.reading, s.selected), (None, 0)); // retour sur le choix 1
        assert_eq!(s.engine.token(), "c1"); // on attend la réponse

        s.restart(&mut a);
        s.confirm(&mut a);
        s.select(1, &mut a); // l'enfant choisit lui-même : la lecture enchaînée s'arrête
        assert_eq!(s.reading, Some(2));
        wait(&mut s, &mut a);
        assert_eq!(s.reading, None);
    }

    #[test]
    fn refuse_les_chemins_hors_du_pack() {
        let p = castle_pack("chemins");
        assert!(p.read("../secret.txt").is_err());
        assert!(p.read("/etc/passwd").is_err());
        assert!(p.read("story.json").is_ok());
    }
}
