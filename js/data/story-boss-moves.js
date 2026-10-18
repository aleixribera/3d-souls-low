'use strict';
// One / two / two additional moves for the skeleton / captain / Warden, borrowed from Elden Ring Bosses.
// Load after those definitions and before validation. Copy nested data so story tuning never changes a source boss.
// Timings, tracking, movement and key poses come from the source; damage is tuned to the story encounter.
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
      id: 'giantBonebreaker', name: 'Bonebreaker Chain', damage: 28,
    }),
  );

  // A halberd has the haft and cutting reach for an axe drag and a two-turn blade sweep.
  ENEMY_BY_ID.pillagerCaptain.attacks.push(
    borrow(GODRICK, 'dragSlash', {
      id: 'captainDraggingSlash', name: 'Dragging Halberd', damage: 28,
    }),
    borrow(CRUCIBLE_KNIGHT, 'doubleSpin', {
      id: 'captainDoubleSpin', name: 'Double Halberd Spin', damage: 26,
    }),
  );

  // The bell is a massive hammer: a sweep/backswing/slam and a stomp into a chop.
  ENEMY_BY_ID.bellWarden.attacks.push(
    borrow(RADAGON, 'hammerCombo', {
      id: 'bellHammerChain', name: 'Bell Hammer Chain', damage: 30,
    }),
    borrow(RADAGON, 'stompChop', {
      id: 'bellStompChop', name: 'Stomp and Toll', damage: 28,
    }),
  );
}
