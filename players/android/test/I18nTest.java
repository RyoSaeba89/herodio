import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.herodio.core.I18n;

/** Chaque tr("…") des sources Android a sa traduction anglaise, avec autant de « {} ». Usage : java I18nTest <dossier android> */
public class I18nTest {
    public static void main(String[] args) throws Exception {
        Pattern p = Pattern.compile("tr\\(\"((?:[^\"\\\\]|\\\\.)*)\"");
        int n = 0, bad = 0;
        for (String dir : new String[] { "app/src/org/herodio/player", "common/org/herodio/core" }) {
            File[] files = new File(args[0], dir).listFiles();
            for (File f : files) {
                if (!f.getName().endsWith(".java") || f.getName().equals("I18n.java")) continue;
                Matcher m = p.matcher(new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8));
                while (m.find()) {
                    String fr = m.group(1).replace("\\\"", "\"");
                    n++;
                    I18n.setEnglish(true);
                    String en = I18n.tr(fr);
                    if (en.equals(fr) || count(fr) != count(en)) { System.out.println("✘ " + f.getName() + " : " + fr); bad++; }
                }
            }
        }
        I18n.setEnglish(true);
        check(I18n.tr("Supprimer « {} » ?", "Soupe").equals("Delete “Soupe”?"), "remplissage des {}");
        I18n.setEnglish(false);
        check(I18n.tr("Choix {}", 2).equals("Choix 2"), "français par défaut");
        check(n >= 20, n + " textes trouvés");
        if (bad > 0) { System.out.println(bad + " texte(s) sans traduction"); System.exit(1); }
        System.out.println("Traductions Android : " + n + " textes OK");
    }

    static int count(String s) { return s.split("\\{\\}", -1).length - 1; }

    static void check(boolean ok, String what) {
        if (!ok) { System.out.println("✘ " + what); System.exit(1); }
    }
}
