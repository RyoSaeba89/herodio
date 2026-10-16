//! Lecture d'un seul son à la fois (les packs sont prémixés).

use rodio::{Decoder, DeviceSinkBuilder, MixerDeviceSink, Player, Source};
use std::io::Cursor;
use std::time::Instant;

pub struct Audio {
    sink: Option<MixerDeviceSink>,
    player: Option<Player>,
    /// Mode muet (HERODIO_MUET) : rien ne sort, mais chaque son « dure » son vrai temps, pour les essais automatiques.
    muted: bool,
    until: Instant,
}

impl Audio {
    /// Sans carte son, le lecteur fonctionne quand même (en silence).
    pub fn new() -> Audio {
        if std::env::var_os("HERODIO_MUET").is_some() { return Audio::muted(); }
        let sink = DeviceSinkBuilder::open_default_sink().map_err(|e| eprintln!("Pas de sortie audio : {e}")).ok().map(|mut s| {
            s.log_on_drop(false);
            s
        });
        Audio { sink, player: None, muted: false, until: Instant::now() }
    }

    pub fn muted() -> Audio {
        Audio { sink: None, player: None, muted: true, until: Instant::now() }
    }

    #[cfg(test)]
    pub fn silent() -> Audio {
        Audio { muted: false, ..Audio::muted() }
    }

    pub fn available(&self) -> bool {
        self.sink.is_some() || self.muted
    }

    pub fn play(&mut self, wav: Vec<u8>) {
        self.stop();
        if self.muted {
            self.until += Decoder::new(Cursor::new(wav)).ok().and_then(|d| d.total_duration()).unwrap_or_default();
            return;
        }
        let Some(sink) = &self.sink else { return };
        match Decoder::new(Cursor::new(wav)) {
            Ok(src) => {
                let p = Player::connect_new(sink.mixer());
                p.append(src);
                self.player = Some(p);
            }
            Err(e) => eprintln!("Son illisible : {e}"),
        }
    }

    pub fn stop(&mut self) {
        // Détruire le lecteur coupe le son.
        self.player = None;
        self.until = Instant::now();
    }

    pub fn busy(&self) -> bool {
        self.player.as_ref().is_some_and(|p| !p.empty()) || Instant::now() < self.until
    }
}
