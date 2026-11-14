'use strict';
// One additional move for the giant, borrowed from the move sources (js/data/bosses/).
// Load after those definitions and before validation. Copy nested data so story tuning never changes a source boss.
// Timings, tracking, movement and key poses come from the source; damage is tuned to the story encounter, and the
// recovery to the borrowing boss's pace (pass 54, PLAN.md track B item 10: each boss's own 1x).
{
  const borrow = (source, id, changes) => {
    const original = source.attacks.find(a => a.id === id);
    if (!original) throw new Error(`Story boss moves: unknown attack "${source.id}/${id}".`);
    const move = JSON.parse(JSON.stringify(original));
    // Branches name the source boss's other attacks; each borrowed move ends with its own punishable recovery.
    delete move.followUps;
    return Object.assign(move, { origin: { enemy: source.id, attack: id } }, changes);
  };

  // A giant with a heavy club: two broad sweeps and a held chop.
  ENEMY_BY_ID.giant.attacks.push(
    borrow(GODFREY, 'tripleAxe', {
      id: 'giantBonebreaker', name: 'Bonebreaker Chain', damage: 28, recovery: 1.65,
    }),
  );

}
