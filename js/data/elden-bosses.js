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
const ELDEN_BOSS_DEFS = [MARGIT, GODRICK, CRUCIBLE_KNIGHT, MORGOTT, RADAGON, MALIKETH];
const ELDEN_BOSSES = [
  { id: 'margit', enemy: 'margit', name: 'Margit, the Fell Omen', title: 'Stormveil\'s gatekeeper', difficulty: 4,
    description: 'Delayed cane swings, thrown golden daggers, and at 60% health a holy hammer and sword. Learn his rhythm; two parries break his stance.' },
  { id: 'godrick', enemy: 'godrick', name: 'Godrick the Grafted', title: 'Lord of Stormveil', difficulty: 5,
    description: 'A great axe, storm winds and shockwaves you must jump or roll. At 60% he grafts on a dragon’s head that breathes fire. He cannot be parried.' },
  { id: 'crucibleKnight', enemy: 'crucibleKnight', name: 'Crucible Knight', title: 'Knight of the old Crucible', difficulty: 4,
    description: 'Sword and greatshield: blows to his front glance off and earn a shield bash. One parry breaks him. At half health golden wings and a tail join the fight.' },
  { id: 'morgott', enemy: 'morgott', name: 'Morgott, the Omen King', title: 'Lord of Leyndell', difficulty: 5,
    description: 'Margit unmasked: a cursed greatsword, golden spears, hammers, daggers and a rain of swords. At 60% his cursed blood bursts into flame. Three parries break him.' },
  { id: 'radagon', enemy: 'radagon', name: 'Radagon of the Golden Order', title: 'Consort of the Golden Order', difficulty: 5,
    description: 'Marika’s hammer, spears of holy lightning, golden runes that erupt where he strikes, and teleports that burst as he leaves and arrives. At 60% the Gold Breaker and the Elden Shattering. Three parries break him.' },
  { id: 'maliketh', enemy: 'maliketh', name: 'Maliketh, the Black Blade', title: 'Shadow of the Elden Lord', difficulty: 5,
    description: 'As the Beast Clergyman: a broad dagger, flung stones and shockwaves to jump. At half health he sheds his robes for the Black Blade: every hit cuts your maximum health for a while. Only his golden attacks can be parried.' },
];
// The bosses are fought like any duel, by def id; they are not listed in the Enemies menu.
for (const d of ELDEN_BOSS_DEFS) ENEMY_BY_ID[d.id] = d;
