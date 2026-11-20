'use strict';
// ============================================================================
// Veyra, the Ashwing — Flagship Boss v2 (26-bone skinned wyvern, stances, timeline tracks, synced hazards)
// ============================================================================
// Built in Blender (tools/blender/ashwing.py) with a 26-bone armature, smooth 4-bone skinning,
// and 10 exported animation clips. Uses Boss v2 (js/boss-v2.js, js/boss-rig.js, js/boss-fx-v2.js).

if (typeof MODEL_DEFS !== 'undefined') {
  MODEL_DEFS.ashwing = {
    skinnedV2: true,
    rigId: 'ashwing',
    faction: 'ember',
    budget: 'boss',
    tile: 0.55,
    rim: 0.55,
    shadowRadius: 1.85,
    primarySocket: 'clawR',
    hidden: ['cinder'],   // blazing wing-blade & dorsal veins revealed in Phase 2 (Cinderwake)
    materials: {
      scale:    { tex: 'emberBark', tint: 0x1a171e, roughness: 0.48, metalness: 0.3, rim: 0.5 },
      membrane: { tex: 'sentinelRags', tint: 0x3e1210, roughness: 0.72, metalness: 0.05, double: true, rim: 0.35 },
      bone:     { tex: 'bone', tint: 0xd8ccb4, roughness: 0.45, metalness: 0.05, rim: 0.5 },
      ember:    { glow: 0xff6218 },
      cinder:   { glow: 0xffa828 },
    },
    sockets: {
      clawR: { bone: 'foreR2', at: [0, -0.55, 0.25], size: 0.85 },
      clawL: { bone: 'foreL2', at: [0, -0.55, 0.25], size: 0.85 },
      tail:  { bone: 'tail4',  at: [0, 0.05, -0.55], size: 0.95 },
      wingL: { bone: 'wingL3', at: [0.35, 0, 0],     size: 1.05 },
      wingR: { bone: 'wingR3', at: [-0.35, 0, 0],    size: 1.05 },
      jaw:   { bone: 'jaw',    at: [0, -0.05, 0.35], size: 0.90 },
    },
  };
}

{
  const glint = (...hits) => hits.map(i => ({ event: 'glint', parry: true, ...(i ? { hit: i } : {}) }));
  const CLAW  = { w: 3.4, h: 1.8, d: 3.4, fwd: 2.1, y: 1.1 };
  const TAIL  = { w: 5.2, h: 1.5, d: 4.4, fwd: 0.4, y: 1.0 };
  const WING  = { w: 4.8, h: 2.1, d: 3.6, fwd: 2.0, y: 1.4 };
  const SLAM  = { w: 5.4, h: 2.2, d: 5.4, fwd: 0.0, y: 1.1, round: true };

  const ASHWING = {
    id: 'ashwing',
    model: 'ashwing',
    v2: true,
    name: 'Veyra, the Ashwing',
    description: 'A cinder-veined wyvern that prowls on taloned forelimbs, takes to the air on beating wings, and splits the arena with magma fissures.',
    scale: 1.08,
    bulk: 1.0,
    radius: 0.95,
    color: 0x38282c,
    weapon: 'none',
    idle: 'still',
    hp: 920,
    poise: 180,
    speed: 3.8,
    turnRate: 4.6,
    trackRate: 3.0,
    cooldown: [0.65, 1.25],
    flinchTime: 0,
    staggerTime: 1.4,
    parriedTime: 1.5,
    noRepeat: 2,
    initialStance: 'ground',
    stances: {
      ground: {
        altitude: 0,
        speedMul: 1.0,
        climbRate: 5.0,
        transitions: [
          { to: 'airborne', minTime: 9, maxTime: 16, chance: 0.25 },
          { to: 'airborne', minTime: 5, distMin: 9, chance: 0.35 },
        ],
      },
      airborne: {
        altitude: 2.5,
        speedMul: 1.25,
        orbit: 0.85,
        climbRate: 4.0,
        transitions: [
          { to: 'ground', minTime: 10, maxTime: 14, chance: 0.3 },
        ],
      },
    },
    defaultPhases: ['ashwing', 'cinderwake'],
    phases: {
      ashwing: {
        name: 'Veyra, the Ashwing',
        hp: 920,
        attacks: ['ashClawRake', 'ashTailWhip', 'ashTailTurn', 'ashWingCross', 'ashEmberBreath', 'ashTakeoff', 'ashCinderBarrage', 'ashSkyDive'],
      },
      cinderwake: {
        at: 0.55,
        name: 'Veyra, the Cinderwake',
        opener: 'ashCinderEclipse',
        speed: 4.2,
        cooldown: [0.5, 1.0],
        attacks: ['ashClawRake', 'ashTailWhip', 'ashTailTurn', 'ashWingCross', 'ashEmberBreath', 'ashTakeoff', 'ashCinderBarrage', 'ashSkyDive', 'ashCinderEclipse'],
      },
    },
    attacks: [
      // 1. Predatory Foreclaw Rake (deflectable ground melee)
      {
        id: 'ashClawRake', name: 'Ashclaw Rake', anim: 'sweep', clip: 'clawRake',
        stances: ['ground'], tell: 'clawR',
        tracking: { rate: 3.4, commit: 0.65 }, markers: glint(0),
        hits: [{ startup: 0.68, active: 0.16, follow: 0.22 }], recovery: 0.72,
        damage: 24, poise: 35, knock: 6, lunge: 2.8, range: 4.2, box: CLAW,
        timeline: {
          cues: [
            { at: 0.52, socket: 'clawR', ribbon: { color: 0xff7828, life: 0.38, width: 0.65 }, burst: { color: 0xff8a30, count: 10 } },
            { at: 0.68, shake: 0.08 },
          ],
        },
      },
      // 2. Scythe Tail Whip (wide deflectable sweep)
      {
        id: 'ashTailWhip', name: 'Scythe Tail Whip', anim: 'sweep', clip: 'tailWhip',
        stances: ['ground'], tell: 'tail',
        tracking: { rate: 2.8, commit: 0.6 }, markers: glint(0),
        hits: [{ startup: 0.86, active: 0.18, follow: 0.28 }], recovery: 0.85,
        damage: 28, heavy: true, poise: 48, knock: 8, lunge: 1.0, range: 5.0, box: TAIL,
        timeline: {
          cues: [
            { at: 0.68, socket: 'tail', ribbon: { color: 0xffa040, life: 0.44, width: 0.72 }, burst: { color: 0xffa838, count: 14 } },
            { at: 0.86, shake: 0.11 },
          ],
        },
      },
      // 3. Reactive Tail Whip when player flanks behind
      {
        id: 'ashTailTurn', name: 'Backlash Scythe', anim: 'sweep', clip: 'tailWhip',
        stances: ['ground'], when: 'behind', tell: 'tail',
        tracking: { rate: 4.5, commit: 0.7 }, markers: glint(0), chance: 1.8,
        hits: [{ startup: 0.64, active: 0.16, follow: 0.24 }], recovery: 0.78,
        damage: 22, poise: 36, knock: 8, lunge: 0.6, range: 4.8, box: TAIL,
        timeline: {
          cues: [
            { at: 0.48, socket: 'tail', ribbon: { color: 0xff8830, life: 0.38, width: 0.65 } },
          ],
        },
      },
      // 4. Twin Wing-Blade X-Cross (deflectable, concurrent dual hitboxes + dual wing ribbons!)
      {
        id: 'ashWingCross', name: 'Ashwing Cross', anim: 'chop', clip: 'wingCross',
        stances: ['ground'], tell: 'wingR',
        tracking: { rate: 2.6, commit: 0.6 }, markers: glint(0),
        hits: [{ startup: 0.92, active: 0.18, follow: 0.3 }], recovery: 0.95,
        damage: 30, heavy: true, poise: 55, knock: 9, lunge: 2.2, range: 4.8, box: WING,
        timeline: {
          cues: [
            { at: 0.25, socket: 'wingL', burst: { color: 0xff5a18, count: 12 } },
            { at: 0.25, socket: 'wingR', burst: { color: 0xff5a18, count: 12 } },
            { at: 0.76, socket: ['wingL', 'wingR'], ribbon: { color: 0xff5214, life: 0.45, width: 0.85 } },
            { at: 0.92, shake: 0.14 },
          ],
          extraHits: [
            { from: 0.92, to: 1.12, box: { w: 2.4, h: 2.0, d: 4.4, fwd: 2.6, y: 1.2 }, damage: 18, heavy: false, rollOnly: false },
          ],
        },
      },
      // 5. Sweeping Ember Breath (fires a 5-bolt fan + carves a synced magma Fissure!)
      {
        id: 'ashEmberBreath', name: 'Cinder Torrent', anim: 'draw', clip: 'emberBreath',
        stances: ['ground', 'airborne'], tell: 'jaw',
        tracking: { rate: 2.2, commit: 0.55 }, minRange: 3.5, chance: 0.95,
        hits: [{ startup: 0.95, active: 0.2, follow: 0.35 }], recovery: 1.0,
        damage: 24, poise: 30, knock: 5, lunge: 0, range: 15, box: { w: 1.6, h: 1.4, d: 2.0, fwd: 1.6, y: 1.4 },
        timeline: {
          cues: [
            { at: 0.35, socket: 'jaw', burst: { color: 0xff7020, count: 18 } },
            { at: 0.95, socket: 'jaw', burst: { color: 0xffe088, count: 24 }, shake: 0.10 },
          ],
          spawns: [
            { at: 0.95, kind: 'volley', count: 5, spread: 0.72, damage: 18, projectile: { speed: 17, gravity: 0, size: 0.24 } },
            { at: 0.96, kind: 'hazard', count: 1, hazard: { kind: 'fissure', style: 'ember', fwd: 1.8, radius: 1.15, length: 9.5, telegraph: 0.95, active: 0.38, damage: 26 } },
          ],
        },
      },
      // 6. Wing-Clap Takeoff (launches into airborne stance, leaves a fair ground shockwave)
      {
        id: 'ashTakeoff', name: 'Gale Ascent', anim: 'chop', clip: 'wingCross',
        stances: ['ground'], endStance: 'airborne', tell: 'wingL',
        tracking: { rate: 1.8, commit: 0.45 }, chance: 0.45,
        hits: [{ startup: 1.05, active: 0.16, follow: 0.3 }], recovery: 0.85,
        damage: 22, heavy: true, poise: 40, knock: 10, lunge: 0, range: 7.5, box: { w: 2.4, h: 1.6, d: 2.4, fwd: 0, y: 1.0 },
        timeline: {
          motion: [
            { from: 0.85, to: 1.45, altFrom: 0, altTo: 2.5 },
          ],
          cues: [
            { at: 0.70, socket: ['wingL', 'wingR'], ribbon: { color: 0xff8838, life: 0.5, width: 0.9 } },
            { at: 1.05, shake: 0.13 },
          ],
          spawns: [
            { at: 0.45, kind: 'hazard', count: 1, hazard: { kind: 'novaZone', style: 'ember', radius: 3.8, telegraph: 0.85, active: 0.28, damage: 24 } },
          ],
        },
      },
      // 7. Airborne Cinder Barrage (hovering volley + 2 synced nova zones on target)
      {
        id: 'ashCinderBarrage', name: 'Ashfall Barrage', anim: 'draw', clip: 'emberBreath',
        stances: ['airborne'], tell: 'jaw',
        tracking: { rate: 3.0, commit: 0.65 }, chance: 1.15,
        hits: [{ startup: 0.88, active: 0.18, follow: 0.32 }], recovery: 0.85,
        damage: 22, poise: 28, knock: 5, lunge: 0, range: 18, box: { w: 1.5, h: 1.4, d: 1.8, fwd: 1.4, y: 1.2 },
        timeline: {
          cues: [
            { at: 0.40, socket: 'jaw', burst: { color: 0xff6818, count: 16 } },
            { at: 0.88, socket: 'jaw', burst: { color: 0xffe498, count: 22 } },
          ],
          spawns: [
            { at: 0.88, kind: 'volley', count: 4, spread: 0.58, damage: 16, projectile: { speed: 19, gravity: 1.5, size: 0.22 } },
            { at: 0.55, kind: 'hazard', count: 2, ringRadius: 2.4, hazard: { kind: 'novaZone', style: 'cinder', radius: 2.3, telegraph: 1.0, active: 0.32, damage: 26 } },
          ],
        },
      },
      // 8. Sky Dive Slam (plunges from 2.5m to 0m with blazing wing trails + 3 radiating magma fissures!)
      {
        id: 'ashSkyDive', name: 'Cinder Sky-Dive', anim: 'overhead', clip: 'skyDive',
        stances: ['airborne'], endStance: 'ground', tell: 'clawR',
        tracking: { rate: 2.6, commit: 0.45 }, rollOnly: true, chance: 0.95,
        hits: [{ startup: 1.15, active: 0.2, follow: 0.42, leap: { from: 0.5, max: 14, short: 0.8 } }], recovery: 1.15,
        damage: 38, heavy: true, poise: 70, knock: 11, lunge: 0, range: 16, box: SLAM,
        impact: { ring: 4.2, crack: 1.6, dust: 16, shake: 0.18 },
        timeline: {
          motion: [
            { from: 0.55, to: 1.15, altFrom: 2.5, altTo: 0 },
          ],
          cues: [
            { at: 0.55, socket: ['wingL', 'wingR', 'clawR'], ribbon: { color: 0xff4810, life: 0.65, width: 0.95 } },
            { at: 1.15, socket: 'clawR', burst: { color: 0xff5a18, count: 32 }, shake: 0.20 },
          ],
          spawns: [
            { at: 1.15, kind: 'hazard', count: 3, spread: 1.25, hazard: { kind: 'fissure', style: 'cinder', fwd: 1.6, radius: 1.05, length: 9.0, telegraph: 0.9, active: 0.36, damage: 28 } },
          ],
        },
      },
      // 9. Phase 2 Signature Ultimate: Cinder Eclipse (3 converging beamAnchor spires around the player!)
      {
        id: 'ashCinderEclipse', name: 'Cinder Eclipse', anim: 'chop', clip: 'wingCross',
        stances: ['ground', 'airborne'], tell: 'jaw',
        tracking: { rate: 2.0, commit: 0.4 }, chance: 0.55,
        hits: [{ startup: 1.25, active: 0.2, follow: 0.45 }], recovery: 1.2,
        damage: 34, heavy: true, poise: 65, knock: 9, lunge: 0, range: 18, box: { w: 2.6, h: 1.8, d: 2.6, fwd: 0, y: 1.0 },
        timeline: {
          cues: [
            { at: 0.25, socket: ['wingL', 'wingR', 'jaw'], burst: { color: 0xffaa28, count: 26 }, shake: 0.12 },
            { at: 0.85, socket: ['wingL', 'wingR'], ribbon: { color: 0xffaa28, life: 0.55, width: 1.0 } },
            { at: 1.25, shake: 0.18 },
          ],
          spawns: [
            { at: 0.40, kind: 'hazard', count: 3, ringRadius: 6.5, hazard: { kind: 'beamAnchor', style: 'cinder', radius: 0.85, telegraph: 1.25, active: 0.42, lockAt: 0.72, damage: 32 } },
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
      helpers.burstAt(helpers.v0, 0xffe89c, 28);
    }
  },
};
