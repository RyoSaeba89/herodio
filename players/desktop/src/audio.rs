//! Lecture d'un seul son à la fois (les packs sont prémixés).

use rodio::{Decoder, DeviceSinkBuilder, MixerDeviceSink, Player};
use std::io::Cursor;

pub struct Audio {
    sink: Option<MixerDeviceSink>,
    player: Option<Player>,
}

impl Audio {
    /// Sans carte son, le lecteur fonctionne quand même (en silence).
    pub fn new() -> Audio {
        let sink = DeviceSinkBuilder::open_default_sink().map_err(|e| eprintln!("Pas de sortie audio : {e}")).ok().map(|mut s| {
            s.log_on_drop(false);
            s
        });
        Audio { sink, player: None }
    }

    /// Sans sortie audio (tests).
    #[cfg(test)]
    pub fn silent() -> Audio {
        Audio { sink: None, player: None }
    }

    pub fn available(&self) -> bool {
        self.sink.is_some()
    }

    pub fn play(&mut self, wav: Vec<u8>) {
        self.stop();
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
    }

    pub fn busy(&self) -> bool {
        self.player.as_ref().is_some_and(|p| !p.empty())
    }
}
