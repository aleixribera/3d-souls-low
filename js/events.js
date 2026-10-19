'use strict';
// ============================================================================
// 3b. Events
// ============================================================================
// "Something happened" channel. Combat, items, bonfires and menus emit; effects and the
// tutorial listen (see registerListeners in the bootstrap). Events:
//   strike {strike, attacker, target, at, blocked}  parry {target}  postureBreak {enemy}
//   enemyDeath {enemy}  playerDeath {player}  rest {bonfire}  gateOpened {gate}  levelComplete
//   impact {x, y, z, fx, enemy} (an attack with `impact` hits the ground)  shot {enemy, bolt}  boltStopped {bolt}  (strike carries projectile: true when a bolt hits)
//   gateOpened {gate, shortcut} (shortcut: a gate opened from its far side)
//   dodge {attacker, strike, projectile} (a live hitbox or a bolt met the player during the roll's invulnerability; once each)
//   trapWarning {trap} (the player set a trap off)  trapSprung {trap} (its floor gave way)
//   itemUsed {item}  land {x, y, z, fx}  fell {body} (into a pit)  fallDamage {body, height, damage}  alert {enemy, by}  attackStart {enemy, attack} (an enemy starts an attack)  attackPhase {actor, attack, phase, hitIndex} (a strike changes phase)  attackMarker {actor, attack, marker}  perilous {enemy, attack} (a roll-only wind-up starts)  lock  switchTarget
//   pause  resume  device {device}
//   menuMove  menuConfirm  menuBack  menuAdjust {dir}  (menus; the audio engine plays their sounds)
const events = {
  handlers: {}, anyHandlers: [],
  on(type, fn) { (this.handlers[type] || (this.handlers[type] = [])).push(fn); },
  onAny(fn) { this.anyHandlers.push(fn); },
  emit(type, data = {}) {
    for (const fn of this.handlers[type] || []) fn(data);
    for (const fn of this.anyHandlers) fn(type, data);
  },
};
