# The included stories: study and adaptation

*[Version française](analyse.md)*

Five classic tales and fables were **studied, taken apart and rewritten** as interactive stories for 6-8 year-olds (the first three years of French primary school, CP-CE2). The original texts are in the public domain. The adaptations, sounds and pictures are original creations released under the CC0 licence.

## 1. What research says, and what we take from it

| Source | Finding | Design rule adopted |
|---|---|---|
| [Eduscol reference list, cycle 2 (2018)](https://eduscol.education.gouv.fr/6825/lectures-l-ecole-des-listes-de-reference) | For CP-CE2, the accessible classics (level 1) include *The three little pigs* (J. Jacobs), *Stone soup*, *Little Thumb* (Perrault), *Puss in Boots* and *The boy who cried wolf*. La Fontaine's fables (including *The Hare and the Tortoise*) are at level 3. | Choose tales already worked on in class: the child knows the story and can **play with it**. |
| [Cumulative tales (Storyplayr)](https://www.storyplayr.com/blog/le-conte-randonnee), [Alcuin](https://alcuinfonds.be/blog/album-randonnee-maternelle/) | A repeated formula and encounters that pile up make understanding and remembering easier. | Keep the **refrains** ("Little pig, little pig…") and the **cumulative structures** (the soup). |
| [Lee et al., *Psychological Science*, 2014](https://journals.sagepub.com/doi/full/10.1177/0956797614536401) | With 3-7 year-olds, *The boy who cried wolf* and *Pinocchio* (lying punished) **do not reduce** lying. A story where **honesty is rewarded** triples confessions. | Highlight the **positive consequences** of good choices: making amends, owning up, helping. "Bad" choices lead to a gentle ending and a new chance, never to a humiliating punishment. |
| Design advice for branching stories ([Adobe guide](https://elearning.adobe.com/2025/04/bring-stories-to-life-designing-choose-your-own-adventure-activities-with-adobe-captivate), [analysis of the gamebook genre](https://bahai-library.org/pdf/m/moyo_interactive_stories.pdf)) | 2 to 3 key decisions with 2 to 3 options; early endings should offer a way back. | **2 answers per choice** (3 at most), **4 to 6 choices per play-through**, always a "try again" loop rather than a dead end. |

**Writing rules for 6-8 year-olds**

- **Short scenes**: 2 to 4 sentences, that is 15 to 25 seconds of listening.
- **Simple sentences**, in the present tense, with everyday vocabulary. A rare word ("faggot" of sticks, "cauldron") is always made clear by the context.
- **Answers phrased as an action**, with a verb: "Build with bricks". The child knows what they are doing.
- **Measured fear**: the wolf or the ogre are a little scary, but nobody is eaten or hurt. The villains are made fun of, then run away or become kind.
- **At least three endings**: a happy one, a gentle "try again" one, and a **secret** one that rewards curiosity.
- **A full play-through in 3 to 7 minutes**, which matches the attention span of a child of this age.
- **Narration by the automatic voice** (Piper: Siwis in French, LJ Speech in English). Children and teachers can replace it with their own recordings in the editor.

**Link with STEM notions (cycle 2)**

Each story illustrates an algorithmic notion, visible in the block graph:

| Story | Notion | Blocks |
|---|---|---|
| The three little pigs | **loop** (repeating an action) and **condition** | Counter, Go back, Condition |
| Stone soup | **inventory** and **accumulation** | Item, Counter, "already been to" |
| Little Thumb | an **item needed** to get past a step | Item, Condition |
| The shepherd boy and the wolf | a **variable** (trust) that goes up and down | Counter, Condition |
| The Hare and the Tortoise | **counter** and **starting over from scratch** | Counter, Go back with reset |

---

## 2. The three little pigs

**Origin**: English folk tale, set down by Joseph Jacobs (*English Fairy Tales*, 1890). Public domain.

**Original structure (five-stage narrative pattern)**

| Stage | In Jacobs |
|---|---|
| Initial situation | An old sow, too poor to keep them, sends her three little pigs out to seek their fortune. |
| Triggering event | Each one builds a house: straw, furze, bricks. |
| Developments | **Refrain repeated three times**: "Little pig, little pig, let me come in. — No, no, by the hair of my chiny chin chin. — Then I'll huff, and I'll puff…". The wolf blows down the first two houses and **eats** the pigs. He then tries three tricks (turnips, apples, the fair), all foiled. |
| Resolution | The wolf comes down the chimney and falls into the pot. |
| Final situation | He is boiled and eaten; the pig lives happily. |

**What we adapt**

- The pigs are not eaten: they **run away** to their brother's house, as in many children's versions.
- The boiling pot becomes a **big tub of icy water**: the wolf runs away shouting "Brrr!" and never comes back.
- The turnip and apple tricks are removed, to keep the play-through short.

**Interactive design**

The child **is the third little pig**.

1. They choose their material (straw, sticks or bricks).
2. Straw and sticks are quick, but the wolf blows the house down. We then go back to the choice, with a counter of attempts.
3. Bricks require **repeating "lay a row of bricks"** until the wall is high enough (counter and loop: 3 rows).
4. The wolf arrives. A condition checks whether the house is made of bricks.
5. A last choice for the chimney: light a fire (the wolf burns his bottom and runs away: happy ending) or prepare a tub of icy water (happy and funny ending).
6. **Secret ending**: if the child first **invited their two brothers** (a choice at the start), the whole family sings together in the house of bricks.

**Notion**: a **loop** (repeat until it is done) and a **condition** (is the house strong?).

---

## 3. Stone soup

**Origin**: European folk tale (ATU classification 1548), with variants where the stone is a nail or an axe. First known written version: Johann Peter Hebel, 1811. Public domain ([Wikipedia](https://en.wikipedia.org/wiki/Stone_Soup)).

**Original structure**

| Stage | Typical course |
|---|---|
| Initial situation | Hungry travellers arrive in a wary village that hides its food. |
| Triggering event | They announce they will cook a "stone soup" and put a stone in a pot of water. |
| Developments | **Accumulation**: each curious villager adds "just a little something" (carrots, cabbage, potatoes, onions…). |
| Resolution | The soup is delicious; the stone is taken out. |
| Final situation | The whole village shares the meal. |

The moral is **ambivalent**: sharing and friendliness, but also a trick played on gullible villagers.

**What we adapt**

- The trick becomes an **open sharing game**: at the end, the traveller admits with a laugh that the stone gives no flavour — the friends do. We keep the positive moral (cooperation) and remove the deception.
- Main character: **Lila, a little traveller**, and her lucky stone.

**Interactive design**

It is a cumulative tale.

1. On the village square, the child chooses **which door to knock on** (the baker, the farmer, the gardener, the grandmother).
2. Each encounter **gives an item** (carrots, potatoes, leek, salt) and adds 1 to the ingredient counter.
3. A door already visited answers kindly "I already gave you something!" ("already been to" condition).
4. At any time, the child can "Taste the soup".
   - With fewer than 3 ingredients, it is "bland": back to the village (loop).
   - With 3 ingredients or more: **happy ending** (the feast).
   - If the child also did the grandmother a favour (carrying her basket), she brings a dessert: **secret ending**.

**Notion**: an **inventory** (collecting items), a **counter** and a **threshold condition**.

---

## 4. Little Thumb (*Le Petit Poucet*)

**Origin**: Charles Perrault, *Tales of Times Past* (*Histoires ou contes du temps passé*, 1697). Public domain.

**Original structure**

| Stage | In Perrault |
|---|---|
| Initial situation | A very poor woodcutter and his seven sons; the smallest, Little Thumb, is the cleverest. |
| Triggering event | During a famine, the parents decide to **lose their children** in the forest. |
| Developments | (1) Little Thumb scatters **white pebbles** and brings his brothers back. (2) The second time, he only has **bread**: the birds eat it and the children are lost. (3) They take refuge at **the ogre's** house; his wife hides them. (4) Little Thumb swaps his brothers' caps with the crowns of the ogre's daughters, and the ogre **cuts his own daughters' throats**. (5) They escape; the ogre chases them with his **seven-league boots**, then falls asleep. Little Thumb takes the boots. |
| Resolution | Thanks to the boots, Little Thumb brings back riches (or becomes the king's messenger). |
| Final situation | The family no longer lives in need. |

Morals: do not look down on the puny child, who often brings the family good fortune.

**What we adapt (elements too violent for 6-8 year-olds)**

- **No abandonment**: the children go out to gather wood and get lost because a fog comes down. Little Thumb, who thinks ahead, has brought pebbles… if he thought of it.
- **No murder**: the ogre becomes a **greedy, grumpy ogre** who wants to keep the children to peel his vegetables. They escape during his nap.
- The seven-league boots remain the magic item: they take the brothers home in three strides.

**Interactive design**

1. At the start, the child chooses what Little Thumb puts in his pocket: **white pebbles** or a **piece of bread** (item).
2. In the fog:
   - **with the pebbles**, the way home is found: **quick happy ending**;
   - **with the bread**, the birds have eaten it: they are lost. They climb a tree, see a light and arrive at the ogre's house.
3. At the ogre's house, a choice: hide under the bed or under the table.
4. During the ogre's nap, a choice: run away straight away ("phew!" ending, they run home), or **take the seven-league boots** (item) and then run away.
5. With the boots: **secret ending**. Little Thumb becomes the fastest messenger in the kingdom, and he gives the boots back to the ogre… who becomes kind.

**Notion**: an **item needed** (a condition on the inventory), and two paths leading to the same goal.

---

## 5. The shepherd boy and the wolf (*The boy who cried wolf*)

**Origin**: Aesop (Perry 210), retold by many fabulists. Public domain.

**Original structure**

| Stage | In Aesop |
|---|---|
| Initial situation | A young shepherd is bored while minding his sheep near the village. |
| Triggering event | For fun, he shouts "Wolf!". |
| Developments | The villagers come running and he laughs. He does it again. |
| Resolution | A real wolf comes: nobody believes him any more. |
| Final situation | The wolf devours the flock (and, in some English versions, the boy). |

Moral: "Nobody believes a liar, even when he tells the truth."

**What we adapt, following Lee et al. (2014)**

- We **reward honesty** instead of punishing the lie. After a false alarm, the child can choose to **own up and say sorry**, which makes **trust go back up**. The village congratulates the shepherd who tells the truth.
- Nobody is eaten. If the village does not come, the wolf runs away thanks to the dog Buddy (Pataud in French), but the shepherd was very scared and understands. It is a gentle ending, with a new chance.

**Interactive design**

1. A **trust** counter, which starts at 2.
2. Three moments of boredom. Each time, the child chooses between shouting "Wolf!" as a joke (trust −1) and an activity (playing the flute, counting the sheep, weaving a crown).
3. After a false alarm, a new choice: own up and say sorry (trust +1) or laugh (nothing).
4. The real wolf arrives. Condition "trust ≥ 2":
   - if so, the village comes running and the wolf runs away: **happy ending**, the shepherd is congratulated;
   - otherwise: **"try again" ending**.
5. **Secret ending**: if the shepherd never lied, the mayor gives him the village's golden bell.

**Notion**: a **variable** that goes up and down, and a **comparison condition**.

---

## 6. The Hare and the Tortoise

**Origin**: Aesop, then La Fontaine (*Fables*, book VI, fable 10, 1668): "Rien ne sert de courir ; il faut partir à point" (there is no point running; you must set off on time — in English, "slow and steady wins the race"). Public domain.

**Original structure**

| Stage | In La Fontaine |
|---|---|
| Initial situation | The Tortoise suggests a bet: "Let us wager that you will not reach that goal as soon as I." |
| Triggering event | The Hare accepts, mocking her. |
| Developments | The Hare grazes, sleeps, listens to where the wind is coming from; the Tortoise moves slowly but never stops. |
| Resolution | The Hare sets off too late: the Tortoise arrives first. |
| Final situation | The Tortoise teases him gently: "And what would it be if you carried a house?" |

**What we adapt**

The child **is the Hare**. He is the funniest character to play, with all his temptations. The final teasing becomes a **friendship** and an offer of a rematch.

**Interactive design**

1. A **Tortoise's lead** counter, which starts at 0.
2. Four temptations along the course: a carrot, a butterfly, a nap in the sun, a puddle to jump in. Each detour moves the Tortoise forward by 1.
3. A special encounter: the Tortoise is stuck in a rut. The child can help her (choice remembered with "already been to").
4. At the finish:
   - if the Tortoise has moved forward 3 or more, she wins: **"Slow and steady" ending**, with a **Rematch!** loop that resets everything;
   - otherwise, the Hare wins: **happy ending**, but he learns to stay modest;
   - **secret ending**: if he helped the Tortoise, they cross the line **together**.

**Notion**: a **counter** and a **Go back with reset** (starting the race again).

---

## 7. Sounds and pictures

- **Narration**: Piper automatic voice "Siwis" (SIWIS data, CC BY 4.0) for the French versions, "LJ Speech" (public domain) for the English versions; generated by Herodio Studio and editable like any other sound.
- **English versions**: same blocks, same sounds and same pictures, with the texts translated in `editor/src/stories/*.en.ts`. In *The three little pigs*, the wolf's lines use Jacobs's original English refrain; in *The Hare and the Tortoise*, the moral becomes "Slow and steady wins the race!".
- **Sound effects, ambiences and music**: synthesised by `tools/gen_example_audio.py` (wind, birds, footsteps, the wolf's huffing, the cooking pot, a little bell…), CC0.
- **Pictures**: vector graphics (SVG), drawn for Herodio in a flat, colourful style, CC0 (`editor/public/examples/<story>/*.svg`).
