"""Illustrations des trois exemples d'initiation (Ma première histoire, Le château mystérieux, La forêt enchantée). CC0."""
from kit import *  # noqa: F401,F403
from scenes import confetti, scene


def kid(mood='happy', arms='down'):
    return child(hair='#6b4226', shirt='#8bd3ff', pants='#5b7fc0', mood=mood, arms=arms)


def question(x, y, s=1.0):
    return at(path('M0 0 q10 -20 0 -40 q-14 -16 -26 0', w=8) + circle(-2, 22, 6, INK, False), x, y, s)


@scene('premiere', 'couverture')
def _():
    return svg(sky(), sun(), cloud(170, 100), hills(), tree(640, 470, 0.9), chest(560, 560, 0.8), at(kid('laugh'), 280, 590, 0.65),
               at(cat(), 420, 590, 0.9), flowers(30), frame('#8b5cf6'))


@scene('premiere', 'reveil')
def _():
    return svg(interior('#dfe8ff', '#c99566'), bed(250, 560, 1.0), at(kid('sleepy'), 200, 500, 0.45, rot=-75), at(cat(), 640, 220, 0.8))


@scene('premiere', 'choix')
def _():
    return svg(interior('#dfe8ff', '#c99566'), bed(220, 560, 1.0), at(kid('happy'), 400, 590, 0.6), at(cat('happy'), 600, 590, 0.9), question(400, 180, 1.2))


@scene('premiere', 'tresor')
def _():
    return svg(sky(), sun(), hills(), tree(200, 520, 1.3), chest(420, 570, 1.1), marbles(420, 520, 1.2), at(kid('laugh', 'up'), 620, 590, 0.6),
               at(cat('happy'), 140, 590, 0.8), confetti(12, 20, 260))


@scene('premiere', 'dodo')
def _():
    return svg(interior('#c6d0f0', '#a07a58', night=True), bed(330, 560, 1.1), at(kid('sleepy'), 280, 500, 0.5, rot=-75), zzz(400, 380, 1.0),
               at(cat('happy'), 640, 230, 0.6))


@scene('chateau', 'couverture')
def _():
    return svg(sky(), sun(110, 90), cloud(600, 90), hills(), castle(420, 480, 0.9), at(kid('laugh'), 180, 590, 0.6), key(620, 520, 0.8, -20), frame('#5b5bd6'))


@scene('chateau', 'chateau')
def _():
    return svg(sky(), cloud(150, 100), cloud(620, 70, 0.8), hills(), castle(420, 480, 1.0), at(kid('scared'), 650, 590, 0.55), flowers(31))


@scene('chateau', 'carrefour')
def _():
    sign = rect(-6, -160, 12, 160, '#8a5a3b', 4) + at(rect(-70, -20, 140, 40, '#e8c38f', 6), -60, -130, rot=-8) + at(rect(-70, -20, 140, 40, '#e8c38f', 6), 60, -90, rot=8)
    return svg(sky(), hills(), castle(650, 360, 0.4), tree(110, 470, 0.9, 'pine'), cottage(150, 360, 0.3), path_road(), at(sign, 400, 520, 1.0), at(kid(), 560, 590, 0.55))


@scene('chateau', 'porte-fermee')
def _():
    return svg(sky(), castle(400, 650, 1.6), at(kid('sad'), 640, 590, 0.6), sweat(670, 410, 1.2))


@scene('chateau', 'foret')
def _():
    return svg(sky(), tree(120, 520, 1.2), tree(330, 490, 1.0, 'pine'), tree(700, 520, 1.2), hills('#7cc95a', '#5fb04a', 450), at(kid('happy'), 500, 590, 0.6),
               key(330, 560, 0.4), sparkles(330, 545, 0.6, '#fff6c9', 4, 5, 50))


@scene('chateau', 'cle')
def _():
    return svg(sky(), tree(120, 520, 1.2), tree(700, 520, 1.2), hills('#7cc95a', '#5fb04a', 450), at(kid('laugh', 'up'), 400, 590, 0.65), key(400, 230, 1.4, -15))


def tapestry(x, c):
    return rect(x, 80, 110, 200, c, 6) + path(f'M{x} 280 l18 24 l18 -24 l18 24 l18 -24 l18 24 l20 -24', c, True, 3) + circle(x + 55, 170, 30, '#ffd84d', True, 4)


@scene('chateau', 'grande-salle')
def _():
    return svg(interior('#d8d2e6', '#9a8f8a', window=False), tapestry(100, '#e5484d'), tapestry(590, '#3b7ff5'), rect(330, 260, 140, 180, '#2a1f29', 70),
               at(kid('laugh'), 400, 590, 0.6), key(520, 450, 0.5))


@scene('chateau', 'escaliers')
def _():
    up = ''.join(rect(80 + i * 30, 440 - i * 40, 160, 40, '#c9c3d6', 4) for i in range(8))
    down = ''.join(rect(560 - i * 20, 440 + i * 18, 160, 18, '#9a8f8a', 3) for i in range(6))
    return svg(interior('#d8d2e6', '#9a8f8a', window=False), up, rect(540, 440, 220, 160, '#2a1f29', 0), down, at(kid(), 420, 590, 0.55))


@scene('chateau', 'tresor')
def _():
    return svg(interior('#e8dcc8', '#b08a5a'), chest(400, 560, 1.4), at(kid('laugh', 'up'), 640, 590, 0.6), sparkles(400, 300, 1.5, seed=14, n=9), confetti(14, 20, 220))


@scene('chateau', 'bibliotheque')
def _():
    return svg(interior('#2f2a4a', '#5c4a6a', window=False), books(400, 420, 1.0), at(kid('laugh', 'up'), 400, 590, 0.55),
               sparkles(400, 150, 1.8, '#fff6c9', 15, 12, 140), fireflies(4, 8, (100, 60, 700, 300)))


@scene('chateau', 'village')
def _():
    return svg(sky('warm'), hills('#a4d77a', '#86c463'), castle(680, 330, 0.35), cottage(220, 480, 0.8, glow=True), path_road(), at(kid('sad'), 450, 590, 0.6))


@scene('foret', 'couverture')
def _():
    return svg(sky('night'), stars(), giant_tree(400, 560, 0.9), fireflies(2, 18), at(kid('laugh'), 180, 590, 0.55), at(owl(), 640, 590, 0.9), frame('#2f9e6e'))


@scene('foret', 'oree')
def _():
    return svg(sky(), sun(680, 90, 40), tree(100, 520, 1.3), tree(250, 470, 1.0, 'pine'), tree(560, 470, 1.0, 'pine'), tree(720, 520, 1.3),
               hills('#7cc95a', '#5fb04a', 450), path_road(), at(bird('#ffb84d'), 140, 330, 1.2), at(bird('#5bb5f5'), 690, 320, 1.1, flip=True), at(kid('happy'), 430, 590, 0.6))


@scene('foret', 'chemin')
def _():
    fork = path('M380 600 Q390 520 400 480 L330 380 L360 380 L410 460 L460 380 L490 380 L420 480 Q430 520 440 600 Z', '#e8c38f', True, 4)
    return svg(sky('dawn'), tree(100, 520, 1.2), tree(720, 520, 1.2), hills('#7cc95a', '#5fb04a', 430), fork, fireflies(5, 6, (160, 300, 360, 420)),
               at(owl(), 600, 400, 0.6), at(kid('happy'), 410, 590, 0.5))


@scene('foret', 'lucioles')
def _():
    return svg(sky('night'), stars(), tree(110, 520, 1.3, 'pine'), tree(700, 520, 1.3), hills('#3f7a4c', '#2f6440', 450), fireflies(6, 22), at(kid('laugh', 'up'), 400, 590, 0.6))


def mushroom(x, y, s=1.0):
    return at(path('M-60 0 Q-70 -60 0 -70 Q70 -60 60 0 Z', '#e5484d') + ''.join(circle(dx, -40, 8, '#fff', False) for dx in (-30, 0, 30))
              + rect(-16, 0, 32, 50, '#f2e6d0', 6), x, y, s)


@scene('foret', 'fee')
def _():
    return svg(sky('night'), stars(20, 6), hills('#3f7a4c', '#2f6440', 450), mushroom(300, 520), fairy(300, 430, 0.8), potion(420, 540, 0.8),
               at(kid('happy'), 560, 590, 0.6), fireflies(7, 10))


@scene('foret', 'animaux')
def _():
    return svg(sky(), sun(), tree(120, 520, 1.2), hills(), at(kid('laugh'), 380, 590, 0.6), at(squirrel(), 520, 590, 0.9), at(bird('#ffb84d'), 300, 360, 1.3),
               at(hare('happy'), 640, 590, 0.55), hearts(450, 300, 1.0))


@scene('foret', 'maison')
def _():
    return svg(sky('warm'), hills('#a4d77a', '#86c463'), cottage(560, 470, 0.9, glow=True), path_road(), at(kid('happy'), 330, 590, 0.6), tree(110, 520, 1.0, 'pine'))


@scene('foret', 'hibou')
def _():
    branch = path('M200 330 Q400 300 620 340', w=18, extra=' stroke="#8a5a3b"')
    return svg(sky('night'), stars(), moon(650, 90), tree(120, 560, 1.3, 'pine'), branch, at(owl(), 420, 320, 1.2), hills('#3f7a4c', '#2f6440', 520),
               at(kid('happy'), 520, 590, 0.55))


@scene('foret', 'secret')
def _():
    return svg(sky('night'), stars(30, 8), giant_tree(400, 580, 1.0), at(kid('laugh', 'up'), 650, 590, 0.5), sparkles(400, 200, 1.6, '#fff6c9', 16, 10, 160))
