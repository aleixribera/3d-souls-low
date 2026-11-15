# Plan

The order of work under `VISION.md`. Written by the director; the loop reads it every pass and doesn't edit it (cuts
and finds go to `BACKLOG.md`, questions to "Needs Aleix" in `STATE.md`). Decisions: the director's grilling with
Aleix, 2026-11-13.

## How the loop runs

- The bar for every item is `VISION.md`'s: AAA quality and polish, runs on a toaster, fun and challenging, makes
  players come back.
- **Anime action is the feel of every item** (Aleix, 2026-11-14), not only the player rework: how the player moves
  and strikes (item 3c), every ability's moment in the fight and its card (item 6), the bosses' moves and effects, the
  camera (hit-stop, kicks, a beat of slow motion on a perfect dodge), sound, and the reward moments. Each pass asks of
  what it built: does this make the player feel like an anime fighter directing techniques against a boss that tries
  to catch them off guard? A pass that ships something plain where a moment belongs hasn't met the bar.
- A pass has full authority over what it works on: balance, numbers, windows, frequency, the code underneath. If an
  item sits on a weak foundation (an old system, a stand-in, a shaky rule), the pass fixes or rebuilds that first, as
  part of the item, instead of building on top of it (the iterate skill now says the same).

- Aleix's feedback (`.claude/feedback.md`) comes first, always.
- Then the clean-up below, then **two tracks in parallel**: two passes at a time, one per track, each in its own git
  worktree, both merged into `main`. Never more than two passes; only one with a browser open at a time.
- Items in a track go in order. An item is done when its check is seen in the running game.
- A release whenever a pass ships something players notice: one entry in the in-game changelog, then the tag.

## Answers to "Needs Aleix"

- The Calling is renamed **Boss Rush** (track B, item 1).
- Group scaling goes (Aleix, 2026-11-13, replacing his earlier "keep it"): no enemy or boss scales with team size,
  anywhere. Boss Rush difficulty scales with fights won instead (track B, item 2).
- Bosses are damage sponges and bots never die (2026-11-13): short fights, bosses that press harder rather than last
  longer, bots that can fall (since overtaken: bots leave Boss Rush, item 9), and more reward moments (track B, item 2). Bots don't get sloppier as a run goes on: the
  bosses already get harder. No damage numbers. Some bosses have too much health in Story too: every boss's own
  health is set so a skilled solo player kills it fast, in the same item. Bosses are killable fast with skill but
  harder to face; the Boss Rush curve scales only their attack pace, never damage or health.
- The five blessings: removed; every ability is rebuilt from zero, first in a separate session, then by the loop
  (track B, item 6). The one name for them is **abilities**. Legendary ones are really spectacular, rare ones get
  effects and sounds too, smaller; the feel is anime techniques (2026-11-13).
- Allied bots leave Boss Rush (2026-11-13): it's you against the bosses, alone or with friends; summon abilities give
  the ally feeling instead (track B, items 9 and 6). Focus is dropped.
- Difficulty (2026-11-13): every boss is re-tuned so its own base speed is slower and roughly as hard as every other
  boss, 1v1, measured with the test bot; that new base is "1x". Boss Rush starts there, not too easy, and climbs
  faster than before: a skilled solo player falls around fight 10-12 without abilities, and only a rare great kit
  reaches about 20. Crowned bosses every 5 fights. Story tunes its own bosses for the player's experience, and its
  levels and some enemies need reworks (track B, item 10; track A, items 5 and 7).
- The coolest Boss Rush out there (Aleix, 2026-11-13, yes to all six of the director's ideas): revive a friend
  mid-fight and highlights on the end screen (track B, item 4; Focus later dropped); a Crowned boss every 5th fight
  (item 5; first every 10th); a weekly run with a friends' board (item 8). Pacts were in this list too and are
  removed (2026-11-13): runs are too short for them, they landed on the Crowned fights, and a vote screen is menu
  friction. A Crowned win offers a legendary instead; a voluntary harder-for-more choice waits until runs are
  played and someone asks for one, and would then be picked once before a run, never voted mid-run. Left out on purpose: damage numbers, stat upgrades between
  runs, a separate arena for every boss.
- The UI (2026-11-13): way better to use and look at, before Endless (track B, item 3). Not Souls-like references;
  mouse and keyboard first with full controller support; the best control for each job in one direction; a castle
  scene behind the menus. Later the same day, after seeing 20 mockup directions: the HUD in the game now is perfect
  and stays; the work is the ability cards and how they're presented, and the menus. Simple, functional menus in
  the approved lobby look; no reward effects (slams, glows, count-ups, shines).
- End-screen titles: plain English, the loop's wording.
- Chapters 6-14's words: the loop's draft stands. Story text is a draft the loop may rewrite.
- THE ROAD GOES ON stays until the ending ships; after that the story keeps growing until Aleix stops it.
- What replaces the Elden Ring bosses: nothing. Boss Rush, Practice and the lobby modes use the story's own bosses:
  Ashmere's five (Pillager Captain, Bell Warden, the Gaol Giant, Aldric, the Antlered Hunger) and chapters 7-14's
  (Ostrey, Hale and Harrow, the Ringer, Hollis, Oswin, Agathe, the Kindling Tree, the King's Blade).
- The player rework (Aleix, 2026-11-14): anime action instead of slow Souls action, abilities at the centre of the
  combat, manageable for friends playing for the first time on a laptop; all ten of the director's answers taken (see
  "The player rework" above). `VISION.md` changed with his OK. Then: urgent, the default for the whole game now,
  both tracks first, so he can play all of Story and Boss Rush on it.
- The player's movement and animation (Aleix, 2026-11-14): good, smooth, responsive, a bit anime; track A's focus
  in the player rework (item 3c).
- Ability keys (Aleix, 2026-11-14): pressed abilities each belong to one of the four number keys, always the same
  key; Boss Rush holds one per key, locked once chosen, and offers stop showing that key's others; triggered
  abilities stay frequent; Story gives four along the road, one per key (the player rework, item 3).
- Abilities (Aleix, 2026-11-14): way more spectacular, super cool, and a really wide pool (now 100 or more, below;
  track B, item 6).
- Fair attacks (Aleix, 2026-11-14): he hates the stomps (Earth Stomp worst): unclear wind-up, a big area that hurts
  from afar with no warning. Every attack must make sense and give time and sight to react; the challenge is the
  combos, never one impossible attack. Area attacks show their reach and stop tracking; the leap slams stay as they
  are (the player rework, item 4).
- Enemy movement (Aleix, 2026-11-14): reworked to fit the dash and to scale with Boss Rush's pace (item 4).
- The sparring scene (Aleix, 2026-11-14): played before the first boss, offered up to three times to players from
  before the rework, a Tutorial button in the lobby, clips on the Controls page (item 3d).
- Abilities (Aleix, 2026-11-14, again): 100 or more quality ones; spectacular in the fight first; cards simple, clean
  and cool, rarity-scaled, with a loop showing how each activates (track B, item 6).
- Boss Rush offline (Aleix, 2026-11-14): playable alone with no server, the same run, its rewards kept locally;
  multiplayer is Boss Rush only, so Single/Double/Triple/Quad Boss and co-op Story leave the lobby; the Weekly run
  stays (track B, items 1 and 8). `VISION.md` changed with his OK.
- More attacks can be deflected (Aleix, 2026-11-14): `noParry` only on ground area attacks, grabs and a boss's
  biggest moments, about a quarter at most (the player rework, item 4).
- After his run (Aleix, 2026-11-14): "the difficulty scaling is perfect now". One count, the fight; hidden meters
  go (guard, poise, rend), the counter window shows, the ability keys sit bottom centre, "Crowned in" goes; the
  modifiers named for what they do; the first pick a rare; momentum through attacks; legendaries OP, at one level,
  uncapped, the dragon the floor, but not "wins the fight by itself"; fewer plain stat buffs; Story's four abilities
  cool as fuck and the same all story ("Next, small" section, item 6, rework item 3).
- The stagger bar goes (Aleix, 2026-11-14): counters are the focus ("Next, small", item 2). Executions go; the
  Finishing Blow replaces them: the third counter in a short spell becomes a frozen-time multi-cut flash step.
- The showcase after updates (Aleix, 2026-11-15): plays for every player on their first launch of a new version, at
  most once a day, still unskippable (the showcase section, item 3).
- The showcase (Aleix, 2026-11-14): a 30-second live cinematic of the game at its best, before the sparring scene, not
  skippable, kept current by its beats' test, and recorded as a video with a WhatsApp version; built by its own session
  (its own section). `VISION.md`'s exception with his OK.
- The ability design (Aleix, 2026-11-14): its own session designs every ability with ChatGPT concept images, shown
  in a private gallery page; the loop builds them later (item 6). Textures and concept art may now use ChatGPT's
  image generation (`VISION.md` and his `CLAUDE.md` changed; the Claude-only texture skill removed).
- Art direction (Aleix, 2026-11-14): the ability design approach grows into the whole game's style: a game-wide style
  bible after the abilities, then concept sessions for the player, the bosses and the levels, one at a time; the loop
  builds from them ("Art direction" section).
- Replays (Aleix, 2026-11-15): every multiplayer Boss Rush run recorded as a game replay (state, not video), watched
  only by him in the game's own renderer from a tailnet-only Homepage card; no notice to players; a summary per run
  and notes pinned to moments as feedback; kept 60 days, starred ones forever. The viewer "especially good, usable,
  no weird errors nor inconveniences" (its own bar in the section). Built now, by one pass, start to
  finish (its own section, first).
- The bosses' design session (Aleix, 2026-11-15): the 13 story bosses each get a moveset of their own (8 to 12
  attacks, combos, big moments, a phase-two change), a model sheet and attack key frames, designed now before the
  style bible, shown on the Designs page; the borrowed Elden Ring move sources retire (Art direction, step 1b).
- The loop's open questions (Aleix, 2026-11-14):
  - **No wall, ever.** The Boss Rush curve never eases and never jumps: it keeps getting slowly harder, fight after
    fight, so a skilled player with a good kit gets to enjoy their skills for a long run. The ease after fight 15 and
    the wall at 21 (x3 at 20, x5 at 21) go (track B, item 11).
  - Damage and posture abilities are worth as much as health ones: health picks trimmed a little, damage picks
    strengthened, so picking is a real choice (item 11).
  - Swift kill's par comes from each boss's own health, so it is as hard to earn against every boss (item 11).
  - The loop's other Boss Rush defaults stand: modifiers from fight 8, pairs from 9; the warm-up's easier bosses at
    reduced health; legendaries stronger and uncapped (overturned 2026-11-14, below); revive as built; Practice groups up to 6; "The
    crown answered" / "Team wiped". The Bell Warden, Oswin, Ostrey and Varn are fixed in their own pace (track A),
    then lose Boss Rush's health discount.
  - The Ember Twin stays an ember copy of your own figure.
  - The Giant Skeleton is renamed **the Gaol Giant**, everywhere (data, story text, these files).
  - No emotes, anywhere: crates hold blade looks, other looks and abilities (item 7).
  - Story's climb (0.8x pace and 0.75x health in chapter 1 up to 1.1x / 1x, five flasks found) stands; Aleix
    adjusts it after playing.
  - The loop's words for chapters 7-14 and the ending stand; Aleix flags lines as he plays, and the loop rewrites them.
  - Aleix plays the eight bosses awaiting him (the Antlered Hunger, Aldric, the Gaol Giant, the Bell Warden, the
    Pillager Captain, the King's Blade, Agathe, the Kindling Tree). The loop doesn't wait for him: a boss the blind
    judge scores below the Regent Hollis gets its pass 2 anyway, and his notes, when they come, win over the judge.
- The player's name (Aleix, 2026-11-14): asked once, the first time a player opens online play; kept with the save,
  changed in Settings, never asked in solo or offline play; no generated `Player N` anywhere once it is set ("Next,
  small" section, 6).

## A model or boss is done when

The agent has seen it working in a preview, standing and through every attack, and judged whether it will work in the
game; then a frame of it in its level. Both images in the pass report. Triangle counts are a soft warning, not a rule.

## Now, before anything else: replays of multiplayer runs (Aleix, 2026-11-15)

Aleix: "records the game in some way as a replay (not video, game replay) and allows me to view all of them. I want
to see when my friends play and how they play, it can also be useful for feedback." **Built now, start to finish, by
one loop pass, ahead of everything else in both tracks** (Aleix: "right now"); the pause until Friday doesn't apply
to it.

1. **What's recorded:** every multiplayer Boss Rush run on the server, from the first fight to its end, each fight a
   chapter: every player and bot, the bosses and enemies, abilities fired and picked, hits, downs, deaths, Finishing
   Blows. Offline runs aren't (they never reach the server).
2. **State, not inputs:** each client owns its own movement and the server only sees poses, so the recorder keeps
   what the server already has: the poses players send, its own snapshots and events (`js/events.js` names), at the
   snapshot rate or lower. Content is named by string id (rule 4), so a replay keeps playing after later releases;
   an id that no longer exists plays as a plain stand-in rather than failing. Recording costs the live game nothing
   noticeable (server tick and bandwidth measured before and after).
3. **Private:** only Aleix watches, from a **Replays** card on his Homepage, tailnet only. Nothing about replays is
   reachable through the game's public address (:8443 through Funnel); the replay list and viewer answer on their
   own tailnet-only door. Players aren't told in the lobby (Aleix: no notice). The homelab side (the port in
   `homelab.toml`, the compose port, `hl expose --apply`, the Homepage card) follows the homelab repo's own
   `CLAUDE.md` and `bin/deploy`.
4. **The viewer** is the game's own renderer playing the recording, so a replay looks exactly like the match:
   - a list of runs: date, who played, fight reached, length, how it ended; newest first;
   - follow any player from behind, or a free camera;
   - speed 0.25× to 8×, pause, scrub;
   - a timeline marked with fight starts, deaths and downs, legendary picks and Finishing Blows; jump to the next
     death.
   **Especially good, no weird errors nor inconveniences** (Aleix, 2026-11-15). The viewer is a product of its own,
   held to the game's UI rules (the design skills, the design-audit rule book), on desktop and on the phone:
   - Opens from the card straight to the list, and a run starts playing within a couple of seconds; a long run
     streams, it never makes you wait for the whole file.
   - Every state has a plain answer, never a blank page or a stack trace: no runs yet, a run still being played (it
     shows, marked live, and plays up to now), a run cut short by a crash or a restart (plays what it has), a run
     from an old version, a file that is damaged (says so in one line, the list still works).
   - Comfortable on the phone: touch to scrub, tap a player to follow them, pinch or drag for the free camera, big
     enough controls, the layout fits portrait and landscape, no horizontal scroll. Keyboard on desktop (space,
     arrows, number keys for speed, the player keys) with the keys shown once, not in a help wall.
   - It remembers: each run's link opens it at the same moment (share a link to a moment with yourself), the last
     speed and camera stay, a run you left resumes where you were.
   - Fast to find things: the list filters by player and by date, shows who played, how far they got and how it
     ended at a glance; starring and deleting a run are one tap (deleting asks once).
   - Light on the PC and the phone: one replay's 3D at a time, nothing running when the tab is hidden, the game's
     low settings used on a weak device.
5. **Feedback:** each run also writes a short summary: what killed each player and how often, which boss attacks
   land most, abilities picked, time per fight. The loop reads them when tuning bosses (track B's bot targets, the
   fair-attacks rule in rework item 4). In the viewer Aleix can pin a note at any moment ("this stomp felt unfair");
   notes reach the loop as his feedback, with the run and the moment, read like `.claude/feedback.md`.
6. **Kept:** every run 60 days, runs Aleix stars forever. Compressed, written in batches, not every frame: the
   server's SSD is 80% worn. In `data/`, so the nightly backup has them; the size per hour of play measured and
   noted.
Check: a real multiplayer run (two browsers, or one and the server's bots) recorded, then watched in the viewer from
the Homepage card on desktop and phone width (frames of every state above, the console clean, a full design-audit of
its screens), following each player, at several speeds, jumping to a death; a note
pinned and seen by the loop; the replay address refused from the public one; the live game's tick and bandwidth
unchanged within noise; an old replay played after a data change.

## First, urgent: the player rework, the whole game (Aleix, 2026-11-14)

Aleix: "make this combat system the default for the entire project right now", urgent, so he can play the whole game,
Story and Boss Rush, on the finished combat system. **Both tracks drop what they are doing and take this first**; every
other item waits until it is done. His words: "make it less Souls-like and a bit more action-like", "a bit more like
anime action instead of slow Souls action", abilities "a central part of the combat", and "manageable with friends
playing for the first time on a laptop". The bosses stay as they are in spirit: every attack told and dodgeable on its
tell (`VISION.md`).

**How the tracks split** (two writers never touch the same files):
- **Track B builds the moveset** (`js/player.js`, `js/data/player.js`, `CONFIG.player`, `CONFIG.block`/`parry`, combat,
  the server's claim checks): items 1-2 below, then the abilities' triggers, then Boss Rush's bosses and curve (item 4).
- **Track A makes the game ready for it** while track B builds: the laptop and first-time part (item 3b: input,
  camera, button hints, the first fight); then **how the player moves and looks** (item 3c), its main focus from
  there on: track A owns the player's animation (`js/animator.js`, `js/attack-anim.js`, `js/rig.js`, the poses, the
  movement's feel and the player's effects), track B owns what each move does and its timings (`js/player.js`,
  `js/data/player.js`); a new attack from track B arrives with a working pose, and track A makes it look and feel
  right. Then, as the moveset lands, every Story level, its regular enemies and its bosses played through with it and
  re-tuned (item 4), chapter by chapter, so nothing is left on the old system.

**Done when** the old moveset is gone from the code, every level of Story and every Boss Rush boss has been played
through with the new one (the test bot and frames, chapter by chapter), and Aleix can play the whole game on it.

1. **The feel.** A mix of a fast deflect-and-counter game (Sekiro) and a flashy, approachable action game (Stellar
   Blade), with anime action's speed and flair; their feel only, never their names or looks. Abilities are a central
   part of the fight, not a garnish: the moveset gives them moments to fire on (perfect dodges, deflects, finishers,
   charged blows), and item 6's spectacle bar makes them the highlight of every fight.
2. **The moveset:**
   - **No stamina for attacking or dodging,** and no exhaustion. The dodge has 3 charges that refill more slowly, one at
     a time (Aleix, 2026-11-14, over 2 quick ones; start near 1.3 s each and tune). Blocking takes reduced damage
     and wears nothing down (no guard bar; Aleix, 2026-11-14).
   - **The HUD: no stamina bar** (Aleix: "why is there still a stamina bar? This new white dash bar should be it").
     Where the green bar sat, the dash charges show as three very slim white horizontal bars side by side, each
     filling as it comes back; no diamonds. No guard bar at all (Aleix, 2026-11-14: no hidden meters), so a
     newcomer sees one bar under health.
   - **A dash for a roll:** about 0.35 s, i-frames kept. A perfect dodge (right on the hit) opens a short counter
     window, drawn with a beat of slow motion; the simulation and the other players never slow.
   - **Cancels:** any attack cancels into a dodge or a deflect once its hit is out. The wind-up still commits.
   - **Combos:** light strings of 4 hits (item 3); a heavy finisher from any point in the string, each its own move
     (light-light-heavy differs from four lights and a heavy); a dash attack out of the dodge; the jump attack stays.
     No juggling.
   - **The deflect** replaces the parry: block pressed as a hit lands deflects it, more forgiving than today's parry
     window, with spamming block not working. Each deflect fills the boss's posture; a deflected string can end in a
     riposte.
   - **Healing:** flasks drunk while walking, quicker, cut short by a hit; a small heal on every execution.
   - Abilities whose triggers change (perfect dodge, full charge, parry) move to their new moments.
3. **Controls** (Aleix, 2026-11-14). Every key stays rebindable on the Controls page; the mouse still works (left
   click light, right click heavy) but is never needed.

   | Keys | Action |
   |---|---|
   | W A S D | move |
   | Shift | dash |
   | Space | jump |
   | J | light |
   | K | heavy (hold to charge) |
   | L | block (hold) and deflect (tap as the hit lands): one button, the separate parry key goes |
   | 1, 2, 3, 4 | the abilities you can fire, one key each, in the order you took them |
   | Q | lock on / off; Tab switches target |
   | E | flask |
   | F | interact |

   - **Abilities on the number row** (Aleix: "use the number bar"; "the numbers for the abilities are key to get
     right"). Some abilities are fired on a press, each with its own charge filled by playing well (hits, deflects,
     perfect dodges) and shown on the HUD by its key (pad: the d-pad). Abilities with their own triggers keep them and
     need no key. You choose the moment, like an anime finisher. **Every pressed ability belongs to one of four keys,
     always the same key, for muscle memory** (Aleix, 2026-11-14). The four keys (the director's pick, Aleix may
     rename or re-sort them):
     - **1, Strike:** a burst of attack (a wind blade, a fire burst, a flurry).
     - **2, Guard:** defence and counters (a barrier, a counter stance, a quick heal).
     - **3, Summon:** the summons (item 6; one at a time already).
     - **4, Ultimate:** legendary finishers, the longest charge and the biggest moment.
     - **Boss Rush:** you hold at most one pressed ability per key, and the one you choose stays: no replacing it
       (Aleix, 2026-11-14). Its card shows its key. Once a key is filled, later offers never show another ability for
       that key; the one you hold can still come back as its next level. Triggered abilities (no key) stay frequent in
       every offer, so a run keeps building after the four keys are full; they follow item 6's rules (no cap on any rarity: the
       four keys already limit what you fire; Aleix, 2026-11-14).
     - **Story's four are cool as fuck** (Aleix, 2026-11-14): made for Story, not taken from Boss Rush's pool; each a
       signature technique tied to the place or person that gives it, built to item 6's legendary bar (its own effect
       or model, camera moment and sound); the fourth, before the finale, is the biggest moment in the game. They stay
       the same all through the story (Aleix), unless the loop finds one truly great story moment for one to grow, which
       goes to "Needs Aleix" first.
     - **Story:** no picks. The player is given four pressed abilities at points along the road, one per key, each
       keeping its key for good: key 1 early (chapter 1-2), then 2 and 3 through the middle chapters, then 4 for the
       last stretch before the finale, each given in the story by a place or a person, never a menu. Which four, and
       where, is the loop's to choose by `STORY.md`, then Aleix's to judge.
     Item 6's pool grows each key's group as well as the triggered ones; `js/validate.js` checks every pressed
     ability names exactly one key.
   - **Lock-on is automatic in boss fights:** it turns on when a boss fight starts and the camera follows the boss, so a
     touchpad never has to aim; Q frees it. Ordinary enemies stay manual.
   - **The attacks:** a 4-hit light string; a heavy finisher from any point in it, each its own move; a held heavy
     still charges, and a full charge still fires the abilities that wait for one; a dash attack; light and heavy jump
     attacks; executions; a riposte after a deflected string. No direction-plus-button inputs: a newcomer only ever
     presses one key at a time.
3b. **First-time friends on a laptop.** Everything plays on a laptop keyboard and touchpad as well as with a mouse or a
   controller; lock-on carries the camera so a touchpad never has to. A friend who has never played learns to attack,
   dodge, deflect and heal in their first minute, without a tutorial screen (button hints in the world, the sparring
   scene of item 3d, the first fight forgiving). Normal holds 60 fps on the laptop (track A item 3).
3c. **Movement and animation: smooth, responsive, a bit anime** (Aleix, 2026-11-14: "the player movement and
   animations must be good and smooth, responsive, feel like an anime a bit as well"). Track A's focus, pass after
   pass, until Aleix says it feels right; never folded into another item as an afterthought.
   - **Responsive:** a press shows on screen on the next frame; starting, stopping and turning are quick (short
     acceleration, no slide), the dash and every attack start the moment they're pressed, and a buffered press never
     gets lost. Measure input-to-motion in frames for every action, before and after.
   - **Smooth:** every motion on real curves, with anticipation, follow-through and overshoot; blends between any two
     moves (run into dash, dash into attack, string into finisher, any cancel) with no pops or snaps; feet planted, no
     sliding; the body leans into turns and speed.
   - **A bit anime:** sharp, readable key poses held for a beat; a smear or arc trail on fast swings; dash afterimages
     and speed lines; hit-stop and a camera kick on heavy blows, finishers and counters; landing and recovery poses
     with weight; a stylish stance after a finisher. Flashes stay under 3 Hz and follow `reducedMotion()`.
   - **References first** (`CLAUDE.md`: show, don't describe): gather clips of the movement and attack animation the
     feel draws on (the two games of item 1 and anime fights), name the patterns they share, and build from those.
   Check: input-to-motion frames per action; side-by-side clips of run, dash, the light string, each finisher, a
   perfect dodge into a counter and a deflect into a riposte, old against new; a blind judge comparing the new clips
   with the reference clips, scored every pass and plotted, until the curve goes flat; then Aleix plays it.
3d. **The new combat, shown: a sparring scene** (Aleix, 2026-11-14: for a new player and for one who remembers the old
   combat, "showing the new combat in a way they can understand and apply"). Track A, after 3b, once the moveset has
   landed.
   - **Played, never watched** (`VISION.md`: the game never takes control). In a small arena, a sparring figure shows
     each move with its key over it, then the player does it against the figure: the dash and a perfect dodge, the
     light string into a heavy finisher, a deflect into a riposte, an ability on its number key, a flask drunk on the
     move. About 90 seconds; skippable at any moment; no text beyond each move's name and key.
   - **When it runs:** before a new player's first Story boss and before their first Boss Rush fight. A player whose
     save is from before the rework is offered it at launch, up to three times (Aleix: "make it appear 3 times"; read
     as: offered on their first three launches until they play it through).
   - **A Tutorial button in the lobby** (Aleix) starts it for anyone, any time; Practice has it too.
   - **The Controls page** shows a short looping clip of each move beside its key.
   Check: a test that it runs, skips and is offered no more than three times; a clip of a full run through it; a
   first-time player's key presses in it match what the figure showed (the test bot follows it).
4. **The bosses answer** (Aleix, 2026-11-14: free attacks and a dodge with charges must not let a player mash bosses
   down). Shared rules in the engine, not one boss at a time:
   - **No flinch from ordinary hits:** a light or heavy never interrupts a boss's attack. After about 5-6 hits in a
     row without a pause, the boss answers with a quick, told break-off (a sweep, a burst, a step back with a strike).
     Mashing is punished; short bursts between its attacks are the way.
   - **Posture fills from skill, not volume:** ordinary hits barely fill it; deflects, perfect-dodge counters, heavy
     finishers, full charges and abilities fill it a lot; it drains when the pressure stops (item 11's rule that each
     break needs more still holds).
   - **Damage moves to skill and abilities:** ordinary hits deal about a third less; counters, finishers, executions,
     ripostes and abilities carry most of a fight's damage.
   - **Dodge spam:** the 2 charges cap it; a dodge that isn't on an attack only moves you; a mistimed dodge's end has a
     short window without i-frames.
   - **Every attack fair on its own** (Aleix, 2026-11-14, on the stomps: "the animation is never clear, and suddenly
     you have a massive area attack that damages you from afar and with no warning"). Every attack makes sense and
     gives time and sight to react; **the hard part is a boss chaining several attacks, never one impossible attack.**
     First the area attacks, every boss's (the stomps, `anim: 'stomp'`, with the Earth Stomp worst; shockwaves, roots
     and bursts from the ground): a clear, held wind-up pose; the ground shows the attack's whole reach from the start
     of the wind-up; it stops following you well before it lands; it never hurts anyone outside what it showed; you
     can always dash through it. A rule in the engine, checked by `js/validate.js`, not boss by boss. A boss that only
     borrowed a stomp loses it. **The leap slams stay exactly as they are** (Aleix: "keep the jumping as is right now,
     don't modify it"). Then every other attack is held to the same rule; one that can't be made fair goes.
   - **Enemies move for the new player** (Aleix, 2026-11-14). Regular enemies and bosses close in faster, circle you,
     re-space after your dash and recover properly when dodged, so they fit a player who dashes. All their movement and
     attack timing follows one pace value, so Boss Rush's speed scaling moves everything together. Track B for Boss
     Rush's bosses, track A for Story's enemies and bosses (item 4's chapter-by-chapter pass); the test bot measures
     it.
   - **More attacks can be deflected** (Aleix, 2026-11-14: "more attacks should be parriable"). Today 155 of the
     bosses' 242 attacks can't be parried. With the deflect, most can: `noParry` stays only on area attacks from the
     ground, grabs, and each boss's one or two biggest moments, about a quarter of a boss's attacks at most
     (`js/validate.js` checks it). A deflected heavy blow pushes the player back a little and fills the boss's posture
     more; each deflect has its own spark and sound. A move that can't be deflected looks it (its wind-up says so).
   - **Then the bot:** every boss a little more aggressive (fewer idle gaps, more strings that punish mashing), tells
     always readable; the test bot plays each boss on the new moves, and only a boss it finds trivial gets its own
     rework. Item 10's and 11's targets are measured again.
5. **One boss first, then everything, without waiting.** The moveset is proven against one boss (the Pillager
   Captain, in Practice) inside the same push, then becomes the only moveset at once: no gate on Aleix's play, no
   option to switch back. His notes after playing the whole game redirect it.

Check: a test of each move (dash charges, cancels, every string and finisher, deflect timing and its posture, drinking
on the move); a clip of a full string, a perfect dodge into a counter and a deflected string into a riposte; the
Pillager Captain in Practice at desktop and laptop size, the touchpad alone driving it; then Aleix's go.

## Next, small: fixes from Aleix's run (2026-11-14)

Track B's next pass after the one in progress takes all of these at once (Aleix: "Yes" to the order); they are small.
The momentum item goes to track A, the legendary and Story ability bars to item 6 and rework item 3. The player's
name (6 below) came later the same day and goes with track B's.

1. **One count: the fight.** The HUD counted fights while the run's tally, the end screen and the lobby board counted
   bosses (a fight against two bosses added 2), so they disagreed from fight 9. The fight number is the only count,
   everywhere (HUD, end screen, board, Crowned every 5th fight); a fight against two bosses is one fight; "bosses
   beaten" goes. Check: a test of a run with a two-boss fight, the HUD, end screen and board showing the same number.
2. **No hidden meters** (Aleix: "keep the game simpler"):
   - **The guard bar goes.** Blocking takes reduced damage (chip damage) and never breaks; it stops nothing that can't
     be deflected. `stamina` and its bar leave the player.
   - **Poise goes.** Ordinary hits never stagger the player; only attacks marked heavy do, and their wind-up shows it.
   - **Rend goes** (Mother Agathe's hook tearing pieces off your health bar for 22 s): her hook just hits hard.
   - **The counter: impossible to miss, and way cooler** (Aleix, 2026-11-14: "I didn't notice, and even now I don't
     remember any time I did it"; "make the follow-up attack way cooler"). A counter opens 0.8 s after a perfect dodge
     and 1.1 s after deflecting an attack's last blow; a light or heavy pressed then is the counter (about 2.6 times
     the damage, far more posture). Track A, the player's effects and animation, its own pass ahead of the rest of
     item 3c:
     - **The opening, seen and heard:** a sharp, bright ring of sound the moment it opens (its own, not a hit sound); a
       beat of slow motion after a deflect too, as after a perfect dodge; the blade flares bright and keeps a strong
       glow with a trail while the window lasts, dimming as it runs out; the boss flashes a brief open mark. Flashes
       under 3 Hz, `reducedMotion()` respected.
     - **The counter itself, a signature move:** the light counter is a flash step, the player dashing through or past
       the boss in a blur with afterimages, one clean cut, then the cut line opening a beat later; the heavy counter is
       a rising slash with a wide arc that lifts the boss's guard. Each with long hit-stop, a camera kick and swing, its
       own sound, sparks and a short held pose after it. Deflected strings make the riposte chain a second time if the
       press comes again.
     - **Taught:** the sparring scene (item 3d) teaches it, and the first time a counter opens in a fight its key shows
       by the blade.
     Check: a clip of each (a perfect dodge into each counter, a deflect into each), side by side with old; a first
     look by a blind judge: does it notice the window opened? Then Aleix plays it.
   - **Kept:** the ability keys' charges, and bosses that learn (they read as a boss reacting).
   - **The stagger bar goes** (Aleix, 2026-11-14: it competes with the counters; "focus on counters"). No posture bar
     and no hidden posture, for bosses and for every enemy; the boss bar shows health only. Counters are the skill
     the fight is about. **Executions go; the Finishing Blow replaces them** (Aleix,
     2026-11-14): no kneeling and no walking up to press attack. Each counter visibly cracks the enemy's guard (on the
     body, not a meter), and the cracks fade if no counter lands for a while. The third counter within that spell
     becomes the Finishing Blow: time freezes for a moment, the player flash-steps through the enemy several times
     with afterimages, then every cut line opens at once for big damage; about 1.2 s, then control is back at once.
     It never stops the action. Its own sound, camera, hit-stop and held pose, to the counter's bar; the healing that
     executions gave moves to it. `js/execution.js` and the kneeling state go. In a party, any player's counters count
     and the one landing the third gets the blow. The showcase's finale beat becomes it. Abilities that fill posture today (`breaker`
     and the rest) are reworked to feed counters (a longer window, an effect when a counter lands).
   - **The Boss Rush corner:** the fight number only, plus the clock while a Swift kill is still possible (under par);
     "Crowned in" and "par" go.
   - **The ability keys sit bottom centre** (Aleix), not bottom right.
   Check: frames of the HUD in a boss fight, blocking and after a perfect dodge, at desktop and phone width.
3. **The bosses' modifiers say what they do.** They change only a boss's speed, and their names hid it ("Unbroken"
   reads as unbreakable but means longer combos). Renamed (the director's pick; Aleix may rename):
   **Faster** (was Quickened: the boss's whole pace times 1.12), **Fewer pauses** (was Restless: its rests between
   attacks 1.5 times shorter), **Longer combos** (was Unbroken: its follow-ups chain as if its pace were 1.8 times
   higher). Shown under the boss's bar, as now.
4. **The first pick is a rare** (Aleix: the start was a struggle, then the abilities came). The run's free first
   offer before fight 1 is of rares, not commons, so a key ability comes from the start. The curve stays: "the
   difficulty scaling is perfect now".
5. **Momentum, not static attacks** (track A, part of rework item 3c; Aleix: "static attacks break the flow too much,
   keep player momentum for a bit"). An attack started from a run keeps the run's speed and slides forward, easing off
   over about 0.2 s; each hit of the light string steps forward and can be steered through the whole string, not only
   the wind-up; a string that ends with movement held flows straight into the run, with no recovery pose. Check:
   input-to-motion and speed curves in frames, run into each attack and back, old against new; a clip.
6. **Your name, asked once** (Aleix, 2026-11-14; track B, with items 1-4). Today the name is a "Your name" box inside
   the public lobby panel (`#lobbyName`, the pad's name editor `#lobbyNameEditor`, `js/multiplayer.js`), kept apart
   from progress in `combatArena.onlineName`; left empty, the server calls you `Player N` by join order
   (`server/index.cjs`, the hello), so the same player shows up under a different made-up name from visit to visit.
   - **Asked once:** the first time a player opens online play (the public lobby) with no name, the game asks for one
     before joining: one field, typed or with the pad's name editor, then on into the lobby. Never asked again.
   - **Kept with the save:** the name is stored with the player's own saved data, not a lobby-only key, and goes into
     any save export the game has or gets. A name already in `combatArena.onlineName` counts as set, so returning
     players are never asked.
   - **Changed in Settings:** a Name row in Settings opens the same editor; a change made while in the lobby reaches the
     party at once. The box in the lobby panel goes; the lobby only shows the name.
   - **Solo and offline never ask:** Story, offline Boss Rush and Practice alone don't mention it.
   - **One name everywhere:** the lobby, the party list, the weekly board and in play show the chosen name; nothing
     shows a `Player N` once a name is set. The server keeps `Player N` only for a page that sends no name (an old
     build).
   Check: a browser test from empty storage: solo play never asks; opening online asks once, and the name shows in the
   party list; a reload joins with no ask; a rename in Settings shows in the party list. Frames of the ask and the
   Settings row at desktop and phone width.

## The showcase: 30 seconds of the game at its best (Aleix, 2026-11-14)

Aleix: "a trailer/ad/tutorial for new people that is just watching 30 seconds of the highest level gameplay", "an
in-game cinematic, we allow it for once", updated "over time with new mechanics the game adds". **Built by its own
session (the showcase session), not the loop**: the loop doesn't touch the showcase's own files (`js/showcase*.js`,
`js/data/showcase.js`, its music cue, `tools/showcase-*.cjs`) and keeps its beats working when it changes a mechanic
(its test says when one breaks).

1. **Live in the engine, not a video file:** a scripted bot at the top level fights hard Boss Rush bosses at a late
   run's pace (fights 15-20, their modifiers), with cinematic cameras cutting on the beats, so it always shows the
   current game. The one exception to "never taking control" (`VISION.md`, with Aleix's OK): a show before play,
   never during it.
2. **The shape:** a montage across three of the most aggressive bosses, about 10 s each, hard cuts on the beats: it
   opens on a boss mid-combo and ends on the game's title. Beats: dashing through a string, deflecting a string into
   the flash-step counter, an ability on its key, a legendary (the lightning dragon), the Finishing Blow (three counters into the
   multi-cut flash step). Its own synthesized music cue drives the cuts.
3. **When:** a new player's first launch plays it, then the sparring scene (item 3d of the rework) straight after;
   **it can't be skipped** (Aleix: "no key to skip it"). Afterwards a **Watch** entry on the title plays it again;
   players from before the rework see it with their three sparring-scene offers.
   **After every update, for every player** (Aleix, 2026-11-15: "play on every game version update for all players";
   at most once a day, his pick, since the game releases many times a day): the first launch on a version the player
   hasn't launched before plays it, unless it already played for them in the last 24 hours. Still unskippable. It
   plays before the title, never into a lobby or a run already under way (a player rejoining a run in progress sees
   it next launch). The version and time it last played are kept in the local save (try/catch, rule 8); a browser
   with storage blocked plays it once per page load at most. Check: a test that it plays on a new version, not twice
   within 24 hours across several versions, again after 24 hours, and never on a rejoin.
4. **Kept current:** the script is data, a list of beats ("deflect a string", "counter", "ability on key 4"); the bot
   plays it live on a fixed seed, so it looks the same each time; a test runs it every release and fails when a beat
   stops happening; each big new mechanic adds a beat.
5. **A real video too:** a tool records the same cinematic at each release: a 1080p 60 fps MP4, and a **WhatsApp
   version** (Aleix), 1080p (Aleix, 2026-11-14) and shareable: MP4, H.264 (yuv420p, faststart) and AAC, 1080p, 30 fps,
   under about 30 MB, so it plays inline when sent as a video (WhatsApp itself scales it to 720p with HD on) and
   stays full 1080p when sent as a document. Posting either anywhere stays Aleix's.
Check: the cinematic seen in the game at desktop and phone width; its test passing; both videos played back, the
WhatsApp one's size and codecs checked; Aleix watches it.

## Art direction: one style for the whole game (Aleix, 2026-11-14)

Aleix: the ability design session "is doing great"; the same approach should shape "player and boss models, level
designs, the entire game style basically". Built by design sessions the director starts, one at a time (Aleix's
ChatGPT Plus limits), never by the loop; the loop builds from their output, with Blender and code, as now.

1. **The abilities first** (the ability design session, `design/abilities/`, in progress). Its style bible is the
   seed of the rest.
1b. **The bosses, now** (Aleix, 2026-11-15: "another same designer thread for all boss attacks and abilities"),
   the boss design session, `design/bosses/`, before the style bible (it follows the abilities' `STYLE.md` and writes
   the boss half of the game-wide one; step 2 reconciles any clash). The 13 story bosses, Boss Rush's whole roster
   (Pillager Captain, Bell Warden, the Gaol Giant, Aldric, the Antlered Hunger, Ostrey, Hale and Harrow, the Ringer,
   Hollis, Oswin, Agathe, the Kindling Tree, the King's Blade). Regular enemies wait.
   - **A moveset of its own for each:** 8 to 12 attacks, 3 or 4 of them combos, one or two signature big moments a
     phase, and a real change in phase two (a transformation, a new weapon, the arena changing). The borrowed move
     sources (`js/data/bosses/godrick.js`, `maliketh.js`, `godfrey.js`, `radagon.js`, `crucible-knight.js`) retire
     once every boss has its own.
   - **The rules it designs to:** every attack fair on its own, the hard part a boss chaining attacks (rework item 4:
     area attacks show their whole reach and stop tracking, leap slams stay as they are); `noParry` on about a quarter
     of attacks at most; each deflect its own spark; each boss's idea and story from `STORY.md` its own; spectacular
     anime effects with tells never hidden; original, never another game's names or looks.
   - **Its look too:** a model sheet per boss (front, side, back, materials, scale) a Blender build can follow, key
     frames of its signature attacks and combo finishers, its phase change; about 8 to 10 ChatGPT images a boss, run
     at night like the abilities. This replaces step 3's bosses item.
   - **Specs ready to build:** each attack as data in today's format (`js/data/bosses/`), its timing, reach, tell,
     effect layers, sound and camera; a build order, one boss per loop pass. Design only: the loop builds it after the
     player rework.
   - **Shown with the abilities:** one Designs page, Abilities and Bosses, at the same tailnet-only address on Aleix's
     phone (Homepage's card renamed Designs), and a claude.ai gallery.
2. **The game-wide style bible** (`design/style/`): one short session after the abilities ship. The world, the
   player, the bosses, the levels, the UI and the effects on one page, with ChatGPT concept images judged against real
   references Aleix approves (art direction is his: the session asks him with a recommendation). It keeps what
   `VISION.md` and `STORY.md` fix (the dark world, each boss's own idea and story, the real Blender models) and makes
   the bright anime effects and the dark world one look. If the abilities' bible clashes with the world, this step's
   answer wins and the abilities' images are adjusted.
3. **Concept sessions, one at a time**, each following the style bible, each into its own folder of `design/` with
   specs and images, shown in the same kind of private gallery:
   - **The player** (`design/player/`): the figure, its blade, its poses for the moveset, its effects.
   - **The bosses:** done by step 1b.
   - **The levels** (`design/levels/`), chapter by chapter: the look of each place, its landmarks, light and mood.
4. **The loop builds them:** each folder's build order becomes work in its track (the player and Boss Rush's bosses
   track B and A as today's ownership says, Story's levels and bosses track A), a model rebuilt in Blender against its
   sheet and judged in the game against the concept images by the blind judge.

## Before everything else: players know a new version is out (Aleix, 2026-11-13)

Aleix often plays an old version. The home server is fine: `hl` (the homelab's own tool, `hl-games.timer`) pulls
`latest` every 3 minutes while the lobby is empty and holds it while anyone is in. The page is the gap: it compares
its version with the server's only on Join (`js/multiplayer.js`, the `info.version !== VERSION` check), and the
title's `peek()` reads `/api/lobby` (which carries `version` and `build`) every few seconds but ignores both. So a tab
left open, and any solo play in it, stays on the old build and nothing says so.

1. **"New version — Reload".** When `/api/lobby`'s `version` or `build` differs from the page's, the title screen and
   the pause menu show it, with a reload button (keyboard and gamepad reachable). It checks on the title (the
   existing `peek()`) and every few minutes elsewhere, solo or online, with no effect on play and nothing shown when
   there is no server (`file:` or a static host). In the lobby, reloading mid-run is the player's choice, never forced.
   Check: a page served with an older `VERSION` against a newer server shows the notice on the title and in pause,
   and the button loads the new build (a browser test, plus frames at desktop and phone width).
2. **The docs say how it really updates.** `docs/container-updates.md` describes a game-owned updater
   (`deploy/update.sh`, `combat-arena-update.timer`) that was never installed on the server; the server is updated by
   `hl` (`C:\Users\Aleix\Documents\CLAUDE\homelab`, `homelab.toml` `[stacks.combat-arena]`, `update = "when-empty"`).
   Rewrite the doc to say that in a few lines, and delete `deploy/` if nothing uses it (check `compose.yaml`,
   `container.yaml` and the tests first). Check: no mention of the unused updater anywhere (grep).

## Clean-up (first)

1. **The Elden Ring bosses and the Lands Between go** (pass 31, Aleix's feedback): the eight bosses, the Lands levels,
   Seren, its enemies, messages, ending, lobby ceremony and the bosses' `.txt` references in `docs/`. Finn stays only
   if the story road uses him. Story bosses that borrow a Lands boss's moves keep working until they are redone.
   Check: the game loads and validates, no Lands name in any menu, every story boss in Boss Rush's pick list.
2. **Lean files.**
   - Delete from `docs/`: every per-release note, `feature-history.md`, `CHANGELOG.md` (the in-game changelog is the
     one), `combat-timings-v4.1.md`, `prompt-new-bosses.txt`, the `.json` results and the empty `enemy-redesign/`.
     Keep `homelab-multiplayer.md`, `container-updates.md`, `how-online-works.html` and the `scorecard/` frames; rewrite
     `docs/README.md` to list what is left.
   - Delete `SCORECARD.md` and `tools/scorecard-frames.cjs`'s mention of it (the tool may stay).
   - `README.md`: one screen on how to play and how to host. The release notes in it go.
   - Merge `LORE.md` and `STORY.md` into one `STORY.md`: what is in the game, then where it's going, a working draft.
     Point code comments at it.
   - Remove the stale worktrees `.claude/worktrees/onboarding` and `../3d-souls-low-base` (check them for uncommitted
     work first) and the empty `3d-souls-low/.obsidian` folder.
   - The loop file's own sections (Notes, Ship and release) drop the per-model doc, the `feature-history.md` section,
     the AGENTS.md row and the minor release per model.
   Check: no link to a deleted file anywhere (grep), the game loads, `npm run test:node` passes.

## Track A: Story

1. **The ending** (pass 30, in progress).
2. **Chapters 7-14's bosses redone**, in story order, one pass each (two at most): Ostrey, Hale and Harrow, the
   Ringer, Hollis, Oswin, Agathe, the Kindling Tree, the King's Blade. Each one gets one idea of its own, its meaning
   and backstory, its own moveset (patterns and combos may come from acclaimed souls-likes, never their names or
   looks), effects with nothing held back, smooth animation with real acceleration and easing, and its own Blender
   figure with the best detail and art direction (the re-coloured stand-in goes). Every attack readable on its tell, and
   each attack's wind-up different from the boss's others. Its level is reworked so the place and the fight belong together. Check: the model
   check above, then the boss fought in its level.
3. **Two graphics presets.** Low and High become one **Normal** preset that holds 60 fps on integrated graphics;
   **Ultra** stays for Aleix's PC. Render scale stays at 100% or more in every preset, auto-quality included: the speed
   comes from elsewhere (draw calls, shadows, effects' cost, level of detail, culling). Today every preset's
   `renderScale` is 1, but `maxPixelRatio` caps Low at 1x and High at 1.5x, so on a scaled screen (a laptop at 125-150%)
   they draw below the screen's own resolution and get stretched: that counts as below 100% and goes. Normal keeps
   every one of Ultra's effects, each toned down slightly (fewer particles, cheaper passes), never switched off.
   **Baked lighting** everywhere: every level, boss arena and Boss Rush arena gets baked light (lightmaps, baked in
   Blender or a bake step; light probes or baked ambient occlusion for the moving characters), in every preset, in
   place of most real-time lights and shadows. **The laptop is the judge** (Aleix, through
   duty-shooter's director, 2026-11-13): his Lenovo V15 G5 (`ssh uni-laptop`; Intel UHD Graphics, i7-13620H, Fedora 44,
   Firefox only), shared with duty-shooter's loop, taking turns.
   - Read `~/laptop-test/README.md` on the laptop first. Every laptop test goes through `~/laptop-test/lt run
     3d-souls-low <command...>`, which waits (up to 30 min) for the other project's run and holds the turn; wait with
     Monitor, waiting is not a blocker. Never test outside it. `lt claim 3d-souls-low` when laptop work starts, `lt
     release 3d-souls-low` when done (it keeps the laptop awake); `lt status` shows who holds what.
   - Tests may open a visible Firefox window in his session (prefix `WAYLAND_DISPLAY=wayland-0
     XDG_RUNTIME_DIR=/run/user/1000 DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus`). Close windows and servers
     when done. Never unlock the screen or change lock or power settings; if it's locked, run headless and say so. If
     `ssh` times out, the laptop is away: use the stand-in below.
   - Tests run only while the laptop is plugged in: `lt run` exits 76 on battery (its numbers would be throttled).
     Then wait for power, or ask under "Needs Aleix". Never measure with `LT_ALLOW_BATTERY=1`; that override is only
     for runs that measure nothing.
   - **The stand-in on this PC:** a throttled run (CPU throttle, resolution, whatever brings it closer) that any pass
     can run in under two minutes. Each time the laptop is measured, tune it until its mean and 1% low per scene land
     within 15% of the laptop's latest numbers; record the factors and both sets of numbers; recalibrate when the
     laptop's numbers move.
   Check: the laptop holds 60 fps on Normal on every level and in a four-player Boss Rush fight; frames of each level on Normal and Ultra side by side, Normal showing the same effects and looking very nice, not like a cut-down fallback.
   **When the laptop can't run** (away, on battery, `lt` refusing; Aleix, 2026-11-13): item 4 goes before this one
   and this item resumes once the laptop is back.
4. **Ashmere's five bosses** get new movesets, effects and animation by the same rules; their Blender models stay (and
   may be improved).
5. **Progression:** flasks found along the road, enemies stronger chapter by chapter. Story's bosses are tuned for
   the player's experience on top of track B's 1x (Aleix, 2026-11-13): slower in the first chapters if that plays
   better, climbing chapter by chapter to the finale, every boss beatable 1v1 by a friend new to the genre in a few
   tries. Check: flask count and enemy
   strength across chapters in a test, and a play-through frame per act.
6. **Telling the story without taking control.** Find the best way to tell this story (places, NPCs, inscriptions,
   in-world scenes) and remove every moment that takes movement or the camera away from the player: cutscenes, locked
   cameras, cards that freeze play. Check: play each chapter's story moments with the player moving and turning the
   camera throughout.
7. **The old levels' flaws.** Levels 1-6 and the rough chapters are old and some have clear flaws; some regular
   enemies need reworks too (Aleix, 2026-11-13: "story mode levels and some enemies need reworks"). Any pass whose
   item touches a level treats them as weak foundations and improves, redesigns or reworks the level as part of the
   item; this item then takes the worst one left, one at a time. Rebuilding a level from zero is allowed when it's
   really needed, never the default. Then the stand-in figures (Ysolde, the chapters'
   regular enemies) in Blender.

## Track B: Boss Rush

Order (Aleix, 2026-11-13): item 9 (Boss Rush alone, bots out), then item 10 (one difficulty, the new curve), then
item 3 (the menus), then item 6 (abilities) as
soon as the upgrades session has shipped it, ahead of everything below, then items 4, 5 and 8, then item 7 (crates,
after the abilities). If the track reaches item 6 before that session has shipped, it goes on with the next item and
comes back to item 6 the moment it lands.
Then (Aleix, 2026-11-14): item 11 (the run's shape) right after item 7's pass in progress, ahead of everything left.
Next in this track (2026-11-14): the player rework comes first (its own section at the top, urgent; Aleix). After it:
Boss Rush offline and the lobby cut to Boss Rush only (item 1), then
item 11's third pass (the wall and the ease go, picks evened, par per boss), the summons' own moves, then item 6's new
bar (Aleix, 2026-11-14: way more spectacular abilities and a really wide
pool), whose spectacle and growth passes then take every other track-B pass for as long as the pool is short of it,
the end screen's highlights (item 4, still unbuilt) fitting in between.

1. **Boss Rush and Practice.** The Calling becomes **Boss Rush**, the lobby's default. The title screen: Story, Boss
   Rush, Practice. **Multiplayer is Boss Rush only** (Aleix, 2026-11-14): the lobby's Mode option goes, and with it
   Single, Double, Triple and Quad Boss and co-op Story (their code goes too, not just the buttons; the server's rate
   checks stay). The Weekly run stays, as Boss Rush on the week's seed (Aleix, 2026-11-14: "Keep Weekly"). **Practice** replaces the 1v1 Arena, Boss vs Boss and the Levels menu: pick any enemy or boss (one or
   several, or two teams against each other) or any level, and be fighting in seconds.
   **Boss Rush offline** (Aleix, 2026-11-14): Boss Rush plays alone in the page with no server, the same run as
   online (the same bosses, curve, ability offers, levels and crates). On the title, Boss Rush has two ways in:
   **Play alone** (always there) and **Join lobby** (when the lobby answers). Alone, the page runs what the server
   runs online (the run, the shared enemies, the offers) from the same engine code, no second copy; levels, crates and
   the Collection are kept in the local save, so a run alone counts like one online. Next in track B after the player
   rework, ahead of item 11's third pass.
   Check: frames of the title, the lobby and Practice at desktop and phone width; a test starts each mode; a Boss Rush
   run to fight 5 played with the page opened as a file (no server), its level and crate kept after a reload.
2. **Fast fights, bots that fall** (Aleix, 2026-11-13: bosses are damage sponges and bots never die; make it more
   frenetic, with more dopamine). Next in this track: the next track-B pass takes it, ahead of item 3's remaining
   screens, which resume after it. Since then allied bots have left Boss Rush (item 9): the parts below about bots
   in a party (bots that fall, a person with three bots) no longer apply; what's left of them is dropped, and the
   fight-length targets are measured alone. Item 10 replaces this item's curve numbers and base health.
   - **Why:** bots count as players in `CONFIG.group`, so one person with three bots fights a boss at 2.5 times its
     health; `docs/scorecard/bot-aid.txt` has three bots beating the Pillager Captain and the Bell Warden 10 of 10 in
     about two minutes, with no bot falling.
   - **Team-size scaling goes** for every enemy and boss in every mode (`CONFIG.group`, `groupDef`/`setGroup`, the
     server's scaling in `tick()`): a group of four, bots or people, meets the same boss a solo player does.
   - **Killable fast with skill, hard to face** (Aleix, 2026-11-13). Health is never the obstacle; the pattern is. A
     skilled player who punishes the openings beats a boss fast, and a weaker one takes longer because they find fewer
     openings, not because the bar is long. Bosses get harder to face, in every mode: shorter idle gaps, more mix-ups
     between their own strings, and openings that must be earned, every attack still telegraphed (`VISION.md`, fair
     but challenging).
   - **Fight length:** about 45-60 s for a full party at fight 1, never above about 2 minutes late in a run. A person
     with three bots plays the same as four people.
   - **Base health, story too** (Aleix: some bosses have too much health in Story as well). Every boss's own `hp` is
     set so one skilled person on a clean run beats it in about a minute, the long outliers first. Measure every boss
     against one body alone (`tools/bot-fights.cjs` always fields three today: give it a solo option), list the times
     before and after, and bring the slow ones into line.
   - **The curve** (one `CONFIG` rule, exponential in fights won but subtle, as `VISION.md` says) scales only the
     boss's pace: faster attack patterns (shorter wind-up-to-wind-up gaps and recoveries, quicker follow-ups, longer
     strings), each tell staying readable. Not its health, not its damage (Aleix). A run ends because the patterns
     grow too fast to answer, never from one-shots, a long bar or a sudden wall (item 11).
   - **Bots play like a decent friend, not a machine.** Full player stats stay (v7.57.0). Slower, less even reactions,
     about twice the mistimed rolls, a later flask and less backing off. They play the same all run: no extra
     sloppiness as it goes on (Aleix: the bosses already get harder). Target: early on, about one bot falls every three
     fights; by fight 10 most fights cost at least one. A fallen bot is back for the next fight, like a person.
   - **Dopamine:**
     - Less waiting: the ability is picked in the arena, and the next boss drops straight in. The clock is 30 s and
       skips once everyone has chosen (Aleix, v7.67.0, over an earlier 10 s).
     - A kill moment: a short slow motion and a burst of embers when a boss dies, then one line, "Boss 7 down". Drawn
       only: the simulation and the other players are never slowed; flashes under 3 Hz and `reducedMotion()`.
     - More breaks and executions: posture breaks come about 30% sooner, so the big hit lands more often.
     - A visible streak: the fight count and each boss's time on the HUD and the end screen.
     - **Swift kill** (the director's pick, for flow): beat a boss under its par time (shown on the HUD beside the
       clock, from the fight-length target) and that fight's ability offer gains one extra choice (one rarity up
       once item 6 brings rarity). Skill pays straight back into the run; nobody is punished for missing it.
     - No damage numbers.
   Check: before-and-after numbers (`node tools/bot-fights.cjs`, `PERSON=1` for a person stand-in): fight 1's length
   for a person with three bots and for four bots, bot falls per fight, and every boss's solo time, against the
   targets above; a test that 1
   and 4 players face the same boss; a test of the curve at fight 1, 5, 10, 20 and 40 (pace changes, health and
   damage don't); frames of the kill moment, the streak on the HUD and a swift-kill offer.
3. **The UI redesign, the whole game** (Aleix, 2026-11-13: menus and UI way better to use and to look at). It comes
   before Endless, abilities and crates, so their screens are built on it.
   - **What's wrong now** (v7.59.0 frames in `docs/scorecard/modes-*` and `.scratch/calling/blessing-desktop.png`):
     three looks (a serif list on the title and Practice; a web-app lobby with rounded cards, a gold gradient button,
     a LEADER pill and small all-caps labels; a web-card blessing panel), uneven navigation (key-only hints, Back on
     some screens only, a title mixing a list and a row of buttons), and clutter (a line of explanation under every
     option, four overlays stacked after a boss dies, a permanent CONTROLS list in the HUD).
   - **References, not Souls-like UIs.** Collect screens from games praised for menus that are easy to use and look
     great, name the patterns they share, and build from those. Show the chosen references to Aleix with the first
     screen.
   - **Input:** mouse and keyboard first, and full controller support on every screen: every control reachable and
     usable with a gamepad, focus always visible, button hints that follow the device used last.
   - **The best control for each job:** a dropdown, a slider, a value cycled in place, a grid or a list, whichever is
     best there. Not one style forced everywhere, but one direction across every menu and the HUD: one type
     system, one palette, one focus style, one way back from every screen.
   - **Less on screen:** a title stands alone; a line of text only when it says something the screen doesn't already
     show; one overlay at a time.
   - **Behind the menus:** a cool live 3D scene of a castle (a real Blender model, baked light), inside the Normal
     preset's 60 fps on integrated graphics.
   - **The HUD stays** (Aleix, 2026-11-13: "the current UI inside the game is perfect"). Don't restyle it. Item 2's
     streak and par timer join it in its current look.
   - **Simple and functional, no dopamine on menus** (Aleix, 2026-11-13: "stay away from this dopamine, let's focus
     on simpler functional menus again"). No slam-in titles, glow pulses, shine sweeps or count-ups on any menu or
     card. Motion only where it helps you use the screen: focus moving, a panel opening, a timer draining. The one
     exception is item 7's crate roll, which keeps its animation and effects in the game's style.
   - **Ability cards get the most care:** each ability has its own drawn icon in the menus' style (never emoji or
     stock icons), its rarity readable at a glance, its level and change shown plainly (II → III, 30% → 45%), the
     pick timer, number keys and pad buttons.
   - **Chosen (Aleix, 2026-11-13): tall cards for the ability pick, and the mockups' menu style.** The mockups are
     on the director's canvas, https://claude.ai/artifact/GRG2DQeaNTRnTFM7cRdz7L (read it with the Artifact tool):
     "Pick 4 · Tall cards", "Title", "Pause", "Options" and "End of run". Build from them.
     - Ability pick: the HUD stays visible under a dark veil. The title "Choose an ability" sits on the left with the
       seconds left on the right, and a thin gold line under it runs down with the timer. Below sit three or four
       upright cards in a row, about 216×330 at 1280×720. Each card has, top to bottom: its icon in a square well
       whose bottom edge is the rarity colour; the name (display face); the level change in gold when it has one
       (II → III); what it does, with the change in bold (30% → 45%); and at the foot the rarity word in its colour
       and the number key (pad: the focused card takes A). The focused card gets the gold outline. Rarity colours: common in
       the body ink, rare a cool blue, legendary ember orange; gold stays "focused / yours" only. A Swift kill's extra
       card says so beside its rarity. On a phone the cards go to a 2×2 grid.
     - Title: the game's name top-left, the mode list below it (Story, Boss Rush, Practice, Collection), one line about
       the chosen mode when it says something (chapter, time played), one big primary button. The castle stands behind
       the right half. Footer: Options, Controls, Changelog on the left, key hints and the version on the right.
     - Pause: "Paused" with Resume, Options, Controls and Leave the run as rows on the left; the run's state on the
       right (fight, time against par, party, abilities held with their icons). Esc resumes.
     - Options: categories as rows on the left; each setting is one row with the control that fits it (a value
       cycled in place, a slider with its number, an Off/On pair); one line of help only where it tells you
       something; footer Back and Reset to defaults.
     - End of run: bosses beaten as the title, then Crowned count, time and "Your best run" when it is; highlights
       per player on the left; level and crate rewards as a plain list with icons and rarity on the right; Lobby
       and a primary Run again.
   - **Order:** the lobby first (done, v7.63.0, approved for every menu); then the title, Practice, options, pause
     and the end of run. The ability pick is built by the upgrades session (item 6), from the tall-card spec above.
     The loop goes on while it waits; his answer redirects it.
   Check: desktop and phone frames of every screen; a test that walks every screen with the gamepad alone; each
   screen checked against the `design-audit` rule book.
4. **Co-op moments** (Aleix, 2026-11-13: the coolest Boss Rush out there). Friends new to the genre should have
   clutch moments, not wait out a death. Focus is gone (Aleix, 2026-11-13); this item is revive and highlights.
   - **Revive.** In a party, a fallen player leaves an ember where they fell. A teammate who stands on it for about
     3 s (moving off or being hit cancels it) brings them back at a third of their health, once per fall. The boss's
     attention (`CONFIG.aggro`) leans hard on whoever is reviving: the risk is the point. The server checks every
     revive claim (range, time, the ember's owner), like any other claim. Alone, a fall ends the run (item 9); an
     ability may give a once-per-run rise of your own.
   - **Highlights.** The end screen gives each player one title from their run, the most notable of theirs ("Revived 4
     friends", "12 perfect parries", "Fastest kill: 38 s", "Dragon called 9 times", ...), in the same view as the
     run's numbers (and item 7's crate roll later), not a screen of its own. Alone, the title is yours.
   Check: a test of a revive (claim checked, boss attention moves, cancel on a hit); frames of an ember mid-revive and
   of the end screen's highlights alone and with four players.
5. **Endless.** A run goes on until everyone falls. The first few fights draw from the easier bosses, then every boss
   can come, each fight harder on item 10's curve: fair at first, real by fight 10-12 without abilities, about 20 with
   a great kit, and on from there, slowly harder with no wall. Bosses still spread their attention over the group (`CONFIG.aggro`); modifiers appear after
   the first few fights (faster, an extra phase of new moves, burning ground, a second boss; none adds damage or
   health) and are shown by name under the boss's bar; every few fights two bosses come at once.
   - **Crowned bosses.** Every 5th fight is a Crowned boss (Aleix, 2026-11-13, over every 10th): its own new final
     phase (new moves, by `VISION.md`'s rules: each telegraphed, none shared with another boss), the arena changed for
     that fight (light, ground, hazards: baked, inside Normal's budget), and for winning, an ability pick of 4 with at
     least one legendary (Aleix, 2026-11-13, in place of pacts). The HUD shows how many fights until the next one, so
     the endless run has chapters and a goal ("we hit Crowned 2 last time").
   The end screen shows bosses beaten and Crowned reached. Check: a test that the first fights draw only the easier
   bosses and that fights 5, 10 and 15 are Crowned; frames of a modifier on screen and of a Crowned fight.
6. **Abilities** (Aleix, 2026-11-13). The one name from now on, in the game's text, the code and these files: an
   *ability*, never a blessing, upgrade, boon, skill or power. The pick screen says "Choose an ability"; new code
   says `ability`; old identifiers are renamed when a pass touches them.
   - **First, the upgrades session** ("Design all upgrades and special upgrades from zero", working with Aleix):
     removes the five old blessings and builds the first set, its data and the tall-card pick screen (item 3's spec);
     no pacts (removed, Aleix, 2026-11-13). While it works, the loop doesn't touch `js/data/blessings.js`,
     `CONFIG.blessings`, the offer code or the pick screen. When it has shipped (merged into `main`), this item is the
     loop's, and it comes next in this track. Shipped and handed over (v7.75.0, 2026-11-14): 25 abilities (12
     common, 8 rare, 5 legendary), the tall-card pick, each legendary's effect, sound and camera kick, sounds for the
     rares and the pick, and the lightning dragon. The loop's first work here: the first summons, legendaries up to 8
     and more, then the pool beyond 30, each held to the spectacle bar below. The Ability Grounds (a test ground with
     boss-sized mannequins and every ability) is that session's follow-up, its own PR.
   - **Then the loop owns the pool.** It adds as many abilities as it likes, reworks them, and cuts what doesn't work
     (a cut goes to `BACKLOG.md` with why). A big pool doesn't hurt: aim for 30 or more, at least 8 legendary and at
     least 4 summons, every one fun to get and fun to use. Reached at v7.103.0 (36: 12 common, 16 rare, 8 legendary;
     4 summons). **The new bar (Aleix, 2026-11-14): way more spectacular, super cool, a really wide pool.** Aim for
     **100 or more quality abilities** (Aleix, 2026-11-14): about 25 legendary, at least 8 summons, at least 12 in each
     key's group (Strike, Guard, Summon, Ultimate), the rest triggered. Quality: each does something no other does and
     has its own look and sound; no "+X% damage" filler. Rares as spectacular as today's legendaries and legendaries a
     clear step above that. Two kinds of pass, taken in turn: a spectacle pass that lifts existing abilities to the
     new bar (the plainest first, judged on frames and a short clip of each moment), and a growth pass that adds new
     ones, each with its own look, sound and moment. Every new one keeps item 11's posture rule and `AGENTS.md`'s short card
     text.
   - **Legendaries: OP, at full power, the dragon is the floor** (Aleix, 2026-11-14). A legendary comes at its one
     and only level: never offered again, no upgrades. The lightning dragon is the baseline, not the top: every
     legendary is more spectacular than it and stronger than today's, its own big effect or model, camera moment and
     sound. Strong enough to turn a fight, not to end it on its own (Aleix: relax on "wins the fight by itself").
     **No cap on any rarity:** the four keys already limit what you fire, and two or three legendaries in one offer by
     pure luck is allowed (the rare-luck run is part of the fun). The curve past fight 20 is measured against such
     kits.
   - **Fewer plain stat buffs** (Aleix: "most of the upgrades I'm getting are common stat buffs"). Even commons do
     something you see in the fight (a small effect on a trigger) more than they add a number; plain stat buffs are at
     most a third of the commons and come up less often in offers. Hard to design that many, "but still, let's try".
   - **The design comes first, from its own session** (Aleix, 2026-11-14): the ability design session designs the
     whole pool (about 110, the existing 38 redesigned or cut, plus Story's four) with a ChatGPT concept image for each,
     into `design/abilities/` (one spec per ability, a data entry shaped like `js/data/abilities.js`, effect, sound,
     camera and card specs, a build order in batches). The loop doesn't design new abilities meanwhile; once it has
     shipped, item 6's growth and spectacle passes build it batch by batch with the game's own tools, matching each
     concept image, and the images are references only.
   - **The feel: anime techniques** (Aleix: the cool attacks and effects of a show like Naruto Shippuden). Signature
     moves with a big moment: a lightning dragon that tears out of a fully charged heavy blow, a counter that fires when
     you parry, clones that strike together, a wind blade, a fire burst. `VISION.md`'s rule holds: the spectacle and
     the feel, never a show's names, characters, symbols or looks.
   - **Spectacle by rarity.** Legendary: cool as fuck, really spectacular. Its own model or effect, light, camera
     weight and sound, a moment the whole party notices, readable and fair. Rare: the same treatment, visual effects
     and their own sounds, just smaller. Common: small, mostly numbers, still with a light touch of effect and sound
     so taking one feels like something. Effects stay inside `CONFIG` budgets on Normal (Track A item 3), flashes
     under 3 Hz, `reducedMotion()` respected.
   - **The feeling to aim for** (Aleix, 2026-11-14, after a run): "I already felt like an anime character directing
     abilities and coordinating to kill the boss, while the boss also tried to catch me off guard." The spectacle is
     first **in the fight**: every rare and legendary's moment in the arena is the thing to make spectacular; the card
     comes second.
   - **The cards** (Aleix, 2026-11-14): "simple and easy to understand, but very clean and cool". Common plain; rare an
     animated edge, a few particles and a reveal sound; legendary a short reveal of its own, in its element's look
     (fire, lightning), held a beat. Hovering or selecting a card plays a short loop of the ability in action that
     **shows how it activates** (its key, or the moment that triggers it: a deflect, a full charge). An exception to
     calm menus for the cards only; flashes under 3 Hz, `reducedMotion()` respected.
   - **Triggers** come from moments the combat already has, through `js/events.js`: a fully charged heavy, a perfect
     parry, a perfect dodge, an execution, a posture break, drinking a flask, dropping under a third of your health,
     every Nth hit. The hardest moments carry the legendaries.
   - **Summons** (Aleix: temporary allies or pets, in place of allied bots). A rare or legendary ability calls a
     temporary ally for a set time or a few blows, then it fades: a spectral hound that bites on your parries, an
     ember twin that copies your heavy, a stone guardian that draws the boss for a few seconds. One summon per player
     at a time. It fights only the boss, takes some of its attention, never revives anyone and never blocks a friend.
     Each has its own Blender model (the bot figure is never reused) and its own effect and sound.
   - **The run:** like a true roguelike, an ability you hold can come back as its next level (shown as such, with
     what the new level adds), so a run builds a strong kit. Abilities come only during a run, between fights in the
     arena, and end with it. An ability acts on its owner and the boss and touches teammates only lightly (a small
     shared buff at most), never slowing, moving or linking them. Item 2's pace curve is tuned against a stacked kit,
     solo and in a party, so it keeps climbing past what any kit can hold for long.
   Check: the odds in a test; every legendary and summon seen working in a real fight, alone and in a party of four,
   with frames of each one's moment; rare ones seen with their effect and sound; a test of the curve against a
   late-run kit.
7. **Levels and crates** (waits until the upgrades session has shipped the new abilities; Aleix, 2026-11-13: the
   roll keeps its animation and effects, in the game's style). Playing earns levels, kept per browser. Each level-up
   gives one crate, opened on the
   end-of-run screen: mostly small things (a weapon look, another look, a common ability; no emotes, Aleix, 2026-11-14), rarely a special ability that
   joins your ability pool. A small Collection page off the lobby shows what you own and what's locked. No money, no
   shop, no loadout screen. Opening a crate is a roll like the old CS case opening: a strip of rewards spins past,
   eases to a stop on one, and that one reward is shown with its name, description and what it does, with great
   animation and effects; it should make players want another run just to open the next. Check: odds and saving in a
   test; a frame sequence of a crate rolling and landing, and the Collection.
8. **The weekly run** (kept, Aleix, 2026-11-14: Boss Rush on the week's seed, the lobby's one other choice). Each week, a Weekly mode beside Boss Rush: the same boss order, modifiers and ability offers
   for everyone (one seed from the week). A small board in the lobby shows the best fight reached and the fastest
   kills of this week's runs, by lobby name, kept by the server on Aleix's home server (a file on a mounted volume so container
   updates keep it; no accounts, no data beyond the lobby name and the numbers). Check: a test that two runs on the same week's seed meet the same bosses
   and offers, and that the board survives a server restart; a frame of the board.
9. **Boss Rush is you against the bosses** (Aleix, 2026-11-13: "I don't see a future to having allied bots on the
   boss rush mode"). First in this track's order.
   - **Allied bots leave Boss Rush and the lobby:** no "Add a friendly bot" (`lobbyAddBot`, the server's
     `addBot`/`clearBots` path for parties), and no bot ever fills a party. Practice keeps bots for its team fights,
     Story keeps its companions, and the loop keeps bot bodies as its own test players (`tools/bot-fights.cjs`,
     `PERSON=1`), never in a player's party.
   - **Alone is the yardstick.** Boss Rush is tuned for one skilled player: fight 1 about a minute alone, the pace
     curve as item 2 set it. More friends join freely and nothing scales with team size, so a party has an easier
     time; that's the reward for bringing friends.
   - **Alone, a fall ends the run.** In a party, item 4's revive.
   - The temporary-ally feeling comes back through summon abilities (item 6), not bots.
   Check: no bot in any Boss Rush party or lobby; a run started alone and one with two people; fight 1's solo time
   against the target; the Practice team fight and Story companions still work.
10. **One difficulty for every boss, and the new curve** (Aleix, 2026-11-13). Right after item 9.
   - **A new 1x.** Every boss is re-tuned in its own data (idle gaps, recoveries, string lengths, mix-ups; its `hp`
     as item 2 set it) so that its base is slower than today and about as hard as every other boss, 1v1. That tuned
     base is the new `CONFIG.pace.boss` 1: no global multiplier stands in for it. Boss Rush doesn't fuss over the
     player's feelings boss by boss: the test bot measures it (`tools/bot-fights.cjs`, solo, `PERSON=1` as the person
     stand-in), and every boss lands within a narrow band of fight time and falls taken, the outliers fixed first.
   - **Boss Rush starts at 1x, not too easy.** Fight 1 is a fair fight for a newcomer and quick for a skilled player;
     the first few fights stay friendly, and it gets real early.
   - **The curve climbs faster.** Same shape and rule as item 2 (exponential in fights won, speed only: never health
     or damage, tells always readable, the modifiers and Crowned phases on top), re-tuned to these targets for one
     skilled player alone:
     - no abilities: falls around fight 10-12;
     - with abilities: about 20, and a great kit goes on past it;
     - no wall: the climb goes on, slowly harder, with no cap a run can hit (Aleix, 2026-11-14).
     Friends get further (nothing scales with team size); that's fine.
   - **Abilities count.** Measure each target twice with the test bot: with no abilities, and with a strong kit
     (scripted picks from item 6's pool, the best a lucky run could hold). Until item 6 has shipped, measure the
     no-ability target alone and come back to the kit one once it lands; every big addition to the pool re-checks it.
   - **Practice** fights at 1x by default, with a setting to face a boss at the speed of any later fight, to learn it
     slow or rehearse a late run.
   - **Story** is tuned for the player's experience, not the bot (track A, item 5): its bosses may sit below 1x
     early and climb chapter by chapter to the finale.
   Check: a table of every boss's solo time and falls before and after, alone at 1x; the bot's fight reached across
   several runs, with no abilities and with a strong kit, against the targets; a test of the curve's speed at fights
   1, 5, 10, 15 and 20 (speed changes; health and damage don't); a frame of Practice's speed setting.
11. **The run's shape: a warm-up, fewer legendaries, no instant breaks** (Aleix, 2026-11-14, after a run to fight 21:
   fights 1-4 were the hardest; once the abilities, the legendary ones above all, came in it was a cruise; he fell
   at 21 by being careless; some abilities filled the boss's posture so fast he beat it in an instant). The end must
   come from the bosses, not a slip. Right after item 7's pass in progress, ahead of everything else left.
   - **A warm-up.** Fights 1-4 draw only the easiest bosses and start a little under 1x, reaching 1x by fight 5. Every
     run starts with one free pick of rare abilities before fight 1 (Aleix, 2026-11-14; was commons), so it never
     opens empty-handed.
   - **Legendaries: superseded** (Aleix, 2026-11-14): no cap on holding them, no levels, stronger, not a third weaker;
     item 6's "Legendaries" rule. Their odds still grow slowly as the run goes on, and a Crowned win still offers one
     (item 5).
   - **The stagger meter stays earned** (Aleix: it is super important). Abilities, summons included, fill a boss's
     posture far less than they deal damage, and each posture break in a fight makes the next one need more, on top
     of `postureRest`. Target: even a strong kit breaks a boss no more than about every 15-20 s, and an execution is
     a reward, never the whole fight. `breaker` and every ability's `posture` are re-tuned against it.
   - **The shape**, for one skilled player alone: fights 1-4 a warm-up to learn on; 5-10 real fights; 10-15 hard even
     with a good kit; 15-20 brutal; past 20 harder still, fight after fight. The curve (`CONFIG.pace`) steepens from
     about fight 8 and then keeps climbing at a steady rate: no ease after 15, no wall at 21 (pass 76's ease and wall
     go; Aleix, 2026-11-14: "let the player enjoy their skills"). A great kit can carry a skilled player past 20 for a
     good while. Item 10's
     targets stand (about 10-12 without abilities, about 20 with a great kit); what changes is that a strong kit must
     be struggling by 15.
   - **Every kind of pick is worth taking** (Aleix, 2026-11-14). Health picks carried the bot further than damage and
     posture (pass 76: fight 18 vs 16). Health picks come down a little and damage picks go up, until a damage kit and
     a health kit reach about the same fight.
   - **Fight length and Swift kill** (Aleix: the first fights took 2 minutes at least; with abilities he got a Swift
     kill in almost every later fight). Fights 1-4 last about a minute for a skilled player with no abilities: the
     warm-up bosses' health comes down until they do (`CONFIG.swift.par`, 45 s, stays the bar to beat). Later, par
     follows what the player holds as well as the curve, so a Swift kill stays an achievement: a skilled player with a
     good kit earns it in about one fight in three, not nearly all of them. Each boss's par comes from its own
     health (Aleix, 2026-11-14), so quick and slow bosses give Swift kills about as often.
   Check: the test bot's runs with no abilities and with a strong kit (three legendaries, the best posture
   abilities), against these targets: fight reached, fight times by stage, Swift kills per stage, and seconds
   between posture breaks
   with that kit; a test of the legendary cap, the warm-up bosses and the free first pick.
