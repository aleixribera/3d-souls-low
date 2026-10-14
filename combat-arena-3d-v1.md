# Build Guide: Combat Arena 3D, Version 1

This file is standalone. You do not need any other file to build v1. It replaces the 2D guides for this version.

Goal: one HTML file that runs in a browser with no installs and no build step. It is a 3D version of the combat arena: one arena, a third-person camera, the player, and one enemy at a time chosen from a menu.

Feel is the primary requirement. Choose all numbers yourself. Make the game feel as close to Dark Souls combat as you can: weighty, committed, readable, and punishing. Do not copy values from the real games.

---

## 0. Deliverable

Create ONE file: `combat-arena-3d.html`

- Plain HTML, CSS, and JavaScript in one file.
- One external library is allowed: **Three.js**, loaded from a CDN, pinned to one specific version. Use `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js` or an equivalent pinned URL. Load it with an ES module `<script type="module">`. Do not use any other external resource.
- No frameworks, no bundlers, no npm, no fonts, no images, no audio.
- Everything else is written in the single HTML file.

---

## 1. Screens

Two screens. The game starts on the first.

**Menu**
- Title: "COMBAT ARENA 3D".
- A vertical list of four buttons, one per enemy: Hollow Soldier, Undead Knight, Fast Rogue, Giant Skeleton. Each has a one-line description.
- Keyboard: Up and Down arrows or W and S to move the selection, Enter or J to confirm. Mouse click also works.
- Style: dark background, muted gold border, dark buttons that highlight on hover and selection.

**Arena**
- Starts when an enemy is chosen. Escape returns to the menu.

---

## 2. Scene

- A flat rectangular stone floor. Enemies and the player stand on it. The floor has a slightly lighter edge so the playable limits are readable.
- Low stone walls or a boundary around the edges. Player and enemy cannot move past them.
- A few simple background pillars to give the space depth. Pillars have no collision.
- Lighting: one dim directional light for shape and one warm point light near a decorative bonfire on one side of the arena. Keep the scene dark and moody.
- Fog or a gradient background that darkens with distance.

---

## 3. Characters

Characters are built from simple 3D primitives: boxes for limbs and torso, a sphere for the head, and a thin box for the sword. No imported models.

**Player**
- Tall, narrow armored humanoid. Tan-gold armor color.
- Weapon: a thin sword held in one hand.

**Enemies**
Each enemy is the same humanoid construction, scaled and colored differently:
- Hollow Soldier: medium size, brown-tan color.
- Undead Knight: large and bulky, gray-steel color.
- Fast Rogue: small and slim, dark green color.
- Giant Skeleton: very large, bone-gray color, with a thicker club weapon.

Enemy sizes and stats must keep the relationships from the earlier guides:
- Fast Rogue is faster and more fragile than the Hollow Soldier.
- Undead Knight is slower and tankier.
- Giant Skeleton is the largest, slowest, and hardest by a clear margin.

Every enemy's weapon turns a warning color during the wind-up of an attack, so the attack is readable.

---

## 4. Camera

- Third-person camera behind and slightly above the player.
- The camera follows the player smoothly. It does not snap.
- While the player is near the enemy, the camera leans slightly so both are visible.
- The camera never passes through walls. If it would, pull it closer to the player.
- Do not let the camera rotate with the mouse in this version. Its position is fixed relative to the player's facing direction.

---

## 5. Controls

| Action | Keys |
|---|---|
| Move | W A S D or Arrow Keys (movement is relative to the camera) |
| Jump | Space |
| Roll (dodge) | Shift |
| Light attack | J or Left Mouse |
| Heavy attack | K or Right Mouse |
| Block (hold) | L or hold Ctrl |
| Reset fight | R |
| Return to menu | Escape |
| Toggle help | F1 |

- Prevent the browser context menu on the canvas.
- Track held keys and key presses separately. A key press is used once.

---

## 6. Game Loop and Frame Rate

- Use `requestAnimationFrame`. Do not cap the rendering rate to 60 frames per second. Rendering runs at the display's native rate, including high-refresh displays.
- Gameplay simulation uses a fixed timestep. Simulation speed must not depend on the display's refresh rate.
- Accumulate elapsed time each frame and run as many fixed steps as needed. Clamp the number of steps per frame so that a stalled tab cannot cause runaway updates.
- Interpolate rendered positions between simulation steps so motion is smooth on high-refresh displays.

---

## 7. Movement and Physics

- Gravity pulls the player and enemies down. Jumps feel grounded and committed, not floaty.
- Walking speed is moderate.
- Jumping costs no stamina. Air control is weaker than ground control.
- Stamina regenerates steadily while not attacking, blocking, or rolling. It pauses briefly after being spent.
- Roll: a short committed dodge in the facing direction. It has a brief invulnerable window at the start, then the player is vulnerable while the roll finishes. It costs a significant amount of stamina and cannot be started while already rolling or without enough stamina.
- Facing follows the last horizontal input. Enemies always face the player.

---

## 8. Combat

### 8.1 Player Attacks

Both attacks have three phases: **startup** (wind-up, no hitbox), **active** (hitbox out), and **recovery** (committed).

- **Light attack:** short, fast, cheap in stamina, moderate damage, small poise damage, small knockback.
- **Heavy attack:** clearly slower in every phase than the light attack, with a visible wind-up. Much larger stamina cost, higher damage, higher poise damage, larger knockback.

Attack rules:
- Each swing hits each target at most once.
- During startup and active phases, the player cannot roll or block.
- During recovery, the player may roll if stamina is sufficient. Blocking is not allowed during recovery.
- The attack hitbox is a box in front of the player. Its size is chosen so that light and heavy attacks feel distinct.

### 8.2 Enemy Attacks

Each enemy has a list of attacks. Each attack has startup, active, and recovery phases, a hitbox, damage, and poise damage.

- Hollow Soldier: a standard sword swing with a readable wind-up and short recovery, and a slower overhead strike that is stronger but more punishable.
- Undead Knight: a very slow, very dangerous greatsword slam with a long wind-up and long recovery, and a faster shield bash with short range.
- Fast Rogue: a quick stab with short timing, and a double slash that hits twice with a short gap between hits.
- Giant Skeleton: a huge club sweep with a very long wind-up and a wide hitbox, and a stomp that covers the ground near it.

Enemy attacks must have a wind-up long enough for a competent player to react with a roll or block.

After an attack's recovery, an enemy waits a short cooldown before choosing another. The next attack is picked at random from its list.

### 8.3 Blocking

- Holding block stops movement and jumping. The player faces the way they were facing when the block began.
- A frontal block (attack from the side the player faces) greatly reduces damage, costs stamina per hit, and reduces poise damage.
- An attack from behind is not blocked and deals full damage.
- If stamina runs out while blocking, the block breaks: the player is staggered for a noticeable duration and the hit lands at full effect.
- Stamina does not regenerate while blocking.

### 8.4 Hit Resolution

Each simulation step, resolve hits in this order:
1. Player hitboxes against enemy bodies.
2. Enemy hitboxes against the player's body.
3. Apply damage, poise loss, knockback, and stagger.

Damage rules:
- A rolling player within the invulnerable window takes no damage.
- A blocking player facing the attacker takes greatly reduced damage and spends stamina.
- A blocking player attacked from behind takes full damage.
- Otherwise, full damage.

### 8.5 Poise and Stagger

- Each character has a hidden poise meter. Poise loss from hits reduces it. When it reaches zero, the character staggers for a short time, and poise refills after the stagger.
- A stagger does not cancel an attack that has already begun its active phase. It does cancel an attack that is still in its startup phase.
- Hit-pause: on any landed hit, both sides freeze very briefly so impacts feel weighty.

### 8.6 Death

- When the player reaches zero HP, show "YOU DIED" in dark red, fading in slowly, then "Press R to respawn".
- When an enemy reaches zero HP, it fades out and stays dead until the fight is reset.

---

## 9. Visual Feedback

- Attack telegraphs: an enemy's weapon turns a warning color during its startup.
- Hit effect: a small burst of particles at the point of contact. Particles are simple small cubes or spheres that fade out.
- Block effect: a brief spark burst.
- Player hurt: a brief red tint on the player's material.
- Enemy hit: a brief white tint on the enemy's material.
- Death: the dying character tips over and fades out.

---

## 10. HUD

Drawn as HTML over the canvas, not inside the 3D scene.

- Top-left: player HP bar with a trailing bar that drains slowly, a stamina bar below it.
- Top-center: enemy name and HP bar.
- Bottom-left: "F1: help". When F1 is toggled on, show the controls list and a toggle for hitbox display.

Hitbox display (F1 toggle): draw wireframe boxes around active hitboxes and body volumes so the player can see the hit areas.

---

## 11. Code Structure

Organize the script in this order:

1. `CONFIG`: all gameplay values in one place. Nothing else hard-codes gameplay values.
2. `ENEMY_DEFS`: four enemy definitions, each with name, description, size, color, HP, poise, speed, aggro range, and attacks.
3. `input`: held keys, pressed keys, mouse, with buffering so a press shortly before the player can act is remembered.
4. Scene setup: renderer, camera, lights, floor, walls, pillars, bonfire.
5. `Player` class with an explicit state machine: idle, walk, jump, fall, roll, attack, block, hurt, stagger, dead.
6. `Enemy` class with an explicit state machine: idle, chase, windup, active, recover, hurt, stagger, dead.
7. Hitbox helper: create, overlap check, track which targets have been hit.
8. `resolveCombat()`: implements section 8.4.
9. Particles and tint effects.
10. HUD update.
11. `Game` object: menu, arena, reset, update, render.
12. Bootstrap: resize handling, fixed-step loop.

Each entity has one explicit `state` string and a `stateTime` counter. No hidden flags stand in for states.

---

## 12. Acceptance Checks

Run through each check in a browser before finishing.

1. Open the file with no server. It loads with no console errors.
2. The menu shows four enemies. Choosing one starts the arena against that enemy.
3. The player moves in the camera's direction, jumps, and stays on the floor and inside the walls.
4. The camera follows the player smoothly and never passes through walls.
5. Light attack hits an enemy in range and costs a small amount of stamina.
6. Heavy attack is clearly slower and stronger, and costs much more stamina.
7. Roll moves the player forward, costs stamina, and is invulnerable at the start.
8. Block reduces frontal damage greatly, costs stamina per hit, and does not reduce damage from behind.
9. Every enemy shows a warning color on its weapon during each attack's wind-up, and attacks are chosen at random from its list.
10. The Giant Skeleton has the longest wind-ups and largest hitboxes. The Fast Rogue has the shortest.
11. Enemy stagger happens after enough hits. Heavy enemies need noticeably more hits than light enemies.
12. Player HP reaching zero shows "YOU DIED", and R restarts the fight.
13. Enemy HP reaching zero fades the enemy out.
14. Escape returns to the menu, and choosing another enemy starts that fight.
15. HUD bars update visibly, and the trailing bar drains.
16. F1 toggles the help and hitbox display.
17. Motion is smooth on a display above 60 Hz, and gameplay speed is the same as on a 60 Hz display.
18. Resizing the window keeps the scene filling the window without distortion.

---

## 13. Not in Version 1

- No parry, lock-on, bonfires, flasks, Souls, or Bloodstain. These come in later versions.
- No boss posture. The Giant Skeleton uses the same stagger rules as the other enemies in this version.
- No levels. One arena only.
- No mouse camera control.
- No sound, music, or imported models.

---

## 14. Final Output

- A single file `combat-arena-3d.html`.
- A short summary: how to start, the key bindings, and confirmation that the acceptance checks were run.
- If any check fails, fix it before finishing. Do not report partial completion as done.
