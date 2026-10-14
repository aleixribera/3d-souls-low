'use strict';
// ============================================================================
// 3b. Events
// ============================================================================
// "Something happened" channel. Combat, items, bonfires and menus emit; effects and the
// tutorial listen (see registerListeners in the bootstrap). Events:
//   strike {strike, attacker, target, at, blocked}  parry {target}  postureBreak {enemy}
//   enemyDeath {enemy}  playerDeath {player}  rest {bonfire}  gateOpened {gate}  levelComplete
//   itemUsed {item}  land {x, z, fx}  alert {enemy, by}  perilous {enemy, attack} (a roll-only wind-up starts)  lock  switchTarget  zoom {dir}
//   pause  resume  device {device}
const events = {
  handlers: {}, anyHandlers: [],
  on(type, fn) { (this.handlers[type] || (this.handlers[type] = [])).push(fn); },
  onAny(fn) { this.anyHandlers.push(fn); },
  emit(type, data = {}) {
    for (const fn of this.handlers[type] || []) fn(data);
    for (const fn of this.anyHandlers) fn(type, data);
  },
};
