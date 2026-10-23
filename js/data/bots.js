'use strict';
// Persistent movement patterns, mixed differently by each companion.
// gap is the wanted body-edge distance; circle is the share of CONFIG.bot.strafe.
// commitAt is the fraction of this plan spent positioning before closing to attack (1 waits for the next plan).
const BOT_TACTICS = {
  pressure: { gap: 0.7, circle: 0.2, commitAt: 0 },
  flank: { gap: 1.9, circle: 1, commitAt: 0.45 },
  bait: { gap: 3.4, circle: 0.55, commitAt: 1 },
  reset: { gap: 3.8, circle: 0.35, commitAt: 1 },
};
// Dodge directions are relative to the foe and mirrored by the bot's current preferred side.
// The geometric escape is always available when a shaped attack needs it.
const BOT_DODGES = {
  escape: { basis: 'escape', angle: 0 },
  inward: { basis: 'target', angle: Math.PI / 4 },
  outward: { basis: 'target', angle: Math.PI * 3 / 4 },
  across: { basis: 'target', angle: Math.PI / 2 },
  reverse: { basis: 'target', angle: -Math.PI / 2 },
  retreat: { basis: 'target', angle: Math.PI },
};
// Traits are 0..1 leanings. Patience is seconds without an exchange before taking the initiative.
// Pattern weights choose a plan every CONFIG.bot.tacticTime seconds, rather than reconsidering each frame.
// burst counts ordinary swings before a short reset; think paces decisions, evade favours walking clear,
// and jumpDodge is the chance of a defensive jump after geometry, timing and other threats allow one.
const BOT_PROFILES = [
  { id: 'quill', name: 'Ser Quill', aggression: 0.7, parry: 0.55, heavy: 0.4, jump: 0.3, side: 1,
    patience: 4.5, burst: [1, 3], reset: [0.9, 1.6], think: [0.18, 0.34], evade: 0.5, jumpDodge: 0.22, patterns: { pressure: 0.35, flank: 0.45, bait: 0.2 },
    dodges: { escape: 0.4, across: 0.2, reverse: 0.1, inward: 0.15, outward: 0.1, retreat: 0.05 } },
  { id: 'maren', name: 'Maren the Bold', aggression: 0.9, parry: 0.3, heavy: 0.6, jump: 0.5, side: -1,
    patience: 3, burst: [2, 4], reset: [0.65, 1.25], think: [0.12, 0.27], evade: 0.35, jumpDodge: 0.32, patterns: { pressure: 0.7, flank: 0.2, bait: 0.1 },
    dodges: { escape: 0.25, across: 0.15, reverse: 0.1, inward: 0.35, outward: 0.1, retreat: 0.05 } },
  { id: 'tobin', name: 'Old Tobin', aggression: 0.55, parry: 0.8, heavy: 0.3, jump: 0.15, side: 1,
    patience: 6, burst: [1, 2], reset: [1.1, 1.9], think: [0.23, 0.42], evade: 0.65, jumpDodge: 0.18, patterns: { pressure: 0.15, flank: 0.25, bait: 0.6 },
    dodges: { escape: 0.35, across: 0.15, reverse: 0.1, inward: 0.1, outward: 0.15, retreat: 0.15 } },
];
{
  for (const [id, t] of Object.entries(BOT_TACTICS)) {
    if (!Number.isFinite(t.gap) || t.gap < 0 || !Number.isFinite(t.circle) || t.circle < 0 || t.circle > 1 || !Number.isFinite(t.commitAt) || t.commitAt < 0 || t.commitAt > 1)
      throw new Error(`Bot tactic "${id}": needs a non-negative gap, circle 0..1 and commitAt 0..1.`);
  }
  for (const [id, d] of Object.entries(BOT_DODGES)) {
    if (!['escape', 'target'].includes(d.basis) || !Number.isFinite(d.angle))
      throw new Error(`Bot dodge "${id}": needs an escape/target basis and a finite angle.`);
  }
  const ids = new Set();
  for (const b of BOT_PROFILES) {
    if (!b.id || ids.has(b.id) || !b.name) throw new Error(`Bot profile "${b.id}": needs a unique id and a name.`);
    ids.add(b.id);
    for (const k of ['aggression', 'parry', 'heavy', 'jump', 'evade', 'jumpDodge']) if (!Number.isFinite(b[k]) || b[k] < 0 || b[k] > 1) throw new Error(`Bot profile "${b.id}": ${k} must be 0..1.`);
    if (b.side !== 1 && b.side !== -1) throw new Error(`Bot profile "${b.id}": side must be 1 or -1.`);
    if (!Number.isFinite(b.patience) || b.patience <= 0) throw new Error(`Bot profile "${b.id}": patience must be positive.`);
    for (const k of ['burst', 'reset', 'think']) {
      const range = b[k];
      if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite) || range[0] <= 0 || range[1] < range[0] || k === 'burst' && !range.every(Number.isInteger))
        throw new Error(`Bot profile "${b.id}": ${k} needs an ordered positive range (whole attacks for burst).`);
    }
    const dodges = Object.entries(b.dodges || {});
    if (!dodges.length || dodges.some(([id, weight]) => !Object.hasOwn(BOT_DODGES, id) || !Number.isFinite(weight) || weight < 0) || !dodges.some(([, weight]) => weight > 0))
      throw new Error(`Bot profile "${b.id}": dodges need known direction ids and non-negative weights with a positive total.`);
    const patterns = Object.entries(b.patterns || {});
    if (!patterns.length || patterns.some(([id, weight]) => !Object.hasOwn(BOT_TACTICS, id) || !Number.isFinite(weight) || weight < 0) || !patterns.some(([, weight]) => weight > 0))
      throw new Error(`Bot profile "${b.id}": patterns need known tactic ids and non-negative weights with a positive total.`);
  }
}
