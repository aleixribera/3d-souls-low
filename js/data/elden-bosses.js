'use strict';
// ============================================================================
// Elden Ring Bosses: the boss list (v5.3)
// ============================================================================
// One entry per boss, in the order the boss select screen lists them (js/elden.js builds the screen from this list).
// To add a boss: write its file in js/data/bosses/ (its def, model and poses, like margit.js), add the file to
// GAME_FILES in combat-arena-3d.html before this one, put its def in ELDEN_BOSS_DEFS and add an entry here.
//   id           the entry's id (unique)
//   enemy        the boss def's id (fought in the Enemies arena, ARENA)
//   name, title  the card's name and short title; the health bar shows the def's own name
//   difficulty   1 to 5 (stars on the card)
//   description  one line under the card
const ELDEN_BOSS_DEFS = [MARGIT];
const ELDEN_BOSSES = [
  { id: 'margit', enemy: 'margit', name: 'Margit, the Fell Omen', title: 'Stormveil\'s gatekeeper', difficulty: 4,
    description: 'Delayed cane swings, thrown golden daggers, and at 60% health a holy hammer and sword. Learn his rhythm; two parries break his stance.' },
];
// The bosses are fought like any duel, by def id; they are not listed in the Enemies menu.
for (const d of ELDEN_BOSS_DEFS) ENEMY_BY_ID[d.id] = d;
