package org.herodio.core;

import java.io.File;
import java.io.FileInputStream;

import android.media.MediaPlayer;

/** Une partie en cours : moteur + son. Partagé par les lecteurs Android 2.3 et Android moderne. */
public final class Session implements MediaPlayer.OnCompletionListener {
    public interface Listener { void onChange(); }

    public final Engine engine;
    public final File dir;
    /** Réponse surlignée (navigation D-pad / clavier). */
    public int selected;
    /** Ce qui est lu à voix haute : 0 = le texte, i + 1 = la réponse i, -1 = rien. */
    public int reading = -1;
    /** Lecture enchaînée du texte puis de chaque réponse ; coupée dès qu'on choisit soi-même une réponse. */
    private boolean chain;
    private MediaPlayer player;
    private final Listener listener;

    public Session(File dir, Engine.Story story, Listener listener) {
        this.dir = dir;
        this.engine = new Engine(story);
        this.listener = listener;
    }

    public void restart() {
        engine.start();
        enter();
    }

    private void enter() {
        selected = 0;
        chain = true;
        readFrom(0);
        listener.onChange();
    }

    private String itemAudio(int k) {
        if (engine.node == null) return null;
        if (k == 0) return engine.node.audio;
        return k <= options().length ? engine.node.options[k - 1].audio : null;
    }

    /** Lit le premier élément sonore à partir de k, en surlignant la réponse lue. */
    private void readFrom(int k) {
        reading = -1;
        stop();
        for (; k <= options().length; k++) {
            if (play(itemAudio(k))) {
                reading = k;
                if (k > 0) selected = k - 1;
                return;
            }
        }
        selected = 0; // tout est lu : la surbrillance revient sur le choix 1
    }

    /** Joue un son du pack ; renvoie false s'il n'y en a pas ou s'il est illisible. */
    private boolean play(String rel) {
        stop();
        if (rel == null || rel.contains("..") || rel.startsWith("/")) return false;
        File f = new File(dir, rel);
        if (!f.isFile()) return false;
        try {
            player = new MediaPlayer();
            // Descripteur ouvert par l'application : le service média n'a pas accès à ses fichiers privés.
            FileInputStream in = new FileInputStream(f);
            try { player.setDataSource(in.getFD()); } finally { in.close(); }
            player.setOnCompletionListener(this);
            player.prepare();
            player.start();
            return true;
        } catch (Exception e) {
            stop();
            return false;
        }
    }

    public boolean isPlaying() {
        try { return player != null && player.isPlaying(); } catch (IllegalStateException e) { return false; }
    }

    public void onCompletion(MediaPlayer mp) {
        if (mp != player) return;
        int k = reading;
        stop();
        reading = -1;
        if (k >= 0 && "scene".equals(engine.node.type)) { next(); return; }
        if (k >= 0 && chain) readFrom(k + 1);
        listener.onChange();
    }

    public void stop() {
        if (player != null) {
            try { player.stop(); } catch (IllegalStateException ignored) {}
            player.release();
            player = null;
        }
    }

    public void next() {
        if (engine.node != null && "scene".equals(engine.node.type)) {
            engine.next();
            enter();
        }
    }

    public void choose(int i) {
        if (engine.node != null && "choice".equals(engine.node.type) && i >= 0 && i < engine.node.options.length) {
            engine.choose(i);
            enter();
        }
    }

    /** Déplace la surbrillance et fait entendre la réponse (comme la molette d'une boîte à histoires). */
    public void select(int delta) {
        int n = options().length;
        if (n == 0) return;
        selected = ((selected + delta) % n + n) % n;
        playOption();
        listener.onChange();
    }

    public void playOption() {
        String[] o = options();
        if (selected < o.length) {
            chain = false;
            reading = play(engine.node.options[selected].audio) ? selected + 1 : -1;
        }
    }

    /** Valide : passe la scène, choisit la réponse surlignée, ou rejoue après la fin. */
    public void confirm() {
        if (engine.status == Engine.PLAYING && "scene".equals(engine.node.type)) next();
        else if (engine.status == Engine.PLAYING) choose(selected);
        else restart();
    }

    public String[] options() {
        if (engine.status != Engine.PLAYING || !"choice".equals(engine.node.type)) return new String[0];
        Engine.Option[] o = engine.node.options;
        String[] out = new String[o.length];
        for (int i = 0; i < o.length; i++) out[i] = o[i].text.length() > 0 ? o[i].text : "Choix " + (i + 1);
        return out;
    }

    public String title() {
        if (engine.status == Engine.ERROR) return "Oups !";
        return engine.node != null ? engine.node.title : "Fin";
    }

    public String text() {
        if (engine.status == Engine.ERROR) return "Cette histoire tourne en rond sans fin. Demande à son auteur de la vérifier.";
        return engine.node != null ? engine.node.text : "L'histoire s'arrête ici.";
    }

    /** Libellé de fin, ou null si l'histoire continue. */
    public String endLabel() {
        if (engine.status == Engine.PLAYING) return null;
        String k = engine.node != null ? engine.node.kind : null;
        if ("happy".equals(k)) return "Fin heureuse";
        if ("sad".equals(k)) return "Fin triste";
        if ("secret".equals(k)) return "Fin secrète !";
        return "Fin";
    }

    public String inventory() {
        StringBuilder b = new StringBuilder();
        for (String id : engine.items) {
            if (b.length() > 0) b.append(" · ");
            b.append(engine.story.itemName(id));
        }
        return b.toString();
    }
}
