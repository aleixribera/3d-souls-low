# Combat Arena 3D — v7.8.10: Enemy Glow Recovery

**v7.8.10:** Enemy posture-break flashes and hit recoil now fade correctly in multiplayer, including during execution holds and gaps in enemy playback. All enemies and bosses share the same feedback countdowns as solo play. See [the fix and checks](docs/enemy-feedback-v7.8.10.md).

**v7.8.9:** An experience audit improves menu readability in short and narrow windows, keyboard focus and navigation, safe solo pause on focus loss, controller recovery, and mouse attacks when pointer capture is refused. Camera shake has its own option. Settings and checkpoints reject malformed data safely, failed saves give a brief notice, and shader warm-up finishes pending variants before character cleanup. The two roads, lore, combat timings and visual identity are preserved. See [the audit](docs/experience-audit-v7.8.9.md).

**v7.8.8:** A redesigned public lobby puts the adventure and Start action first, with a compact party list, optional controls and management, and direct access to Options. Clearer connection recovery, keyboard/controller focus, a quieter online HUD, smoother teammate walking and spectator-centered audio improve the full co-op flow. Controls tips no longer replay between bosses or chapters. See [the audit](docs/public-lobby-polish-v7.8.8.md).

A Souls-like 3D action game that runs straight from one HTML file in your browser (Three.js from a CDN, no build step, nothing to download or install). Open `combat-arena-3d.html` and play.

**v7.8.7:** A translucent controls panel shows Attack, Heavy attack, Dodge, Jump, Heal and Lock on for the first 30 seconds of play. It follows keyboard/controller input and stays hidden in the tutorial. The alternate Story V2 road and its encounter tuning have been removed; Ashmere and the Lands Between remain the two campaigns. BOSS ONLY remains the public lobby default.

**v7.8.6:** BOSS ONLY is now the default selected adventure when joining the public lobby. Both stories remain available in the dropdown.

**v7.8.5:** Gold opening screens now show only the selected mode and one short goal.

**v7.8.4:** Public-lobby teammates now have health bars beneath their world nameplates and in the players-alive panel. They update with damage, healing and revival, and remain visible while spectating.

**v7.8.3:** New public story and BOSS ONLY runs begin with a gold five-second opening ceremony: a glowing crest, drifting embers, and a distinct title for each road. Combat waits for the whole party to finish loading and see the opening. Chapter travel and late joins keep their normal flow.

**v7.8.2:** Returning to an abandoned public lobby now shows the adventure controls. The last deliberate leave clears the run immediately; connection drops keep a 60-second reconnect window. Parties with players still connected keep their progress.

**v7.8.1:** Team wipes now get a dramatic four-second crimson death screen with the defeated-boss count before returning the party to the lobby.

**v7.8.0:** BOSS ONLY replaces individual public-lobby boss choices with a twelve-boss gauntlet. Fallen players automatically spectate without pause, and a compact panel tracks who is alive. Each boss waits three seconds after everyone loads. Victory advances the party after five seconds with full health and flasks; a team wipe returns everyone to the lobby to retry from boss one. See [the release notes](docs/boss-only-v7.8.0.md).

**v7.7.9:** The public lobby Adventure dropdown offers Story 1 (Ashmere), Story 2 (Lands), and boss fights. Individual levels are no longer listed. Story 2 remains selected by default.

**v7.7.8:** Escape and the controller Menu/Options button now open the normal pause menu during public games, including while spectating. Choose Lobby for player and leader controls, Options for settings, or Leave lobby to return to solo play. The online world keeps running while menus are open.

**v7.7.7:** Lobby name editing now starts from the name field: type directly with mouse/keyboard, or focus it and press A/Cross to open the controller keyboard. The separate Edit name button and Y/Triangle shortcut are removed.

**v7.7.6:** Public lobbies now support full controller navigation, an adventure picker and an on-screen name keyboard. The current story level number is visible during play; arena choices contain bosses only. Boss attempts restart after a full team wipe, and defeated players automatically spectate a surviving teammate's camera with mouse, keyboard or controller switching. Lobby reconnects preserve shared progress. See [the release notes](docs/public-lobby-v7.7.6.md).

**v7.7.5:** The public lobby shows basic controls and a stamina tip before play. Bindings follow the active keyboard/mouse or controller input, with a single-column layout on small screens.

**v7.7.4:** The public lobby defaults to the full eight-chapter Elden Ring campaign. Start together in Stormhill; completed chapters automatically carry the party through the story to the Haligtree, its ending and credits. Late joins and chapter restarts preserve the current campaign, and solo saves stay separate. See [the campaign and update guide](docs/campaign-v7.7.4.md).

**v7.7.3:** After five minutes without player input, leadership passes to another active player. The inactive player stays connected and the current run continues. If everyone is idle, the next person to provide input becomes leader. See [the behavior and update command](docs/lobby-leader-v7.7.3.md).

**v7.7.2:** Releases publish a ready-to-run container to GitHub Container Registry. Update your homelab with `docker compose pull && docker compose up -d`; an optional timer checks every 15 minutes and defers while players are connected. See the [one-time switch and update guide](docs/container-updates.md).

**v7.7.1:** Fixes accumulating co-op playback delay, server simulation overhead, gate/barricade animations and obstacle hunting. Shared updates use compressed changes instead of repeated full snapshots; the HUD separates ping from playback delay. See the [release notes](docs/multiplayer-v7.7.1.md) and [exact update commands for your Ubuntu server on port 3080](docs/update-v7.7.1.md).

**v7.7:** **Join public lobby** connects to one co-op lobby on the home server. Play any level or arena opponent together, with leader controls, shared enemies and health bars, late joins and individual checkpoint respawns. Personal movement and defensive outcomes run immediately on each player's browser. Hosting uses Docker Compose and a public Tailscale Funnel link; see [the Ubuntu server setup](docs/homelab-multiplayer.md) and [the multiplayer design](docs/multiplayer-v7.7.md). Solo play still opens directly from the HTML file; multiplayer requires the server.

**v7.4:** Subtle, stationary pockets of golden motes flow toward the next bonfire across both campaigns. Routes follow doorways, stairs and scripted drops, advance at bonfires, and resume from your checkpoint. Lightning lights the scenery and characters directionally. Spectral weapons, flame breath, holy runes, crimson effects and projectiles illuminate nearby surfaces on every graphics preset through a small shared light pool. Light attacks now deal 24 damage each (72 per combo); heavy and execution damage are preserved. See [the release notes](docs/guiding-light-v7.4.md).

**v7.3.2:** Fullscreen now lives in the existing startup script. The game no longer requests a separate `js/fullscreen.js`, avoiding the startup error when that request is blocked or the new file is absent from a local copy. Fullscreen behavior is unchanged. Script cache keys are updated for this release.

**v7.3.1:** Fullscreen starts on the first click or key press; Escape exits, and Options can turn it on again. Story shows both campaigns’ **Continue** and **New** actions together, with **Tutorial: On/Off**. New starts playing directly; replacing a save asks once. Jump attacks and executions keep their full instructions visible. The tutorial bonfire has a direction arrow and distance, including a “Turn around” cue when it is behind you. Melee enemies with projectile moves auto-lock normally; archers and Toll Wisps still require manual targeting. See [the release notes](docs/onboarding-v7.3.1.md).

**v7.3:** Shorter tutorial prompts, with complete action sequences kept together since v7.3.1. Camera zoom controls are removed. Stamina regenerates 20% faster with the same cooldowns and delays. Rising enemies take normal poise and stagger-meter damage. Jump attacks deal more damage (light 28, heavy 74), and jump heavies fill guard/stagger meters as heavy attacks. Aldric's leap landing shockwaves can be jumped. All enemies and bosses use the same parry rules for their warning glow: red means parryable; blue means unparryable (some blue attacks can still be blocked).

**v7.1:** Auto now tests real game character models and lit 3D scenery at each preset’s actual resolution, including MSAA, bloom and Ultra shadow/depth work. It no longer extrapolates from a tiny shader score or rejects dedicated GPUs because of browser CPU/RAM hints. Check graphics again shows the detected GPU, measured frame cost and reason for the result. See [the benchmark notes](docs/auto-quality-v7.1.md).

**v7.0.5:** refreshed script cache keys ensure the desktop Auto correction actually reaches existing browsers. Options now offers **Check graphics again**; returning to Auto also runs a fresh check. Benchmark results are kept only for the current page.

**v7.0.4:** Auto's Ultra cutoff is recalibrated for recognized strong GPUs after the RTX 5060 was incorrectly assigned High at high pixel density. The conservative laptop rules and High cutoff are unchanged. See [the desktop calibration](docs/auto-quality-v7.0.4.md).

**v7.0.3:** keyboard and controller menu selection stays on the intended option when the list scrolls beneath a stationary mouse pointer. Mouse movement and clicks still select options normally.

**v7.0.2:** arrival guides stand visibly along the route; archers and mages require manual lock-on; tree glow no longer blacks out High or Ultra views; Stormveil corridor walls and the Ashen Capital cellar walls are restored. Levels now groups Ashmere and the Lands Between separately, without the tutorial.

**v7.0.1:** Auto graphics is more conservative on laptops: older integrated GPUs and limited CPU/RAM start on Low; higher presets require faster benchmark results and account for resolution and pixel density. Saved manual choices remain unchanged. See [the Auto selector notes](docs/auto-quality-v7.0.1.md).

**v7.0:** a second Story road, **The Lands Between: The Elden Throne** — eight new lands, one for each Elden Ring boss, from the storm over Stormhill to the scarlet rot under the Haligtree, with eight new enemies, a new guide and its own ending. The main menu is tidier: **Story** holds both roads, and **1v1 Arena** holds the Enemies, Ashmere's Bosses and the Elden Ring Bosses.

**v6.2:** doubled health and borrowed Elden Ring moves for the three story bosses before Aldric, with the Bell Warden's Skyfall area shockwave removed for balance. Low graphics now render at native resolution, with shared texture maps, simpler character shaders and improved loading.

**The story.** Ashmere was green once. Now ash falls on it from a sky that never clears, and its king keeps a prison under his castle. You wake in one of its cells with no memory of how you came there. You break out of the Long Hall and the Sunken Keep, fight through Corvel, the river town the invaders burned, and climb the old watchtower to ring the Bell of Waking: by the old law, whoever rings it calls the king out to answer. In the last level he answers. Five levels, a tutorial, three bosses before the last, and an ending.

**The second road (v7.0).** The Elden Ring lies shattered and the demigods who took its shards have gone mad. Grace calls you back from death, a nameless Tarnished, to cross eight lands to the Elden Throne: **Stormhill** (Margit, the Fell Omen, at Stormveil's gate), **Stormveil Castle** (Godrick the Grafted), **the Stormhill Evergaol** (the Crucible Knight), **Leyndell, Royal Capital** (Morgott, the Omen King), **Leyndell, Ashen Capital** (Godfrey, First Elden Lord), **Crumbling Farum Azula** (Maliketh, the Black Blade), **the Elden Throne** (Radagon of the Golden Order) and **the Haligtree** (Malenia, Blade of Miquella). Harder than Ashmere from its first step, and harder land by land. **Seren, the Grace-Bearer** waits by the first bonfire of every land with her lantern — press **Talk** (the bonfire key) to hear her — and messages left by other Tarnished glow on the ground to be read. See the Story menu.

**A fellow prisoner.** In the cell beside yours waits **Ysolde of Corvel**, and you will meet her again in every level, always somewhere safe, near a bonfire. Walk up and press **Talk** once: she speaks as subtitles at the bottom of the screen, line after line, while you keep full control (walk, look round, rest). Walk away or let an enemy find you and her words fade; come back and Talk to hear her again. A few carved stones, plaques and statues can be read the same way, and the levels hold small scenes that tell what happened there without a word. All of it is optional; none of it blocks the road. There are no items to collect and no journal: what you learn, you have to remember.

Keyboard and mouse, or a gamepad (standard Xbox-style layout). There are no touch controls. The game plays best with a gamepad: every level and duel opens on a short loading screen that says so, with a small controller icon. The version shows in the bottom-right corner of the menus.

## Modes

The main menu: **Story** (choose a road), **1v1 Arena** (Enemies, Bosses, Elden Ring Bosses), **Levels** (any level on its own, Ashmere's and the Lands Between's) and **Options**.

- **Story → The Lands Between: The Elden Throne** (v7.0) — the second road, eight lands for players who have walked Ashmere (it offers the tutorial too). Every land is a long level with three bonfires, its own fights, a fog gate and an Elden Ring boss at its end; a grace beam rises over every bonfire so you can see the way on from afar. Each land brings one new enemy that fights with some of its boss's moves, and later lands bring them back. More flasks with every land (6 at Stormhill, 9 by the end). Its own save slot: Continue on one road never touches the other. The Haligtree's boss ends the road with its own ending and credits.
- **Story → Ashmere: The Gaoler King** (the first road) — the whole of Ashmere as one campaign. **Tutorial: On** starts with training; **Off** starts Level 1 (training can also be skipped from pause), then runs Level 1 → 5 without stopping: each level fades to black and opens on its title (THE BURNING TOWN) and a line of story while it loads. Aldric's death brings the ending, the credits and STORY COMPLETE. The game saves itself in your browser on every rest at a bonfire, at the start of every level and when you quit to the menu; **Continue** puts you back at the last bonfire you rested at, with everything you had beaten there still beaten and every shortcut still open. **New** asks before it overwrites a save. Nothing is downloaded and there is no account; in a private window the story still plays, it just isn't saved. In Story mode there is no restart key: death takes you back to the bonfire.
- **Story → New (Tutorial: On)** — practice one action at a time on training dummies. Learn to lock on before attacking, then block, parry red attacks, roll through the blue dodge dummy's swing, and execute a kneeling target. Each prompt keeps the whole action sequence visible. A compass points to the bonfire, even behind you. Story mode plays the same tutorial.
- **Levels → Ashmere → Level 1: The Long Hall** — four gated opponents in order, optional enemies in between, two bonfires.
- **Levels → Ashmere → Level 2: The Sunken Keep** — rooms joined by corridors, four room fights (two of them against pairs), the Shield Warden, two bonfires.
- **Levels → Ashmere → Level 3: The Burning Town** — the town below the Tower, sacked and set alight by the invaders, at sunset. About 10 minutes, climbing in terraces from the lower gate (where the Keep comes out) to the upper town gate, with a massive castle on the horizon ahead, the sun setting behind it. Street by street, each fight's barricade falls once it is won: a lone Ashen Lancer, the sacked market, a Lancer below with an optional Rampart Bowman on a balcony above (reached through the stair house; jump its low rail to drop back down), a Pale Duelist round a bend in an alley, the fountain square, and the church square under a Bowman on the church gallery. The Pillager Captain holds the upper square. Two bonfires (the second in the tavern), a shortcut stair from the fountain square down to the first, a sleeping Knight in a yard, and one drop that hurts.
- **Levels → Ashmere → Level 4: The Tower** — a cliff-top keep, about 15 minutes: a gatehouse, then a passage toward a bonfire glowing behind a portcullis, until its floor gives way into the undercroft: an ambush of two Hollows and an Executioner, whose gate opens on the stairs up to that bonfire. Then a crowd fight in an open courtyard under rampart archers, the ramparts, the Executioner in the tower hall, a postern shortcut, walkways spiralling up the outside of the tower over the courtyard and the cliff, and the Bell Warden on top. Four bonfires.
- **Levels → Ashmere → Level 5: The Final Castle** — the longest level and the game's final test, about 30–40 minutes on a first run. It opens straight into the fight with **Aldric, the Gaoler King** on the field before his castle; break him and he leaps onto his walls and is gone, his gate gives way, and the first bonfire lights. Then the outer ward (a courtyard under a wall walk of archers, the barracks and their shortcut, and the **Empty Sentinel** holding the moat bridge), the inner keep (the great hall and its kitchen, the ramparts with Gargoyles on the walk), and the throne approach (an ash bridge under Toll Wisps, then the processional gauntlet). You glimpse Aldric twice on the way. Four bonfires; the last is a short run from the fog at the throne room door. In the throne room he fights again, and when his bar breaks the bell tolls, the glass bursts, the pillars fall and he rises as **Aldric, the Ember-Crowned**: a new bar, new attacks and fire. Beat him for the ending and the credits.
- **1v1 Arena → Enemies** — duel a single common foe in the arena: Ashmere's and the eight new ones of the Lands Between. **1v1 Arena → Bosses** — Ashmere's bosses. Before v7.0 the Enemies list held both, including the Ashen Lancer, Executioner, Pale Duelist, Rampart Bowman, Shover, Gargoyle, Empty Sentinel, Toll Wisp, the Pillager Captain, the Bell Warden and Aldric (his throne room fight, both bars).
- **1v1 Arena → Elden Ring Bosses** (v5.3) — a boss select of fights inspired by Elden Ring, one card each (name, title, difficulty), fought one on one in the Enemies arena. Win (ENEMY FELLED) or die, then choose **Retry** or **Boss select**. Eight bosses so far: **Margit, the Fell Omen**, **Godrick the Grafted**, the **Crucible Knight**, **Morgott, the Omen King**, **Godfrey, First Elden Lord**, **Radagon of the Golden Order**, **Maliketh, the Black Blade** and **Malenia, Blade of Miquella** (see below). Outside the story of Ashmere.

## The Lands Between (v7.0)

| Land | The place | Its new enemy |
|---|---|---|
| 1. Stormhill | A storm over the heath under the golden Erdtree; the Stormgate gorge (two Rogues lie among the dead); a cliff path with no rail, Margit watching from above; the gate bridge. | **Omenkin** — a lesser Omen, horned and hunched: delayed cane swings, daggers of light, a leaping plunge, a tail behind. |
| 2. Stormveil Castle | Rain and lightning. The main gate is barred: the side path along the sea cliffs, where things crouch on the wall; the walled cliff corridor and rampart; the grafting hall; Godrick on the tower roof. | **Grafted Scion** — a gold mask crowned with knife-rays and a blade in every sewn-on hand; low, fast, it rampages side to side and pounces from the walls. |
| 3. The Stormhill Evergaol | A prison of stars: stone cells hung in a night sky with rune circles on their floors, bridges with no rail, floating rocks with Toll Wisps on them. | **Crucible Squire** — dark bronze, a horned helm, a little shield that turns blows (and earns a bash), a stomp that runs along the floor, a golden tail. |
| 4. Leyndell, Royal Capital | The golden city: lit houses, falling golden leaves, a fountain plaza under archers, the grand stair, a giant root of the Erdtree over a chasm, the Elden Throne's court. | **Leyndell Knight** — white-gold plate and a great plume, the Erdtree on its breast: a delayed overhead and thrust, a conjured golden spear (charged or thrown). |
| 5. Leyndell, Ashen Capital | The same city burned: ash falling like snow, embers in the ground; the market lane gives way under you into the cellars (an ambush); the throne in ash. | **Ashen Warrior** — a vast ashen champion with fire in its veins and a lion's head for a hood: a stomp that cracks the floor ahead (jump it), a triple smash, a claw flurry. |
| 6. Crumbling Farum Azula | Ruins adrift over a sea of cloud at an endless sunset, a dragon circling, lightning below; a colonnade that crumbles; a long bridge with no rail. | **Beastman of Farum Azula** — a wolfish beast-man: four quick cuts, flung stones, a line of shockwaves clawed from the earth, leaps from the ruins. |
| 7. The Elden Throne | Inside the burnt Erdtree, still shining: hollows of golden wood, roots over a golden abyss, rings of light in the air. | **Golden Zealot** — white and gold, a mitre and a halo: Marika's hammer, spears of holy light, a vanishing strike, a rune slam that erupts. |
| 8. The Haligtree | High in the frozen boughs (snow, pale gold leaves, no rail), then down through Elphael into courts flooded with scarlet rot that eats at your feet; Malenia by the lake. | **Cleanrot Knight** — gold worked like feathers, a crimson tassel, rot blooming on the plate: a thrust from far off, a spear flurry, a rot geyser; it heals a little with each blow it lands. |

Every land also mixes in Ashmere's foes (often in their stronger **elite** form). Each has its own sky and weather on every preset — storms with lightning, rain, stars and a mist band, falling golden leaves, ash and embers, a sea of clouds, snow and scarlet petals — and a colossal sight on the horizon (the Erdtree, burnt or golden, the Haligtree, the castle). Low keeps them light (a quarter of the particles, fewer distant pieces); Ultra draws more.

## Graphics: Ultra (v6.0)

**Options → Graphics** offers **Auto**, Low, High and **Ultra**. On the very first launch the game tests your graphics card for a moment and picks a preset for you (Auto), and says so on the title screen; you can change it at any time in Options (on the title screen or in the pause menu). Options with ‹ › arrows can be stepped either way.

Auto now favors smooth play on weaker laptops. Older integrated graphics start on Low, modern integrated graphics can earn High, and dedicated or unrecognized GPUs can earn Ultra by passing the 3D frame test. A saved Auto choice is reassessed when the page reloads; an explicit Low, High or Ultra choice stays as you set it.

**Low** renders at 100% resolution with a pixel ratio capped at 1. Shared surface maps, simpler character shader work and faster loading preserve its existing model and texture detail. Enemies, hidden boss phases and required attack effects are prepared before gameplay. See [the LOW performance audit](docs/low-performance-audit.md) for measurements and limits.

**High** is the balanced preset: modern sparks, blood, weapon ribbons and elemental boss effects with smaller decorative budgets; intermediate player/boss geometry, native textures, cached metal reflections and fine grain. It retains 100% resolution, the 1.5 pixel-ratio cap, 4× anti-aliasing, full scenery and eight stage lights. Menu preparation focuses on the player, and a small loading render prepares the selected cast, hidden phases and effects before play. Shadows, ambient occlusion, volumetrics, ambient procedural fire and screen refraction remain exclusive to Ultra. See [the HIGH review](docs/high-quality-report.md).

**Ultra** is for a dedicated graphics card: real moon shadows; ambient occlusion in every corner; light that glows in the fog round torches and braziers, and shafts of moonlight through the ruins outdoors; reflections on armour and steel; smooth, sculpted character models. Combat gets its own effects: steel sparks off a guard, blood that sprays and stains the floor, shockwaves that bend the air on heavy blows, star flares on parries, flashes of light, dust and flying stone from slams, smooth glowing weapon trails, souls rising from the fallen. Every boss has its own element (holy light, fire, blood, scarlet rot, the Black Blade's crimson, storm winds, earth), and each attack shows it: power gathering in the weapon before a heavy blow, light pillars, rings of fire, blood geysers, rot blooming, whirlwinds and roars that shake the arena. Gates grind and throw sparks, barricades burst into splinters, collapsing floors rain stone, and bonfires flare up as they catch.

The performance pass removes torch cube shadows and full-screen lens blur, uses softer bloom at half resolution and 4× anti-aliasing, and reduces excess model subdivision. Model buffers preserve shared vertices, textures use their native 256/512px resolution, and character meshes and Ultra boss effects are prepared while loading. See [the performance audit](docs/performance-audit.md) for measurements, tradeoffs and verification.

Every preset also gets the v6.0 changes: a closer camera that leads into your movement, gentle camera motion with your swings, rolls and the blows you take (**Options → Camera motion** turns it off), a remade player model, remade armour and cloth for every enemy and boss (sloped shoulders, riveted layered pauldrons, plate lames, folded capes and torn cloth, spiral bandages, helms with eye slits), the Giant Skeleton rebuilt bone by bone, Godrick's grafted arms, Margit's tail, sculpted torsos for Radagon and Godfrey and a fitted cuirass for Malenia, calmer floors and walls, better-lit levels (the Tutorial, the Long Hall, the Sunken Keep, the Tower and the field before the Final Castle), a lighter and faster menu, and a level's title card that shows at once while it loads.

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

- An execution deals 90 damage to normal enemies; a healthy enemy can survive it.
- Bosses take 324 damage before critical resistance, never more than half a bar. Boss health bars are twice as long as before and their posture drains half as fast, so a boss fight is a long, hard duel; a bonfire always waits before it. If that empties the bar, the boss falls, changes phase or retreats once the execution is over, never in the middle of it.
- You can't be hurt during an execution, by anything, and for a moment after it. Other enemies keep fighting, so look around when you stand up.
- From behind, from the side or too far away, light attack is just a light attack. If you wait too long, the enemy gets back up.

## Combat (v4.2: Weight of Steel)

Every attack now has four phases: wind-up, strike (the only moment it can hit), follow-through and recovery, drawn from whole-body key poses.

- **You:** a three-hit light combo (24 damage per hit, 72 total, at 16 stamina per hit); a heavy dealing 53 damage for 40 stamina that you can hold to charge (the body coils, trembles and glows at full charge, up to 1.5x damage); only a slight steer during a wind-up; a roll only cancels a swing in its recovery. One Souls-style input buffer: a press is kept only near the end of what you're doing, and the latest press wins.
- **Enemies:** they turn to track you early in a wind-up, then lock their aim (the commit point): dodge sideways after that and the blow won't follow. Red warning glows mean a strike can be parried; blue means it cannot. A blade glint marks the exact moment the parry window opens. Some blue strikes can be blocked; rolling works against both types. Some enemies hold a wind-up still to bait a roll (delayed attacks). Combos end on their biggest wind-up, and big misses leave a punishable recovery. Bosses use larger, slower, more dramatic versions.
- **Impact:** hit-pause and a shudder on the body you hit, camera shake scaled by the blow, weapon trails during strikes, cloth that swings with the body, flinches sized to the damage, staggers and parries that throw the body open, and walking that leans with acceleration and turns.
- **Dev keys** (`#dev`): **F4** fills the nearest enemy's stagger, guard or posture meter (it kneels at once, ready to execute), **F6** slow motion (25%), **F7** tracking colours (yellow = still turning, red = committed) and your attack phase; **H** hitboxes.

Timings before and after are in `docs/combat-timings-v4.1.md`.

## Bosses

Every boss can be broken and executed (see Executions).

- **Giant Skeleton** (Level 1, the last of the Long Hall's gated fights) — **1920 HP** (doubled). A towering ruin of bone with a thigh-bone club: slow sweeps and a stomp, plus one new move, **Bonebreaker Chain** (Godfrey's Triple Axe Combo). Block or roll the chain's two sweeps and delayed chop; punish after the last blow.
- **Pillager Captain** (Level 3) — **1800 HP** (doubled). Halberd thrusts from afar, a three-cut combo to parry, a burning overhead to roll, plus two new moves: **Dragging Halberd** (Godrick's Dragging Slash) and **Double Halberd Spin** (the Crucible Knight's Double Spin Slash). Block or roll the drag; the double spin can also be parried. Punish after the last cut.
- **Bell Warden** (Level 4) — **2600 HP** (doubled). A bronze colossus with a temple bell for a hammer: sweeps, an unblockable slam, a push off the tower, a charge, plus two new moves: **Bell Hammer Chain** and **Stomp and Toll**, taken from Radagon's Hammer Combo and Foot Stomp/Overhead Chop. Both can be parried. The Skyfall Toll area shockwave has been removed.
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

## Godfrey, First Elden Lord (v5.9)

A towering lord with a giant axe and the ghostly lion Serosh on his back. One bar of 4400 HP; nothing he does can be parried.

- **Phase 1:** stomps that send cracked rock along the floor (jump or roll them) and go straight into an axe swing, a leap across the arena onto his axe, an axe planted in the earth that splits a long line ahead of him after a pause (step to the side), a three-swing combo with a delayed chop, a smash-spin-smash, and a dashing upward hoist. At 78% his **Regal Roar**: from then on his stomps ring out all round him.
- **At 40% health** he casts off Serosh, his armour and his axe (untouchable while he does) and fights bare-handed as **Hoarah Loux, Warrior**: running and lunging grabs you cannot block (roll them), an Earthshaker of two shockwaves, a claw flurry, a double stomp. At 20% his Rage makes the stomps reach across the arena.

## Maliketh, the Black Blade (v5.8)

Two fights on one bar of 4600 HP. First the **Beast Clergyman**: a hooded beast-priest with a broad dagger and the earth in his claws. Nothing he does can be parried.

- **Phase 1:** quick strings of four dagger cuts (stand right under him afterwards and he somersaults away flinging pebbles), a shotgun fan of pebbles, a boulder heaved overhead and lobbed (a long opening up close), a line of shockwaves torn through the floor and a ring of them all round him (jump or roll them), a lunging sweep into a stab and an uplift of rocks. Drink a flask at range and he slings at you.
- **At 50% health** he tears off his robes (untouchable while he does) and becomes **Maliketh, the Black Blade**: black armour, a wild grey mane and a black greatsword seamed with crimson light. Faster and longer-reaching: he leaps back flinging crimson waves, then corkscrews down at you or plants the blade and unleashes a **sphere of a thousand cuts** in front of it (get behind him: safe and wide open), a held two-handed slam whose line explodes a second later (stand at his side), a spinning sweep and backflip, and a sweeping slash if you are behind him.
- **Destined Death:** every Black Blade hit that you do not block cuts your maximum health by 12% for 15 seconds (shown as a striped crimson end on your health bar; flasks cannot heal past it) and drains a little more. A new hit restarts it; it never stacks.
- **Parry:** only his **golden** attacks (the corkscrew dive and the spinning sweep, which flash gold) can be parried, and a parry stuns him for a long time.

## Malenia, Blade of Miquella (v5.9)

The hardest fight in the game. A slender knight in a gold winged helm with a long red mane, a crimson cape and a gold prosthetic arm, wielding a long katana. Two bars: 4000 HP, then the Goddess of Rot at 80 % of 4500.

- **Lifesteal:** every blow she lands heals her, **even on your shield**. Roll, don't block.
- **Phase 1:** a sparking prosthesis into three quick cuts and a delayed fourth sweep, a long lunging thrust (also the moment you drink), an unblockable lunging grab (roll it: a miss leaves her wide open), a leaping slam into a rising sweep, a rising cut into a slam, and a counter-kick if you trade blows with her.
- **Waterfowl Dance** (from 75 % health): she leaps and hangs in the air for two seconds. **Run** from the first flurry, **roll through** the dash spin and the flip, and punish the long pause after the last bubble bursts. Take every cut and it kills.
- **The Goddess of Rot:** beaten once, she kneels, sheds her helm and rises with scarlet wings, faster and relentless. **Scarlet Aeonia**: she dives and a scarlet flower blooms around her for a few seconds (get out; strike as it wilts). **Phantom Spirits**: five scarlet phantom blows, then she dives in herself. Her slams burst into rot geysers a beat later: punish from behind.
- **Parry:** her grounded katana blows glint and can be parried; three parries break her. The dance, the grab, the kick and everything scarlet cannot.

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

Story shortcuts (`#dev`): the main menu adds **Story: jump to a level** (a fresh story starting at any level of either road) and **Story: clear the saves**. From the console: `__arena.story` (`story.use('lands')` picks the second road).

The Lands Between (`#dev`): **Test Grounds** lists jumps to each land's second and last bonfire (the fights before them already won) and **Lore: Seren in ...**. Tests: `run('Lands')` (every land walkable start to finish, a scripted run through every fight, no enemy stuck, every bonfire safe, every boss and fog gate, the rot, the ending, both saves), `run('Realms')`, `run('Menus')`.

Level 5 shortcuts (`#dev`): **Test Grounds** lists jumps to the field and to each of Level 5's bonfires (the fights before them already won). In a fight, **F10** empties the current boss bar (starts Aldric's retreat, his phase change, or his death and the ending).

Elden Ring Bosses (`#dev`): `__arena.elden.start('margit')`, `('godrick')`, `('crucibleKnight')`, `('morgott')`, `('godfrey')`, `('radagon')` `('maliketh')` or `('malenia')` starts a fight from the console; **F10** empties the bar, **F4** breaks the stance. Tests: `run('Elden')`, `run('Godrick')`, `run('Crucible')`, `run('Morgott')`, `run('Godfrey')`, `run('Radagon')`, `run('Maliketh')`, `run('Malenia')`.

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
- **Story mode:** to put a level in a campaign, add a chapter `{ level, title, line }` where it falls in `STORY.chapters` or `LANDS_STORY.chapters` (`js/data/story.js`). A new road is one more entry of `STORIES` with its own save key in `CONFIG.story.saveKeys`. See AGENTS.md for the save format.
- **Set pieces (v7.0):** a level's `realm` draws its sky and scenery (a colossal tree, stars, lightning, weather, a sea of clouds, floating ruins, a dragon, rings of light, rune circles, liquid pools, giant roots, flowers, grace beams, natural ground): see `js/realms.js`.
