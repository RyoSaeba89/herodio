//! Lecteur Herodio — Windows, Linux, Raspberry Pi.
//!
//! herodio-player [--console] [--fullscreen] [histoire.aistory]
#![cfg_attr(all(not(debug_assertions), windows), windows_subsystem = "windows")]

mod audio;
mod console;
mod engine;
mod gui;
mod pack;
mod session;

use std::path::PathBuf;

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let open = args.iter().find(|a| !a.starts_with("--")).map(PathBuf::from);
    let fullscreen = args.iter().any(|a| a == "--fullscreen");
    if args.iter().any(|a| a == "--console") {
        if let Err(e) = console::run(open) { eprintln!("Erreur : {e}"); }
    } else if let Err(e) = gui::run(open, fullscreen) {
        eprintln!("Impossible d'ouvrir la fenêtre ({e}). Essaie : herodio-player --console");
    }
}
