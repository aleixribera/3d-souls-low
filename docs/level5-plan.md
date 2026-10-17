# Level 5 — The Final Castle: Phase 0 audit & proposal

## 1. Audit: how the game is built now

**Levels** are plain objects in `js/levels/*.js`, listed in `LEVELS` (`js/data/levels.js`) and loaded through `GAME_FILES`.
Levels 2–4 use `layout: 'rooms'`:
- `rooms`: rectangles with floor height `y`, `height`, `open` (sky), `edges` (rail/open), `railHeight`, pillars, braziers, lamps.
- `ramps` (stairs), `blocks` (solid masses).
- `gated` zones: a `trigger` rect spawns enemies, and a `gate` lifts when they are all dead. The level completes when every gate is open.
- `dispersed` enemies: sentry, patrol, slumber, ambush.
- `shortcuts` (gates that open from one side, `opensFrom`), `sealed` gates, `traps` (collapsing floors).
- `cull: true` (only enemies near the player update), `alert` (an enemy that notices you wakes others; `zone` wakes the whole zone).

**Bonfires**: `bonfires: [{ id, x, z, y, spawn }]`. Resting heals, refills flasks and respawns enemies. Enemies dead at the last rest stay dead (`Game.cleared`, `placementKey`). Dying puts you at the last bonfire, or at `start` if you haven't rested yet. That last point is exactly the rule Level 5 needs for the opening fight.

**Next level**: `next: '<id>'` fades into the next level when the current one completes. Level 4 has no `next`.

**Bosses**: these are ordinary enemy defs with `posture`, which is what shows the top boss bar (`hud.js`). They use four-phase attacks (`pose`, `tracking {rate, commit}`, `markers` with parry glints, `hold` delayed hits, `rollOnly` unblockable, `dash`, `shove`, `projectile`, `minRange`, `chance`). Existing bosses: Pillager Captain (L3) and Bell Warden (L4). **No phases, no retreat, no invulnerability, no area attacks and no scripted boss movement exist yet.** There is an enemy `LEAP` state (a gap-closing jump) I can build on.

**Models**: procedural, with a fixed humanoid skeleton (`js/bodykit.js`) and budgets of ~1,500 / 3,000 / 6,000 triangles. Factions in the README: *Ironbound* (plate, mail, slate tabards, pale blue eyes) and the *Ashen* invaders (Lancer, Executioner, Pillager Captain).

**Visuals**: each level has an `atmosphere` block. Level 3 already draws "a massive castle on the horizon" (`landmark`). That castle is Level 5.

**Story as it exists**: there are no items, item descriptions, NPCs or dialogue. The story lives only in level names, descriptions, help lines, enemy descriptions and the README roadmap ("Level 5 and the final boss, in the castle on the horizon"). Facts I must not contradict:
- L1/L2: the Long Hall and the Sunken Keep. Hollows, Knights, Wardens, a throne room in the Keep.
- L3: "the invaders sacked the town and set it alight". Their commander is the Pillager Captain. The castle stands on the horizon.
- L4: the Tower above the town. The Bell Warden is "keeper of the tower bell". Nothing says why the bell matters. **I have to fill that gap**, and I'll do it with a couple of lines (see 2).

## 2. Proposed story beats

- **The prisoner.** You were thrown into the castle lord's gaol: the Long Hall and the Sunken Keep were his prison. You escape them (L1–L2).
- **His army.** The Ashen invaders who burned the town are his host, and the Pillager Captain was his sworn commander (L3).
- **The bell.** The tower bell is the old *challenge bell*. By ancient right, whoever rings it calls the lord out of his castle to answer in single combat. The Bell Warden existed to stop anyone from ringing it. You ring it (L4 end).
- **L5 opening.** He answers the bell. He comes out of his gate and meets you on the field before the castle. You break him, but he refuses the duel's law: he flees inside and seals himself in. Bonfire 1 lights at his broken gate.
- **The climb.** His last defenders hold the outer ward, the keep and the throne approach. You glimpse him twice, watching.
- **The throne.** The bell starts tolling on its own (the challenge must be answered). In Phase 2 the ash that fed his army burns out of his armour.
- **Ending.** He dies. The bell gives one last toll and falls silent. The gaol's iron keys drop from his ash. Dawn rises over the castle, the town and the tower: "No one rings for him now." Credits.

**Small edits outside Level 5 (text only):** a `completeHint` on Level 4 ("The bell has rung. He will answer…"), `next: 'final-castle'` on Level 4, and one-line flavour in a few enemy descriptions. No system changes.

**Boss name:** **Varn, the Gaoler King**. In Phase 2 he becomes **Varn, Knell of Ash**.

## 3. Level layout

The level uses rooms layout with `cull: true`. x runs east and the castle is to the east. Heights are given in metres. Times assume a careful first run.

### Arrival: the Field of Answer (y 0, open)
- Arena rect about 0..90 × -45..45 (90 × 90 m). Open grass and flagstones, a few low broken stones near the edges only, and no pillars in the centre, so the camera never gets stuck.
- The castle fills the eastern sky (a close version of the landmark mass plus real walls at x 90+). A 12 m curtain wall and a closed gate stand at x 90.
- Start at x 15, facing east. The boss walks out of the gate as the level opens (in-game, the player keeps control).
- **Retreat**: at 0 HP he staggers (~1.5 s, invulnerable), leaps onto the wall top (~3 s arc), turns and disappears behind it. The bar fades. The gate cracks and falls in with dust and shake (visual only). **Bonfire 1** lights in front of the gate. This all uses existing events (`strike`, `shake`, the bonfire lighting).

### Bonfire 1: the Broken Gate (x 92)

### Section A: the Outer Ward (y 0 to 6), ~6–8 min
1. **Gatehouse passage** (dim, torches). A Hollow pair and a hint corpse.
2. **Lower courtyard** (open, lamps). The first mixed fight. Bowmen on a low wall walk (y 4) reached by a side stair. A Gargoyle is perched on the arch, with a cue (see enemies).
3. **Barracks** (interior, side). A Warden and a sleeping Knight. Its back door is a **shortcut** gate (opens from inside) back to Bonfire 1.
4. **The Moat Bridge**, the **standout**: a long 5 m-wide railed bridge over a dark moat. An **Empty Sentinel** (giant animated armour) holds the middle. The bridge is wide enough to circle it, and Bowmen on the far tower can be ignored or killed later.
5. **Upper courtyard** (open). From here you **glimpse Varn** on the keep balcony (sighting 1). He watches, turns and walks inside.
- **Bonfire 2**: in the chapel at the keep doors.

### Section B: the Inner Keep (y 0 to 16), ~7–9 min
1. **Great Hall** (y 0, long, tall, with pillars and chandelier light). Banquet tables act as cover. A Lancer pair and a Duelist. You can come in through the hall or through the side kitchen (another approach).
2. **Hall stair** to the **gallery** (y 8), which runs round the hall above it. A Bowman sits up here; the gallery also gives the player a way to drop on the hall fight.
3. **Ramparts** (y 8, open sky, wind). The **standout**: a Shover pair and Gargoyles that dive from the merlons, on a railed walk with **one gap**. Rails are everywhere except the marked gap (lit by a brazier).
4. **Sighting 2**: Varn on the throne tower's bridge high above (y 24), looking down. Then he is gone.
5. **Tower stair** (spiral, y 8 to 16), with an Executioner on the landing.
- **Shortcut**: a ladder-gate from the ramparts drops back to the Great Hall near Bonfire 2.
- **Bonfire 3**: the tower top (y 16).

### Section C: the Throne Approach (y 16 to 24), ~8–10 min
1. **The Ash Bridge** (y 16, open, long, between the tower and the throne keep). Toll Wisps float beside it, reachable from the bridge.
2. **The Processional** (y 20, a colonnade lit by braziers toward the throne glow). The **designed gauntlet**: up to 5 enemies (Duelist, Lancer, Knight, Executioner, Empty Sentinel) in two waves. You can **split** them: side alcoves and a side gallery let the player pull them one at a time, and the Sentinel sits behind a gate and wakes only on wave 2.
3. **Royal stair** (y 20 to 24), with an Elite Warden at the top.
- **Final Bonfire** (y 24), about 15 m and no enemies from the **fog door** of the throne room.

### Throne Room (y 24)
- 40 × 50 m, a pillared nave with stained-glass windows, the throne on a dais and a glow behind it. Pillars stand along the sides only.
- In the transition: the windows shatter (visual shards fall outside the floor), two side pillars crack and fall onto marked side areas (no damage), braziers become columns of fire, and the bell tolls three times far away.

**Guidance lighting**: warm torches mark the path, cold blue marks dead ends, every door to the next area has a brazier pair, and the throne glow is visible from the Ash Bridge onward.

**Debug (in `#dev`)**: an "L5 Jump" menu with Arena, Bonfires 1–4 and Throne, plus keys for "boss to 1 HP" and "force Phase 2".

## 4. Enemy roster

| Section | Enemies (max 3 engaged at once except the C gauntlet) |
|---|---|
| A (hard) | Hollow ×4, Bowman ×2, Warden, Knight (slumber), Lancer, Gargoyle ×1, **Empty Sentinel** (bridge) |
| B (harder) | Lancer ×2, Duelist ×2, Bowman, Shover ×2, Gargoyle ×2, Executioner, Rogue ambushers ×2 (with hints) |
| C (hardest) | Toll Wisp ×3, gauntlet (Duelist, Lancer, Knight, Executioner, Empty Sentinel), elite Warden, elite Pillager-style Halberdier |

Castle variants use stone dust, rust, and the castle colours: **slate and tarnished bronze with pale blue eyes** (the Ironbound) plus the ash-black of the invaders.

**New castle-only enemies** (not human):
1. **Gargoyle** (stone, winged, crouched): perches still on walls, then dives (a `LEAP` attack). Cue: grit falls and stone grinds before it moves. It has low HP and is heavy to hit.
2. **Empty Sentinel** (animated armour with no one inside, pale blue light in the joints): a slow giant halberd user with a delayed sweep and a rollOnly slam. This is the standout heavy.
3. **Toll Wisp** (a small floating bell of blue flame): a ranged caster whose shot rings before it fires (an audio cue). It is fragile and floats at reachable height beside walkways.

*Constraint:* the skeleton is fixed and humanoid, so all three are built on it (crouched, empty or hovering). A four-legged beast would need skeleton changes, so I'm leaving that out.

**Ambush hints**: a corpse, a dripping shadow or a grit fall before every ambush.

## 5. Boss: Varn, the Gaoler King

He is a tall Ironbound king (bronze plate, slate tabard, a crown of shackles, ash in the cracks). His weapon is a great gaoler's blade with a chain and ring of keys on its pommel. The boss budget is ~6,000 triangles.

### Phase 1 (outside): slower, teaching. 7 attacks
1. **Gaol Sweep**: a wide horizontal cut. Glint, parryable, tracking commit 0.6.
2. **Two-Step Cleave**: a two-hit combo, each hit glinted and parryable.
3. **Warden's Delay**: a raised overhead with a `hold` (delayed) before the strike. Parryable.
4. **Shackle Lunge**: a dash thrust from range (`minRange`, `dash`).
5. **Iron Shoulder**: a short shove at close range that punishes turtling.
6. **Key-Ring Stomp**: an unblockable (`rollOnly`) stomp with a small shockwave ring around him.
7. **Signature: Judgement Leap**. He crouches (a long, readable wind-up), leaps high, hangs at the top while tracking, and crashes down. Then a shockwave ring, a dust and ember burst, and camera shake. **Recovery is long, which is the big punish window.**

All enemy hits stay active below the 0.3 s roll i-frames, as the existing test checks.

### Throne fight, bar 1
The same 7 moves. About 20% shorter cooldowns, he never kites, and Two-Step can extend into Warden's Delay.

### Phase 2 transition (~15 s, invulnerable, deals no damage)
He kneels, the bell tolls in the distance (×3), the windows burst inward and the shards fall outside the floor. Side pillars topple onto marked side areas. His armour cracks with ember glow, his blade ignites and the shackle crown burns. The bar refills under the new name, and the music layer and drone rise.

### Phase 2: Varn, Knell of Ash
Faster recoveries, longer combos, less idle time, and tracking rate up while commit points stay the same (honest). Every move gets fire trails and ember bursts.

New attacks:
1. **Tolling Chain**: a four-hit combo. Hits 1–3 are parryable; hit 4 is a rollOnly overhead.
2. **Ash Wave**: a ground slash that sends a travelling wall of fire along the floor (a ground projectile you roll through or sidestep).
3. **Burning Ascent**: a rising uppercut that leads straight into a short Judgement Leap.
4. **The Last Toll** (big area attack): he plants the blade and the bell tolls three times. Each toll sends a fire ring outward from him, timed to the sound and visibly expanding. Roll through each ring, or keep distance until it fades. It ends with a close blast; he is open afterward.

### Death
He staggers, falls to one knee and rises one last time. His armour cracks and blue-white light pours out. He crumbles into an ash spiral, leaving the keys and the blade upright in the floor. The bell gives one final toll and goes silent. The player keeps control throughout; the fade comes about 4 s after.

## 6. Ending and credits
Three short text cards over a dawn view of the castle (town and tower in the distance), then credits rolling, then "Thank you for playing." After ~8 s, "Press any key to return to the title." The completion flag is saved in `localStorage` and is shown as a ✦ on the Levels menu.

## 7. New engine pieces needed (all opt-in, data-driven)
- **Boss phases** in the enemy def: `phases: [{ name, hpFrac, attacks, tuning, transition }]`, plus an `invulnerable` state and the bar refill.
- **Retreat script** (`onDefeat: { retreat: path }`) for the opening fight.
- **Area hitboxes**: an expanding ring and a radial burst on attack hits.
- **Ground-wave projectile**: an extension of `projectiles.js`.
- **Spectator placements**: a non-interactable model on a scripted path, for the sightings.
- **Fog door**: a gate that lets you through from one side and seals during the fight.
- **Ending/credits screen** and the completion flag.
- **Dev L5 jump menu**.

None of these change how Levels 1–4 behave. The only edits to existing levels are the Level 4 text and `next` lines.

## 8. As built (v4.3) — differences from this plan
- Tolling Chain: all four cuts can be parried (parry is decided per attack, not per hit); its fourth cut is a delayed hit instead.
- Ramparts: railed all along, no gap; the danger is the Shover, two Gargoyles and the Executioner, not a fall.
- Section C: the processional has two halls (four enemies in the first, two heavies in the second) and no elite Warden or Halberdier; the final bonfire landing has no enemies.
- Sightings: Varn stands on the chapel roof (seen from the upper courtyard) and on the ash bridge (seen from the ramparts).
- The falling pillars, burst glass and fire columns are drawn only and can never hurt; the landing strips glow red while they fall.
