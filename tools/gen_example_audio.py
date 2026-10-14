"""Génère les sons de l'exemple « La forêt enchantée ».

- Bruitages et musique : synthétisés par ce script (aucun échantillon externe, domaine public / CC0).
- Narration : synthèse vocale Windows (voix « Microsoft Hortense »), générée localement.
  Remplacez ces fichiers par de vraies voix enregistrées avant toute diffusion publique de l'exemple.

Usage : python tools/gen_example_audio.py   (nécessite numpy, ffmpeg et Windows pour la narration)
"""
import json
import os
import subprocess
import tempfile
import wave

import numpy as np

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'editor', 'public', 'examples', 'foret')
rng = np.random.default_rng(42)


def t(d):
    return np.arange(int(d * SR)) / SR


def env(n, a=0.01, r=0.1):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e


def lowpass(x, k):
    """Filtre passe-bas simple (moyenne exponentielle), k ∈ (0, 1]."""
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += k * (v - acc)
        y[i] = acc
    return y


def chirp(f0, f1, d, vib=0.0):
    tt = t(d)
    f = np.linspace(f0, f1, len(tt)) * (1 + vib * np.sin(2 * np.pi * 30 * tt))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(tt), 0.005, d * 0.5)


def bird():
    notes = [chirp(f, f * rng.uniform(1.1, 1.5), rng.uniform(0.05, 0.12), 0.03) for f in rng.uniform(2500, 4200, rng.integers(2, 6))]
    gap = np.zeros(int(0.04 * SR))
    return np.concatenate([np.concatenate([n, gap]) for n in notes])


def place(buf, sig, at, gain=1.0):
    i = int(at * SR)
    n = min(len(sig), len(buf) - i)
    if n > 0: buf[i:i + n] += sig[:n] * gain


def forest(d=30.0):
    noise = rng.standard_normal(int(d * SR))
    wind = lowpass(noise, 0.02) * 2.5
    wind *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.08 * t(d) + 1)  # le vent qui souffle
    leaves = lowpass(noise, 0.3) - lowpass(noise, 0.05)
    out = wind * 0.5 + leaves * 0.05 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.13 * t(d)))
    for at in np.sort(rng.uniform(0.5, d - 1, 14)):
        place(out, bird(), at, rng.uniform(0.08, 0.2))
    # Boucle sans à-coup : fondu entre la fin et le début
    x = int(1.0 * SR)
    out[:x] = out[:x] * np.linspace(0, 1, x) + out[-x:] * np.linspace(1, 0, x)
    return out[:-x]


def footsteps(n=6):
    out = np.zeros(int((n * 0.55 + 0.5) * SR))
    for i in range(n):
        crunch = lowpass(rng.standard_normal(int(0.18 * SR)), 0.25) * np.exp(-t(0.18) * 22)
        place(out, crunch, i * 0.55 + rng.uniform(-0.03, 0.03), 0.9)
    return out


def sparkle():
    out = np.zeros(int(2.5 * SR))
    for i, f in enumerate([1568, 1976, 2349, 2637, 3136, 3951, 3136, 4699]):
        tone = np.sin(2 * np.pi * f * t(1.2)) * np.exp(-t(1.2) * 4) + 0.3 * np.sin(2 * np.pi * f * 2.01 * t(1.2)) * np.exp(-t(1.2) * 6)
        place(out, tone, i * 0.12, 0.25)
    return out


def owl():
    out = np.zeros(int(2.6 * SR))
    for at, d in [(0.1, 0.35), (0.65, 0.2), (0.95, 0.7)]:
        tt = t(d)
        f = 380 * (1 - 0.12 * tt / d)
        tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.25 * lowpass(rng.standard_normal(len(tt)), 0.1)
        place(out, tone * env(len(tt), 0.05, d * 0.5), at, 0.6)
    return out


def music(d=24.0):
    """Petite berceuse pentatonique avec une nappe douce."""
    out = np.zeros(int(d * SR))
    scale = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99]
    melody = [0, 2, 4, 3, 2, 1, 2, 0, 3, 4, 5, 4, 2, 3, 1, 0]
    beat = d / (len(melody) + 1)
    for i, k in enumerate(melody):
        f = scale[k]
        nt = t(beat * 1.6)
        tone = (np.sin(2 * np.pi * f * nt) + 0.3 * np.sin(2 * np.pi * 2 * f * nt)) * np.exp(-nt * 2.2)
        place(out, tone, i * beat, 0.22)
    for i, root in enumerate([196.0, 174.61, 220.0, 196.0]):
        seg = d / 4
        nt = t(seg)
        pad = sum(np.sin(2 * np.pi * root * m * nt) for m in (1, 1.5, 2)) * env(len(nt), seg * 0.4, seg * 0.4)
        place(out, pad, i * seg, 0.05)
    return out * env(len(out), 1.0, 3.0)


def write_wav(path, x):
    x = x / max(1e-9, np.max(np.abs(x))) * 0.9
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())


def to_ogg(wav, name):
    dst = os.path.join(OUT, name + '.ogg')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-c:a', 'libvorbis', '-q:a', '3', dst], check=True)
    return dst


NARRATION = {
    'n-oree': "Te voici à l'orée de la forêt enchantée. Le vent chante dans les feuilles, et les oiseaux te souhaitent la bienvenue. Devant toi, le chemin se sépare en deux.",
    'n-chemin': "Que veux-tu faire ? Suivre les lucioles, ou écouter le vieux hibou ?",
    'o-lucioles': "Suivre les lucioles.",
    'o-hibou': "Écouter le vieux hibou.",
    'n-lucioles': "Les petites lumières dansent autour de toi et te guident jusqu'à une clairière. Une fée minuscule t'attend, assise sur un champignon. Elle te tend une potion qui brille.",
    'n-fee': "Bois cette potion, dit la fée, et tu pourras parler aux animaux. Acceptes-tu ?",
    'o-accepter': "Accepter la potion.",
    'o-refuser': "Refuser poliment.",
    'n-fin-animaux': "Tu bois la potion. Soudain, tu entends un écureuil te dire bonjour ! Désormais, tous les animaux de la forêt sont tes amis.",
    'n-fin-maison': "Tu remercies la fée et tu rentres à la maison. La forêt restera là, à t'attendre, pour une prochaine aventure.",
    'n-hibou': "Hou hou ! Le vieux hibou ouvre un œil. Je vais te confier un secret, murmure-t-il. Au cœur de la forêt, un arbre géant garde tous les rêves des enfants.",
    'n-fin-secret': "Tu as découvert le secret de la forêt enchantée. Chut ! Ne le répète à personne.",
}


def tts(text, wav):
    ps = (
        "Add-Type -AssemblyName System.Speech;"
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer;"
        "$v = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq 'fr-FR' } | Select-Object -First 1;"
        "$s.SelectVoice($v.VoiceInfo.Name); $s.Rate = -1;"
        f"$s.SetOutputToWaveFile('{wav}'); $s.Speak([Console]::In.ReadToEnd()); $s.Dispose()"
    )
    subprocess.run(['powershell', '-NoProfile', '-Command', ps], input=text.encode('utf-8'), check=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    tmp = tempfile.mkdtemp()
    sounds = {'ambiance-foret': forest(), 'pas-feuilles': footsteps(), 'magie': sparkle(), 'hibou': owl(), 'berceuse': music()}
    durations = {}
    for name, x in sounds.items():
        w = os.path.join(tmp, name + '.wav'); write_wav(w, x); to_ogg(w, name)
        durations[name] = len(x) / SR
    for name, text in NARRATION.items():
        w = os.path.join(tmp, name + '.wav'); tts(text, w); to_ogg(w, name)
        with wave.open(w) as f: durations[name] = f.getnframes() / f.getframerate()
    with open(os.path.join(OUT, 'durees.json'), 'w', encoding='utf-8') as f:
        json.dump({k: round(v, 3) for k, v in durations.items()}, f, indent=1)
    print('OK', len(durations), 'sons dans', os.path.abspath(OUT))


if __name__ == '__main__':
    main()
