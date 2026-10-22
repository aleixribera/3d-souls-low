# LORE — the source of truth for the story of Ashmere (Part II: the Lands Between)

Every line of story in the game (Story mode titles and lines, boss names, level descriptions, the NPC's dialogues,
the inscriptions, the ending) must agree with this file. Change the story here first, then in the game.
The game text lives in `js/data/lore.js` (dialogues, inscriptions, scenes), `js/data/story.js` (chapter lines),
`js/data/enemies.js` (boss names), the level files (descriptions) and `js/finale.js` (ending cards and credits).

Voice: archaic, understated, melancholic, tender in places. No modern words, no jokes. Show, never tell the whole.

## Story V2: the shorter road through Ashmere

Story V2 is an alternate playable staging of the same tale, with its own save. It does not replace either road.
The prisoner still leaves the Long Hall, passes through the Sunken Keep and burning Corvel, rings the Bell of
Waking, and meets Aldric outside his castle before following him to the throne. Ysolde survives; the Ember dies;
the original Ashmere ending and credits apply. These passages are places within the existing locations.

| Chapter | Loading line and description |
| --- | --- |
| The Broken Hall | An open cell, a broken court, and the keeper of the lower stair. Read the blade before answering it. |
| The Cistern Walk | Below the hall, the old keep holds its prisoners beside the water. Draw the wardens apart and open the river door. |
| Corvel's Last Street | Corvel burns. Cross the crooked market and silence the invaders' commander at the river road. |
| The Bell Ascent | Above the town, sheltered stairs climb to the Bell of Waking. Take the high ground and call the crown to answer. |
| The Crown's Answer | Aldric answers outside his gates. Follow him through the ash garden to the throne, and put the Ember out. |

Ysolde's short dialogues along this version of the road:

- Broken Hall: “Your door is open. Mine was, too. Someone has remembered mercy.” / “Below this court lies the old keep. Beyond it, Corvel. If the river road still stands, I shall meet you there.”
- Cistern Walk: “The water carried our bells once. Now it carries the ash.” / “The wardens have forgotten whom they guard. Do not let them hem you in.”
- Corvel's Last Street: “These are the king's soldiers. We called them invaders because we could not bear the other name.” / “Above the town stands the Bell of Waking. Ring it, and the king must answer.”
- Bell Ascent: “The Seven cast that bell from their own crowns. No king was meant to keep the realm for himself.” / “Who rings it calls the crown to answer. Let the crown come out.”
- Crown's Answer: “He came out. The old law has not forgotten him.” / “Follow him. Beneath that crown is the fire that ate our people. Let it hunger no more.”

Ysolde's idle line throughout: “The road is still before you.”
The inscription beside the final bell reads: “Who rings me calls the crown to answer. Let the crown come out.”
Level 4 completion: “The bell has rung. The crown must answer.”

---

## 1. The world

**Ashmere** was a green kingdom of river towns and stone roads, ruled from a castle on the high ground. Now it is
grey. Ash falls from a sky that never quite clears, settles on the roads, and does not wash away.

### The Founders
Ashmere was raised by **the Seven** — seven households who came over the mountains with nothing and swore, on the
hill where the castle now stands, that no one of them would ever rule alone. Their oath is the **Oath of the Open
Hand**: *the crown is held, not owned.* The first king was chosen from among them, and each king after swore the
same oath in the hall of judgment (the old keep, now sunken).

The Seven distrusted their own descendants. So they built a remedy before they needed one.

### The Bell of Waking
The Seven melted down their own crowns, rings and chains of office and cast them into one bell, hung in the
**watchtower** on the cliff above the river. It is to be rung once, and only if a ruler betrays the realm. Its toll
breaks every ward and seal upon the castle, and calls the ruler out of it, by the old law, to answer whoever rang.
The founders' words are on its stone: *Who rings me calls the crown to answer. Let the crown come out.*

It has been rung **once** before (see Mysteries). It carries a crack from that day.

### The Undying Ember
Beneath the castle, older than the Seven, burns the **Undying Ember**. The Seven knew of it and sealed it under the
castle's foundations; the castle was built partly to keep it shut. Whoever bears the Ember cannot die. But the Ember
must be fed with souls, and as it feeds it burns away the bearer: first their mercy, then their memory, then their
face. The Seven called it *the hunger that wears a king*.

### Ashmere's people and what became of them
- **The Hollowed** (Hollow Soldiers, Rogues, Pale Duelists, Rampart Bowmen): people whose souls were half-fed to the
  Ember and then cast aside. They still walk, still fight, but most of what they were is gone.
- **The Ironbound** (Undead Knights, Shield Wardens, Shovers, the Empty Sentinels): the king's old household guard,
  kept at their posts past death. The Empty Sentinels are suits of armour whose wearers were fed to the Ember whole;
  the armour kept standing guard without them.
- **The Ashbound** (Ashen Lancers, Executioners, the Pillager Captain, *the invaders' commander* in the game's own words): the king's own army, turned. They wear no
  colours of Ashmere, so the towns they burned took them for **invaders** from beyond the mountains, and the king
  let that be believed. They burn the towns and herd the people to the castle as fuel.
- **Toll Wisps**: the souls of the tower's old bell-ringers, bound to small bells of their own. They ring before
  they strike, out of a habit older than death.
- **Gargoyles**: the castle's carved guardians, woken by the Ember's heat.

---

## 2. The king

**Aldric** was the last king to swear the Oath of the Open Hand, and for twenty years he kept it. He was just, and
he was loved; the river towns named children after him. He was also afraid — of death above all, after the plague
year took his queen and his son in one winter.

He broke the Seven's seal and took the Ember.

To feed it, he:
- turned his army into **the Ashbound**, who burn the towns and harvest their people;
- turned the old hall of judgment into a gaol (**the Long Hall** and **the Sunken Keep**), filling it with those who
  resisted and with others kept for later, as one keeps grain;
- seized the **watchtower** and set the **Bell Warden** — a bellkeeper chained in bronze — to guard the Bell so it
  could never be rung.

The prisoners call him **the Gaoler King**.

- **Phase 1 — Aldric, the Gaoler King** (the field before his gates): still partly a man. Armoured, proud, fighting
  as the soldier he once was. When pressed he withdraws behind his walls, where the Ember is strongest.
- **Phase 2 — Aldric, the Gaoler King** (the throne room), then **Aldric, the Ember-Crowned**: he gives himself to
  the Ember wholly. The glass shatters, the pillars fall, and he burns.

When he dies the Ember dies with him. The ash stops falling.

---

## 3. The player

A **nameless prisoner** who wakes in the Gaoler King's cells with no memory of how they came there.

**Hidden truth (never stated outright):** the prisoner was once **Aldric's champion** — the King's Blade, who wore a
red scarf, the champion's colour, and a round shield. Sent to burn the town of **Corvel**, the champion refused,
laid down the torch at the town gate, and was taken in chains to the castle. The king could not bring himself to
feed his champion to the Ember, nor to free them. So he had their memory burned out instead, and left them in the
dark.

The player still wears the red scarf and the round shield. That is the only clue the game itself gives.

How it is revealed:
- Ysolde's dialogues hint at it, a little more each level, without ever saying it.
- In the castle chapel (Level 5), a **defaced statue of the champion** stands: hooded, a round shield, a scarf painted
  red; its face struck off. Its plinth names no one.

---

## 4. Places

| Level | Place | Its history |
|---|---|---|
| Tutorial | The Training Hall | Where the castle's soldiers once learned the blade. |
| 1 | The Long Hall | The old **hall of judgment's** approach, where kings walked to swear the Oath. Aldric walled its alcoves into cells. The player wakes here. |
| 2 | The Sunken Keep | The Seven's **first keep**, the oldest stone in Ashmere, sinking into the river silt. Its chapel and shrine are the founders'; its throne room is where the Oath was sworn. Now the deep gaol, held by Shield Wardens. |
| 3 | The Burning Town | **Corvel**, a river town of bellwrights and tinkers below the cliff. The town the champion would not burn. The Ashbound burned it anyway, a year later. |
| 4 | The Tower | The Seven's **watchtower**, built to hold the Bell of Waking. Seized by the king; its ringers turned to Toll Wisps; the Bell Warden set over the Bell. |
| 5 | The Final Castle | Aldric's castle on the founders' hill, with the Ember beneath it. Field of Answer before the gates (where the ruler must come out), the outer ward, the chapel, the great hall with its empty portraits, the ash bridge, the throne. |

---

## 5. The NPC — Ysolde of Corvel

**Ysolde** is a bellwright's daughter from Corvel, in her middle years, grey at the temples. She was taken to the
castle for hiding townsfolk from the Ashbound, and kept as "fuel for later". She speaks softly, plainly, and with
more kindness than the place deserves. She hums when she is afraid.

What she knows and slowly lets slip:
- Her family cast bells for the tower for generations; she knows the Bell of Waking's legend from childhood.
- She saw the champion at Corvel's gate the day the torch was laid down. She does not say so until the end, and
  even then only sideways.
- She recognises the red scarf from the first moment. She says nothing of it at first.

Her look: a long blue-grey shawl worn as a hood, a leather bellwright's apron, bare scarred hands, bound wrists.
Unarmed. She is never hostile, cannot be attacked, and cannot die.

Her arc: hope (Level 1), dread (Level 2), grief (Level 3), resolve (Level 4), farewell and release (Level 5).

---

## 6. The dialogues

One dialogue per level (two in Level 5), played as subtitles while the player keeps control. After it has been heard once, she has
a short idle line when the player comes near again; talking again replays the full dialogue.

### Level 1 — The Long Hall (through the bars of the next cell, extended to the hall beside the first bonfire)
1. Ah. You're awake. I'd begun to think you never would.
2. They carried you in a fortnight past. You didn't stir, not once. Most who come in that way never do.
3. I am Ysolde. Of Corvel, down by the river, if Corvel still stands.
4. Your door. It's open. Mine is not. That is either luck or someone's mercy, and there's little enough mercy in this place.
5. The hall runs long, and the things in it are not men any more. Not all the way.
6. They were prisoners once. The king's fire takes what it wants of a soul, and leaves the rest to walk.
7. That scarf you wear... no. Never mind. Red was a common enough colour, once.
8. Go on. If you find the keys, think of me. And if you don't... well. Go on regardless.

*Idle:* Still here. The bars haven't grown any kinder.

### Level 2 — The Sunken Keep (by the shrine bonfire, deeper in)
1. You found the keys, then. Or something found me. Either way, I'm out, and I'm not going back.
2. Do you know what this place was? Before the cells? It was the founders' keep. Their first stone.
3. Kings swore their oath down here. *The crown is held, not owned.* My grandmother could say it in her sleep.
4. And now the same king keeps us in it, like grain in a barn, against a hungry winter.
5. The wardens down here weren't always his. They swore to guard the oath, not the gaoler. I think some of them still remember. It makes them no gentler.
6. I passed a door barred from the inside. There were people behind it. They held it as long as they could.
7. You fight like someone taught you. Properly taught. Not like a farmer with a stolen sword.
8. ...Forgive me. I talk when I'm frightened. Go ahead. I'll follow when it's quiet.

*Idle:* Quiet now. Quiet is a good sound, down here.

### Level 3 — The Burning Town (at the tavern hearth, in its front corner, by the second bonfire)
1. This was the Lantern and Last. My father drank here every feast-day. He sang badly and was proud of it.
2. Corvel. They called the ones who did this invaders. Men from over the mountains, they said.
3. But I saw their boots. Ashmere's boots. Ashmere's buckles. Our own army, with the colours torn off.
4. A year before the fire, the king sent his champion here with a torch, to make an example of us.
5. The champion stood at the gate a long while. Then set the torch down in the road and walked away from it.
6. We lived another year, because of that. One whole year. I've never decided if that was a gift or a cruelty.
7. They took the champion to the castle in chains. No one in Corvel ever learned their name. We only knew the red they wore.
8. I'm going to sit here a while. By the fire that isn't burning anything. Go on. The gate's at the top of the town.

*Idle:* My father's chair. I won't sit in it. I'll just keep it company.

### Level 4 — The Tower (inside the gate, by the first bonfire reached past the undercroft)
1. There it is. The watchtower. My family cast bells for it for six generations.
2. Not the great one, though. No living hand made the great one.
3. The founders melted their own crowns to cast it. *Who rings me calls the crown to answer.* That's what's written on its stone.
4. One toll, and every seal on the castle breaks, and the king must come out and face whoever rang. That is the old law.
5. That's why he took the tower. Not to use the bell. To make sure no one ever could.
6. It's been rung once before, you know. Long ago, before even my grandmother's grandmother. No one remembers who rang it, or which king came out. Only that the bell has had a crack ever since.
7. The ringers are still up there. What's left of them. Don't let their little bells frighten you. They were kind, once.
8. Ring it. Please. I'd do it myself, but I think it needs someone who has already said no to him once.

*Idle:* I'll be here. Listening. I'd know that bell's voice anywhere.

### Level 5a — The Final Castle (in the gate yard, by the first bonfire, once Aldric has fled the field)
1. You saw him. Out there on the field. You saw what he has become.
2. He came out because the bell made him. The old law still holds him, a little. Enough to drag him to his own gate.
3. And he ran from you. I didn't think he could still be afraid of anything but dying.
4. I came up the cliff road behind you. I wasn't brave. I only couldn't bear to wait below and not know.
5. His castle is above us now. Gargoyles on the walls, and the old guard still at their posts. Empty, some of them. Only the armour, keeping its watch.
6. There's a chapel inside. My grandmother prayed in it once, when the castle still opened its doors to the river towns.
7. Rest here. Then go up. I'll find my own way, and I'll find you again before the end.

*Idle:* Rest. The fire here is honest, at least.

### Level 5b — The Final Castle (at the throne room door, by the last bonfire)
1. You came through all of it. I followed the quiet you left behind you.
2. In the chapel. Did you see the statue? The one with its face struck off?
3. A hood. A round shield. Someone painted the scarf red, after.
4. I never saw the champion's face at Corvel. Only the red, and the torch lying in the road.
5. I won't ask. I don't think you could tell me if I did. I think he made sure of that.
6. He's in there. What's left of him. He was a good king, once. My father said so. I'd like to believe it, for my father's sake.
7. The fire is his now, all of it. When it goes out, I think it goes out everywhere. I think the ash will stop.
8. Whatever you were, you are the one who came back. That's enough for me.
9. Go on, then. And when it's done... come down to the river. I'll be the one ringing something small.

*Idle:* Go on. I'm not going anywhere. Not any more.

---

## 7. Inscriptions

Read like the dialogues (press Talk near one; subtitles; control stays free). Short.

### Level 1 — The Long Hall
- **Scratched into a cell wall** (near the first bonfire): "Forty days. Then I stopped counting. Then I started again, for the child in the next cell. She has stopped answering."
- **A worn plaque on the hall's last stretch** (before the giant's gate): "Walk this hall with an open hand. — the Seven"

### Level 2 — The Sunken Keep
- **The founders' shrine** (by the shrine bonfire): "Here the Seven swore it: no one of us shall rule alone. The crown is held, not owned."
- **The barred door** (the scene of the barricade): "We held the door. Tell them in Corvel we held the door."

### Level 3 — The Burning Town
- **A stone at the church** (church square): "Corvel, town of bells. Cast for the tower by the hands of this parish, in the founders' faith."
- **A charred sign at the lower gate**: "By order of the crown: all who shelter the disloyal shall be counted among them."

### Level 4 — The Tower
- **The Bell's founding stone** (the gatehouse): "Who rings me calls the crown to answer. Let the crown come out."
- **Carved by a ringer, in the undercroft**: "We were told to stop ringing. We were told why. We kept the rope oiled anyway."

### Level 5 — The Final Castle
- **The champion's statue plinth** (chapel): *(the name has been chiselled away)* "...the King's Blade, who kept the river towns. By the king's own love."
- **Below the empty portraits** (great hall): "Aldric, sixth of his name, who swore the Oath of the Open Hand." Someone has scratched beneath it: "and forgot it."
- **At the throne door** (beside the last bonfire): "The hunger wears a king. — carved over the seal, by the Seven"

---

## 8. Environmental scenes (no words)

- **Level 1:** a pile of shackles and a slumped body in the cell by the start; a body that died reaching for a gate.
- **Level 2:** the barred door with the bodies of those who held it; a body by the cistern, a guttered candle left
  beside it by someone who came after.
- **Level 3:** an Ashbound camp in the market (stolen goods: sacks, crates, a looted bell); a burned family home in
  the first street with a small body and a larger one over it.
- **Level 4:** the Bell Warden's chains at the top; a ringer's body still holding a rope in the gatehouse.
- **Level 5:** the defaced statue of the champion in the chapel; the king's empty portrait frames in the great hall
  (the canvases cut out, one left: a queen and a small boy, untouched); a broken crown of seven points at the throne
  door.

---

## 9. The ending

1. Aldric, the Ember-Crowned, is ash. The Ember gutters in the cinders where he stood, and goes out.
2. The bell that called him out tolls once more, by no one's hand, and then falls silent.
3. His keys lie in the ash: every cell of the Long Hall and the Sunken Keep. No one will be thrown into that dark again.
4. And over Ashmere, for the first time in years, the ash stops falling.
5. Down by the river, someone is ringing something small.

Then the credits (unchanged flow), which also name Ysolde under *Who walked beside you*.
Story mode's last screen: *The ash has stopped falling. The road is walked.*

---

## 10. Mysteries (hinted, never answered)

1. **Who rang the Bell the first time, and which ruler came out?** The crack is the only proof it happened.
2. **Did the queen and the boy truly die of the plague?** Theirs is the one portrait Aldric never cut from its
   frame, and the Ember was already beneath him the winter they died.

---

## 11. Names (fixed)

| Thing | Name |
|---|---|
| Kingdom | Ashmere |
| Founders | the Seven |
| Their oath | the Oath of the Open Hand |
| The flame | the Undying Ember |
| The bell | the Bell of Waking |
| The king | Aldric (the Gaoler King); phase 2: Aldric, the Ember-Crowned |
| The army | the Ashbound (taken by the towns for invaders) |
| The town of Level 3 | Corvel |
| The NPC | Ysolde of Corvel |
| The player | nameless; once the King's Blade, the champion |

---
---

# PART II — The Lands Between: the Elden Throne (the second road, v7.0)

The second Story road (`LANDS_STORY` in `js/data/story.js`) is a different tale in a different world, told the same
way: a chapter title and line over each loading screen, a guide who waits by the first bonfire of every land (Talk:
the bonfire key), messages and tablets that glow and can be read, and an ending. It borrows the names of Elden Ring:
the eight lands end in the eight bosses of the Elden Ring Bosses mode, in that mode's order. Nothing here touches
Ashmere's story above. Same voice: archaic, understated, melancholic, tender in places.

## II.1 The world

The **Elden Ring** is shattered. Its shards, the **Great Runes**, went to the demigods, who warred over them and went
mad with them. The **Tarnished**, exiles who lost the grace of gold, are called back by **grace** to gather the runes,
mend the Ring and sit the **Elden Throne** at the foot of the **Erdtree**.

The player is a Tarnished, nameless, called back from death on **Stormhill**.

## II.2 The guide — Seren, the Grace-Bearer

**Seren** is a slight maiden in pale robes and a deep grey hood who carries a lantern lit with the last of the grace.
She sees where grace points, and goes ahead to every site of grace (the bonfires) to wait there. She cannot fight.
She was born under the Erdtree, in Leyndell. She has always known that the Erdtree's thorns, when they close, can only
be burned, and that her flame is what will burn them.

Her arc: welcome (1), warning (2-3), foreboding (4), sacrifice — after Leyndell she has given the Erdtree her flame, and
from the ashen capital on she appears as **a spirit of grace**, translucent and glowing (5-8) — and promise (8).
Like Ysolde, she is never hostile, cannot be attacked and cannot die. Her look in the game: `MODEL_DEFS.seren`.

## II.3 The road

| Land | Title (loading screen) | Boss | New enemy | Its place |
|---|---|---|---|---|
| 1 | STORMHILL | Margit, the Fell Omen | Omenkin | A storm-lashed heath, the Stormgate gorge, a cliff path with no rail, Stormveil's gate bridge. |
| 2 | STORMVEIL CASTLE | Godrick the Grafted | Grafted Scion | The castle in the rain: a barred main gate, the walled cliff walk and rampart, the grafting hall, the tower roof. |
| 3 | THE STORMHILL EVERGAOL | The Crucible Knight | Crucible Squire | A prison of stars: stone cells in a night sky, bridges with no rail, the great evergaol ring. |
| 4 | LEYNDELL, ROYAL CAPITAL | Morgott, the Omen King | Leyndell Knight | The golden city under the Erdtree: the avenue, the fountain plaza, the great root over the chasm, the Elden Throne's court. |
| 5 | LEYNDELL, ASHEN CAPITAL | Godfrey, First Elden Lord | Ashen Warrior | The same city burned: a lane that gives way into the cellars, cinders, the throne in ash. |
| 6 | CRUMBLING FARUM AZULA | Maliketh, the Black Blade | Beastman of Farum Azula | Ruins adrift in an endless storm over a sea of cloud; a colonnade that crumbles; a dragon in the sky. |
| 7 | THE ELDEN THRONE | Radagon of the Golden Order | Golden Zealot | Inside the burnt Erdtree, still shining: hollows of golden wood, roots over a golden abyss. |
| 8 | THE HALIGTREE | Malenia, Blade of Miquella | Cleanrot Knight | The frozen boughs of Miquella's tree, Elphael, the scarlet rot, the lake. |

The chapter lines (one per land, over its loading screen) are in `js/data/story.js` and read, in order:

1. The Elden Ring lies shattered, and the demigods who took its shards have gone mad with them. Grace has called you back from death, Tarnished. The road to the throne begins at Stormveil, and the Fell Omen keeps its gate.
2. Past the Omen stands the castle of Godrick the Grafted, who sews the limbs of the fallen onto his own body, and keeps a Great Rune he never earned.
3. One Great Rune will not open the capital. The second lies sealed in an evergaol, a prison of stars, with the last knight of the Crucible set to guard it for ever.
4. Two runes, and the capital's gate opens. Under the Erdtree the golden city waits, and its last defender: Morgott, the Omen King.
5. The Erdtree's thorns would let no one in, so Seren gave it her flame. The tree burned, and the city with it. In the ash, the first Elden Lord has come home to his throne.
6. The ash has cleared the way, but the throne's doors hold: Death itself is sealed behind them. Its keeper, the Black Blade, waits in Farum Azula, the dragons' city torn loose from time.
7. Destined Death is free. Inside the burnt Erdtree, at the foot of the throne, the Golden Order still has a body, and its name is Radagon.
8. The Ring will not mend: one shard is missing. Malenia, Blade of Miquella, carried it to the Haligtree in the frozen north, where the scarlet rot blooms.

## II.4 Seren's words

### Land 1 — Stormhill (in the Chapel of Anticipation, by the first bonfire)
- So grace has called you back. I wondered which of you it would choose.
- I am Seren. I carry what is left of the grace, in this lantern, and I can see where it points.
- The Elden Ring was broken. Its shards, the Great Runes, went to the demigods, and the demigods went to war, and then to madness.
- Gather the runes, mend the Ring, and sit the Elden Throne. That is what grace wants of you. Of all of you.
- The road begins at Stormveil. Its gate is kept by an Omen, a cursed thing with gold in its hands. He has turned back every Tarnished before you.
- Wherever you see the light rise from a site of grace, I will have been there. Rest at each one. You will need them.
- Go on. I cannot fight for you. I can only show you the way.
- *Idle:* The gate is east, past the heath and the gorge. Mind the cliff path.

### Land 2 — Stormveil Castle (in the gatehouse, by the first bonfire)
- You passed the Omen. I did not think anyone would, truly.
- Godrick holds the castle. He sews the limbs of the fallen onto his own body, and thinks it makes him greater.
- He has a Great Rune, his grandmother's. He has never earned it.
- The main gate is barred. Take the side passage, along the cliffs. Things wait on the walls there.
- The sea beats against the rampart walls. Within them, grafted things wait for you.
- *Idle:* The side passage is south of the yard. The sea is louder than it looks.

### Land 3 — The Stormhill Evergaol (on the landing, by the first bonfire)
- This is an evergaol: a prison made of a piece of sky. The Golden Order sealed what it feared in places like this.
- There is a knight here, of the Crucible, from before the Order. The old life still runs in him. It shows as gold, as wings, as a tail.
- He guards a second rune. With two, the capital's gate will open to you.
- The bridges have no rail, and under them there is only sky. Do not look down too long.
- I am sorry I cannot carry your sword. I can only carry the light.
- *Idle:* The knight waits in the great ring, beyond the last cell.

### Land 4 — Leyndell, Royal Capital (inside the capital gate, by the first bonfire)
- Leyndell. The golden city. I was born under that tree, though you would not guess it.
- Morgott keeps it now: an Omen, like the one at Stormveil. Those horned things were his brothers.
- He is the last who still defends the Erdtree. He does it out of love, I think. That is the cruelest part.
- When he falls, the tree will close itself in thorns. It does not want anyone to reach the throne.
- There is only one way through thorns like those. Fire. I have known that for a long time.
- Do not worry for me. Go.
- *Idle:* The throne is north, at the foot of the tree, past the plaza and the great root.

### Land 5 — Leyndell, Ashen Capital (her spirit, inside the ash gate)
- You are still here. Good. I hoped you would be.
- I gave the Erdtree my flame, as I always knew I would. It burned. The city burned with it.
- What you see is only grace now. It is enough to light the way, I think.
- But the fire woke someone. The first Elden Lord, Godfrey, has come back to the throne he left long ago.
- Beware the market lane. The fire ate the ground beneath it.
- *Idle:* The throne is north of the plaza. He is waiting for you there.

### Land 6 — Crumbling Farum Azula (her spirit, on the arrival)
- This is Farum Azula, the city of the dragons. It has been falling apart, very slowly, since before the Order.
- The throne's doors are sealed with Death itself. Destined Death, which the Order locked away.
- Its keeper is Maliketh, the Black Blade, the queen's shadow. He will not give it up.
- Free it, and nothing will stand between you and the throne.
- The floors here are old. The colonnade will not hold you. Fall, and fight, and climb.
- *Idle:* The great bridge is at the top of the spire. He waits on it.

### Land 7 — The Elden Throne (her spirit, in the root hollow)
- We are inside the tree. Even burnt, its heart still shines.
- At the foot of the throne stands Radagon. He was the queen's husband, and he was the queen. The Order made them one.
- He is the Golden Order's body, and the Order will not let the Ring be made anew without a fight.
- His zealots vanish and appear where you stand. When the floor glows beneath you, move.
- *Idle:* Marika's hall is east, past the chapel of the Order.

### Land 8 — The Haligtree (her spirit, on the frozen ledge; then by the last bonfire, at the lake shore)
- The Ring will not mend. One shard is missing, the last.
- Malenia took it here, to the Haligtree, her brother's tree. She has never lost a fight.
- Below the boughs the scarlet rot has taken everything. Do not stand in it. It eats.
- Her knights still keep her, in gold and crimson. Every blow they land feeds them a little.
- When it is done, bring the rune to me. I will be there. I promise.
- *Idle:* She waits by the lake, below the rot.
- (At the lake shore) She is beyond the fog. I can feel the rot from here.
- (At the lake shore) Whatever happens, the light came this far with you. That was not nothing.
- *Idle (lake shore):* Go on. I will wait.

## II.5 Messages and tablets

Messages are words left on the ground by other Tarnished (a glowing mark: **Message**); tablets are older.

| Land | Label | Text |
|---|---|---|
| 1 | Chapel tablet | "Here the Tarnished waited for the call of grace. Few were called. Fewer came back." |
| 1 | Message (the heath) | "Omen ahead. Patience." |
| 1 | Message (the bridge yard) | "His swings wait. Do not." |
| 2 | Message (the side passage) | "Look up." |
| 2 | Bloodstained plaque (the grafting hall) | "Lord Godrick, by the grace of the grafts, the Golden Lineage made whole." Scratched below: "made of us." |
| 3 | Evergaol seal (the landing) | "Sealed by the Golden Order: a knight of the Crucible, who would not kneel. Let the stars keep him." |
| 3 | Message (the isle) | "Ahead, a tail. Then wings." |
| 4 | Message (the avenue) | "Gold, everywhere. Still, knights." |
| 4 | Throne inscription (the throne gate) | "The Elden Throne, at the foot of the Erdtree. None but the Lord shall sit." |
| 5 | Message (the ash street) | "The lane ahead. No way round." |
| 5 | Epitaph (the burnt yard) | "Here burned the capital, that the way might open. Forgive us." |
| 6 | Message (the colonnade's head) | "The floor is lying." |
| 6 | Dragon script (the wind terrace) | Weathered marks you cannot read, and one you can: a sword over a closed eye. |
| 7 | Message (the root hollow) | "When the floor glows, move." |
| 7 | Golden tablet (the chapel of the Order) | "The Golden Order is eternal. All that lives returns to the Erdtree." |
| 8 | Message (the frozen ledge) | "Do not let them land a blow. They drink it." |
| 8 | Elphael inscription (Elphael's yard) | "Here all are welcome, the cursed and the cast out. So swore Miquella." |
| 8 | Message (the lake shore) | "Her dance. Run from the first; roll the rest." |

## II.6 The ending

1. Malenia sinks to her knees in the lake, and the scarlet blossoms close, one by one.
2. The last Great Rune is warm in your hand. Around it the others turn, and find their places.
3. At the foot of the burnt Erdtree, a lantern's light gathers the shards into a ring of gold.
4. The Elden Ring is whole. The throne is yours, Tarnished, if you will sit.
5. Somewhere, a maiden's lantern is lit again.

Then the credits, which name the eight lands under *The road*, Seren under *Who walked beside you* and the eight bosses.
Story mode's last screen for this road: *The Elden Ring is whole. Somewhere, a maiden's lantern is lit again.*

## II.7 Names (fixed)

| Thing | Name |
|---|---|
| The guide | Seren, the Grace-Bearer |
| The player | a Tarnished, nameless |
| The new foes | Omenkin; Grafted Scion; Crucible Squire; Leyndell Knight; Ashen Warrior; Beastman of Farum Azula; Golden Zealot; Cleanrot Knight |

Entry staging: Ysolde stands at the front of her barred cell, within speaking distance of the hall. Seren waits ahead of each land's arrival, beside the route to its first exit and within speaking distance of that route, by the first bonfire.
