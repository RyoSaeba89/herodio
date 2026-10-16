package org.herodio.player;

import java.io.File;
import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.herodio.core.I18n;
import org.herodio.core.Library;
import org.herodio.core.Session;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.animation.AlphaAnimation;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import static org.herodio.core.I18n.tr;

/**
 * Lecteur Herodio pour Android — un seul APK de Android 2.3 (API 9) à Android 14.
 * Interface construite en code (aucune bibliothèque), utilisable au doigt, au D-pad, au clavier ou à la manette.
 * Compilé contre l'API 9 : toute API plus récente doit passer par une chaîne ou un test de Build.VERSION.SDK_INT.
 */
public class MainActivity extends Activity implements Session.Listener {
    private static final int ACCENT = 0xFF5B5BD6, INK = 0xFF26233A, MUTED = 0xFF6E6A85, LINE = 0xFFE4DFD3, VIOLET = 0xFF8B5CF6;
    /** Couleurs des réponses : orange, sarcelle, rose, violet, bleu, vert. */
    private static final int[] CHOICE = { 0xFFF28A1C, 0xFF14B0A6, 0xFFE64AA0, 0xFF8B5CF6, 0xFF3B7FF5, 0xFF22A559 };
    private static final int REQ_IMPORT = 1;
    /** ACTION_OPEN_DOCUMENT (API 19), en toutes lettres pour rester compilable avec l'API 9. */
    private static final String OPEN_DOCUMENT = "android.intent.action.OPEN_DOCUMENT";

    private File root;
    private List<Library.Entry> library;
    private int libSel;
    private Session session;
    private String message = "";
    private String lastToken = "";
    private float dp;
    /** Quelques images récentes, pour ne pas les redécoder à chaque surbrillance. */
    private final Map<String, Bitmap> images = new HashMap<String, Bitmap>();
    /** Premier démarrage : la langue n'a jamais été choisie ; 0 = français surligné, 1 = anglais. */
    private int langSel = -1;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        dp = getResources().getDisplayMetrics().density;
        // Aucun champ de saisie : la fenêtre n'utilise pas de clavier virtuel, qui pourrait avaler les touches
        // (constaté avec PinyinIME sur Android 2.3 : les chiffres n'arrivaient jamais).
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM, WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM);
        root = Library.root(this);
        String lang = getSharedPreferences("herodio", MODE_PRIVATE).getString("lang", null);
        I18n.setEnglish("en".equals(lang));
        importSdFolder();
        boolean viewing = handleView(getIntent());
        if (lang == null) { langSel = 0; showLanguage(); }
        else if (!viewing) showLibrary();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleView(intent);
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (session != null) session.stop();
    }

    /** Anciens téléphones : les fichiers .aistory copiés dans /sdcard/Herodio sont importés automatiquement. */
    private void importSdFolder() {
        File h = new File(Environment.getExternalStorageDirectory(), "Herodio");
        h.mkdirs();
        int n = Library.importFolder(h, root);
        if (n > 0) message = tr("{} nouvelle(s) histoire(s) ajoutée(s)", n);
    }

    /** « Ouvrir avec Herodio » depuis un gestionnaire de fichiers. */
    private boolean handleView(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction()) || intent.getData() == null) return false;
        importUri(intent.getData());
        return true;
    }

    private void importUri(final Uri uri) {
        message = tr("Ajout de l'histoire…");
        if (langSel < 0) showLibrary();
        new Thread() {
            public void run() {
                String msg;
                try {
                    InputStream in = getContentResolver().openInputStream(uri);
                    try { msg = tr("Histoire ajoutée : {}", Library.load(Library.importPack(in, root, null)).title); } finally { in.close(); }
                } catch (Exception e) {
                    msg = tr("Ce fichier n'est pas une histoire Herodio valide.");
                }
                final String m = msg;
                runOnUiThread(new Runnable() { public void run() { message = m; if (langSel < 0) showLibrary(); } });
            }
        }.start();
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == REQ_IMPORT && res == RESULT_OK && data != null && data.getData() != null) importUri(data.getData());
    }

    // ---------------------------------------------------------------- couleurs et petits outils

    private int px(float v) { return Math.round(v * dp); }

    static int parseColor(String s, int fallback) {
        try { return s == null ? fallback : Color.parseColor(s); } catch (IllegalArgumentException e) { return fallback; }
    }

    static int mix(int a, int b, float t) {
        return Color.rgb((int) (Color.red(a) + (Color.red(b) - Color.red(a)) * t), (int) (Color.green(a) + (Color.green(b) - Color.green(a)) * t),
            (int) (Color.blue(a) + (Color.blue(b) - Color.blue(a)) * t));
    }

    private GradientDrawable box(int fill, int stroke, float radius) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(fill);
        g.setCornerRadius(px(radius));
        if (stroke != 0) g.setStroke(px(3), stroke);
        return g;
    }

    private TextView text(String s, float sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(color);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        return t;
    }

    private TextView pill(String s, int fill, int textColor, View.OnClickListener l) {
        TextView b = text(s, 20, textColor, true);
        b.setBackgroundDrawable(box(fill, fill == Color.WHITE ? LINE : 0, 30));
        b.setGravity(Gravity.CENTER);
        b.setPadding(px(22), px(15), px(22), px(15));
        b.setOnClickListener(l);
        return b;
    }

    /** Page défilante sur fond dégradé aux couleurs de l'histoire ; renvoie la colonne où ajouter le contenu. */
    private LinearLayout page(int color, FrameLayout[] overlay) {
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(px(16), px(16), px(16), px(24));
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        FrameLayout center = new FrameLayout(this);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Math.min(getResources().getDisplayMetrics().widthPixels, px(820)), ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.gravity = Gravity.CENTER_HORIZONTAL;
        center.addView(col, lp);
        scroll.addView(center);
        FrameLayout frame = new FrameLayout(this);
        frame.setBackgroundDrawable(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
            new int[] { mix(color, Color.WHITE, 0.88f), mix(color, Color.WHITE, 0.62f) }));
        frame.addView(scroll);
        if (overlay != null) overlay[0] = frame;
        setContentView(frame);
        return col;
    }

    private void add(LinearLayout parent, View v, int marginTop) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = px(marginTop);
        parent.addView(v, lp);
    }

    private Bitmap image(File dir, String rel, int width) {
        if (rel == null || rel.contains("..")) return null;
        String key = dir.getAbsolutePath() + "|" + rel;
        Bitmap b = images.get(key);
        if (b == null) {
            if (images.size() > 6) images.clear();
            b = Views.load(new File(dir, rel), width);
            if (b != null) images.put(key, b);
        }
        return b;
    }

    // ---------------------------------------------------------------- langue (premier démarrage)

    private void showLanguage() {
        LinearLayout col = page(ACCENT, null);
        TextView name = text("Herodio", 34, INK, true), ask = text("Choisis ta langue · Choose your language", 18, MUTED, false);
        name.setGravity(Gravity.CENTER);
        ask.setGravity(Gravity.CENTER);
        add(col, name, 60);
        add(col, ask, 6);
        String[] names = { "Français", "English" };
        for (int i = 0; i < 2; i++) {
            final boolean en = i == 1;
            boolean sel = i == langSel;
            add(col, pill((i + 1) + "  " + names[i], sel ? ACCENT : Color.WHITE, sel ? Color.WHITE : INK, new View.OnClickListener() {
                public void onClick(View v) { setLanguage(en); }
            }), i == 0 ? 28 : 12);
        }
    }

    private void setLanguage(boolean en) {
        getSharedPreferences("herodio", MODE_PRIVATE).edit().putString("lang", en ? "en" : "fr").commit();
        I18n.setEnglish(en);
        langSel = -1;
        showLibrary();
    }

    // ---------------------------------------------------------------- bibliothèque

    private void showLibrary() {
        session = null;
        library = Library.list(root);
        libSel = Math.min(libSel, Math.max(0, library.size() - 1));
        LinearLayout col = page(ACCENT, null);
        LinearLayout head = new LinearLayout(this);
        head.setGravity(Gravity.CENTER_VERTICAL);
        head.addView(text(tr("Mes histoires"), 32, INK, true), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        // Changer de langue : le bouton porte le nom de l'autre langue.
        head.addView(pill(I18n.english() ? "Français" : "English", Color.WHITE, INK, new View.OnClickListener() {
            public void onClick(View v) { setLanguage(!I18n.english()); }
        }));
        add(col, head, 0);
        if (Build.VERSION.SDK_INT >= 19) {
            add(col, pill(tr("+  Ajouter une histoire"), ACCENT, Color.WHITE, new View.OnClickListener() {
                public void onClick(View v) {
                    startActivityForResult(new Intent(OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*"), REQ_IMPORT);
                }
            }), 10);
        } else {
            add(col, text(tr("Copie tes fichiers .aistory dans le dossier « Herodio » de la carte SD, puis relance l'application."), 15, MUTED, false), 6);
        }
        if (message.length() > 0) add(col, text(message, 16, CHOICE[0], true), 10);
        if (library.isEmpty()) {
            add(col, text(tr("Aucune histoire pour l'instant. Crée-en une avec Herodio Studio, puis « Exporter mon histoire » → Android."), 18, MUTED, false), 24);
            return;
        }
        // Deux colonnes sur tablette ou en paysage, une sur téléphone.
        int widthDp = (int) (Math.min(getResources().getDisplayMetrics().widthPixels, px(820)) / dp);
        int cols = widthDp >= 560 ? 2 : 1;
        LinearLayout row = null;
        for (int i = 0; i < library.size(); i++) {
            if (i % cols == 0) {
                row = new LinearLayout(this);
                add(col, row, 14);
            }
            View card = storyCard(i, (widthDp - 32 - (cols - 1) * 14) / cols);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
            if (i % cols > 0) lp.leftMargin = px(14);
            row.addView(card, lp);
            if (i == libSel) scrollTo(card);
        }
        if (library.size() % cols != 0) row.addView(new View(this), new LinearLayout.LayoutParams(0, 1, 1));
        add(col, text(tr("Appui long sur une histoire pour la supprimer."), 13, MUTED, false), 16);
    }

    private View storyCard(final int i, int widthDp) {
        Library.Entry e = library.get(i);
        int color = parseColor(e.story.color, ACCENT);
        boolean sel = i == libSel;
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundDrawable(box(Color.WHITE, sel ? color : 0, 22));
        int pad = sel ? px(3) : 0;
        card.setPadding(pad, pad, pad, px(14));
        Bitmap cover = image(e.dir, e.story.cover, px(widthDp));
        if (cover != null) card.addView(new Views.RoundImage(this, cover, px(20), true));
        View band = new View(this);
        band.setBackgroundColor(color);
        card.addView(band, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, px(6)));
        TextView title = text(e.story.title, 21, INK, true);
        title.setPadding(px(14), px(10), px(14), 0);
        card.addView(title);
        String sub = e.story.description.length() > 0 ? e.story.description : (e.story.author.length() > 0 ? tr("par {}", e.story.author) : "");
        if (sub.length() > 0) {
            TextView d = text(sub, 15, MUTED, false);
            d.setPadding(px(14), px(2), px(14), 0);
            card.addView(d);
        }
        card.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { open(i); } });
        card.setOnLongClickListener(new View.OnLongClickListener() { public boolean onLongClick(View v) { confirmDelete(i); return true; } });
        return card;
    }

    private void scrollTo(final View v) {
        v.post(new Runnable() {
            public void run() {
                View p = v;
                int top = 0;
                while (p.getParent() instanceof View && !(p.getParent() instanceof ScrollView)) { top += p.getTop(); p = (View) p.getParent(); }
                if (p.getParent() instanceof ScrollView) ((ScrollView) p.getParent()).smoothScrollTo(0, Math.max(0, top - px(40)));
            }
        });
    }

    private void confirmDelete(final int i) {
        final Library.Entry e = library.get(i);
        new AlertDialog.Builder(this).setTitle(tr("Supprimer « {} » ?", e.story.title))
            .setPositiveButton(tr("Supprimer"), new DialogInterface.OnClickListener() {
                public void onClick(DialogInterface d, int w) { Library.deleteTree(e.dir); message = ""; showLibrary(); }
            })
            .setNegativeButton(tr("Annuler"), null).show();
    }

    private void open(int i) {
        message = "";
        lastToken = "";
        Library.Entry e = library.get(i);
        session = new Session(e.dir, e.story, this);
        session.restart();
    }

    // ---------------------------------------------------------------- lecture

    /** Appelé par la session à chaque changement (nouveau bloc, fin d'un son, surbrillance). */
    public void onChange() {
        if (session == null) return;
        final Session s = session;
        int color = parseColor(s.engine.story.color, ACCENT);
        boolean fresh = !s.engine.token().equals(lastToken);
        lastToken = s.engine.token();
        FrameLayout[] overlay = new FrameLayout[1];
        LinearLayout col = page(color, overlay);

        LinearLayout top = new LinearLayout(this);
        top.setGravity(Gravity.CENTER_VERTICAL);
        top.addView(pill("◀", Color.WHITE, INK, new View.OnClickListener() { public void onClick(View v) { closeStory(); } }));
        TextView title = text("  " + s.engine.story.title, 16, mix(color, INK, 0.4f), true);
        top.addView(title, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        add(col, top, 0);
        String inv = s.inventory();
        if (inv.length() > 0) {
            TextView bag = text(Build.VERSION.SDK_INT >= 19 ? "🎒 " + inv : tr("Sac : {}", inv), 15, Color.WHITE, true);
            bag.setBackgroundDrawable(box(VIOLET, 0, 16));
            bag.setPadding(px(12), px(6), px(12), px(6));
            LinearLayout wrap = new LinearLayout(this);
            wrap.addView(bag);
            add(col, wrap, 10);
        }

        LinearLayout body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        int contentWidth = Math.min(getResources().getDisplayMetrics().widthPixels, px(820)) - px(32);
        Bitmap pic = s.engine.node != null ? image(s.dir, s.engine.node.image, contentWidth) : null;
        if (pic != null) add(body, new Views.RoundImage(this, pic, px(24), false), 14);

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(px(20), px(16), px(20), px(18));
        card.setBackgroundDrawable(box(0xF2FFFFFF, s.reading == 0 ? color : 0, 24)); // surligné pendant qu'on le lit
        String end = s.endLabel();
        if (end != null) {
            String k = s.engine.node != null ? s.engine.node.kind : null;
            int c = "secret".equals(k) ? VIOLET : "sad".equals(k) ? 0xFF3B7FF5 : CHOICE[0];
            TextView banner = text(("secret".equals(k) ? "★  " : "♥  ") + end, 18, Color.WHITE, true);
            banner.setBackgroundDrawable(box(c, 0, 14));
            banner.setPadding(px(14), px(5), px(14), px(5));
            LinearLayout wrap = new LinearLayout(this);
            wrap.addView(banner);
            card.addView(wrap);
        }
        LinearLayout titleRow = new LinearLayout(this);
        titleRow.setGravity(Gravity.CENTER_VERTICAL);
        titleRow.addView(text(s.title(), 26, mix(color, INK, 0.35f), true), new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        if (s.isPlaying()) titleRow.addView(new Views.Equalizer(this, color));
        card.addView(titleRow);
        if (s.text().length() > 0) card.addView(text(s.text(), 19, INK, false));
        add(body, card, 14);

        String[] options = s.options();
        for (int i = 0; i < options.length; i++) add(body, choiceButton(s, i, options[i]), 12);
        if (options.length == 0 && end == null) {
            add(body, pill(tr("Suivant  ▶"), color, Color.WHITE, new View.OnClickListener() { public void onClick(View v) { s.next(); } }), 16);
        }
        if (end != null) {
            add(body, pill(tr("Rejouer"), color, Color.WHITE, new View.OnClickListener() { public void onClick(View v) { s.restart(); } }), 16);
            add(body, pill(tr("Mes histoires"), Color.WHITE, INK, new View.OnClickListener() { public void onClick(View v) { closeStory(); } }), 10);
        }
        col.addView(body);
        if (fresh) { // fondu à chaque nouveau moment de l'histoire
            AlphaAnimation a = new AlphaAnimation(0f, 1f);
            a.setDuration(350);
            body.startAnimation(a);
        }
        if (fresh && end != null && !"sad".equals(s.engine.node != null ? s.engine.node.kind : null)) {
            overlay[0].addView(new Views.Confetti(this, "secret".equals(s.engine.node != null ? s.engine.node.kind : null)),
                new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        }
    }

    /** Grande réponse colorée avec sa pastille numérotée ; celle qui est surlignée a un contour blanc. */
    private View choiceButton(final Session s, final int i, String label) {
        int c = CHOICE[i % CHOICE.length];
        boolean sel = i == s.selected && s.reading != 0;
        LinearLayout b = new LinearLayout(this);
        if (sel && s.reading > 0) scrollTo(b);
        b.setGravity(Gravity.CENTER_VERTICAL);
        GradientDrawable bg = box(c, 0, 32);
        if (sel) bg.setStroke(px(4), Color.WHITE);
        b.setBackgroundDrawable(bg);
        b.setPadding(px(10), px(10), px(18), px(10));
        TextView num = text(String.valueOf(i + 1), 20, c, true);
        num.setGravity(Gravity.CENTER);
        GradientDrawable circle = new GradientDrawable();
        circle.setShape(GradientDrawable.OVAL);
        circle.setColor(Color.WHITE);
        num.setBackgroundDrawable(circle);
        b.addView(num, new LinearLayout.LayoutParams(px(40), px(40)));
        TextView t = text(label, 20, Color.WHITE, true);
        t.setPadding(px(14), 0, 0, 0);
        b.addView(t, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        b.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { s.choose(i); } });
        return b;
    }

    private void closeStory() {
        if (session != null) session.stop();
        showLibrary();
    }

    // ---------------------------------------------------------------- touches physiques (D-pad, Xperia Play, clavier, manette)

    /** Interception en amont des vues : sur Android 2.3, certaines touches (chiffres) n'arrivent jamais à onKeyDown. */
    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int code = event.getKeyCode();
        if (event.getAction() == KeyEvent.ACTION_DOWN && handleKey(code)) { handledDown = code; return true; }
        // Le relâchement d'une touche déjà traitée ne doit pas « cliquer » le bouton qui a pris le focus dans le nouvel écran.
        if (event.getAction() == KeyEvent.ACTION_UP && code == handledDown) { handledDown = -1; return true; }
        return super.dispatchKeyEvent(event);
    }

    private int handledDown = -1;

    private boolean handleKey(int code) {
        if (langSel >= 0) {
            switch (code) {
                case KeyEvent.KEYCODE_DPAD_UP: case KeyEvent.KEYCODE_DPAD_DOWN: case KeyEvent.KEYCODE_DPAD_LEFT: case KeyEvent.KEYCODE_DPAD_RIGHT:
                    langSel = 1 - langSel; showLanguage(); return true;
                case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER: case KeyEvent.KEYCODE_SPACE: case KeyEvent.KEYCODE_BUTTON_A: case KeyEvent.KEYCODE_BUTTON_X:
                    setLanguage(langSel == 1); return true;
                case KeyEvent.KEYCODE_1: setLanguage(false); return true;
                case KeyEvent.KEYCODE_2: setLanguage(true); return true;
            }
            return false;
        }
        if (session != null) {
            switch (code) {
                case KeyEvent.KEYCODE_DPAD_UP: case KeyEvent.KEYCODE_DPAD_LEFT: session.select(-1); return true;
                case KeyEvent.KEYCODE_DPAD_DOWN: case KeyEvent.KEYCODE_DPAD_RIGHT: session.select(1); return true;
                case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER: case KeyEvent.KEYCODE_SPACE:
                case KeyEvent.KEYCODE_BUTTON_A: case KeyEvent.KEYCODE_BUTTON_X: session.confirm(); return true;
                case KeyEvent.KEYCODE_BACK: case KeyEvent.KEYCODE_BUTTON_B: closeStory(); return true;
                default:
                    if (code >= KeyEvent.KEYCODE_1 && code <= KeyEvent.KEYCODE_9) { session.choose(code - KeyEvent.KEYCODE_1); return true; }
            }
        } else if (library != null && !library.isEmpty()) {
            switch (code) {
                case KeyEvent.KEYCODE_DPAD_UP: case KeyEvent.KEYCODE_DPAD_LEFT: libSel = (libSel + library.size() - 1) % library.size(); showLibrary(); return true;
                case KeyEvent.KEYCODE_DPAD_DOWN: case KeyEvent.KEYCODE_DPAD_RIGHT: libSel = (libSel + 1) % library.size(); showLibrary(); return true;
                case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER: case KeyEvent.KEYCODE_BUTTON_A: case KeyEvent.KEYCODE_BUTTON_X:
                    open(libSel); return true;
            }
        }
        return false;
    }
}
