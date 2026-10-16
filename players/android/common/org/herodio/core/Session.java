package org.herodio.core;

import java.io.File;
import java.io.FileInputStream;

import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.media.MediaPlayer;

import static org.herodio.core.I18n.tr;

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
    /**
     * Silence joué en boucle dès le premier son : la sortie audio ne se met plus en veille entre deux sons.
     * Au réveil, certains téléphones et casques Bluetooth remontent le volume progressivement et le début du son était trop faible.
     */
    private AudioTrack silence;
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

    /** Relit le moment en cours depuis le début : le texte, puis chaque réponse. */
    public void replay() {
        selected = 0;
        chain = true;
        readFrom(0);
        listener.onChange();
    }

    /** Le moment en cours a-t-il au moins un son ? */
    public boolean hasAudio() {
        for (int k = 0; k <= options().length; k++) if (itemAudio(k) != null) return true;
        return false;
    }

    /** Lit le premier élément sonore à partir de k, en surlignant la réponse lue. */
    private void readFrom(int k) {
        reading = -1;
        stopSound();
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
        stopSound();
        if (rel == null || rel.contains("..") || rel.startsWith("/")) return false;
        File f = new File(dir, rel);
        if (!f.isFile()) return false;
        keepAwake();
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
            stopSound();
            return false;
        }
    }

    private void keepAwake() {
        if (silence != null) return;
        int n = 22050; // une seconde en 16 bits mono
        AudioTrack t = null;
        try {
            t = new AudioTrack(AudioManager.STREAM_MUSIC, n, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT, n * 2, AudioTrack.MODE_STATIC);
            t.write(new short[n], 0, n);
            t.setLoopPoints(0, n, -1);
            t.play();
            silence = t;
        } catch (Exception e) {
            if (t != null) t.release(); // sans piste silencieuse, les sons sont joués quand même
        }
    }

    public boolean isPlaying() {
        try { return player != null && player.isPlaying(); } catch (IllegalStateException e) { return false; }
    }

    public void onCompletion(MediaPlayer mp) {
        if (mp != player) return;
        int k = reading;
        stopSound();
        reading = -1;
        if (k >= 0 && "scene".equals(engine.node.type)) { next(); return; }
        if (k >= 0 && chain) readFrom(k + 1);
        listener.onChange();
    }

    /** Coupe tout, silence compris : on quitte l'histoire ou l'application passe en arrière-plan. */
    public void stop() {
        stopSound();
        if (silence != null) {
            silence.release();
            silence = null;
        }
    }

    private void stopSound() {
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
        for (int i = 0; i < o.length; i++) out[i] = o[i].text.length() > 0 ? o[i].text : tr("Choix {}", i + 1);
        return out;
    }

    public String title() {
        if (engine.status == Engine.ERROR) return tr("Oups !");
        return engine.node != null ? engine.node.title : tr("Fin");
    }

    public String text() {
        if (engine.status == Engine.ERROR) return tr("Cette histoire tourne en rond sans fin. Demande à son auteur de la vérifier.");
        return engine.node != null ? engine.node.text : tr("L'histoire s'arrête ici.");
    }

    /** Libellé de fin, ou null si l'histoire continue. */
    public String endLabel() {
        if (engine.status == Engine.PLAYING) return null;
        String k = engine.node != null ? engine.node.kind : null;
        if ("happy".equals(k)) return tr("Fin heureuse");
        if ("sad".equals(k)) return tr("Fin triste");
        if ("secret".equals(k)) return tr("Fin secrète !");
        return tr("Fin");
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
