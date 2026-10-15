package org.herodio.core;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import android.content.Context;

/** Bibliothèque d'histoires : chaque pack .aistory est décompressé dans son propre dossier. */
public final class Library {
    public static final class Entry {
        public File dir;
        public Engine.Story story;
    }

    private Library() {}

    /** Stockage propre à l'application (carte SD si possible, sans permission depuis Android 4.4). */
    public static File root(Context c) {
        File base = c.getExternalFilesDir(null);
        if (base == null) base = c.getFilesDir();
        File r = new File(base, "histoires");
        r.mkdirs();
        return r;
    }

    public static String readText(File f) throws IOException {
        InputStream in = new FileInputStream(f);
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            copy(in, out);
            return new String(out.toByteArray(), "UTF-8");
        } finally {
            in.close();
        }
    }

    public static Engine.Story load(File dir) throws Exception {
        return Engine.parse(readText(new File(dir, "story.json")));
    }

    public static List<Entry> list(File root) {
        List<Entry> out = new ArrayList<Entry>();
        File[] dirs = root.listFiles();
        if (dirs == null) return out;
        for (File d : dirs) {
            if (!d.isDirectory() || d.getName().startsWith(".")) continue;
            try {
                Entry e = new Entry();
                e.dir = d;
                e.story = load(d);
                out.add(e);
            } catch (Exception ignored) {
                // pack abîmé : ignoré
            }
        }
        Collections.sort(out, new Comparator<Entry>() {
            public int compare(Entry a, Entry b) { return a.story.title.compareToIgnoreCase(b.story.title); }
        });
        return out;
    }

    /** Décompresse un pack ; refuse les chemins qui sortiraient du dossier (« zip slip »). Renvoie le dossier créé. */
    public static File importPack(InputStream in, File root, String source) throws Exception {
        File tmp = new File(root, ".import-" + System.currentTimeMillis());
        deleteTree(tmp);
        tmp.mkdirs();
        try {
            ZipInputStream z = new ZipInputStream(in);
            ZipEntry e;
            String rootPath = tmp.getCanonicalPath() + File.separator;
            while ((e = z.getNextEntry()) != null) {
                File f = new File(tmp, e.getName());
                if (!f.getCanonicalPath().startsWith(rootPath)) throw new IOException("Chemin interdit dans le pack : " + e.getName());
                if (e.isDirectory()) { f.mkdirs(); continue; }
                f.getParentFile().mkdirs();
                OutputStream out = new FileOutputStream(f);
                try { copy(z, out); } finally { out.close(); }
            }
            z.close();
            Engine.Story s = load(tmp);
            File dst = new File(root, safeName(s.id));
            deleteTree(dst);
            if (!tmp.renameTo(dst)) throw new IOException("Impossible de ranger l'histoire");
            if (source != null) {
                OutputStream m = new FileOutputStream(new File(dst, ".source"));
                m.write(source.getBytes("UTF-8"));
                m.close();
            }
            return dst;
        } finally {
            deleteTree(tmp);
        }
    }

    /** Importe les fichiers .aistory d'un dossier (ex. /sdcard/Herodio) qui ne l'ont pas encore été. */
    public static int importFolder(File folder, File root) {
        File[] files = folder.listFiles();
        if (files == null) return 0;
        List<String> known = new ArrayList<String>();
        File[] dirs = root.listFiles();
        if (dirs != null) for (File d : dirs) {
            File m = new File(d, ".source");
            if (m.isFile()) try { known.add(readText(m)); } catch (IOException ignored) {}
        }
        int n = 0;
        for (File f : files) {
            if (!f.getName().toLowerCase().endsWith(".aistory")) continue;
            String sig = f.getAbsolutePath() + "|" + f.length() + "|" + f.lastModified();
            if (known.contains(sig)) continue;
            try {
                InputStream in = new FileInputStream(f);
                try { importPack(in, root, sig); n++; } finally { in.close(); }
            } catch (Exception ignored) {
                // pack invalide : ignoré
            }
        }
        return n;
    }

    static String safeName(String id) {
        String s = id == null ? "" : id.replaceAll("[^A-Za-z0-9_-]", "");
        return s.length() == 0 ? "histoire" : s;
    }

    static void copy(InputStream in, OutputStream out) throws IOException {
        byte[] buf = new byte[16384];
        int r;
        while ((r = in.read(buf)) > 0) out.write(buf, 0, r);
    }

    public static void deleteTree(File f) {
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) deleteTree(k);
        f.delete();
    }
}
