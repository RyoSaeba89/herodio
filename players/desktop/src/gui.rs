//! Interface graphique (Windows, Linux de bureau, Raspberry Pi OS avec bureau).
//! Couleurs de l'histoire, illustrations, grandes réponses colorées, fondus, particules et confettis.

use crate::audio::Audio;
use crate::engine::Status;
use crate::pack::{self, Pack};
use crate::session::{end_label, Session};
use eframe::egui::{
    self, pos2, vec2, Align2, Color32, CornerRadius, FontId, Key, Mesh, Pos2, Rect, RichText, Sense, Shape, Stroke, TextStyle, TextureHandle,
    TextureOptions, ViewportCommand,
};
use std::collections::HashMap;
use std::path::PathBuf;
use std::time::{Duration, Instant};

const INK: Color32 = Color32::from_rgb(38, 35, 58);
const MUTED: Color32 = Color32::from_rgb(110, 106, 133);
const DEFAULT_COLOR: Color32 = Color32::from_rgb(91, 91, 214);
/// Couleurs des réponses (orange, sarcelle, rose, violet, bleu, vert…).
const CHOICE_COLORS: [Color32; 6] = [
    Color32::from_rgb(242, 138, 28),
    Color32::from_rgb(20, 176, 166),
    Color32::from_rgb(230, 74, 160),
    Color32::from_rgb(139, 92, 246),
    Color32::from_rgb(59, 127, 245),
    Color32::from_rgb(34, 165, 89),
];

fn parse_color(s: Option<&str>) -> Color32 {
    s.and_then(|s| {
        let h = s.trim_start_matches('#');
        (h.len() == 6).then(|| u32::from_str_radix(h, 16).ok()).flatten()
    })
    .map(|v| Color32::from_rgb((v >> 16) as u8, (v >> 8) as u8, v as u8))
    .unwrap_or(DEFAULT_COLOR)
}

fn mix(a: Color32, b: Color32, t: f32) -> Color32 {
    let l = |x: u8, y: u8| (x as f32 + (y as f32 - x as f32) * t).round() as u8;
    Color32::from_rgb(l(a.r(), b.r()), l(a.g(), b.g()), l(a.b(), b.b()))
}

fn shadow(blur: u8, alpha: u8) -> egui::epaint::Shadow {
    egui::epaint::Shadow { offset: [0, (blur / 3) as i8], blur, spread: 0, color: Color32::from_black_alpha(alpha) }
}

/// Fond en dégradé vertical aux couleurs de l'histoire, avec des bulles lumineuses qui flottent doucement.
fn paint_background(ui: &egui::Ui, color: Color32, t: f64) {
    // Toute la fenêtre, marges comprises, sous le contenu.
    let rect = ui.ctx().content_rect();
    let top = mix(color, Color32::WHITE, 0.88);
    let bottom = mix(color, Color32::WHITE, 0.62);
    let mut m = Mesh::default();
    m.colored_vertex(rect.left_top(), top);
    m.colored_vertex(rect.right_top(), top);
    m.colored_vertex(rect.left_bottom(), bottom);
    m.colored_vertex(rect.right_bottom(), bottom);
    m.add_triangle(0, 1, 2);
    m.add_triangle(1, 2, 3);
    let p = ui.ctx().layer_painter(egui::LayerId::background());
    p.add(Shape::mesh(m));
    for i in 0..16 {
        let f = i as f64;
        let x = rect.left() + rect.width() * ((f * 0.618).fract() as f32);
        let speed = 12.0 + (f * 7.3) % 18.0;
        let y = rect.bottom() - (((t * speed + f * 97.0) % (rect.height() as f64 + 80.0)) as f32) + 40.0;
        let wobble = ((t * 0.7 + f).sin() * 18.0) as f32;
        let r = 6.0 + ((f * 3.7) % 14.0) as f32;
        p.circle_filled(pos2(x + wobble, y), r, Color32::from_white_alpha(46));
    }
}

/// Confettis (fins heureuses) ou étoiles (fins secrètes), pendant quelques secondes.
fn paint_celebration(ui: &egui::Ui, rect: Rect, age: f32, secret: bool) {
    if age > 6.0 {
        return;
    }
    let p = ui.painter();
    for i in 0..70 {
        let f = i as f32;
        let x0 = rect.left() + rect.width() * ((f * 0.6180339).fract());
        let fall = 90.0 + (f * 13.7) % 140.0;
        let y = rect.top() - 30.0 + age * fall + (f * 23.0) % 120.0 - 120.0;
        if y > rect.bottom() {
            continue;
        }
        let x = x0 + (age * 2.0 + f).sin() * 30.0;
        let c = CHOICE_COLORS[i % CHOICE_COLORS.len()];
        let alpha = ((6.0 - age).min(1.0) * 255.0) as u8;
        if secret {
            star(p, pos2(x, y), 7.0 + (f % 4.0) * 2.0, Color32::from_rgba_unmultiplied(255, 216, 77, alpha), age * 2.0 + f);
        } else {
            let a = age * 4.0 + f;
            let (s, c2) = (a.sin() * 7.0, a.cos() * 4.0);
            let col = Color32::from_rgba_unmultiplied(c.r(), c.g(), c.b(), alpha);
            p.add(Shape::convex_polygon(vec![pos2(x - s, y - c2), pos2(x + c2, y - s), pos2(x + s, y + c2), pos2(x - c2, y + s)], col, Stroke::NONE));
        }
    }
}

fn star(p: &egui::Painter, c: Pos2, r: f32, color: Color32, rot: f32) {
    let pts: Vec<Pos2> = (0..10)
        .map(|k| {
            let a = rot + k as f32 * std::f32::consts::PI / 5.0;
            let rr = if k % 2 == 0 { r } else { r * 0.45 };
            pos2(c.x + a.cos() * rr, c.y + a.sin() * rr)
        })
        .collect();
    for k in 0..10 {
        p.add(Shape::convex_polygon(vec![c, pts[k], pts[(k + 1) % 10]], color, Stroke::NONE));
    }
}

/// Petit égaliseur animé : le son est en cours de lecture.
fn speaking(ui: &mut egui::Ui, color: Color32, t: f64) {
    let (rect, _) = ui.allocate_exact_size(vec2(34.0, 26.0), Sense::hover());
    for i in 0..4 {
        let h = 6.0 + ((t * 7.0 + i as f64 * 1.3).sin().abs() * 20.0) as f32;
        let x = rect.left() + i as f32 * 9.0;
        ui.painter().rect_filled(Rect::from_min_max(pos2(x, rect.bottom() - h), pos2(x + 6.0, rect.bottom())), 3.0, color);
    }
}

fn pill(ui: &mut egui::Ui, text: &str, fill: Color32, fg: Color32) -> bool {
    ui.add(egui::Button::new(RichText::new(text).size(28.0).strong().color(fg)).fill(fill).corner_radius(CornerRadius::same(34)).min_size(vec2(240.0, 68.0)))
        .clicked()
}

type Action = Box<dyn FnOnce(&mut Session, &mut Audio)>;

pub struct App {
    lib_dir: PathBuf,
    library: Vec<Pack>,
    lib_sel: usize,
    session: Option<Session>,
    audio: Audio,
    message: String,
    fullscreen: bool,
    textures: HashMap<(PathBuf, String), Option<TextureHandle>>,
    node_token: String,
    node_since: Instant,
    started: Instant,
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
            s.spacing.button_padding = vec2(18.0, 12.0);
            s.spacing.item_spacing = vec2(12.0, 12.0);
        });
        let lib_dir = pack::library_dir();
        let mut app = App {
            library: pack::scan(&lib_dir), lib_dir, lib_sel: 0, session: None, audio: Audio::new(), message: String::new(), fullscreen,
            textures: HashMap::new(), node_token: String::new(), node_since: Instant::now(), started: Instant::now(),
        };
        if !app.audio.available() { app.message = "Aucune sortie audio trouvée : les histoires seront muettes.".into(); }
        if let Some(p) = open {
            match Pack::open(&p) {
                Ok(pk) => app.session = Some(Session::new(pk, &mut app.audio)),
                Err(e) => app.message = format!("Impossible d'ouvrir {} : {e}", p.display()),
            }
        }
        app
    }

    /// Image d'un pack, décodée une seule fois puis gardée en mémoire graphique.
    fn texture(&mut self, ctx: &egui::Context, pack: &Pack, rel: &str) -> Option<TextureHandle> {
        let key = (pack.path.clone(), rel.to_string());
        if let Some(t) = self.textures.get(&key) { return t.clone(); }
        let tex = pack.read(rel).ok().and_then(|bytes| image::load_from_memory(&bytes).ok()).map(|img| {
            let rgba = img.to_rgba8();
            let size = [rgba.width() as usize, rgba.height() as usize];
            ctx.load_texture(rel, egui::ColorImage::from_rgba_unmultiplied(size, &rgba), TextureOptions::LINEAR)
        });
        self.textures.insert(key, tex.clone());
        tex
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

    fn open(&mut self, i: usize) {
        match Pack::open(&self.library[i].path) {
            Ok(pk) => { self.session = Some(Session::new(pk, &mut self.audio)); self.message.clear(); }
            Err(e) => self.message = e,
        }
    }

    // ------------------------------------------------------------ bibliothèque

    fn library_ui(&mut self, ui: &mut egui::Ui) {
        let ctx = ui.ctx().clone();
        let t = self.started.elapsed().as_secs_f64();
        paint_background(ui, DEFAULT_COLOR, t);
        let cols = ((ui.available_width() + 20.0) / 300.0).floor().max(1.0) as usize;
        let n = self.library.len();
        let (left, right, up, down, enter) = ctx.input(|i| (
            i.key_pressed(Key::ArrowLeft), i.key_pressed(Key::ArrowRight), i.key_pressed(Key::ArrowUp), i.key_pressed(Key::ArrowDown),
            i.key_pressed(Key::Enter) || i.key_pressed(Key::Space),
        ));
        if n > 0 {
            if left { self.lib_sel = (self.lib_sel + n - 1) % n; }
            if right { self.lib_sel = (self.lib_sel + 1) % n; }
            if up { self.lib_sel = self.lib_sel.saturating_sub(cols); }
            if down { self.lib_sel = (self.lib_sel + cols).min(n - 1); }
        }
        let mut open = enter.then_some(self.lib_sel).filter(|_| n > 0);

        ui.add_space(6.0);
        ui.horizontal(|ui| {
            ui.label(RichText::new("🎧").size(44.0));
            ui.label(RichText::new("Mes histoires").size(44.0).strong().color(INK));
            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                if ui.add(egui::Button::new("⟳ Actualiser").corner_radius(CornerRadius::same(14))).clicked() { self.refresh(); }
            });
        });
        ui.label(RichText::new(format!("Glisse un fichier .aistory dans cette fenêtre pour l'ajouter · dossier : {}", self.lib_dir.display())).small().color(MUTED));
        if !self.message.is_empty() { ui.label(RichText::new(&self.message).color(CHOICE_COLORS[0]).strong()); }
        ui.add_space(8.0);
        if n == 0 {
            ui.add_space(60.0);
            ui.vertical_centered(|ui| {
                ui.label(RichText::new("📚").size(80.0));
                ui.label(RichText::new("Aucune histoire pour l'instant.").size(28.0).strong());
                ui.label("Dans Herodio Studio : « Exporter mon histoire » → Windows ou Raspberry Pi.");
            });
            return;
        }

        let card_w = ((ui.available_width() - (cols as f32 - 1.0) * 20.0) / cols as f32).min(360.0);
        egui::ScrollArea::vertical().show(ui, |ui| {
            ui.add_space(8.0);
            for row in 0..n.div_ceil(cols) {
                ui.horizontal(|ui| {
                    ui.spacing_mut().item_spacing.x = 20.0;
                    for i in row * cols..((row + 1) * cols).min(n) {
                        if self.story_card(ui, i, card_w) { open = Some(i); }
                    }
                });
                ui.add_space(14.0);
            }
        });
        if let Some(i) = open { self.open(i); }
    }

    /// Carte d'histoire : couverture, bandeau de couleur, titre et résumé. Renvoie vrai si on clique.
    fn story_card(&mut self, ui: &mut egui::Ui, i: usize, w: f32) -> bool {
        let ctx = ui.ctx().clone();
        let (title, desc, author, color, cover, path) = {
            let s = &self.library[i].story;
            (s.title.clone(), s.description.clone(), s.author.clone(), parse_color(s.color.as_deref()), s.cover.clone(), self.library[i].path.clone())
        };
        let tex = cover.and_then(|c| {
            let pk = Pack { path, story: self.library[i].story.clone() };
            self.texture(&ctx, &pk, &c)
        });
        let sel = i == self.lib_sel;
        let h = w * 0.75 + 120.0;
        let (rect, resp) = ui.allocate_exact_size(vec2(w, h), Sense::click());
        let hover = resp.hovered() || sel;
        let lift = ctx.animate_bool_with_time(resp.id, hover, 0.15) * 6.0;
        let rect = rect.translate(vec2(0.0, -lift));
        let p = ui.painter();
        p.add(shadow(if hover { 30 } else { 18 }, if hover { 60 } else { 30 }).as_shape(rect, CornerRadius::same(22)));
        p.rect_filled(rect, 22.0, Color32::WHITE);
        let img_rect = Rect::from_min_size(rect.min, vec2(w, w * 0.75));
        let top = CornerRadius { nw: 22, ne: 22, sw: 0, se: 0 };
        match tex {
            Some(t) => { egui::Image::new(&t).corner_radius(top).paint_at(ui, img_rect); }
            None => {
                p.rect_filled(img_rect, top, mix(color, Color32::WHITE, 0.5));
                p.text(img_rect.center(), Align2::CENTER_CENTER, "📖", FontId::proportional(70.0), Color32::WHITE);
            }
        }
        p.rect_filled(Rect::from_min_size(pos2(rect.left(), img_rect.bottom()), vec2(w, 6.0)), 0.0, color);
        let tx = rect.left() + 16.0;
        let mut y = img_rect.bottom() + 16.0;
        let g = p.layout(title, FontId::proportional(25.0), INK, w - 32.0);
        let gh = g.size().y;
        p.galley(pos2(tx, y), g, INK);
        y += gh + 4.0;
        let sub = if desc.is_empty() { format!("par {author}") } else { desc };
        p.galley(pos2(tx, y), p.layout(sub, FontId::proportional(16.0), MUTED, w - 32.0), MUTED);
        if sel {
            p.rect_stroke(rect, 22.0, Stroke::new(5.0, color), egui::StrokeKind::Outside);
            resp.scroll_to_me(None);
        }
        resp.clicked()
    }

    // ------------------------------------------------------------ lecture

    fn player_ui(&mut self, ui: &mut egui::Ui) {
        let ctx = ui.ctx().clone();
        let t = self.started.elapsed().as_secs_f64();
        let Some(mut s) = self.session.take() else { return };
        s.tick(&mut self.audio);
        let color = parse_color(s.pack.story.color.as_deref());
        paint_background(ui, color, t);

        // Fondu à chaque nouveau moment de l'histoire
        let token = s.engine.token();
        if token != self.node_token { self.node_token = token; self.node_since = Instant::now(); }
        let age = self.node_since.elapsed().as_secs_f32();

        let mut back = false;
        let (k_up, k_down, k_ok, k_back, k_restart, digit) = ctx.input(|i| (
            i.key_pressed(Key::ArrowUp) || i.key_pressed(Key::ArrowLeft),
            i.key_pressed(Key::ArrowDown) || i.key_pressed(Key::ArrowRight),
            i.key_pressed(Key::Enter) || i.key_pressed(Key::Space),
            i.key_pressed(Key::Escape) || i.key_pressed(Key::Backspace),
            i.key_pressed(Key::R),
            [Key::Num1, Key::Num2, Key::Num3, Key::Num4, Key::Num5, Key::Num6, Key::Num7, Key::Num8, Key::Num9].iter().position(|k| i.key_pressed(*k)),
        ));
        {
            let audio = &mut self.audio;
            if k_up { s.select(-1, audio); }
            if k_down { s.select(1, audio); }
            if let Some(d) = digit { s.choose(d, audio); } else if k_ok { s.confirm(audio); }
            if k_restart { s.restart(audio); }
        }
        if k_back { back = true; }

        // Barre du haut : retour, titre, sac
        ui.horizontal(|ui| {
            if ui.add(egui::Button::new(RichText::new("◀  Mes histoires").size(20.0)).fill(Color32::from_white_alpha(220)).corner_radius(CornerRadius::same(20))).clicked() {
                back = true;
            }
            ui.label(RichText::new(&s.pack.story.title).size(22.0).strong().color(mix(color, INK, 0.4)));
            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                for item in s.inventory().iter().rev() {
                    egui::Frame::new().fill(Color32::from_rgb(139, 92, 246)).corner_radius(CornerRadius::same(18)).inner_margin(vec2(14.0, 6.0)).show(ui, |ui| {
                        ui.label(RichText::new(format!("🎒 {item}")).size(18.0).color(Color32::WHITE).strong());
                    });
                }
            });
        });
        ui.add_space(12.0);

        let image = s.engine.current().and_then(|n| n.image()).map(str::to_owned);
        let tex = image.and_then(|rel| self.texture(&ctx, &s.pack, &rel));
        let (title, text) = s.title_text();
        let end = s.end_kind().map(str::to_owned);
        let options = s.options();
        let selected = s.selected;
        let playing = s.engine.status == Status::Playing;
        let wide = ui.available_width() > 900.0;
        let fade = (age / 0.35).min(1.0);
        let audio_busy = self.audio.busy();
        let mut act: Option<Action> = None;

        let mut content = |ui: &mut egui::Ui| {
            ui.multiply_opacity(fade);
            // Carte de texte
            egui::Frame::new().fill(Color32::from_white_alpha(240)).corner_radius(CornerRadius::same(26)).inner_margin(24.0).shadow(shadow(20, 25)).show(ui, |ui| {
                ui.set_width(ui.available_width());
                if let Some(k) = &end {
                    let c = match k.as_str() { "secret" => Color32::from_rgb(139, 92, 246), "sad" => Color32::from_rgb(59, 127, 245), _ => CHOICE_COLORS[0] };
                    egui::Frame::new().fill(c).corner_radius(CornerRadius::same(16)).inner_margin(vec2(16.0, 6.0)).show(ui, |ui| {
                        ui.label(RichText::new(format!("{}  {}", if k == "secret" { "★" } else { "✿" }, end_label(k))).size(22.0).strong().color(Color32::WHITE));
                    });
                    ui.add_space(6.0);
                }
                ui.horizontal(|ui| {
                    ui.label(RichText::new(&title).size(36.0).strong().color(mix(color, INK, 0.35)));
                    if audio_busy { speaking(ui, color, t); }
                });
                if !text.is_empty() { ui.label(RichText::new(&text).size(25.0).color(INK)); }
            });
            ui.add_space(16.0);

            if !options.is_empty() {
                for (i, o) in options.iter().enumerate() {
                    let c = CHOICE_COLORS[i % CHOICE_COLORS.len()];
                    let sel = i == selected;
                    let (rect, resp) = ui.allocate_exact_size(vec2(ui.available_width(), 74.0), Sense::click());
                    let grow = ctx.animate_bool_with_time(resp.id, sel || resp.hovered(), 0.12);
                    let r = rect.expand(grow * 4.0);
                    let p = ui.painter();
                    p.add(shadow((14.0 + grow * 10.0) as u8, (20.0 + grow * 40.0) as u8).as_shape(r, CornerRadius::same(37)));
                    p.rect_filled(r, 37.0, c);
                    if sel { p.rect_stroke(r, 37.0, Stroke::new(5.0, Color32::WHITE), egui::StrokeKind::Inside); }
                    p.circle_filled(pos2(r.left() + 40.0, r.center().y), 24.0, Color32::WHITE);
                    p.text(pos2(r.left() + 40.0, r.center().y), Align2::CENTER_CENTER, (i + 1).to_string(), FontId::proportional(28.0), c);
                    let g = p.layout(o.clone(), FontId::proportional(26.0), Color32::WHITE, r.width() - 100.0);
                    let gy = r.center().y - g.size().y / 2.0;
                    p.galley(pos2(r.left() + 80.0, gy), g, Color32::WHITE);
                    if resp.hovered() && !sel { act = Some(Box::new(move |s, a| { s.selected = i; s.play_option(a); })); }
                    if resp.clicked() { act = Some(Box::new(move |s, a| s.choose(i, a))); }
                    ui.add_space(6.0);
                }
            } else if playing {
                if pill(ui, "Suivant  ▶", color, Color32::WHITE) { act = Some(Box::new(|s, a| s.next(a))); }
            } else {
                ui.horizontal(|ui| {
                    if pill(ui, "⟲  Rejouer", color, Color32::WHITE) { act = Some(Box::new(|s, a| s.restart(a))); }
                    if pill(ui, "Mes histoires", Color32::WHITE, INK) { back = true; }
                });
            }
        };

        let illustration = |ui: &mut egui::Ui, w: f32| {
            if let Some(tx) = &tex {
                let size = vec2(w, w * tx.size()[1] as f32 / tx.size()[0] as f32);
                let (rect, _) = ui.allocate_exact_size(size, Sense::hover());
                let r = Rect::from_center_size(rect.center(), size * (1.0 + (1.0 - fade) * 0.03));
                ui.painter().add(shadow(30, 45).as_shape(r, CornerRadius::same(28)));
                egui::Image::new(tx).corner_radius(CornerRadius::same(28)).tint(Color32::from_white_alpha((fade * 255.0) as u8)).paint_at(ui, r);
            }
        };

        egui::ScrollArea::vertical().auto_shrink([false, false]).show(ui, |ui| {
            if wide && tex.is_some() {
                ui.columns(2, |cols| {
                    let w = cols[0].available_width();
                    illustration(&mut cols[0], w);
                    content(&mut cols[1]);
                });
            } else {
                let w = ui.available_width().min(760.0);
                ui.vertical_centered(|ui| illustration(ui, w));
                ui.add_space(12.0);
                content(ui);
            }
            ui.add_space(14.0);
            ui.label(RichText::new("Flèches : choisir · Entrée : valider · 1-9 : réponse directe · R : recommencer · Échap : retour · F11 : plein écran").small().color(MUTED));
        });

        if let Some(k) = &end {
            if k != "sad" { paint_celebration(ui, ui.max_rect(), age, k == "secret"); }
        }
        if let Some(f) = act { f(&mut s, &mut self.audio); }
        if back { self.audio.stop(); self.refresh(); } else { self.session = Some(s); }
        ctx.request_repaint_after(Duration::from_millis(33));
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
        egui::CentralPanel::default_margins().frame(egui::Frame::new().inner_margin(28.0)).show(ui, |ui| {
            if self.session.is_some() { self.player_ui(ui) } else { self.library_ui(ui) }
        });
        if self.session.is_none() { ctx.request_repaint_after(Duration::from_millis(50)); }
    }
}

pub fn run(open: Option<PathBuf>, fullscreen: bool) -> eframe::Result {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default().with_title("Herodio — Lecteur d'histoires").with_inner_size([1280.0, 820.0]).with_fullscreen(fullscreen).with_drag_and_drop(true),
        ..Default::default()
    };
    eframe::run_native("Herodio", options, Box::new(move |cc| Ok(Box::new(App::new(cc, open, fullscreen)))))
}
