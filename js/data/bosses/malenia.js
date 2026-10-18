'use strict';
// ============================================================================
// Elden Ring Bosses: Malenia, Blade of Miquella (v5.9)
// ============================================================================
// Everything that makes Malenia lives here: her key poses, her model, her kit parts and her moveset. The boss list
// (js/data/elden-bosses.js) names her; the mode (js/elden.js) fights her in the Enemies arena; js/scarlet.js draws her
// lifesteal, phantoms and the Aeonia bloom. Reference: docs/malenia.txt.
//
// Conversion to this game's scale. The player has 120 HP, a light hit does 18, a heavy 53, a roll is invulnerable for
// 0.3 s. Margit (ER 4174) is 3200 here, Godrick (6080) 4000, Morgott (10399) 4800. Malenia (33251 over two bars) is meant
// to be the hardest fight in the game, so her total sits above Morgott's, and her lifesteal stretches it further:
//   - phase 1 `blade`: one bar of MAL.hp1; phase 2 `rot`: a bar of MAL.hp2 that refills only to 80 % (`fill`, the
//     reference's "resets to 80 % max HP"); lifesteal can heal her back above that;
//   - lifesteal: every blow that connects, blocked or not, heals MAL.lifesteal (flat + a fraction of the bar);
//   - stance 80 -> posture 120, a parry adds 40: three parries break her (the reference's "3 parries");
//   - katana 18-34, the grab 44, Waterfowl Dance 10-13 per cut: all ten cuts landing kill a full-health player (and
//     only that one; any other full combo leaves the player standing), rot bloom ticks 9;
//   - parryable: the katana's grounded swings and thrusts (they glint). Not parryable: Waterfowl Dance, the grab, the
//     counter-kick, the Scarlet Aeonia and the phantoms (`noParry`). Every strike's `active` <= 0.16 s.
// Waterfowl Dance only once her bar is at 75 % or less in phase 1 (`hpBelow`); in phase 2 at any time and more often.
// Phase 2 sheds the winged helm (`conceal`) and spreads scarlet wings (`reveal`), opening with the Scarlet Aeonia.

// ---- all tuning in one place ------------------------------------------------------------------------------------------
const MAL = {
  hp1: 4000,                    // phase 1 bar
  hp2: 4500, fill2: 0.8,        // phase 2 bar and the fraction it refills to (3600)
  transition: 4.5,              // s of the kneel between the bars
  lifesteal: { flat: 8, pct: 0.005 },   // HP healed per connecting blow: 8 + 0.5 % of the bar (~28 in phase 1)
  posture: { max: 120, parry: 40, chainGap: 1.6, chainMul: 1.3, decay: 6, breakTime: 2.8, hitstop: 0.18 },
  speed: 3.3, turnRate: 3.8, trackRate: 2.0,
  cooldown1: [0.9, 1.7], cooldown2: [0.6, 1.3],
  dmg: { slice: 20, sliceLast: 26, thrust: 32, grab: 44, slam: 34, rise: 28, sweep: 22, kick: 16,
         dance: 12, danceSpin: 13, danceLast: 14,   // 6 + 2 + 2 cuts: 6*12 + 2*13 + 2*14 = 126 (> 120, only if all land)
         aeoniaDive: 40, rotTick: 9, phantom: 16, phantomThrust: 34, geyser: 30 },   // phantoms: 5*16 + 34 = 114
  dance: { chance1: 0.16, chance2: 0.3, below: 0.75 },
  aeoniaTicks: 6,               // bloom ticks after the dive (about 5 s of rot)
};

// ---- key poses, built from the shared ones -----------------------------------------------------------------------------
{
  const A = ATTACK_POSES, h = id => A[id].hits[0];
  ATTACK_POSES.maleniaSlices = { hits: [h('lightDiagonal'), h('lightBackhand'), h('lightDiagonal'), h('hollowSwing')] };
  ATTACK_POSES.maleniaSlamRise = { hits: [h('heavyOverhead'), h('lightBackhand')] };
  ATTACK_POSES.maleniaRiseSlam = { hits: [h('lightBackhand'), h('hollowOverhead')] };
  ATTACK_POSES.maleniaDance = { hits: [h('heavyOverhead'), h('enemySpin'), h('lightBackhand'), h('enemySpin'), h('lightDiagonal'), h('enemySpin'),
    h('enemySpin'), h('enemySpin'), h('hollowOverhead'), h('enemySpin')] };
  ATTACK_POSES.maleniaAeonia = { hits: [h('heavyOverhead'), ...Array(MAL.aeoniaTicks).fill(h('enemyStomp'))] };
  ATTACK_POSES.maleniaPhantoms = { hits: [h('enemyThrust'), h('hollowSwing'), h('lightBackhand'), h('hollowOverhead'), h('enemyThrust'), h('enemyThrust')] };
  ATTACK_POSES.maleniaGeyser = { hits: [h('hollowOverhead'), h('enemyStomp')] };
}

// ---- kit parts and the katana (added to the body kit by js/scarlet.js, which loads after it) -------------------------
const MALENIA_PARTS = {
  // The winged helm: a smooth gold dome closed over the face, a T-slit, and two wings of four feathers sweeping up and
  // back from the temples. Head frame, metres at scale 1.
  wingedHelm(o) {
    const s = o.size ?? 1, out = [];
    out.push(KIT_GEO.Sphere(0.135 * s, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62).scale(1, 1.15, 1.08).translate(0, 0.1 * s, 0.01 * s));
    out.push(KIT_GEO.Cylinder(0.128 * s, 0.12 * s, 0.14 * s, 10, 1, true).translate(0, 0.02 * s, 0.012 * s));   // the face plate and nape
    out.push(new THREE.BoxGeometry(0.02 * s, 0.12 * s, 0.03 * s).translate(0, 0.08 * s, 0.14 * s));   // the nose ridge
    for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) {
      const len = (0.26 - i * 0.04) * s;
      const f = KIT_GEO.Cone(0.035 * s, len, 4).scale(1, 1, 0.25).translate(0, len / 2, 0);
      f.rotateX(-0.55 - i * 0.28); f.rotateZ(-sd * (0.12 + i * 0.05));
      f.translate(sd * 0.12 * s, (0.12 - i * 0.025) * s, -0.02 * s);
      out.push(f);
    }
    return out.map(geo => ({ slot: o.slot, geo }));
  },
  // Long hair falling from the crown down her back, bowed out so it lies over the cape (head frame).
  longHair(o) {
    const L = o.len ?? 1.1, g = new THREE.PlaneGeometry(0.3, L, 3, 8), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const t = (L / 2 - pos.getY(i)) / L, x = pos.getX(i);
      pos.setXYZ(i, x * (1 + 0.5 * t), 0.14 - t * L, -0.15 - 0.18 * Math.sin(Math.min(1, t * 2.2) * Math.PI / 2) - x * x * 0.8);
    }
    g.computeVertexNormals();
    return [{ slot: o.slot, geo: g }, { slot: o.slot, geo: KIT_GEO.Sphere(0.14, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(1.05, 1, 1.1).translate(0, 0.06, -0.02) }];
  },
  // Phase 2: two pairs of great scarlet butterfly wings from the shoulder blades (chest frame); a hidden slot until revealed.
  butterflyWings(o) {
    const out = [], s = o.size ?? 1;
    const wing = (w, h) => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.bezierCurveTo(w * 0.3, h * 0.9, w, h * 1.05, w * 0.95, h * 0.45); sh.bezierCurveTo(w * 0.9, h * 0.1, w * 0.4, -h * 0.05, 0, 0); return new THREE.ShapeGeometry(sh, 6); };
    for (const sd of [-1, 1]) {
      const up = wing(0.75 * s, 0.85 * s), low = wing(0.5 * s, -0.55 * s);
      for (const g of [up, low]) { g.scale(sd, 1, 1); g.rotateY(sd * 0.55); g.translate(sd * 0.06, 0.45, -0.2); out.push({ slot: o.slot, geo: g }); }
    }
    return out;
  },
};
const MALENIA_WEAPONS = {
  // The Hand of Malenia: a long, slender, faintly curved katana with a small round guard and a long grip.
  katana() {
    const blade = new THREE.BoxGeometry(0.012, 0.04, 1.4, 1, 1, 12), pos = blade.attributes.position;
    for (let i = 0; i < pos.count; i++) { const z = pos.getZ(i), t = (z + 0.7) / 1.4; pos.setY(i, pos.getY(i) * (1 - 0.5 * t * t) + t * t * 0.07); }
    blade.computeVertexNormals(); blade.translate(0, 0, 0.82);
    return { blade: [blade], grip: [KIT_GEO.Cylinder(0.018, 0.02, 0.3, 6).rotateX(Math.PI / 2).translate(0, 0, -0.02)],
             guard: [KIT_GEO.Cylinder(0.055, 0.055, 0.015, 10).rotateX(Math.PI / 2).translate(0, 0, 0.13)] };
  },
};

// ---- model (after the reference art): slender and upright, a gold winged helm, long red hair, a crimson cape, a long
// pleated mauve skirt over gold greaves, gold plate on the chest and the gold prosthetic left arm, the katana in the right.
MODEL_DEFS.malenia = {
  extends: 'margit', fit: 1.0,
  proportions: { shoulderX: 0.29, torsoW: 0.19, torsoD: 0.15, armR: 0.048, legR: 0.068, headR: 0.11, handR: 0.055, footLen: 0.28 },
  limbs: { armL: { len: 1, thick: 1 }, armR: { len: 1 } },
  posture: { chest: [0.04, 0, 0], neck: [0.02, 0, 0], head: [0, 0, 0], elbowL: [-0.35, 0, 0], elbowR: [-0.3, 0, 0] },
  materials: {
    skin: { tex: 'margitSkin', tint: 0xf0d8c8, decay: 0.2 },
    gold: { tex: 'dentedSteel', tint: 0xc89a48, decay: 0.3, size: 512 },
    goldDark: { tex: 'dentedSteel', tint: 0x8a6430, decay: 0.45 },
    helm: { tex: 'dentedSteel', tint: 0xd0a450, decay: 0.25 },
    robe: { tex: 'rottenCloth', tint: 0xa894b4, decay: 0.15, size: 512, double: true },
    cloak: { tex: 'rottenCloth', tint: 0x8a1824, decay: 0.45, size: 512, double: true },
    hair: { tex: 'rottenCloth', tint: 0xc0301e, decay: 0.15, double: true },
    wings: { tex: 'rottenCloth', tint: 0xe03848, decay: 0.1, double: true },
    blade: { tex: 'dentedSteel', tint: 0xc8b890, decay: 0.2 },
    grip: { tex: 'crackedLeather', tint: 0x3a2018, decay: 0.5 },
    eye: { glow: 0xffb070 },
  },
  hidden: ['wings'],   // the scarlet wings: shown from phase 2 (its `reveal`, js/flame.js)
  body: { torso: 'robe', pelvis: 'robe', arms: 'skin', legs: 'goldDark', head: 'skin', neck: 'skin', hands: 'gold', feet: 'gold' },
  parts: [
    { use: 'robeSkirt', slot: 'robe', bone: 'spin', len: 1.0, top: 0.2, hem: 0.36, seed: 3 },
    { use: 'breastplate', slot: 'gold', bone: 'chest', slim: true, trim: 'goldDark' },   // v6.0: a fitted, corseted cuirass
    { use: 'scarf', slot: 'cloak', bone: 'chest' },
    { use: 'wingedHelm', slot: 'helm', bone: 'head', size: 1.0 },
    { use: 'longHair', slot: 'hair', bone: 'head', len: 1.15 },   // long red hair over the cape
    { use: 'clothStrip', slot: 'hair', bone: 'hairL', w: 0.08, len: 0.6, seed: 22, turn: Math.PI / 2 }, { use: 'clothStrip', slot: 'hair', bone: 'hairR', w: 0.08, len: 0.6, seed: 23, turn: Math.PI / 2 },
    { use: 'pauldron', slot: 'gold', bone: 'armL', size: 0.9 }, { use: 'pauldron', slot: 'cloak', bone: 'armR', size: 0.9, side: -1 },
    // the gold prosthetic left arm, plate bands from shoulder to wrist
    { use: 'plateBands', slot: 'gold', bone: 'armL', from: 0.02, to: 0.3, radius: 0.056, count: 4 },
    { use: 'plateBands', slot: 'gold', bone: 'elbowL', from: 0.02, to: 0.28, radius: 0.05, count: 4, flare: 0.15 },
    { use: 'plateBands', slot: 'goldDark', bone: 'kneeL', from: 0.03, to: 0.4, radius: 0.06, count: 3 },
    { use: 'plateBands', slot: 'goldDark', bone: 'kneeR', from: 0.03, to: 0.4, radius: 0.06, count: 3 },
    { use: 'capeSegment', slot: 'cloak', bone: 'capeA', w0: 0.5, w1: 0.62, len: 0.42, bow: 1.0 },
    { use: 'capeSegment', slot: 'cloak', bone: 'capeB', w0: 0.62, w1: 0.72, len: 0.42, bow: 0.8 },
    { use: 'capeSegment', slot: 'cloak', bone: 'capeC', w0: 0.72, w1: 0.8, len: 0.4, bow: 0.6, ragged: true, seed: 6 },
    { use: 'butterflyWings', slot: 'wings', bone: 'chest', size: 1.0 },
  ],
  weapon: { use: 'katana', slots: { blade: 'blade', grip: 'grip', guard: 'goldDark' } },
  eyes: { color: 0xffb070, size: 0.008, spread: 0.04, at: [0, 0.1, 0.15] },
};

// ---- the boss -----------------------------------------------------------------------------------------------------------
const maleniaGlint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, hit: i }));
const MAL_RING = (from, to, width, time = 0.14) => ({ w: 1, h: 1.2, d: 1, fwd: 0, y: 0.5, ring: { from, to, width, time } });
const MAL_CUT = (startup, damage, box, more = {}) => ({ startup, active: 0.1, follow: 0.03, damage, box, ...more });
// Waterfowl Dance: a ~2 s hovering leap, then three bursts. Run from the first, roll through the second and third.
const maleniaDance = (id, extra) => ({
  id, name: 'Waterfowl Dance', anim: 'spin', pose: 'maleniaDance', noParry: true, tracking: { rate: 2.6, commit: 0.75 }, poseScale: 1.2, ...extra,
  hits: [
    // Burst 1: the hovering leap, then a dense ball of cuts where she lands.
    MAL_CUT(2.1, MAL.dmg.dance, { w: 3.2, h: 3, d: 3.2, fwd: 0.6, y: 1 }, { leap: { from: 0.15, max: 7, short: 0.6 }, impact: { ring: 2.5, crack: 0.6, dust: 10, shake: 0.06 } }),
    ...[0, 1, 2, 3, 4].map(() => MAL_CUT(0.12, MAL.dmg.dance, { w: 3.2, h: 3, d: 3.2, fwd: 0.6, y: 1 })),
    // Burst 2: after a breath, a dashing spin straight through you.
    MAL_CUT(0.75, MAL.dmg.danceSpin, { w: 3.6, h: 2.4, d: 3.2, fwd: 0.8, y: 1 }, { step: { from: 0, speed: 12, side: 0 } }),
    MAL_CUT(0.14, MAL.dmg.danceSpin, { w: 3.6, h: 2.4, d: 3.2, fwd: 0.8, y: 1 }),
    // Burst 3: a forward flip and a circular slice, then the bubble left behind her bursts late.
    MAL_CUT(0.7, MAL.dmg.danceLast, MAL_RING(0, 3.6, 3.6), { leap: { from: 0.3, max: 5, short: 1.2 } }),
    MAL_CUT(0.5, MAL.dmg.danceLast, { w: 3.4, h: 3, d: 3.4, fwd: -2.6, y: 1 }, { follow: 0.4 }),
  ],
  recovery: 2.4, damage: MAL.dmg.dance, poise: 20, knock: 3, lunge: 0, range: 8, box: { w: 3.2, h: 3, d: 3.2, fwd: 0.6, y: 1 },
});
const PHASE1 = ['slices', 'thrust', 'grab', 'slamRise', 'riseSlam', 'sweep', 'kick', 'healThrust', 'dance'];
const MALENIA = {
  id: 'malenia', model: 'malenia', name: 'Malenia, Blade of Miquella',
  description: 'The Blade of Miquella: every blow she lands heals her. Waterfowl Dance below 75%, and as the Goddess of Rot the Scarlet Aeonia.',
  scale: 1.22, bulk: 0.9, radius: 0.5, color: 0x8a6a78, weapon: 'sword', idle: 'sway',
  visual: { skin: 0xf0d8c8, roughness: 0.6, rim: 0.9 },
  hp: MAL.hp1, poise: 200, speed: MAL.speed, turnRate: MAL.turnRate, trackRate: MAL.trackRate, approach: 0.7, kite: 0.1,
  cooldown: MAL.cooldown1, flinchTime: 0, staggerTime: 1.4, parriedTime: 1.7, deathFade: 6,
  lifesteal: MAL.lifesteal, posture: MAL.posture,
  defaultPhases: ['blade', 'rot'],
  phases: {
    blade: { hp: MAL.hp1, attacks: PHASE1 },
    // The Goddess of Rot: a refilled bar at 80 %, the helm off, scarlet wings, always pressing.
    rot: { hp: MAL.hp2, fill: MAL.fill2, transition: MAL.transition, name: 'Malenia, Goddess of Rot', opener: 'aeoniaOpen',
      reveal: ['wings'], conceal: ['helm'], cooldown: MAL.cooldown2, approach: 1.0, kite: 0, speed: 3.6, trackRate: 2.3,
      attacks: [...PHASE1.filter(id => id !== 'dance' && id !== 'slamRise'), 'dance2', 'slamRot', 'aeoniaOpen', 'aeonia', 'phantoms'] },
  },
  attacks: [
    // ---- the katana (parryable) -----------------------------------------------------------------------------------
    // Rapid Prosthesis Slices: the prosthetic sparks (glint), three quick diagonal cuts, then a delayed fourth sweep.
    { id: 'slices', name: 'Rapid Prosthesis Slices', anim: 'sweep', pose: 'maleniaSlices', tracking: { rate: 3.4, commit: 0.75 }, markers: maleniaGlint(0, 3), poseScale: 1.15,
      hits: [{ startup: 0.75, active: 0.11, follow: 0.05, step: { from: 0.4, speed: 6, side: 0 } }, { startup: 0.26, active: 0.11, follow: 0.05 }, { startup: 0.26, active: 0.11, follow: 0.08 },
             { startup: 0.55, active: 0.12, follow: 0.35, hold: { at: 0.4, time: [0.3, 0.8], chance: 0.6 }, damage: MAL.dmg.sliceLast, box: { w: 3.8, h: 1.6, d: 3.0, fwd: 1.4, y: 1.0 } }],
      recovery: 1.5, damage: MAL.dmg.slice, poise: 30, knock: 4, lunge: 1.6, range: 3.0, box: { w: 2.4, h: 2.0, d: 3.0, fwd: 1.4, y: 1.1 } },
    // Lunging Thrust: a small hop, the blade drawn back, then a long, very fast thrust.
    { id: 'thrust', name: 'Lunging Thrust', anim: 'thrust', pose: 'enemyThrust', tracking: { rate: 3.0, commit: 0.8 }, markers: maleniaGlint(0), poseScale: 1.2,
      minRange: 3, dash: { speed: 15, from: 0.55 }, chance: 0.5,
      hits: [{ startup: 0.8, active: 0.12, follow: 0.25 }], recovery: 0.8,
      damage: MAL.dmg.thrust, poise: 45, knock: 7, lunge: 2.5, range: 10, box: { w: 1.0, h: 1.4, d: 3.4, fwd: 1.9, y: 1.1 } },
    // The same thrust at once when the player drinks (the reference's input read).
    { id: 'healThrust', name: 'Lunging Thrust', anim: 'thrust', pose: 'enemyThrust', when: 'healing', tracking: { rate: 3.4, commit: 0.85 }, markers: maleniaGlint(0), poseScale: 1.2,
      dash: { speed: 15, from: 0.5 }, chance: 2.5,
      hits: [{ startup: 0.6, active: 0.12, follow: 0.25 }], recovery: 0.8,
      damage: MAL.dmg.thrust, poise: 45, knock: 7, lunge: 2.5, range: 11, box: { w: 1.0, h: 1.4, d: 3.4, fwd: 1.9, y: 1.1 } },
    // Lunging Prosthetic Grab: the gold arm drawn back, a dash: goes through a guard (roll it). A miss leaves her open.
    { id: 'grab', name: 'Lunging Prosthetic Grab', anim: 'thrust', pose: 'enemyShove', noParry: true, rollOnly: true, tracking: { rate: 2.8, commit: 0.7 }, poseScale: 1.2,
      minRange: 2, dash: { speed: 11, from: 0.55 }, chance: 0.3,
      hits: [{ startup: 1.05, active: 0.14, follow: 0.3 }], recovery: 2.2,
      damage: MAL.dmg.grab, poise: 80, knock: 10, lunge: 2.0, range: 8, box: { w: 1.3, h: 1.6, d: 2.4, fwd: 1.3, y: 1.1 } },
    // Jumping Overhead Slam to Sweep: a forward leap and chop (parryable), a pause, an upward slash. Open after it.
    { id: 'slamRise', name: 'Jumping Slam, Sweep', anim: 'chop', pose: 'maleniaSlamRise', tracking: { rate: 2.6, commit: 0.6 }, markers: maleniaGlint(0), poseScale: 1.3, chance: 0.5,
      hits: [{ startup: 1.0, active: 0.13, follow: 0.2, leap: { from: 0.35, max: 8, short: 1.2 }, impact: { ring: 2.2, crack: 1.0, dust: 10, shake: 0.08 } },
             { startup: 0.6, active: 0.12, follow: 0.35, damage: MAL.dmg.rise, box: { w: 3.0, h: 2.6, d: 3.0, fwd: 1.4, y: 1.2 } }],
      recovery: 1.6, damage: MAL.dmg.slam, poise: 60, knock: 7, lunge: 0, range: 9, box: { w: 1.8, h: 2.6, d: 3.2, fwd: 1.6, y: 1.0 } },
    // Two-Hit Upward Slice to Slam; may run straight into the slices.
    { id: 'riseSlam', name: 'Upward Slice, Slam', anim: 'chop', pose: 'maleniaRiseSlam', tracking: { rate: 3.0, commit: 0.65 }, markers: maleniaGlint(0, 1), poseScale: 1.15,
      hits: [{ startup: 0.6, active: 0.12, follow: 0.05, damage: MAL.dmg.rise }, { startup: 0.45, active: 0.12, follow: 0.25, leap: { from: 0.3, max: 3, short: 1.0 } }],
      recovery: 0.9, followUps: [{ attack: 'slices', if: 'near', chance: 0.3 }],
      damage: MAL.dmg.slam, poise: 50, knock: 6, lunge: 1.4, range: 3.2, box: { w: 2.0, h: 2.6, d: 3.0, fwd: 1.4, y: 1.1 } },
    // A lone horizontal sweep: a short opening if nothing follows.
    { id: 'sweep', name: 'Katana Sweep', anim: 'sweep', pose: 'hollowSwing', tracking: { rate: 3.2, commit: 0.7 }, markers: maleniaGlint(0),
      hits: [{ startup: 0.55, active: 0.12, follow: 0.2 }], recovery: 0.7,
      damage: MAL.dmg.sweep, poise: 35, knock: 5, lunge: 1.4, range: 3.0, box: { w: 3.6, h: 1.6, d: 2.8, fwd: 1.3, y: 1.1 } },
    // Counter-Kick: struck mid-flurry, she snaps a kick out at once (hyper-armoured; a combo breaker).
    { id: 'kick', name: 'Counter-Kick', anim: 'thrust', pose: 'enemyKick', noParry: true, when: 'struck', tracking: { rate: 5, commit: 0.8 }, chance: 1.2,
      hits: [{ startup: 0.32, active: 0.12, follow: 0.15 }], recovery: 0.55,
      damage: MAL.dmg.kick, poise: 90, knock: 9, lunge: 0.8, range: 2.6, box: { w: 1.4, h: 1.4, d: 2.2, fwd: 1.1, y: 1.0 } },
    // ---- Waterfowl Dance -----------------------------------------------------------------------------------------
    maleniaDance('dance', { hpBelow: MAL.dance.below, chance: MAL.dance.chance1 }),
    maleniaDance('dance2', { chance: MAL.dance.chance2 }),
    // ---- phase 2: the Goddess of Rot (unparryable rot) --------------------------------------------------------------
    // The slam again, then a rot geyser bursts where it struck a beat later: punish from behind, not the front.
    { id: 'slamRot', name: 'Jumping Slam, Rot Geyser', anim: 'chop', pose: 'maleniaGeyser', tracking: { rate: 2.6, commit: 0.6 }, markers: maleniaGlint(0), poseScale: 1.3, chance: 0.5,
      hits: [{ startup: 1.0, active: 0.13, follow: 0.2, leap: { from: 0.35, max: 8, short: 1.2 }, impact: { ring: 2.2, crack: 1.0, dust: 10, shake: 0.08 } },
             { startup: 0.9, active: 0.16, follow: 0.4, damage: MAL.dmg.geyser, box: { w: 3.2, h: 3, d: 4.2, fwd: 2.4, y: 1 }, impact: { ring: 3.5, crack: 1.4, dust: 18, shake: 0.12 } }],
      recovery: 1.3, damage: MAL.dmg.slam, poise: 60, knock: 7, lunge: 0, range: 9, box: { w: 1.8, h: 2.6, d: 3.2, fwd: 1.6, y: 1.0 } },
    // Scarlet Aeonia: rises, hangs, dives, and a scarlet flower blooms round her for ~5 s. Get out, then punish as it wilts.
    ...['aeoniaOpen', 'aeonia'].map(id => ({
      id, name: 'Scarlet Aeonia', anim: 'chop', pose: 'maleniaAeonia', spectral: 'aeonia', noParry: true, tracking: { rate: 2.2, commit: 0.5 }, poseScale: 1.2,
      ...(id === 'aeoniaOpen' ? { invulnerable: true, chance: 0 } : { chance: 0.12, minRange: 2 }),
      hits: [{ startup: 1.9, active: 0.14, follow: 0.25, damage: MAL.dmg.aeoniaDive, leap: { from: 0.25, max: 9, short: 0.5 }, box: MAL_RING(0, 4.5, 4.5, 0.16),
               impact: { ring: 5.5, crack: 2.0, dust: 24, shake: 0.2 } },
             ...Array.from({ length: MAL.aeoniaTicks }, () => ({ startup: 0.62, active: 0.1, follow: 0.05, damage: MAL.dmg.rotTick, box: MAL_RING(0, 5.2, 5.2, 0.1) }))],
      recovery: 2.2, damage: MAL.dmg.aeoniaDive, poise: 70, knock: 6, lunge: 0, range: 12, box: MAL_RING(0, 4.5, 4.5, 0.16),
    })),
    // Phantom Spirits: scarlet phantoms strike from all sides (a thrust, a sweep, a rising cut, a slam, a thrust from
    // the left), then she herself thrusts down from the air. A long opening after the last.
    { id: 'phantoms', name: 'Phantom Spirits', anim: 'thrust', pose: 'maleniaPhantoms', spectral: 'phantom', noParry: true, tracking: { rate: 2.8, commit: 0.8 }, poseScale: 1.1,
      chance: 0.16, minRange: 2,
      hits: [{ startup: 1.6, active: 0.12, follow: 0.05, box: { w: 1.2, h: 2, d: 4, fwd: 3, y: 1 } },
             { startup: 0.4, active: 0.12, follow: 0.05, box: { w: 5, h: 1.6, d: 2.6, fwd: 4, y: 1 } },
             { startup: 0.4, active: 0.12, follow: 0.05, box: { w: 2.4, h: 3, d: 3, fwd: 4.5, y: 1.2 } },
             { startup: 0.45, active: 0.12, follow: 0.05, box: { w: 2.4, h: 3, d: 3, fwd: 5, y: 1 }, impact: { ring: 2.2, crack: 0.8, dust: 10, shake: 0.06 } },
             { startup: 0.4, active: 0.12, follow: 0.05, box: { w: 3, h: 2, d: 2, fwd: 4.5, y: 1 } },
             { startup: 0.7, active: 0.14, follow: 0.4, damage: MAL.dmg.phantomThrust, leap: { from: 0.2, max: 9, short: 0.8 }, box: { w: 1.4, h: 2.4, d: 3.2, fwd: 1.6, y: 1 },
               impact: { ring: 2.8, crack: 1.2, dust: 14, shake: 0.1 } }],
      recovery: 2.2, damage: MAL.dmg.phantom, poise: 40, knock: 5, lunge: 0, range: 10, box: { w: 1.2, h: 2, d: 4, fwd: 3, y: 1 } },
  ],
};
