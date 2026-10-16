//! Mode console : pour un Raspberry Pi sans bureau (petit écran, clavier ou boutons GPIO déclarés comme touches).

use crate::audio::Audio;
use crate::engine::Status;
use crate::pack::{self, Pack};
use crate::session::{end_label, Session};
use crossterm::event::{self, Event, KeyCode, KeyEventKind};
use crossterm::{cursor, execute, style, terminal};
use std::io::{stdout, Write};
use std::path::PathBuf;
use std::time::Duration;

pub fn run(open: Option<PathBuf>) -> std::io::Result<()> {
    let mut audio = Audio::new();
    terminal::enable_raw_mode()?;
    let r = run_inner(open, &mut audio);
    terminal::disable_raw_mode()?;
    execute!(stdout(), cursor::Show)?;
    r
}

fn draw(lines: &[String]) -> std::io::Result<()> {
    let mut out = stdout();
    let (w, _) = terminal::size().unwrap_or((80, 24));
    execute!(out, terminal::Clear(terminal::ClearType::All), cursor::MoveTo(0, 0), cursor::Hide)?;
    for l in lines {
        for chunk in wrap(l, w.max(20) as usize) { write!(out, "{chunk}\r\n")?; }
    }
    out.flush()
}

fn wrap(s: &str, w: usize) -> Vec<String> {
    let mut out = vec![String::new()];
    for word in s.split(' ') {
        let cur = out.last_mut().unwrap();
        if !cur.is_empty() && cur.chars().count() + 1 + word.chars().count() > w { out.push(word.to_string()); }
        else { if !cur.is_empty() { cur.push(' '); } cur.push_str(word); }
    }
    out
}

fn key() -> std::io::Result<Option<KeyCode>> {
    if event::poll(Duration::from_millis(100))? {
        if let Event::Key(k) = event::read()? {
            if k.kind == KeyEventKind::Press { return Ok(Some(k.code)); }
        }
    }
    Ok(None)
}

fn run_inner(open: Option<PathBuf>, audio: &mut Audio) -> std::io::Result<()> {
    let lib = pack::library_dir();
    let mut session = open.and_then(|p| Pack::open(&p).ok()).map(|p| Session::new(p, audio));
    let mut library = pack::scan(&lib);
    let mut sel = 0usize;
    let mut dirty = true;
    loop {
        if let Some(s) = session.as_mut() {
            let before = (s.engine.token(), s.selected, s.reading);
            s.tick(audio);
            dirty |= (s.engine.token(), s.selected, s.reading) != before;
            if dirty {
                let (title, text) = s.title_text();
                let mut l = vec![format!("== {} ==", s.pack.story.title), String::new()];
                if let Some(k) = s.end_kind() { l.push(format!("*** {} ***", end_label(k))); }
                l.push(title.to_uppercase());
                l.push(text);
                l.push(String::new());
                for (i, o) in s.options().iter().enumerate() { l.push(format!("{} {}. {}", if i == s.selected { ">" } else { " " }, i + 1, o)); }
                let inv = s.inventory();
                if !inv.is_empty() { l.push(format!("Sac : {}", inv.join(", "))); }
                l.push(String::new());
                l.push(match s.engine.status {
                    Status::Playing if s.options().is_empty() => "[Entrée] suivant   [Échap] menu".into(),
                    Status::Playing => "[↑↓] choisir  [Entrée] valider  [Échap] menu".into(),
                    _ => "[Entrée] rejouer   [Échap] menu".into(),
                });
                draw(&l)?;
                dirty = false;
            }
            if let Some(k) = key()? {
                dirty = true;
                match k {
                    KeyCode::Up | KeyCode::Left => s.select(-1, audio),
                    KeyCode::Down | KeyCode::Right => s.select(1, audio),
                    KeyCode::Enter | KeyCode::Char(' ') => s.confirm(audio),
                    KeyCode::Char(c @ '1'..='9') => s.choose(c as usize - '1' as usize, audio),
                    KeyCode::Char('r') => s.restart(audio),
                    KeyCode::Esc | KeyCode::Backspace => { audio.stop(); session = None; library = pack::scan(&lib); }
                    _ => {}
                }
            }
        } else {
            if dirty {
                let mut l = vec!["== HERODIO - Mes histoires ==".to_string(), String::new()];
                if library.is_empty() { l.push(format!("Aucune histoire. Copie des fichiers .aistory dans {}", lib.display())); }
                for (i, p) in library.iter().enumerate() { l.push(format!("{} {}", if i == sel { ">" } else { " " }, p.story.title)); }
                l.push(String::new());
                l.push("[↑↓] choisir  [Entrée] écouter  [q] quitter".into());
                draw(&l)?;
                dirty = false;
            }
            if let Some(k) = key()? {
                dirty = true;
                let n = library.len().max(1);
                match k {
                    KeyCode::Up => sel = (sel + n - 1) % n,
                    KeyCode::Down => sel = (sel + 1) % n,
                    KeyCode::Enter | KeyCode::Char(' ') if !library.is_empty() => {
                        if let Ok(p) = Pack::open(&library[sel].path) { session = Some(Session::new(p, audio)); }
                    }
                    KeyCode::Char('q') | KeyCode::Esc => {
                        execute!(stdout(), terminal::Clear(terminal::ClearType::All), style::ResetColor)?;
                        return Ok(());
                    }
                    _ => {}
                }
            }
        }
    }
}
