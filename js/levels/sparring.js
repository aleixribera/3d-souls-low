'use strict';
// The sparring ring (pass 97, PLAN.md item 3d): the duel arena, the sparring partner in the middle and nothing else.
// js/sparring.js runs the drills (`sparring`); the teacher is drawn beside the partner, not placed here. Not a chapter
// and not in Practice's level list: the Tutorial button, Practice's Tutorial and a new player's first Story or Boss
// Rush start it.
const SPARRING_LEVEL = (({ lessons, ...ring }) => ({   // the drills teach here: no lesson cards over them
  ...ring, id: 'sparring', sparring: true,
  name: 'Sparring', description: 'The moves, one at a time.',
  help: '',
  playerStart: { x: -0.5, z: -0.4, yaw: Math.PI / 2 },
  // The teacher's own spot: beside the player, as far from the partner, so it shows each move where the player stands.
  teacher: { x: -0.3, z: 1.8 },
  dispersed: [{ behavior: 'sparring', enemy: 'sparringPartner', x: 1.4, z: 0.4, yaw: -Math.PI / 2 }],
}))(ARENA);
