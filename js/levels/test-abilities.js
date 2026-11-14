'use strict';
// Test: Ability Grounds (v7.75.0): the duel arena Boss Rush is fought in, with a mannequin to try its abilities on,
// alone. Its `abilityLab` opens js/ability-lab.js's list (B): any ability on at any level, a legendary fired with one
// click. A sparring mannequin off to the side swings slowly, for the abilities a parry or a dodge sets off.
// v7.76.0: both are boss-sized, with a boss's health on the big bar that fills again once emptied, and the damage of
// every blow rises off them as a number (`damageNumbers`, this level only).
const TEST_ABILITIES = {
  ...ARENA, id: 'test-abilities', abilityLab: true, damageNumbers: true,
  name: 'Test: Ability Grounds', description: 'Two boss-sized mannequins and every Boss Rush ability. Press B to switch them on and off.',
  help: 'Test: B opens the abilities.',
  dispersed: [
    { behavior: 'dummy', enemy: 'greatDummy', x: 4, z: 0, yaw: -Math.PI / 2 },
    { behavior: 'sparring', enemy: 'greatSparringDummy', x: 7, z: 8, yaw: -Math.PI * 0.7 },
  ],
};
