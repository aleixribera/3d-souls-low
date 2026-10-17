'use strict';
// ============================================================================
// Elden Ring Bosses: Maliketh, the Black Blade (v5.8)
// ============================================================================
// Everything that makes Maliketh lives here: his key poses, his two blades (kit parts), his model and his moveset. The
// boss list (js/data/elden-bosses.js) names him; the mode (js/elden.js) fights him in the Enemies arena; the robe shed,
// the Destined Death sphere and the line blasts are drawn by js/blackblade.js. Reference: docs/maliketh.txt.
//
// Conversion to this game's scale (not Elden Ring's numbers). The player has 120 HP, a light hit does 18 and a heavy 53,
// a roll is invulnerable for 0.3 s. Margit has 3200 HP (4174 in ER) and Godrick 4000 (6080). Maliketh has 10620 in ER,
// but a straight ratio (8100) would be a slog at 18 a hit, and his second form takes far less of a beating in ER
// (absorptions 20-40 %), so:
//   - one bar of 4600 HP; at 50 % (the reference's threshold, 2300 left, nothing refills) he sheds the robes (`at`):
//     the Beast Clergyman becomes Maliketh, the Black Blade, renamed on the bar;
//   - stance 80 -> posture 120 (Margit 90 -> 130). The Clergyman cannot be parried at all. Maliketh can be parried only
//     on his golden attacks (the corkscrew dive and the spinning sweep, which glint gold as the window opens): our parry
//     stands in for the Blasphemous Claw, and a parry stuns him long (`parriedTime` 3.2 s, the reference's 4.5 s);
//   - Destined Death (`destined` on an attack, CONFIG.elden.destined, js/player.js): every Black Blade hit and wave
//     that lands unblocked cuts the player's maximum health by 12 % for 15 s (a new hit restarts the time, never
//     stacks) and drains 4 % over 3 s. Flasks heal only to the cut ceiling. It is the player's own state, so a retry
//     (a new player) starts clean;
//   - Clergyman: dagger cuts 18, pebbles 11 each (a fan of five), the boulder 48, shockwaves 30-36 (along the floor: jump
//     or roll), the stab and uplift 32. Maliketh: blade 30-50, waves 26, the sphere 14 a tick (six), the line blast 44;
//     every strike's `active` stays at or under 0.2 s (a roll clears it; a test checks).
// Ratios kept from the reference: the boulder, the radial claw, the sphere (from behind) and the overhead slam (from the
// flanks) leave the big openings; the dagger string (after the 4th cut), the linear claw, the stab and uplift, a whiffed
// dive and the spinning sweep short ones; the sling and the aerial waves none. Point-blank under the Clergyman's chest
// after a dagger string he somersaults away scattering pebbles; drinking at range draws a sling.

// ---- key poses (js/data/attack-poses.js format), built from the shared ones ----------------------------------------------
{
  const A = ATTACK_POSES, h = id => A[id].hits[0], rep = (id, n) => Array.from({ length: n }, () => h(id));
  ATTACK_POSES.malikethSlash4 = { hits: [h('lightDiagonal'), h('lightBackhand'), h('lightDiagonal'), h('lightBackhand')] };
  ATTACK_POSES.malikethStabUplift = { hits: [h('enemyStab'), h('lightOverhead')] };
  ATTACK_POSES.malikethWaves = { hits: [h('lightOverhead'), h('lightBackhand')] };
  ATTACK_POSES.malikethSphere = { hits: [h('heavyOverhead'), ...rep('enemyBash', 5)] };
  ATTACK_POSES.malikethSlamLine = { hits: [h('heavyOverhead'), h('enemyStomp')] };
  ATTACK_POSES.malikethSpinFlip = { hits: [h('enemySpin'), h('hollowOverhead')] };
  ATTACK_POSES.malikethCombo = { hits: [h('hollowSwing'), h('lightBackhand'), h('heavyOverhead')] };
}

// ---- his blades and his beast's muzzle (kit parts, in the frame of the bone they hang on) --------------------------------
// Both blades hang on the `weapon` bone as ordinary parts (not the model's `weapon`), so each is a material slot the
// phases can hide or show: the Cinquedea in the Clergyman's hand, the Black Blade from the robe shed on. The body kit
// loads after the data, so js/blackblade.js adds these to KIT_PARTS (js/bodykit.js) as it loads.
const MALIKETH_PARTS = {};
{
  const P = MALIKETH_PARTS;
  // The Black Blade: a long dark straight greatsword, its edges seamed with a crimson glow (`glow` slot), a broad
  // cross-guard with down-swept quillons, a long grip and a ring pommel. Along +z from the hand, metres at scale 1.
  P.blackBlade = o => {
    const blade = new THREE.BoxGeometry(0.03, 0.16, 1.45).translate(0, 0, 0.9);
    const tip = new THREE.ConeGeometry(0.08, 0.28, 4).rotateX(Math.PI / 2).scale(0.38, 1, 1).translate(0, 0, 1.76);
    const fuller = new THREE.BoxGeometry(0.036, 0.03, 1.2).translate(0, 0, 0.82);
    const edges = [-1, 1].map(s => new THREE.BoxGeometry(0.036, 0.016, 1.4).translate(0, s * 0.084, 0.9));
    const guard = new THREE.BoxGeometry(0.06, 0.42, 0.06).translate(0, 0, 0.14);
    const quillons = [-1, 1].map(s => new THREE.ConeGeometry(0.03, 0.16, 4).rotateX(-Math.PI / 2).rotateX(s * 0.5).translate(0, s * 0.22, 0.1));
    const grip = new THREE.CylinderGeometry(0.026, 0.03, 0.42, 6).rotateX(Math.PI / 2).translate(0, 0, -0.1);
    const pommel = new THREE.TorusGeometry(0.05, 0.015, 4, 8).translate(0, 0, -0.36);
    return [...[blade, tip, guard, ...quillons, grip, pommel].map(geo => ({ slot: o.slot, geo })),
            ...[fuller, ...edges].map(geo => ({ slot: o.glow, geo }))];
  };
  // The Cinquedea: a short, very broad triangular dagger with a fat grip.
  P.cinquedea = o => {
    const blade = new THREE.ConeGeometry(0.11, 0.6, 4).rotateX(Math.PI / 2).scale(0.25, 1, 1).translate(0, 0, 0.4);
    const guard = new THREE.BoxGeometry(0.05, 0.28, 0.05).translate(0, 0, 0.1);
    const grip = new THREE.CylinderGeometry(0.028, 0.032, 0.22, 6).rotateX(Math.PI / 2).translate(0, 0, -0.02);
    return [blade, guard, grip].map(geo => ({ slot: o.slot, geo }));
  };
  // A beast's muzzle and fangs under the hood (head frame): the Clergyman is a beast of the Twinbirds' kin.
  P.beastSnout = o => {
    const s = o.size ?? 1;
    const muzzle = new THREE.ConeGeometry(0.075 * s, 0.24 * s, 7).rotateX(Math.PI / 2).scale(1, 0.75, 1).translate(0, -0.01 * s, 0.17 * s);
    const jaw = new THREE.ConeGeometry(0.05 * s, 0.18 * s, 6).rotateX(Math.PI / 2 + 0.25).translate(0, -0.06 * s, 0.13 * s);
    const fangs = [-1, 1].map(sd => new THREE.ConeGeometry(0.012 * s, 0.06 * s, 4).rotateX(Math.PI).translate(sd * 0.035 * s, -0.05 * s, 0.22 * s));
    return [muzzle, jaw, ...fangs];
  };
}

// ---- model (after the reference art): a tall, stooped beast-man. As the Clergyman: drowned in a dark brown-black
// hooded robe and shawls, a muzzle under the hood, a broad dagger in the hand. Shed (phase 2): ribbed black plate over a
// lean dark body, spiked pauldrons, a huge wild mane of grey-white hair, and the Black Blade seamed with crimson light.
MODEL_DEFS.maliketh = {
  faction: 'beast', budget: 'boss', fit: 1.02, limbSides: 8,
  proportions: { shoulderX: 0.4, torsoW: 0.26, torsoD: 0.2, armR: 0.07, legR: 0.085, headR: 0.12, handR: 0.07, footLen: 0.3 },
  limbs: { armR: { len: 1.1 }, armL: { len: 1.1 }, legL: { len: 1.05 }, legR: { len: 1.05 } },
  posture: { chest: [0.3, 0, 0.02], neck: [0.12, 0, 0], head: [-0.16, 0, 0], elbowL: [-0.45, 0, 0], elbowR: [-0.4, 0, 0] },   // hunched
  // Shown from the robe shed on (phase `blackBlade`'s `reveal`); the robe slots go at the same moment (its `conceal`).
  hidden: ['armor', 'mane', 'blackBlade', 'bladeGlow'],
  materials: {
    hide: { tex: 'ashSoot', tint: 0x2a2624, decay: 0.8 },
    robe: { tex: 'rottenCloth', tint: 0x3a3028, decay: 0.75, size: 512, double: true },
    robeDark: { tex: 'tatteredFabric', tint: 0x241e1a, decay: 0.8, size: 512, double: true },
    hood: { tex: 'margitBurlap', tint: 0x4a3e32, decay: 0.7, double: true },
    cinq: { tex: 'rustedIron', tint: 0x8a8070, decay: 0.5 },
    armor: { tex: 'knightPlate', tint: 0x2a2a2e, decay: 0.5, size: 512 },
    mane: { tex: 'margitFur', tint: 0xb8b4ae, decay: 0.4, double: true },
    blackBlade: { tex: 'dentedSteel', tint: 0x1a1618, decay: 0.3, size: 512 },
    bladeGlow: { glow: 0xc01828 },
    eye: { glow: 0xffb040 },
  },
  body: { torso: 'hide', pelvis: 'hide', arms: 'hide', legs: 'hide', head: 'hide', neck: 'hide', hands: 'hide', feet: 'hide' },
  bones: {
    loinF: { parent: 'spin', at: [0, -0.02, 0.2] }, loinB: { parent: 'spin', at: [0, -0.02, -0.2] },
    hemF: { parent: 'loinF', at: [0, -0.5, 0.02] }, hemB: { parent: 'loinB', at: [0, -0.5, -0.02] },
    shawlF: { parent: 'chest', at: [0, 0.52, 0.17] }, mane: { parent: 'head', at: [0, 0, 0] }, maneB: { parent: 'head', at: [0, 0.08, -0.1] },
    capeA: { parent: 'chest', at: [0, 0.58, -0.22] }, capeB: { parent: 'capeA', at: [0, -0.42, 0] }, capeC: { parent: 'capeB', at: [0, -0.42, 0] },
  },
  parts: [
    // The Clergyman's robes (hidden at the shed).
    { use: 'robeSkirt', slot: 'robe', bone: 'spin', len: 1.02, top: 0.24, hem: 0.5, seed: 5 },
    { use: 'robeSkirt', slot: 'robeDark', bone: 'spin', len: 0.72, top: 0.27, hem: 0.52, seed: 9 },
    { use: 'jerkin', slot: 'robe', bone: 'chest' }, { use: 'hunch', slot: 'hood', bone: 'chest', size: 1.15 },
    { use: 'hood', slot: 'hood', bone: 'head', size: 1.55, tail: 1.8, close: 0.1 },
    { use: 'sleeve', slot: 'robeDark', bone: 'armL', len: 0.42, r1: 0.15, seed: 4 }, { use: 'sleeve', slot: 'robeDark', bone: 'armR', len: 0.42, r1: 0.15, seed: 5 },
    { use: 'capeSegment', slot: 'hood', bone: 'shawlF', w0: 0.52, w1: 0.62, len: 0.38, bow: -0.9, ragged: true, seed: 12 },
    { use: 'clothStrip', slot: 'robe', bone: 'loinF', w: 0.42, len: 0.55, seed: 2 }, { use: 'clothStrip', slot: 'robeDark', bone: 'hemF', w: 0.4, len: 0.42, seed: 3 },
    { use: 'clothStrip', slot: 'robe', bone: 'loinB', w: 0.44, len: 0.6, seed: 8 }, { use: 'clothStrip', slot: 'robeDark', bone: 'hemB', w: 0.42, len: 0.45, seed: 9 },
    { use: 'capeSegment', slot: 'robe', bone: 'capeA', w0: 0.66, w1: 0.8, len: 0.42, bow: 1.0 }, { use: 'capeSegment', slot: 'robe', bone: 'capeB', w0: 0.8, w1: 0.92, len: 0.42, bow: 0.8 },
    { use: 'capeSegment', slot: 'robeDark', bone: 'capeC', w0: 0.92, w1: 1.0, len: 0.4, bow: 0.6, ragged: true, seed: 4 },
    { use: 'cinquedea', slot: 'cinq', bone: 'weapon' },
    // Always: the beast's muzzle (under the hood, then under the mane).
    { use: 'beastSnout', slot: 'hide', bone: 'head', size: 1.1 },
    // Maliketh (shown at the shed): ribbed black plate, spiked pauldrons, the mane, the Black Blade.
    { use: 'breastHalf', slot: 'armor', bone: 'chest' }, { use: 'breastHalf', slot: 'armor', bone: 'chest', side: -1 },
    { use: 'tassets', slot: 'armor', bone: 'spin' },
    { use: 'pauldron', slot: 'armor', bone: 'armL', size: 1.6 }, { use: 'pauldron', slot: 'armor', bone: 'armR', size: 1.6, side: -1 },
    { use: 'spikes', slot: 'armor', bone: 'armL', size: 1.2 }, { use: 'spikes', slot: 'armor', bone: 'armR', size: 1.2 },
    { use: 'plateBands', slot: 'armor', bone: 'elbowL', from: 0.02, to: 0.3, radius: 0.08, count: 4, flare: 0.2 },
    { use: 'plateBands', slot: 'armor', bone: 'elbowR', from: 0.02, to: 0.3, radius: 0.08, count: 4, flare: 0.2 },
    { use: 'plateBands', slot: 'armor', bone: 'kneeL', from: 0.02, to: 0.4, radius: 0.095, count: 5, flare: 0.15, cop: 0.07 },
    { use: 'plateBands', slot: 'armor', bone: 'kneeR', from: 0.02, to: 0.4, radius: 0.095, count: 5, flare: 0.15, cop: 0.07 },
    { use: 'plateBands', slot: 'armor', bone: 'legL', from: 0.04, to: 0.36, radius: 0.1, count: 3 },
    { use: 'plateBands', slot: 'armor', bone: 'legR', from: 0.04, to: 0.36, radius: 0.1, count: 3 },
    { use: 'mane', slot: 'mane', bone: 'mane', count: 30, len: 0.62 },
    { use: 'clothStrip', slot: 'mane', bone: 'maneB', w: 0.36, len: 0.7, seed: 41 },
    { use: 'blackBlade', slot: 'blackBlade', glow: 'bladeGlow', bone: 'weapon' },
  ],
  eyes: { color: 0xffb040, size: 0.02, spread: 0.065, at: [0, 0.1, 0.13] },
  anim: {
    idle: { breathRate: 1.0, breath: 0.026, headDrift: 0.08, sway: 0.03, twitch: 0.2 }, walk: { twist: 0.16, roll: 0.06, headNod: 0.06, elbow: 0.3, drag: 0.15 },
    flinch: { head: 0.35, chest: 0.35, arms: 0.35 }, death: { buckle: 1.2, slump: 1 },
    cloth: [{ bone: 'loinF', gain: 0.12, k: 60, damp: 5, flutter: 0.04 }, { bone: 'loinB', gain: 0.15, k: 52, damp: 4.6, flutter: 0.05 },
            { bone: 'hemF', gain: 0.1, k: 44, damp: 4, flutter: 0.06 }, { bone: 'hemB', gain: 0.12, k: 40, damp: 3.8, flutter: 0.07 },
            { bone: 'mane', gain: 0.05, k: 60, damp: 5, flutter: 0.04 }, { bone: 'maneB', gain: 0.1, k: 46, damp: 4, flutter: 0.06 },
            { bone: 'capeA', gain: 0.08, k: 40, damp: 4.4, flutter: 0.03 }, { bone: 'capeB', gain: 0.07, k: 36, damp: 3.8, flutter: 0.045 },
            { bone: 'capeC', gain: 0.08, k: 30, damp: 3.2, flutter: 0.07, sideways: 1.2 }],
  },
};

// ---- the boss -----------------------------------------------------------------------------------------------------------
// Fields new in v5.8: an attack's `destined` (Destined Death on the player, js/player.js) and `sphere` (the Destined
// Death sphere drawn at `fwd` m, radius `r`, js/blackblade.js), a hit's `line` (a golden blast drawn along its box),
// a projectile's `spread` (several bolts fanned by these angles, rad) and `look: 'rock'`, and `colors` for a slash
// (js/projectiles.js); a phase's `conceal` (model slots hidden as its `reveal` shows its own). The rest are the v5.3 and
// v5.4 fields (see margit.js and godrick.js).
const MALIKETH_RING = (from, to, width) => ({ w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true, ring: { from, to, width, time: 0.2 } });
const MALIKETH_GLINT = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
const PEBBLES = { speed: 19, gravity: 4, size: 0.2, look: 'rock', spread: [-0.32, -0.16, 0, 0.16, 0.32] };
const DEATH_WAVE = { speed: 17, gravity: 0, size: 0.75, look: 'slash', colors: [0xff4050, 0x700010] };
const MALIKETH = {
  id: 'maliketh', model: 'maliketh', name: 'Beast Clergyman',
  description: 'A hooded beast-priest with a broad dagger and the earth in his claws, who at half health sheds his robes to wield the Black Blade and its Destined Death.',
  scale: 2.0, bulk: 1.15, radius: 0.8, color: 0x2a2624, weapon: 'spear', idle: 'sway',
  visual: { skin: 0x3a3430, roughness: 0.8, rim: 0.9 },
  hp: 4600, poise: 240, speed: 2.8, turnRate: 3.4, trackRate: 1.8, approach: 0.55, kite: 0.15,
  cooldown: [1.0, 2.0], flinchTime: 0, staggerTime: 1.5, parriedTime: 1.9, deathFade: 7,
  posture: { max: 120, parry: 60, chainGap: 1.8, chainMul: 1.3, decay: 4, breakTime: 3.2, hitstop: 0.2 },
  defaultPhases: ['clergyman', 'blackBlade'],
  phases: {
    // Phase 1: the dagger, the sling and the bestial incantations.
    clergyman: { hp: 4600,
      attacks: ['multiSlash', 'sling', 'slingRetreat', 'slingPunish', 'gurranqStone', 'beastClaw', 'gurranqClaw', 'lungeSweep', 'stabUplift', 'clergyRear'] },
    // Phase 2 (at 50 %): he throws off the robes. Faster, longer reach, Destined Death on every blade hit.
    blackBlade: { at: 0.5, name: 'Maliketh, the Black Blade', opener: 'shedRobes', reveal: ['armor', 'mane', 'blackBlade', 'bladeGlow'],
      conceal: ['robe', 'robeDark', 'hood', 'cinq'], cooldown: [0.8, 1.6], approach: 0.75, kite: 0.05, speed: 3.3, trackRate: 2.2, parriedTime: 3.2,
      attacks: ['shedRobes', 'bladeWaves', 'corkscrew', 'deathSphere', 'overheadSlam', 'escapeSlash', 'spinFlip', 'bladeCombo'] },
  },
  attacks: [
    // ---- phase 1: the Beast Clergyman (nothing parryable) -------------------------------------------------------------
    // Four quick cuts of the broad dagger. Open after the fourth, unless you stand right under him: then he somersaults
    // away scattering pebbles (the trap), or flings a sling.
    { id: 'multiSlash', name: 'Cinquedea Multi-Slash', anim: 'sweep', pose: 'malikethSlash4', noParry: true, tracking: { rate: 3.4, commit: 0.7 }, poseScale: 1.2, chance: 0.8,
      hits: [{ startup: 0.6, active: 0.12, follow: 0.06 }, { startup: 0.3, active: 0.12, follow: 0.06 }, { startup: 0.32, active: 0.12, follow: 0.06 }, { startup: 0.42, active: 0.12, follow: 0.25 }],
      recovery: 0.95, followUps: [{ attack: 'slingRetreat', if: 'near', chance: 0.55 }, { attack: 'sling', chance: 0.15 }],
      damage: 18, poise: 30, knock: 4, lunge: 1.8, range: 3.2, box: { w: 3.2, h: 1.8, d: 3.0, fwd: 1.6, y: 1.1 } },
    // A scoop of the earth flung like a shotgun: a fan of five pebbles. No opening.
    { id: 'sling', name: 'Bestial Sling', anim: 'sweep', pose: 'lightBackhand', noParry: true, tracking: { rate: 3.2, commit: 0.85 }, minRange: 3, chance: 0.3,
      projectile: PEBBLES, hits: [{ startup: 0.62, active: 0.05, follow: 0.12 }], recovery: 0.3,
      damage: 11, poise: 15, knock: 3, lunge: 0, range: 14, box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 1.0 } },
    // The point-blank trap: a somersault backward, pebbles scattered on the way.
    { id: 'slingRetreat', name: 'Leaping Sling', anim: 'sweep', pose: 'lightBackhand', noParry: true, tracking: { rate: 3, commit: 0.6 }, chance: 0.2,
      projectile: PEBBLES, hits: [{ startup: 0.55, active: 0.05, follow: 0.15, leap: { from: 0.15, max: 6, back: 6 } }], recovery: 0.35,
      damage: 11, poise: 15, knock: 3, lunge: 0, range: 2.6, box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 1.0 } },
    // A flask at range: an instant sling (the reference's item read).
    { id: 'slingPunish', name: 'Bestial Sling', anim: 'sweep', pose: 'lightBackhand', noParry: true, when: 'healing', tracking: { rate: 3.6, commit: 0.85 }, minRange: 4, chance: 3,
      projectile: PEBBLES, hits: [{ startup: 0.5, active: 0.05, follow: 0.12 }], recovery: 0.3,
      damage: 11, poise: 15, knock: 3, lunge: 0, range: 18, box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 1.0 } },
    // Both hands into the earth, a boulder heaved overhead and hurled in an arc. A long throw: a big opening up close.
    { id: 'gurranqStone', name: 'Stone of Gurranq', anim: 'overhead', pose: 'heavyOverhead', noParry: true, tracking: { rate: 2.2, commit: 0.8 }, poseScale: 1.3, minRange: 5, chance: 0.22,
      projectile: { speed: 11, gravity: 12, size: 0.75, look: 'rock' }, hits: [{ startup: 1.7, active: 0.05, follow: 0.5 }], recovery: 1.7,
      damage: 48, poise: 80, knock: 9, lunge: 0, range: 20, box: { w: 0.4, h: 0.4, d: 0.4, fwd: 0.5, y: 2.0 } },
    // The left claws dragged back through the floor: a line of shockwaves along the ground ahead. Jump or roll it;
    // a short opening as the claws come out.
    { id: 'beastClaw', name: 'Beast Claw', anim: 'sweep', pose: 'enemyStomp', noParry: true, rollOnly: true, tracking: { rate: 2.6, commit: 0.7 }, poseScale: 1.2, minRange: 2.5, chance: 0.4,
      hits: [{ startup: 1.0, active: 0.2, follow: 0.35, line: true, impact: { ring: 2.0, crack: 3.0, dust: 20, shake: 0.1 } }], recovery: 0.85,
      damage: 30, poise: 50, knock: 7, lunge: 0, range: 10, box: { w: 3.0, h: 0.6, d: 9.5, fwd: 5.6, y: 0.3, ground: true } },
    // Both hands in the earth, a roar, a wait, then a ring of shockwaves all round. Jump it; a big opening after.
    { id: 'gurranqClaw', name: 'Gurranq\'s Beast Claw', anim: 'stomp', pose: 'enemyStomp', noParry: true, rollOnly: true, tracking: { rate: 1.6, commit: 0.4 }, poseScale: 1.35, chance: 0.3,
      hits: [{ startup: 1.75, active: 0.2, follow: 0.6, box: MALIKETH_RING(1.0, 9, 1.9), impact: { ring: 6.0, crack: 2.6, dust: 28, shake: 0.2 } }], recovery: 1.8,
      damage: 36, poise: 60, knock: 9, lunge: 0, range: 5, box: { w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true } },
    // A lunging sweep across the gap; it often ends in the stab and uplift.
    { id: 'lungeSweep', name: 'Lunging Sweep', anim: 'sweep', pose: 'hollowSwing', noParry: true, tracking: { rate: 2.8, commit: 0.5 }, poseScale: 1.2,
      minRange: 4.5, dash: { speed: 9.5, from: 0.3 }, chance: 0.35,
      hits: [{ startup: 0.85, active: 0.14, follow: 0.25 }], recovery: 0.8, followUps: [{ attack: 'stabUplift', chance: 0.65 }],
      damage: 24, poise: 40, knock: 6, lunge: 2.2, range: 11, box: { w: 3.6, h: 1.8, d: 3.2, fwd: 1.7, y: 1.0 } },
    // The dagger driven into the floor, a pause, then wrenched up: rocks erupt in a cone ahead. His flank is open after.
    { id: 'stabUplift', name: 'Ground Stab & Uplift', anim: 'thrust', pose: 'malikethStabUplift', noParry: true, tracking: { rate: 2.6, commit: 0.6 }, poseScale: 1.2, chance: 0.4,
      hits: [{ startup: 0.75, active: 0.14, follow: 0.2, box: { w: 1.6, h: 1.4, d: 2.6, fwd: 1.6, y: 0.5 } },
             { startup: 0.85, active: 0.16, follow: 0.4, box: { w: 3.6, h: 2.0, d: 4.2, fwd: 2.6, y: 0.9 }, impact: { ring: 2.4, crack: 1.6, dust: 18, shake: 0.1 } }],
      recovery: 1.1, damage: 32, poise: 50, knock: 7, lunge: 1.2, range: 3.4, box: { w: 1.6, h: 1.4, d: 2.6, fwd: 1.6, y: 0.5 } },
    // Someone at his back: a turning swipe of the claws.
    { id: 'clergyRear', name: 'Turning Claw', anim: 'spin', pose: 'enemySpin', noParry: true, when: 'behind', tracking: { rate: 1, commit: 0.3 }, chance: 1.6,
      hits: [{ startup: 0.55, active: 0.13, follow: 0.25 }], recovery: 0.7,
      damage: 22, poise: 35, knock: 8, lunge: 0, range: 3.4, box: { w: 4.2, h: 1.8, d: 3.0, fwd: -1.3, y: 1.0 } },

    // ---- the change ---------------------------------------------------------------------------------------------------
    // He rears and tears the robes away (untouchable meanwhile): a blast of black wind hurts only right beside him.
    // The Black Blade is his as it ends (js/blackblade.js); he opens at once with the aerial waves.
    { id: 'shedRobes', name: 'Shed the Robes', anim: 'stomp', pose: 'heavyOverhead', noParry: true, invulnerable: true, tracking: { rate: 1.2, commit: 0.3 }, poseScale: 1.2, chance: 0,
      hits: [{ startup: 2.6, active: 0.16, follow: 0.7, box: MALIKETH_RING(0.5, 4.5, 1.6), impact: { ring: 4.0, crack: 1.2, dust: 30, shake: 0.22 } }],
      recovery: 0.3, followUps: [{ attack: 'bladeWaves', chance: 1 }],
      damage: 24, poise: 40, knock: 11, lunge: 0, range: 3, box: { w: 1, h: 0.6, d: 1, fwd: 0, y: 0.3, ground: true } },

    // ---- phase 2: Maliketh, the Black Blade (Destined Death on every blade hit) ---------------------------------------
    // A leap away and two crimson waves flung from the air: no opening. Then, almost always, the dive or the sphere.
    { id: 'bladeWaves', name: 'Black Blade Waves', anim: 'sweep', pose: 'malikethWaves', noParry: true, destined: true, tracking: { rate: 3.2, commit: 0.85 }, poseScale: 1.25, chance: 0.35,
      projectile: DEATH_WAVE,
      hits: [{ startup: 0.75, active: 0.05, follow: 0.15, leap: { from: 0.2, max: 6, back: 5 } }, { startup: 0.45, active: 0.05, follow: 0.2 }], recovery: 0.5,
      followUps: [{ attack: 'corkscrew', if: 'far', chance: 0.65 }, { attack: 'deathSphere', chance: 0.5 }, { attack: 'corkscrew', chance: 0.5 }],
      damage: 26, poise: 35, knock: 5, lunge: 0, range: 18, box: { w: 0.6, h: 0.6, d: 0.6, fwd: 0.6, y: 1.4 } },
    // The corkscrew dive: the blade flashes gold as he spins down at you. Parry it (a long stun) or roll; a short opening.
    { id: 'corkscrew', name: 'Corkscrew Dive', anim: 'chop', pose: 'hollowOverhead', destined: true, tracking: { rate: 2.4, commit: 0.5 }, markers: MALIKETH_GLINT(0), poseScale: 1.4, minRange: 4, chance: 0.25,
      hits: [{ startup: 1.25, active: 0.16, follow: 0.45, leap: { from: 0.35, max: 13, short: 1.5 }, impact: { ring: 3.0, crack: 1.6, dust: 16, shake: 0.14 } }], recovery: 0.9,
      damage: 46, poise: 70, knock: 9, lunge: 0, range: 13, box: { w: 2.6, h: 2.6, d: 3.8, fwd: 1.7, y: 1.0 } },
    // The blade planted, a hop onto the pommel, a pause, then a sphere of a thousand crimson cuts in FRONT of it: six
    // ticks. Behind him is safe the whole time, and open: a big punish.
    { id: 'deathSphere', name: 'Destined Death', anim: 'chop', pose: 'malikethSphere', noParry: true, destined: true, tracking: { rate: 1.6, commit: 0.4 }, poseScale: 1.2, chance: 0.18,
      sphere: { fwd: 3.0, r: 2.6 },
      hits: [{ startup: 1.6, active: 0.14, follow: 0.06 }, ...Array.from({ length: 4 }, () => ({ startup: 0.14, active: 0.14, follow: 0.06 })),
             { startup: 0.2, active: 0.18, follow: 0.4, box: { w: 6.4, h: 4.0, d: 6.4, fwd: 3.0, y: 1.6 }, impact: { ring: 4.5, crack: 1.4, dust: 20, shake: 0.2 } }],
      recovery: 1.7, damage: 14, poise: 15, knock: 3, lunge: 0, range: 5, box: { w: 5.0, h: 4.0, d: 5.0, fwd: 3.0, y: 1.6 } },
    // Reared back, the blade high in both hands (held, tracking hard), smashed down; a second later a holy blast runs
    // along the line of impact. Stand at his flank: both miss and he is open. Behind him he turns it into a sweep.
    { id: 'overheadSlam', name: 'Overhead Slam & Blast', anim: 'chop', pose: 'malikethSlamLine', noParry: true, destined: true, tracking: { rate: 2.6, commit: 0.7 }, poseScale: 1.4, chance: 0.4,
      hits: [{ startup: 1.65, active: 0.16, follow: 0.3, hold: { at: 0.55, time: [0.3, 0.8], chance: 0.6 }, box: { w: 2.2, h: 3.0, d: 4.6, fwd: 2.5, y: 1.1 }, impact: { ring: 3.0, crack: 2.6, dust: 18, shake: 0.16 } },
             { startup: 0.9, active: 0.18, follow: 0.5, line: true, box: { w: 2.4, h: 2.8, d: 10, fwd: 5.5, y: 1.0 }, impact: { ring: 2.0, crack: 4.0, dust: 26, shake: 0.2 } }],
      recovery: 1.6, followUps: [{ attack: 'escapeSlash', if: 'behind', chance: 0.8 }],
      damage: 44, poise: 75, knock: 9, lunge: 1.2, range: 3.8, box: { w: 2.2, h: 3.0, d: 4.6, fwd: 2.5, y: 1.1 } },
    // Someone behind: a wide sweeping slash round his back as he turns away.
    { id: 'escapeSlash', name: 'Sweeping Escape Slash', anim: 'spin', pose: 'enemySpin', noParry: true, destined: true, when: 'behind', tracking: { rate: 1.4, commit: 0.4 }, poseScale: 1.2, chance: 1.6,
      hits: [{ startup: 0.55, active: 0.14, follow: 0.3 }], recovery: 0.8,
      damage: 30, poise: 45, knock: 9, lunge: 0, range: 4.2, box: { w: 5.2, h: 1.8, d: 3.6, fwd: -1.2, y: 1.0 } },
    // A low 360° sweep sliding forward (gold: parryable), then a somersault back. A short opening where he lands.
    { id: 'spinFlip', name: 'Spinning Slash & Flip', anim: 'spin', pose: 'malikethSpinFlip', destined: true, tracking: { rate: 2.8, commit: 0.6 }, markers: MALIKETH_GLINT(0), poseScale: 1.3, chance: 0.4,
      hits: [{ startup: 1.0, active: 0.16, follow: 0.15, box: { w: 7.4, h: 1.4, d: 7.4, fwd: 0.6, y: 0.7 } },
             { startup: 0.35, active: 0.12, follow: 0.3, leap: { from: 0.1, max: 5, back: 4 }, box: { w: 2.0, h: 2.0, d: 2.0, fwd: 1.0, y: 1.2 } }],
      recovery: 0.85, damage: 34, poise: 55, knock: 8, lunge: 3.0, range: 4.4, box: { w: 7.4, h: 1.4, d: 7.4, fwd: 0.6, y: 0.7 } },
    // His staple: two fast cuts and an overhead, the blade's reach long. Open after the third.
    { id: 'bladeCombo', name: 'Black Blade Combo', anim: 'sweep', pose: 'malikethCombo', noParry: true, destined: true, tracking: { rate: 3.2, commit: 0.7 }, poseScale: 1.25, chance: 0.7,
      hits: [{ startup: 0.75, active: 0.13, follow: 0.08 }, { startup: 0.42, active: 0.13, follow: 0.1 },
             { startup: 0.7, active: 0.15, follow: 0.35, box: { w: 2.0, h: 3.0, d: 4.6, fwd: 2.4, y: 1.1 } }],
      recovery: 1.0, damage: 30, poise: 45, knock: 6, lunge: 2.4, range: 4.0, box: { w: 4.4, h: 1.8, d: 4.0, fwd: 2.0, y: 1.1 } },
  ],
};
