# Combat Arena 3D — v5.7: Golden Order

A Souls-like 3D action game that runs straight from one HTML file in your browser (Three.js from a CDN, no build step, nothing to download or install). Open `combat-arena-3d.html` and play.

**The story.** Ashmere was green once. Now ash falls on it from a sky that never clears, and its king keeps a prison under his castle. You wake in one of its cells with no memory of how you came there. You break out of the Long Hall and the Sunken Keep, fight through Corvel, the river town the invaders burned, and climb the old watchtower to ring the Bell of Waking: by the old law, whoever rings it calls the king out to answer. In the last level he answers. Five levels, a tutorial, three bosses before the last, and an ending.

**A fellow prisoner.** In the cell beside yours waits **Ysolde of Corvel**, and you will meet her again in every level, always somewhere safe, near a bonfire. Walk up and press **Talk** once: she speaks as subtitles at the bottom of the screen, line after line, while you keep full control (walk, look round, rest). Walk away or let an enemy find you and her words fade; come back and Talk to hear her again. A few carved stones, plaques and statues can be read the same way, and the levels hold small scenes that tell what happened there without a word. All of it is optional; none of it blocks the road. There are no items to collect and no journal: what you learn, you have to remember.

Keyboard and mouse, or a gamepad (standard Xbox-style layout). There are no touch controls. The game plays best with a gamepad: every level and duel opens on a short loading screen that says so, with a small controller icon. The version shows in the bottom-right corner of the menus.

## Modes

- **Story** (the first option, and the way to play) — the whole game as one campaign. A new story asks whether to play the tutorial first (it can also be skipped from the pause menu), then runs Level 1 → 5 without stopping: each level fades to black and opens on its title (THE BURNING TOWN) and a line of story while it loads. Aldric's death brings the ending, the credits and STORY COMPLETE. The game saves itself in your browser on every rest at a bonfire, at the start of every level and when you quit to the menu; **Continue** puts you back at the last bonfire you rested at, with everything you had beaten there still beaten and every shortcut still open. **New Game** asks before it overwrites a save. Nothing is downloaded and there is no account; in a private window the story still plays, it just isn't saved. In Story mode there is no restart key: death takes you back to the bonfire.
- **Levels → Tutorial** — one room of training dummies that teaches every control, step by step. Block, parry and dodge come together, locked on to the dummy: the dodge dummy's swing glows blue, and blue strikes can only be rolled through (a hint says whether the roll came too early, too late or clear of the swing). Then an execution dummy: break its stance with heavy attacks and execute it. Story mode plays the same tutorial.
- **Levels → Level 1: The Long Hall** — four gated opponents in order, optional enemies in between, two bonfires.
- **Levels → Level 2: The Sunken Keep** — rooms joined by corridors, four room fights (two of them against pairs), the Shield Warden, two bonfires.
- **Levels → Level 3: The Burning Town** — the town below the Tower, sacked and set alight by the invaders, at sunset. About 10 minutes, climbing in terraces from the lower gate (where the Keep comes out) to the upper town gate, with a massive castle on the horizon ahead, the sun setting behind it. Street by street, each fight's barricade falls once it is won: a lone Ashen Lancer, the sacked market, a Lancer below with an optional Rampart Bowman on a balcony above (reached through the stair house; jump its low rail to drop back down), a Pale Duelist round a bend in an alley, the fountain square, and the church square under a Bowman on the church gallery. The Pillager Captain holds the upper square. Two bonfires (the second in the tavern), a shortcut stair from the fountain square down to the first, a sleeping Knight in a yard, and one drop that hurts.
- **Levels → Level 4: The Tower** — a cliff-top keep, about 15 minutes: a gatehouse, then a passage toward a bonfire glowing behind a portcullis, until its floor gives way into the undercroft: an ambush of two Hollows and an Executioner, whose gate opens on the stairs up to that bonfire. Then a crowd fight in an open courtyard under rampart archers, the ramparts, the Executioner in the tower hall, a postern shortcut, walkways spiralling up the outside of the tower over the courtyard and the cliff, and the Bell Warden on top. Four bonfires.
- **Levels → Level 5: The Final Castle** — the longest level and the game's final test, about 30–40 minutes on a first run. It opens straight into the fight with **Aldric, the Gaoler King** on the field before his castle; break him and he leaps onto his walls and is gone, his gate gives way, and the first bonfire lights. Then the outer ward (a courtyard under a wall walk of archers, the barracks and their shortcut, and the **Empty Sentinel** holding the moat bridge), the inner keep (the great hall and its kitchen, the ramparts with Gargoyles on the walk), and the throne approach (an ash bridge under Toll Wisps, then the processional gauntlet). You glimpse Aldric twice on the way. Four bonfires; the last is a short run from the fog at the throne room door. In the throne room he fights again, and when his bar breaks the bell tolls, the glass bursts, the pillars fall and he rises as **Aldric, the Ember-Crowned**: a new bar, new attacks and fire. Beat him for the ending and the credits.
- **Enemies** — duel a single opponent in the arena, including the Ashen Lancer, Executioner, Pale Duelist, Rampart Bowman, Shover, Gargoyle, Empty Sentinel, Toll Wisp, the Pillager Captain, the Bell Warden and Aldric (his throne room fight, both bars).
- **Elden Ring Bosses** (v5.3) — a boss select of fights inspired by Elden Ring, one card each (name, title, difficulty), fought one on one in the Enemies arena. Win (ENEMY FELLED) or die, then choose **Retry** or **Boss select**. Five bosses so far: **Margit, the Fell Omen**, **Godrick the Grafted**, the **Crucible Knight**, **Morgott, the Omen King** and **Radagon of the Golden Order** (see below). Outside the story of Ashmere.

## Characters (v4.1: Bone and Ash)

Every character is now a procedural model built in code (still no downloads): the player is a hooded wanderer with a swaying cape, a round shield on the back and a faded-red scarf; the enemies belong to four factions, each with its own silhouette and palette.

- **Hollowed** (hoods, rags, amber eyes): Hollow Soldier, Fast Rogue, Pale Duelist, Rampart Bowman.
- **Ironbound** (plate, mail, slate tabards, pale blue eyes): Undead Knight, Shield Warden, Shover, and the Bell Warden boss (a bronze colossus with a temple bell for a hammer).
- **Ashen Host** (soot mail, peaked hoods, ember eyes): Ashen Lancer, Executioner, and the Pillager Captain boss (horned helm, torn cloak, glowing halberd).
- **Old Bones**: the Giant Skeleton, with a cracked skull, one open side of ribs and a thigh-bone club.

Bodies breathe, shift their weight into wind-ups and strikes, flinch, buckle and break up into glowing ash when they die; cloaks, scarves and tabards sway; weapons glint as a strike begins. Gameplay is unchanged: hitboxes, timings and AI are exactly as before. The training dummies and the Test Grounds enemies keep the old plain bodies.

## How to play

Open `combat-arena-3d.html` in any modern browser (Chrome, Edge, Firefox, Safari). Nothing to install and nothing to download: the whole game, its models, textures and sounds are made in code as it loads. Pick **Story** from the main menu and say yes to the tutorial on a first run.

Fight like a Souls game: watch the wind-up, roll through or parry the strike, punish the recovery, and keep an eye on your stamina. Rest at bonfires to refill your health and flasks; they are your checkpoints.

## Executions (v5.2: The Kneeling Dead)

Some enemies carry a meter under their health bar: a **stagger** meter (Undead Knight, Executioner, Empty Sentinel), a **guard** meter (the shield-bearers: Shield Warden, Shover) or, on bosses, **posture** (Giant Skeleton, Pillager Captain, Bell Warden, Aldric). Fill it (heavy attacks fill it fastest; on bosses, parries and quick chains of hits too) and the enemy drops to one knee for a few seconds.

While it kneels, step in front of it: its body glows a faint red and **Execute** shows at the bottom of the screen. Press **light attack** and you drive your sword through its chest and out of its back, hold it there, then rip it free.

- An execution deals 18 times a light attack's damage: most enemies die outright; the Empty Sentinel survives it.
- Bosses take the same blow (never more than half a bar). Boss health bars are twice as long as before and their posture drains half as fast, so a boss fight is a long, hard duel; a bonfire always waits before it. If that empties the bar, the boss falls, changes phase or retreats once the execution is over, never in the middle of it.
- You can't be hurt during an execution, by anything, and for a moment after it. Other enemies keep fighting, so look around when you stand up.
- From behind, from the side or too far away, light attack is just a light attack. If you wait too long, the enemy gets back up.

## Combat (v4.2: Weight of Steel)

Every attack now has four phases: wind-up, strike (the only moment it can hit), follow-through and recovery, drawn from whole-body key poses.

- **You:** a three-hit light combo; a heavy you can hold to charge (the body coils, trembles and glows at full charge, up to 1.5x damage); only a slight steer during a wind-up; a roll only cancels a swing in its recovery. One Souls-style input buffer: a press is kept only near the end of what you're doing, and the latest press wins.
- **Enemies:** they turn to track you early in a wind-up, then lock their aim (the commit point): dodge sideways after that and the blow won't follow. A blade glint marks the exact moment the parry window opens; blue strikes still can't be blocked or parried. Some enemies hold a wind-up still to bait a roll (delayed attacks). Combos end on their biggest wind-up, and big misses leave a punishable recovery. Bosses use larger, slower, more dramatic versions.
- **Impact:** hit-pause and a shudder on the body you hit, camera shake scaled by the blow, weapon trails during strikes, cloth that swings with the body, flinches sized to the damage, staggers and parries that throw the body open, and walking that leans with acceleration and turns.
- **Dev keys** (`#dev`): **F4** fills the nearest enemy's stagger, guard or posture meter (it kneels at once, ready to execute), **F6** slow motion (25%), **F7** tracking colours (yellow = still turning, red = committed) and your attack phase; **H** hitboxes.

Timings before and after are in `docs/combat-timings-v4.1.md`.

## Bosses

Every boss can be broken and executed (see Executions).

- **Giant Skeleton** (Level 1, the last of the Long Hall's gated fights) — a towering ruin of bone with a thigh-bone club: slow sweeps and a stomp.
- **Pillager Captain** (Level 3) — halberd thrusts from afar, a three-cut combo to parry, a burning overhead to roll.
- **Bell Warden** (Level 4) — a bronze colossus with a temple bell for a hammer: sweeps, an unblockable slam, a push off the tower, a charge.
- **Aldric, the Gaoler King** (Level 5, outside and in the throne room) — a sweep, a two-step cleave, a delayed overhead, a lunge from range, a shoulder barge, an unblockable stomp, and the **Judgement Leap**: a long crouch, a leap along his locked aim and a crash that rings the ground (then he is open for a while). In the throne room he presses harder.
- **Aldric, the Ember-Crowned** (his second phase) — faster, longer combos, fiercer tracking in his wind-ups (the commit points are as honest as ever), and four new attacks: the four-cut Tolling Chain, the Ash Wave thrown along the floor, the Burning Ascent into a leaping crash, and **The Last Toll**: the bell rings three times and three rings of fire sweep the room (roll each as it reaches you), then a blast at his feet. His armour cracks and burns, embers stream off him, and the boss drum quickens.

## Margit, the Fell Omen (v5.3)

A towering, hunched figure in a dark cloak, a white beard under his hood, a long tail and a gnarled cane. One long health bar, scaled to this game (a little tougher than Aldric):

- **The cane** (can be parried; it glints as the window opens): a double slash that may end in a baited ground thrust, a fast staff stab, an upward flick into a one-handed overhead held a beat too long, and a **charged overhead** held high before it falls (back away during it and he turns it into a running double sweep). From range he leaps and plunges the cane into the ground: a long opening.
- **Golden daggers** (holy): thrown singly or in pairs (blockable, never parried), a leaping slash and thrust after a toss, a backward leap with a dagger thrown on the way, a quick dagger slash at his off-hand side. Drink a flask at range and a dagger comes for you.
- **His tail** sweeps behind him: don't linger at his back. If your guard breaks, a scissor slash of cane and golden sword follows.
- **At 60% health** a golden hammer appears on his shoulder: a wide sweep, a leap and a slam with a shockwave (jump or roll it). From then on he presses harder and adds the hammer leap slam, the hammer stomp, a cane-to-hammer spin, a five-spin golden sword flurry and a sword combo into a ground stab. Golden weapons can be blocked but not parried.
- **Stance:** two parries break it (or heavy blows and chains of hits); then execute him.

**New look (v5.4):** Margit is rebuilt after the game's art: a hunched giant buried in layered rags of faded red and brown burlap down to the floor, a deep hood, a crown of twisted horn over long white hair, grey wrinkled skin, a rope sash, a ram's spiral horn behind his shoulder and a thick matted tail curling up his side. His golden hammer is a heavy block of marbled light on a long knobbed haft; his sword is a long blade with a shifting rainbow sheen.

## Godrick the Grafted (v5.4)

A hulking, stooped lord in mismatched silver and gilded plate under a teal tabard and cape bordered in gold, red rags at his hips, a wild white mane under a gold circlet, pale grafted arms with long claws reaching out of his back, and a long gilded axe with two crescent blades. The biggest body in the game and one long bar of 4000 HP. **None of his attacks can be parried**: block them or roll.

- **The axe and the storm:** the **Stormcaller** whirls the axe round him three times; stay close and he leaps and buries the axe in the ground (a long opening), back off and he throws two wind blades. A standalone jumping slam, a dragging run that ends in an upward scoop, the **Five-Strike Rampage** (he strides in from side to side with every cut: three cuts, a pause that catches early rolls, two wide sweeps; open only after the fifth), a double-step overhead, and a backhand for anyone at his back.
- **"I command thee, kneel!"** — he slams the axe down: a small shockwave, then a wide one. They run along the floor: jump or roll them.
- **At 60% health** he drops to his knees and hacks off his arm (he cannot be hurt while he does), grafts on a dragon's head and bathes the ground ahead in fire. Stand at his sides during the long flame sweep and hit him. From then on he burns: fiery storms, a leaping slam that bursts into a ring of fire, a three-part "Kneel!" whose last blast covers most of the arena, a charging dragon bite, and a fire march that floods the ground ahead.
- **Stance:** heavy blows fill it; when he kneels, execute him.

## The Crucible Knight (v5.5)

A towering knight in ornate golden-bronze plate, a tall helm with sweeping horns and a crest spike, a great oval shield on his left arm and a long straight greatsword. One bar of 2600 HP.

- **The shield:** while he is not attacking, blows to his front glance off it (little damage) and he may answer at once with a **Shield Counter**. Get round his sides, or hit him in his recoveries. Heavy blows wear the guard down; a broken guard kneels him.
- **Sword and shield:** a long **Lunging Thrust** (also his answer to drinking a flask at range), the **Earth Stomp** (a cone of rock along the floor: jump it) that always flows straight into an uppercut, an overhead slam (his sword stays planted: a big opening) or a **Double Spin Slash**, a diagonal slash and its backswing, a stepping **Shield Bash** (whiff it and his back is open), and a quick one-handed jab.
- **Parry:** every sword swing and thrust glints and can be parried, and **one parry breaks his stance**. The shield, the stomp and the golden aspects cannot be parried. He takes 30% less from executions.
- **At 50% health** the Crucible wakes: golden wings unfold and he dives at you from the air (he skids on landing: punish it), and his sword combos no longer stop: if you stay close a golden **Tail** sweeps round him, and if you back off or swing at once a far larger tail follows. Both run low: jump or roll them.

## Morgott, the Omen King (v5.6)

Margit unmasked: the same hunched omen in darker, kingly rags, now swinging the Cursed Greatsword. One bar of 4800 HP, the hardest boss in the game.

- **Phase 1:** a long-delayed overhead chop into a thrust, a four-cut flurry with a conjured golden curved sword, a golden hammer that leaps and crashes down with a shockwave or sweeps low into a sword slash, a golden spear he charges with at mid range or hurls from afar, a rain of golden swords falling in a line ahead of him, fans of thrown daggers, a dagger slash if you linger at his left, and his tail if you get behind him. Drink a flask at range and he punishes it.
- **Parry:** only the greatsword's own blows glint and can be parried; **three parries break his stance**. Golden weapons, the tail and the bloodflame can be blocked or rolled, never parried.
- **At 60% health** he kneels, choking (untouchable), then the cursed blood bursts out all round him and geysers erupt further out: run before it goes off. His sword now burns: a dashing **Cursed Blood Slice** whose path bursts again, a straight **Bloody Thrust** you must roll, and more geysers.

## Radagon of the Golden Order (v5.7)
The last and hardest of the bosses (difficulty 5): tall and lean, grey skin cracked like stone, long red hair, the Elden Ring burning gold on his chest, and Marika's stone hammer seeping golden light. One long health bar (5200), his name at the bottom of the screen.

- **Hammer** (it glints: parry it): a two- or three-hit sweep combo ending in an overhead slam, and a quick foot stomp into a fast chop. Three parries break his stance.
- **Holy light** (cannot be parried, can be blocked): spears of golden lightning thrown at range (far away, two more follow; drink a flask at range and one comes at once), and the **Rune Shockwave Slam**: a long pause, a slam that etches a glowing rune on the floor, and 1.5 s later a pillar of light erupts there. Stand behind his hips, or out of the rune.
- **Teleports**: a golden burst where he leaves and where he appears, both of which hurt. He reappears in front of you and sweeps at once, or shifts far away and throws a spear.
- **Golden Grab**: his charge must be rolled sideways; if it misses he is open for a long time.
- **At 60%** he opens with the **Gold Breaker** (a high leap, a long hang, a slam with a wide shockwave; he stays down after), and adds the **Elden Shattering** (a line of shockwaves, a wide half-circle, then a leap and a blast all round him; the first two can be jumped; punish only after the third), a golden spear thrust whose line bursts a second later, and a teleport slam. He attacks sooner.

## Controls

| Action | Keys | Gamepad (Xbox / PlayStation) |
|---|---|---|
| Move | W A S D / Arrow keys | Left stick (analog: tilt slightly to walk slowly) |
| Camera | Mouse (click the view to capture it) | Right stick |
| Jump (costs stamina) | Space | A / ✕ |
| Roll | Shift | B / ○ |
| Light attack (in front of a kneeling enemy: execute) | J / Left mouse | RB / R1 |
| Heavy attack | K / Right mouse | RT / R2 |
| Jump attack | Light or heavy while airborne | Light or heavy while airborne |
| Block (hold) | L / C | LB / L1 |
| Parry | E | LT / L2 |
| Lock-on | Q | Right stick click (R3) |
| Switch target | Tab (the nearest enemy in front, then the next further away) | Flick the right stick left or right |
| Zoom | Mouse wheel / = and - | D-pad up / down |
| Rest at bonfire | F | Y / △ |
| Use flask | G | X / □ |
| Talk / read | T | D-pad right |
| Restart fight / level (not in Story mode) | R, twice (once on the death or victory screen) | View / Share, twice |
| Pause and options (incl. Graphics: High / Low) | Escape | Menu / Options |
| Help / hitboxes | F1 (H toggles hitboxes) | — |
| Menus | Arrows or W/S, Enter, Escape | D-pad or left stick, A / ✕, B / ○ |

On-screen prompts show keys or gamepad buttons, whichever you used last.

! IMPORTANT ! More controls and features exist, this list was only used for the prototyping versions of the game

## Testing

Open the page with `#dev` at the end of the address (`combat-arena-3d.html#dev`). That adds the Test Grounds menu (developer rooms and test duels) and loads the automated tests. In the browser console (F12), run:

```js
await __arena.tests.run()
```

It plays the real game with a manual clock (scripted movement, no rendering delay) and prints `N/N passed`. `__arena.tests.run('heights')` runs only the tests whose name contains a word.

Story shortcuts (`#dev`): the main menu adds **Story: jump to a level** (a fresh story starting at any level) and **Story: clear the save**. From the console: `__arena.story`.

Level 5 shortcuts (`#dev`): **Test Grounds** lists jumps to the field and to each of Level 5's bonfires (the fights before them already won). In a fight, **F10** empties the current boss bar (starts Aldric's retreat, his phase change, or his death and the ending).

Elden Ring Bosses (`#dev`): `__arena.elden.start('margit')`, `('godrick')`, `('crucibleKnight')`, `('morgott')` or `('radagon')` starts a fight from the console; **F10** empties the bar, **F4** breaks the stance. Tests: `run('Elden')`, `run('Godrick')`, `run('Crucible')`, `run('Morgott')`, `run('Radagon')`.

Lore shortcuts (`#dev`): **Test Grounds** lists **Lore: Ysolde in ...**, one jump per level that starts it next to her. From the console: `__arena.lore`, `__arena.LORE`.

Developer viewers (open with `#dev`): **F8** shows the texture library, **F9** the model lab (four views and a silhouette test; step through each attack and reaction; toggle the `elite` variant). From the console: `MODELLAB.open('ironKnight')`.

## Adding content

The game data lives in `js/data/` and `js/levels/` and is checked when the page loads; a broken reference shows a readable error instead of starting.

- **Enemies:** add an entry with a unique `id` to `ENEMY_DEFS` (any position). Animations, weapons and idle styles must exist in `ANIMS`, `WEAPONS` and `IDLE_STYLES`. Attacks get their look from `pose` (key poses in `js/data/attack-poses.js`) plus `tracking`, glint `markers` and optional `hold`: see CLAUDE.md.
- **Models:** give an enemy `model: '<id>'` and describe its look in `js/data/models*.js` (proportions, posture, material slots, parts from `KIT_PARTS`, a weapon from `KIT_WEAPONS`; a model can `extends` another). Textures are recipes in `js/data/textures.js`. A level placement can add `variant: 'elite'` for a darker, spiked, auraed version. See CLAUDE.md.
- **Sounds:** every sound is a recipe of noise and tone layers in `js/data/audio.js`, built live by the engine in `js/audio.js` (no audio files). Add a recipe, then play it from an event listener at the bottom of `js/audio.js`. Sound volume is in Options.
- **Levels:** add a file to `js/levels/`, list it in `GAME_FILES` in `combat-arena-3d.html`, and add the level to `LEVELS` in `js/data/levels.js`. Zones, alcoves and enemies refer to each other by id. Room levels can add houses, props (kinds in `js/data/props.js`) and barricade gates; see CLAUDE.md.
- **Items:** add to `ITEMS` and to `PLAYER_DEF.inventory`.
- **Lore:** the story's source of truth is `LORE.md`. Dialogues, inscriptions, scenes and the ending cards are data in `js/data/lore.js`; write them in LORE.md first. See CLAUDE.md.
- **Story mode:** to put a level in the campaign, add a chapter `{ level, title, line }` where it falls in `STORY.chapters` (`js/data/story.js`). See CLAUDE.md for the save format.
