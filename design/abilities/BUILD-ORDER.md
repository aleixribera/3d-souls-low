# Build order

One batch per iterate-loop pass, plainest effects first, so each pass lands a working, playable slice and the
engine pieces later batches need arrive before them. Within a batch, abilities that share a new trigger (`when`) or
effect (`then`) are built together. Each spec's Engine work names what it needs.

| Pass | Batch | Abilities | Engine pieces it adds |
| --- | --- | --- | --- |
| 1 | The data pass | Legendaries to one level; cut Swift Charge and Long Shadow; new card texts for the kept 36 (Cold Riposte, Counterstep, Opportunist); the plain commons Keen Edge, Iron Blood, Light Step, Quick Draught, Breaker, Keen Eye, Cold Riposte, Headsman with their small touches | `CONFIG.abilities.rarity.legendary.levels = 1`, save-format bump if owned abilities change shape, validate.js for the new texts |
| 2 | Commons I: the blade | Spark Step, Ember Lick, Hot Iron, Petal Cut, Echo Step, Dust Devil | triggers `dashPast`, `stringEnd`, `dashStrike`, `jump`; the common effect pool (≤3 meshes) |
| 3 | Commons II: the guard and the run | Ringing Steel, Thorn Guard, Ash Veil, Bitter Draught, Grit, Kindling, Tithe, Glint, Hunter's Pace, Kindred Ember, Mirror Shard, Shatter Guard | triggers `ready`, `fightStart`, `revive`, `parryShot`, `crack`; key-charge gain hooks |
| 4 | Rares I: the kept perks | Counterstep, Vengeance, Bloodthirst, Last Breath, Opportunist, Bastion, Patience, Counterflame, Static Edge, Grave Feast, Iron Mercy | `flashBehind`, the `cracked` state; each gets its blue look |
| 5 | Rares II: the new triggers | Riptide, Petal Storm, Ironclad, Overcharge, Echoing Blade, Moonfall Cut, Iron Cyclone, Hunting Call | the `wave` line hit (shared with Tidal Arc), `cast`, `comboHeavy`, `summonHit` |
| 6 | Strike I: shapes on the ground | Fire Burst, Wind Blade, Tidal Arc, Frost Spike, Stone Fist, Rising Fang, Thunderclap | line, cone and point area hits; the key-1 effect pool |
| 7 | Strike II: the flashy ones | Sparrow Flurry, Whirl Drill, Shadow Stitch, Spinning Blade, Three Shadows, Quick Draw | multi-hit over time, the returning projectile, clone silhouettes, the delayed cut |
| 8 | Guard I: on yourself | Mending, Iron Stance, Iron Root, Unbroken, Vanishing Step, Ember Mail, Still Water | stance and armour states, the undying floor, the heal pool |
| 9 | Guard II: on the boss | Mirror Ward, Ash Husk, Moon Dome, Waiting Blade, Hourglass, Binding Seal | blow reflection, decoys, shot blocking, the counter stance, path rewind, cancelling a boss's next attack |
| 10 | Summons I | Grave Hound, Lancer of Ash (rebuilt as models), Cinder Fox, Lantern Spirit, Stone Guardian | summon model loading and animation; four Blender models |
| 11 | Summons II | Ink Crows, Bone Archer, Thunder Hawk, Night Owl | flying and ranged summons; marks on the boss |
| 12 | Summons III | Ronin Shade, Mire Serpent, Puppet Knight, Ash Bear, Glass Mantis | the summon's deflect, the coil, strings to the hand |
| 13 | Legendaries I: the kept and redesigned | Meteor Fall, Time Rift, Thousand Blades, Blood Moon, Pyre, Ember Twin, Storm King (bolt crown), Gale Crescent (blade cage) | the impact frame (one per moment, reduced-motion darken) |
| 14 | Legendaries II: new triggered | Hundred Suns, Thunder God Step, Fourfold, Shade Host | `castUltimate`, the lightning dash, the clone host |
| 15 | Ultimates I | Thunder Call (to the new bar), Cataclysm (redesign), Heaven's Lance, Frozen Lotus, Tempest | the long-aura budget, world dim on release |
| 16 | Ultimates II | Great Wave, Sky Blade, Phoenix Dive, Black Star | the player transform (phoenix), the hold-then-implode |
| 17 | Ultimates III | World of Ink, Severance, Colossus, Ash Legion | the world-colour change, the screen-wide cut, the giant and the legion models |
| 18 | Story's four | Scarlet Draw, Oath Guard, The Seven, Bell of Waking | given in chapters 2, 5, 6 and 14; the Seven's and the Bell's models |

Story's four ship with the story passes that build their chapters if those come first; their specs stand alone.
