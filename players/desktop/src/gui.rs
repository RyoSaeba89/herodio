//! Interface graphique (Windows, Linux de bureau, Raspberry Pi OS avec bureau).

use crate::audio::Audio;
use crate::engine::Status;
use crate::pack::{self, Pack};
use crate::session::{end_label, Session};
use eframe::egui::{self, Color32, CornerRadius, FontId, Key, RichText, Stroke, TextStyle, ViewportCommand};
use std::path::PathBuf;
use std::time::Duration;

const ACCENT: Color32 = Color32::from_rgb(91, 91, 214);
const ORANGE: Color32 = Color32::from_rgb(242, 138, 28);
const BG: Color32 = Color32::from_rgb(244, 241, 234);

pub struct App {
    lib_dir: PathBuf,
    library: Vec<Pack>,
    lib_sel: usize,
    session: Option<Session>,
    audio: Audio,
    message: String,
    fullscreen: bool,
}

impl App {
    pub fn new(cc: &eframe::CreationContext, open: Option<PathBuf>, fullscreen: bool) -> App {
        let ctx = &cc.egui_ctx;
        ctx.set_theme(egui::Theme::Light);
        ctx.all_styles_mut(|s| {
            s.text_styles.insert(TextStyle::Heading, FontId::proportional(36.0));
            s.text_styles.insert(TextStyle::Body, FontId::proportional(24.0));
            s.text_styles.insert(TextStyle::Button, FontId::proportional(24.0));
            s.text_styles.insert(TextStyle::Small, FontId::proportional(17.0));
            s.spacing.button_padding = egui::vec2(18.0, 12.0);
            s.spacing.item_spacing = egui::vec2(12.0, 12.0);
            s.visuals.panel_fill = BG;
        });
        let lib_dir = pack::library_dir();
        let mut app = App { library: pack::scan(&lib_dir), lib_dir, lib_sel: 0, session: None, audio: Audio::new(), message: String::new(), fullscreen };
        if !app.audio.available() { app.message = "Aucune sortie audio trouvée : les histoires seront muettes.".into(); }
        if let Some(p) = open {
            match Pack::open(&p) {
                Ok(pk) => app.session = Some(Session::new(pk, &mut app.audio)),
                Err(e) => app.message = format!("Impossible d'ouvrir {} : {e}", p.display()),
            }
        }
        app
    }

    fn refresh(&mut self) {
        self.library = pack::scan(&self.lib_dir);
        self.lib_sel = self.lib_sel.min(self.library.len().saturating_sub(1));
    }

    fn handle_drops(&mut self, ctx: &egui::Context) {
        let dropped: Vec<PathBuf> = ctx.input(|i| i.raw.dropped_files.iter().map(|f| f.path().to_path_buf()).filter(|p| !p.as_os_str().is_empty()).collect());
        if dropped.is_empty() { return; }
        for p in dropped {
            self.message = match pack::import(&p, &self.lib_dir) {
                Ok(_) => format!("Histoire ajoutée : {}", p.file_name().unwrap_or_default().to_string_lossy()),
                Err(e) => format!("{} n'a pas pu être ajoutée : {e}", p.display()),
            };
        }
        self.refresh();
    }

    fn library_ui(&mut self, ui: &mut egui::Ui) {
        let ctx = ui.ctx().clone();
        let (up, down, enter) = ctx.input(|i| (i.key_pressed(Key::ArrowUp), i.key_pressed(Key::ArrowDown), i.key_pressed(Key::Enter) || i.key_pressed(Key::Space)));
        if !self.library.is_empty() {
            if up { self.lib_sel = (self.lib_sel + self.library.len() - 1) % self.library.len(); }
            if down { self.lib_sel = (self.lib_sel + 1) % self.library.len(); }
        }
        let mut open = enter.then_some(self.lib_sel).filter(|_| !self.library.is_empty());

        ui.horizontal(|ui| {
            ui.heading(RichText::new("🎧 Mes histoires").strong());
            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                if ui.button("⟳ Actualiser").clicked() { self.refresh(); }
            });
        });
        ui.label(RichText::new(format!("Glisse un fichier .aistory dans cette fenêtre pour l'ajouter. Dossier : {}", self.lib_dir.display())).small().color(Color32::GRAY));
        ui.add_space(8.0);
        if self.library.is_empty() {
            ui.add_space(40.0);
            ui.vertical_centered(|ui| ui.label("Aucune histoire pour l'instant.\nExporte une histoire depuis Herodio Studio (« Exporter mon histoire » → Windows ou Raspberry Pi)."));
        }
        egui::ScrollArea::vertical().show(ui, |ui| {
            for (i, p) in self.library.iter().enumerate() {
                let sel = i == self.lib_sel;
                let r = egui::Frame::new()
                    .fill(if sel { Color32::from_rgb(240, 238, 251) } else { Color32::WHITE })
                    .stroke(Stroke::new(3.0, if sel { ACCENT } else { Color32::from_rgb(228, 223, 211) }))
                    .corner_radius(CornerRadius::same(18))
                    .inner_margin(16.0)
                    .show(ui, |ui| {
                        ui.set_width(ui.available_width());
                        ui.label(RichText::new(&p.story.title).size(28.0).strong());
                        if !p.story.author.is_empty() { ui.label(RichText::new(format!("par {}", p.story.author)).small()); }
                        if !p.story.description.is_empty() { ui.label(RichText::new(&p.story.description).color(Color32::DARK_GRAY)); }
                    })
                    .response
                    .interact(egui::Sense::click());
                if sel { r.scroll_to_me(None); }
                if r.clicked() { open = Some(i); }
            }
        });
        if !self.message.is_empty() { ui.label(RichText::new(&self.message).color(ORANGE)); }
        if let Some(i) = open {
            match Pack::open(&self.library[i].path) {
                Ok(pk) => { self.session = Some(Session::new(pk, &mut self.audio)); self.message.clear(); }
                Err(e) => self.message = e,
            }
        }
    }

    fn player_ui(&mut self, ui: &mut egui::Ui) {
        let ctx = ui.ctx().clone();
        let audio = &mut self.audio;
        let Some(s) = self.session.as_mut() else { return };
        s.tick(audio);
        let mut back = false;
        let (k_up, k_down, k_ok, k_back, k_restart, digit) = ctx.input(|i| (
            i.key_pressed(Key::ArrowUp) || i.key_pressed(Key::ArrowLeft),
            i.key_pressed(Key::ArrowDown) || i.key_pressed(Key::ArrowRight),
            i.key_pressed(Key::Enter) || i.key_pressed(Key::Space),
            i.key_pressed(Key::Escape) || i.key_pressed(Key::Backspace),
            i.key_pressed(Key::R),
            [Key::Num1, Key::Num2, Key::Num3, Key::Num4, Key::Num5, Key::Num6, Key::Num7, Key::Num8, Key::Num9].iter().position(|k| i.key_pressed(*k)),
        ));
        if k_up { s.select(-1, audio); }
        if k_down { s.select(1, audio); }
        if let Some(d) = digit { s.choose(d, audio); } else if k_ok { s.confirm(audio); }
        if k_restart { s.restart(audio); }
        if k_back { back = true; }

        ui.horizontal(|ui| {
            if ui.button("◀ Mes histoires").clicked() { back = true; }
            ui.label(RichText::new(&s.pack.story.title).strong());
            let inv = s.inventory();
            if !inv.is_empty() {
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    ui.label(RichText::new(format!("🎒 {}", inv.join(" · "))).color(Color32::from_rgb(139, 92, 246)));
                });
            }
        });
        ui.add_space(20.0);

        let (title, text) = s.title_text();
        let end = s.end_kind();
        egui::Frame::new().fill(Color32::WHITE).corner_radius(CornerRadius::same(22)).inner_margin(26.0).show(ui, |ui| {
            ui.set_width(ui.available_width());
            if let Some(k) = end {
                ui.label(RichText::new(end_label(k)).size(22.0).color(if k == "secret" { ACCENT } else { ORANGE }).strong());
            }
            ui.horizontal(|ui| {
                ui.label(RichText::new(&title).size(38.0).strong());
                if audio.busy() { ui.label(RichText::new("🔊").size(30.0)); }
            });
            if !text.is_empty() { ui.label(RichText::new(&text).size(26.0)); }
        });
        ui.add_space(18.0);

        let options = s.options();
        let mut act: Option<Box<dyn FnOnce(&mut Session, &mut Audio)>> = None;
        if !options.is_empty() {
            for (i, o) in options.iter().enumerate() {
                let sel = i == s.selected;
                let b = egui::Button::new(RichText::new(format!("{}  {}", i + 1, o)).size(28.0).color(if sel { Color32::WHITE } else { Color32::BLACK }))
                    .fill(if sel { ORANGE } else { Color32::WHITE })
                    .stroke(Stroke::new(3.0, ORANGE))
                    .corner_radius(CornerRadius::same(16))
                    .min_size(egui::vec2(ui.available_width(), 64.0));
                let r = ui.add(b);
                if r.hovered() && !sel { act = Some(Box::new(move |s, a| { s.selected = i; s.play_option(a); })); }
                if r.clicked() { act = Some(Box::new(move |s, a| s.choose(i, a))); }
            }
        } else if s.engine.status == Status::Playing {
            if ui.add(egui::Button::new(RichText::new("Suivant ▶").size(28.0).color(Color32::WHITE)).fill(ACCENT).min_size(egui::vec2(220.0, 64.0))).clicked() {
                act = Some(Box::new(|s, a| s.next(a)));
            }
        } else {
            ui.horizontal(|ui| {
                if ui.add(egui::Button::new(RichText::new("⟲ Rejouer").size(28.0).color(Color32::WHITE)).fill(ACCENT).min_size(egui::vec2(220.0, 64.0))).clicked() {
                    act = Some(Box::new(|s, a| s.restart(a)));
                }
                if ui.add(egui::Button::new(RichText::new("Mes histoires").size(28.0)).min_size(egui::vec2(220.0, 64.0))).clicked() { back = true; }
            });
        }
        if let Some(f) = act { f(s, audio); }
        ui.add_space(10.0);
        ui.label(RichText::new("Flèches : choisir · Entrée : valider · 1-9 : réponse directe · R : recommencer · Échap : retour · F11 : plein écran").small().color(Color32::GRAY));

        if back { audio.stop(); self.session = None; self.refresh(); }
        ctx.request_repaint_after(Duration::from_millis(100));
    }
}

impl eframe::App for App {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        let ctx = ui.ctx().clone();
        self.handle_drops(&ctx);
        if ctx.input(|i| i.key_pressed(Key::F11)) {
            self.fullscreen = !self.fullscreen;
            ctx.send_viewport_cmd(ViewportCommand::Fullscreen(self.fullscreen));
        }
        egui::CentralPanel::default_margins().frame(egui::Frame::new().fill(BG).inner_margin(28.0)).show(ui, |ui| {
            ui.set_max_width(1100.0_f32.min(ui.available_width()));
            if self.session.is_some() { self.player_ui(ui) } else { self.library_ui(ui) }
        });
    }
}

pub fn run(open: Option<PathBuf>, fullscreen: bool) -> eframe::Result {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default().with_title("Herodio — Lecteur d'histoires").with_inner_size([1100.0, 760.0]).with_fullscreen(fullscreen).with_drag_and_drop(true),
        ..Default::default()
    };
    eframe::run_native("Herodio", options, Box::new(move |cc| Ok(Box::new(App::new(cc, open, fullscreen)))))
}
