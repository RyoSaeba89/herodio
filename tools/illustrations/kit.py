"""Kit d'illustration vectorielle d'Herodio : décors, personnages et accessoires en SVG (style plat, contours doux).

Toutes les fonctions renvoient des fragments SVG (chaînes). Les personnages sont dessinés « pieds en (0, 0) »,
tournés vers la droite ; on les place avec at(x, y, s, flip). Repère : image de 800 × 600.
"""
import math
import random

W, H = 800, 600
INK = '#3b2f3a'
SW = 5  # épaisseur du trait


def at(svg, x, y, s=1.0, flip=False, rot=0):
    sx = -s if flip else s
    return f'<g transform="translate({x:.1f} {y:.1f}) rotate({rot}) scale({sx:.3f} {s:.3f})">{svg}</g>'


def st(fill, stroke=True, w=SW, extra=''):
    import re
    color = INK
    m = re.search(r' stroke="([^"]*)"', extra)
    if m:  # couleur de trait personnalisée
        color, extra = m.group(1), extra.replace(m.group(0), '')
    return f'fill="{fill}"' + (f' stroke="{color}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"' if stroke else '') + extra


def ellipse(cx, cy, rx, ry, fill, stroke=True, w=SW, extra=''):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" {st(fill, stroke, w, extra)}/>'


def circle(cx, cy, r, fill, stroke=True, w=SW, extra=''):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" {st(fill, stroke, w, extra)}/>'


def rect(x, y, w_, h_, fill, rx=0, stroke=True, w=SW, extra=''):
    return f'<rect x="{x}" y="{y}" width="{w_}" height="{h_}" rx="{rx}" {st(fill, stroke, w, extra)}/>'


def path(d, fill='none', stroke=True, w=SW, extra=''):
    return f'<path d="{d}" {st(fill, stroke, w, extra)}/>'


def line(x1, y1, x2, y2, w=SW, color=INK, extra=''):
    return f'<path d="M{x1} {y1} L{x2} {y2}" fill="none" stroke="{color}" stroke-width="{w}" stroke-linecap="round" {extra}/>'


def poly(points, fill, stroke=True, w=SW):
    pts = ' '.join(f'{x},{y}' for x, y in points)
    return f'<polygon points="{pts}" {st(fill, stroke, w)}/>'


def svg(*parts, defs=''):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
            f'<defs>{DEFS}{defs}</defs>' + ''.join(parts) + '</svg>')


DEFS = ''.join([
    '<linearGradient id="skyDay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc8f5"/><stop offset="1" stop-color="#d8f1ff"/></linearGradient>',
    '<linearGradient id="skyWarm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb37a"/><stop offset="1" stop-color="#ffe6b8"/></linearGradient>',
    '<linearGradient id="skyNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2452"/><stop offset="1" stop-color="#40528f"/></linearGradient>',
    '<linearGradient id="skyDawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7a8c8"/><stop offset="1" stop-color="#ffe9c2"/></linearGradient>',
    '<radialGradient id="glow"><stop offset="0" stop-color="#fff6b0" stop-opacity="1"/><stop offset="1" stop-color="#fff6b0" stop-opacity="0"/></radialGradient>',
    '<radialGradient id="fireGlow"><stop offset="0" stop-color="#ffcf5a" stop-opacity=".9"/><stop offset="1" stop-color="#ff7a2a" stop-opacity="0"/></radialGradient>',
    '<linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8eef7" stop-opacity="0"/><stop offset=".5" stop-color="#e8eef7" stop-opacity=".75"/><stop offset="1" stop-color="#e8eef7" stop-opacity=".9"/></linearGradient>',
])

# ------------------------------------------------------------------ visages


def eyes(x1, y1, x2, y2, mood='happy', r=7):
    """Deux yeux ; mood : happy, scared, sleepy, angry, sly, sad."""
    if mood == 'sleepy':
        return path(f'M{x1-8} {y1} Q{x1} {y1+7} {x1+8} {y1}') + path(f'M{x2-8} {y2} Q{x2} {y2+7} {x2+8} {y2}')
    out = ''
    for x, y in ((x1, y1), (x2, y2)):
        out += ellipse(x, y, r + 2, r + 4, '#fff', True, 3) + circle(x + 2, y + 1, r - 1, INK, False) + circle(x + 4, y - 2, 2, '#fff', False)
    if mood == 'angry':
        out += line(x1 - 10, y1 - 16, x1 + 8, y1 - 9, 5) + line(x2 + 10, y2 - 16, x2 - 8, y2 - 9, 5)
    elif mood == 'sly':
        out += line(x1 - 10, y1 - 12, x1 + 8, y1 - 8, 5) + line(x2 - 8, y2 - 12, x2 + 10, y2 - 14, 5)
    elif mood in ('scared', 'sad'):
        out += line(x1 - 8, y1 - 18, x1 + 8, y1 - 13, 4) + line(x2 - 8, y2 - 13, x2 + 8, y2 - 18, 4)
    return out


def mouth(x, y, mood='happy', w=14):
    if mood == 'scared':
        return ellipse(x, y + 4, w * 0.45, w * 0.6, '#7a2b3a', True, 3)
    if mood in ('sad', 'angry'):
        return path(f'M{x-w} {y+8} Q{x} {y-4} {x+w} {y+8}', w=4)
    if mood == 'sleepy':
        return ellipse(x, y + 3, w * 0.3, w * 0.25, '#7a2b3a', True, 3)
    if mood == 'laugh':
        return path(f'M{x-w} {y} Q{x} {y+w*1.6} {x+w} {y} Z', '#7a2b3a', True, 4)
    return path(f'M{x-w} {y} Q{x} {y+w} {x+w} {y}', w=4)


def cheek(x, y, r=9):
    return circle(x, y, r, '#ff8fa3', False, extra=' opacity=".55"')


# ------------------------------------------------------------------ décors


def sky(kind='day'):
    g = {'day': 'skyDay', 'warm': 'skyWarm', 'night': 'skyNight', 'dawn': 'skyDawn'}[kind]
    return f'<rect width="{W}" height="{H}" fill="url(#{g})"/>'


def sun(x=660, y=110, r=52):
    rays = ''.join(line(x + math.cos(a) * (r + 12), y + math.sin(a) * (r + 12), x + math.cos(a) * (r + 30), y + math.sin(a) * (r + 30), 6, '#ffc93c')
                   for a in [i * math.pi / 6 for i in range(12)])
    return rays + circle(x, y, r, '#ffd84d', True, 4) + eyes(x - 15, y - 6, x + 15, y - 6, 'happy', 4) + mouth(x, y + 12, 'happy', 12) + cheek(x - 28, y + 8, 7) + cheek(x + 28, y + 8, 7)


def moon(x=640, y=110, r=46):
    return circle(x, y, r + 30, 'url(#glow)', False) + circle(x, y, r, '#fff2b3', True, 4) + circle(x + 16, y - 8, r * 0.85, '#2a3570', False, extra=' opacity=".0"')


def stars(n=24, seed=3, ymax=260):
    r = random.Random(seed)
    out = ''
    for _ in range(n):
        x, y, s = r.uniform(20, 780), r.uniform(15, ymax), r.uniform(2, 4.5)
        out += f'<path d="M{x} {y-s*2} L{x+s*0.6} {y-s*0.6} L{x+s*2} {y} L{x+s*0.6} {y+s*0.6} L{x} {y+s*2} L{x-s*0.6} {y+s*0.6} L{x-s*2} {y} L{x-s*0.6} {y-s*0.6} Z" fill="#fff6c9"/>'
    return out


def cloud(x, y, s=1.0):
    c = (ellipse(0, 0, 60, 32, '#fff', True, 4) + circle(-30, -18, 30, '#fff', True, 4) + circle(18, -26, 36, '#fff', True, 4)
         + ellipse(0, 4, 58, 26, '#fff', False))
    return at(c, x, y, s)


def hills(c1='#8fd16a', c2='#6fbf5a', y=380):
    return (path(f'M0 {y} Q200 {y-90} 420 {y-20} T800 {y-40} L800 600 L0 600 Z', c1, True, 4)
            + path(f'M0 {y+70} Q260 {y-10} 520 {y+60} T800 {y+50} L800 600 L0 600 Z', c2, True, 4))


def ground(y=470, color='#7cc95a', dark='#5fb04a'):
    return path(f'M0 {y} Q400 {y-30} 800 {y} L800 600 L0 600 Z', color, True, 4) + ''.join(
        path(f'M{x} {y+40+(x%37)} l6 -14 l6 14', dark, False) for x in range(30, 800, 70))


def path_road(color='#ecc88f', y=470):
    return path(f'M330 600 Q380 {y+40} 470 {y} L520 {y} Q470 {y+60} 520 600 Z', color, True, 4)


def tree(x, y, s=1.0, kind='round', c='#4fae5b'):
    if kind == 'pine':
        t = (rect(-10, -40, 20, 40, '#8a5a3b') + poly([(-60, -40), (0, -150), (60, -40)], '#3f9a52')
             + poly([(-50, -95), (0, -190), (50, -95)], '#4fae5b'))
    else:
        t = (path('M-14 0 L-10 -90 L10 -90 L14 0 Z', '#8a5a3b') + circle(0, -140, 70, c) + circle(-45, -110, 42, c)
             + circle(48, -112, 44, c) + circle(-20, -165, 22, '#79c96f', False) + circle(25, -150, 12, '#79c96f', False))
    return at(t, x, y, s)


def bush(x, y, s=1.0, c='#5bb862'):
    return at(circle(-25, -20, 26, c) + circle(10, -30, 32, c) + circle(40, -16, 22, c) + rect(-45, -12, 100, 12, c, 6, False), x, y, s)


def flower(x, y, c='#ff7aa8'):
    petals = ''.join(circle(x + math.cos(a) * 8, y + math.sin(a) * 8, 6, c, True, 2) for a in [i * math.pi * 2 / 5 for i in range(5)])
    return line(x, y + 8, x, y + 30, 3, '#3f9a52') + petals + circle(x, y, 5, '#ffd84d', True, 2)


def flowers(seed=1, n=10, ymin=500, ymax=585, colors=('#ff7aa8', '#ffd84d', '#8bd3ff', '#ff9f43')):
    r = random.Random(seed)
    return ''.join(flower(r.uniform(20, 780), r.uniform(ymin, ymax), r.choice(colors)) for _ in range(n))


def fog(y=300, opacity=1.0):
    return f'<rect y="{y}" width="{W}" height="{H-y}" fill="url(#fog)" opacity="{opacity}"/>' + ''.join(
        ellipse(x, y + 120 + (x % 50), 140, 30, '#eef3fa', False, extra=' opacity=".6"') for x in range(0, 900, 180))


def wind(x, y, s=1.0, n=3):
    out = ''
    for i in range(n):
        yy = i * 34 - 34
        out += path(f'M0 {yy} Q60 {yy-20} 120 {yy} T240 {yy}', w=6, extra=' stroke-dasharray="0" opacity=".8"')
        out += path(f'M240 {yy} q20 -10 10 -24 q-12 -10 -20 4', w=6)
    return at(out, x, y, s)


def motion(x, y, s=1.0):
    return at(''.join(line(0, i * 22, -70 + i * 10, i * 22, 5) for i in range(-1, 2)), x, y, s)


def sparkles(x, y, s=1.0, color='#ffd84d', seed=2, n=6, spread=90):
    r = random.Random(seed)
    out = ''
    for _ in range(n):
        px, py, k = r.uniform(-spread, spread), r.uniform(-spread, spread), r.uniform(6, 14)
        out += f'<path d="M{px} {py-k} Q{px} {py} {px+k} {py} Q{px} {py} {px} {py+k} Q{px} {py} {px-k} {py} Q{px} {py} {px} {py-k} Z" fill="{color}" stroke="{INK}" stroke-width="2"/>'
    return at(out, x, y, s)


def hearts(x, y, s=1.0, n=3, seed=4):
    r = random.Random(seed)
    out = ''
    for _ in range(n):
        px, py, k = r.uniform(-60, 60), r.uniform(-40, 40), r.uniform(0.6, 1.1)
        out += at(path('M0 8 C-18 -6 -10 -22 0 -12 C10 -22 18 -6 0 8 Z', '#ff6b8a', True, 3), px, py, k)
    return at(out, x, y, s)


def notes(x, y, s=1.0, seed=1):
    r = random.Random(seed)
    out = ''
    for i in range(3):
        px, py = i * 40 + r.uniform(-6, 6), -i * 28 + r.uniform(-6, 6)
        out += ellipse(px, py, 10, 8, INK, False, extra=f' transform="rotate(-20 {px} {py})"') + line(px + 9, py - 2, px + 9, py - 42, 4)
        out += path(f'M{px+9} {py-42} q14 6 12 20', w=4)
    return at(out, x, y, s)


def zzz(x, y, s=1.0):
    z = lambda k, dx, dy: path(f'M{dx} {dy} h{k} l{-k} {k} h{k}', w=5)
    return at(z(18, 0, 0) + z(24, 26, -38) + z(30, 58, -84), x, y, s)


def drops(x, y, s=1.0, n=5, seed=5, color='#7fd0ff'):
    r = random.Random(seed)
    return at(''.join(path(f'M{dx} {dy} q8 12 0 18 q-8 -6 0 -18 Z', color, True, 3) for dx, dy in
                      [(r.uniform(-60, 60), r.uniform(-50, 30)) for _ in range(n)]), x, y, s)


def sweat(x, y, s=1.0):
    return at(path('M0 0 q10 14 0 22 q-10 -8 0 -22 Z', '#7fd0ff', True, 3), x, y, s)


# ------------------------------------------------------------------ maisons et intérieurs


def house_straw(x, y, s=1.0, blown=False):
    h = (path('M-120 0 L-110 -150 L110 -150 L120 0 Z', '#f4cd5a') + ''.join(line(i, -145, i + 6, -5, 3, '#c99a2e') for i in range(-100, 110, 20))
         + path('M-150 -140 L0 -270 L150 -140 Z', '#e9b93e') + ''.join(line(i * 0.9, -150, i * 0.25, -255, 3, '#c99a2e') for i in range(-130, 140, 26))
         + path('M-30 0 L-30 -80 Q0 -105 30 -80 L30 0 Z', '#a86f3c') + circle(18, -40, 5, '#ffd84d', True, 2))
    if blown:
        h = ''.join(at(path('M0 0 l40 -6 l-36 14 Z', '#f4cd5a', True, 3), random.Random(i).uniform(-260, 260), random.Random(i + 9).uniform(-300, 0), 1.2,
                       rot=random.Random(i + 3).uniform(-60, 60)) for i in range(30))
    return at(h, x, y, s)


def house_wood(x, y, s=1.0, broken=False):
    planks = ''.join(rect(-115, -150 + i * 30, 230, 30, '#c98a4b' if i % 2 else '#b67a3f', 2, True, 3) for i in range(5))
    h = (planks + path('M-145 -140 L0 -260 L145 -140 Z', '#9a5f30') + rect(-80, -115, 50, 45, '#bfe6ff', 4) + line(-55, -115, -55, -70, 4)
         + line(-80, -92, -30, -92, 4) + path('M20 0 L20 -90 L70 -90 L70 0 Z', '#7d4a24') + circle(60, -45, 5, '#ffd84d', True, 2))
    if broken:
        h = ''.join(at(rect(-60, -12, 120, 24, '#c98a4b', 2, True, 3), random.Random(i).uniform(-200, 200), random.Random(i + 4).uniform(-60, 0), 1,
                       rot=random.Random(i + 7).uniform(-50, 50)) for i in range(10))
    return at(h, x, y, s)


def brick_wall(x0, y0, w_, rows, row_h=26, col_w=56):
    out = ''
    for r in range(rows):
        off = 0 if r % 2 == 0 else -col_w / 2
        y = y0 - (r + 1) * row_h
        xx = x0 + off
        while xx < x0 + w_:
            bx, bw = max(xx, x0), min(xx + col_w, x0 + w_) - max(xx, x0)
            if bw > 4:
                out += rect(bx, y, bw, row_h, '#d9573b' if (r + int(xx)) % 3 else '#c94a32', 3, True, 3)
            xx += col_w
    return out


def house_brick(x, y, s=1.0, door_open=False, smoke=True, glow=False):
    h = (rect(70, -300, 50, 110, '#c94a32', 4) + brick_wall(-125, 0, 250, 7) + path('M-160 -175 L0 -300 L160 -175 Z', '#7a4b8f')
         + rect(-85, -140, 60, 55, '#ffe7a3' if glow else '#bfe6ff', 6) + line(-55, -140, -55, -85, 4) + line(-85, -112, -25, -112, 4)
         + path('M20 0 L20 -100 Q50 -125 80 -100 L80 0 Z', '#4b8f5a' if not door_open else '#2a1f29') + circle(68, -50, 5, '#ffd84d', True, 2))
    if smoke:
        h += ''.join(circle(95 + i * 14, -320 - i * 30, 14 + i * 5, '#eef0f5', True, 3) for i in range(3))
    return at(h, x, y, s)


def cottage(x, y, s=1.0, wall='#ffe2b8', roof='#d9573b', shutters='open', door='#7d4a24', glow=False):
    win = '#ffe7a3' if glow else '#bfe6ff'
    h = rect(-90, -150, 180, 150, wall, 4) + path('M-115 -140 L0 -235 L115 -140 Z', roof) + path('M-20 0 L-20 -75 Q0 -95 20 -75 L20 0 Z', door)
    if shutters == 'closed':
        h += rect(-75, -125, 26, 50, '#4b8fb8', 3) + rect(-49, -125, 26, 50, '#4b8fb8', 3) + rect(23, -125, 26, 50, '#4b8fb8', 3) + rect(49, -125, 26, 50, '#4b8fb8', 3)
    else:
        h += rect(-70, -120, 44, 40, win, 4) + rect(26, -120, 44, 40, win, 4) + rect(-92, -122, 20, 44, '#4b8fb8', 3) + rect(72, -122, 20, 44, '#4b8fb8', 3)
    return at(h, x, y, s)


def interior(wall='#f3d9b1', floor='#c99566', y=440, window=True, night=False):
    out = rect(0, 0, W, y, wall, 0, False) + rect(0, y, W, H - y, floor, 0, True, 4)
    out += ''.join(line(0, y + i * 40, W, y + i * 40, 3, '#b07d50') for i in range(1, 4))
    if window:
        out += rect(560, 90, 160, 130, '#1c2452' if night else '#bfe6ff', 8) + line(640, 90, 640, 220, 5) + line(560, 155, 720, 155, 5)
        if night:
            out += circle(690, 120, 14, '#fff2b3', False)
    return out


def fireplace(x, y, s=1.0, fire=True, bucket=False):
    h = rect(-120, -200, 240, 200, '#b9b2a6', 6) + rect(-80, -140, 160, 140, '#3a2f2f', 6) + rect(-140, -215, 280, 24, '#8a5a3b', 6)
    if fire:
        h += circle(0, -40, 80, 'url(#fireGlow)', False) + flame(0, -10, 1.0)
    if bucket:
        h += bucket_water(0, -6, 0.9)
    return at(h, x, y, s)


def flame(x, y, s=1.0):
    f = (path('M0 0 C-50 -10 -40 -60 -20 -90 C-10 -60 0 -70 0 -110 C20 -70 40 -80 30 -40 C50 -50 50 -10 0 0 Z', '#ff8a2a')
         + path('M0 -6 C-25 -10 -20 -40 -8 -55 C0 -40 6 -45 8 -65 C18 -40 30 -30 0 -6 Z', '#ffd84d', True, 3))
    return at(f, x, y, s)


def bucket_water(x, y, s=1.0):
    b = path('M-60 0 L-70 -80 L70 -80 L60 0 Z', '#9aa7b8') + ellipse(0, -80, 70, 14, '#7fd0ff') + path('M-60 -82 Q0 -140 60 -82', w=5)
    return at(b, x, y, s)


# ------------------------------------------------------------------ objets


def pot(x, y, s=1.0, steam=True, inside=(), fire=False):
    p = ''
    if fire:
        p += flame(-30, 10, 0.5) + flame(30, 10, 0.5) + flame(0, 14, 0.6)
    p += line(-90, -60, -100, 0, 6) + line(90, -60, 100, 0, 6)
    p += path('M-90 -100 Q-100 20 0 20 Q100 20 90 -100 Z', '#3d3a46') + ellipse(0, -100, 92, 22, '#4d4a58') + ellipse(0, -100, 78, 15, '#a8d8ef', True, 3)
    for i, kind in enumerate(inside):
        px = -45 + i * 30
        p += {'caillou': ellipse(px, -102, 14, 9, '#b9b2a6', True, 3), 'carotte': at(carrot(0, 0, 0.45), px, -98, rot=-60),
              'patate': ellipse(px, -102, 13, 9, '#d9b26b', True, 3), 'sel': circle(px, -102, 5, '#fff', True, 2),
              'poireau': at(leek(0, 0, 0.35), px, -96, rot=-70)}.get(kind, '')
    if steam:
        p += ''.join(path(f'M{dx} -125 q-18 -25 0 -50 q18 -25 0 -50', w=6, extra=' opacity=".55"') for dx in (-40, 0, 40))
    return at(p, x, y, s)


def stone(x, y, s=1.0, c='#b9b2a6'):
    return at(ellipse(0, -14, 26, 16, c, True, 4) + ellipse(-6, -20, 8, 4, '#fff', False, extra=' opacity=".6"'), x, y, s)


def pebbles(points, s=0.5, c='#ffffff'):
    return ''.join(stone(px, py, s, c) for px, py in points)


def carrot(x, y, s=1.0):
    c = path('M0 0 L-16 -90 Q0 -100 16 -90 Z', '#ff9f43') + line(-8, -40, 4, -42, 3) + line(-6, -65, 6, -66, 3)
    c += path('M0 -95 q-20 -30 -10 -45 M0 -95 q0 -35 6 -48 M0 -95 q20 -28 18 -40', '#4fae5b', True, 5)
    return at(c, x, y, s)


def leek(x, y, s=1.0):
    return at(rect(-14, -120, 28, 120, '#f2f7e8', 12) + path('M-14 -110 L-30 -200 L0 -120 L30 -205 L14 -110 Z', '#5bb862'), x, y, s)


def potato(x, y, s=1.0):
    return at(ellipse(0, -18, 30, 22, '#d9b26b', True, 4) + circle(-8, -24, 2, INK, False) + circle(10, -14, 2, INK, False), x, y, s)


def salt(x, y, s=1.0):
    return at(path('M-20 0 L-24 -60 L24 -60 L20 0 Z', '#fff') + rect(-26, -78, 52, 20, '#8bd3ff', 6) + ''.join(circle(-14 + i * 9, -70, 2, INK, False) for i in range(4)), x, y, s)


def honey(x, y, s=1.0):
    return at(path('M-34 0 Q-44 -50 -28 -64 L28 -64 Q44 -50 34 0 Z', '#ffb84d') + rect(-32, -84, 64, 22, '#d9573b', 6)
              + path('M-26 -40 q10 -8 20 0 q10 8 20 0', w=4) + path('M-20 -62 q-6 14 0 24', '#ffb84d', True, 3), x, y, s)


def crepes(x, y, s=1.0):
    c = ''.join(ellipse(0, -i * 10, 70, 16, '#f6c86a', True, 4) for i in range(5)) + path('M-40 -46 q20 18 40 0 q20 14 36 -4', '#ffb84d', True, 4)
    return at(c, x, y, s)


def bowl(x, y, s=1.0):
    return at(path('M-40 -30 Q-40 0 0 0 Q40 0 40 -30 Z', '#ff9f43') + ellipse(0, -30, 40, 9, '#e8b04a', True, 3)
              + path('M-10 -40 q-8 -12 0 -24 M10 -40 q-8 -12 0 -24', w=4, extra=' opacity=".5"'), x, y, s)


def table_long(x, y, s=1.0, cloth='#ff6b6b'):
    t = rect(-300, -90, 600, 30, cloth, 8) + ''.join(rect(-300 + i * 40, -90, 20, 30, '#fff', 0, False, extra=' opacity=".5"') for i in range(15))
    t += rect(-280, -60, 24, 60, '#8a5a3b', 4) + rect(256, -60, 24, 60, '#8a5a3b', 4)
    return at(t, x, y, s)


def bed(x, y, s=1.0):
    b = rect(-180, -110, 30, 110, '#8a5a3b', 6) + rect(150, -80, 30, 80, '#8a5a3b', 6) + rect(-160, -80, 320, 50, '#d9573b', 10)
    b += rect(-150, -100, 80, 30, '#fff', 12) + rect(-170, -30, 340, 14, '#8a5a3b', 4)
    return at(b, x, y, s)


def table_cloth(x, y, s=1.0):
    t = path('M-160 -110 L160 -110 L190 0 L-190 0 Z', '#ffb3c7') + ''.join(circle(i, -60, 7, '#fff', False) for i in range(-140, 160, 40))
    t += rect(-170, -122, 340, 16, '#8a5a3b', 4)
    return at(t, x, y, s)


def chair(x, y, s=1.0):
    return at(rect(-70, -260, 26, 260, '#8a5a3b', 6) + rect(-70, -120, 150, 26, '#a86f3c', 6) + rect(54, -100, 22, 100, '#8a5a3b', 6), x, y, s)


def boots(x, y, s=1.0, magic=False):
    one = path('M0 0 L0 -90 L40 -90 L40 -30 Q90 -30 90 0 Z', '#7d4a24') + rect(-6, -100, 52, 16, '#5c3519', 4)
    b = at(one, -60, 0) + at(one, 20, 0)
    if magic:
        b += sparkles(20, -60, 1, '#ffd84d', 9, 7, 90)
    return at(b, x, y, s)


def bell(x, y, s=1.0):
    b = path('M-40 0 Q-40 -70 0 -78 Q40 -70 40 0 Z', '#ffcf3d') + rect(-48, -6, 96, 14, '#e6a91f', 6) + circle(0, 14, 10, '#e6a91f', True, 4)
    b += path('M0 -78 q0 -24 0 -24', w=6) + circle(0, -108, 8, '#ffcf3d', True, 4) + sparkles(0, -40, 0.9, '#fff7c2', 3, 5, 80)
    return at(b, x, y, s)


def flute_obj(x, y, s=1.0, rot=0):
    return at(rect(-70, -7, 140, 14, '#c98a4b', 7, True, 4) + ''.join(circle(-30 + i * 18, 0, 3, INK, False) for i in range(5)), x, y, s, rot=rot)


def staff(x, y, s=1.0):
    return at(path('M0 0 L0 -230 Q0 -270 30 -265 Q50 -260 46 -238', w=8), x, y, s)


def ribbon(x, y, s=1.0):
    r = rect(-14, -200, 14, 200, '#8a5a3b', 4) + rect(400, -200, 14, 200, '#8a5a3b', 4)
    r += path('M0 -170 Q200 -150 400 -170', w=8, extra=' stroke="#e5484d"') + ''.join(
        path(f'M{40+i*40} {-168+ (6 if 3<i<7 else 2)} l10 18 l10 -18', '#ffd84d', True, 3) for i in range(9))
    return at(r, x, y, s)


def hole(x, y, s=1.0):
    return at(ellipse(0, 0, 90, 26, '#8a5a3b', True, 5) + ellipse(0, 6, 70, 16, '#5c3519', False), x, y, s)


def puddle(x, y, s=1.0):
    return at(ellipse(0, 0, 90, 22, '#7fc8f0', True, 4) + ellipse(-30, -4, 20, 5, '#fff', False, extra=' opacity=".7"'), x, y, s)


def window_light(x, y, s=1.0):
    return at(circle(0, 0, 70, 'url(#glow)', False) + rect(-22, -18, 44, 36, '#ffe066', 4), x, y, s)


def bread(x, y, s=1.0):
    return at(path('M-50 0 Q-60 -40 0 -44 Q60 -40 50 0 Z', '#e0a35a') + path('M-26 -30 l10 12 M-4 -36 l10 12 M18 -32 l10 12', w=4), x, y, s)


def crumbs(points):
    return ''.join(circle(px, py, 6, '#e0a35a', True, 3) for px, py in points)


def straw_pile(x, y, s=1.0):
    return at(path('M-80 0 Q-70 -70 0 -80 Q70 -70 80 0 Z', '#f4cd5a') + ''.join(line(i, -5, i * 0.6, -70, 3, '#c99a2e') for i in range(-60, 70, 15)), x, y, s)


def log_pile(x, y, s=1.0):
    out = ''
    for r, n_ in ((0, 3), (1, 2), (2, 1)):
        for i in range(n_):
            cx = (i - (n_ - 1) / 2) * 52
            out += rect(cx - 26, -28 - r * 44, 52, 44, '#c98a4b', 22, True, 4) + circle(cx + 14, -50 - r * 44, 12, '#e8b77d', True, 3)
    return at(out, x, y, s)


def brick_pile(x, y, s=1.0):
    return at(brick_wall(-90, 0, 180, 3, 24, 50), x, y, s)


# ------------------------------------------------------------------ personnages


def pig(mood='happy', scarf=None, hat=None, pose='stand'):
    body = '#f7a8c0'
    legs = ''.join(rect(dx, -38, 22, 40, '#f08aaa', 8) for dx in (-55, -25, 15, 40)) if pose != 'run' else (
        at(rect(-11, -40, 22, 42, '#f08aaa', 8), -40, 0, rot=30) + at(rect(-11, -40, 22, 42, '#f08aaa', 8), 40, 0, rot=-30)
        + at(rect(-11, -40, 22, 42, '#f08aaa', 8), -10, 0, rot=-25) + at(rect(-11, -40, 22, 42, '#f08aaa', 8), 20, 0, rot=25))
    p = legs + path('M-70 -80 q-30 -10 -20 -30 q10 -14 22 0', w=5) + ellipse(0, -80, 75, 58, body)
    p += poly([(30, -150), (40, -190), (65, -158)], '#f08aaa') + poly([(85, -158), (110, -190), (112, -150)], '#f08aaa')
    p += circle(70, -120, 52, body) + ellipse(112, -108, 24, 19, '#f48fb1') + ellipse(105, -108, 4, 6, INK, False) + ellipse(119, -108, 4, 6, INK, False)
    p += eyes(58, -134, 88, -134, mood if mood != 'laugh' else 'happy', 6) + cheek(50, -108) + cheek(96, -88, 7)
    p += mouth(80, -82, mood, 11) if mood != 'happy' else path('M68 -84 Q80 -74 92 -84', w=4)
    if scarf:
        p += path('M30 -82 Q70 -60 110 -84 L112 -70 Q70 -46 28 -68 Z', scarf, True, 4) + rect(30, -70, 18, 36, scarf, 6, True, 4)
    if hat == 'casquette':
        p += path('M30 -160 Q70 -195 112 -160 Z', '#3b7ff5') + path('M100 -162 L140 -158 L104 -150 Z', '#3b7ff5', True, 4)
    elif hat == 'chapeau':
        p += rect(36, -200, 60, 34, '#ffd84d', 6) + ellipse(66, -166, 52, 9, '#ffd84d') + rect(36, -182, 60, 9, '#e5484d', 0, False)
    return p


def wolf(mood='sly', pose='stand'):
    fur, belly = '#9aa0b4', '#d6d9e6'
    p = ''
    if pose == 'run':
        p += at(rect(-12, -50, 24, 56, fur, 10), -50, 0, rot=40) + at(rect(-12, -50, 24, 56, fur, 10), 55, 0, rot=-40)
        p += at(rect(-12, -50, 24, 56, fur, 10), -20, -4, rot=-30) + at(rect(-12, -50, 24, 56, fur, 10), 30, -4, rot=30)
    else:
        p += ''.join(rect(dx, -60, 26, 62, fur, 10) for dx in (-55, -20, 20, 50))
    p += path('M-80 -110 Q-170 -150 -150 -60 Q-120 -80 -80 -90 Z', fur) + path('M-150 -62 q6 -14 -6 -30', '#fff', True, 4)
    p += ellipse(0, -110, 90, 62, fur) + ellipse(10, -92, 55, 32, belly, False)
    p += poly([(40, -200), (52, -258), (82, -205)], fur) + poly([(48, -205), (55, -240), (72, -207)], '#f2a3b5', False)
    p += poly([(100, -205), (128, -255), (132, -196)], fur)
    p += path('M30 -180 Q60 -230 120 -200 Q150 -185 205 -175 Q220 -160 200 -148 Q150 -140 110 -135 Q50 -130 30 -180 Z', fur)
    p += ellipse(205, -168, 12, 10, INK, False) + path('M140 -146 Q170 -140 196 -150', w=4)
    if pose == 'blow':
        p += circle(150, -150, 28, belly) + circle(120, -150, 22, belly, True, 4)
        p += eyes(85, -192, 115, -192, 'angry', 6)
    elif pose == 'howl':
        p += eyes(85, -192, 115, -192, 'sleepy', 6) + ellipse(196, -140, 12, 10, '#7a2b3a', True, 3)
    else:
        p += eyes(85, -192, 115, -192, mood, 6)
        if mood in ('scared', 'hurt'):
            p += ellipse(165, -132, 10, 14, '#7a2b3a', True, 3)
        else:
            p += path('M150 -142 l8 12 l8 -12', '#fff', True, 3) + path('M172 -144 l8 12 l8 -12', '#fff', True, 3)
    return p


def child(skin='#f5c9a0', hair='#6b4226', hair_style='court', shirt='#3b7ff5', pants='#4b5a8a', mood='happy', hat=None, scale_head=1.0, arms='down', prop=None, girl=False):
    p = rect(-28, -70, 22, 72, pants, 8) + rect(6, -70, 22, 72, pants, 8) + ellipse(-17, 2, 18, 8, INK, False) + ellipse(17, 2, 18, 8, INK, False)
    p += path('M-42 -60 Q-46 -150 0 -152 Q46 -150 42 -60 Z' if not girl else 'M-56 -50 Q-40 -150 0 -152 Q40 -150 56 -50 Z', shirt)
    if arms == 'up':
        p += at(rect(-10, -80, 20, 80, shirt, 10), -38, -140, rot=-150) + at(rect(-10, -80, 20, 80, shirt, 10), 38, -140, rot=150)
        p += circle(-80, -205, 13, skin) + circle(80, -205, 13, skin)
    elif arms == 'mouth':
        p += at(rect(-10, -60, 20, 70, shirt, 10), -40, -140, rot=-20) + at(rect(-10, -60, 20, 70, shirt, 10), 34, -140, rot=-110)
        p += circle(-58, -80, 13, skin) + circle(95, -168, 13, skin)
    else:
        p += at(rect(-10, -10, 20, 80, shirt, 10), -44, -140, rot=18) + at(rect(-10, -10, 20, 80, shirt, 10), 44, -140, rot=-18)
        p += circle(-66, -66, 13, skin) + circle(66, -66, 13, skin)
    head = circle(0, -210, 58, skin)
    if hair_style == 'court':
        head += path('M-58 -215 Q-60 -280 0 -275 Q60 -280 58 -215 Q40 -250 0 -246 Q-30 -250 -58 -215 Z', hair)
    elif hair_style == 'couettes':
        head += path('M-58 -215 Q-60 -280 0 -275 Q60 -280 58 -215 Q40 -250 0 -246 Q-30 -250 -58 -215 Z', hair) + circle(-70, -210, 22, hair) + circle(70, -210, 22, hair)
    elif hair_style == 'boucles':
        head += ''.join(circle(-50 + i * 20, -258 + (i % 2) * 8, 20, hair) for i in range(6))
    elif hair_style == 'chignon':
        head += circle(0, -282, 24, hair) + path('M-58 -215 Q-60 -280 0 -275 Q60 -280 58 -215 Q40 -250 0 -246 Q-30 -250 -58 -215 Z', hair)
    head += eyes(-20, -210, 20, -210, mood, 7) + cheek(-34, -188) + cheek(34, -188) + mouth(0, -180, mood if mood != 'happy' else 'happy', 14)
    if hat == 'beret':
        head += path('M-62 -240 Q-50 -290 10 -290 Q70 -285 64 -236 Q0 -256 -62 -240 Z', '#e5484d') + circle(10, -293, 7, '#e5484d', True, 3)
    elif hat == 'bandana':
        head += path('M-60 -236 Q0 -290 60 -236 Q0 -250 -60 -236 Z', '#ff6b8a') + path('M-58 -236 l-30 10 l14 -24 Z', '#ff6b8a', True, 4)
    elif hat == 'bonnet':
        head += path('M-62 -232 Q0 -320 62 -232 Q0 -246 -62 -232 Z', '#22a559') + circle(30, -300, 12, '#ffd84d', True, 3)
    p += at(head, 0, 0, scale_head)
    if prop == 'staff':
        p += staff(70, -50, 0.9)
    elif prop == 'backpack':
        p += rect(-75, -150, 36, 80, '#b5651d', 10)
    elif prop == 'pot':
        p += pot(-10, -40, 0.35, steam=False)
    return p


def adult(kind='fermier', mood='happy'):
    skin = {'grandmere': '#f2c7a5', 'jardiniere': '#c98a5a', 'boulangere': '#f5d0b0', 'fermier': '#e0a87a', 'maire': '#f1c39d', 'villageois': '#d9a27a', 'bucheron': '#e0a87a', 'parent': '#f2c7a5'}[kind]
    shirt = {'grandmere': '#8b5cf6', 'jardiniere': '#22a559', 'boulangere': '#ffffff', 'fermier': '#e5484d', 'maire': '#3b4a7a', 'villageois': '#f28a1c', 'bucheron': '#d9573b', 'parent': '#e64aa0'}[kind]
    girl = kind in ('grandmere', 'jardiniere', 'boulangere', 'parent')
    p = rect(-32, -110, 26, 112, '#4b5a8a', 8) + rect(6, -110, 26, 112, '#4b5a8a', 8) + ellipse(-19, 2, 20, 8, INK, False) + ellipse(19, 2, 20, 8, INK, False)
    p += path(('M-62 -90 Q-50 -230 0 -232 Q50 -230 62 -90 Z' if girl else 'M-48 -100 Q-52 -230 0 -232 Q52 -230 48 -100 Z'), shirt)
    if kind == 'jardiniere':
        p += path('M-36 -100 L-30 -200 L30 -200 L36 -100 Z', '#c98a4b', True, 4) + ellipse(-10, -150, 6, 4, '#8a5a3b', False) + ellipse(14, -130, 7, 4, '#8a5a3b', False)
    if kind == 'maire':
        p += path('M-40 -220 L40 -110', w=14, extra=' stroke="#e5484d"')
    p += at(rect(-11, -10, 22, 90, shirt, 10), -52, -215, rot=15) + at(rect(-11, -10, 22, 90, shirt, 10), 52, -215, rot=-15)
    p += circle(-74, -132, 14, skin) + circle(74, -132, 14, skin)
    p += circle(0, -282, 56, skin)
    hair = {'grandmere': '#e8e8f0', 'jardiniere': '#2e1f1a', 'boulangere': '#d98b3a', 'fermier': '#6b4226', 'maire': '#9a9a9a', 'villageois': '#2e1f1a', 'bucheron': '#6b4226', 'parent': '#6b4226'}[kind]
    if kind == 'grandmere':
        p += circle(0, -352, 26, hair) + path('M-56 -290 Q-54 -350 0 -346 Q54 -350 56 -290 Q30 -322 0 -320 Q-30 -322 -56 -290 Z', hair)
        p += circle(-20, -282, 14, 'none', True, 4) + circle(20, -282, 14, 'none', True, 4) + line(-6, -282, 6, -282, 4)
    else:
        p += path('M-56 -290 Q-54 -350 0 -346 Q54 -350 56 -290 Q30 -322 0 -320 Q-30 -322 -56 -290 Z', hair)
    if kind != 'grandmere':
        p += eyes(-20, -284, 20, -284, mood, 6)
    p += cheek(-32, -262) + cheek(32, -262) + mouth(0, -252, mood, 13)
    if kind in ('fermier', 'bucheron', 'maire'):
        p += path('M-24 -262 Q0 -246 24 -262 Q12 -248 0 -250 Q-12 -248 -24 -262 Z', hair, True, 3)
    if kind == 'fermier':
        p += ellipse(0, -326, 80, 14, '#f4cd5a') + path('M-44 -330 Q-40 -380 0 -382 Q40 -380 44 -330 Z', '#f4cd5a') + rect(-44, -344, 88, 10, '#e5484d', 0, False)
    if kind == 'boulangere':
        p += path('M-50 -320 Q-70 -400 -20 -392 Q0 -420 20 -392 Q70 -400 50 -320 Z', '#fff')
    return p


def ogre(mood='angry', pose='stand'):
    skin, tunic = '#a7c957', '#8a5a3b'
    if pose == 'sleep':
        p = chair(0, 0, 1.4)
        p += path('M-80 -170 Q-110 -330 20 -340 Q150 -330 120 -170 Z', tunic) + ellipse(20, -220, 95, 70, '#9b6a3e', True, 5)
        p += rect(-40, -180, 50, 100, '#4b5a8a', 14) + rect(30, -180, 50, 100, '#4b5a8a', 14)
        p += boots(30, 0, 0.9)
        p += circle(20, -400, 72, skin) + path('M-50 -430 Q20 -500 90 -430 Q60 -470 20 -462 Q-20 -470 -50 -430 Z', '#5c3519')
        p += eyes(-6, -410, 46, -410, 'sleepy', 8) + ellipse(20, -388, 18, 14, '#8fb34a') + path('M-20 -360 Q20 -340 60 -360', w=5)
        p += path('M-30 -345 Q20 -300 70 -345 Q20 -320 -30 -345 Z', '#5c3519', True, 4)
        p += at(rect(-14, -10, 28, 100, skin, 14), -70, -300, rot=30) + at(rect(-14, -10, 28, 100, skin, 14), 110, -300, rot=-30)
        return p + zzz(90, -470, 1.2)
    p = rect(-60, -150, 50, 152, '#4b5a8a', 14) + rect(10, -150, 50, 152, '#4b5a8a', 14) + boots(0, 2, 0.8)
    p += path('M-110 -120 Q-130 -330 0 -340 Q130 -330 110 -120 Z', tunic) + ellipse(0, -190, 90, 70, '#9b6a3e', True, 5) + rect(-110, -150, 220, 18, '#5c3519', 6)
    if pose == 'arms_up':
        p += at(rect(-18, -110, 36, 120, skin, 18), -110, -300, rot=-30) + at(rect(-18, -110, 36, 120, skin, 18), 110, -300, rot=30)
    else:
        p += at(rect(-18, -10, 36, 130, skin, 18), -110, -310, rot=20) + at(rect(-18, -10, 36, 130, skin, 18), 110, -310, rot=-20)
    p += circle(0, -410, 80, skin) + path('M-80 -430 Q0 -520 80 -430 Q50 -480 0 -470 Q-50 -480 -80 -430 Z', '#5c3519')
    p += eyes(-26, -420, 26, -420, mood, 8) + ellipse(0, -390, 22, 16, '#8fb34a')
    p += path('M-50 -360 Q0 -300 50 -360 Q0 -335 -50 -360 Z', '#5c3519', True, 4) + mouth(0, -362, mood, 18)
    p += poly([(-30, -358), (-24, -340), (-18, -358)], '#fff') + poly([(18, -358), (24, -340), (30, -358)], '#fff')
    return p


def tortoise(mood='happy', pose='walk'):
    p = ''.join(rect(dx, -34, 26, 36, '#b5d96a', 12) for dx in (-60, -20, 20, 50)) + path('M-90 -30 L-120 -40 L-92 -50 Z', '#b5d96a')
    p += ellipse(110, -70, 44, 36, '#b5d96a') + rect(70, -66, 50, 30, '#b5d96a', 14, False)
    p += eyes(110, -84, 132, -84, mood, 6) + mouth(128, -58, mood if mood != 'happy' else 'happy', 10) + cheek(100, -60, 7)
    p += path('M-100 -30 Q-100 -150 0 -150 Q100 -150 100 -30 Z', '#5aa64f')
    for cx, cy in ((-45, -60), (0, -70), (45, -60), (-22, -110), (24, -110)):
        p += poly([(cx + 20 * math.cos(a), cy + 18 * math.sin(a)) for a in [i * math.pi / 3 for i in range(6)]], '#7cc46b', True, 3)
    p += rect(-104, -38, 208, 14, '#4b8f43', 7)
    if pose == 'back':
        return at(p, 0, -150, 1, rot=180)
    return p


def hare(mood='happy', pose='stand'):
    fur, light = '#c99a6b', '#f2dcc0'
    p = ''
    if pose == 'run':
        p += at(ellipse(0, 0, 40, 16, fur), -70, -20, rot=-20) + at(ellipse(0, 0, 34, 14, fur), 60, -30, rot=30)
        p += ellipse(0, -80, 80, 48, fur) + ellipse(10, -70, 45, 26, light, False) + circle(-82, -100, 18, '#fff')
        hx, hy = 80, -140
    elif pose == 'sleep':
        p += ellipse(0, -40, 90, 42, fur) + ellipse(10, -32, 50, 22, light, False) + circle(-90, -60, 16, '#fff')
        hx, hy = 90, -70
    else:
        p += ellipse(-30, -10, 48, 16, fur) + ellipse(30, -10, 30, 13, fur) + ellipse(0, -90, 60, 74, fur) + ellipse(8, -80, 36, 48, light, False) + circle(-58, -40, 18, '#fff')
        hx, hy = 10, -190
        if pose == 'cheer':
            p += at(rect(-9, -70, 18, 70, fur, 9), -40, -120, rot=-30) + at(rect(-9, -70, 18, 70, fur, 9), 50, -120, rot=30)
    h = path('M-20 -40 Q-50 -160 -10 -170 Q20 -150 6 -40 Z', fur) + path('M-12 -60 Q-34 -140 -10 -152 Q6 -140 0 -60 Z', '#f2a3b5', False)
    h += path('M10 -40 Q30 -165 70 -160 Q80 -130 30 -36 Z', fur) + path('M18 -54 Q38 -140 62 -146 Q66 -124 30 -52 Z', '#f2a3b5', False)
    h += ellipse(0, 0, 54, 46, fur) + ellipse(28, 14, 26, 18, light, False) + ellipse(46, 4, 9, 7, '#f27a9a')
    h += eyes(-6, -10, 22, -10, mood if pose != 'sleep' else 'sleepy', 6)
    h += line(50, 14, 90, 6, 3) + line(50, 20, 90, 24, 3) + mouth(36, 22, mood if mood not in ('happy',) else 'happy', 8)
    p += at(h, hx, hy)
    if pose == 'sleep':
        p += zzz(120, -140, 0.8)
    return p


def sheep(mood='happy'):
    p = ''.join(rect(dx, -40, 16, 42, '#3b3340', 6) for dx in (-40, -16, 14, 34))
    p += ''.join(circle(x, y, r, '#ffffff', True, 4) for x, y, r in ((-40, -70, 34), (0, -88, 40), (40, -70, 34), (-20, -50, 30), (22, -48, 30)))
    p += ellipse(66, -86, 26, 32, '#3b3340') + ellipse(56, -110, 18, 9, '#3b3340') + eyes(60, -94, 78, -94, mood, 5) + circle(48, -112, 14, '#fff', True, 4)
    return p


def dog(mood='happy', pose='stand'):
    fur = '#b07a4a'
    p = ''.join(rect(dx, -46, 20, 48, fur, 8) for dx in (-50, -24, 18, 42)) + path('M-60 -70 q-40 -30 -30 -60', w=10, extra=f' stroke="{fur}"')
    p += ellipse(0, -70, 70, 38, fur) + ellipse(-20, -76, 22, 16, '#7d4a24', False)
    p += circle(70, -110, 40, fur) + ellipse(100, -98, 26, 20, '#d9a77a') + ellipse(122, -104, 9, 7, INK, False)
    p += path('M48 -140 Q30 -100 46 -84 Q60 -110 62 -140 Z', '#7d4a24') + eyes(66, -122, 88, -122, mood, 6)
    if pose == 'bark':
        p += path('M100 -82 Q115 -60 128 -84 Z', '#7a2b3a', True, 3)
        p += at(line(0, 0, 30, -10, 5) + line(0, 20, 34, 20, 5) + line(0, 40, 30, 50, 5), 150, -110)
    return p


def bird(color='#5bb5f5'):
    return (ellipse(0, -20, 22, 18, color, True, 3) + circle(16, -32, 12, color, True, 3) + poly([(26, -34), (40, -30), (26, -26)], '#ffb84d', True, 2)
            + circle(18, -35, 3, INK, False) + path('M-6 -24 q-12 -18 6 -16', '#ffffff', True, 3) + line(-4, -2, -4, 6, 3) + line(6, -2, 6, 6, 3))


def butterfly(color='#5bb5f5'):
    return (ellipse(-18, -14, 18, 24, color, True, 3) + ellipse(18, -14, 18, 24, color, True, 3) + ellipse(-14, 14, 12, 14, color, True, 3)
            + ellipse(14, 14, 12, 14, color, True, 3) + rect(-4, -26, 8, 46, INK, 4, False) + path('M-2 -26 q-8 -16 -16 -18 M2 -26 q8 -16 16 -18', w=3))


def frame(color):
    """Liseré coloré aux couleurs de l'histoire (couvertures)."""
    return f'<rect x="10" y="10" width="{W-20}" height="{H-20}" rx="36" fill="none" stroke="{color}" stroke-width="20"/>'


# ------------------------------------------------------------------ éléments des exemples d'initiation


def cat(mood='happy', color='#f2a65a'):
    p = path('M-60 -40 q-50 -10 -50 -70', w=12, extra=f' stroke="{color}"') + ''.join(rect(dx, -40, 18, 42, color, 8) for dx in (-45, -20, 18, 40))
    p += ellipse(0, -50, 62, 34, color) + ''.join(path(f'M{dx} -78 q6 12 0 24', w=4, extra=' stroke="#d9823a"') for dx in (-30, -10, 10))
    p += circle(55, -95, 38, color) + poly([(26, -118), (30, -150), (52, -128)], color) + poly([(62, -130), (84, -152), (88, -116)], color)
    p += eyes(44, -100, 70, -100, mood, 6) + ellipse(60, -84, 6, 4, '#f27a9a', False) + path('M52 -78 Q60 -72 68 -78', w=3)
    p += line(70, -84, 100, -90, 2) + line(70, -80, 100, -78, 2)
    return p


def castle(x, y, s=1.0, door_open=False):
    c = ''
    for tx in (-200, 160):
        c += rect(tx, -300, 80, 300, '#c9c3d6', 4) + ''.join(rect(tx + i * 20, -320, 14, 22, '#c9c3d6', 2, True, 3) for i in range(4))
        c += path(f'M{tx-10} -300 L{tx+40} -380 L{tx+90} -300 Z', '#5b5bd6') + rect(tx + 28, -240, 24, 36, '#3b2f3a', 10)
        c += path(f'M{tx+40} -380 L{tx+40} -420 L{tx+70} -410 L{tx+40} -400', '#e5484d', True, 3)
    c += rect(-120, -220, 280, 220, '#d8d2e6', 4) + ''.join(rect(-120 + i * 28, -240, 20, 22, '#d8d2e6', 2, True, 3) for i in range(10))
    c += path('M-20 0 L-20 -110 Q20 -160 60 -110 L60 0 Z', '#2a1f29' if door_open else '#8a5a3b')
    if not door_open:
        c += ''.join(line(-20 + i * 16, -120, -20 + i * 16, 0, 3) for i in range(1, 5)) + circle(45, -50, 7, '#ffd84d', True, 3)
    c += rect(-90, -170, 30, 44, '#ffe7a3', 10) + rect(100, -170, 30, 44, '#ffe7a3', 10)
    return at(c, x, y, s)


def chest(x, y, s=1.0, open_=True):
    c = rect(-80, -70, 160, 70, '#b5651d', 8) + rect(-80, -40, 160, 10, '#ffd84d', 0, True, 3)
    if open_:
        c += path('M-80 -70 L-90 -140 L90 -140 L80 -70 Z', '#c97a35') + ''.join(circle(-50 + i * 20, -78 - (i % 3) * 6, 12, '#ffd84d', True, 3) for i in range(6))
        c += sparkles(0, -110, 0.8, '#fff7c2', 3, 6, 80)
    else:
        c += path('M-80 -70 Q0 -120 80 -70 Z', '#c97a35')
    return at(c, x, y, s)


def marbles(x, y, s=1.0, seed=4):
    r = random.Random(seed)
    cols = ['#e5484d', '#3b7ff5', '#22a559', '#ffd84d', '#e64aa0', '#8b5cf6']
    return at(''.join(circle(r.uniform(-60, 60), r.uniform(-90, -70), 11, r.choice(cols), True, 3) + circle(0, 0, 0, 'none', False) for _ in range(10)), x, y, s)


def key(x, y, s=1.0, rot=0):
    k = circle(-40, 0, 22, '#ffd84d', True, 5) + circle(-40, 0, 9, '#fff6c9', True, 3) + rect(-20, -7, 90, 14, '#ffd84d', 6, True, 4)
    k += rect(50, 6, 10, 18, '#ffd84d', 2, True, 3) + rect(30, 6, 10, 14, '#ffd84d', 2, True, 3)
    return at(k + sparkles(0, 0, 0.7, '#fff6c9', 8, 4, 60), x, y, s, rot=rot)


def books(x, y, s=1.0):
    cols = ['#e5484d', '#3b7ff5', '#22a559', '#ffd84d', '#8b5cf6', '#f28a1c', '#14b0a6']
    shelf = ''
    for row in range(3):
        yy = -row * 110
        shelf += rect(-200, yy - 12, 400, 12, '#8a5a3b', 3)
        xx = -190
        for i in range(11):
            w_ = 26 + (i * 7 + row * 5) % 12
            h_ = 70 + (i * 13 + row * 3) % 25
            shelf += rect(xx, yy - 12 - h_, w_, h_, cols[(i + row) % 7], 3, True, 3)
            xx += w_ + 4
    return at(shelf, x, y, s)


def owl(mood='happy'):
    p = ellipse(0, -70, 52, 70, '#8a6a4a') + ellipse(0, -55, 34, 46, '#d9c2a0', False)
    p += poly([(-40, -125), (-30, -150), (-15, -128)], '#8a6a4a') + poly([(15, -128), (30, -150), (40, -125)], '#8a6a4a')
    p += circle(-20, -100, 18, '#fff', True, 3) + circle(20, -100, 18, '#fff', True, 3)
    if mood == 'sleepy':
        p += path('M-30 -100 q10 6 20 0 M10 -100 q10 6 20 0', w=4) + circle(20, -100, 18, '#8a6a4a', False, extra=' opacity="0"')
        p += circle(20, -100, 18, '#8a6a4a', True, 3) + path('M8 -100 q12 8 24 0', w=4)
    else:
        p += circle(-18, -98, 8, INK, False) + circle(22, -98, 8, INK, False)
    p += poly([(-8, -86), (8, -86), (0, -70)], '#ffb84d', True, 3) + line(-14, 0, -14, 10, 4) + line(14, 0, 14, 10, 4)
    return p


def fairy(x, y, s=1.0):
    f = ellipse(-30, -70, 30, 44, '#bfe6ff', True, 3, ' opacity=".8"') + ellipse(30, -70, 30, 44, '#bfe6ff', True, 3, ' opacity=".8"')
    f += path('M-16 -30 L0 -90 L16 -30 Z', '#e64aa0') + circle(0, -104, 16, '#f5c9a0', True, 3) + path('M-16 -110 Q0 -138 16 -110 Z', '#ffd84d', True, 3)
    f += eyes(-6, -104, 6, -104, 'happy', 3) + line(14, -60, 40, -90, 3) + sparkles(40, -96, 0.5, '#fff6c9', 1, 4, 30)
    return at(f, x, y, s)


def potion(x, y, s=1.0):
    return at(circle(0, -30, 30, '#e64aa0', True, 4) + rect(-10, -76, 20, 22, '#bfe6ff', 4, True, 3) + rect(-14, -86, 28, 12, '#8a5a3b', 4, True, 3)
              + sparkles(0, -40, 0.6, '#fff6c9', 6, 5, 50), x, y, s)


def squirrel():
    p = path('M-30 -30 Q-110 -80 -70 -150 Q-30 -170 -20 -120 Q-40 -90 -20 -60 Z', '#d9823a') + ellipse(0, -40, 34, 40, '#d9823a')
    p += circle(16, -90, 26, '#d9823a') + poly([(4, -110), (8, -130), (20, -112)], '#d9823a') + eyes(10, -94, 30, -94, 'happy', 4)
    p += ellipse(40, -86, 5, 4, INK, False) + ellipse(8, -34, 18, 24, '#f2dcc0', False)
    return p


def fireflies(seed=3, n=14, box=(80, 120, 720, 460)):
    r = random.Random(seed)
    return ''.join(circle(x, y, 18, 'url(#glow)', False) + circle(x, y, 4, '#fff6b0', False) for x, y in
                   [(r.uniform(box[0], box[2]), r.uniform(box[1], box[3])) for _ in range(n)])


def giant_tree(x, y, s=1.0):
    t = path('M-60 0 Q-40 -150 -70 -260 L70 -260 Q40 -150 60 0 Z', '#8a5a3b') + rect(-14, -90, 28, 40, '#ffe066', 10, True, 4)
    t += circle(0, -340, 160, '#3f9a52') + circle(-140, -280, 90, '#4fae5b') + circle(140, -280, 90, '#4fae5b') + circle(0, -440, 90, '#5bb862')
    t += fireflies(9, 10, (-200, -480, 200, -200))
    return at(t, x, y, s)
