package org.herodio.player;

import java.io.File;
import java.io.InputStream;
import java.util.List;

import org.herodio.core.Library;
import org.herodio.core.Session;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
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
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/**
 * Lecteur Herodio pour Android — un seul APK de Android 2.3 (API 9) à Android 14.
 * Interface construite en code (aucune bibliothèque), utilisable au doigt, au D-pad, au clavier ou à la manette.
 * Compilé contre l'API 9 : toute API plus récente doit passer par une chaîne ou un test de Build.VERSION.SDK_INT.
 */
public class MainActivity extends Activity implements Session.Listener {
    private static final int ACCENT = 0xFF5B5BD6, ORANGE = 0xFFF28A1C, BG = 0xFFF4F1EA, INK = 0xFF26233A, MUTED = 0xFF6E6A85, LINE = 0xFFE4DFD3;
    private static final int REQ_IMPORT = 1;
    /** ACTION_OPEN_DOCUMENT (API 19), en toutes lettres pour rester compilable avec l'API 9. */
    private static final String OPEN_DOCUMENT = "android.intent.action.OPEN_DOCUMENT";

    private File root;
    private List<Library.Entry> library;
    private int libSel;
    private Session session;
    private String message = "";
    private float dp;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        dp = getResources().getDisplayMetrics().density;
        // Aucun champ de saisie : la fenêtre n'utilise pas de clavier virtuel, qui pourrait avaler les touches
        // (constaté avec PinyinIME sur Android 2.3 : les chiffres n'arrivaient jamais).
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM, WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM);
        root = Library.root(this);
        importSdFolder();
        if (!handleView(getIntent())) showLibrary();
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
        if (n > 0) message = n + " nouvelle(s) histoire(s) ajoutée(s)";
    }

    /** « Ouvrir avec Herodio » depuis un gestionnaire de fichiers. */
    private boolean handleView(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction()) || intent.getData() == null) return false;
        importUri(intent.getData());
        return true;
    }

    private void importUri(final Uri uri) {
        message = "Ajout de l'histoire…";
        showLibrary();
        new Thread() {
            public void run() {
                String msg;
                try {
                    InputStream in = getContentResolver().openInputStream(uri);
                    try { msg = "Histoire ajoutée : " + Library.load(Library.importPack(in, root, null)).title; } finally { in.close(); }
                } catch (Exception e) {
                    msg = "Ce fichier n'est pas une histoire Herodio valide.";
                }
                final String m = msg;
                runOnUiThread(new Runnable() { public void run() { message = m; showLibrary(); } });
            }
        }.start();
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == REQ_IMPORT && res == RESULT_OK && data != null && data.getData() != null) importUri(data.getData());
    }

    // ---------------------------------------------------------------- interface

    private int px(float v) { return Math.round(v * dp); }

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

    private TextView button(String s, int fill, int textColor, View.OnClickListener l) {
        TextView b = text(s, 20, textColor, true);
        b.setBackgroundDrawable(box(fill, fill == Color.WHITE ? ORANGE : 0, 16));
        b.setPadding(px(18), px(14), px(18), px(14));
        b.setOnClickListener(l);
        return b;
    }

    private LinearLayout page() {
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        int pad = px(16);
        col.setPadding(pad, pad, pad, pad);
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(BG);
        scroll.setFillViewport(true);
        // Sur tablette, le contenu reste centré avec une largeur confortable.
        FrameLayout center = new FrameLayout(this);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(Math.min(getResources().getDisplayMetrics().widthPixels, px(760)), ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.gravity = Gravity.CENTER_HORIZONTAL;
        center.addView(col, lp);
        scroll.addView(center);
        setContentView(scroll);
        return col;
    }

    private void add(LinearLayout parent, View v, int marginTop) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = px(marginTop);
        parent.addView(v, lp);
    }

    private void showLibrary() {
        session = null;
        library = Library.list(root);
        libSel = Math.min(libSel, Math.max(0, library.size() - 1));
        LinearLayout col = page();
        add(col, text("Mes histoires", 30, INK, true), 0);
        if (Build.VERSION.SDK_INT >= 19) {
            add(col, button("+ Ajouter une histoire (.aistory)", ACCENT, Color.WHITE, new View.OnClickListener() {
                public void onClick(View v) {
                    Intent i = new Intent(OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                    startActivityForResult(i, REQ_IMPORT);
                }
            }), 10);
        } else {
            add(col, text("Copie tes fichiers .aistory dans le dossier « Herodio » de la carte SD, puis relance l'application.", 15, MUTED, false), 6);
        }
        if (message.length() > 0) add(col, text(message, 16, ORANGE, true), 10);
        if (library.isEmpty()) {
            add(col, text("Aucune histoire pour l'instant. Crée-en une avec Herodio Studio, puis « Exporter mon histoire » → Android.", 18, MUTED, false), 24);
        }
        for (int i = 0; i < library.size(); i++) {
            final int idx = i;
            Library.Entry e = library.get(i);
            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(px(16), px(14), px(16), px(14));
            card.setBackgroundDrawable(box(i == libSel ? 0xFFF0EEFB : Color.WHITE, i == libSel ? ACCENT : LINE, 18));
            card.addView(text(e.story.title, 22, INK, true));
            if (e.story.author.length() > 0) card.addView(text("par " + e.story.author, 14, MUTED, false));
            if (e.story.description.length() > 0) card.addView(text(e.story.description, 16, MUTED, false));
            card.setOnClickListener(new View.OnClickListener() { public void onClick(View v) { open(idx); } });
            card.setOnLongClickListener(new View.OnLongClickListener() { public boolean onLongClick(View v) { confirmDelete(idx); return true; } });
            add(col, card, 12);
            if (i == libSel) scrollTo(card);
        }
        if (!library.isEmpty()) add(col, text("Appui long sur une histoire pour la supprimer.", 13, MUTED, false), 14);
    }

    private void scrollTo(final View v) {
        v.post(new Runnable() {
            public void run() { scrollParent(v); }
        });
    }

    private void scrollParent(View v) {
        View p = v;
        while (p.getParent() instanceof View && !(p.getParent() instanceof ScrollView)) p = (View) p.getParent();
        if (p.getParent() instanceof ScrollView) ((ScrollView) p.getParent()).smoothScrollTo(0, Math.max(0, v.getTop() - px(40)));
    }

    private void confirmDelete(final int i) {
        final Library.Entry e = library.get(i);
        new AlertDialog.Builder(this).setTitle("Supprimer « " + e.story.title + " » ?")
            .setPositiveButton("Supprimer", new DialogInterface.OnClickListener() {
                public void onClick(DialogInterface d, int w) { Library.deleteTree(e.dir); message = ""; showLibrary(); }
            })
            .setNegativeButton("Annuler", null).show();
    }

    private void open(int i) {
        message = "";
        Library.Entry e = library.get(i);
        session = new Session(e.dir, e.story, this);
        session.restart();
    }

    /** Appelé par la session à chaque changement (nouveau bloc, fin d'un son, surbrillance). */
    public void onChange() {
        if (session == null) return;
        final Session s = session;
        LinearLayout col = page();
        LinearLayout top = new LinearLayout(this);
        top.setGravity(Gravity.CENTER_VERTICAL);
        TextView back = button("◀", Color.WHITE, INK, new View.OnClickListener() { public void onClick(View v) { closeStory(); } });
        top.addView(back);
        TextView title = text("  " + s.engine.story.title, 16, MUTED, true);
        top.addView(title, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        add(col, top, 0);
        String inv = s.inventory();
        if (inv.length() > 0) add(col, text("Sac : " + inv, 15, 0xFF8B5CF6, true), 8);

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(px(20), px(18), px(20), px(18));
        card.setBackgroundDrawable(box(Color.WHITE, 0, 22));
        String end = s.endLabel();
        if (end != null) card.addView(text(end, 18, ORANGE, true));
        card.addView(text(s.title() + (s.isPlaying() ? "  ♪" : ""), 26, INK, true));
        if (s.text().length() > 0) card.addView(text(s.text(), 19, INK, false));
        add(col, card, 14);

        String[] options = s.options();
        for (int i = 0; i < options.length; i++) {
            final int idx = i;
            boolean sel = i == s.selected;
            add(col, button((i + 1) + "   " + options[i], sel ? ORANGE : Color.WHITE, sel ? Color.WHITE : INK, new View.OnClickListener() {
                public void onClick(View v) { s.choose(idx); }
            }), 12);
        }
        if (options.length == 0 && end == null) {
            add(col, button("Suivant ▶", ACCENT, Color.WHITE, new View.OnClickListener() { public void onClick(View v) { s.next(); } }), 16);
        }
        if (end != null) {
            add(col, button("Rejouer", ACCENT, Color.WHITE, new View.OnClickListener() { public void onClick(View v) { s.restart(); } }), 16);
            add(col, button("Mes histoires", Color.WHITE, INK, new View.OnClickListener() { public void onClick(View v) { closeStory(); } }), 10);
        }
    }

    private void closeStory() {
        if (session != null) session.stop();
        showLibrary();
    }

    // ---------------------------------------------------------------- touches physiques (D-pad, Xperia Play, clavier, manette)

    /** Interception en amont des vues : sur Android 2.3, certaines touches (chiffres) n'arrivent jamais à onKeyDown. */
    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN && handleKey(event.getKeyCode())) return true;
        return super.dispatchKeyEvent(event);
    }

    private boolean handleKey(int code) {
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
                case KeyEvent.KEYCODE_DPAD_UP: libSel = (libSel + library.size() - 1) % library.size(); showLibrary(); return true;
                case KeyEvent.KEYCODE_DPAD_DOWN: libSel = (libSel + 1) % library.size(); showLibrary(); return true;
                case KeyEvent.KEYCODE_DPAD_CENTER: case KeyEvent.KEYCODE_ENTER: case KeyEvent.KEYCODE_BUTTON_A: case KeyEvent.KEYCODE_BUTTON_X:
                    open(libSel); return true;
            }
        }
        return false;
    }
}
