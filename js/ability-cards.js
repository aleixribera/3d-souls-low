'use strict';
// ============================================================================
// Boss Rush's ability cards (v7.75.0, PLAN.md Track B item 3, the "Pick 4 · Tall cards" mockup): what an ability
// looks like in the pick. The pick itself (offer, timer, keys, pad) is js/multiplayer.js's; the data
// js/data/abilities.js. Presentation only: nothing here touches the game.
// ============================================================================
// Each ability's icon: line drawing in a 48×48 box, stroked in its rarity's colour (no fill). Drawn for this game,
// in the menus' style; validate.js checks every ability has one.
const ABILITY_ICONS = {
  // Commons
  'keen-edge': '<path d="M12 33 L33 12 L38 10 L36 15 L15 36 Z"/><path d="M9 30 L18 39 M13 35 L8 40"/><path d="M38 27 V35 M34 31 H42"/>',
  'iron-blood': '<path d="M24 40 C14 33 8 27 8 19 A8 8 0 0 1 24 15 A8 8 0 0 1 40 19 C40 27 34 33 24 40 Z"/><path d="M24 21 V31 M19 26 H29"/>',
  'breaker': '<circle cx="24" cy="24" r="15"/><path d="M24 9 L21 18 L27 23 L21 30 L24 39"/><path d="M27 23 L34 21"/>',
  'keen-eye': '<path d="M5 26 C11 16 37 16 43 26 C37 36 11 36 5 26 Z"/><circle cx="24" cy="26" r="5"/><path d="M24 6 V11 M12 9 L15 13 M36 9 L33 13"/>',
  'light-step': '<path d="M38 8 C24 8 14 18 14 34 C28 34 38 24 38 8 Z"/><path d="M38 8 L9 40"/><path d="M19 27 H27 M24 22 H32"/>',
  'quick-draught': '<path d="M23 8 H31 M24 8 V16 C17 19 15 24 15 29 A12 12 0 0 0 39 29 C39 24 37 19 30 16 V8"/><path d="M17 28 H37"/><path d="M3 22 H9 M2 28 H9 M4 34 H10"/>',
  'cold-riposte': '<path d="M6 30 H34 L41 30 L34 33 H6 Z"/><path d="M11 25 V38"/><path d="M33 6 V18 M27 12 H39 M29 8 L37 16 M37 8 L29 16"/>',
  'headsman': '<path d="M12 42 L32 10"/><path d="M27 14 C33 8 42 11 42 19 C42 25 37 28 32 26 Z"/><path d="M9 36 L15 40"/>',
  // The blade's commons (batch 2)
  'spark-step': '<circle cx="28" cy="20" r="9"/><path d="M4 40 L12 32 L10 28 L20 22 L18 18 L44 6"/><path d="M20 22 L22 15 M20 22 L27 23 M20 22 L18 29 M20 22 L13 21"/>',
  'ember-lick': '<path d="M5 30 C7 22 11 18 15 16 M13 34 C15 26 19 22 23 20 M21 38 C23 30 27 26 31 24"/><path d="M29 40 C31 32 35 28 41 26 C40 20 36 16 38 9 C44 14 46 22 43 30 C40 36 34 40 29 40 Z"/>',
  'hot-iron': '<path d="M24 4 V30 M19 9 H29"/><path d="M8 40 H40"/><path d="M24 34 L12 22 M24 34 L17 18 M24 34 L24 16 M24 34 L31 18 M24 34 L36 22"/>',
  'petal-cut': '<path d="M4 30 L44 18"/><path d="M4 38 L12 38 M2 34 L9 34"/><path d="M20 26 C23 21 27 20 30 22 C27 26 23 27 20 26 Z"/><path d="M28 31 C31 30 34 32 34 35 C31 35 29 34 28 31 Z"/><path d="M33 11 C36 12 37 15 36 18 C33 17 32 14 33 11 Z"/>',
  'echo-step': '<path d="M12 12 A4 4 0 1 1 12 20 A4 4 0 1 1 12 12 Z M12 22 V34 M6 26 H18 M12 34 L7 42 M12 34 L17 42" stroke-dasharray="3 3"/><path d="M14 30 C24 30 30 24 32 14"/><path d="M38 14 A3 3 0 1 1 38 20 A3 3 0 1 1 38 14 Z M38 21 V32 M38 32 L34 40 M38 32 L42 40"/>',
  'dust-devil': '<path d="M24 6 A3 3 0 1 1 24 12 A3 3 0 1 1 24 6 Z M24 13 V22 M19 16 L29 16 M24 22 L20 28 M24 22 L28 28"/><path d="M6 42 H42"/><path d="M10 38 C10 32 38 32 38 36 C38 40 14 40 14 36 C14 34 32 33 33 35"/><path d="M15 33 L19 29 M28 38 L32 34 M34 31 L36 28"/>',
  // Batch 3, the guard and the run (pass 114)
  'ringing-steel': '<path d="M8 40 L30 18 M26 14 L34 22"/><path d="M34 10 C40 10 42 14 42 18 M38 6 C46 8 48 14 46 22"/><path d="M6 44 H22 M10 38 L4 38"/>',
  'thorn-guard': '<path d="M24 6 L40 12 V24 C40 34 32 40 24 43 C16 40 8 34 8 24 V12 Z"/><path d="M40 18 L46 16 M40 26 L46 28 M8 18 L2 16 M8 26 L2 28 M24 6 L24 1"/>',
  'ash-veil': '<path d="M24 8 A4 4 0 1 1 24 16 A4 4 0 1 1 24 8 Z M24 17 V30 M18 22 H30 M24 30 L20 40 M24 30 L28 40"/><path d="M10 42 C8 30 14 22 10 10 M38 42 C40 30 34 22 38 10 M14 44 C14 36 16 34 15 28 M34 44 C34 36 32 34 33 28"/>',
  'bitter-draught': '<path d="M20 6 H28 V14 L34 22 V40 C34 42 32 44 30 44 H18 C16 44 14 42 14 40 V22 L20 14 Z"/><path d="M14 30 H34"/><path d="M24 26 C20 22 26 20 24 16 M40 16 C38 12 42 10 40 6"/>',
  'grit': '<path d="M24 6 A4 4 0 1 1 24 14 A4 4 0 1 1 24 6 Z M24 15 V30 M16 20 H32 M24 30 L19 42 M24 30 L29 42"/><path d="M8 24 L14 22 M8 30 L14 30 M40 24 L34 22 M40 30 L34 30"/><path d="M12 14 L16 18 M36 14 L32 18"/>',
  'kindling': '<rect x="6" y="30" width="10" height="12"/><rect x="19" y="30" width="10" height="12"/><rect x="32" y="30" width="10" height="12"/><path d="M24 24 C18 18 26 14 24 6 C30 12 30 18 24 24 Z M11 26 V22 M37 26 V22"/>',
  'tithe': '<path d="M8 8 L30 30 M26 34 L34 26"/><path d="M30 30 L40 40"/><rect x="34" y="6" width="9" height="9"/><rect x="34" y="18" width="9" height="9"/><path d="M14 40 L22 40 M18 36 L18 44"/>',
  'glint': '<path d="M8 40 L32 16 M28 12 L36 20"/><path d="M38 4 L40 10 L46 12 L40 14 L38 20 L36 14 L30 12 L36 10 Z"/><rect x="6" y="28" width="9" height="9"/>',
  'hunters-pace': '<path d="M30 6 A4 4 0 1 1 30 14 A4 4 0 1 1 30 6 Z M29 15 L24 28 M27 19 L36 24 M27 19 L18 22 M24 28 L32 36 L30 44 M24 28 L16 36 L8 36"/><path d="M4 18 H12 M2 26 H10 M6 32 H12"/>',
  'kindred-ember': '<path d="M16 10 A4 4 0 1 1 16 18 A4 4 0 1 1 16 10 Z M16 19 V32 M16 32 L12 42 M16 32 L20 42 M16 24 L28 30"/><path d="M28 36 H44"/><path d="M36 32 C31 27 38 24 36 18 C42 23 41 28 36 32 Z"/>',
  'shatter-guard': '<path d="M24 6 L40 12 V24 C40 34 32 40 24 43 C16 40 8 34 8 24 V12 Z"/><path d="M24 6 L22 18 L28 24 L22 32 L24 43"/><path d="M42 30 L46 28 M42 36 L46 40 M6 34 L2 38"/>',
  'mirror-shard': '<path d="M10 42 L30 22 M26 18 L34 26"/><path d="M44 6 L33 17 M33 17 L34 11 M33 17 L39 16" stroke-dasharray="4 2"/><path d="M28 4 L22 12 L18 6 Z M14 18 L8 22 L8 14 Z M6 30 L2 36 L0 29 Z"/>',
  // Rares
  'counterstep': '<path d="M8 36 C8 22 16 14 28 14"/><path d="M28 14 L23 10 M28 14 L23 18"/><path d="M22 34 H40 L44 34 L40 36 H22 Z"/><path d="M26 30 V40"/>',
  'vengeance': '<path d="M17 10 C11 19 9 24 9 28 A8 8 0 0 0 25 28 C25 24 23 19 17 10 Z"/><path d="M36 40 V12 M30 18 L36 12 L42 18"/><path d="M30 26 L36 20 L42 26"/>',
  'bloodthirst': '<path d="M8 10 V28 M14 10 V28 M20 10 V28 M26 10 V28 M5 24 L29 14"/><path d="M36 41 C31 37 28 34 28 31 A4 4 0 0 1 36 29 A4 4 0 0 1 44 31 C44 34 41 37 36 41 Z"/>',
  'last-breath': '<path d="M20 22 H28 V40 H20 Z"/><path d="M24 7 C20 12 20 16 24 18 C28 16 28 12 24 7 Z"/><path d="M14 40 H34"/>',
  'opportunist': '<circle cx="24" cy="24" r="12"/><circle cx="24" cy="24" r="2"/><path d="M24 4 V14 M24 34 V44 M4 24 H14 M34 24 H44"/>',
  'bastion': '<path d="M24 6 L38 11 V24 C38 33 31 39 24 42 C17 39 10 33 10 24 V11 Z"/><path d="M27 14 L19 26 H27 L21 35"/>',
  'patience': '<path d="M14 6 H34 M14 42 H34"/><path d="M17 6 C17 16 24 19 24 24 C24 29 17 32 17 42 M31 6 C31 16 24 19 24 24 C24 29 31 32 31 42"/><path d="M20 39 C22 36 26 36 28 39"/>',
  'counterflame': '<path d="M8 38 L28 18 M40 38 L20 18"/><path d="M24 3 C18 10 18 14 24 18 C30 14 30 10 24 3 Z"/><path d="M13 42 L5 34 M35 42 L43 34"/>',
  'stone-guardian': '<path d="M24 6 L37 11 V23 C37 32 31 38 24 42 C17 38 11 32 11 23 V11 Z"/><path d="M24 6 V42"/><path d="M17 17 L20 22 L17 28"/><path d="M4 45 H44" stroke-dasharray="3 2"/>',
  'ash-lancer': '<path d="M7 41 L36 12"/><path d="M33 9 L44 4 L39 15 Z"/><path d="M12 42 L17 37"/><path d="M4 30 L11 23 M11 46 L18 39 M3 21 L8 16" stroke-dasharray="2 2"/>',
  'grave-hound': '<path d="M44 22 L31 20 L26 13 L23 19 L13 21 C9 22 8 27 12 29 L20 31 L15 39 L25 32 L32 34 L44 28"/><path d="M44 22 L36 25 L44 28"/><circle cx="30" cy="24" r="1.5"/><path d="M4 18 H9 M3 25 H7 M5 32 H10" stroke-dasharray="2 2"/>',
  // Batch 10, Summons I (pass 141)
  'cinder-fox': '<path d="M42 20 L40 14 L37 19 L30 20 L22 22 L18 28 M30 20 L34 27 L38 30 M24 23 L22 30 L18 32 M42 20 L46 23 L41 25 L37 19"/><path d="M18 28 C10 30 6 36 10 41 C14 46 30 46 38 40 C42 37 44 33 44 30" stroke-dasharray="3 2"/>',
  'lantern-spirit': '<ellipse cx="20" cy="22" rx="11" ry="9"/><path d="M13 12 H27 M13 32 H27 M20 13 V31 M13 15 C11 20 11 25 13 30 M27 15 C29 20 29 25 27 30"/><path d="M20 18 C18 20 18 24 20 26 C22 24 22 20 20 18 Z"/><path d="M16 32 V42 M24 32 V44"/><circle cx="42" cy="16" r="2.5"/><path d="M32 20 L38 17" stroke-dasharray="2 2"/>',
  // Batch 11, Summons II (pass 144)
  'ink-crows': '<path d="M24 14 C18 14 15 19 16 24 C17 29 31 29 32 24 C33 19 30 14 24 14 Z"/><path d="M18 15 L15 8 M30 15 L33 8"/><path d="M6 20 L10 18 L9 22 Z M38 10 L42 8 L41 12 Z M40 26 L44 25 L42 29 Z M8 32 L12 30 L11 34 Z M24 5 L28 3 L27 7 Z"/><path d="M22 34 V38 M27 35 V41" stroke-dasharray="2 2"/>',
  'bone-archer': '<path d="M12 4 C24 14 24 34 12 44"/><path d="M12 4 V44" stroke-dasharray="1 2"/><path d="M8 24 H46"/><path d="M41 20 L46 24 L41 28"/><circle cx="24" cy="12" r="4"/><path d="M20 10 C20 5 28 5 28 10"/>',
  'thunder-hawk': '<path d="M24 34 L10 14 L18 16 L24 6 L30 16 L38 14 Z"/><path d="M24 34 L22 40 L26 42 L23 47"/><path d="M28 2 L25 8 L29 9 L27 14" stroke-dasharray="2 1"/>',
  'night-owl': '<path d="M4 18 C12 12 18 16 24 20 C30 16 36 12 44 18 C38 20 32 22 28 26 H20 C16 22 10 20 4 18 Z"/><circle cx="21" cy="22" r="1.5"/><circle cx="27" cy="22" r="1.5"/><circle cx="24" cy="40" r="5"/><path d="M21 37 L27 43 M27 37 L21 43"/>',
  'ronin-shade': '<path d="M8 14 L40 14 L30 9 H18 Z"/><path d="M20 15 V30 L16 44 M28 15 V30 L32 44 M20 30 H28"/><path d="M28 22 L44 6" stroke-dasharray="3 1"/>',
  'mire-serpent': '<path d="M20 6 V44 M28 6 V44"/><path d="M14 40 C30 44 34 36 24 34 C14 32 14 26 24 24 C34 22 34 16 24 14 C18 13 16 10 18 7"/><path d="M18 7 L14 4 M18 7 L22 3"/>',
  'puppet-knight': '<path d="M14 4 H34 M24 4 V12 M16 4 L16 24 M32 4 L32 24 M20 4 L19 36 M28 4 L29 36"/><rect x="20" y="12" width="8" height="8"/><path d="M19 22 H29 V32 H19 Z M16 24 L19 22 M32 24 L29 22 M21 32 L19 44 M27 32 L29 44"/><circle cx="16" cy="24" r="1.5"/><circle cx="32" cy="24" r="1.5"/>',
  'ash-bear': '<path d="M18 44 L16 30 L12 22 L16 14 L22 10 L28 12 L30 20 L28 30 L30 44"/><path d="M30 20 L38 10 M34 8 L40 14 M36 6 L42 12 M38 4 L44 10"/><path d="M16 14 L14 10 M22 10 L22 7"/>',
  'glass-mantis': '<path d="M24 44 V22 L22 10 L26 6 L28 10 L24 22"/><path d="M24 26 L36 20 L30 12 M24 26 L12 20 L18 12"/><path d="M24 34 L12 44 M24 34 L36 44"/><path d="M14 8 L34 28 M34 8 L14 28" stroke-dasharray="2 1"/>',
  'static-edge': '<path d="M6 42 L28 20 L33 17 L30 22 L9 45"/><path d="M34 4 L27 13 L35 15 L29 25"/><path d="M39 19 L44 15 M40 26 L46 26"/>',
  // Crate rares (js/data/crates.js)
  'grave-feast': '<path d="M21 4 V17 L24 23 L27 17 V4 Z"/><path d="M16 8 H32"/><path d="M24 44 C15 38 10 33 10 28 A7 7 0 0 1 22 24 M26 24 A7 7 0 0 1 38 28 C38 33 33 38 24 44"/>',
  'iron-mercy': '<path d="M8 38 L28 18 M40 38 L20 18"/><path d="M6 34 L12 40 M42 34 L36 40"/><path d="M24 3 V15 M18 9 H30"/>',
  // Batch 5 rares (design/abilities: each card's icon line)
  'riptide': '<path d="M6 38 C14 30 22 22 30 12"/><path d="M30 12 C36 10 42 14 40 20 C38 16 34 16 32 19 C36 20 38 24 35 27"/><path d="M8 44 C14 40 20 44 26 40 C32 36 38 40 44 36"/>',
  'moonfall-cut': '<path d="M28 4 C14 8 10 26 18 40 C14 28 18 14 28 4 Z"/><path d="M36 6 L14 44"/><path d="M6 44 H42" stroke-dasharray="3 2"/>',
  'iron-cyclone': '<ellipse cx="24" cy="26" rx="18" ry="8"/><circle cx="24" cy="26" r="2"/><path d="M8 22 L14 18 M18 18 L24 16 M30 17 L36 19 M40 23 L44 26 M38 32 L32 34 M18 34 L12 32"/><path d="M4 12 H14 M34 10 H44"/>',
  'petal-storm': '<circle cx="24" cy="24" r="2"/><path d="M24 20 C22 14 26 8 30 6 C30 12 28 17 24 20 Z"/><path d="M28 24 C34 22 40 26 42 30 C36 30 31 28 28 24 Z"/><path d="M24 28 C26 34 22 40 18 42 C18 36 20 31 24 28 Z"/><path d="M20 24 C14 26 8 22 6 18 C12 18 17 20 20 24 Z"/><path d="M27 21 C31 16 37 16 40 12" stroke-dasharray="2 2"/>',
  'ironclad': '<path d="M20 18 H28 V22 C32 24 34 28 34 32 C34 38 30 42 24 42 C18 42 14 38 14 32 C14 28 16 24 20 22 Z"/><path d="M19 12 H29 V18 H19 Z"/><path d="M36 10 C40 12 42 16 42 20 M38 24 C42 26 44 30 44 34 M6 14 C8 12 10 11 12 11"/>',
  'hunting-call': '<path d="M8 12 L24 34 L40 12"/><path d="M8 12 L6 18 M40 12 L42 18"/><path d="M16 12 L24 24 L32 12"/>',
  'echoing-blade': '<path d="M8 40 C18 30 28 18 40 6"/><path d="M14 44 C24 34 34 22 44 12" stroke-dasharray="3 3"/><path d="M6 36 L12 42"/>',
  'overcharge': '<rect x="14" y="14" width="20" height="20"/><path d="M10 12 L14 8 L16 12 L20 8 M28 8 L32 12 L34 8 L38 12 M38 18 L42 22 L38 26 L42 30 M10 20 L6 24 L10 28 L6 32 M16 40 L20 44 L22 40 L26 44 L28 40 L32 44"/>',
  // Legendaries
  'gale-crescent': '<path d="M12 8 C20 5 30 5 36 9 C29 8 20 8 12 11 Z"/><path d="M12 18 C20 15 30 15 36 19 C29 18 20 18 12 21 Z"/><path d="M12 28 C20 25 30 25 36 29 C29 28 20 28 12 31 Z"/><path d="M12 38 C20 35 30 35 36 39 C29 38 20 38 12 41 Z"/><circle cx="24" cy="24" r="2.5"/>',
  'pyre': '<path d="M24 4 C16 14 13 22 15 30 C16 36 32 36 33 30 C35 22 32 14 24 4 Z"/><path d="M24 18 C21 23 21 27 24 30 C27 27 27 23 24 18 Z"/><path d="M5 42 H43 M10 38 H38"/>',
  'ember-twin': '<circle cx="15" cy="9" r="4"/><path d="M15 13 V27 M8 19 H22 M15 27 L10 40 M15 27 L20 40"/><circle cx="33" cy="9" r="4" stroke-dasharray="2 2"/><path d="M33 13 V27 M26 19 H40 M33 27 L28 40 M33 27 L38 40" stroke-dasharray="3 2"/>',
  'meteor-fall': '<circle cx="30" cy="22" r="7"/><path d="M6 4 L24 18 M15 3 L26 14 M4 13 L23 21"/><path d="M6 42 H42 M17 42 L21 35 M31 42 L28 35 M24 42 V36"/>',
  'hundred-suns': '<circle cx="24" cy="24" r="4"/><path d="M24 4 V16 M24 32 V44 M4 24 H16 M32 24 H44 M10 10 L18 18 M30 30 L38 38 M38 10 L30 18 M18 30 L10 38"/>',
  'thunder-god-step': '<path d="M6 30 L16 24 L14 30 L26 20 L24 27 L42 14"/><path d="M8 38 H20 M24 38 H30" stroke-dasharray="3 2"/><path d="M38 12 L42 14 L40 18"/>',
  'fourfold': '<circle cx="24" cy="24" r="5"/><circle cx="24" cy="8" r="3"/><circle cx="40" cy="24" r="3"/><circle cx="24" cy="40" r="3"/><circle cx="8" cy="24" r="3"/><path d="M24 19 V11 M29 24 H37 M24 29 V37 M19 24 H11"/>',
  'shade-host': '<circle cx="24" cy="9" r="4"/><path d="M24 13 V27 M17 19 H31 M24 27 L19 40 M24 27 L29 40"/><path d="M10 13 V27 M10 27 L6 40 M10 27 L14 40 M38 13 V27 M38 27 L34 40 M38 27 L42 40" stroke-dasharray="2 2"/>',
  'storm-king': '<path d="M8 30 L11 22 L8 18 L13 8"/><path d="M16 32 L18 24 L15 19 L19 7"/><path d="M24 33 L25 25 L22 20 L24 6"/><path d="M32 32 L33 24 L30 19 L29 7"/><path d="M40 30 L40 22 L37 18 L35 8"/><path d="M8 38 C16 43 32 43 40 38"/>',
  'time-rift': '<circle cx="24" cy="24" r="16"/><path d="M24 14 V24 L30 28"/><path d="M40 8 L34 14 L38 17 L31 24 L35 27 L28 34" stroke-dasharray="3 2"/>',
  'thousand-blades': '<path d="M12 4 V24 L12 29 M8 9 H16"/><path d="M24 10 V32 L24 37 M20 15 H28"/><path d="M36 4 V24 L36 29 M32 9 H40"/><path d="M6 44 H42" stroke-dasharray="2 4"/>',
  'blood-moon': '<path d="M30 6 A17 17 0 1 0 42 32 A13 13 0 1 1 30 6 Z"/><path d="M20 34 C17 38 17 40 20 42 C23 40 23 38 20 34 Z"/><path d="M30 40 V44"/>',
  // The pressed ones (pass 87, keys 1-4).
  'fire-burst': '<path d="M24 6 C28 14 34 16 34 26 A10 10 0 0 1 14 26 C14 19 19 17 20 11 C22 15 24 15 24 6 Z"/><path d="M5 24 H10 M38 24 H43 M10 10 L13 13 M38 10 L35 13 M10 38 L13 35 M38 38 L35 35"/>',
  'wind-blade': '<path d="M8 38 C18 31 30 19 40 8 C37 23 26 35 8 38 Z"/><path d="M5 20 H17 M4 27 H13 M22 43 H37" stroke-dasharray="3 2"/>',
  // Batch 6 strikes (design/abilities: each card's icon line)
  'tidal-arc': '<path d="M6 40 C10 24 22 12 34 12 C42 12 44 20 38 24 C36 19 30 19 28 23 C33 24 34 30 30 32"/><path d="M34 12 L37 7 M39 15 L44 12 M40 21 L45 21"/><path d="M4 44 H44"/>',
  'frost-spike': '<path d="M4 42 H44"/><path d="M6 42 L9 34 L12 42"/><path d="M14 42 L18 28 L22 42"/><path d="M24 42 L29 20 L34 42"/><path d="M34 42 L40 10 L45 42"/>',
  'stone-fist': '<path d="M4 40 H16 M32 40 H44"/><path d="M16 40 V22 C16 18 19 16 22 16 H30 C33 16 34 19 34 22 V40"/><path d="M20 16 V22 M25 16 V22 M30 16 V22"/><path d="M8 44 L12 40 M40 44 L36 40 M6 36 L10 40 M42 36 L38 40"/>',
  'rising-fang': '<path d="M6 42 H42"/><path d="M22 42 C20 30 24 16 34 4 C32 18 32 30 30 42"/><path d="M10 40 C14 36 18 34 22 34"/>',
  'thunderclap': '<path d="M12 10 C6 18 6 30 12 38 C14 30 14 18 12 10 Z"/><path d="M22 16 C26 21 26 27 22 32"/><path d="M29 11 C35 18 35 30 29 37"/><path d="M36 6 C44 16 44 32 36 42"/>',
  'sparrow-flurry': '<path d="M6 24 H20"/><path d="M8 14 L22 21 M8 34 L22 27"/><path d="M24 24 L44 24 M38 18 L44 24 L38 30"/><path d="M24 16 L40 10 M24 32 L40 38"/>',
  'whirl-drill': '<path d="M6 16 L42 24 L6 32 Z"/><path d="M14 18 L12 30 M22 19 L20 29 M30 21 L28 27"/><path d="M42 24 H46"/>',
  'shadow-stitch': '<ellipse cx="24" cy="40" rx="18" ry="4"/><path d="M12 40 L16 18 L19 40"/><path d="M21 40 L26 8 L30 40"/><path d="M31 40 L36 22 L38 40"/>',
  'spinning-blade': '<circle cx="24" cy="24" r="4"/><path d="M24 20 L32 6 L30 18 M28 24 L42 32 L30 30 M24 28 L16 42 L18 30 M20 24 L6 16 L18 18"/>',
  'three-shadows': '<circle cx="24" cy="24" r="4"/><path d="M24 4 V14 M22 10 L24 14 L26 10"/><path d="M7 34 L15 29 M13 33 L15 29 L11 28"/><path d="M41 34 L33 29 M35 33 L33 29 L37 28"/>',
  'quick-draw': '<path d="M6 34 L20 30"/><path d="M20 30 L42 14"/><path d="M4 42 L44 6"/><path d="M14 31 L17 36"/>',
  'mending': '<path d="M24 41 C10 31 6 24 6 17 A8.5 8.5 0 0 1 24 13 A8.5 8.5 0 0 1 42 17 C42 24 38 31 24 41 Z"/><path d="M24 19 V31 M18 25 H30"/>',
  'iron-root': '<path d="M24 6 V26"/><path d="M24 26 L10 40 M24 26 L38 40 M24 26 L24 43 M17 33 L9 31 M31 33 L39 31"/><path d="M18 12 H30"/>',
  'unbroken': '<path d="M24 5 C30 13 33 18 29 25 C33 23 34 20 34 18 C38 25 35 33 28 36 H20 C13 33 10 25 14 18 C14 22 16 24 19 25 C15 18 18 12 24 5 Z"/><path d="M14 43 H34"/>',
  'vanishing-step': '<path d="M14 30 C10 26 12 20 17 21 C17 16 23 15 24 20"/><path d="M30 14 C34 12 38 16 35 20"/><path d="M27 34 C31 32 35 36 32 40"/><path d="M8 42 H18 M22 42 H26 M30 42 H34"/>',
  'ember-mail': '<path d="M10 14 C16 9 32 9 38 14 L36 26 C34 34 29 38 24 41 C19 38 14 34 12 26 Z"/><path d="M24 12 V39"/><path d="M14 20 H34"/>',
  'still-water': '<ellipse cx="24" cy="32" rx="18" ry="7"/><ellipse cx="24" cy="32" rx="9" ry="3.5"/><path d="M24 8 C28 14 29 17 29 19 A5 5 0 0 1 19 19 C19 17 20 14 24 8 Z"/>',
  // Guard II (batch 9)
  'mirror-ward': '<path d="M26 5 H36 V43 H26 Z"/><path d="M30 13 L33 20 L29 26 M33 30 L30 36"/><path d="M4 18 H20 M15 14 L20 18 L15 22"/><path d="M20 32 H6 M11 28 L6 32 L11 36"/>',
  'ash-husk': '<path d="M14 8 A4 4 0 1 1 14 16 A4 4 0 1 1 14 8" stroke-dasharray="2 2"/><path d="M14 18 V31 M8 22 H20 M14 31 L9 42 M14 31 L19 42" stroke-dasharray="3 2"/><circle cx="34" cy="14" r="3.5"/><path d="M34 18 V30 M30 22 L38 24 M34 30 L38 41 M34 30 L30 40"/><path d="M4 24 L1 22 M4 28 L1 30 M22 10 L25 7"/>',
  'moon-dome': '<path d="M6 38 A18 18 0 0 1 42 38"/><path d="M4 38 H44"/><path d="M18 24 A8 8 0 0 0 22 33 A10 10 0 0 1 18 24"/><path d="M29 20 A6 6 0 0 0 32 27 A8 8 0 0 1 29 20"/><path d="M2 14 L6 18 M10 6 L12 11 M46 14 L42 18"/>',
  'waiting-blade': '<path d="M3 44 C14 18 30 8 45 4"/><path d="M10 36 L34 30"/><path d="M33 27 L35 33"/><path d="M35 30 L42 28"/><circle cx="38" cy="29" r="3"/>',
  'hourglass': '<path d="M8 40 C8 26 20 30 22 20 C24 10 34 8 40 8"/><circle cx="40" cy="6" r="2.5"/><path d="M40 10 V16"/><path d="M14 26 L18 30 M24 16 L28 19 M30 9 L32 13"/><path d="M14 40 L8 40 L8 34"/>',
  'binding-seal': '<path d="M18 4 H30 V34 C30 38 26 40 24 40 C22 40 18 38 18 34 Z"/><path d="M21 10 L27 12 M21 17 L27 18 M22 24 L26 26"/><path d="M24 40 C20 43 21 46 24 46 C27 46 28 43 24 40"/>',
  'iron-stance': '<path d="M24 5 L39 11 V23 C39 33 32 39 24 43 C16 39 9 33 9 23 V11 Z"/><path d="M16 23 L24 16 L32 23 M16 31 L24 24 L32 31"/>',
  // Ultimates I (batch 15)
  'thunder-call': '<path d="M6 10 H42" stroke-dasharray="4 3"/><path d="M14 10 C30 14 36 22 24 26 C12 30 16 38 30 36"/><path d="M30 36 L36 33 M30 36 L35 40"/><path d="M26 26 L22 34 H27 L23 44"/>',
  'cataclysm': '<path d="M24 26 L10 40 M24 26 L40 38 M24 26 L24 44 M24 26 L6 26 M24 26 L42 24"/><path d="M14 14 L20 8 L24 13 L18 18 Z"/><path d="M30 6 L37 9 L34 16 L28 13 Z"/><path d="M4 44 H44"/>',
  'heavens-lance': '<path d="M19 2 H29 V40 H19 Z"/><path d="M24 2 V40"/><ellipse cx="24" cy="40" rx="16" ry="5"/><path d="M6 6 L12 10 M42 6 L36 10"/>',
  'frozen-lotus': '<path d="M24 4 L28 26 L24 32 L20 26 Z"/><path d="M20 30 L6 22 L10 34 Z"/><path d="M28 30 L42 22 L38 34 Z"/><path d="M14 38 L24 32 L34 38 L24 44 Z"/>',
  'tempest': '<path d="M6 6 H42"/><path d="M10 14 H38"/><path d="M15 22 H33"/><path d="M19 30 H29"/><path d="M22 38 H26 L24 44"/><path d="M38 20 L34 28 H38 L35 34"/>',
  // Ultimates II (batch 16)
  'great-wave': '<path d="M4 42 C6 26 14 8 30 8 C40 8 44 16 40 22 C36 27 29 24 31 18"/><path d="M12 42 C14 30 20 20 28 18"/><path d="M4 42 H44"/><path d="M36 34 L42 30 M30 38 L38 36"/>',
  'sky-blade': '<path d="M21 4 H27 V30 L24 36 L21 30 Z"/><path d="M24 4 V30"/><path d="M14 30 H34"/><path d="M8 44 H40"/><path d="M24 36 V40 M16 42 L19 39 M32 42 L29 39"/>',
  'phoenix-dive': '<path d="M24 12 L30 22 L24 30 L18 22 Z"/><path d="M18 22 C10 14 6 10 4 4 C12 8 16 12 21 16"/><path d="M30 22 C38 14 42 10 44 4 C36 8 32 12 27 16"/><path d="M21 29 L16 44 M24 30 V44 M27 29 L32 44"/>',
  'black-star': '<circle cx="24" cy="24" r="8"/><path d="M24 4 L26 16 M24 44 L22 32 M4 24 L16 22 M44 24 L32 26"/><path d="M10 10 C14 14 16 14 18 18 M38 38 C34 34 32 34 30 30 M38 10 C34 14 34 16 30 18 M10 38 C14 34 16 32 18 30"/>',
  // Ultimates III (batch 17)
  'world-of-ink': '<path d="M38 10 C30 4 14 4 8 14 C2 24 6 38 18 42 C28 46 40 40 42 30"/><path d="M20 30 V20 M23 30 V17 M26 30 V18 M29 30 V21"/><path d="M18 30 C18 36 30 36 30 30"/>',
  'severance': '<path d="M4 44 L44 4"/><path d="M14 22 A8 8 0 0 1 26 14"/><path d="M22 34 A8 8 0 0 0 34 26"/>',
  'colossus': '<path d="M14 40 V20 C14 12 20 6 28 6 C36 6 42 12 42 20 V40"/><path d="M24 16 H32 M28 12 V22"/><path d="M22 34 L18 42 M20 38 L26 34"/><path d="M4 44 C16 38 32 38 46 44"/>',
  'ash-legion': '<path d="M4 30 L22 22 M10 38 L28 30 M16 46 L34 38"/><path d="M22 22 L26 20 L24 24 Z M28 30 L32 28 L30 32 Z M34 38 L38 36 L36 40 Z"/><path d="M30 10 C34 8 38 10 40 14 L36 16 M38 18 C40 20 42 22 44 22"/><path d="M2 12 H8 M2 18 H10"/>',
};
const ABILITY_RARITY_WORD = { common: 'Common', rare: 'Rare', legendary: 'Legendary' };
const ABILITY_LEVEL_MARK = ['I', 'II', 'III', 'IV', 'V', 'VI'];
// A pressed ability's bound key as the player reads it: "1", or a D-pad arrow after a controller press.
const abilityKeyBind = key => bindLabel(ABILITY_ACTIONS[ABILITY_KEYS.indexOf(key)]).replace(/^\[\s*|\s*\]$/g, '');
// One number of a card: a percentage, or in its ABILITY_UNITS unit.
function abilityAmount(key, x) {
  const unit = ABILITY_UNITS[key];
  if (unit === 's' || unit === 'm') return `${+x.toFixed(2)} ${unit}`;
  if (unit === 'n') return String(Math.round(x));
  return Math.round(x * 100) + '%';
}
// A card's text at `level` as parts ({ text, strong }): each number in bold, as "before → after" on an upgrade
// (`plain`: the level's own numbers only, as held).
function abilityCardText(b, level, plain = false) {
  const now = abilityAt(b, level), was = level > 1 && !plain ? abilityAt(b, level - 1) : null, parts = [];
  let from = 0;
  for (const m of b.text.matchAll(/\{(\w+)\}/g)) {
    const a = abilityAmount(m[1], now[m[1]]), w = was && abilityAmount(m[1], was[m[1]]);
    parts.push({ text: b.text.slice(from, m.index) }, { text: w && w !== a ? `${w} → ${a}` : a, strong: true });
    from = m.index + m[0].length;
  }
  parts.push({ text: b.text.slice(from) });
  return parts.filter(p => p.text);
}
// The card for ability `b` offered to someone holding `held`: a button (the pick sets its click), `key` its number
// key, `swift` true for a swift kill's extra card.
function abilityCard(b, held, key, swift) {
  const level = Math.min(abilityLevel(b, held) + 1, b.levels.length), make = (tag, cls, text) => {
    const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n;
  };
  const card = make('button', 'bcard'); card.type = 'button'; card.dataset.ability = b.id; card.dataset.rarity = b.rarity;
  const well = make('span', 'bcard-well');
  well.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${ABILITY_ICONS[b.id] || ''}</svg>`;
  const words = make('span', 'bcard-words'), name = make('strong', 'bcard-name', b.name);
  words.appendChild(name);
  if (level > 1) name.appendChild(make('span', 'bcard-level', `${ABILITY_LEVEL_MARK[level - 2]} → ${ABILITY_LEVEL_MARK[level - 1]}`));
  const text = make('span', 'bcard-text');
  for (const part of abilityCardText(b, level)) text.appendChild(part.strong ? make('b', '', part.text) : document.createTextNode(part.text));
  words.appendChild(text);
  const foot = make('span', 'bcard-foot'), rarity = make('span', 'bcard-rarity', ABILITY_RARITY_WORD[b.rarity]);
  if (b.key) rarity.appendChild(make('em', 'swift', ABILITY_KEY_NAMES[b.key]));   // its key's slot; the HUD shows the key
  if (swift) rarity.appendChild(make('em', 'swift', 'Swift kill'));
  foot.append(rarity, make('kbd', 'ui-key', String(key)));
  words.appendChild(foot);
  card.append(well, words);
  return card;
}
// The abilities `ids` holds (one per pick, repeated by upgrades), each once at its level: a small icon, the name with
// its level, the rarity and what it does now. Shown under the pick and in pause (Aleix, 2026-11-14: what each one
// does, its trigger, always at hand). Null when nothing is held.
function abilityHeldList(ids) {
  const held = [...new Set(ids || [])].map(id => ABILITY_BY_ID[id]).filter(Boolean);
  if (!held.length) return null;
  const make = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  const list = make('ul', 'held-list');
  for (const b of held) {
    const level = abilityLevel(b, ids), li = make('li'); li.dataset.rarity = b.rarity; li.dataset.ability = b.id;
    const icon = make('span', 'held-icon'); icon.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${ABILITY_ICONS[b.id] || ''}</svg>`;
    const head = make('span', 'held-head'), name = make('strong', 'held-name', b.name);
    if (level > 1) name.appendChild(make('span', 'held-level', ABILITY_LEVEL_MARK[level - 1]));
    head.append(name, make('span', 'held-rarity', ABILITY_RARITY_WORD[b.rarity] + (b.key ? ` · ${ABILITY_KEY_NAMES[b.key]} ${abilityKeyBind(b.key)}` : '')));
    const text = make('span', 'held-text');
    for (const part of abilityCardText(b, level, true)) text.appendChild(part.strong ? make('b', '', part.text) : document.createTextNode(part.text));
    li.append(icon, head, text); list.appendChild(li);
  }
  return list;
}
// The pick's look. Tall cards in a row over the HUD; on a narrow or short screen, rows (a 2×2 grid when wide enough).
(() => {
  const style = document.createElement('style');
  style.id = 'abilityCards';
  style.textContent = `#abilityScreen[hidden]{display:none}
  #abilityScreen{--rare:#8fb8dc;--leg:#e59a5c;--body:#cfc8b6;position:fixed;inset:0;z-index:46;display:grid;place-items:center;padding:24px max(16px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));
    box-sizing:border-box;overflow:auto;overscroll-behavior:contain;background:#080a0cdb;color:var(--ui-ink);font:400 15px/1.45 var(--ui-text)}
  #abilityScreen .ability-panel{width:min(100%,var(--pick-w,932px))}
  #abilityScreen .ability-head{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:12px}
  #abilityScreen h2{margin:0;font:400 var(--ui-size-head)/1.1 var(--ui-display);color:var(--ui-ink)}
  #abilityClock{font:500 15px/1 var(--ui-text);color:var(--ui-muted);font-variant-numeric:tabular-nums}
  #abilityScreen .ability-time{height:2px;margin-bottom:18px;background:var(--ui-line)}
  #abilityTimeFill{display:block;height:100%;background:var(--ui-accent);transform-origin:left}
  #abilityChoices{display:flex;justify-content:space-between;gap:12px}
  .bcard{--rc:var(--body);all:unset;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;width:216px;min-height:330px;padding:20px 18px 16px;
    text-align:center;background:var(--ui-panel);border:1px solid var(--ui-line);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
  .bcard[data-rarity=rare]{--rc:var(--rare)}.bcard[data-rarity=legendary]{--rc:var(--leg)}
  .bcard-well{display:grid;place-items:center;flex:none;width:96px;height:96px;box-sizing:border-box;background:var(--ui-well);border:1px solid var(--ui-line);border-bottom:2px solid var(--rc)}
  .bcard-well svg{width:56px;height:56px;fill:none;stroke:var(--rc);stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}
  .bcard-words{display:flex;flex-direction:column;align-items:center;flex:1;width:100%}
  .bcard-name{display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:18px;font:400 22px/1.15 var(--ui-display);color:var(--ui-ink)}
  .bcard-level{font:500 14px/1 var(--ui-text);color:var(--ui-accent)}
  .bcard-text{margin-top:12px;font:400 14px/1.45 var(--ui-text);color:var(--body);text-wrap:pretty}
  .bcard-text b{color:var(--ui-ink);font-weight:600;white-space:nowrap}
  .bcard-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;margin-top:auto;padding-top:14px;font:500 13px/1.2 var(--ui-text)}
  .bcard-rarity{color:var(--rc);text-align:left}
  .bcard-rarity .swift{font-style:normal;color:var(--ui-ink)}.bcard-rarity .swift::before{content:'·';margin:0 .45em;color:var(--ui-muted)}
  .bcard:hover:not(:disabled){background:#14171a;border-color:var(--ui-line-hi)}
  .bcard:focus-visible,.bcard[aria-pressed=true]{border-color:var(--ui-accent);outline:1px solid var(--ui-accent);outline-offset:-1px;background:#17150f}
  .bcard:disabled{opacity:.62;cursor:default}
  #abilityScreen .ability-actions{display:flex;justify-content:center;margin-top:18px}
  #abilityConfirm{width:auto;min-width:220px;min-height:44px;padding:10px 32px;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
  #abilityConfirm:disabled{opacity:.42;cursor:default}
  #abilityConfirm:focus-visible{outline:2px solid var(--ui-accent-hi);outline-offset:3px}
  #abilityHeld{margin-top:22px;padding-top:14px;border-top:1px solid var(--ui-line)}#abilityHeld:empty{display:none}
  #abilityHeld h3{margin:0 0 10px;font:400 var(--ui-size-row)/1.2 var(--ui-display);color:var(--ui-ink)}
  #abilityHeld .held-list{grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
  #abilityScreen.ability-pad .ui-key{display:none}
  #abilityStatus{margin:14px 0 0;color:var(--ui-muted)}#abilityStatus:empty{display:none}
  @media (hover:none){#abilityChoices .ui-key{display:none}}
  @media (max-width:900px),(max-height:560px){
    #abilityScreen{display:flex;flex-direction:column;align-items:center;padding-top:16px}
    #abilityScreen .ability-panel{margin-top:auto}
    #abilityScreen .ability-panel{width:min(100%,640px)}
    #abilityScreen h2{font-size:22px}
    #abilityChoices{display:grid;grid-template-columns:1fr;gap:8px}
    .bcard{flex-direction:row;align-items:flex-start;gap:14px;width:auto;min-height:44px;padding:14px;text-align:left;border-left:2px solid var(--rc)}
    .bcard-well{width:auto;height:auto;background:none;border:0}
    .bcard-well svg{width:30px;height:30px}
    .bcard-words{align-items:stretch}
    .bcard-name{flex-direction:row;align-items:baseline;gap:10px;margin-top:0;font-size:19px}
    .bcard-text{margin-top:5px}
    .bcard-foot{margin-top:0;padding-top:7px;font-size:12px}
    #abilityConfirm{width:100%}}
  @media (max-height:560px) and (min-width:600px){#abilityScreen .ability-panel{width:min(100%,860px)}#abilityChoices{grid-template-columns:1fr 1fr}}
  .held-list{--rare:#8fb8dc;--leg:#e59a5c;--body:#cfc8b6;display:grid;gap:10px 24px;margin:0;padding:0;list-style:none}
  .held-list li{--rc:var(--body);display:grid;grid-template-columns:28px minmax(0,1fr);column-gap:12px;align-items:start}
  .held-list li[data-rarity=rare]{--rc:var(--rare)}.held-list li[data-rarity=legendary]{--rc:var(--leg)}
  .held-icon{grid-row:1/3;width:28px;height:28px;margin-top:1px}.held-icon svg{width:28px;height:28px;fill:none;stroke:var(--rc);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .held-head{display:flex;align-items:baseline;gap:10px;min-width:0}
  .held-name{font:400 16px/1.25 var(--ui-display);color:var(--ui-ink);overflow-wrap:anywhere}.held-level{margin-left:7px;font:500 13px/1 var(--ui-text);color:var(--ui-accent)}
  .held-rarity{margin-left:auto;flex:none;font:500 13px/1.2 var(--ui-text);color:var(--rc)}
  .held-text{font:400 14px/1.4 var(--ui-text);color:var(--body)}.held-text b{color:var(--ui-ink);font-weight:600;white-space:nowrap}`;
  document.head.appendChild(style);
})();
