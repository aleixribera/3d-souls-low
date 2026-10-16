'use strict';
// ============================================================================
// 1. CONFIG
// ============================================================================
// Shared tuning. Per-character data (player, enemies, items) and level layouts live in section 2.
const VERSION = 'v4.2.1';   // shown in the corner of the menus; each release is tagged with the same name
const CONFIG = {
  step: 1 / 60,          // fixed simulation timestep (s)
  maxSteps: 5,           // max simulation steps per rendered frame
  gravity: 30,
  input: { buffer: 0.2 },   // seconds a press is remembered; the clock stops during hit-pauses
  camera: {
    fov: 55, lookHeight: 1.35,
    followRate: 7,        // position smoothing (1/s)
    yawFollow: 0.85,      // how fast the camera swings behind the facing (rad/s at 90 deg off)
    leanRange: 11, leanAmount: 0.38, leanPullback: 1.4, leanRaise: 0.5,
    wallMargin: 0.3, gateMargin: 0.6, closeRaise: 1.6, floor: 0.6, ceilingMargin: 0.7,
    refRate: 8,           // how fast the camera's ground height follows stairs and drops (1/s)
  },
  zoom: { min: 2.6, max: 12, step: 0.8, default: 6.4, rate: 7, repeatDelay: 0.28, repeat: 0.09,
          heightRatio: 0.48 },   // camera height = distance * heightRatio
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
  rest: { range: 2.4, time: 1.6, blockRange: 10, messageTime: 2.0, respawnOffset: 1.2 },
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
  notice: { arena: 30, gated: 14, ambush: 7.8, patrol: 9, slumber: 5.5, sentry: 26, dummy: 0, sparring: 0 },
  // Levels with `alert`: an enemy that notices the player wakes unaware enemies within `radius`
  // (with a clear line between them), and those pass it on in turn.
  alert: { radius: 10 },
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
  ai: { chance: { basic: 0.9, dash: 0.3, rollOnly: 0.22, shove: 0.26, projectile: 0.6 }, busyMul: 0.4, busyCooldown: 0.5, gap: 0.3,
        approach: 0.3, holdInset: 0.5, holdMax: 10, holdBand: 1, holdSpeedMul: 0.62, stepOut: 2, commitReach: 1 },
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
  level: { leash: 22,        // give up the chase when the player is this far away...
           homeLeash: 30,    // ...or when dragged this far from home; then walk back home
           gateLiftTime: 1.6, gateLiftGap: 0.3, targetRange: 14, ambushDepth: 0.55 },
  tutorial: { doneTime: 0.9, completeTime: 3.0, hintTime: 2.5 },   // hintTime: a dodge hint stays under the prompt this long
  nextLevel: { delay: 4.5, fadeTime: 1.2 },   // level with `next`: wait after LEVEL COMPLETE, then fade to black and load it
  // HUD (js/hud.js): everything is laid out on a stage of design pixels scaled by min(width / refWidth, height / refHeight),
  // kept within minScale..maxScale, times the player's HUD scale setting. Below `narrowWidth` design px wide it
  // switches to the compact layout. Times are seconds. Calm: after `calmDelay` s without a threat the vitals dim
  // (by `calmDim`) over `calmFadeOut` s; any threat brings them back over `calmFadeIn` s.
  hud: { refWidth: 1280, refHeight: 720, minScale: 0.7, maxScale: 2, narrowWidth: 1180,
         trailHold: 0.45, healFlash: 0.9, hitShake: 0.3, emptyPulse: 0.6, refundPulse: 0.45,
         lowHp: 0.3, heartRate: 6.5, critVignette: 0.5, hurtVignette: 0.4, hurtTime: 0.5,
         calmDelay: 4, calmDim: 0.5, calmFadeOut: 1.6, calmFadeIn: 0.25,
         tallyHold: 1.4, postureWarn: 0.8,
         toastTime: 3.2, maxToasts: 3,
         text: { restBlocked: 'Enemies too close to rest' },
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
    // Graphics option presets. Both must list the same keys (checked at load).
    quality: {
      high: { label: 'High', post: true, bloom: true, vignette: true, grain: true, maxPixelRatio: 2, msaa: 4,
              particles: 1, shafts: true, debris: true, grass: 1, embers: 1 },
      low:  { label: 'Low', post: false, bloom: false, vignette: false, grain: false, maxPixelRatio: 1, msaa: 0,
              particles: 0.35, shafts: false, debris: false, grass: 0.35, embers: 0.5 },
    },
    exposure: 1.1,                                            // tone-mapping exposure unless a level sets its own
    hemi: { sky: 0x000000, ground: 0x000000, intensity: 0 },  // sky/ground fill; off unless a level sets `hemi`
    bloom: { strength: 0.34, radius: 0.5, threshold: 0.8 },
    // Colour grade (after tone mapping): cool shadows, warm highlights, a little desaturation.
    // Strongly red pixels skip the desaturation so the wind-up telegraph never dulls.
    grade: { shadowTint: [0.9, 0.96, 1.08], highlightTint: [1.07, 1.0, 0.9], saturation: 0.8, contrast: 1.05 },
    vignette: { strength: 0.5, softness: 0.55, lowHealthAt: 0.3, lowHealthRate: 3 },   // darker, redder edges below lowHealthAt
    grain: { amount: 0.03 },
    rim: { strength: 0.32, power: 3.0, mixWhite: 0.45 },     // silhouette light on characters; colour from the level
    // Procedural surfaces. Patterns build the canvas textures (fractions of the texture size); kinds say how
    // each material family weathers (tile sizes in metres; colours multiply the base colour).
    surfaces: {
      texSize: 512,
      patterns: {
        wall:  { rows: [1 / 6, 1 / 6], slab: [0.22, 0.4], shade: [0.8, 1.14], joint: 2.2, cracks: 10, freq: 10 },
        floor: { rows: [0.17, 0.27], slab: [0.18, 0.36], shade: [0.74, 1.2], joint: 3, cracks: 8, freq: 12 },
        metal: { rows: null, cracks: 0, streaks: 50, freq: 18 },
        plaster: { rows: null, cracks: 14, freq: 9 },
        tiles: { rows: [1 / 16, 1 / 16], slab: [0.06, 0.1], shade: [0.72, 1.2], joint: 1.6, cracks: 2, freq: 16 },
      },
      kinds: {
        stone: { side: 'wall', top: 'floor', tileSide: 3, tileTop: 4, detail: 0.85, crack: 0.55, grimeColor: 0x9a9286,
                 grimeHeight: 1.5, mossColor: 0x5a6448, moss: 0.5, roughVar: 0.35, rustColor: 0x000000, rust: 0 },
        metal: { side: 'metal', top: 'metal', tileSide: 1.2, tileTop: 1.2, detail: 0.7, crack: 0.35, grimeColor: 0x8a8278,
                 grimeHeight: 1.0, mossColor: 0x000000, moss: 0, roughVar: 0.3, rustColor: 0x5a4030, rust: 0.35 },
        wood:  { side: 'metal', top: 'metal', tileSide: 0.6, tileTop: 0.6, detail: 0.8, crack: 0.3, grimeColor: 0x7a7268,
                 grimeHeight: 0.3, mossColor: 0x000000, moss: 0, roughVar: 0.2, rustColor: 0x000000, rust: 0 },
        plaster: { side: 'plaster', top: 'plaster', tileSide: 2.5, tileTop: 2.5, detail: 0.55, crack: 0.45, grimeColor: 0x8a7e6c,
                   grimeHeight: 1.4, mossColor: 0x5a6448, moss: 0.12, roughVar: 0.25, rustColor: 0x000000, rust: 0 },
        roof:  { side: 'tiles', top: 'tiles', tileSide: 2.2, tileTop: 2.2, detail: 0.9, crack: 0.3, grimeColor: 0x6a6058,
                 grimeHeight: 0.01, mossColor: 0x4a5438, moss: 0.3, roughVar: 0.3, rustColor: 0x000000, rust: 0 },
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
  },
};
