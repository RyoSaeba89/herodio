import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.herodio.core.Engine;
import org.json.JSONArray;
import org.json.JSONObject;

/** Exécute spec/conformance/*.json sur le moteur Java (JVM de bureau + org.json). */
public class ConformanceTest {
    public static void main(String[] args) throws Exception {
        File dir = new File(args[0]);
        int ok = 0;
        File[] files = dir.listFiles();
        java.util.Arrays.sort(files);
        for (File f : files) {
            if (!f.getName().endsWith(".json")) continue;
            JSONObject c = new JSONObject(new String(java.nio.file.Files.readAllBytes(f.toPath()), "UTF-8"));
            Engine e = new Engine(Engine.parse(c.getJSONObject("story").toString()));
            e.start();
            List<String> trace = new ArrayList<String>();
            trace.add(e.token());
            JSONArray inputs = c.getJSONArray("inputs");
            for (int i = 0; i < inputs.length(); i++) {
                String in = inputs.getString(i);
                if (in.equals("next")) e.next();
                else if (in.equals("restart")) e.start();
                else e.choose(Integer.parseInt(in.substring(7)));
                trace.add(e.token());
            }
            List<String> expected = new ArrayList<String>();
            JSONArray t = c.getJSONArray("trace");
            for (int i = 0; i < t.length(); i++) expected.add(t.getString(i));
            check(trace.equals(expected), f.getName() + " trace " + trace + " ≠ " + expected);
            List<String> items = new ArrayList<String>(e.items), exp = new ArrayList<String>();
            JSONArray fi = c.getJSONObject("final").getJSONArray("items");
            for (int i = 0; i < fi.length(); i++) exp.add(fi.getString(i));
            Collections.sort(items);
            Collections.sort(exp);
            check(items.equals(exp), f.getName() + " objets " + items + " ≠ " + exp);
            JSONObject vars = c.getJSONObject("final").getJSONObject("vars");
            for (java.util.Iterator<String> k = vars.keys(); k.hasNext();) {
                String key = k.next();
                Integer v = e.vars.get(key);
                check(v != null && v.intValue() == vars.getInt(key), f.getName() + " compteur " + key);
            }
            ok++;
        }
        check(ok >= 4, "trop peu de tests");
        System.out.println("Conformance Java : " + ok + " fichiers OK");
    }

    static void check(boolean b, String msg) {
        if (!b) { System.err.println("ÉCHEC : " + msg); System.exit(1); }
    }
}
