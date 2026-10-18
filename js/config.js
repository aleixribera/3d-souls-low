'use strict';
// ============================================================================
// 1. CONFIG
// ============================================================================
// Shared tuning. Per-character data (player, enemies, items) and level layouts live in section 2.
const VERSION = 'v7.2.1';   // shown in the corner of the menus; each release is tagged with the same name
const CONFIG = {
  step: 1 / 60,          // fixed simulation timestep (s)
  maxSteps: 5,           // max simulation steps per rendered frame
  gravity: 30,
  input: { buffer: 0.2 },   // seconds a press is remembered; the clock stops during hit-pauses
  camera: {
    focusRate: 3.5,   // how fast the camera turns to a scripted moment (Game.camFocus)
    fov: 55, lookHeight: 1.5,
    lead: 0.45,           // m the aim leads ahead of the player at full speed (unlocked), so the view opens where they go
    lookRate: 11,         // aim smoothing (1/s): quicker than the position, so the player never drifts out of frame
    followRate: 7,        // position smoothing (1/s)
    yawFollow: 1.15,      // how fast the camera swings behind the facing while the player moves (rad/s at 90 deg off)
    moveSpeed: 3,         // planar speed (m/s) at which the swing and the auto-levelling reach full strength; none standing still
    levelPitch: 0, levelRate: 1.4,   // auto-levelling: the camera height eases back to this pitch (1/s) while the player moves
    leanRange: 11, leanAmount: 0.38, leanPullback: 1.4, leanRaise: 0.5,
    wallMargin: 0.3, gateMargin: 0.6, closeRaise: 1.6, floor: 0.6, ceilingMargin: 0.7,
    refRate: 8,           // how fast the camera's ground height follows stairs and drops (1/s)
    // Camera feel (js/camera-feel.js, drawing only; the "Camera motion" option turns it off): critically damped springs
    // of stiffness `omega` (1/s). Offsets in m, rolls in rad, fov in degrees. A swing nudges forward (`swing`, heavies
    // `heavy` and dip), a roll widens and dips, a blow taken pushes away from the attacker (scaled by damage over
    // `hurtRef`, blocked x `blockMul`), parries / heavy hits (from `punchFrom` damage) / breaks / executions punch the
    // view in; sideways movement leans the horizon by `strafeRoll` at `moveRef` m/s. Never past `maxRoll` / `maxFov`.
    feel: { omega: 13, swing: 0.05, heavy: 0.1, heavyDip: 0.04, swingRoll: 0.006, rollFov: 3, rollDip: 0.06,
            hurtRef: 40, hurtPush: 0.14, hurtRoll: 0.02, hurtFov: 1.2, blockMul: 0.45, punchFrom: 40, hitFov: -1.4,
            parryFov: -3, parryPush: 0.06, breakFov: -1.8, executeFov: -2.2, phaseFov: 2.5, landDip: 0.1,
            strafeRoll: 0.012, moveFov: 1.2, moveRef: 5, maxRoll: 0.05, maxFov: 6 },
  },
  zoom: { min: 2.6, max: 12, step: 0.8, default: 4.9, rate: 7, repeatDelay: 0.28, repeat: 0.09,
          heightRatio: 0.44 },   // camera height = distance * heightRatio
  mouse: { yawPerPx: 0.0006, pitchPerPx: 0.0005, holdTime: 1.6, pitchMin: -0.3, pitchMax: 0.7 },
  // Gamepad (standard layout). Sticks: dead zone, then rescaled to 0..1. Camera speeds are rad/s at full
  // tilt and sensitivity 5 (the Options value scales them like the mouse). A flick switches lock-on target
  // when the right stick passes `flick` sideways after resting below `flickReset`. Menus repeat a held
  // direction after `menuDelay`, then every `menuRepeat` s.
  gamepad: { deadzone: 0.2, trigger: 0.35, lookYaw: 2.6, lookPitch: 1.4, flick: 0.75, flickReset: 0.35,
             menuStick: 0.6, menuDelay: 0.35, menuRepeat: 0.12 },
  lock: { range: 16, breakRange: 21, lostTime: 1.0, turnRate: 12, camYawRate: 5, frame: 0.45,
          coverTime: 1.5,             // a target hidden behind cover (not a closed gate) stays locked this long
          // Always-retarget's pick (Game.retargetPick): score = distance from the middle of the screen (0 middle,
          // 1 edge; `offScreenScore` if off it but in front) + distance from the player / `retargetDistance` m.
          retargetDistance: 10, offScreenScore: 1.5,
          slack: 0.42, drift: 0.18,   // camera yaw slack (rad) and the slow drift inside it (1/s)
          autoRange: 9,               // first-encounter auto lock-on distance
          sizeDist: 0.6, sepDist: 0.28, maxExtra: 6, markerGap: 0.45 },
  player: {
    poiseResetTime: 4, staminaRegen: 36, staminaDelay: 0.75,
    walkSpeed: 4.3, accel: 26, decel: 22, turnRate: 14,   // v4.1: accel 34, decel 28 (a little more weight)
    airTurnMul: 0.4,       // turning while airborne, as a fraction of turnRate
    blockSpeedMul: 0.45,   // guarded shuffle: facing stays fixed (or on the lock target) while moving
    jumpVelocity: 8.2, airControl: 9, jumpCost: 14,
    jumpAttackAirControl: 0.6,   // multiplier on air control during a jump attack
    landKeep: 0.35,              // horizontal speed kept on a jump-attack landing
    rollCost: 22,   // a roll needs any stamina at all, and drains what's left (to 0 at worst)
    // Exhaustion (Souls-style penalty): emptying the stamina bar, by any action, leaves the player exhausted: no roll,
    // attack, parry or jump until it has refilled to `exhaustRecover`, and it starts refilling only after `exhaustDelay`
    // s (instead of staminaDelay). The bar shows it, and a press while exhausted says why (js/hud.js).
    exhaustDelay: 1.3, exhaustRecover: 30,
    rollTime: 0.62, rollIFrames: 0.3, rollSpeed: 9.2, rollSlow: 0.78,
    rollExitKeep: 0.3,           // speed kept when a roll ends
    // Input buffer (Souls-style, one slot, latest press wins): a roll or attack pressed while busy is kept only if the
    // action becomes possible within bufferWindow s; it then waits that long plus bufferGrace before being dropped.
    bufferWindow: 0.4, bufferGrace: 0.1,
    lungeStart: 0.55,            // ground attacks lunge from this fraction of the wind-up
    attackSteer: 3.2,            // rad/s the player may turn during an attack's wind-up (none once the strike is out)
    comboGrace: 0.3,             // after an attack ends, a press this soon still continues its combo
    chargeTremble: 0.025,        // rad the body shakes at full heavy charge (visual)
    chargeShake: { time: 0.14, amp: 0.035 },   // camera jolt when a heavy reaches full charge
    hurtTime: 0.34, staggerTime: 0.9, knockFriction: 7, braceTime: 0.25, deathFade: 3.5,
    knockCap: 12,                // most knockback a hit gives (a `shove` ignores it)
    // Soft auto-aim when not locked on: swings snap to a nearby enemy roughly in the intended direction.
    autoTarget: { range: 3.6, cone: 1.75, angleWeight: 1.5 },
  },
  // Ground pound visuals (no gameplay effect). Pools are fixed; the oldest effect is reused first.
  groundPound: { maxRings: 6, maxCracks: 6, maxDust: 60, ringTime: 0.45, crackTime: 4, crackFade: 1.5,
                 dustLife: 0.9, shakeTime: 0.2 },
  block: { damageMul: 0.15, poiseMul: 0.2, knockMul: 0.35, staminaBase: 6, staminaPerDamage: 0.75,
           breakTime: 1.35, hitstop: 0.05 },
  // Parry window is anchored to the enemy's swing: it opens `lead` s before the active phase and
  // closes `grace` s into it. A press stays armed for `arm` s, so a press succeeds only in
  // [active - lead - arm, active + grace] — about a quarter second.
  parry: { cost: 12, arm: 0.1, lead: 0.12, grace: 0.03, time: 0.52, reach: 0.6, hitstop: 0.16,
           riposteTime: 1.1, riposteHitstop: 1.6, flashTime: 0.4, shakeTime: 0.22, shakeAmp: 0.08 },
  // Executions (v5.2, js/execution.js): the reward for a full stagger, guard or posture bar. While an enemy kneels
  // (ES.BROKEN), light attack from in front of it runs the `execute` attack (js/data/player.js) instead of a light cut.
  // Every number of the system is here.
  execution: {
    range: 1.5,          // m between the two bodies' edges (big bodies reach as far as their radius adds)
    cone: Math.PI / 4,   // rad either side of the enemy's facing the player must stand in (a 90° cone in front)
    facing: 1.4,         // rad the player may face away from the enemy (forgiving: off-axis presses still count)
    floor: 0.8,          // m of height between the two at most (no executing from a ledge above)
    angleWeight: 1.2,    // choosing between two kneeling enemies: m of distance one rad off the front is worth
    snapTime: 0.16,      // s of the wind-up the player slides into place (no teleport; walls and ledges stop it)
    standoff: 0.42,      // where the player ends up: their radius + this share of the enemy's radius + `gap`...
    gap: 0.3,            // ...m from the enemy's centre, so the blade runs through the chest and out of the back
    chest: 0.47,         // a kneeling body's chest, as a share of its standing height (where the blade goes in)
    thrustHeight: 1.1,   // m above the player's feet the thrust runs level; a taller chest tilts it up (bosses)
    // Damage: `lightMul` times the player's light attack damage for normal enemies (18 x 5 = 90: hurts normal enemies
    // without one-shotting them from full); `bossLightMul` times light damage for bosses (18 x 18 = 324: about a third
    // of a doubled boss bar or less), never above `bossCap` of a boss's bar.
    // A blow that would empty a bar leaves 1 hp until the animation ends; the death, phase change or retreat follows it.
    damage: { lightMul: 5, bossLightMul: 18, bossCap: 0.5 },
    hitstop: 0.24,       // s the world freezes as the blade goes in
    grace: 0.25,         // s the player stays untouchable after the animation ends
    push: 5,             // knockback (m/s) on a survivor as the blade comes out
    shake: { time: 0.32, amp: 0.13 }, pullShake: { time: 0.16, amp: 0.05 },
    camera: { push: 0.32, lower: 0.25, rate: 6 },   // camera moves in by `push` of its distance and looks `lower` m lower
    cuePulse: 1.6, cueGlow: 0.16,   // Hz and strength of the soft red glow on a kneeling enemy the player can execute
    bursts: { enter: { color: 0x8a1010, count: 26, speed: 5 }, exit: { color: 0xff9040, count: 30, speed: 7 },
              pull: { color: 0x701010, count: 18, speed: 4 } },
  },
  // Bonfires are checkpoints: resting keeps dead every enemy killed before it (until the level restarts); everything
  // else, including enemies killed since the last rest, comes back at full health on a rest or a death.
  rest: { range: 2.4, time: 1.6, blockRange: 10, messageTime: 2.0, respawnOffset: 1.2 },
  // Loading screen (js/game.js): `time` includes work behind the title card, with at least `readyTime` after preparation,
  // fades out over `fade` s. It carries a level tip and the controller note.
  loading: { time: 1.4, readyTime: 0.1, fade: 0.6 },
  // Story mode (js/story.js): the one save slot, its format version (a save of another version is refused), and how
  // long a chapter's title holds over its loading screen (s).
  // Lore (js/lore.js, js/data/lore.js, v5.1): the NPC and inscriptions. Ranges in m, times in s. A line stays on
  // screen lineBase + perChar per character (clamped to lineMin..lineMax), then lineGap of empty screen.
  lore: { talkRange: 3.2, readRange: 2.2, leaveRange: 9, faceRange: 8, floorGap: 2.5, threatRange: 25, sceneRange: 38, glowRange: 8,
          lineBase: 1.6, perChar: 0.058, lineMin: 2.4, lineMax: 8.5, lineGap: 0.45, turnRate: 4, solidPad: 0.45,
          // v7.0: an NPC placed as a `spirit` (Seren after the Erdtree burns): translucent, hovering, a pale gold glow behind her.
          spirit: { opacity: 0.5, halo: 0xffe2a0, haloSize: 4.2, haloOpacity: 0.5, hover: 0.08 } },
  // Hazard floors (v7.0, a level's `hazards`, js/game.js): the `hazard` event (sound, a flash of the health bar) every `tick` s.
  hazards: { tick: 0.5 },
  // saveKeys: one save slot per campaign of STORIES (js/data/story.js); saveKey is Ashmere's, kept for old saves.
  story: { saveKey: 'combatArena.story', saveKeys: { ashmere: 'combatArena.story', lands: 'combatArena.story.lands' }, saveVersion: 1, titleTime: 3.2 },
  // Bolts (js/projectiles.js): a pool of `max`, each `length` m, leaving the bow at `muzzle` of the archer's
  // height and aimed at `aimAt` of the target's; gone after `life` s. Speed, arc and size are per attack.
  projectile: { max: 24, length: 0.7, color: 0x8a7458, glow: 0xffd8a0, glowSize: 0.6, muzzle: 0.72, aimAt: 0.6, life: 4 },
  // Death: the world slows to a stop, YOU DIED fades in, then the player returns to the last bonfire.
  // The overlay's CSS timings are set from these numbers at load, so they always line up.
  death: { slowTime: 1.4, respawnDelay: 4.8, textDelay: 0.6, textFade: 2.2, hintDelay: 2.6 },
  debug: { slowMo: 0.25 },   // developer builds (#dev): F6 runs the game at this speed
  restartConfirmTime: 2.2,   // R must be pressed twice within this time to restart mid-fight
  enemy: { hitstopScale: 0.0022, hitstopBase: 0.05, hitstopMax: 0.16, knockFriction: 7, accel: 14,
           windupTrack: 0.7,   // fraction of the wind-up during which the enemy still turns
           firstDelay: [0.6, 1.0],   // delay before a fresh enemy's first attack (an enemy can override)
           attackFacing: 0.4,        // must face the player within this angle (rad) to start an attack
           deathFade: 2.0, poiseResetTime: 5,
           riseTime: 1.5, leapVelocity: 6.5, leapSpeed: 6.5, leapTime: 0.5,
           patrolSpeedMul: 0.42, returnSpeedMul: 0.8, homeArrive: 0.6 },
  // How far each placement behaviour notices the player. The one place notice ranges are set.
  notice: { arena: 30, gated: 14, ambush: 7.8, patrol: 9, slumber: 5.5, sentry: 26, perch: 15, dummy: 0, sparring: 0 },
  // Levels with `alert`: an enemy that notices the player wakes unaware enemies within `radius` (with a clear line
  // between them; props don't block it) and every other enemy of its zone, and those pass it on in turn.
  alert: { radius: 14 },
  // Unaware enemies (idle, patrolling or walking home) see the player only within `cone` rad either side of their
  // facing (or within `near` m, bumping into them). Once fighting, or searching, they see all round.
  vision: { cone: 1.1, near: 1.2 },
  // Enemy attack choice (js/enemy.js). An attack's chance is its own `chance` per second, else the default for its
  // kind below (an attack of several kinds takes the lowest). Once its cooldown is over, an enemy facing the player
  // strikes at once if a basic close attack (no `minRange`, no kind below) reaches, picking among its close attacks in
  // reach with odds in proportion to their chances. Otherwise, every step, each attack whose range window (`minRange`,
  // default 0, to `range`) holds the player's distance starts with probability chance x step length.
  // Crowds (js/crowd.js): every enemy may attack, but for each other enemy mid-attack its cooldown runs slower (at
  // 1 / (1 + `busyCooldown` x their number)) and its chance rolls, shots aside, are multiplied by `busyMul`; no enemy
  // starts an attack within `gap` s of another starting one.
  // Holding: an enemy closes in at full speed until its longest-reaching attack can reach, and holds `holdInset` m
  // inside that reach (never more than `holdMax` m away). Once more than `holdBand` m closer it backs off, at
  // `holdSpeedMul` of its speed, all the way out again, and it circles at that speed toward its place around the
  // player. While holding with its cooldown over, it rolls its `approach` chance per second (this default unless
  // it sets its own) to step in to its shortest reach, where it stays until it attacks, unless the player gets
  // `stepOut` m further away than both that reach and the closest it has come: then it goes back to holding.
  // Whatever it was doing, once its cooldown is over a player within `commitReach` m beyond its basic close reach
  // makes it step in and strike as soon as that reaches (no chance roll): hovering just out of reach is not safe.
  // After an attack or a flinch, an enemy with the player within its hold reach keeps its distance with chance `kite`
  // (its own `kite` if set), else steps in to its shortest reach: ranged enemies and bosses no longer always back off.
  // Losing sight of the player, a fighting enemy searches: it walks to where it last saw the player at `search.speedMul`
  // of its speed, looks round for `search.look` s once within `search.arrive` m, and gives up after `search.max` s.
  // Leashes: it gives up once the player is more than its homeLeash from its home, and takes the chase up again on
  // the way home only once the player is within `leashResume` of that (no flicker at the line).
  ai: { chance: { basic: 0.9, dash: 0.3, rollOnly: 0.22, shove: 0.26, projectile: 0.6 }, busyMul: 0.4, busyCooldown: 0.5, gap: 0.3,
        approach: 0.3, holdInset: 0.5, holdMax: 10, holdBand: 1, holdSpeedMul: 0.62, stepOut: 2, commitReach: 1,
        kite: 0.35, leashResume: 0.85, search: { speedMul: 0.55, arrive: 0.8, look: 2.2, max: 9 },
        // v7.0: while the player stands in a woken zone (wakeZones), its members hunt: no leash for `huntTime` s, renewed each step.
        huntTime: 0.25,
        // Reactions (an attack's `when`, v5.3): `behind` past this angle (rad) from its facing; `flank` between these
        // angles at its left (rad, + is left).
        reactions: { behind: 2.2, flank: [0.6, 1.9], shielded: 0.8, struck: 0.6 } },
  // Elden Ring Bosses mode (v5.3, js/elden.js; the boss list is ELDEN_BOSSES in js/data/elden-bosses.js): `victoryTime` s
  // of the victory banner before Retry / Boss select shows (v5.4); `deathMenu` s after the death before the same choice.
  // Spectral (golden) weapons: `fadeIn` / `fadeOut` s as they appear and vanish, their `color`, `glow` and light `intensity`.
  // Flame breath (v5.4, js/flame.js, drawing only): jet colours (outer, middle, core), `opacity`, `flicker` (0..1 of the
  // width), fades (s), the light, embers per second along it, and the bursts as the jet burns and the grafted head appears.
  elden: { flasks: 8, victoryTime: 5, deathMenu: 3.6, victoryHint: 'Retry or choose another boss…',
           // Destined Death (v5.8, Maliketh; an attack's `destined`, js/player.js): an unblocked hit cuts the player's maximum
           // health by `cut` for `time` s (a new hit restarts it, never stacks) and drains `drain` of the maximum over `drainTime` s.
           destined: { cut: 0.12, time: 15, drain: 0.04, drainTime: 3 },
           // Maliketh's drawing (js/blackblade.js): the Destined Death sphere (`color`, `core`, `opacity`, `spin` rad/s)
           // and the blasts along a hit's box (`line`: `bursts` bursts of `burst`, or `rock` for a stone one); `doom` off a cursed
           // player, `shed` as the robes tear away.
           blackBlade: { color: 0xc01828, core: 0xff6070, opacity: 0.55, spin: 7,
                         line: { bursts: 7, burst: { color: 0xffd36a, count: 10, speed: 5 }, rock: { color: 0x6a5a48, count: 8, speed: 4 } },
                         doom: { color: 0xc01828, count: 18, speed: 3 }, shed: { color: 0x2a2420, count: 50, speed: 6 } },
           spectral: { fadeIn: 0.22, fadeOut: 0.35, color: 0xffd36a, glow: 0xffc040, emissive: 1.6, light: 2.2, lightRange: 5 },
           flame: { outer: 0xff4a10, color: 0xff8a20, core: 0xffe2a0, opacity: 0.75, flicker: 0.12, fadeIn: 0.08, fadeOut: 0.25,
                    light: 4, lightRange: 9, embers: 30, emberBurst: { color: 0xff7a28, count: 3, speed: 3 },
                    revealBurst: { color: 0xff6a20, count: 40, speed: 6 },
                    concealBurst: { color: 0xc8b890, count: 50, speed: 5 } },   // a phase's `conceal` (v5.5, Godfrey)
           // Scarlet rot (v5.9, Malenia, js/scarlet.js): the crimson burst at her chest when a blow of hers heals her.
           scarlet: { stealBurst: { color: 0xff2a3a, count: 14, speed: 3 } },
           // Holy light (v5.7, Radagon, js/holy.js): `blinkTime` s a teleport (a hit's `blink`) takes unseen; its flash (`burst`,
           // a ring `ring` m wide that fades in `ringTime` s); a hit's `sigil` rune glows on the floor through its wind-up,
           // brightening to `sigilPeak` as it nears the strike, then erupts in a pillar `pillar` m tall for `pillarTime` s.
           holy: { blinkTime: 0.16, color: 0xffd36a, core: 0xfff4c8, burst: { color: 0xffd36a, count: 26, speed: 6 }, ring: 2.6, ringTime: 0.45,
                   sigilBase: 0.25, sigilPeak: 0.9, pillar: 7, pillarTime: 0.5, light: 5, lightRange: 10 } },
  // Room-style levels: wall thickness, and the size of the stone pillars (solid) and braziers.
  rooms: { wallThickness: 1, pillarSize: 1.2, roomLight: 9, dimLight: 3.5, brazierSize: 0.7, lampLight: 5, lampRange: 14,
           // A barricade gate: `depth` m deep (its collision too); opening, it tips over by `topple` rad, and once `sinkFrom`
           // of the way open it sinks `sink` m out of sight.
           barricade: { depth: 1.0, topple: 1.4, sinkFrom: 0.7, sink: 1.5 } },
  // Houses (a level's `houses`, js/terrain.js): a gable roof rises `pitch` m per metre to its ridge, a tower's spire is
  // `spire` times its width; a house faces the regions within `face` m of its walls (and stands on the lowest of them).
  houses: { pitch: 0.85, spire: 1.1, face: 1.2 },
  // Props (a level's `props`, js/data/props.js): a chasing or homing enemy looks `lookahead` m ahead for one in its
  // way and heads round it, `clearance` m clear of its corners.
  props: { lookahead: 4, clearance: 0.3 },
  // Culling (levels with `cull`): a pool of `maxLights` real lights follows the nearest light sources within
  // `lightRange` of the player, each fading out over `fadeBand` m before it is dropped. Unaware enemies more than
  // `enemyRange` m away sleep (no update, not drawn); fighting enemies always run.
  cull: { maxLights: 8, lightRange: 45, fadeBand: 8, enemyRange: 40 },
  // Heights (room levels, js/terrain.js). A body walks up onto anything within `stepUp` of its feet and
  // stays on floors that drop away by at most `stepDown` per step (stairs, ramps); a bigger drop is a fall.
  // `slab`: floor and roof thickness (blocks sight and the camera). `rail`: parapet height and thickness.
  // `segment`: wall pieces along a slope are this long. `maxSlope`: steepest ramp (rise per metre).
  // Falling `killDepth` m below the lowest floor of the level is death (a pit).
  // Enemies: `edgeProbe` (fraction of the radius) is how far ahead they look for a drop; they chase only
  // within `reach` m of height, and give up after `giveUp` s of a target they cannot reach.
  height: { stepUp: 0.45, stepDown: 0.6, slab: 0.5, rail: 1.2, railThickness: 0.35, segment: 1, maxSlope: 0.6,
            stairStep: 0.3, killDepth: 12, edgeProbe: 0.8, reach: 2.5, giveUp: 4 },
  // Fall damage: a landing more than `safe` m below the highest point of the fall costs (h - safe) *
  // `perMetre` HP; `lethal` m or more kills. A plain jump never reaches `safe`.
  fall: { safe: 4.5, perMetre: 9, lethal: 14, hurtTime: 0.5 },
  level: { leash: 28,        // give up the chase when the player is this far away (v4.2.4: was 22)...
           homeLeash: 40,    // ...or this far from its home (was 30, and measured from the enemy); then walk back home
           gateLiftTime: 1.6, gateLiftGap: 0.3, targetRange: 14, ambushDepth: 0.55 },
  tutorial: { doneTime: 0.9, completeTime: 3.0, hintTime: 2.5,   // hintTime: a dodge hint stays under the prompt this long
              restArrow: { color: 0xffc860, size: 0.28, height: 2.6, bob: 0.25, bobSpeed: 3 } },   // the arrow over the bonfire in the rest step
  nextLevel: { delay: 4.5, fadeTime: 1.2 },   // level with `next`: wait after LEVEL COMPLETE, then fade to black and load it
  // Level 5's script (js/finale.js, v4.3): Aldric's fights, the throne room's transition, the ending.
  finale: {
    pulse: { calm: 2.4, hot: 1.2 },          // s between beats of the boss pulse: his first bars / the Ember-Crowned
    grit: { range: 4, every: 0.7, dust: 6 },  // a perched enemy's warning: within its notice + `range` m, grit and a grind every `every` s
    fogClose: 0.7,                            // s for the throne room portcullis to drop behind the player
    // The transition into the Ember-Crowned (s into it; the phase's own `transition` is its length). Nothing here can hurt.
    timeline: [{ at: 0.3, act: 'toll' }, { at: 1.8, act: 'shatter' }, { at: 3.8, act: 'toll' }, { at: 5.0, act: 'pillar', i: 0 },
               { at: 6.4, act: 'pillar', i: 1 }, { at: 7.8, act: 'toll' }, { at: 9.0, act: 'ignite' }, { at: 10.4, act: 'roar' }],
    igniteAt: 9.0,                            // when his armour catches (the visual change)
    glow: { color: 0xff5a18, base: 0.1, pulse: 0.06, rate: 3.2 },   // the burning armour's emissive glow
    embers: 30,                               // embers rising off him per second, burning
    pillarFall: 1.6,                          // s a toppling pillar takes to land
    roomLight: 3.2,                           // the throne room's fire light once he burns
    death: { stagger: 1.2, kneel: 2.6, blaze: 4.4, fade: 9.5, overlay: 11.5 },   // s after the killing blow
    ending: { card: 6, credits: 24, hold: 5 },   // s per ending card, the credits' roll, then the way back to the title
  },
  // HUD (js/hud.js): everything is laid out on a stage of design pixels scaled by min(width / refWidth, height / refHeight),
  // kept within minScale..maxScale, times the player's HUD scale setting. Below `narrowWidth` design px wide it
  // switches to the compact layout. Times are seconds. Calm: after `calmDelay` s without a threat the vitals dim
  // (by `calmDim`) over `calmFadeOut` s; any threat brings them back over `calmFadeIn` s.
  hud: { fps: { interval: 0.5 },   // FPS counter refresh (s)
         refWidth: 1280, refHeight: 720, minScale: 0.7, maxScale: 2, narrowWidth: 1180,
         trailHold: 0.45, healFlash: 0.9, hitShake: 0.3, emptyPulse: 0.6, refundPulse: 0.45,
         lowHp: 0.3, heartRate: 6.5, critVignette: 0.5, hurtVignette: 0.4, hurtTime: 0.5,
         calmDelay: 4, calmDim: 0.5, calmFadeOut: 1.6, calmFadeIn: 0.25,
         tallyHold: 1.4, postureWarn: 0.8,
         toastTime: 3.2, maxToasts: 3,
         exhaustedFlash: 0.9,   // s the stamina bar's "out of stamina" note stays bright after a press it refused
         text: { restBlocked: 'Enemies too close to rest', exhausted: 'Out of stamina', controller: 'Best played with a controller',
                 // One shows under YOU DIED; the first whenever the player was exhausted in the last `staminaTipTime` s.
                 deathTips: ['Tip: watch your stamina. Empty it and you can’t roll until it refills.',
                             'Tip: roll through a strike as it lands, not before.',
                             'Tip: blue strikes can’t be blocked. Roll them.',
                             'Tip: resting at a bonfire keeps every enemy you have beaten dead.'],
                 staminaTipTime: 6 },
         toasts: { portcullis: 'The gate opens', barricade: 'The barricade falls', shortcut: 'A shortcut opens', trapWarning: 'The floor trembles…' } },
  fx: { tintTime: 0.22, particleLife: 0.5, particleCount: 180, particleGravity: 12,
        recoilTime: 0.25, recoilLean: 0.26, windupGlowTime: 0.08, crackTime: 0.5, idleBlendRate: 5,
        trailDrain: 0.22, postureFlash: 0.35, deadTargetTime: 1.5,
        tagRange: 22, tagGap: 0.22,   // overhead enemy health bars: max distance, height above the head
        bursts: {   // colour, particle count and speed of every combat burst
          hit: { color: 0xe8d8a0, count: 12, speed: 4.5 },
          riposte: { color: 0xffffff, count: 22, speed: 6.5 },
          block: { color: 0xffd070, count: 16, speed: 7 },
          hurt: { color: 0xb01818, count: 14, speed: 4.5 },
          parry: { color: 0xfff6d0, count: 26, speed: 7.5 },
          postureBreak: { color: 0xffc060, count: 30, speed: 8 },
          alert: { color: 0xff6a30, count: 10, speed: 2.5 },
          bolt: { color: 0xb8a888, count: 6, speed: 2.5 },   // a bolt stopped by a wall
        },
        postureBreakShake: { time: 0.22, amp: 0.08 },
        // Impact feel (js/impact.js), visual only. A landed hit shakes the camera by its damage: none below `from`, the
        // full `amp` at `full` (so light cuts stay steady and heavy blows and slams jolt). The struck body shudders
        // `jitter` m during the hit-pause. Enemies' active swings leave a trail too (at most `trails` at once).
        strikeShake: { from: 25, full: 70, time: 0.2, amp: 0.1 },
        hitJitter: { amp: 0.045, rate: 95 },
        flinchRef: 30,   // damage that gives a full-size flinch (smaller hits flinch less, bigger ones more)
        enemyTrail: { trails: 6, color: 0xffd0b0, opacity: 0.22 },
        hardLanding: { ring: 1.4, crack: 0.9, dust: 10, shake: 0.09 },   // dust and jolt when a fall hurts
        // Traps (rendering only): the collapse area is cut into pieces about `piece` m across. Through the warning
        // cracks spread over them (each fully drawn `crackSpread` of the way after its turn, at `crackOpacity`); the
        // warning starts with a `jolt` that rumbles on for `rumble` s past it, and `puffs` puffs of `dust` rise from the
        // floor; when it springs the pieces drop, spreading outward over `dropSpread` s, with a little `spin` (rad/s).
        trap: { piece: 1.6, crackSpread: 0.7, crackOpacity: 0.85, jolt: 0.1, rumble: 0.35, puffs: 6, dust: 4, dropSpread: 0.06, spin: 0.8 } },
  // Rendering only (section 9b). Nothing here changes how the game plays. Per-level looks are optional
  // fields in a level's `atmosphere`; these are the defaults and the shared tuning.
  VISUALS: {
    defaultQuality: 'high',
    // Measure actual-resolution 3D frames, including characters, lights, MSAA, shadows and post-processing.
    // CPU/RAM browser hints cannot hard-cap a recognized dedicated GPU; rendered cost determines its preset.
    autoQuality: { passes: 4, rounds: 5, warmFrames: 3, frameMs: { high: 14, ultra: 14 }, showTime: 7,
                   referenceWidth: 1280, referenceHeight: 720, phoneWidth: 820,
                   camera: { fov: 55, near: 0.1, far: 70, position: [10, 7, 13], look: [0, 1.5, 0] },
                   stage: { halfSize: 14, propCount: 72, propRadius: 10, propHeight: 2.4, lights: 8, lightRadius: 8,
                     lightHeight: 3, lightPower: 16, lightRange: 14, ambient: 0.7, moon: 2, shadowBox: 20,
                     particles: 600, particleHeight: 4, particleSize: 0.08, aoScale: 0.5, aoSamples: 12 },
                   software: 'swiftshader|llvmpipe|softpipe|basic render|software',
                   integrated: 'intel|iris|uhd graphics|hd graphics|radeon\\(tm\\) graphics|radeon graphics|vega [0-9]+ graphics|mali|adreno|powervr|apple gpu',
                   capableIntegrated: 'iris.*(xe|plus)|arc.*graphics|radeon.*(680m|780m|880m|890m|8060s)|apple m[0-9]',
                   strong: 'rtx|rx [6-9][0-9]{3}|apple m[0-9] (pro|max|ultra)|arc a7|radeon pro w',
                   message: 'Recommended graphics applied: {preset}. You can change it any time in Options.' },
    // Graphics option presets. Every preset lists the same keys (checked at load).
    quality: {
      // renderScale: fraction of the pixel ratio actually drawn (the canvas is stretched to fit). antialias: the
      // canvas's own MSAA, fixed when the page loads (High smooths edges in its post target, `msaa`, so it needs none). lights: point lights lit at
      // once (the nearest; the rest are switched off). simpleSurfaces: one texture read per pixel for the weathered
      // stone instead of three. glows: flame halos and light pools on the floor. bloomScale: bloom drawn at this fraction of the screen.
      // Presentation and lighting are independent: High uses modern combat effects and cached metal reflections;
      // Ultra adds sculpted anatomy, shadows, AO, volumetrics, ambient procedural fire and refraction.
      // `ultra` identifies the preset for compatibility; features read their own flags. Graphics cycles in this order.
      low:  { label: 'Low', post: false, bloom: false, vignette: false, grain: false, maxPixelRatio: 1, msaa: 0, renderScale: 1, antialias: false, bloomScale: 1,
              lights: 4, simpleSurfaces: true, glows: false, particles: 0.25, shafts: false, debris: false, grass: 0.25, embers: 0.5, ultra: false,
              modelDetail: { geo: 1, tex: 1, anatomy: false }, combatFx: false, fxBudget: 'low', proceduralFire: false,
              reflections: false, shadows: false, ao: false, volumetrics: false, refraction: false, warmupSize: 32 },
      high: { label: 'High', post: true, bloom: true, vignette: true, grain: true, maxPixelRatio: 1.5, msaa: 4, renderScale: 1, antialias: false, bloomScale: 0.5,
              lights: 8, simpleSurfaces: false, glows: true, particles: 1, shafts: true, debris: true, grass: 1, embers: 1, ultra: false,
              modelDetail: { geo: { enemy: 1, player: 1.25, boss: 1.25 }, tex: 1, anatomy: false }, combatFx: true, fxBudget: 'high', proceduralFire: false,
              reflections: true, shadows: false, ao: false, volumetrics: false, refraction: false, warmupSize: 32 },
      ultra: { label: 'Ultra', post: true, bloom: true, vignette: true, grain: true, maxPixelRatio: 2, msaa: 4, renderScale: 1, antialias: false, bloomScale: 0.5,
               lights: 8, simpleSurfaces: false, glows: true, particles: 1, shafts: true, debris: true, grass: 1, embers: 1, ultra: true,
               modelDetail: { geo: { enemy: 1.25, player: 1.6, boss: 1.6 }, tex: 1, anatomy: true }, combatFx: true, fxBudget: 'ultra', proceduralFire: true,
               reflections: true, shadows: true, ao: true, volumetrics: true, refraction: true, warmupSize: 0 },
    },
    exposure: 1.1,                                            // tone-mapping exposure unless a level sets its own
    hemi: { sky: 0x000000, ground: 0x000000, intensity: 0 },  // sky/ground fill; off unless a level sets `hemi`
    bloom: { strength: 0.34, radius: 0.5, threshold: 0.8 },
    // Colour grade (after tone mapping): cool shadows, warm highlights, a little desaturation.
    // Strongly red pixels skip the desaturation so the wind-up telegraph never dulls.
    grade: { shadowTint: [0.9, 0.96, 1.08], highlightTint: [1.07, 1.0, 0.9], saturation: 0.8, contrast: 1.05 },
    vignette: { strength: 0.5, softness: 0.55, lowHealthAt: 0.3, lowHealthRate: 3 },   // darker, redder edges below lowHealthAt
    grain: { amount: 0.015, ultra: 0.015 },   // the same fine grain on both post-processed presets
    rim: { strength: 0.32, power: 3.0, mixWhite: 0.45 },     // silhouette light on characters; colour from the level
    // Procedural surfaces. Patterns build the canvas textures (fractions of the texture size); kinds say how
    // each material family weathers (tile sizes in metres; colours multiply the base colour; `relief`: how deep joints
    // and cracks look to the light, fading out by `reliefFade` m; not with simpleSurfaces).
    surfaces: {
      texSize: 512, reliefFade: [4, 16],
      patterns: {
        wall:  { rows: [1 / 6, 1 / 6], slab: [0.22, 0.4], shade: [0.88, 1.08], joint: 2.2, cracks: 5, freq: 8 },
        floor: { rows: [0.17, 0.27], slab: [0.18, 0.36], shade: [0.86, 1.1], joint: 3, cracks: 4, freq: 9 },
        metal: { rows: null, cracks: 0, streaks: 50, freq: 18 },
        plaster: { rows: null, cracks: 14, freq: 9 },
        tiles: { rows: [1 / 16, 1 / 16], slab: [0.06, 0.1], shade: [0.82, 1.12], joint: 1.6, cracks: 2, freq: 12 },
      },
      kinds: {
        stone: { side: 'wall', top: 'floor', tileSide: 3, tileTop: 4, detail: 0.5, crack: 0.3, grimeColor: 0x9a9286,
                 grimeHeight: 1.5, mossColor: 0x5a6448, moss: 0.5, roughVar: 0.35, rustColor: 0x000000, rust: 0, relief: 0.3 },
        metal: { side: 'metal', top: 'metal', tileSide: 1.2, tileTop: 1.2, detail: 0.5, crack: 0.2, grimeColor: 0x8a8278,
                 grimeHeight: 1.0, mossColor: 0x000000, moss: 0, roughVar: 0.3, rustColor: 0x5a4030, rust: 0.35, relief: 0 },
        wood:  { side: 'metal', top: 'metal', tileSide: 0.6, tileTop: 0.6, detail: 0.55, crack: 0.2, grimeColor: 0x7a7268,
                 grimeHeight: 0.3, mossColor: 0x000000, moss: 0, roughVar: 0.2, rustColor: 0x000000, rust: 0, relief: 0.2 },
        plaster: { side: 'plaster', top: 'plaster', tileSide: 2.5, tileTop: 2.5, detail: 0.4, crack: 0.25, grimeColor: 0x8a7e6c,
                   grimeHeight: 1.4, mossColor: 0x5a6448, moss: 0.12, roughVar: 0.25, rustColor: 0x000000, rust: 0, relief: 0.2 },
        roof:  { side: 'tiles', top: 'tiles', tileSide: 2.2, tileTop: 2.2, detail: 0.6, crack: 0.2, grimeColor: 0x6a6058,
                 grimeHeight: 0.01, mossColor: 0x4a5438, moss: 0.3, roughVar: 0.3, rustColor: 0x000000, rust: 0, relief: 0.25 },
      },
      materials: { stone: 'stone', edge: 'stone', wall: 'stone', dark: 'stone', ceiling: 'stone',   // MAT entry -> kind
                   iron: 'metal', bonfireSword: 'metal', log: 'wood' },
    },
    // Characters: cloth desaturated toward grey, a separate (pale) skin or helmet material.
    enemy: { desaturate: 0.3, darkMul: 0.6, skin: 0xa8a294, skinRoughness: 0.75 },
    windupGlow: { color: 0xff2a10, boost: 2.2, opacity: 0.85, size: 1.5, along: 0.6 },   // additive halo on the blade; ignores fog
    weaponEmbers: { color: 0xff7a30, boost: 1.6, size: 1.1, opacity: 0.55, pierce: 0.6, edge: 2.2 },   // a weapon glowing with embers
    // Roll-only attacks (cannot be blocked or parried): a cold blue blade instead of red, and a faint ring
    // on the ground under the enemy as the wind-up starts (`ring`: size, `opacity`: its peak).
    rollOnlyGlow: { color: 0x5ab4ff, boost: 2.6, ring: 2.4, opacity: 0.45 },
    flameGlow: { size: 4.2, opacity: 0.55, hdr: 1.7, pierce: 0.6 },   // halo around every flame; flames get brighter for bloom
    pools: { torch: { radius: 3.2, k: 0.18 }, brazier: { radius: 2.4, k: 0.14 }, bonfire: { radius: 3.8, k: 0.26 },
             shaft: { k: 0.22 } },   // warm (or pale) light pools on the floor
    // Floating ash (falls) and dust motes (drift) in a box that follows the camera. Levels set `ash` and `dust` 0..2.
    particles: { max: 1600, box: [34, 12, 34], size: 0.06, maxPx: 6, opacity: 0.5,
                 ashColor: 0x8a8580, dustColor: 0xffd6a0 },
    shafts: { radius: 1.6, topRatio: 0.55, tilt: 0.12, nearFade: [1.5, 5] },
    bonfire: { coreColor: 0xff6a1c, coreBoost: 3, coreSize: 0.2, embers: 40, rise: 2.6, emberColor: 0xff8a30,
               pulsePeriod: 3.2, pulse: 0.12, flareTime: 2.2, flareLight: 1.6, flareCore: 0.8 },
    blood: { decals: 28, life: 16, fade: 4, size: [0.35, 0.75], deathSize: 2.2, spread: 0.5,
             burst: { color: 0x5a0606, count: 10, speed: 3.5 } },
    rubble: { spacing: [1.6, 3.4], cluster: 3, size: [0.12, 0.42] },
    arches: { spring: 2.6, tube: 0.24, every: 2 },   // hall ribs: spring this far below the ceiling, on every 2nd pillar pair
    banners: { width: 1.15, height: 3.0, topGap: 1.0, every: 2, sway: 0.07, swaySpeed: 1.1, colors: [0x4a1c1a, 0x2a2a30] },
    debris: { max: 36, interval: 2.4, radius: 8, gateBurst: 10 },   // a level's `debris` scales how often pieces fall
    // Grass: `count` clumps around the arena; in room levels `perSquareMetre` over open rooms with `grass: true`
    // (at most `maxRoom`), kept `margin` m from their edges and `roomSize` times as tall (seen up close).
    grass: { count: 3200, extent: 46, height: 0.7, color: 0x8a7a48, perSquareMetre: 0.45, maxRoom: 9000, margin: 0.8, roomSize: 0.6 },
    // Distant ruins: rings at `radii` around the arena; around a room level, pushed out by `roomSpread` times its half size.
    silhouettes: { radii: [135, 100, 70], mix: [0.2, 0.34, 0.5], dark: 0x0c0b0d, roomSpread: 1.0 },
    farPlane: 200,   // camera draw distance (further when a room level's ruins need it)
    // Houses (js/town.js): a stone ground storey `groundFloor` m tall, timber-framed storeys of `storey` m above it,
    // jutting `jetty` m over the street on their fronts, framing posts about every `post` m, roofs overhanging by
    // `overhang` m; `lit` of the windows glow (unless a house sets its own); a burning house's `fireLight`.
    town: { groundFloor: 3.0, storey: 2.6, jetty: 0.25, post: 1.5, overhang: 0.45, lit: 0.3,
            fireLight: { color: 0xff7028, intensity: 7, range: 20 },
            // Street clutter along the house fronts (no collision): something every `clutter` m, a hanging sign about
            // every `sign` m and a lantern every `lantern` m; banners hang `bannerOut` m out from the wall.
            clutter: [3.5, 7], sign: 15, lantern: 11, bannerOut: 0.55, lanternColor: 0xffb060,
            clutterClear: { flames: 1.6, props: 0.8 },   // clutter stays this far from gates, bonfires and flames; from props and ramps
            beam: 1.6, table: { area: 30, clear: 3.5 },   // inside an enterable house: a ceiling beam every `beam` m; a table in a room
                                                          // of `area` m2 or more, unless a bonfire is within `clear` m of it
            stoneStorey: 3.6, windows: 0.7,   // a stone front's storeys; the share of a timber front's bays with a window
            // Burning houses: the share of upper windows on fire, flames out of `flames` of them (`windowFlame` big) and one
            // over the roof (`roofFlame`); a ruin smokes `ruinSmoke` as much as a fire.
            fireWindows: 0.65, fire: { flames: 3, windowFlame: 1.5, roofFlame: 3.2, ruinSmoke: 0.45 } },
    // The far castle (atmosphere `landmark`): its dark colour, how far it fades toward the horizon colour, the strength
    // and tightness of the sunlit rim, and how far past it the camera's far plane reaches.
    landmark: { dark: 0x120d10, haze: 0.38, rim: 1.6, rimPower: 2.4, margin: 60 },
    // Smoke over burning houses (js/town.js): `puffs` per column rising `rise` m, growing from size[0] to size[1] m, a
    // full rise every 1 / `speed` s, drifting `wind` m per metre of rise; dark `color`, fire-lit `light` at the foot.
    smoke: { puffs: 40, rise: 34, size: [2.5, 11], speed: 0.06, wind: [0.45, 0, 0.18], color: 0x262020, light: 0x9a5434, opacity: 0.55 },
    // Embers (atmosphere `embers` 0..2): at most `max` sparks in a box round the camera.
    embers: { max: 700, box: [32, 16, 32], size: 0.06, maxPx: 5, color: 0xff7a30, boost: 2.4 },
    // The Ultra preset (quality.ultra). Rendering (js/ultra-post.js) and effects (js/ultra-fx.js), drawing only.
    // The Lands Between's set pieces (v7.0, a level's `realm`, js/realms.js; drawing only). Counts follow the preset:
    // particles x `particles` (x `ultraBoost` on Ultra), scenery x `lowShare` on Low and x `ultraBoost` on Ultra.
    // `coverRate`: how fast weather fades under a roof. tree: per kind its bark, crown and glow colours, its haze, the
    // trunk's share of the height, boughs and crown blobs per bough, the cap over the top, veins of light in the bark.
    realms: {
      ultraBoost: 1.4, lowShare: 0.6, coverRate: 3, hazardPuff: 6,
      tree: {
        rim: 0.5,
        golden: { bark: 0x8a6a34, crown: 0xffc24a, crown2: 0xffe6a0, mix: 0.3, glowColor: 0xffb030, glowAmt: 1.5, glow: 0.65, haze: 0.26, trunk: 0.5, boughs: 16, crownBlobs: 9, cap: 40, vein: 0.6, halo: 0.22 },
        burnt: { bark: 0x1c1614, crown: 0, crown2: 0, mix: 0, glowColor: 0xff5a10, glowAmt: 2.4, glow: 0, haze: 0.3, trunk: 0.62, boughs: 14, crownBlobs: 0, cap: 0, vein: 0.35, embers: 10, emberColor: 0xff6a20, halo: 0.1, droop: true },
        haligtree: { bark: 0xd2cabc, crown: 0xffd890, crown2: 0xd84030, mix: 0.25, glowColor: 0xffc070, glowAmt: 0.85, glow: 0.4, haze: 0.3, trunk: 0.55, boughs: 18, crownBlobs: 8, cap: 34, vein: 0.2, halo: 0.12 },
      },
      pillarHaze: 0.35,
      stars: { count: 1800, band: 600, radius: 160 },
      weather: {
        rain: { count: 1400, box: [36, 22, 36], size: [0.022, 0.95], fall: 16, sway: 0.2, spin: 0, wind: [2, 0, 0.6], opacity: 0.32, shape: 0, color: 0xa8b8c8 },
        snow: { count: 1100, box: [34, 20, 34], size: [0.07, 0.07], fall: 0.9, sway: 0.8, spin: 0, wind: [0.4, 0, 0.2], opacity: 0.8, shape: 1, color: 0xf0f4ff },
        leaves: { count: 520, box: [36, 22, 36], size: [0.12, 0.2], fall: 0.9, sway: 1.4, spin: 1.6, wind: [0.5, 0, 0.3], opacity: 0.9, shape: 2, color: 0xffc040 },
        motes: { count: 600, box: [30, 14, 30], size: [0.06, 0.06], fall: -0.25, sway: 0.6, spin: 0, wind: [0, 0, 0], opacity: 0.9, shape: 1, additive: true, grow: 1, color: 0xffd880 },
        spores: { count: 700, box: [30, 14, 30], size: [0.05, 0.05], fall: -0.15, sway: 0.5, spin: 0, wind: [0.1, 0, 0.1], opacity: 0.75, shape: 1, additive: true, grow: 1, color: 0xff5a40 },
        ash: { count: 1200, box: [34, 20, 34], size: [0.06, 0.06], fall: 0.7, sway: 0.9, spin: 0, wind: [0.6, 0, 0.2], opacity: 0.85, shape: 1, color: 0x3a3634 },
        petals: { count: 400, box: [34, 20, 34], size: [0.09, 0.14], fall: 0.8, sway: 1.2, spin: 2.0, wind: [0.4, 0, 0.2], opacity: 0.95, shape: 2, color: 0xd8302a },
      },
      clouds: { scale: 0.004, opacity: 0.95, gap: 14 },
      dragon: { scale: 2.4 },
      halo: { thick: 0.012, boost: 1.6, opacity: 0.55, spin: 0.05 },
      rune: { opacity: 0.85 },
      beam: { r0: 0.6, r1: 1.4, height: 70, opacity: 0.45, hideNear: 6 },
      pool: { lift: 0.04, rot: { deep: 0x3a0606, bright: 0xff4a2a, glow: 0.25 }, gold: { deep: 0x5a3a08, bright: 0xffd860, glow: 0.3 }, water: { deep: 0x0a1418, bright: 0x4a6a78, glow: 0 } },
      bloom: { count: 40 },
      // Natural ground over a room's floor (a realm's `grounds`): painted once per kind at `size` px, tiling every `tile` m,
      // laid `lift` m over the floor (over its seams, under blood and cracks). `grain`: bark rings across the long way;
      // `ember`: glowing specks in the ash (emissive).
      ground: { lift: 0.014,
        earth: { size: 256, tile: 7, base: 0x74684e, alt: 0x7e8c50, accent: 0x9a9486, accentMix: 0.7, rough: 1 },
        snow: { size: 256, tile: 6, base: 0xc8ced8, alt: 0xe4e8ee, accent: 0x9aa2b0, accentMix: 0.35, rough: 0.85 },
        bark: { size: 256, tile: 5, base: 0x6e5840, alt: 0x957a5a, accent: 0x3a2e22, accentMix: 0.5, rough: 0.95, grain: 9 },
        goldbark: { size: 256, tile: 5, base: 0x8a6628, alt: 0xb08a42, accent: 0xe8bc64, accentMix: 0.25, rough: 0.7, grain: 9 },
        palebark: { size: 256, tile: 5, base: 0x9a8e7e, alt: 0xd0c4b0, accent: 0x6a5e50, accentMix: 0.45, rough: 0.9, grain: 9 },
        ash: { size: 256, tile: 6, base: 0x5a544e, alt: 0x7a726a, accent: 0x262220, accentMix: 0.6, rough: 1, ember: 0.9 } },
      // A bolt `dist` m from the camera, `height` m tall; the flash's ambient `light` falls away at `decay`/s.
      lightning: { dist: 150, height: 120, width: 0.9, boost: 3, glow: 120, life: 0.45, decay: 2.6, light: 2.4 },
    },
    // Decorative budgets never reduce attack rings, sigils, flame jets or warning shapes.
    fxBudgets: {
      low: { density: 0, capacity: 0, ribbons: 0, ribbonSub: 1, light: 0 },
      high: { density: 0.55, capacity: 0.55, ribbons: 4, ribbonSub: 2, light: 0.65 },
      ultra: { density: 1, capacity: 1, ribbons: 8, ribbonSub: 4, light: 1 },
    },
    ultra: {
      // Real-time shadows. The moon is split in two: `share` of it (open sky / roofed levels) becomes a shadow-casting
      // light whose `moonMap` px map covers `moonBox` m either side of the player; ceilings never block it. The
      // Torch cube shadows are deliberately omitted: each would render the scene six more times.
      // The old blob shadow under each body stays at `blob` of its strength (contact darkening).
      shadows: { moonMap: 2048, moonBox: 24, moonDist: 70, share: { open: 0.7, roofed: 0.5 }, bias: -0.0005, normalBias: 0.035,
                 radius: 2.5, blob: 0.35 },
      // Screen-space ambient occlusion, worked out at `scale` of the screen: `samples` taps within `radius` m.
      ao: { scale: 0.5, samples: 12, radius: 0.85, bias: 0.035, strength: 0.85, power: 1.5, keepBright: [1.2, 3.5] },
      rim: 1.35,   // character rim light x this, so bodies in shadow still read against the fog
      // Models built at Ultra detail: `geo` x every round primitive's segments (Ultra anatomy too), `tex` x model texture
      // size (js/bodykit.js); bodies spawned after the switch get it.
      // Keep sculpted anatomy (> 1) and silhouette detail without multiplying tiny round parts by ~7x triangles.
      // High's 256/512px textures already cover their size on screen; doubling them mostly adds uploads and memory.
      models: { geo: { enemy: 1.25, player: 1.6, boss: 1.6 }, tex: 1, anatomy: true },
      // Volumetric light in the fog, analytic: the nearest `lights` point lights glow in the air out to `reach` of their
      // range (`light` scales it, by the level's fog density over `fogRef`); on open-sky levels the moon's light is
      // ray-marched through its shadow map (`moonSteps` steps out to `moonDist` m, forward-scattering `moonG`).
      // `offscreen`: the glow of a light out of view; `minH`: closest approach (m) used, so no light burns white.
      scatter: { lights: 4, light: 0.0035, reach: 0.75, minH: 0.6, fogRef: 0.022, offscreen: 0.55, moon: 0.004, moonSteps: 12, moonDist: 48, moonG: 0.6, maxDist: 80 },
      // Reflections on metal (metalness >= `metalFrom`): a small environment built per level from its fog, moon and fire light.
      env: { intensity: 1.0, metalFrom: 0.25, fire: 0xff8a3c },
      // Flash and hurt feedback share the existing colour grade. No full-screen chromatic aberration / zoom blur.
      lens: { decay: { flash: 6, hurt: 2.2 } },
      // Shockwaves: rings of refraction spreading over the screen from a blow (`max` at once).
      waves: { max: 6, time: 0.6, size: 0.42, width: 0.05, strength: 0.03 },
      // ---- effects (js/ultra-fx.js) ----
      // Streaks: sparks (additive, bloom-bright) and blood drops (opaque), drawn as stretched quads along their flight.
      sparks: { max: 1200, life: [0.25, 0.7], speed: [4, 13], width: 0.034, stretch: 0.06, gravity: 14, bounce: 0.35, drag: 1.4,
                colors: { clash: [0xfff2c0, 0xffb040], parry: [0xffffff, 0xfff0a0], gold: [0xffe08a, 0xffa020], ember: [0xffa040, 0xff4010], holy: [0xfff6d0, 0xffd060],
                          blood: [0xff6a40, 0xc00808], rot: [0xffa080, 0xff2a20], storm: [0xffffff, 0x9ec0ff] },
                boost: 4.5 },
      blood: { max: 900, life: [0.5, 1.1], speed: [2.5, 7.5], width: 0.065, stretch: 0.04, gravity: 13, color: 0xb01010, dark: 0x5a0404,
               splats: 0.3, mist: 4, mistColor: 0x6a0808, sawdust: 0xa08a60 },
      // Motes: soft glowing points (souls, auras, embers, holy dust). Puffs: soft smoke and dust that grow and fade.
      motes: { max: 2600, size: 0.09, maxPx: 42 },
      puffs: { max: 360, size: [0.6, 2.2], life: 1.3, dust: 0x8a8070, smoke: 0x2a2624 },
      chunks: { max: 120, size: [0.06, 0.2], speed: [3, 8], life: 2.6 },
      // Impact lights: `lights` point lights flashed by clashes, parries, executions and boss moments (fixed count).
      flash: { lights: 1, decay: 7, range: 9 },
      flares: { max: 10, time: 0.28 },
      // Weapon trails: a smooth ribbon (Catmull-Rom, `sub` points between samples) that fades over `life` s; HDR so bloom
      // catches it. Enemy trails take their boss colour from `trailColors` (by enemy id), else `enemy` / roll-only blue.
      trails: { samples: 26, sub: 4, life: 0.16, player: 0xfff0d0, playerBoost: 1.8, enemy: 0xff9a6a, enemyBoost: 1.5, rollOnly: 0x6ac0ff, opacity: 0.85,
                max: 8 },
      trailColors: { margit: 0xffd27a, morgott: 0xffc060, radagon: 0xffd890, godrick: 0xff8a30, maliketh: 0xff3a3a,
                     malenia: 0xff4a38, godfrey: 0xffb050, crucibleKnight: 0xffc880, varn: 0xff7a3a },
      // Boss auras: motes per second round a living boss, in its colour (`auraColors` by enemy id, else `aura`); a burning
      // (`ignite`) phase adds rising embers. `stepDust`: big bodies (scale >= `from`) kick dust as they move fast.
      aura: { rate: 22, color: 0xffd8a0, ember: 0xff6a20, igniteRate: 55, size: 1.1 },
      auraColors: { margit: 0xffd27a, morgott: 0xffc060, radagon: 0xffe0a0, godrick: 0xff9a40, maliketh: 0xff2a2a,
                    malenia: 0xff5040, godfrey: 0xffc070, crucibleKnight: 0xffd090, varn: 0xff8040 },
      stepDust: { from: 1.4, speed: 2.2, every: 0.32 },
      // Fire: torches, braziers and bonfires drawn as rising procedural flame instead of cones.
      fire: { width: 2.2, height: 1.5, boost: 2.6, core: 0xffe6a0, mid: 0xff8a2a, edge: 0xb02a08 },
      // Boss attacks (js/ultra-boss.js with js/data/boss-fx.js): a heavy wind-up (from `heavy` damage, or held, leaping,
      // ringing or striking the ground) gathers `gather` motes/s into the weapon; a swing sheds `shed` motes per frame;
      // ring hitboxes draw a ground ring `ringWidth` m wide; impacts scale with the blow's ring size.
      boss: { heavy: 40, gather: 55, gatherGlow: 1.5, shed: 3, trailBoost: 1.4, ringWidth: 0.55, rings: 12, pillars: 6, fires: 28,
              pillar: { time: 1.0, height: 11, radius: 0.9 }, fireTime: [0.6, 1.3] },
      // What each blow looks like. Damage scales a hit's spray between `light` and `heavy` damage.
      hits: { light: 15, heavy: 55, drops: [10, 46], wave: 40, punch: 60 },
    },
  },
};
