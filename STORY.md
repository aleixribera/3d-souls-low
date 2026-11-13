# STORY: The Hunger That Wears a King

The game's one story, in two parts. **Part one is what is in the game today**: every line of story in the game (chapter
titles and lines, boss names, level descriptions, Ysolde's dialogues, the inscriptions, the endings, the credits) must
agree with it. Change the story here first, then in the game. **Part two is where it is going**: a working draft,
written by the director with Aleix, that the loop builds chapter by chapter; as a piece ships, it moves into part one.

The game text lives in `js/data/lore.js` (dialogues, inscriptions, scenes, ending cards), `js/data/story.js`
(chapter lines), `js/data/enemies.js` and `js/data/bosses/*.js` (boss names), the level files (descriptions) and
`js/finale.js` (the credits).

Voice: archaic, understated, melancholic, tender in places. No modern words, no jokes. Show, never tell the whole.

# Part one: in the game

## Public-lobby opening ceremonies

These gold title cards introduce a new shared run; they do not replace chapter loading lines or change the story.

- **STORY · ASHMERE** — “Defeat the Gaoler King.”
- **BOSS RUSH** — “Answer every boss that comes. The last two come together.”
- **SINGLE BOSS** — “Defeat every boss.”
- **DOUBLE BOSS** — “Defeat every boss, two at a time.”
- **TRIPLE BOSS** — “Defeat every boss, three at a time.”
- **QUAD BOSS** — “Defeat every boss, four at a time.”

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
| 1 | The Long Hall | The old **hall of judgment's** approach, where kings walked to swear the Oath. Aldric walled its alcoves into cells. The player wakes here. |
| 2 | The Sunken Keep | The Seven's **first keep**, the oldest stone in Ashmere, sinking into the river silt. Its chapel and shrine are the founders'; its throne room is where the Oath was sworn. Now the deep gaol, held by Shield Wardens. |
| 3 | The Burning Town | **Corvel**, a river town of bellwrights and tinkers below the cliff. The town the champion would not burn. The Ashbound burned it anyway, a year later. |
| 4 | The Tower | The Seven's **watchtower**, built to hold the Bell of Waking. Seized by the king; its ringers turned to Toll Wisps; the Bell Warden set over the Bell. |
| 5 | The Final Castle | Aldric's castle on the founders' hill, with the Ember beneath it. Field of Answer before the gates (where the ruler must come out), the outer ward, the chapel, the great hall with its empty portraits, the ash bridge, the throne. |
| 6 | The Church in the Pass | The **first church of the Seven**, over the mountains: logs, shingle and their own painted faces. Chapter 6 of the Story; see 10b. |

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

Her arc: hope (Level 1), dread (Level 2), grief (Level 3), resolve (Level 4), farewell and release (Level 5). Then the
ash goes on falling, and she follows the player over the pass (Level 6).

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

### Level 6 — The Church in the Pass (in the wood, by the first bonfire)
1. You didn't come down to the river. So I came up after you.
2. I rang, by the water, the way I said I would. The ash kept falling on the bell.
3. My grandmother sang of the Seven coming over these mountains, carrying something wrapped in a cloak. The song never says what.
4. They stopped at a church in the snow, and painted their own faces on its wall, so they would know each other after.
5. Whatever left him when he fell, it came this way. Up, into the cold. As if it knows the road.
6. I'll keep the fire. Go on up.

*Idle:* The snow is clean here. I had forgotten snow could be.

### Level 7 — The Windward Moor (in the border shrine, by the first bonfire)
1. Over the top, and down the other side. My grandmother's song had a line for this: the heath where the wind lives.
2. There are people out on the moor. They walk together, close, after one who carries a lantern. They don't look at anything.
3. I called to one of them. She smiled at me. She didn't stop.
4. The song says the Seven came out of this country by night, and a man at the gate let them through. It doesn't say what it cost him.
5. There's a gate at the far end, on a bridge over the gorge. Something stands in it, very tall, with a light.
6. I'll keep the fire. I've got good at it.

*Idle:* The wind never stops here. I think it has been blowing since they left.

### Level 8 — Saltgrave (in the gatehouse, by the first bonfire)
1. The great gate is barred from inside. Whoever holds this place does not want it come at.
2. There's a way round, along the cliffs. The sea is a long way down, and very loud.
3. The song has two sisters in it, at Saltgrave. One suit of armour between them, and never both asleep at once.
4. The knights on the walls are white with salt. One of them saluted me. Then it remembered what it was for.
5. They kneel every evening, the song says, facing Aurel, and wait to be told they may stop.
6. Go round. I'll keep the fire.

*Idle:* You can taste the sea in the rain. I had never seen the sea.

### Level 9 — The Night Gaol (on the landing, by the first bonfire)
1. There is no ground under this place. Only the sky, and the cells hung in it like lanterns.
2. The song says Thrale had a bell too, once. Someone rang it without leave, and they shut her up here for it.
3. The prisoners still wear their chains. The doors fell open long ago. Nobody came to tell them.
4. Mind the bridges. There is nothing at the sides of them, not even wind.
5. My father used to say you can tell a bellwright by the hands. I should like to see hers.
6. Go on. I'll keep the fire. It's the only warm thing up here.

*Idle:* The stars are very close here. I keep wanting to reach one down.

### Level 10 — Aurel, the Gilded City (inside the city gate, by the first bonfire)
1. Aurel. My mother sang it as a word for gold. I thought it was only a word.
2. They are all smiling. Every one of them. Nobody here has been hungry in a very long time.
3. Don't let them come close. The gold is on their hands, and so are the knives.
4. The song has a steward in it, left to keep the city until the king came home. The king never came. He kept it anyway.
5. Something grows up out of the chasm, under the throne. It is warm to stand near. I didn't like it.
6. Go on. I'll keep the fire. I'd rather they didn't look at me.

*Idle:* Everything here is gilded. Even the bread, I think.

### Level 11 — Aurel in Ash (inside the ash gate, by the first bonfire)
1. It is the same city. I know that street. I walked it yesterday, and it was gold.
2. The steward is dead, and the city would not be kept without him. So it burns.
3. There were people in those streets. They are still walking. Don't look at their faces.
4. The song says the first crown was laid under the throne with the king still wearing it. It never says what he waits for.
5. Corvel burned like this. I watched it from a castle window. You watch it as though you had seen it before.
6. Go on. I'll keep the fire. It is the only one here that is ours.

*Idle:* The ash is warm. It is still falling.

### Level 12 — The Torn Abbey (on the landing, by the first bonfire)
1. This was an abbey. The song calls it the house that held the knife. I thought the knife was a way of speaking.
2. They meant to cut it out of the earth, the thing the Seven would carry away. The earth would not let it go. It came up with it.
3. The hill has been falling ever since, very slowly. Mind the floors. They are older than the storm.
4. The brothers are still here, and still have their hooks. I don't think they know any more what they are cutting.
5. The abbess held the knife. The song never says she put it down.
6. Go on. I'll keep the fire. Something is pulling at these stones from underneath.

*Idle:* The storm never moves off. It has sat on this hill since the hill came loose.

### Level 13 — The Root of the Ember (in the first hollow, by the first bonfire)
1. The song stops at the abbey. After it there is one word, under. I think this is under.
2. The wood is warm. Put your hand to it and it beats, a little, like something asleep.
3. The ones grown into the walls were people once. The wood took them in, and I don't think they fought it.
4. It was never a fire. A fire is only what a root looks like when it is burning.
5. If the root dies, what it holds goes cold. I don't know how much it holds. Go on anyway.
6. I'll keep the fire. It is the only one down here that isn't hungry.

*Idle:* The little bell is cast. I'll ring it when there is water to ring it over.

### Level 14 — The Still Mere (on the white bough, by the first bonfire)
1. The songs end here. The last verse is only a lake, and a tree with no colour in it.
2. Nothing has ever burned here. Feel the cold. It is the first clean thing in Thrale.
3. You carry it, don't you. I can see the light through your fingers. It is smaller than I thought.
4. Someone waits on the ice. I saw them from the bough. They stand the way you stand.
5. Whatever it wears, it is not you. You were only ever lent to it.
6. Go down. When it is done, I'll ring the bell over the water.

*Idle:* The bell is cold in my hands. Good. Let it be cold.

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

### Level 6 — The Church in the Pass
- **The bent cross** (churchyard, past the second bonfire): "Those who stopped here on the way over. We came on without them."
- **Over the church door**: "Seven came through. Leave it open behind you."
- **Below the last icon** (behind the iron gate, once the Hunger is ash): "We held it. We did not own it. — the Seven"

### Level 7 — The Windward Moor
- **The border stone** (in the shrine, by the first bonfire): "Here the king's peace begins. Go softly, and follow the light."
- **A milestone on the heath**: "Aurel, nine days. Keep to the lantern."
- **On the gate bridge** (before the fog): "The porter keeps the gate until the king sends word." Someone has scratched beneath it: "No word came."

### Level 8 — Saltgrave
- **The barred gate** (in the gatehouse, by the first bonfire): "Shut by the castellans' order, until the king rides in."
- **In the hall of kneeling statues**: "Here the garrison of Saltgrave knelt to the crown. Here it kneels."
- **On the tower stair** (before the fog): "Hale keeps the helm, Harrow the greaves. Between them, one castellan."

### Level 9 — The Night Gaol
- **The seal on the landing** (by the first bonfire): "Rang without leave. Kept without end."
- **Scratched in a cell's floor**: "The door is open. Where would we go?"
- **Before the great ring** (by the last bonfire): "Here is kept the Ringer of Thrale, until the crown forgives." Someone has
  scratched beneath it: "It forgot."

### Level 10 — Aurel, the Gilded City
- **Cut in the city gate's floor** (by the first bonfire): "Aurel keeps. Aurel is kept."
- **On the fountain's step**: "In Aurel none go hungry."
- **Over the throne gate** (by the last bonfire): "Hollis, steward of the crown, keeps the city until the king comes home."

### Level 11 — Aurel in Ash
- **Under the ash, in the gate's floor** (by the first bonfire): "Aurel keeps. Aurel is kept." Someone has written beneath
  it in soot: "What it cannot keep, it burns."
- **On a lintel in the burnt yard** (by the second bonfire): "Oswin, first of the crowned, sleeps beneath the throne
  until Thrale has need of him."
- **On the throne court's wall** (by the last bonfire): "Long live the king. Long live the king. Long live the king."

### Level 12 — The Torn Abbey
- **Cut in the colonnade's floor**: "Cut it out, and Thrale is whole."
- **On the terrace wall** (by the second bonfire): "The root goes down further than the hill. Cut deeper." Beneath it, in
  another hand: "Mother, it is coming up with us."
- **In the nave landing's floor** (by the last bonfire): "Agathe, abbess, who held the knife. She did not let go."

### Level 13 — The Root of the Ember
- **Cut in the ember hollow's floor**: "Seven came down with lamps. Seven went up. They carried one coal more than they
  brought."
- **In the amber hollow's floor** (by the second bonfire): "Let no one of us carry it alone." Beneath it, in another
  hand: "We took it so that no one would."
- **In the last hollow's floor** (by the last bonfire): "It was a root before it was a king. It will be a root after."

### Level 14 — The Still Mere
- **Cut in the bough fork's bark**: "Here the fire came, and went no further."
- **In the shore yard's stones** (by the second bonfire): "We walked into the water so it would have nothing left to
  hold." Beneath it, in another hand: "It is cold. It is clean. Come in."
- **In the shore's stones** (by the last bonfire): "What the fire took, it keeps. What it keeps, it wears."

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

## 9. The end of Act I: the Ember leaves him

Aldric's death no longer ends the story (part two, the spine). Killing the king does not kill the Ember; it only
frees the hunger that wore him. These cards follow his death, with no credits, and the road goes on to chapter 6, the
Church in the Pass.

1. Aldric, the Ember-Crowned, is ash. The Ember gutters in the cinders where he stood. It does not go out.
2. Something goes up out of it, like heat over a summer road, through the broken windows and away toward the mountains.
3. The bell that called him out tolls once more, by no one's hand, and then falls silent.
4. His keys lie in the ash: every cell of the Long Hall and the Sunken Keep. No one will be thrown into that dark again.
5. And over Ashmere, the ash goes on falling.

The story's own ending follows the last chapter: section 9b.

## 9b. The end of the story: the Still Mere

The King's Blade's last bar breaks on the ice of the Still Mere (chapter 14). It kneels and burns out, the champion's
sword left standing where it knelt. Then these cards, and the credits:

1. The King's Blade kneels in the shallows. The red scarf comes loose, and floats.
2. You wade out with the Ember and hold it under. It does not fight you. The ice closes over it.
3. Over Thrale the storm breaks. Over the mountains, over Ashmere, the ash stops falling.
4. Finn stays at the water's edge. He does not say the name he knows.
5. Down by the river, someone is ringing something small.

The credits name the fourteen chapters under *The road*, Ysolde of Corvel under *Who walked beside you* (and Finn, once
he walks the road beside the player), and the thirteen who stood in the way. Story mode's last screen, **STORY
COMPLETE**: *The ash has stopped falling. The road is walked.*

---

## 10. Mysteries (hinted, never answered)

1. **Who rang the Bell the first time, and which ruler came out?** The crack is the only proof it happened.
2. **Did the queen and the boy truly die of the plague?** Theirs is the one portrait Aldric never cut from its
   frame, and the Ember was already beneath him the winter they died.
3. **The Ringer of Thrale has a bellwright's hands.** Whose daughter she was, no song says.

---

## 10b. Level 6 — The Church in the Pass (chapter 6 of the Story)
Chapter 6, after the Final Castle (and after it in Practice's level list). The Seven called the Ember *the hunger that wears a
king*, and when Aldric fell the hunger had no king left to wear. It went back the way the Seven came, over the mountains, to the **first church of the Seven**: the log
church in the pass where they stopped, painted their own faces on the wall and swore the first words of the Oath. There it
found a stag starving in the snow and put it on. The player, nameless as ever, follows the last of it up the pass.

**The Antlered Hunger** is that stag, grown: antlers, a skull for a face, quills along its back. It has no words. It never
tries the same thing twice over, because the hunger learned that from a king; it only strikes what stands before it,
because it was only ever a thing that looked ahead.

## 10c. Level 7 — The Windward Moor (chapter 7 of the Story)
Chapter 7, after the church. Over the pass lies **Thrale**, the country the Seven never named to their children, and
its border is a storm-held heath: the moor, a gorge cut through it, a cliff road with no rail, and a gate bridge into
the hills. A storm has sat on the moor since the Seven left.

Its people are **thralls**: alive, fed on, smiling. The **Lantern Thralls** of the moor are blind herd-folk who walk
in a close flock after one who carries a lantern; they see nothing, and come only where the lantern sees.

**Old Ostrey, the Porter** keeps the gate bridge: a giant in the armour of Thrale's gate-wardens, with an iron gate-bar
and a lantern, still keeping the border for a king long dead. The song Ysolde knows says a man at the gate let the
Seven through, the night they carried the Ember out. Whether it was Ostrey, and what it cost him, it never says. When
he is hurt past bearing, his lantern catches, and he fights by its fire.

*What the song leaves out (never said in the game, only shown):* it was Ostrey. The Seven paid the porter's toll with a
coal of the Ember, and it has burned in his lantern ever since, behind a shut door. He keeps the gate the harder for
having opened it once: he fights as a porter keeps a door, the bar laid across the way, the gate dropped, three knocks,
the lantern held up to see who comes, coals for those who stand off. Hurt past bearing he opens the lantern, and what
the Seven paid him with comes out: he breathes its fire, and it runs along the ground from where he strikes.

## 10d. Level 8 — Saltgrave (chapter 8 of the Story)
Chapter 8, after the moor. **Saltgrave** is the border fortress of Thrale, on a cliff over the sea, in a rain that
never lifts: its great gate barred from inside, a cliff walk round to the outer rampart, an inner ward, a hall of
kneeling statues, and the tower roof. Two castellans hold it for a crown that does not answer, and have held it a very
long time.

**Hale and Harrow, the Castellans**, are twin sisters. When Thrale's kings began to forget, the fortress's arms were
sent to Aurel to be gilded, and one suit of armour came back. The sisters split it: Hale took the helm, the breastplate
and the axe; Harrow the gauntlets, the greaves and the weight. They fight as one castellan in two bodies. When one
falls, the other kneels, takes up her sister's half, and fights on alone.

The **Salt Knights** are Saltgrave's garrison, their armour crusted white by the sea wind. They keep the walls. In the
hall below the tower, the ones who stopped keeping them kneel in stone.

## 10e. Level 9 — The Night Gaol (chapter 9 of the Story)
Chapter 9, after Saltgrave. **The Night Gaol** is Thrale's prison, hung among the stars: cells of old stone on
nothing, rune circles on their floors, joined by bridges with no rail, climbing to the great ring at the top. Thrale's
kings put there what they would not see again.

Thrale too had a bell. Long ago, before the Seven left, someone rang it without leave, and the crown shut her in the
great ring for it, in chains, until the crown should forgive. The crown forgot. **The Ringer of Thrale** is there
still, still chained, still fighting whoever comes into the ring. The iron that held her to the wall has stood open for
longer than anyone remembers; she does not know she is free. They shut a scold's bridle on her head, a little bell on
its crown so the wardens could hear where she was, and they took the clapper out of Thrale's bell so it could not be
rung again: she has it still, on a chain from her own fetter, and she strikes the stones with it as if they were the
bell. Every blow is a knell that runs out along the floor. A circle is cut round the middle of the ring, the length of
her old chain, and she will not cross it; she calls across it to anyone who stands off. Hurt past half, she steps over
the line for the first time, and the circle breaks. Who she rang for, and what came out, the song does not say. Her
hands are a bellwright's hands.

The **Keyless** are the gaol's other prisoners. Their doors fell open long ago, and they never went out. One warden
is left, empty in its armour, and still keeps the cells. They walk in their chains, and swing them.

## 10f. Level 10 — Aurel, the Gilded City (chapter 10 of the Story)
Chapter 10, after the Night Gaol. **Aurel** is Thrale's capital, and it is still gold: white stone hardly weathered,
gold leaf on the roofs, flaking in the warm air; an avenue between lit houses, a fountain court, a great stair, and,
north of the city, a chasm with the Ember's root grown up out of it and over, gilded where the city could reach it. The
throne court lies past the root.

When the hunger went over the mountains in the Seven's keeping, it left a steward to keep its city fed until it came
home. **The Regent Hollis** kept it. He is gilded, gracious and cruel. Aurel lays its faces in gold leaf, and so did
he, so long that the gilt remembers what he does with it: every cut he makes hangs in the air in gold leaf after him, and
a beat later it cuts again where it hangs. He bows while it falls. Past the worst of his hurt, the gilt cracks and the
hunger shows through him: his cuts hang as embers, and he calls them home to him, through whoever stands between.

The **Gilded Thralls** are Aurel's citizens: fed, smiling, gold leaf laid on their faces and hands, a knife in each.
They smile until you are close.

## 10g. Level 11 — Aurel in Ash (chapter 11 of the Story)
Chapter 11, after Aurel. The steward is dead, and the city would not be kept without him; the hunger, refused, burns
what it cannot keep. **Aurel in Ash** is the same city burning: grey and black, ash falling like snow, embers in the
wind, the Ember's root charred where it arches up behind the plaza and the throne. Halfway down the market lane the
burnt street gives way into the cellars, where the last of the city hid.

Under the throne lay **Oswin, the First Crown**: the first king of Thrale the Ember ever wore, laid there with the crown
still on him. He has risen to his throne in the ash. He fights with a great axe, and his stomps crack the floor. Past the
worst of his hurt he casts the axe down, and the Ember takes his hands: he fights as the man he was before the crown,
and the bar names him **Oswin, Uncrowned**.

The **Cinderfolk** are Aurel's citizens after the burning: burned, and still walking. Some lie in the ash until you
pass.

## 10h. Level 12 — The Torn Abbey (chapter 12 of the Story, the first of Act III)
Chapter 12, after Aurel in Ash: the first of Act III, the Root and the Mere. Long ago Thrale's monks tried to cut the
Ember out of the earth, and the earth came with it: the hill tore loose and has hung in the storm ever since. **The Torn
Abbey** is its ruins adrift in rain and lightning over a sea of cloud, a crumbling colonnade, a long bridge with no
rail. Past the rent, the Ember's root hangs out of the cloud where it was torn from the hill.

**Mother Agathe, the Rending Hand**, was the abbess who held the knife. She did not let go. She fights with a great hook,
flung stones, and blows that rend the floor into lines of shockwaves. At half her strength the storm comes at her back,
the bar names her **Agathe, the Storm at Her Back**, and every blow of the hook rends: a wound that holds the player's
health down until it closes.

The **Rending Brothers** are her monks, still at the work: they spring from the ruins, cut with hooked knives, fling
stones and rend the floor.

## 10i. Level 13 — The Root of the Ember (chapter 13 of the Story)
Chapter 13, after the Torn Abbey. Under everything, the Ember is a root, and the root is still growing. **The Root of
the Ember** is the inside of its first growth: hollows of living red-gold wood, warm to the hand, joined by roots with
no rail over a burning deep. Here the Seven came down with lamps, long ago, and went up again carrying a coal.

**The Kindling Tree** is the Ember's own root, given limbs, where it began. Its boughs lash, its thorns fly, its mark in
the floor burns a moment later, and it sinks into its roots to rise where the player stands. At 60 % it catches, and
the bar names it **the Kindling Tree, Ablaze**.

The **Rootbound** are thralls grown into the wood, and gone into it gladly: they sink into the roots and rise where you
stand, throw thorns of fire, and mark the floor to burn.

## 10j. Level 14 — The Still Mere (chapter 14 of the Story, the last)
Chapter 14, after the Root of the Ember. There is one water in Thrale that never burned: **the Still Mere**, a frozen
lake under a white tree. The player comes down the tree's white boughs, through the shore yard and the drowned court,
carrying the dying Ember to drown it.

**The King's Blade** waits on the ice: the hunger, beaten in every body it wore, in the last one it kept, the champion's
burned-out memory. Red scarf, round shield, the King's sword. It fights as the player fights: the three cuts, the held
blow, the leap; its shield turns blows from the front and answers them. Past half the Ember shows through it, and the
bar names it **the King's Blade, Ember-Worn**. Who it was is never said.

The **Drowned** are thralls who walked into the mere so the hunger would have nothing left to hold, and stayed under.
They lie in the shallows until you pass.

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
| The place of Level 6 | the Church in the Pass, first church of the Seven |
| The beast of Level 6 | the Antlered Hunger |
| The old country (Acts II and III) | Thrale; its people under the hunger, thralls |
| The place of Level 7 | the Windward Moor, Thrale's border |
| The boss of Level 7 | Old Ostrey, the Porter |
| The enemy of Level 7 | the Lantern Thralls |
| The place of Level 8 | Saltgrave, Thrale's border fortress |
| The bosses of Level 8 | Hale and Harrow, the Castellans |
| The enemy of Level 8 | the Salt Knights |
| The place of Level 9 | the Night Gaol, Thrale's prison among the stars |
| The boss of Level 9 | the Ringer of Thrale |
| The enemy of Level 9 | the Keyless |
| The place of Level 10 | Aurel, the Gilded City, Thrale's capital |
| The boss of Level 10 | the Regent Hollis |
| The enemy of Level 10 | the Gilded Thralls |
| The place of Level 11 | Aurel in Ash, the same city burning |
| The boss of Level 11 | Oswin, the First Crown; past 40 %: Oswin, Uncrowned |
| The enemy of Level 11 | the Cinderfolk |
| The place of Level 12 | the Torn Abbey, torn loose into the storm |
| The boss of Level 12 | Mother Agathe, the Rending Hand; past half: Agathe, the Storm at Her Back |
| The enemy of Level 12 | the Rending Brothers |
| The place of Level 13 | the Root of the Ember, its first growth |
| The boss of Level 13 | the Kindling Tree; past 60 %: the Kindling Tree, Ablaze |
| The enemy of Level 13 | the Rootbound |
| The place of Level 14 | the Still Mere, under the white tree |
| The boss of Level 14 | the King's Blade; past half: the King's Blade, Ember-Worn |
| The enemy of Level 14 | the Drowned |

---

# Part two: where it is going

## The spine

Act I is Ashmere as it stands: a nameless prisoner wakes in the Gaoler King's cells, rings the Bell of Waking, and
kills Aldric. But killing the king does not kill the Ember. It only frees the hunger that wore him. The hunger goes
back the way the Seven came, over the mountains, to the country they fled. The player follows it.

What Act II finds there is the thing Ashmere never knew about itself: **the Seven did not find the Ember under the
hill. They brought it.** Their homeland, **Thrale**, was eaten by it first. It could not be put out, so seven
households carried it away from their own people, sealed it under a hill in an empty land, and swore an oath that no
one of them would ever rule alone, because they had watched what it did to the one who did. Ashmere was built as a
lid.

Act III goes to where the Ember began, and to the one place in Thrale where fire never took. The hunger, beaten in
every body it wore, puts on the last one it kept: the champion's burned-out memory. The player fights who they were.

## The world

- **Ashmere** (Act I): unchanged from sections 1 to 8: the Seven, the Oath of the Open Hand, the Bell of
  Waking, the Undying Ember, the Hollowed, the Ironbound, the Ashbound, the Toll Wisps, the Gargoyles, Aldric, Corvel.
- **The Pass**: the mountains between the two lands, and the log church where the Seven stopped and painted their own
  faces (section 10b).
- **Thrale** (Acts II and III): the old country. Once rich, gilded and proud; its kings wore the Ember one after
  another, each living longer and remembering less. Its people are **thralls**: alive, fed on, smiling. A storm has
  sat on its moors since the Seven left. Its capital, **Aurel**, is still gold.

## The player

The nameless prisoner of Act I, once **the King's Blade**, Aldric's champion, who would not burn Corvel and had their
memory burned out for it (section 3). The burned memory did not vanish: the Ember ate it, and the hunger has
carried it ever since. Never stated outright; the red scarf and the round shield remain the only clue until the last
boss wears them too.

## People

- **Ysolde of Corvel** (the whole story): the bellwright's daughter, as in section 5. After Aldric falls she
  follows the player over the pass, because her family's songs about the Seven name the place the hunger is going.
  She waits by the first bonfire of every chapter. In Act II she casts a small bell from what she finds; in Act III she
  rings it at the mere. The last line of the game is still hers: *someone is ringing something small*.
- **Finn** (Acts II and III, the solo companion): a deserter of the Ashbound, once the champion's squire, who was there
  when Corvel burned a year after the torch was laid down, and held a torch himself. He meets the player in the Pass
  and walks beside them through Thrale (the companion as built today: his own health and flasks, returns at
  checkpoints). Few words; he calls the player *ser* and never asks why they don't remember him.

## The chapters

Each chapter keeps the shape the game has: a title and a line over the loading screen, Ysolde by the first bonfire, a
boss behind a fog gate, and one new enemy where the table names one.

| # | Chapter | Place | Boss | New enemy |
|---|---|---|---|---|
| **Act I** | **Ashmere** | | | |
| 1 | The Long Hall | The hall of judgment's approach, walled into cells | as now | |
| 2 | The Sunken Keep | The Seven's first keep, sinking into the river | as now | |
| 3 | The Burning Town | Corvel | the Pillager Captain | |
| 4 | The Tower | The watchtower; the Bell of Waking is rung | the Bell Warden | |
| 5 | The Final Castle | Aldric's castle on the founders' hill | Aldric, the Gaoler King; Aldric, the Ember-Crowned | |
| **Act II** | **Thrale** | | | |
| 6 | The Church in the Pass | The Seven's first church, in the snow | the Antlered Hunger | |
| 7 | The Windward Moor | Thrale's border: a storm-held heath, a gorge, a cliff road with no rail, a gate bridge | **Old Ostrey, the Porter**: a giant gatekeeper still keeping the border for a king long dead; a lantern and an iron gate-bar | Lantern Thralls: blind herd-folk who follow a lantern-bearer |
| 8 | Saltgrave | The border fortress in the rain: a barred gate, a cliff walk, a hall of kneeling statues, the tower roof | **Hale and Harrow, the Castellans**: twin sisters who split one suit of armour between them, fought as a pair | Salt Knights: armour crusted white by the sea wind |
| 9 | The Night Gaol | Thrale's gaol hung among stars: cells on nothing, railless bridges, the great ring | **the Ringer of Thrale**: the one who rang Thrale's own bell, long ago, and was shut away for it; still chained, still fighting, not knowing she is free | the Keyless: prisoners who walk in their chains |
| 10 | Aurel, the Gilded City | The capital, still gold: the avenue, the fountain court, the great root over the chasm, the throne court | **the Regent Hollis**: the steward the hunger left to keep its city fed; gilded, gracious, cruel | Gilded Thralls: smiling citizens in gold leaf, with knives |
| 11 | Aurel in Ash | The same city burning: the hunger, refused, burns what it cannot keep. A lane gives way into the cellars; the throne in ash | **Oswin, the First Crown**: the first king of Thrale the Ember ever wore, risen to his ash throne | Cinderfolk |
| **Act III** | **The Root and the Mere** | | | |
| 12 | The Torn Abbey | Where Thrale's monks tried to cut the Ember out of the earth and tore the hill loose into the storm: ruins adrift, a crumbling colonnade | **Mother Agathe, the Rending Hand**: the abbess who held the knife; a great hook and the storm at her back | Rending Brothers |
| 13 | The Root of the Ember | Inside the Ember's first growth: hollows of living red-gold wood, roots over a burning deep | **the Kindling Tree**: the Ember's own root, given limbs | the Rootbound: thralls grown into the wood |
| 14 | The Still Mere | The one place in Thrale where fire never took: a frozen lake under a white tree. The player carries the dying Ember down to drown it | **the King's Blade**: the hunger wearing the player's own past: red scarf, round shield, the champion's sword. It fights as the player fights | the Drowned |

## Mysteries still to hint

Section 10's three stand, and one more for Acts II and III: did the Seven carry the Ember away to save Thrale, or to
have it?
