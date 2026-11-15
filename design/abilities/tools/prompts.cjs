// Writes the image prompts, batched as ChatGPT messages, to tools/prompts.json (and prints one with `node prompts.cjs N`).
// Each message asks for up to PER images; a new chat starts every CHAT messages and repeats the preamble.
'use strict';
const fs = require('fs');
const path = require('path');
const { POOL } = require('./pool.cjs');

const PER = 5, CHAT = 3;
const PREAMBLE = 'Concept art keyframes for an original dark fantasy action game, each a 16:9 landscape frame in an anime action style: hard-edged cel-shaded effect shapes in 2-3 flat tones with dark ink outlines and white-hot cores, ink-brush smears, speed lines, a held dramatic pose, low cinematic camera. A dark ash-grey and blue-black ruined stone arena under falling ash, lit mostly by the technique, which is the brightest, most saturated thing in the frame; few big sharp particles, never soft fog as the main shape. The hero is a lone swordsman in a dark hooded coat with a long red scarf and a round shield, face hidden in shadow. Original designs only: no existing characters, logos, symbols, text, letters or watermarks.';
const COLOUR = {
  common: 'Colour: bone-white and grey ink only, small and quick (a single brush stroke or a few sharp sparks).',
  rare: 'Colour: cool pale-blue edges, white core, black ink lines.',
  legendary: 'Colour: ember-orange edges over a white-hot or white-violet core, black ink; huge, the biggest moment of the fight.',
  story: 'Colour: deep crimson and old gold, sacred and huge.',
};
const BOSSES = ['a huge antlered beast of hunger', 'a chained jailer giant with an iron cage for a head', 'a tall warden in tattered robes swinging a great bell', 'a knight made of ash and cracked armour', 'a many-armed witch in a veil', 'a hulking stone colossus'];

const shots = [];
const order = (a) => ({ common: 0, rare: 1, legendary: 2, story: 3 }[a.rarity] * 10 + (a.key ? ['strike', 'guard', 'summon', 'ultimate'].indexOf(a.key) + 1 : 0));
const sorted = POOL.slice().sort((a, b) => order(a) - order(b));
for (const a of sorted) for (const [k, n] of [['img', 1], ['img2', 2], ['img3', 3]]) {
  if (a[k]) shots.push({ name: `${a.id}-${n}`, id: a.id, rarity: a.rarity, subject: a[k] });
}
shots.forEach((s, i) => { s.boss = BOSSES[i % BOSSES.length]; });

const messages = [];
for (let i = 0; i < shots.length; i += PER) {
  const group = shots.slice(i, i + PER);
  const first = (messages.length % CHAT) === 0;
  const head = `Create ${group.length} separate images, one after the other (${group.length} images, each its own full 16:9 frame, no panels, no text).` +
    (first ? ' ' + PREAMBLE : ' Same style, same hero and same rules as before.');
  const body = group.map((s, j) => `Image ${j + 1}: ${s.subject}. ${COLOUR[s.rarity]} If a boss is in the scene, it is ${s.boss}.`).join('\n\n');
  messages.push({ newChat: first, names: group.map((s) => s.name), text: head + '\n\n' + body });
}
fs.writeFileSync(path.join(__dirname, 'prompts.json'), JSON.stringify({ count: shots.length, messages }, null, 1));
const n = process.argv[2];
if (n !== undefined) {
  const m = messages[+n];
  console.log(JSON.stringify({ newChat: m.newChat, names: m.names }));
  console.log(m.text);
} else console.log(`${shots.length} images in ${messages.length} messages`);
