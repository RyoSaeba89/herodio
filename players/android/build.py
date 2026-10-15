"""Compile l'APK Herodio sans Gradle : javac (contre l'API 9) → d8 → aapt → zipalign → apksigner.

Usage : python build.py            (nécessite un JDK et le SDK Android : platforms android-9 et android-34, build-tools ≥ 30)
Résultat : build/herodio.apk
"""
import glob
import os
import shutil
import subprocess
import sys
import urllib.request
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(HERE, 'build')
SDK = os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT') or os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Android', 'Sdk')
WIN = os.name == 'nt'


def tool(name):
    """Dernière version des build-tools qui contient l'outil."""
    for d in sorted(glob.glob(os.path.join(SDK, 'build-tools', '*')), key=lambda p: [int(x) if x.isdigit() else 0 for x in os.path.basename(p).split('.')], reverse=True):
        for ext in (['.exe', '.bat'] if WIN else ['']):
            p = os.path.join(d, name + ext)
            if os.path.exists(p):
                return p
    sys.exit(f'Outil {name} introuvable dans {SDK}/build-tools')


def run(*cmd, **kw):
    print('>', os.path.basename(cmd[0]), *[c if len(c) < 60 else '…' for c in cmd[1:6]])
    subprocess.run(list(cmd), check=True, **kw)


def main():
    api9 = os.path.join(SDK, 'platforms', 'android-9', 'android.jar')
    api34 = os.path.join(SDK, 'platforms', 'android-34', 'android.jar')
    for j in (api9, api34):
        if not os.path.exists(j):
            sys.exit(f'Plateforme manquante : {j} (sdkmanager "platforms;android-9" "platforms;android-34")')
    shutil.rmtree(os.path.join(B, 'classes'), ignore_errors=True)
    shutil.rmtree(os.path.join(B, 'dex'), ignore_errors=True)
    os.makedirs(os.path.join(B, 'dex'), exist_ok=True)

    # 1. Tests de conformance du moteur sur la JVM du PC
    jar = os.path.join(B, 'json.jar')
    if not os.path.exists(jar):
        urllib.request.urlretrieve('https://repo1.maven.org/maven2/org/json/json/20240303/json-20240303.jar', jar)
    tc = os.path.join(B, 'test-classes')
    run('javac', '-encoding', 'UTF-8', '-nowarn', '-d', tc, '-cp', jar, os.path.join(HERE, 'common/org/herodio/core/Engine.java'), os.path.join(HERE, 'test/ConformanceTest.java'))
    run('java', '-cp', os.pathsep.join([tc, jar]), 'ConformanceTest', os.path.join(HERE, '../../spec/conformance'))

    # 2. Compilation contre l'API 9 : toute API plus récente provoque une erreur ici.
    sources = glob.glob(os.path.join(HERE, 'common/**/*.java'), recursive=True) + glob.glob(os.path.join(HERE, 'app/src/**/*.java'), recursive=True)
    run('javac', '-encoding', 'UTF-8', '-source', '8', '-target', '8', '-Xlint:-options', '-bootclasspath', api9, '-d', os.path.join(B, 'classes'), *sources)
    classes = glob.glob(os.path.join(B, 'classes/**/*.class'), recursive=True)
    run(tool('d8'), '--release', '--min-api', '9', '--lib', api9, '--output', os.path.join(B, 'dex'), *classes)

    # 3. Ressources et manifeste (attributs récents ignorés par les anciens Android)
    unaligned = os.path.join(B, 'herodio.unaligned.apk')
    run(tool('aapt'), 'package', '-f', '-M', os.path.join(HERE, 'app/AndroidManifest.xml'), '-S', os.path.join(HERE, 'app/res'), '-I', api34, '-F', unaligned)
    with zipfile.ZipFile(unaligned, 'a') as z:
        z.write(os.path.join(B, 'dex', 'classes.dex'), 'classes.dex')

    # 4. Alignement et signature (v1 pour Android 2.3, v2 pour les versions récentes)
    aligned = os.path.join(B, 'herodio.aligned.apk')
    run(tool('zipalign'), '-f', '-p', '4', unaligned, aligned)
    ks = os.path.join(HERE, 'herodio-debug.keystore')
    if not os.path.exists(ks):
        run('keytool', '-genkeypair', '-keystore', ks, '-storepass', 'herodio', '-keypass', 'herodio', '-alias', 'herodio',
            '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000', '-dname', 'CN=Herodio, O=Herodio')
    apk = os.path.join(B, 'herodio.apk')
    run(tool('apksigner'), 'sign', '--ks', ks, '--ks-pass', 'pass:herodio', '--ks-key-alias', 'herodio', '--min-sdk-version', '9', '--out', apk, aligned, shell=WIN)
    run(tool('apksigner'), 'verify', '--min-sdk-version', '9', apk, shell=WIN)
    for f in (unaligned, aligned):
        os.remove(f)
    print(f'APK prêt : {apk} ({os.path.getsize(apk) // 1024} Ko)')


if __name__ == '__main__':
    main()
