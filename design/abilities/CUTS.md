# What changes in the current 38

Of the 38 abilities in `js/data/abilities.js`, 36 stay (most redesigned to the new bar) and 2 are cut.

## Cut

| Ability | Why |
| --- | --- |
| Swift Charge (common, charged heavies charge faster) | A plain stat with nothing to see, and the commons may hold only a third plain stats. Hot Iron replaces it on the same action: a full heavy that sprays molten sparks rewards the charge you can see. |
| Long Shadow (common, dashes dodge longer) | A plain stat that blunts the perfect dodge, the skill the counters are built on: longer i-frames make timing matter less, and the bosses' combos are tuned around the dash as it is. Light Step, Hunter's Pace, Ringing Steel and Last Breath already cover the dash, each with something to see. |

## Redesigned

| Ability | What changes |
| --- | --- |
| Storm King | No longer draws the lightning dragon, so Thunder Call alone owns it (and the showcase's key-4 beat). A full heavy calls a crown of six bolts that fall in a ring round the boss and converge. |
| Gale Crescent | No longer throws the wind crescent Wind Blade throws. Every eighth hit spins a cage of crescents round the boss for two seconds. |
| Cataclysm | The same blast, now with its own moment: the blade driven into the ground, a ring of ember cracks, a dome of white fire that bursts. |
| Fire Burst | A lotus of flame petals opening under the boss and snapping shut, in place of a plain flare. |
| Counterstep | The perfect dodge flash-steps you behind the boss, in place of making the next hit a riposte (the counter already does that now). |
| Opportunist | Hits on a cracked guard do more, in place of "boss off balance" (the off-balance state left with the stagger bar). |
| Cold Riposte | "Counters" in place of "ripostes" on the card; a frost line on the counter's cut. |
| All legendaries | One level only (Aleix). The data moves from two levels to one; `CONFIG.abilities.rarity.legendary.levels` goes to 1. |
| Every ability | Card texts re-cut to the trigger and the effect; each gets its look, sound, camera and hover loop per its spec. |

## Kept as they are, with their new look

Keen Edge, Iron Blood, Breaker, Static Edge, Light Step, Quick Draught, Keen Eye, Headsman, Vengeance, Bloodthirst, Last Breath, Bastion,
Patience, Counterflame, Stone Guardian, Grave Hound, Lancer of Ash, Wind Blade, Mending, Iron Stance, Grave Feast,
Iron Mercy, Meteor Fall, Time Rift, Thousand Blades, Blood Moon, Pyre, Ember Twin, Thunder Call.
