"""Bruitages, ambiances et petites musiques des histoires fournies, entièrement synthétisés (domaine public / CC0).

Usage : python tools/gen_sons.py   → editor/public/examples/sons/*.ogg (nécessite numpy et ffmpeg)
"""
import os
import subprocess
import tempfile
import wave

import numpy as np

from gen_example_audio import SR, bird, env, footsteps, forest, lowpass, music, owl, place, sparkle, t

OUT = os.path.join(os.path.dirname(__file__), '..', 'editor', 'public', 'examples', 'sons')
rng = np.random.default_rng(7)


def noise(d):
    return rng.standard_normal(int(d * SR))


def bandpass(x, lo, hi):
    """Passe-bande grossier : différence de deux passe-bas."""
    return lowpass(x, hi) - lowpass(x, lo)


def tone(f, d, harm=(1.0, 0.3, 0.1), decay=3.0, attack=0.01):
    tt = t(d)
    s = sum(a * np.sin(2 * np.pi * f * (i + 1) * tt) for i, a in enumerate(harm))
    return s * np.exp(-tt * decay) * np.minimum(1, tt / attack)


def notes_to_wave(seq, bpm, wave_fn, gap=0.0):
    beat = 60 / bpm
    total = sum(d for _, d in seq) * beat + 1.5
    out = np.zeros(int(total * SR))
    pos = 0.0
    for f, d in seq:
        if f:
            place(out, wave_fn(f, d * beat), pos)
        pos += d * beat + gap
    return out


NOTE = {n: 440 * 2 ** ((i - 9) / 12) for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}


def n(name, octave=4):
    return NOTE[name] * 2 ** (octave - 4)


# ------------------------------------------------------------------ ambiances

def campagne(d=40.0):
    base = forest(d) * 0.6
    for at in np.sort(rng.uniform(0.5, d - 2, 18)):
        place(base, bird(), at, rng.uniform(0.06, 0.15))
    return base


def nuit(d=40.0):
    out = lowpass(noise(d), 0.01) * 1.2
    for at in np.arange(0.3, d - 1, 0.9):  # grillons
        chirp = np.sin(2 * np.pi * 4200 * t(0.05)) * env(int(0.05 * SR), 0.005, 0.02)
        for k in range(3):
            place(out, chirp, at + k * 0.07 + rng.uniform(0, 0.02), 0.05)
    for at in rng.uniform(3, d - 4, 3):
        place(out, owl(), at, 0.25)
    return out


def marmite(d=30.0):
    out = lowpass(noise(d), 0.03) * 0.6
    for at in rng.uniform(0, d - 0.3, int(d * 7)):
        f = rng.uniform(150, 420)
        b = np.sin(2 * np.pi * np.cumsum(np.linspace(f, f * 1.8, int(0.06 * SR))) / SR) * env(int(0.06 * SR), 0.005, 0.04)
        place(out, b, at, rng.uniform(0.1, 0.35))
    return out


# ------------------------------------------------------------------ bruitages

def toc_toc():
    out = np.zeros(int(1.2 * SR))
    for at in (0.05, 0.3, 0.55):
        k = lowpass(noise(0.08), 0.35) * np.exp(-t(0.08) * 60) + 0.6 * np.sin(2 * np.pi * 180 * t(0.08)) * np.exp(-t(0.08) * 40)
        place(out, k, at)
    return out


def souffle_loup():
    d = 2.6
    w = bandpass(noise(d), 0.01, 0.12)
    e = np.interp(t(d), [0, 0.4, 1.8, d], [0, 1, 0.8, 0])
    return w * e * 2.5


def craquement():
    out = np.zeros(int(2.2 * SR))
    for at in np.sort(rng.uniform(0, 0.8, 9)):
        place(out, lowpass(noise(0.12), 0.4) * np.exp(-t(0.12) * 30), at, rng.uniform(0.4, 1))
    thump = np.sin(2 * np.pi * 70 * t(0.6)) * np.exp(-t(0.6) * 6)
    place(out, thump + lowpass(noise(0.6), 0.05) * np.exp(-t(0.6) * 5), 0.9, 1.0)
    return out


def course():
    out = np.zeros(int(2.4 * SR))
    for i in range(12):
        step = lowpass(noise(0.07), 0.3) * np.exp(-t(0.07) * 45)
        place(out, step, i * 0.17 + rng.uniform(-0.01, 0.01), 0.8)
    return out


def briques():
    out = np.zeros(int(1.4 * SR))
    for i in range(3):
        k = np.sin(2 * np.pi * 950 * t(0.1)) * np.exp(-t(0.1) * 50) + lowpass(noise(0.1), 0.5) * np.exp(-t(0.1) * 70)
        place(out, k, 0.1 + i * 0.35, 0.8)
    return out


def feu(d=5.0):
    out = lowpass(noise(d), 0.02) * 1.5
    for at in rng.uniform(0, d - 0.1, int(d * 25)):
        place(out, bandpass(noise(0.02), 0.2, 0.9) * np.exp(-t(0.02) * 200), at, rng.uniform(0.2, 0.8))
    return out * env(len(out), 0.3, 1.0)


def plouf(size=1.0):
    d = 1.5 * size
    tt = t(d)
    drop = np.sin(2 * np.pi * np.cumsum(np.linspace(300, 900, len(tt))) / SR) * np.exp(-tt * 9)
    splash = lowpass(noise(d), 0.25) * np.exp(-tt * 4)
    out = drop * 0.6 + splash
    for at in rng.uniform(0.2, d * 0.8, 6):  # gouttes
        f = rng.uniform(800, 1600)
        place(out, np.sin(2 * np.pi * f * t(0.05)) * np.exp(-t(0.05) * 60), at, 0.3)
    return out


def volets():
    out = np.zeros(int(1.6 * SR))
    for at in (0.1, 0.7):
        creak = np.sin(2 * np.pi * np.cumsum(220 + 60 * np.sin(2 * np.pi * 9 * t(0.35))) / SR)
        place(out, np.sign(creak) * 0.3 * env(len(creak), 0.05, 0.1), at, 0.5)
        place(out, lowpass(noise(0.1), 0.3) * np.exp(-t(0.1) * 40), at + 0.37, 1)
    return out


def rate():
    """Petit trombone qui descend : « raté ! »."""
    seq = [(n('G', 3), 0.5), (n('F#', 3), 0.5), (n('F', 3), 0.5), (n('E', 3), 1.4)]
    def wv(f, d):
        tt = t(d)
        vib = 1 + 0.01 * np.sin(2 * np.pi * 5 * tt)
        s = sum(np.sin(2 * np.pi * f * k * np.cumsum(vib) / SR) / k for k in range(1, 7))
        return s * env(len(tt), 0.04, 0.15)
    return notes_to_wave(seq, 110, wv) * 0.6


def pas_lourds():
    out = np.zeros(int(2.4 * SR))
    for i in range(4):
        b = np.sin(2 * np.pi * 55 * t(0.4)) * np.exp(-t(0.4) * 9) + lowpass(noise(0.4), 0.03) * np.exp(-t(0.4) * 8)
        place(out, b, 0.1 + i * 0.55, 1)
    return out


def ronflement(d=5.0):
    out = np.zeros(int(d * SR))
    for at in (0.2, 2.6):
        dd = 1.6
        tt = t(dd)
        snore = bandpass(noise(dd), 0.004, 0.04) * (1 + 0.8 * np.sin(2 * np.pi * 38 * tt)) * np.sin(np.pi * tt / dd)
        place(out, snore, at, 2.5)
        place(out, lowpass(noise(0.8), 0.1) * np.sin(np.pi * t(0.8) / 0.8) * 0.4, at + dd, 1)  # pchhh
    return out


def bond():
    tt = t(0.35)
    f = np.interp(tt, [0, 0.15, 0.35], [180, 520, 300])
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(tt), 0.005, 0.15) * 0.7


def croque():
    out = np.zeros(int(1.6 * SR))
    for i in range(4):
        place(out, bandpass(noise(0.12), 0.1, 0.8) * np.exp(-t(0.12) * 25), 0.05 + i * 0.32, rng.uniform(0.6, 1))
    return out


def mouton():
    d = 1.0
    tt = t(d)
    f0 = 300 * (1 + 0.06 * np.sin(2 * np.pi * 9 * tt))  # chevrotement
    src = sum(np.sin(2 * np.pi * np.cumsum(f0) * k / SR) / k for k in range(1, 12))
    voice = bandpass(src, 0.08, 0.5) + 0.3 * src
    return voice * env(len(tt), 0.08, 0.35) * 0.5


def flute():
    seq = [(n('D', 5), 1), (n('E', 5), 1), (n('G', 5), 1), (n('E', 5), 1), (n('D', 5), 2), (n('B', 4), 1), (n('D', 5), 1),
           (n('E', 5), 1.5), (n('D', 5), 0.5), (n('B', 4), 1), (n('A', 4), 1), (n('G', 4), 3)]
    def wv(f, d):
        tt = t(d)
        vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * tt)
        s = np.sin(2 * np.pi * f * np.cumsum(vib) / SR) + 0.12 * np.sin(4 * np.pi * f * tt) + 0.02 * noise(d)[:len(tt)]
        return s * env(len(tt), 0.05, min(0.2, d / 2))
    return notes_to_wave(seq, 140, wv) * 0.5


def loup_hurle():
    d = 3.2
    tt = t(d)
    f = np.interp(tt, [0, 0.5, 2.3, d], [330, 520, 500, 300]) * (1 + 0.01 * np.sin(2 * np.pi * 6 * tt))
    s = sum(np.sin(2 * np.pi * np.cumsum(f) * k / SR) * a for k, a in ((1, 1), (2, 0.25), (3, 0.08)))
    return s * env(len(tt), 0.4, 1.2) * 0.6 + lowpass(noise(d), 0.05) * 0.05


def cloche():
    out = np.zeros(int(3.5 * SR))
    for i, at in enumerate((0, 0.45, 0.9)):
        f = 1320
        bell = sum(a * np.sin(2 * np.pi * f * r * t(2.5)) * np.exp(-t(2.5) * dcy) for r, a, dcy in ((1, 1, 2), (2.76, 0.5, 3.5), (5.4, 0.25, 6)))
        place(out, bell, at, 0.6)
    return out


def applaudissements(d=4.0):
    out = np.zeros(int(d * SR))
    for at in rng.uniform(0, d - 0.1, int(d * 60)):
        place(out, bandpass(noise(0.03), 0.08, 0.6) * np.exp(-t(0.03) * 150), at, rng.uniform(0.2, 0.7))
    return out * env(len(out), 0.3, 1.2)


def oiseaux(d=4.0):
    out = np.zeros(int(d * SR))
    for at in np.sort(rng.uniform(0, d - 0.6, 8)):
        place(out, bird(), at, rng.uniform(0.3, 0.6))
    return out


# ------------------------------------------------------------------ musiques (courtes, pour les fins)

def instrument(f, d):
    return tone(f, d, (1, 0.45, 0.2, 0.08), decay=2.5)


def chord(fs, d, vol=0.15):
    return sum(tone(f, d, (1, 0.2), decay=0.8, attack=0.05) for f in fs) * vol


def musique(melody, chords, bpm):
    mel = notes_to_wave(melody, bpm, instrument) * 0.35
    beat = 60 / bpm
    bed = np.zeros(len(mel))
    pos = 0
    for fs, d in chords:
        place(bed, chord(fs, d * beat + 0.5), pos)
        pos += d * beat
    out = mel + bed[:len(mel)]
    return out * env(len(out), 0.02, 1.2)


def musique_joyeuse():
    C, D, E, F, G, A = n('C', 5), n('D', 5), n('E', 5), n('F', 5), n('G', 5), n('A', 5)
    mel = [(C, 1), (E, 1), (G, 1), (E, 1), (F, 1), (A, 1), (G, 2), (E, 1), (D, 1), (C, 1), (E, 1), (G, 3)]
    chords = [((n('C', 3), n('E', 3), n('G', 3)), 4), ((n('F', 3), n('A', 3), n('C', 4)), 4), ((n('C', 3), n('E', 3), n('G', 3)), 6)]
    return musique(mel, chords, 168)


def musique_secrete():
    mel = [(n('A', 5), 1), (n('E', 6), 1), (n('C', 6), 1), (n('B', 5), 1), (n('G', 5), 2), (n('A', 5), 1), (n('C', 6), 1), (n('E', 6), 3)]
    chords = [((n('A', 3), n('C', 4), n('E', 4)), 4), ((n('F', 3), n('A', 3), n('C', 4)), 4), ((n('E', 3), n('G#', 3), n('B', 3)), 4)]
    out = musique(mel, chords, 120)
    place(out, sparkle(), 0, 0.5)
    return out


def musique_douce():
    mel = [(n('G', 4), 2), (n('A', 4), 1), (n('B', 4), 1), (n('D', 5), 2), (n('B', 4), 2), (n('A', 4), 2), (n('G', 4), 4)]
    chords = [((n('G', 3), n('B', 3), n('D', 4)), 4), ((n('E', 3), n('G', 3), n('B', 3)), 4), ((n('C', 3), n('E', 3), n('G', 3)), 6)]
    return musique(mel, chords, 100)


SOUNDS = {
    'campagne': campagne, 'foret': forest, 'nuit': nuit, 'marmite': marmite,
    'toc-toc': toc_toc, 'souffle-loup': souffle_loup, 'craquement': craquement, 'course': course, 'briques': briques,
    'feu': feu, 'plouf': plouf, 'plouf-petit': lambda: plouf(0.5) * 0.6, 'volets': volets, 'rate': rate,
    'magie': sparkle, 'oiseaux': oiseaux, 'pas-lourds': pas_lourds, 'ronflement': ronflement, 'bond': bond,
    'croque': croque, 'mouton': mouton, 'flute': flute, 'loup-hurle': loup_hurle, 'cloche': cloche,
    'applaudissements': applaudissements, 'pas-feuilles': footsteps, 'hibou': owl, 'berceuse': music,
    'musique-joyeuse': musique_joyeuse, 'musique-secrete': musique_secrete, 'musique-douce': musique_douce,
}


def main():
    os.makedirs(OUT, exist_ok=True)
    tmp = tempfile.mkdtemp()
    for name, fn in SOUNDS.items():
        x = np.asarray(fn(), dtype=np.float64)
        x = x / max(1e-9, np.max(np.abs(x))) * 0.9
        w = os.path.join(tmp, name + '.wav')
        with wave.open(w, 'wb') as f:
            f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
            f.writeframes((x * 32767).astype('<i2').tobytes())
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', w, '-c:a', 'libvorbis', '-q:a', '3', os.path.join(OUT, name + '.ogg')], check=True)
        print(f'{name:18s} {len(x) / SR:5.1f} s')


if __name__ == '__main__':
    main()
