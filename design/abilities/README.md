# The ability pool

The complete design of Combat Arena 3D's abilities: 110 for Boss Rush and Story's four on top, ready for the iterate
loop to build in the order of `BUILD-ORDER.md`. Design only: nothing here is in the game yet.

- `STYLE.md`: the style bible every effect, card and image is judged against.
- `<id>.md`: one spec per ability (idea, card, data entry, engine work, multiplayer, effect layers and budget, sound,
  camera, images).
- `pool.json`: every ability's core data in one file, written by `node design/abilities/tools/build.cjs` from
  `tools/pool.cjs`, which also checks the card-text cap and the counts below. Change an ability in `tools/pool.cjs`,
  rebuild, then update its spec.
- `CUTS.md`: what left the current 38 and why. `BUILD-ORDER.md`: the batches, one loop pass each.
- `img/`: the concept images (WebP). Full-quality originals sit in `originals/` (gitignored, on Aleix's PC).

## The bars (Aleix, PLAN.md item 6)

- Legendaries are OP, at one level only, with Thunder Call's lightning dragon as the floor: strong enough to turn a
  fight, not to win it alone.
- No rarity cap. Plain stat buffs are at most a third of the commons. Every ability does something no other does.
- Card text is the trigger and the effect only, at most 9 words and 56 characters (`js/validate.js`).
- The feel is anime techniques: "an anime character directing abilities and coordinating to kill the boss".

## Counts

| | Common | Rare | Legendary | All |
| --- | --- | --- | --- | --- |
| Key 1, Strike | | 13 | | 13 |
| Key 2, Guard | | 13 | | 13 |
| Key 3, Summon | | 13 | | 13 |
| Key 4, Ultimate | | | 13 | 13 |
| Triggered (no key) | 26 | 20 | 12 | 58 |
| **All** | **26** | **59** | **25** | **110** |

- Plain stat commons: 8 of 26 (under a third). The other 18 commons each do a small visible thing.
- Summons: 16 (13 on key 3, plus Stone Guardian, Ember Twin and Shade Host). Each is its own Blender model.
- Kept or redesigned from the current 38: 36. New: 74. Cut: 2 (`CUTS.md`).
- Crate-only: Grave Feast and Iron Mercy (as now).
- Story's four, one per key, at the legendary bar: Scarlet Draw (key 1, chapter 2), Oath Guard (key 2, chapter 5),
  The Seven (key 3, chapter 6), Bell of Waking (key 4, chapter 14).

## Rules every spec follows

- Content is data (`js/data/abilities.js`); a new trigger (`when`) or effect (`then`) is an engine addition named in
  the spec's Engine work, with its `validate.js` check.
- Multiplayer: an ability touches only enemies and its holder. A teammate gets at most a small shared benefit (Moon
  Dome's shelter, Still Water's pool, Kindred Ember's revive). Nothing slows, moves, links or takes over a teammate's
  fight. The server resolves powers from range- and rate-checked claims.
- No ability cracks a boss's guard by itself: the counters and the Finishing Blow are the player's. Abilities feed
  them instead.
- Effects use pooled meshes, stay in their budget class on Normal (`STYLE.md`), and keep flashes under 3 Hz with a
  reduced-motion version.

## Rarity colours

Common bone ink `#cfc8b6`, rare cool blue `#8fb8dc`, legendary ember orange `#e59a5c` (`js/config.js`). Story's four:
scarf crimson `#b3262e` and oath gold `#e8c46a`.
