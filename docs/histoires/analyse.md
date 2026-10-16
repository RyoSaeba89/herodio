# Les histoires fournies : étude et adaptation

*[English version](analyse.en.md)*

Cinq contes et fables du patrimoine ont été **étudiés, décortiqués puis réécrits** en histoires interactives pour les 6-8 ans (CP-CE2). Les textes d'origine sont du domaine public. Les adaptations, les sons et les illustrations sont des créations originales placées sous licence CC0.

## 1. Ce que dit la recherche, et ce qu'on en tire

| Source | Constat | Règle de conception retenue |
|---|---|---|
| [Liste de référence Eduscol cycle 2 (2018)](https://eduscol.education.gouv.fr/6825/lectures-l-ecole-des-listes-de-reference) | Au CP-CE2, le patrimoine accessible (niveau 1) comprend *Les trois petits cochons* (J. Jacobs), *La soupe au caillou*, *Le Petit Poucet* (Perrault), *Le Chat botté* et *Le garçon qui criait au loup*. Les fables de La Fontaine (dont *Le Lièvre et la Tortue*) sont au niveau 3. | Choisir des contes déjà travaillés en classe : l'enfant connaît l'histoire et peut **jouer avec**. |
| [Contes en randonnée (Storyplayr)](https://www.storyplayr.com/blog/le-conte-randonnee), [Alcuin](https://alcuinfonds.be/blog/album-randonnee-maternelle/) | Une formule répétée et des rencontres qui s'accumulent facilitent la compréhension et la mémorisation. | Reprendre les **formulettes** (« Petit cochon, petit cochon… ») et les **structures d'accumulation** (la soupe). |
| [Lee et al., *Psychological Science*, 2014](https://journals.sagepub.com/doi/full/10.1177/0956797614536401) | Chez les 3-7 ans, *Le garçon qui criait au loup* et *Pinocchio* (le mensonge puni) **ne réduisent pas** le mensonge. Une histoire où **l'honnêteté est récompensée** triple les aveux. | Mettre en avant les **conséquences positives** des bons choix : réparer, avouer, aider. Les « mauvais » choix mènent à une fin douce et à une nouvelle chance, jamais à une punition humiliante. |
| Conseils de conception des récits à embranchements ([guide Adobe](https://elearning.adobe.com/2025/04/bring-stories-to-life-designing-choose-your-own-adventure-activities-with-adobe-captivate), [analyse du genre « livre-jeu »](https://bahai-library.org/pdf/m/moyo_interactive_stories.pdf)) | 2 à 3 décisions clés de 2 à 3 options ; les fins prématurées doivent proposer de revenir en arrière. | **2 réponses par choix** (3 au plus), **4 à 6 choix par partie**, toujours une boucle « réessayer » plutôt qu'une impasse. |

**Règles d'écriture pour les 6-8 ans**

- **Scènes courtes** : 2 à 4 phrases, soit 15 à 25 secondes d'écoute.
- **Phrases simples**, au présent, avec un vocabulaire du quotidien. Un mot rare (« fagot », « marmite ») est toujours éclairé par le contexte.
- **Réponses formulées comme une action**, avec un verbe : « Construire avec des briques ». L'enfant sait ce qu'il fait.
- **Peur dosée** : le loup ou l'ogre font un peu peur, mais personne n'est mangé ni blessé. Les méchants sont ridiculisés, puis s'enfuient ou deviennent gentils.
- **Au moins trois fins** : une heureuse, une « à retenter » (douce), une **secrète** qui récompense la curiosité.
- **Partie complète en 3 à 7 minutes**, ce qui correspond à l'attention d'un enfant de cet âge.
- **Narration par la voix automatique** (Piper : Siwis en français, LJ Speech en anglais). Enfants et enseignants peuvent la remplacer par leurs propres enregistrements dans l'éditeur.

**Lien avec les notions STEM (cycle 2)**

Chaque histoire illustre une notion d'algorithmique, visible dans le graphe de blocs :

| Histoire | Notion | Blocs |
|---|---|---|
| Les trois petits cochons | **boucle** (répéter une action) et **condition** | Compteur, Retour, Condition |
| La soupe au caillou | **inventaire** et **accumulation** | Objet, Compteur, « déjà passé par » |
| Le Petit Poucet | **objet nécessaire** pour franchir une étape | Objet, Condition |
| Le petit berger et le loup | **variable** (la confiance) qui monte et qui descend | Compteur, Condition |
| Le Lièvre et la Tortue | **compteur** et **recommencer à zéro** | Compteur, Retour avec remise à zéro |

---

## 2. Les trois petits cochons

**Origine** : conte populaire anglais, fixé par Joseph Jacobs (*English Fairy Tales*, 1890). Domaine public.

**Structure d'origine (schéma quinaire)**

| Étape | Dans Jacobs |
|---|---|
| Situation initiale | Une vieille truie, trop pauvre, envoie ses trois petits chercher fortune. |
| Élément déclencheur | Chacun construit une maison : paille, ajoncs, briques. |
| Péripéties | **Formulette répétée trois fois** : « Little pig, little pig, let me come in. — No, no, by the hair of my chiny chin chin. — Then I'll huff, and I'll puff… ». Le loup souffle les deux premières maisons et **mange** les cochons. Il tente ensuite trois ruses (navets, pommes, foire), toutes déjouées. |
| Dénouement | Le loup descend par la cheminée et tombe dans la marmite. |
| Situation finale | Il est cuit et mangé ; le cochon vit heureux. |

**Ce qu'on adapte**

- Les cochons ne sont pas mangés : ils **s'enfuient** chez leur frère, comme dans de nombreuses versions pour enfants.
- La marmite bouillante devient une **grande bassine d'eau glacée** : le loup s'enfuit en hurlant « Brrr ! » et ne revient jamais.
- Les ruses des navets et des pommes sont retirées, pour garder une partie courte.

**Conception interactive**

L'enfant **est le troisième petit cochon**.

1. Il choisit son matériau (paille, bois ou briques).
2. La paille et le bois sont rapides, mais le loup souffle la maison. On revient alors au choix, avec un compteur d'essais.
3. Les briques demandent de **répéter « poser une rangée de briques »** jusqu'à ce que le mur soit assez haut (compteur et boucle : 3 rangées).
4. Le loup arrive. Une condition vérifie si la maison est en briques.
5. Dernier choix pour la cheminée : allumer un feu (le loup se brûle le derrière et s'enfuit : fin heureuse) ou préparer une bassine d'eau glacée (fin heureuse et drôle).
6. **Fin secrète** : si l'enfant a d'abord **invité ses deux frères** (un choix au début), toute la famille chante ensemble dans la maison de briques.

**Notion** : une **boucle** (répéter jusqu'à ce que ce soit fini) et une **condition** (la maison est-elle solide ?).

---

## 3. La soupe au caillou

**Origine** : conte populaire européen (classification ATU 1548), avec des variantes où le caillou est un clou ou une hache. Première version écrite connue : Johann Peter Hebel, 1811. Domaine public ([Wikipédia](https://en.wikipedia.org/wiki/Stone_Soup)).

**Structure d'origine**

| Étape | Déroulement type |
|---|---|
| Situation initiale | Des voyageurs affamés arrivent dans un village méfiant qui cache ses provisions. |
| Élément déclencheur | Ils annoncent qu'ils vont cuisiner une « soupe au caillou » et posent une pierre dans une marmite d'eau. |
| Péripéties | **Accumulation** : chaque villageois curieux ajoute « juste un petit quelque chose » (carottes, chou, pommes de terre, oignons…). |
| Dénouement | La soupe est délicieuse ; on retire le caillou. |
| Situation finale | Tout le village partage le repas. |

La morale est **ambivalente** : partage et convivialité, mais aussi ruse aux dépens de villageois crédules.

**Ce qu'on adapte**

- La ruse devient un **jeu de partage assumé** : à la fin, la voyageuse avoue en riant que le caillou ne donne aucun goût, ce sont les amis qui en donnent. On garde la morale positive (coopération) et on retire la tromperie.
- Personnage : **Lila, une petite voyageuse**, et son caillou porte-bonheur.

**Conception interactive**

C'est un conte en randonnée.

1. Sur la place du village, l'enfant choisit **à quelle porte frapper** (boulangère, fermier, jardinière, grand-mère).
2. Chaque rencontre **donne un objet** (carottes, pommes de terre, poireau, sel) et ajoute 1 au compteur d'ingrédients.
3. Une porte déjà visitée répond gentiment « Je t'ai déjà donné ! » (condition « déjà passé par »).
4. À tout moment, l'enfant peut « Goûter la soupe ».
   - Avec moins de 3 ingrédients, elle est « fade » : on retourne au village (boucle).
   - Avec 3 ingrédients ou plus : **fin heureuse** (le festin).
   - Si l'enfant a aussi rendu un service à la grand-mère (porter son panier), elle apporte un dessert : **fin secrète**.

**Notion** : un **inventaire** (on collecte des objets), un **compteur** et une **condition de seuil**.

---

## 4. Le Petit Poucet

**Origine** : Charles Perrault, *Histoires ou contes du temps passé* (1697). Domaine public.

**Structure d'origine**

| Étape | Chez Perrault |
|---|---|
| Situation initiale | Un bûcheron très pauvre et ses sept fils ; le plus petit, Poucet, est le plus malin. |
| Élément déclencheur | Pendant la famine, les parents décident de **perdre leurs enfants** dans la forêt. |
| Péripéties | (1) Poucet sème des **cailloux blancs** et ramène ses frères. (2) La deuxième fois, il n'a que du **pain** : les oiseaux le mangent, les enfants sont perdus. (3) Refuge chez **l'ogre** ; sa femme les cache. (4) Poucet échange les bonnets de ses frères avec les couronnes des filles de l'ogre, qui **égorge ses propres filles**. (5) Fuite ; l'ogre les poursuit avec ses **bottes de sept lieues**, puis s'endort. Poucet lui prend les bottes. |
| Dénouement | Grâce aux bottes, Poucet rapporte des richesses (ou devient messager du roi). |
| Situation finale | La famille est à l'abri du besoin. |

Moralités : on ne méprise pas l'enfant chétif, qui fait souvent le bonheur de la famille.

**Ce qu'on adapte (éléments trop violents pour 6-8 ans)**

- **Pas d'abandon** : les enfants partent ramasser du bois et se perdent parce qu'un brouillard tombe. Poucet, prévoyant, a pris des cailloux… s'il y a pensé.
- **Pas de meurtre** : l'ogre devient un **ogre gourmand et grognon** qui veut garder les enfants pour éplucher ses légumes. Ils s'échappent pendant sa sieste.
- Les bottes de sept lieues restent l'objet magique : elles ramènent la fratrie à la maison en trois enjambées.

**Conception interactive**

1. Au départ, l'enfant choisit ce que Poucet met dans sa poche : des **cailloux blancs** ou un **morceau de pain** (objet).
2. Dans le brouillard :
   - **avec les cailloux**, on retrouve le chemin : **fin heureuse rapide** ;
   - **avec le pain**, les oiseaux l'ont mangé : on est perdu. On grimpe à un arbre, on voit une lumière, on arrive chez l'ogre.
3. Chez l'ogre, choix : se cacher sous le lit ou sous la table.
4. Pendant la sieste de l'ogre, choix : s'enfuir tout de suite (fin « ouf ! », on rentre en courant), ou **prendre les bottes de sept lieues** (objet) puis s'enfuir.
5. Avec les bottes : **fin secrète**. Poucet devient le messager le plus rapide du royaume, et il rend les bottes à l'ogre… qui devient gentil.

**Notion** : un **objet nécessaire** (une condition sur l'inventaire), et deux chemins qui mènent au même but.

---

## 5. Le petit berger et le loup (*Le garçon qui criait au loup*)

**Origine** : Ésope (Perry 210), repris par de nombreux fabulistes. Domaine public.

**Structure d'origine**

| Étape | Chez Ésope |
|---|---|
| Situation initiale | Un jeune berger s'ennuie en gardant ses moutons près du village. |
| Élément déclencheur | Pour s'amuser, il crie « Au loup ! ». |
| Péripéties | Les villageois accourent, il rit. Il recommence. |
| Dénouement | Un vrai loup arrive : plus personne ne le croit. |
| Situation finale | Le loup dévore le troupeau (et, dans certaines versions anglaises, le garçon). |

Morale : « On ne croit plus le menteur, même quand il dit la vérité. »

**Ce qu'on adapte, d'après Lee et al. (2014)**

- On **récompense l'honnêteté** au lieu de punir le mensonge. Après un faux cri, l'enfant peut choisir d'**avouer et de s'excuser**, ce qui fait **remonter la confiance**. Le village félicite le berger qui dit la vérité.
- Personne n'est mangé. Si le village ne vient pas, le loup s'enfuit grâce au chien Pataud, mais le berger a eu très peur et il comprend. C'est une fin douce, avec une nouvelle chance.

**Conception interactive**

1. Compteur **confiance**, qui commence à 2.
2. Trois moments d'ennui. À chaque fois, l'enfant choisit entre crier « Au loup ! » pour rire (confiance −1) et une activité (jouer de la flûte, compter les moutons, tresser une couronne).
3. Après un faux cri, nouveau choix : avouer et s'excuser (confiance +1) ou rire (rien).
4. Le vrai loup arrive. Condition « confiance ≥ 2 » :
   - si oui, le village accourt et le loup s'enfuit : **fin heureuse**, le berger est félicité ;
   - sinon : **fin à retenter**.
5. **Fin secrète** : si le berger n'a jamais menti, le maire lui confie la clochette d'or du village.

**Notion** : une **variable** qui augmente et diminue, et une **condition de comparaison**.

---

## 6. Le Lièvre et la Tortue

**Origine** : Ésope, puis La Fontaine (*Fables*, livre VI, fable 10, 1668) : « Rien ne sert de courir ; il faut partir à point. » Domaine public.

**Structure d'origine**

| Étape | Chez La Fontaine |
|---|---|
| Situation initiale | La Tortue propose un pari : « Gageons que vous n'atteindrez point sitôt que moi ce but. » |
| Élément déclencheur | Le Lièvre accepte en se moquant. |
| Péripéties | Le Lièvre broute, dort, écoute d'où vient le vent ; la Tortue avance lentement mais sans s'arrêter. |
| Dénouement | Le Lièvre part trop tard : la Tortue arrive la première. |
| Situation finale | La Tortue se moque gentiment : « Et que serait-ce si vous portiez une maison ? » |

**Ce qu'on adapte**

L'enfant **est le Lièvre**. C'est le personnage le plus drôle à jouer, avec toutes ses tentations. La moquerie finale devient une **amitié** et une proposition de revanche.

**Conception interactive**

1. Compteur **avance de la tortue**, qui commence à 0.
2. Quatre tentations sur le parcours : une carotte, un papillon, une sieste au soleil, une flaque pour sauter. Chaque détour fait avancer la tortue de 1.
3. Une rencontre spéciale : la tortue est coincée dans une ornière. L'enfant peut l'aider (choix mémorisé par « déjà passé par »).
4. À l'arrivée :
   - si la tortue a avancé de 3 ou plus, elle gagne : **fin « Rien ne sert de courir »**, avec une boucle **Revanche !** qui remet tout à zéro ;
   - sinon, le lièvre gagne : **fin heureuse**, mais il apprend à rester modeste ;
   - **fin secrète** : s'il a aidé la tortue, ils franchissent la ligne **ensemble**.

**Notion** : un **compteur** et un **Retour avec remise à zéro** (recommencer la course).

---

## 7. Sons et illustrations

- **Narration** : voix automatique Piper « Siwis » (données SIWIS, CC BY 4.0) pour les versions françaises, « LJ Speech » (domaine public) pour les versions anglaises ; générée par Herodio Studio et modifiable comme n'importe quel son.
- **Versions anglaises** : mêmes blocs, mêmes sons et mêmes illustrations, textes traduits dans `editor/src/stories/*.en.ts`. Pour *Les trois petits cochons*, les répliques du loup reprennent la formulette anglaise d'origine de Jacobs ; pour *Le Lièvre et la Tortue*, la morale devient « Slow and steady wins the race! ».
- **Bruitages, ambiances et musiques** : synthétisés par `tools/gen_example_audio.py` (vent, oiseaux, pas, souffle du loup, marmite, clochette…), CC0.
- **Illustrations** : vectorielles (SVG), dessinées pour Herodio dans un style plat et coloré, CC0 (`editor/public/examples/<histoire>/*.svg`).
