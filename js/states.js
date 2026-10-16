'use strict';
// ============================================================================
// 2b. State names
// ============================================================================
// Every state name is defined once here, with the groups the game asks about ("which states allow X").
const PS = Object.freeze({   // player
  IDLE: 'idle', WALK: 'walk', JUMP: 'jump', FALL: 'fall', ROLL: 'roll', ATTACK: 'attack',
  JUMP_ATTACK: 'jumpAttack', LAND: 'land', BLOCK: 'block', PARRY: 'parry', USE_ITEM: 'useItem',
  REST: 'rest', HURT: 'hurt', STAGGER: 'stagger', DEAD: 'dead',
});
const ES = Object.freeze({   // enemy
  IDLE: 'idle', PATROL: 'patrol', LURK: 'lurk', DORMANT: 'dormant', RISE: 'rise', LEAP: 'leap',
  RETURN: 'return', CHASE: 'chase', WINDUP: 'windup', ACTIVE: 'active', RECOVER: 'recover',
  HURT: 'hurt', STAGGER: 'stagger', PARRIED: 'parried', BROKEN: 'broken', DEAD: 'dead',
});
// The four phases of every attack: wind-up (STARTUP), strike (ACTIVE, the only phase with a hitbox), follow-through
// (FOLLOW, the blade carries on past the target) and recovery (back to guard; the only one a roll can cancel).
const PHASE = Object.freeze({ STARTUP: 'startup', ACTIVE: 'active', FOLLOW: 'follow', RECOVERY: 'recovery' });
const POISE = Object.freeze({ STAGGER: 'poiseStagger', FLINCH: 'poiseFlinch', NONE: 'poiseNone' });   // results of applyPoise
const PLAYER_GROUPS = {
  free: new Set([PS.IDLE, PS.WALK]),                                     // may start any action
  airborne: new Set([PS.JUMP, PS.FALL]),
  falls: new Set([PS.IDLE, PS.WALK, PS.BLOCK, PS.PARRY, PS.USE_ITEM, PS.REST, PS.HURT, PS.STAGGER]),   // no floor below: start falling
  attacking: new Set([PS.ATTACK, PS.JUMP_ATTACK]),
  noRegen: new Set([PS.ATTACK, PS.JUMP_ATTACK, PS.LAND, PS.BLOCK, PS.ROLL, PS.PARRY, PS.DEAD]),
  noLockFacing: new Set([PS.ROLL, PS.DEAD, PS.STAGGER, PS.REST, PS.LAND]),
  stunned: new Set([PS.HURT, PS.STAGGER]),
  // Busy states whose roll and attack presses go through the Souls-style input buffer (Player.bufferInputs).
  buffers: new Set([PS.ATTACK, PS.ROLL, PS.LAND, PS.PARRY, PS.HURT, PS.STAGGER, PS.USE_ITEM]),
};
const ENEMY_GROUPS = {
  unaware: new Set([ES.IDLE, ES.PATROL, ES.LURK, ES.RETURN]),           // has not noticed the player
  hidden: new Set([ES.LURK, ES.DORMANT]),                               // not a target yet
  canFlinch: new Set([ES.IDLE, ES.PATROL, ES.LURK, ES.RETURN, ES.CHASE, ES.RECOVER]),
  shrugsHits: new Set([ES.PARRIED, ES.RISE, ES.LEAP]),                  // take damage, no state change
  guarding: new Set([ES.IDLE, ES.PATROL, ES.RETURN, ES.CHASE, ES.HURT]), // a shield enemy blocks from the front
  fighting: new Set([ES.CHASE, ES.WINDUP, ES.ACTIVE, ES.RECOVER]),       // has a place around the player (js/crowd.js)
  attacking: new Set([ES.WINDUP, ES.ACTIVE, ES.RECOVER]),                // mid-attack: damps the others' attack chances
};
const IDLE_BLEND = { [ES.IDLE]: 1, [ES.CHASE]: 0.25, [ES.PATROL]: 0.25, [ES.LURK]: 0.25, [ES.RETURN]: 0.25 };
// Placement behaviours: the state an enemy starts in, and the state it returns to once back home.
const BEHAVIORS = {
  arena: { start: ES.IDLE, home: ES.IDLE },
  gated: { start: ES.IDLE, home: ES.IDLE },
  ambush: { start: ES.LURK, home: ES.LURK },       // hidden in an alcove, leaps out
  patrol: { start: ES.PATROL, home: ES.PATROL },   // walks a short path
  slumber: { start: ES.DORMANT, home: ES.IDLE },   // lying on the floor until the player is close
  sentry: { start: ES.IDLE, home: ES.IDLE },       // a lookout at its post (a rampart archer): sees far, belongs to no zone
  dummy: { start: ES.IDLE, home: ES.IDLE, training: true },
  sparring: { start: ES.IDLE, home: ES.IDLE, training: true },
};
