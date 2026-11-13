'use strict';
// ============================================================================
// Move sources: two enemies' move sets that the story's own enemies still fight with (v7.53.0)
// ============================================================================
// The old second road and its enemies left the game in v7.53.0. Two of its move sets live on, unregistered (no model, not
// in ENEMY_DEFS, never fought as they are): the Rending Brothers (js/data/bosses/agathe.js) fight with BEASTMAN_MOVES, the
// Rootbound (js/data/bosses/kindling-tree.js) with ZEALOT_MOVES. Each goes when its story enemy gets moves of its own.
// Their moves come from the old bosses' move sets (js/data/bosses/maliketh.js, radagon.js), copied and scaled to the
// smaller body (`k`, this enemy's scale over the boss's).

// k: this enemy's scale over the boss's. Boxes (and their rings), reaches, lunges, steps, leaps, blinks, sigils and impact
// sizes shrink by it; projectiles keep their reach. Branches (followUps) name the boss's other moves, so they go.
const borrowScaled = (source, id, k, changes = {}) => {
  const original = source.attacks.find(a => a.id === id);
  if (!original) throw new Error(`Move sources: unknown attack "${source.id}/${id}".`);
  const a = JSON.parse(JSON.stringify(original)), r2 = v => Math.round(v * 100) / 100;
  delete a.followUps;
  const box = b => { if (!b) return; for (const f of ['w', 'h', 'd', 'fwd', 'y']) if (typeof b[f] === 'number') b[f] = r2(b[f] * k); if (b.ring) for (const f of ['from', 'to', 'width']) b.ring[f] = r2(b.ring[f] * k); };
  const imp = m => { if (m) for (const f of ['ring', 'crack']) if (typeof m[f] === 'number') m[f] = r2(m[f] * k); };
  box(a.box); imp(a.impact);
  for (const h of a.hits) {
    box(h.box); imp(h.impact);
    if (h.step) h.step.side = r2(h.step.side * k);
    if (h.leap) { h.leap.max = r2(h.leap.max * k); if (h.leap.short) h.leap.short = r2(h.leap.short * k); if (h.leap.back) h.leap.back = r2(h.leap.back * k); }
    if (h.blink) { if (h.blink.dist) h.blink.dist = r2(h.blink.dist * k); if (h.blink.back) h.blink.back = r2(h.blink.back * k); }
    if (h.sigil) h.sigil = r2(h.sigil * k);
    if (h.abort) delete h.abort;
  }
  if (!a.projectile) { a.range = r2(a.range * k); if (a.minRange) a.minRange = r2(a.minRange * k); }
  a.lunge = r2((a.lunge || 0) * k);
  if (a.poseScale) a.poseScale = Math.min(a.poseScale, 1.2);
  Object.assign(a, { origin: { enemy: source.id, attack: id } });
  return typeof changes === 'function' ? (changes(a) || a) : Object.assign(a, changes);
};
// A stagger meter (normal enemies of Ashmere's Undead Knight kind): never interrupted until it fills, then it kneels.
const staggerMeter = (heavy, light, breakTime = 2.2) => ({ max: 100, heavy, light, breakers: ['heavy', 'jumpHeavy'], decayDelay: 2.5, decay: 9.6, breakTime, hitstop: 0.14 });

const BEASTMAN_MOVES = {
  id: 'beastman', name: 'Beastman',
  scale: 1.15, bulk: 0.95, radius: 0.45, color: 0x5a5048, weapon: 'sword', idle: 'twitch',
  visual: { skin: 0x6a6058, roughness: 0.85, rim: 0.8 },
  hp: 250, poise: 55, speed: 4.0, turnRate: 7, trackRate: 3.2, approach: 0.7, kite: 0.35,
  cooldown: [0.55, 1.2], crowd: { groupCooldown: 1.6 }, flinchTime: 0.22, staggerTime: 1.0, parriedTime: 1.7,
  attacks: [
    borrowScaled(MALIKETH, 'multiSlash', 0.58, { id: 'bmSlash', name: 'Beast Multi-Slash', damage: 12, chance: 0.9 }),
    borrowScaled(MALIKETH, 'beastClaw', 0.58, { id: 'bmClaw', name: 'Beast Claw', damage: 22, chance: 0.35 }),
    borrowScaled(MALIKETH, 'sling', 0.58, { id: 'bmSling', name: 'Bestial Sling', damage: 8, chance: 0.3, range: 12 }),
    borrowScaled(MALIKETH, 'lungeSweep', 0.58, { id: 'bmLunge', name: 'Lunging Sweep', damage: 18, chance: 0.4 }),
    { id: 'bmPounce', name: 'Leaping Slash', anim: 'overhead', pose: 'clawPounce', tracking: { rate: 3, commit: 0.45 }, rollOnly: true, minRange: 3.5, chance: 0.35,
      hits: [{ startup: 0.95, active: 0.14, follow: 0.3, leap: { from: 0.45, max: 13, short: 1.0 } }], recovery: 0.95,
      damage: 22, poise: 40, knock: 6, lunge: 0, range: 13, box: { w: 2.2, h: 1.8, d: 2.4, fwd: 0.7, y: 0.9 },
      impact: { ring: 2.0, crack: 0.9, dust: 10, shake: 0.06 } },
  ],
};
const ZEALOT_MOVES = {
  id: 'goldenZealot', name: 'Zealot',
  scale: 1.35, bulk: 1.05, radius: 0.55, color: 0xd8ccb0, weapon: 'club', idle: 'still',
  visual: { skin: 0xd8c8b4, roughness: 0.55, rim: 0.9 },
  hp: 440, poise: 120, speed: 2.5, turnRate: 3.6, trackRate: 1.8, approach: 0.4, kite: 0.2,
  cooldown: [0.9, 1.8], flinchTime: 0, staggerTime: 1.2, parriedTime: 1.9,
  stagger: staggerMeter(32, 9, 2.2),
  attacks: [
    borrowScaled(RADAGON, 'hammerTwo', 0.68, { id: 'gzHammer', name: 'Hammer Swings', damage: 24, chance: 1 }),
    borrowScaled(RADAGON, 'lightningSpear', 0.68, { id: 'gzSpear', name: 'Golden Lightning Spear', damage: 22, chance: 0.4, minRange: 7, range: 24 }),
    borrowScaled(RADAGON, 'teleportStrike', 0.68, { id: 'gzBlink', name: 'Vanishing Strike', damage: 20, chance: 0.35 }),
    borrowScaled(RADAGON, 'runeSlam', 0.68, { id: 'gzRune', name: 'Rune Slam', damage: 28, chance: 0.35 }),
  ],
};
