//! Lecteur Herodio — Windows, Linux, Raspberry Pi.
//!
//! herodio-player [--console] [--fullscreen] [histoire.aistory]
#![cfg_attr(all(not(debug_assertions), windows), windows_subsystem = "windows")]

mod audio;
mod console;
mod engine;
mod gui;
mod i18n;
mod pack;
mod session;

use i18n::{fill, tr};
use std::path::PathBuf;

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let open = args.iter().find(|a| !a.starts_with("--")).map(PathBuf::from);
    let fullscreen = args.iter().any(|a| a == "--fullscreen");
    // Langue enregistrée ; au premier démarrage, l'interface la demande.
    let chosen = i18n::load(&pack::library_dir());
    if args.iter().any(|a| a == "--console") {
        if let Err(e) = console::run(open, chosen) { eprintln!("{}", fill(tr("Erreur : {}"), &[&e.to_string()])); }
    } else if let Err(e) = gui::run(open, fullscreen, chosen) {
        eprintln!("{}", fill(tr("Impossible d'ouvrir la fenêtre ({}). Essaie : herodio-player --console"), &[&e.to_string()]));
    }
}
