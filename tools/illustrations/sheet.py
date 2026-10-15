"""Planche de contrôle du kit (aperçu de tous les éléments)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from kit import *

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
def save(name, *parts):
    open(os.path.join(out, name + '.svg'), 'w', encoding='utf8').write(svg(*parts))

save('a-cochons', sky(), sun(), cloud(150, 100), hills(), at(pig('happy', '#3b7ff5'), 180, 520, 0.9), at(pig('scared'), 420, 520, 0.9), at(pig('laugh', None, 'chapeau'), 640, 520, 0.9))
save('b-loup', sky('warm'), hills(), at(wolf('sly'), 160, 540, 0.9), at(wolf(pose='blow'), 500, 540, 0.9), wind(650, 360, 0.5))
save('c-enfants', sky(), ground(), at(child(), 120, 560, 0.8), at(child(hair_style='couettes', shirt='#e64aa0', hat='bandana', girl=True, prop='backpack'), 290, 560, 0.8),
     at(child(hat='beret', shirt='#22a559', prop='staff', arms='mouth', mood='laugh'), 460, 560, 0.8), at(child(hair_style='boucles', shirt='#f28a1c', hat='bonnet', mood='scared', arms='up'), 650, 560, 0.6))
save('d-adultes', sky(), ground(), *[at(adult(k), 90 + i * 155, 580, 0.7) for i, k in enumerate(['fermier', 'jardiniere', 'grandmere', 'maire', 'boulangere'])])
save('e-ogre', interior(night=True), at(ogre(), 220, 580, 0.9), at(ogre(pose='sleep'), 560, 580, 0.8))
save('f-animaux', sky(), hills(), at(tortoise(), 130, 520, 0.8), at(hare(), 330, 520, 0.8), at(hare(pose='run'), 520, 420, 0.7), at(sheep(), 680, 520, 0.9), at(dog(pose='bark'), 150, 590, 0.7), at(bird(), 400, 580, 1.2), at(butterfly(), 560, 560, 1.2))
save('g-maisons', sky(), hills(), house_straw(130, 520, 0.6), house_wood(390, 520, 0.6), house_brick(650, 520, 0.6))
save('h-objets', interior(), pot(130, 300, 0.8, inside=('caillou', 'carotte', 'patate')), honey(300, 280), crepes(430, 280, 0.8), bowl(560, 280), bell(680, 280, 0.8),
     boots(130, 560, 0.8, True), carrot(300, 560), leek(380, 560, 0.6), potato(460, 560), salt(540, 560), fireplace(680, 560, 0.6))
save('i-nuit', sky('night'), stars(), moon(), tree(120, 560, 1.1, 'pine'), tree(300, 560, 0.9), fog(250), window_light(600, 420))
save('j-village', sky(), ground(470), cottage(150, 500, 0.9, shutters='closed'), cottage(400, 490, 0.9, '#d8ecff', '#4b8fb8'), cottage(650, 500, 0.9, '#ffd9e6', '#8b5cf6', glow=True))
