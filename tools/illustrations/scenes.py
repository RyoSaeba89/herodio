"""Illustrations des histoires fournies, composées avec le kit (CC0).

Usage : python tools/illustrations/scenes.py   → editor/public/examples/<histoire>/img/<nom>.svg
"""
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from kit import *  # noqa: E402,F401,F403

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'editor', 'public', 'examples')
SCENES = {}


def scene(story, name):
    def deco(fn):
        SCENES[(story, name)] = fn
        return fn
    return deco


def confetti(seed=1, n=40, ymax=380):
    r = random.Random(seed)
    cols = ['#e5484d', '#ffd84d', '#22a559', '#3b7ff5', '#e64aa0', '#f28a1c']
    return ''.join(at(rect(-6, -3, 12, 6, r.choice(cols), 2, False), r.uniform(20, 780), r.uniform(20, ymax), 1, rot=r.uniform(0, 180)) for _ in range(n))


def bunting(y=60, color_seed=2):
    r = random.Random(color_seed)
    cols = ['#e5484d', '#ffd84d', '#22a559', '#3b7ff5', '#e64aa0']
    out = path(f'M0 {y} Q400 {y+50} 800 {y}', w=4)
    for i in range(14):
        x = 30 + i * 55
        yy = y + 50 * (1 - ((x - 400) / 400) ** 2) * 0.5 + 2
        out += poly([(x - 18, yy), (x + 18, yy), (x, yy + 34)], r.choice(cols), True, 3)
    return out


def basket(x, y, s=1.0):
    b = path('M-60 0 L-70 -60 L70 -60 L60 0 Z', '#c98a4b') + ''.join(line(-60 + i * 20, -58, -55 + i * 18, -4, 3, '#8a5a3b') for i in range(7))
    b += path('M-50 -60 Q0 -130 50 -60', w=8) + circle(-30, -70, 16, '#e5484d') + circle(10, -74, 16, '#ffd84d') + circle(40, -68, 14, '#22a559')
    return at(b, x, y, s)


def brick(x, y, s=1.0, rot=0):
    return at(rect(-26, -12, 52, 24, '#d9573b', 3, True, 3), x, y, s, rot=rot)


def kids(n, x0, y, gap, s, seed=1, mood='happy', start_shirt=0):
    shirts = ['#3b7ff5', '#e5484d', '#22a559', '#f28a1c', '#8b5cf6', '#14b0a6', '#e64aa0']
    hairs = ['#6b4226', '#2e1f1a', '#d98b3a', '#6b4226', '#2e1f1a', '#b5651d', '#6b4226']
    out = ''
    for i in range(n):
        out += at(child(hair=hairs[(i + seed) % 7], shirt=shirts[(i + start_shirt) % 7], mood=mood, hair_style='court' if i % 3 else 'boucles'),
                  x0 + i * gap, y, s * (1 - i * 0.04))
    return out


def poucet(mood='happy', arms='down', s=0.55):
    return child(hair='#d98b3a', shirt='#22a559', hat='bonnet', mood=mood, arms=arms, scale_head=1.1)


def lila(mood='happy', arms='down'):
    return child(hair='#2e1f1a', hair_style='couettes', shirt='#e64aa0', hat='bandana', girl=True, mood=mood, arms=arms, prop='backpack', skin='#c98a5a')


def leo(mood='happy', arms='down', prop='staff'):
    return child(hair='#6b4226', shirt='#22a559', hat='beret', mood=mood, arms=arms, prop=prop)


def mama_pig():
    return pig('happy', None, 'chapeau')


SCARVES = ['#3b7ff5', '#22a559', '#e5484d']  # le héros (le plus jeune) porte le rouge

# ============================================================== Les trois petits cochons


@scene('cochons', 'couverture')
def _():
    return svg(sky(), sun(680, 100), cloud(160, 110, 0.9), hills(), house_brick(420, 470, 0.85), flowers(3),
               *[at(pig('happy', SCARVES[i]), 140 + i * 230 if i != 1 else 360, 560 if i != 1 else 575, 0.75) for i in range(3)],
               at(wolf('sly'), 760, 520, 0.6, flip=True), bush(720, 530, 1.2), frame('#e64aa0'))


@scene('cochons', 'depart')
def _():
    return svg(sky(), sun(), cloud(200, 90), hills(), cottage(150, 450, 0.7, '#ffd9e6', '#e64aa0'), path_road(),
               at(mama_pig(), 260, 560, 0.85), *[at(pig('happy', SCARVES[i]), 460 + i * 120, 565 - i * 6, 0.6) for i in range(3)], hearts(330, 330, 1.0), flowers(4))


@scene('cochons', 'materiaux')
def _():
    return svg(sky(), sun(700, 90, 40), hills(), path_road(), straw_pile(150, 520, 1.1), log_pile(400, 510, 0.9), brick_pile(640, 520, 1.0),
               at(pig('happy', SCARVES[2]), 400, 590, 0.6), sparkles(640, 400, 0.8, seed=8, n=4))


@scene('cochons', 'maison-paille')
def _():
    return svg(sky(), sun(), hills(), house_straw(330, 500, 0.95), at(pig('sleepy', SCARVES[2]), 140, 580, 0.55),
               at(wolf('sly'), 720, 560, 0.6, flip=True), zzz(200, 420, 0.7), flowers(5))


@scene('cochons', 'loup-souffle')
def _():
    return svg(sky('warm'), hills('#a4d77a', '#86c463'), house_straw(300, 500, 0.9, blown=True), at(wolf(pose='blow'), 680, 560, 0.8, flip=True),
               wind(260, 360, 0.75, 3), at(pig('scared', SCARVES[2], pose='run'), 120, 590, 0.55, flip=True), motion(170, 520, 0.8))


@scene('cochons', 'maison-bois')
def _():
    return svg(sky(), sun(), cloud(170, 100), hills(), house_wood(360, 500, 0.95), at(pig('happy', SCARVES[2]), 610, 575, 0.6),
               at(wolf('sly'), 780, 560, 0.5, flip=True), flowers(6))


@scene('cochons', 'fuite')
def _():
    return svg(sky(), hills(), path_road(), house_wood(620, 470, 0.45, broken=True), at(pig('scared', SCARVES[2], pose='run'), 260, 560, 0.75, flip=True),
               motion(380, 470, 1.2), sweat(250, 420, 1.2), at(wolf('angry', 'run'), 640, 560, 0.45, flip=True), flowers(7))


@scene('cochons', 'briques')
def _():
    return svg(sky(), sun(680, 90, 40), hills(), at(brick_wall(-150, 0, 300, 3), 300, 540), brick_pile(600, 545, 0.8),
               at(pig('happy', SCARVES[2]), 520, 585, 0.6), brick(570, 460, 1.2, -10), sweat(560, 420, 1.0), flowers(8, 6))


@scene('cochons', 'maison-briques')
def _():
    return svg(sky(), sun(), cloud(150, 90), hills(), house_brick(380, 500, 0.95), at(pig('laugh', SCARVES[2]), 640, 575, 0.65),
               sparkles(640, 330, 1.0, seed=3), flowers(9))


@scene('cochons', 'loup-briques')
def _():
    return svg(sky('warm'), hills('#a4d77a', '#86c463'), house_brick(280, 500, 0.95), at(wolf(pose='blow'), 690, 560, 0.85, flip=True), wind(350, 360, 0.7),
               at(pig('laugh', SCARVES[2]), 180, 410, 0.35), flowers(10, 6))


@scene('cochons', 'freres')
def _():
    return svg(interior('#f8e0c0', '#c99566'), fireplace(140, 440, 0.6, fire=False), *[at(pig('laugh', SCARVES[i]), 330 + i * 150, 560, 0.62) for i in range(3)],
               hearts(480, 230, 1.4, 5))


@scene('cochons', 'cheminee')
def _():
    return svg(sky('night'), stars(), moon(130, 100), hills('#4f8f5a', '#3f7a4c'), house_brick(420, 520, 1.0, glow=True, smoke=False),
               at(wolf('sly'), 520, 230, 0.5), sparkles(470, 200, 0.6, '#fff6c9', 9, 4))


@scene('cochons', 'loup-brule')
def _():
    return svg(sky(), hills(), house_brick(200, 480, 0.7, door_open=True), at(wolf('scared', 'run'), 560, 540, 0.75),
               flame(500, 440, 0.6), motion(470, 420, 1.2), at(pig('laugh', SCARVES[2]), 220, 580, 0.5), flowers(11))


@scene('cochons', 'plouf')
def _():
    return svg(interior('#f8e0c0', '#c99566'), fireplace(300, 440, 0.9, fire=False, bucket=True), drops(300, 200, 2.0, 9),
               at(wolf('scared', 'run'), 640, 540, 0.6), drops(640, 300, 1.0, 5, 6), at(pig('laugh', SCARVES[2]), 120, 570, 0.5))


@scene('cochons', 'famille')
def _():
    return svg(interior('#ffe9c8', '#c99566', night=True), fireplace(150, 440, 0.6), *[at(pig('laugh', SCARVES[i]), 340 + i * 140, 560, 0.6) for i in range(3)],
               notes(400, 230, 1.2), notes(600, 200, 1.0, 3), hearts(250, 260, 0.9))


# ============================================================== La soupe au caillou


@scene('soupe', 'couverture')
def _():
    return svg(sky(), bunting(50), ground(450), cottage(110, 470, 0.7), cottage(690, 470, 0.7, '#d8ecff', '#4b8fb8'),
               pot(400, 520, 1.1, inside=('caillou', 'carotte', 'patate', 'poireau'), fire=True), at(lila('laugh'), 610, 590, 0.6),
               at(adult('fermier'), 190, 590, 0.5), sparkles(400, 300, 0.8, seed=5), frame('#f28a1c'))


@scene('soupe', 'arrivee')
def _():
    return svg(sky(), sun(), cloud(220, 110), hills(), path_road(), tree(120, 470, 0.8), at(lila(), 420, 580, 0.75),
               stone(520, 470, 0.8), sparkles(520, 450, 0.4, seed=1, n=3), flowers(12))


@scene('soupe', 'village')
def _():
    return svg(sky(), ground(450), cottage(130, 470, 0.75, shutters='closed'), cottage(400, 455, 0.75, '#d8ecff', '#4b8fb8', shutters='closed'),
               cottage(670, 470, 0.75, '#ffd9e6', '#8b5cf6', shutters='closed'), pot(330, 580, 0.5, steam=False), at(lila(), 470, 590, 0.55), stone(400, 590, 0.5))


@scene('soupe', 'place')
def _():
    return svg(sky(), ground(450), cottage(120, 470, 0.7), cottage(680, 470, 0.7, '#ffd9e6', '#8b5cf6'),
               pot(380, 540, 1.0, inside=('caillou',), fire=True), at(lila('laugh'), 590, 590, 0.6), at(adult('fermier'), 120, 520, 0.35), at(adult('grandmere'), 690, 520, 0.35))


@scene('soupe', 'fermier')
def _():
    return svg(sky(), ground(450), cottage(150, 470, 0.7), pot(470, 560, 0.9, inside=('caillou', 'carotte'), fire=True),
               at(adult('fermier', 'laugh'), 260, 590, 0.65), at(carrot(0, 0), 330, 420, 0.7, rot=20), at(carrot(0, 0), 350, 430, 0.7, rot=40), at(lila(), 660, 590, 0.5))


@scene('soupe', 'jardiniere')
def _():
    return svg(sky(), ground(450), cottage(150, 470, 0.7, '#d8ecff', '#4b8fb8'), pot(470, 560, 0.9, inside=('caillou', 'carotte', 'patate'), fire=True),
               at(adult('jardiniere', 'laugh'), 260, 590, 0.65), potato(330, 430, 0.8), potato(360, 400, 0.7), at(lila(), 660, 590, 0.5), flowers(13, 5))


@scene('soupe', 'grand-mere')
def _():
    return svg(sky(), ground(450), cottage(620, 470, 0.7, '#ffd9e6', '#8b5cf6'), at(adult('grandmere', 'sad'), 300, 590, 0.65), basket(360, 520, 1.1),
               sweat(330, 360, 1.2), at(lila(), 520, 590, 0.5), flowers(14, 5))


@scene('soupe', 'grand-mere-merci')
def _():
    return svg(sky(), ground(450), cottage(620, 470, 0.7, '#ffd9e6', '#8b5cf6', glow=True), at(adult('grandmere', 'laugh'), 280, 590, 0.65),
               at(lila('laugh'), 450, 590, 0.55), honey(380, 400, 0.7), salt(170, 420, 0.7), hearts(370, 260, 1.0), sparkles(380, 380, 0.6, seed=7, n=4))


@scene('soupe', 'fade')
def _():
    return svg(sky(), ground(450), pot(330, 560, 1.0, inside=('caillou',), steam=False), at(lila('sad'), 560, 590, 0.65),
               line(518, 548, 420, 455, 8), ellipse(410, 450, 22, 12, '#c9cdd6'), drops(330, 330, 0.6, 3, 2, '#c9e7ff'))


@scene('soupe', 'festin')
def _():
    villagers = [at(adult(k, 'laugh'), 140 + i * 175, 560, 0.42) for i, k in enumerate(['fermier', 'jardiniere', 'grandmere', 'maire'])]
    return svg(sky('warm'), bunting(50), ground(450), *villagers, at(lila('laugh'), 700, 560, 0.42), table_long(400, 590, 1.2),
               *[bowl(170 + i * 120, 510, 0.8) for i in range(5)], pot(400, 380, 0.5, inside=('carotte', 'patate'), steam=True), confetti(3, 25, 260))


@scene('soupe', 'crepes')
def _():
    return svg(sky('warm'), bunting(50, 4), ground(450), at(adult('grandmere', 'laugh'), 210, 560, 0.5), at(lila('laugh', 'up'), 590, 560, 0.5),
               table_long(400, 590, 1.0), crepes(400, 500, 1.1), honey(520, 500, 0.6), notes(250, 220, 1.0), hearts(560, 220, 1.0), confetti(9, 30, 300))


# ============================================================== Le Petit Poucet


@scene('poucet', 'couverture')
def _():
    return svg(sky('dawn'), tree(80, 520, 1.1, 'pine'), tree(720, 520, 1.0), tree(620, 470, 0.7, 'pine'), hills('#7cc95a', '#5fb04a', 420), path_road('#e2c08a'),
               pebbles([(470, 520), (450, 545), (430, 575), (500, 495), (520, 470)], 0.45), at(poucet('laugh'), 330, 585, 0.55),
               kids(2, 220, 560, -60, 0.5, 3, start_shirt=1), stone(360, 450, 0.6, '#ffffff'), sparkles(360, 430, 0.5, '#fff', 2, 4), frame('#22a559'))


@scene('poucet', 'maison')
def _():
    return svg(sky(), sun(680, 90, 40), tree(90, 470, 1.0, 'pine'), hills(), cottage(230, 460, 0.8, '#ffe2b8', '#8a5a3b'), at(adult('bucheron'), 420, 590, 0.55),
               kids(7, 500, 590, 42, 0.42, 1), flowers(15, 6))


@scene('poucet', 'poche')
def _():
    left = pebbles([(150, 330), (190, 320), (170, 300), (210, 345)], 0.8)
    return svg(sky(), hills(), tree(700, 470, 0.8), at(poucet('happy', 'up'), 400, 590, 0.75), circle(180, 320, 95, '#ffffff', True, 5, ' opacity=".9"'), left,
               circle(620, 320, 95, '#ffffff', True, 5, ' opacity=".9"'), bread(620, 350, 1.3),
               at(path('M0 0 q10 -20 0 -40 q-14 -16 -26 0', w=8) + circle(-2, 22, 6, INK, False), 400, 160, 1.3))


@scene('poucet', 'cailloux')
def _():
    return svg(sky(), tree(110, 520, 1.1), tree(700, 500, 1.0, 'pine'), hills('#7cc95a', '#5fb04a', 430), path_road('#e2c08a', 480),
               pebbles([(470, 590), (480, 560), (495, 530), (505, 505)], 0.45, '#ffffff'), at(poucet(), 600, 560, 0.5), stone(640, 440, 0.4, '#ffffff'),
               kids(3, 300, 540, -60, 0.42, 2, start_shirt=2), log_pile(300, 420, 0.4))


@scene('poucet', 'miettes')
def _():
    return svg(sky(), tree(110, 520, 1.1), tree(700, 500, 1.0, 'pine'), hills('#7cc95a', '#5fb04a', 430), path_road('#e2c08a', 480),
               crumbs([(470, 590), (485, 560), (495, 530), (505, 505)]), at(poucet(), 600, 560, 0.5), bread(650, 440, 0.5),
               at(bird('#5bb5f5'), 120, 300, 1.4), at(bird('#ffb84d'), 170, 330, 1.2, flip=True))


@scene('poucet', 'brouillard')
def _():
    return svg(sky('night'), stars(16, 4, 150), tree(100, 520, 1.2, 'pine'), tree(700, 520, 1.1), tree(400, 480, 0.8, 'pine'),
               hills('#3f7a4c', '#2f6440', 430), fog(220, 0.9), kids(4, 230, 580, 90, 0.45, 2, 'scared', 1), at(poucet('happy'), 600, 585, 0.5))


@scene('poucet', 'retour')
def _():
    return svg(sky('night'), stars(), moon(650, 90), hills('#3f7a4c', '#2f6440', 430), cottage(640, 440, 0.6, '#ffe2b8', '#8a5a3b', glow=True),
               pebbles([(180, 590), (240, 570), (300, 545), (360, 520), (420, 500), (480, 485), (540, 470)], 0.4, '#fff9d6'),
               *[circle(x, y - 6, 22, 'url(#glow)', False) for x, y in [(240, 570), (360, 520), (480, 485)]],
               at(poucet('laugh'), 300, 575, 0.45), kids(3, 220, 590, -55, 0.4, 3, 'happy', 2))


@scene('poucet', 'oiseaux')
def _():
    return svg(sky(), tree(110, 520, 1.1), tree(700, 500, 1.0, 'pine'), hills('#7cc95a', '#5fb04a', 430), path_road('#e2c08a', 480),
               at(bird('#5bb5f5'), 450, 580, 1.2), at(bird('#ffb84d'), 520, 540, 1.0, flip=True), at(bird('#e64aa0'), 480, 510, 0.9), crumbs([(500, 590), (470, 530)]),
               at(poucet('scared'), 650, 580, 0.5))


@scene('poucet', 'lumiere')
def _():
    t = tree(220, 600, 1.9)
    return svg(sky('night'), stars(30, 5), moon(120, 80, 34), hills('#3f7a4c', '#2f6440', 450), window_light(650, 430, 1.2),
               cottage(650, 470, 0.45, '#9a8f8a', '#4b3b52', glow=True), t, at(poucet('happy', 'up'), 230, 330, 0.4))


@scene('poucet', 'ogre-maison')
def _():
    hidden = ''.join(ellipse(x, 548, 16, 10, '#fff', True, 2) + circle(x + 3, 549, 5, INK, False) + ellipse(x + 30, 548, 16, 10, '#fff', True, 2) + circle(x + 33, 549, 5, INK, False)
                     for x in (110, 210))
    return svg(interior('#c9b08a', '#8a6a4a', night=True), rect(60, 530, 330, 30, '#2a1f29', 0, False), hidden, bed(220, 560, 1.0), table_cloth(580, 560, 1.0),
               at(ogre('angry'), 760, 600, 0.45), boots(600, 600, 0.5))


@scene('poucet', 'ogre')
def _():
    return svg(interior('#c9b08a', '#8a6a4a'), at(ogre('angry', 'arms_up'), 250, 590, 0.75), *[potato(450 + i * 60, 590 - (i % 2) * 20, 0.8) for i in range(5)],
               kids(3, 480, 580, 90, 0.38, 2, 'sad', 3))


@scene('poucet', 'ogre-dort')
def _():
    return svg(interior('#c9b08a', '#8a6a4a', night=True), at(ogre(pose='sleep'), 300, 590, 0.75), at(poucet('happy'), 600, 590, 0.5), sparkles(330, 540, 0.6, seed=4, n=4))


@scene('poucet', 'aube')
def _():
    return svg(sky('dawn'), sun(650, 200, 50), hills('#8fd16a', '#6fbf5a', 420), cottage(650, 440, 0.6, '#ffe2b8', '#8a5a3b', glow=True), path_road(),
               kids(4, 160, 580, 70, 0.42, 1, 'laugh', 2), at(poucet('laugh'), 460, 580, 0.42), motion(150, 500, 0.8))


@scene('poucet', 'bottes')
def _():
    return svg(interior('#c9b08a', '#8a6a4a', night=True), at(poucet('laugh', 'up'), 400, 520, 0.75), boots(400, 590, 0.8, True), sparkles(400, 300, 1.4, seed=6, n=9))


@scene('poucet', 'messager')
def _():
    return svg(sky(), sun(), cloud(160, 90), cloud(520, 130, 0.8), hills(), cottage(680, 470, 0.5, '#ffe2b8', '#8a5a3b'),
               at(poucet('laugh', 'up') + boots(0, 0, 0.6, True), 330, 350, 0.65, rot=-12), motion(240, 300, 1.4), sparkles(330, 380, 0.8, seed=11),
               at(ogre('happy'), 120, 590, 0.35), basket(200, 590, 0.6))


# ============================================================== Le petit berger et le loup


def flock(seed=1, n=4, y=560, xs=(200, 700), s=0.6, mood='happy'):
    r = random.Random(seed)
    return ''.join(at(sheep(mood), r.uniform(*xs), y + r.uniform(-30, 20), s * r.uniform(0.85, 1.05), flip=r.random() < 0.4) for _ in range(n))


def far_village():
    return cottage(640, 330, 0.3) + cottage(700, 340, 0.28, '#d8ecff', '#4b8fb8') + cottage(750, 330, 0.3, '#ffd9e6', '#8b5cf6')


@scene('berger', 'couverture')
def _():
    return svg(sky(), sun(110, 100), cloud(560, 90), hills(), tree(740, 470, 1.0, 'pine'), at(wolf('sly'), 700, 470, 0.4, flip=True), bush(690, 480, 1),
               at(leo('laugh'), 330, 590, 0.65), at(dog(), 470, 590, 0.6), flock(2, 3, 560, (120, 260), 0.6), frame('#3b7ff5'))


@scene('berger', 'colline')
def _():
    return svg(sky(), sun(110, 90), cloud(400, 80), far_village(), hills(), at(leo(), 300, 580, 0.6), at(dog(), 430, 590, 0.55), flock(3, 4, 560, (520, 760)), flowers(16))


@scene('berger', 'ennui')
def _():
    return svg(sky('warm'), sun(650, 110, 60), hills('#a4d77a', '#86c463'), at(leo('sleepy'), 330, 580, 0.6), sweat(360, 400, 1.0), flock(4, 4, 560, (450, 760)), zzz(380, 360, 0.6))


@scene('berger', 'flute')
def _():
    return svg(sky(), sun(110, 90), hills(), at(leo('happy', 'mouth', None), 300, 580, 0.6), flute_obj(355, 482, 0.5, -30), notes(380, 360, 1.0),
               *[at(sheep('laugh'), 500 + i * 100, 560 + (i % 2) * 15, 0.6, rot=(-12 if i % 2 else 12)) for i in range(3)], flowers(17))


@scene('berger', 'cri')
def _():
    return svg(sky(), far_village(), hills(), at(leo('laugh', 'mouth', None), 230, 580, 0.65), wind(330, 380, 0.4, 2),
               *[at(adult(k, 'scared'), 520 + i * 90, 520 + i * 10, 0.33) for i, k in enumerate(['fermier', 'villageois', 'jardiniere'])], motion(500, 440, 0.6), flock(5, 2, 580, (380, 480), 0.5))


@scene('berger', 'villageois')
def _():
    return svg(sky(), hills(), at(leo('scared'), 200, 580, 0.6), *[at(adult(k, 'angry'), 420 + i * 120, 590, 0.5) for i, k in enumerate(['maire', 'fermier', 'jardiniere'])])


@scene('berger', 'pardon')
def _():
    return svg(sky(), sun(680, 90, 40), hills(), at(leo('sad'), 280, 580, 0.6), at(adult('maire', 'happy'), 500, 590, 0.55), hearts(390, 300, 1.1), flock(6, 2, 580, (620, 760), 0.5))


@scene('berger', 'moutons')
def _():
    return svg(sky('warm'), hills('#a4d77a', '#86c463'), at(leo('happy'), 130, 590, 0.55), flock(7, 7, 520, (260, 760), 0.5), flock(8, 4, 590, (300, 760), 0.6))


@scene('berger', 'vrai-loup')
def _():
    return svg(sky('warm'), hills('#a4d77a', '#86c463'), tree(740, 480, 1.0, 'pine'), at(wolf('angry'), 620, 570, 0.75, flip=True),
               flock(9, 3, 580, (260, 420), 0.55, 'scared'), at(leo('scared', 'up'), 120, 590, 0.55))


@scene('berger', 'sauve')
def _():
    return svg(sky(), hills(), at(wolf('scared', 'run'), 680, 520, 0.5), motion(640, 450, 0.8), *[at(adult(k, 'angry'), 360 + i * 90, 590, 0.42) for i, k in enumerate(['fermier', 'villageois', 'maire'])],
               at(leo('laugh', 'up'), 150, 590, 0.55), flock(10, 2, 590, (220, 300), 0.45))


@scene('berger', 'cloche')
def _():
    return svg(sky(), sun(), bunting(40), hills(), at(leo('laugh'), 280, 590, 0.6), at(adult('maire', 'laugh'), 520, 590, 0.55), bell(400, 300, 0.9),
               sparkles(400, 280, 1.3, seed=12, n=8), confetti(5, 20, 250))


@scene('berger', 'pataud')
def _():
    return svg(sky('warm'), hills('#a4d77a', '#86c463'), at(dog('happy', 'bark'), 360, 590, 0.75), at(wolf('scared', 'run'), 680, 530, 0.5), motion(640, 460, 0.8),
               at(leo('scared'), 150, 590, 0.55), flock(11, 2, 590, (220, 280), 0.45))


# ============================================================== Le Lièvre et la Tortue


def oak(x=650, y=520, s=1.3):
    return tree(x, y, s, 'round', '#3f9a52')


def carrot_field(y=520):
    return ''.join(at(path('M0 0 q-10 -30 -4 -44 M0 0 q0 -34 4 -46 M0 0 q10 -28 12 -40', '#4fae5b', True, 5) + ellipse(0, 4, 12, 6, '#ff9f43', True, 3),
                      80 + (i % 9) * 80 + (i // 9) * 40, y + (i // 9) * 45) for i in range(18))


@scene('lievre', 'couverture')
def _():
    return svg(sky(), sun(110, 90), cloud(420, 80), hills(), oak(660, 470, 1.1), ribbon(520, 560, 0.6), at(hare('laugh', 'cheer'), 270, 580, 0.75),
               at(tortoise('happy'), 460, 585, 0.7), flowers(20), frame('#14b0a6'))


@scene('lievre', 'pari')
def _():
    return svg(sky(), sun(110, 90), hills(), oak(700, 450, 0.7), at(hare('laugh'), 270, 580, 0.8), at(tortoise('happy'), 480, 585, 0.75, flip=True), flowers(21))


@scene('lievre', 'depart')
def _():
    return svg(sky(), hills(), path_road(), oak(720, 430, 0.5), at(hare('happy', 'run'), 600, 470, 0.7), motion(500, 420, 1.0), at(tortoise('happy'), 180, 585, 0.6),
               line(80, 600, 300, 520, 8, '#ffffff'), flowers(22, 6))


@scene('lievre', 'carottes')
def _():
    return svg(sky(), sun(680, 90, 40), hills(), carrot_field(470), at(hare('laugh'), 330, 590, 0.7), hearts(400, 300, 0.8, 2))


@scene('lievre', 'croque')
def _():
    return svg(sky(), hills(), carrot_field(470), at(hare('laugh', 'cheer'), 330, 590, 0.7), at(carrot(0, 0), 420, 420, 0.6, rot=-70),
               *[circle(430 + i * 14, 470 + (i % 2) * 10, 5, '#ff9f43', True, 2) for i in range(4)], at(tortoise(), 680, 590, 0.4))


@scene('lievre', 'papillon')
def _():
    return svg(sky(), sun(110, 90), hills(), at(hare('laugh', 'cheer'), 330, 560, 0.75, rot=-8), at(butterfly('#3b7ff5'), 520, 300, 1.6), at(butterfly('#e64aa0'), 620, 380, 1.0), flowers(23))


@scene('lievre', 'coincee')
def _():
    return svg(sky(), hills(), hole(300, 560, 1.2), at(tortoise('scared', 'back'), 300, 560, 0.6), sweat(380, 470, 1.0), at(hare('scared'), 620, 590, 0.65, flip=True))


@scene('lievre', 'aide')
def _():
    return svg(sky(), sun(), hills(), hole(260, 580, 0.9), at(tortoise('laugh'), 420, 590, 0.65), at(hare('laugh', 'cheer'), 620, 590, 0.65, flip=True), hearts(520, 300, 1.2))


@scene('lievre', 'arbre')
def _():
    return svg(sky('warm'), sun(680, 90, 55), hills('#a4d77a', '#86c463'), tree(300, 560, 1.4), at(hare('sleepy'), 520, 590, 0.75), sweat(560, 420, 1.0))


@scene('lievre', 'dodo')
def _():
    return svg(sky('warm'), hills('#a4d77a', '#86c463'), tree(220, 560, 1.4), at(hare('sleepy', 'sleep'), 330, 590, 0.75), at(tortoise('happy'), 640, 560, 0.45), motion(580, 520, 0.5))


@scene('lievre', 'chene')
def _():
    return svg(sky(), hills(), oak(620, 480, 1.0), ribbon(430, 570, 0.7), at(hare('happy', 'run'), 260, 500, 0.7), motion(170, 450, 1.0))


@scene('lievre', 'ensemble')
def _():
    return svg(sky(), sun(110, 90), hills(), oak(680, 460, 0.9), ribbon(220, 580, 0.9), at(hare('laugh', 'cheer'), 320, 590, 0.7), at(tortoise('laugh'), 470, 595, 0.65),
               confetti(7, 40), at(sheep('laugh'), 650, 590, 0.4), at(bird(), 720, 420, 1.0))


@scene('lievre', 'lievre-gagne')
def _():
    return svg(sky(), hills(), oak(560, 470, 1.0), ribbon(380, 580, 0.6), at(hare('laugh', 'cheer'), 520, 590, 0.7), at(tortoise('happy'), 150, 590, 0.5), confetti(8, 25, 300))


@scene('lievre', 'tortue-gagne')
def _():
    return svg(sky(), hills(), oak(560, 470, 1.0), ribbon(380, 580, 0.6), at(tortoise('laugh'), 540, 590, 0.65), at(hare('scared', 'run'), 170, 520, 0.6), motion(90, 470, 0.7),
               sparkles(540, 450, 0.8, seed=13, n=5))


@scene('lievre', 'bravo')
def _():
    return svg(sky(), sun(), hills(), oak(680, 450, 0.8), at(hare('happy'), 330, 590, 0.7), at(tortoise('laugh'), 520, 595, 0.65, flip=True), hearts(430, 300, 1.2), flowers(24))


def main():
    import scenes_exemples  # noqa: F401  (enregistre les illustrations des exemples d'initiation)
    only = sys.argv[1:]
    for (story, name), fn in SCENES.items():
        if only and story not in only:
            continue
        d = os.path.join(ROOT, story, 'img')
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, name + '.svg'), 'w', encoding='utf8').write(fn())
    print(len(SCENES), 'illustrations')


if __name__ == '__main__':
    sys.modules.setdefault('scenes', sys.modules['__main__'])
    main()
