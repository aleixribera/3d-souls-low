'use strict';
// Persistent movement patterns, mixed differently by each companion.
// gap is the wanted body-edge distance; circle is the share of CONFIG.bot.strafe.
const BOT_TACTICS = {
  pressure: { gap: 0.5, circle: 0.15 },
  flank: { gap: 1.1, circle: 1 },
  bait: { gap: 2.6, circle: 0.6 },
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
const BOT_PROFILES = [
  { id: 'quill', name: 'Ser Quill', aggression: 0.7, parry: 0.55, heavy: 0.4, jump: 0.3, side: 1,
    patience: 4.5, patterns: { pressure: 0.35, flank: 0.45, bait: 0.2 },
    dodges: { escape: 0.4, across: 0.2, reverse: 0.1, inward: 0.15, outward: 0.1, retreat: 0.05 } },
  { id: 'maren', name: 'Maren the Bold', aggression: 0.9, parry: 0.3, heavy: 0.6, jump: 0.5, side: -1,
    patience: 3, patterns: { pressure: 0.7, flank: 0.2, bait: 0.1 },
    dodges: { escape: 0.25, across: 0.15, reverse: 0.1, inward: 0.35, outward: 0.1, retreat: 0.05 } },
  { id: 'tobin', name: 'Old Tobin', aggression: 0.55, parry: 0.8, heavy: 0.3, jump: 0.15, side: 1,
    patience: 6, patterns: { pressure: 0.15, flank: 0.25, bait: 0.6 },
    dodges: { escape: 0.35, across: 0.15, reverse: 0.1, inward: 0.1, outward: 0.15, retreat: 0.15 } },
];
{
  for (const [id, t] of Object.entries(BOT_TACTICS)) {
    if (!Number.isFinite(t.gap) || t.gap < 0 || !Number.isFinite(t.circle) || t.circle < 0 || t.circle > 1)
      throw new Error(`Bot tactic "${id}": needs a non-negative gap and circle 0..1.`);
  }
  for (const [id, d] of Object.entries(BOT_DODGES)) {
    if (!['escape', 'target'].includes(d.basis) || !Number.isFinite(d.angle))
      throw new Error(`Bot dodge "${id}": needs an escape/target basis and a finite angle.`);
  }
  const ids = new Set();
  for (const b of BOT_PROFILES) {
    if (!b.id || ids.has(b.id) || !b.name) throw new Error(`Bot profile "${b.id}": needs a unique id and a name.`);
    ids.add(b.id);
    for (const k of ['aggression', 'parry', 'heavy', 'jump']) if (!Number.isFinite(b[k]) || b[k] < 0 || b[k] > 1) throw new Error(`Bot profile "${b.id}": ${k} must be 0..1.`);
    if (b.side !== 1 && b.side !== -1) throw new Error(`Bot profile "${b.id}": side must be 1 or -1.`);
    if (!Number.isFinite(b.patience) || b.patience <= 0) throw new Error(`Bot profile "${b.id}": patience must be positive.`);
    const dodges = Object.entries(b.dodges || {});
    if (!dodges.length || dodges.some(([id, weight]) => !Object.hasOwn(BOT_DODGES, id) || !Number.isFinite(weight) || weight < 0) || !dodges.some(([, weight]) => weight > 0))
      throw new Error(`Bot profile "${b.id}": dodges need known direction ids and non-negative weights with a positive total.`);
    const patterns = Object.entries(b.patterns || {});
    if (!patterns.length || patterns.some(([id, weight]) => !Object.hasOwn(BOT_TACTICS, id) || !Number.isFinite(weight) || weight < 0) || !patterns.some(([, weight]) => weight > 0))
      throw new Error(`Bot profile "${b.id}": patterns need known tactic ids and non-negative weights with a positive total.`);
  }
}
