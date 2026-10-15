package org.herodio.core;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Moteur narratif Herodio — portage Java (compatible Android 2.3 / API 9) de editor/src/engine/engine.ts.
 * Mêmes règles, vérifiées par les tests de conformance (spec/conformance).
 */
public final class Engine {
    public static final int MAX_AUTO_STEPS = 1000;
    public static final int PLAYING = 0, END = 1, ERROR = 2;

    public static final class Option {
        public String text, audio, next;
    }

    public static final class Test {
        public String kind, item, var, op, node;
        public int value;
    }

    public static final class Node {
        public String id, type, title = "", text = "", audio, kind, op, item, var, next, then, otherwise, target;
        public int value;
        public boolean reset;
        public Option[] options = new Option[0];
        public Test test;
    }

    public static final class Story {
        public String id, title, author, description, start;
        public final List<String[]> items = new ArrayList<String[]>();      // {id, nom}
        public final List<Object[]> variables = new ArrayList<Object[]>();  // {id, nom, valeur initiale}
        public final List<Node> nodes = new ArrayList<Node>();
        final Map<String, Node> index = new HashMap<String, Node>();

        public String itemName(String id) {
            for (String[] i : items) if (i[0].equals(id)) return i[1];
            return id;
        }
    }

    /** Android renvoie "null" pour optString sur une valeur JSON null : on corrige ici. */
    private static String str(JSONObject o, String key) {
        return o.isNull(key) ? null : o.optString(key, null);
    }

    public static Story parse(String json) throws JSONException {
        JSONObject o = new JSONObject(json);
        if (!"herodio-story".equals(o.optString("format"))) throw new JSONException("Ce n'est pas une histoire Herodio");
        if (o.optInt("version", 1) > 1) throw new JSONException("Histoire créée avec une version plus récente d'Herodio");
        Story s = new Story();
        s.id = o.optString("id");
        s.title = o.optString("title");
        s.author = o.isNull("author") ? "" : o.optString("author");
        s.description = o.isNull("description") ? "" : o.optString("description");
        s.start = str(o, "start");
        JSONArray a = o.optJSONArray("items");
        for (int i = 0; a != null && i < a.length(); i++) {
            JSONObject it = a.getJSONObject(i);
            s.items.add(new String[] { it.getString("id"), it.optString("name") });
        }
        a = o.optJSONArray("variables");
        for (int i = 0; a != null && i < a.length(); i++) {
            JSONObject v = a.getJSONObject(i);
            s.variables.add(new Object[] { v.getString("id"), v.optString("name"), Integer.valueOf(v.optInt("initial")) });
        }
        a = o.getJSONArray("nodes");
        for (int i = 0; i < a.length(); i++) {
            JSONObject j = a.getJSONObject(i);
            Node n = new Node();
            n.id = j.getString("id");
            n.type = j.getString("type");
            n.title = j.isNull("title") ? "" : j.optString("title");
            n.text = j.isNull("text") ? "" : j.optString("text");
            n.audio = str(j, "audio");
            n.kind = str(j, "kind");
            n.op = str(j, "op");
            n.item = str(j, "item");
            n.var = str(j, "var");
            n.value = j.optInt("value");
            n.next = str(j, "next");
            n.then = str(j, "then");
            n.otherwise = str(j, "else");
            n.target = str(j, "target");
            n.reset = j.optBoolean("reset");
            JSONArray opts = j.optJSONArray("options");
            if (opts != null) {
                n.options = new Option[opts.length()];
                for (int k = 0; k < opts.length(); k++) {
                    JSONObject oj = opts.getJSONObject(k);
                    Option op = new Option();
                    op.text = oj.isNull("text") ? "" : oj.optString("text");
                    op.audio = str(oj, "audio");
                    op.next = str(oj, "next");
                    n.options[k] = op;
                }
            }
            JSONObject t = j.optJSONObject("test");
            if (t != null) {
                n.test = new Test();
                n.test.kind = t.optString("kind");
                n.test.item = str(t, "item");
                n.test.var = str(t, "var");
                n.test.op = str(t, "op");
                n.test.node = str(t, "node");
                n.test.value = t.optInt("value");
            }
            s.nodes.add(n);
            s.index.put(n.id, n);
        }
        return s;
    }

    public final Story story;
    public Node node;
    public int status = END;
    public final List<String> items = new ArrayList<String>();
    public final Map<String, Integer> vars = new HashMap<String, Integer>();
    private final Set<String> visited = new HashSet<String>();

    public Engine(Story story) {
        this.story = story;
    }

    private void reset() {
        items.clear();
        vars.clear();
        for (Object[] v : story.variables) vars.put((String) v[0], (Integer) v[2]);
        visited.clear();
    }

    public void start() {
        reset();
        go(story.start);
    }

    public void next() {
        if (status == PLAYING && node != null && "scene".equals(node.type)) go(node.next);
    }

    public void choose(int index) {
        if (status != PLAYING || node == null || !"choice".equals(node.type)) return;
        if (index >= 0 && index < node.options.length) go(node.options[index].next);
    }

    public String token() {
        if (status == ERROR) return "#error";
        return node != null ? node.id : "#end";
    }

    private int var(String id) {
        Integer v = vars.get(id);
        return v == null ? 0 : v.intValue();
    }

    boolean test(Test t) {
        if ("item".equals(t.kind)) return items.contains(t.item);
        if ("visited".equals(t.kind)) return visited.contains(t.node);
        if ("var".equals(t.kind)) {
            int a = var(t.var), b = t.value;
            if ("==".equals(t.op)) return a == b;
            if ("!=".equals(t.op)) return a != b;
            if ("<".equals(t.op)) return a < b;
            if ("<=".equals(t.op)) return a <= b;
            if (">".equals(t.op)) return a > b;
            if (">=".equals(t.op)) return a >= b;
        }
        return false;
    }

    private void go(String id) {
        for (int steps = 0; steps <= MAX_AUTO_STEPS; steps++) {
            Node n = id == null ? null : story.index.get(id);
            if (n == null) { node = null; status = END; return; }
            visited.add(n.id);
            String t = n.type;
            if ("scene".equals(t) || "choice".equals(t)) { node = n; status = PLAYING; return; }
            if ("end".equals(t)) { node = n; status = END; return; }
            if ("item".equals(t)) {
                if ("give".equals(n.op)) { if (!items.contains(n.item)) items.add(n.item); }
                else items.remove(n.item);
                id = n.next;
            } else if ("var".equals(t)) {
                vars.put(n.var, Integer.valueOf(("set".equals(n.op) ? 0 : var(n.var)) + n.value));
                id = n.next;
            } else if ("cond".equals(t)) {
                id = test(n.test) ? n.then : n.otherwise;
            } else if ("jump".equals(t)) {
                if (n.reset) reset();
                id = n.target;
            } else {
                break; // type de bloc inconnu : erreur
            }
        }
        node = null;
        status = ERROR;
    }
}
