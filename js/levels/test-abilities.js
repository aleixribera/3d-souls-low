'use strict';
// Test: Ability Grounds (v7.73.0): the duel arena Boss Rush is fought in, with a mannequin to try its abilities on,
// alone. Its `abilityLab` opens js/ability-lab.js's list (B): any ability on at any level, a legendary fired with one
// click. A sparring dummy off to the side swings slowly, for the abilities a parry or a dodge sets off.
const TEST_ABILITIES = {
  ...ARENA, id: 'test-abilities', abilityLab: true,
  name: 'Test: Ability Grounds', description: 'A mannequin and every Boss Rush ability. Press B to switch them on and off.',
  help: 'Test: B opens the abilities.',
  dispersed: [
    { behavior: 'dummy', enemy: 'dummy', x: 4, z: 0, yaw: -Math.PI / 2 },
    { behavior: 'sparring', enemy: 'sparringDummy', x: 6, z: 8, yaw: -Math.PI * 0.7 },
  ],
};
