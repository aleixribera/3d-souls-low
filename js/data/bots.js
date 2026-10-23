'use strict';
// Friendly bots (v7.11): who joins when the lobby leader adds one. Traits are 0..1 leanings, read by js/bot.js:
//   aggression  how readily it presses an opening;   parry  how often it parries a parryable blow instead of rolling;
//   heavy       how often an opening gets a heavy;   jump   how often a long opening gets a leaping heavy;
//   side        the way it first circles and rolls (1 left, -1 right).
const BOT_PROFILES = [
  { id: 'quill', name: 'Ser Quill', aggression: 0.7, parry: 0.55, heavy: 0.4, jump: 0.3, side: 1 },
  { id: 'maren', name: 'Maren the Bold', aggression: 0.9, parry: 0.3, heavy: 0.6, jump: 0.5, side: -1 },
  { id: 'tobin', name: 'Old Tobin', aggression: 0.55, parry: 0.8, heavy: 0.3, jump: 0.15, side: 1 },
];
{
  const ids = new Set();
  for (const b of BOT_PROFILES) {
    if (!b.id || ids.has(b.id) || !b.name) throw new Error(`Bot profile "${b.id}": needs a unique id and a name.`);
    ids.add(b.id);
    for (const k of ['aggression', 'parry', 'heavy', 'jump']) if (!(b[k] >= 0 && b[k] <= 1)) throw new Error(`Bot profile "${b.id}": ${k} must be 0..1.`);
    if (b.side !== 1 && b.side !== -1) throw new Error(`Bot profile "${b.id}": side must be 1 or -1.`);
  }
}
