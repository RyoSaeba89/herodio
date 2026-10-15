//! Lecture des packs Herodio : fichier .aistory (ZIP) ou dossier décompressé (ex. carte SD).

use crate::engine::Story;
use std::io::Read;
use std::path::{Component, Path, PathBuf};

pub struct Pack {
    pub path: PathBuf,
    pub story: Story,
}

impl Pack {
    pub fn open(path: &Path) -> Result<Pack, String> {
        let mut p = Pack { path: path.to_path_buf(), story: placeholder() };
        let json = p.read("story.json")?;
        let story: Story = serde_json::from_slice(&json).map_err(|e| format!("story.json invalide : {e}"))?;
        if story.format != "herodio-story" { return Err("ce n'est pas une histoire Herodio".into()); }
        if story.version > 1 { return Err("histoire créée avec une version plus récente d'Herodio".into()); }
        p.story = story;
        Ok(p)
    }

    /// Lit un fichier du pack. Les chemins viennent du pack : on refuse toute sortie du dossier.
    pub fn read(&self, rel: &str) -> Result<Vec<u8>, String> {
        if Path::new(rel).components().any(|c| !matches!(c, Component::Normal(_))) {
            return Err(format!("chemin refusé : {rel}"));
        }
        let mut buf = Vec::new();
        if self.path.is_dir() {
            buf = std::fs::read(self.path.join(rel)).map_err(|e| format!("{rel} : {e}"))?;
        } else {
            let f = std::fs::File::open(&self.path).map_err(|e| e.to_string())?;
            let mut z = zip::ZipArchive::new(f).map_err(|e| format!("archive abîmée : {e}"))?;
            z.by_name(rel).map_err(|e| format!("{rel} : {e}"))?.read_to_end(&mut buf).map_err(|e| e.to_string())?;
        }
        Ok(buf)
    }
}

fn placeholder() -> Story {
    Story { format: String::new(), version: 0, id: String::new(), title: String::new(), author: String::new(), description: String::new(), start: None, items: vec![], variables: vec![], nodes: vec![] }
}

/// Toutes les histoires d'un dossier : fichiers .aistory et sous-dossiers contenant story.json (récursif sur 2 niveaux).
pub fn scan(dir: &Path) -> Vec<Pack> {
    let mut out = vec![];
    scan_into(dir, 0, &mut out);
    out.sort_by(|a, b| a.story.title.to_lowercase().cmp(&b.story.title.to_lowercase()));
    out
}

fn scan_into(dir: &Path, depth: u32, out: &mut Vec<Pack>) {
    let Ok(rd) = std::fs::read_dir(dir) else { return };
    for e in rd.flatten() {
        let p = e.path();
        let is_pack = p.extension().is_some_and(|x| x.eq_ignore_ascii_case("aistory")) || (p.is_dir() && p.join("story.json").is_file());
        if is_pack {
            match Pack::open(&p) {
                Ok(pk) => out.push(pk),
                Err(err) => eprintln!("Histoire ignorée {} : {err}", p.display()),
            }
        } else if p.is_dir() && depth < 2 {
            scan_into(&p, depth + 1, out);
        }
    }
}

/// Dossier de la bibliothèque : HERODIO_HISTOIRES, sinon « histoires » à côté du programme (version portable),
/// sinon ~/Herodio/histoires.
pub fn library_dir() -> PathBuf {
    if let Some(d) = std::env::var_os("HERODIO_HISTOIRES") { return d.into(); }
    if let Some(d) = std::env::current_exe().ok().and_then(|e| e.parent().map(|p| p.join("histoires"))) {
        if d.is_dir() { return d; }
    }
    let home = std::env::var_os("USERPROFILE").or_else(|| std::env::var_os("HOME")).map(PathBuf::from).unwrap_or_default();
    let d = home.join("Herodio").join("histoires");
    let _ = std::fs::create_dir_all(&d);
    d
}

/// Copie un pack dans la bibliothèque ; renvoie son nouveau chemin.
pub fn import(src: &Path, lib: &Path) -> Result<PathBuf, String> {
    if src.is_dir() { return Err("importe un fichier .aistory".into()); }
    Pack::open(src)?;
    let dst = lib.join(src.file_name().ok_or("nom de fichier invalide")?);
    std::fs::copy(src, &dst).map_err(|e| e.to_string())?;
    Ok(dst)
}
