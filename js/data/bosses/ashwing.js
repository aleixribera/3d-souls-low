'use strict';
// ============================================================================
// Veyra, the Ashwing — Sculpted Boss v2 Cinder Wyvern
// ============================================================================
// 26-bone skinned Blender armature (tools/blender/ashwing.py) with 12 game-space authored clips.
// Grounded melee-first anime duel with crisp deflectable combos (foreclaws, scythe tail, wing-blades,
// snapping jaw) and brief aerial peaks (soaring sky-dive) + fair shader-telegraphed magma fissures
// and Phase-2 converging cinder beams.

if (typeof MODEL_DEFS !== 'undefined') {
  MODEL_DEFS.ashwing = {
    skinnedV2: true,
    rigId: 'ashwing',
    faction: 'ember',
    budget: 'boss',
    tile: 0.65,
    rim: 0.32,
    shadowRadius: 1.75,
    primarySocket: 'clawR',
    hidden: ['cinder'],   // blazing wing-blade & tail-scythe veins revealed in Phase 2 (Cinderwake)
    materials: {
      scale:    { tex: 'beastHide', tint: 0x36303a, decay: 0.72, roughness: 0.62, metalness: 0.24, rim: 0.28 },
      membrane: { tex: 'sentinelRags', tint: 0x561a16, decay: 0.6, roughness: 0.78, metalness: 0.05, double: true, rim: 0.20 },
      bone:     { tex: 'bone', tint: 0xc2b49c, decay: 0.5, roughness: 0.48, metalness: 0.05, rim: 0.30 },
      ember:    { glow: 0xff5a14 },
      cinder:   { glow: 0xffa624 },
    },
    sockets: {
      clawR: { bone: 'foreR2', at: [0, -0.55, 0.25], size: 0.80 },
      clawL: { bone: 'foreL2', at: [0, -0.55, 0.25], size: 0.80 },
      tail:  { bone: 'tail4',  at: [0, 0.05, -0.55], size: 0.90 },
      wingL: { bone: 'wingL3', at: [0.35, 0, 0],     size: 0.95 },
      wingR: { bone: 'wingR3', at: [-0.35, 0, 0],    size: 0.95 },
      jaw:   { bone: 'jaw',    at: [0, -0.05, 0.35], size: 0.85 },
    },
  };
  MODEL_DEFS.ashwing.tells = MODEL_DEFS.ashwing.sockets;
}

{
  const glint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
  // Tight, honest hitboxes matched 1-to-1 to her animated limbs
  const CLAW = { w: 2.6, h: 1.6, d: 2.6, fwd: 1.85, y: 1.0 };
  const BITE = { w: 1.5, h: 1.5, d: 2.9, fwd: 2.1,  y: 1.2 };
  const TAIL = { w: 4.4, h: 1.3, d: 3.4, fwd: 0.2,  y: 0.9 };
  const WING = { w: 3.8, h: 1.8, d: 2.8, fwd: 1.9,  y: 1.25 };
  const SLAM = { w: 4.6, h: 2.0, d: 4.6, fwd: 0.0,  y: 1.0, round: true };

  const ASHWING = {
    id: 'ashwing',
    model: 'ashwing',
    v2: true,
    name: 'Veyra, the Ashwing',
    description: 'An obsidian cinder-wyvern that hunts on taloned forelimbs, lashes with a scythe tail, and splits the arena with magma fissures.',
    scale: 1.32,
    bulk: 1.0,
    radius: 0.92,
    color: 0x262028,
    weapon: 'none',
    idle: 'still',
    hp: 900,
    poise: 180,
    speed: 3.9,
    turnRate: 4.6,
    trackRate: 2.8,
    cooldown: [0.7, 1.3],
    flinchTime: 0,
    staggerTime: 1.4,
    parriedTime: 1.5,
    noRepeat: 2,
    initialStance: 'ground',
    // Grounded melee-first stances; brief aerial peaks happen inside sky-dive / eclipse motion curves
    // so melee players are never stuck swinging at empty air beneath a permanently hovering boss.
    stances: {
      ground: {
        altitude: 0,
        speedMul: 1.0,
        climbRate: 5.5,
      },
      aerial: {
        altitude: 2.4,
        speedMul: 1.15,
        climbRate: 5.0,
        transitions: [
          { to: 'ground', minTime: 3.0, maxTime: 4.5, chance: 1.0 },
        ],
      },
    },
    defaultPhases: ['ashwing', 'cinderwake'],
    phases: {
      ashwing: {
        name: 'Veyra, the Ashwing',
        hp: 900,
        attacks: ['ashClawCombo', 'ashBiteLunge', 'ashTailSweep', 'ashTailBack', 'ashWingCleave', 'ashCinderLine', 'ashEmberFan', 'ashSkyDive'],
      },
      cinderwake: {
        at: 0.55,
        name: 'Veyra, the Cinderwake',
        opener: 'ashCinderEclipse',
        speed: 4.3,
        cooldown: [0.55, 1.05],
        attacks: ['ashClawCombo', 'ashBiteLunge', 'ashTailSweep', 'ashTailBack', 'ashWingCleave', 'ashCinderLine', 'ashEmberFan', 'ashSkyDive', 'ashCinderEclipse'],
      },
    },
    attacks: [
      // 1. Twin Foreclaw Combo (2-hit deflectable: right foreclaw rake -> left foreclaw cross-slash)
      {
        id: 'ashClawCombo', name: 'Ashclaw Combo', anim: 'sweep', clip: 'clawR',
        stances: ['ground'], tell: 'clawR',
        tracking: { rate: 3.2, commit: 0.65 }, markers: glint(0, 1),
        hits: [
          { startup: 0.72, active: 0.14, follow: 0.22, clip: 'clawR', tell: 'clawR' },
          { startup: 0.52, active: 0.14, follow: 0.24, clip: 'clawL', tell: 'clawL' },
        ],
        recovery: 0.85,
        damage: 20, poise: 30, knock: 5, lunge: 2.2, range: 3.6, box: CLAW,
        timeline: {
          cues: [
            { at: 0.58, socket: 'clawR', ribbon: { color: 0xff6a1e, life: 0.34, width: 0.52 }, burst: { color: 0xff8228, count: 10 } },
            { at: 0.72, shake: 0.07 },
            { at: 1.46, socket: 'clawL', ribbon: { color: 0xff6a1e, life: 0.34, width: 0.52 }, burst: { color: 0xff8228, count: 10 } },
            { at: 1.60, shake: 0.08 },
          ],
        },
      },
      // 2. Snapping Jaw Lunge (fast deflectable thrust forward)
      {
        id: 'ashBiteLunge', name: 'Cinder Fang', anim: 'stab', clip: 'biteLunge',
        stances: ['ground'], tell: 'jaw',
        tracking: { rate: 3.0, commit: 0.6 }, markers: glint(0),
        hits: [{ startup: 0.68, active: 0.14, follow: 0.22 }], recovery: 0.78,
        damage: 24, poise: 34, knock: 6, lunge: 3.2, range: 4.0, box: BITE,
        timeline: {
          cues: [
            { at: 0.48, socket: 'jaw', burst: { color: 0xff6818, count: 12 } },
            { at: 0.68, socket: 'jaw', ribbon: { color: 0xff8c30, life: 0.28, width: 0.42 }, shake: 0.08 },
          ],
        },
      },
      // 3. Scythe Tail Sweep (deflectable wide sweep with clear coil-up tell)
      {
        id: 'ashTailSweep', name: 'Scythe Tail Sweep', anim: 'sweep', clip: 'tailSweep',
        stances: ['ground'], tell: 'tail',
        tracking: { rate: 2.6, commit: 0.6 }, markers: glint(0),
        hits: [{ startup: 0.88, active: 0.16, follow: 0.28 }], recovery: 0.90,
        damage: 26, heavy: true, poise: 44, knock: 8, lunge: 0.6, range: 4.3, box: TAIL,
        timeline: {
          cues: [
            { at: 0.70, socket: 'tail', ribbon: { color: 0xff9a38, life: 0.40, width: 0.58 }, burst: { color: 0xffa030, count: 12 } },
            { at: 0.88, shake: 0.10 },
          ],
        },
      },
      // 4. Reactive Backlash Tail Sweep when player flanks behind
      {
        id: 'ashTailBack', name: 'Backlash Scythe', anim: 'sweep', clip: 'tailSweep',
        stances: ['ground'], when: 'behind', tell: 'tail',
        tracking: { rate: 4.2, commit: 0.65 }, markers: glint(0), chance: 1.6,
        hits: [{ startup: 0.70, active: 0.15, follow: 0.24 }], recovery: 0.82,
        damage: 20, poise: 34, knock: 7, lunge: 0.4, range: 4.2, box: TAIL,
        timeline: {
          cues: [
            { at: 0.54, socket: 'tail', ribbon: { color: 0xff8828, life: 0.36, width: 0.52 } },
          ],
        },
      },
      // 5. Wing-Blade X-Cleave (deflectable heavy frontal slam — single honest hitbox, dual wing smears!)
      {
        id: 'ashWingCleave', name: 'Ashwing Cleave', anim: 'chop', clip: 'wingCleave',
        stances: ['ground'], tell: 'wingR',
        tracking: { rate: 2.4, commit: 0.55 }, markers: glint(0),
        hits: [{ startup: 0.96, active: 0.16, follow: 0.30 }], recovery: 0.98,
        damage: 30, heavy: true, poise: 52, knock: 9, lunge: 1.8, range: 4.2, box: WING,
        timeline: {
          cues: [
            { at: 0.28, socket: ['wingL', 'wingR'], burst: { color: 0xff5a14, count: 10 } },
            { at: 0.80, socket: ['wingL', 'wingR'], ribbon: { color: 0xff5010, life: 0.42, width: 0.68 } },
            { at: 0.96, shake: 0.12 },
          ],
        },
      },
      // 6. Cinder Fissure (breathes a single fair forward magma crack with 1.0s ground tell)
      {
        id: 'ashCinderLine', name: 'Cinder Fissure', anim: 'draw', clip: 'emberBreath',
        stances: ['ground'], tell: 'jaw',
        tracking: { rate: 2.2, commit: 0.55 }, minRange: 3.5, chance: 0.85,
        hits: [{ startup: 0.95, active: 0.14, follow: 0.35 }], recovery: 0.95,
        damage: 22, poise: 28, knock: 5, lunge: 0, range: 13, box: { w: 1.4, h: 1.3, d: 1.8, fwd: 1.5, y: 1.2 },
        timeline: {
          cues: [
            { at: 0.32, socket: 'jaw', burst: { color: 0xff6e18, count: 16 } },
            { at: 0.95, socket: 'jaw', burst: { color: 0xffe490, count: 22 }, shake: 0.09 },
          ],
          spawns: [
            { at: 0.95, kind: 'hazard', count: 1, hazard: { kind: 'fissure', style: 'ember', fwd: 1.6, radius: 0.95, length: 9.0, telegraph: 1.0, active: 0.35, damage: 24 } },
          ],
        },
      },
      // 7. Distant Ember Fan (clean 3-bolt spread at long range — no overlapping floor spam!)
      {
        id: 'ashEmberFan', name: 'Ashfall Fan', anim: 'draw', clip: 'emberBreath',
        stances: ['ground', 'aerial'], tell: 'jaw',
        tracking: { rate: 2.6, commit: 0.6 }, minRange: 6.5, chance: 0.95,
        hits: [{ startup: 0.90, active: 0.14, follow: 0.30 }], recovery: 0.88,
        damage: 18, poise: 22, knock: 4, lunge: 0, range: 18, box: { w: 1.2, h: 1.2, d: 1.5, fwd: 1.3, y: 1.2 },
        timeline: {
          cues: [
            { at: 0.38, socket: 'jaw', burst: { color: 0xff6214, count: 14 } },
            { at: 0.90, socket: 'jaw', burst: { color: 0xffe498, count: 18 } },
          ],
          spawns: [
            { at: 0.90, kind: 'volley', count: 3, spread: 0.48, damage: 16, projectile: { speed: 18, gravity: 0, size: 0.22 } },
          ],
        },
      },
      // 8. Soaring Sky-Dive (brief aerial leap up to 2.8m -> clear 0.95s hang tell -> plunging slam back to ground!)
      {
        id: 'ashSkyDive', name: 'Cinder Sky-Dive', anim: 'overhead', clip: 'skyDive',
        stances: ['ground', 'aerial'], endStance: 'ground', tell: 'clawR',
        tracking: { rate: 2.4, commit: 0.45 }, rollOnly: true, minRange: 4.5, chance: 0.55,
        hits: [{ startup: 1.30, active: 0.16, follow: 0.44, leap: { from: 0.52, max: 13, short: 0.9 } }], recovery: 1.15,
        damage: 34, heavy: true, poise: 65, knock: 10, lunge: 0, range: 15, box: SLAM,
        impact: { ring: 3.8, crack: 1.5, dust: 16, shake: 0.16 },
        timeline: {
          motion: [
            { from: 0.05, to: 0.55, altFrom: 0, altTo: 2.8 },
            { from: 0.82, to: 1.30, altFrom: 2.8, altTo: 0 },
          ],
          cues: [
            { at: 0.55, socket: ['wingL', 'wingR'], ribbon: { color: 0xff4c10, life: 0.65, width: 0.78 } },
            { at: 1.30, socket: 'clawR', burst: { color: 0xff5a18, count: 28 }, shake: 0.18 },
          ],
        },
      },
      // 9. Phase 2 Signature Ultimate: Cinder Eclipse (2 spaced beamAnchor pylons with clear 1.35s lock-and-fire tell!)
      {
        id: 'ashCinderEclipse', name: 'Cinder Eclipse', anim: 'chop', clip: 'wingCleave',
        stances: ['ground', 'aerial'], endStance: 'ground', tell: 'jaw',
        tracking: { rate: 2.0, commit: 0.4 }, chance: 0.42,
        hits: [{ startup: 1.25, active: 0.16, follow: 0.42 }], recovery: 1.15,
        damage: 28, heavy: true, poise: 55, knock: 8, lunge: 0, range: 16, box: { w: 2.2, h: 1.6, d: 2.2, fwd: 0, y: 1.0 },
        timeline: {
          motion: [
            { from: 0.10, to: 0.60, altFrom: 0, altTo: 2.2 },
            { from: 0.95, to: 1.30, altFrom: 2.2, altTo: 0 },
          ],
          cues: [
            { at: 0.25, socket: ['wingL', 'wingR', 'jaw'], burst: { color: 0xffa624, count: 22 }, shake: 0.10 },
            { at: 0.90, socket: ['wingL', 'wingR'], ribbon: { color: 0xff9a20, life: 0.48, width: 0.80 } },
            { at: 1.25, shake: 0.15 },
          ],
          spawns: [
            { at: 0.45, kind: 'hazard', count: 2, ringRadius: 6.8, hazard: { kind: 'beamAnchor', style: 'cinder', radius: 0.55, telegraph: 1.35, active: 0.36, lockAt: 0.62, damage: 28 } },
          ],
        },
      },
    ],
  };

  ENEMY_DEFS.push(ASHWING);
  ENEMY_BY_ID[ASHWING.id] = ASHWING;
}

var BOSS_V2_FX = BOSS_V2_FX || {};
BOSS_V2_FX.ashwing = {
  onCue(d, helpers) {
    if (d.attack && d.attack.id === 'ashCinderEclipse' && d.cueIndex === 0 && d.enemy.rig?.isSkinnedV2) {
      d.enemy.rig.socketWorldPos('jaw', helpers.v0);
      helpers.burstAt(helpers.v0, 0xffe89c, 24);
    }
  },
};
