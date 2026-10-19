'use strict';
// Floor-aware routes between bonfires. Separate paths resume below scripted trap drops.
// Coordinates: [x, y, z]. Bonfire references use ids; ordering does not affect lookups.
const BONFIRE_GUIDANCE = {
  "long-hall": [
    { id: "hall-start-to-after-rogue", from: "hall-start", to: "after-rogue", paths: [
      [[2.6,0,-3.4],[8,0,0],[124,0,0],[130.5,0,-4.2]],
    ] },
  ],
  "sunken-keep": [
    { id: "keep-start-to-keep-shrine", from: "keep-start", to: "keep-shrine", paths: [
      [[3.5,0,-5.5],[3,0,-6],[35,0,4],[49,0,17],[49,0,30],[78,0,45]],
    ] },
  ],
  "burning-town": [
    { id: "town-lower-gate-to-town-tavern", from: "town-lower-gate", to: "town-tavern", paths: [
      [[3.5,0,-2.6],[3,0,-3],[45,0,1],[53,0,4],[57,0,9],[62,0,9],[63,0.3333,11],[63,4,22],[61,4,25],[20,4,26],[19,4,29],[19,4,40],[19,8,47],[26,8,56],[38,8,63]],
    ] },
  ],
  "the-tower": [
    { id: "tower-gate-to-tower-bait", from: "tower-gate", to: "tower-bait", paths: [
      [[-5.5,0,-4.5],[-6,0,-5],[25,0,-2]],
      [[25,-4,-2],[29,-4,-12],[31,-4,-11],[31,0,-3],[30,0,-2],[30.5,0,-1.8]],
    ] },
    { id: "tower-bait-to-tower-postern", from: "tower-bait", to: "tower-postern", paths: [
      [[30.5,0,-1.8],[30,0,-2],[34,0,5],[39,0,9],[39,0,22],[40,0,23],[56,6,23],[96,6,23],[97,6,22],[102,6,-4],[107,6,-14],[107.5,6,-13.5]],
    ] },
    { id: "tower-postern-to-tower-bell", from: "tower-postern", to: "tower-bell", paths: [
      [[107.5,6,-13.5],[107,6,-14],[109,6,-4],[111,6,-2],[111,10,10],[108,10,11],[89,10,11],[88,10.4,8],[88,14,-10],[91,14,-11],[111,14,-11],[112,14.4,-8],[112,18,10],[109,18,11],[90,18,11],[89,18.4,8],[87,22,-10],[85,22,-15],[85.5,22,-14.5]],
    ] },
  ],
  "final-castle": [
    { id: "castle-gate-to-castle-barracks", from: "castle-gate", to: "castle-barracks", paths: [
      [[88,0,-6],[96,0,-7],[119,0,-20],[119,0,-24],[112,0,-33],[112,0,-34]],
    ] },
    { id: "castle-barracks-to-castle-chapel", from: "castle-barracks", to: "castle-chapel", paths: [
      [[112,0,-34],[122,0,-19],[136,0,-2],[203,0,-1],[211,0,-5]],
    ] },
    { id: "castle-chapel-to-castle-rampart", from: "castle-chapel", to: "castle-rampart", paths: [
      [[211,0,-5],[217,0,2],[243,0,5],[253,0,10],[255,8,30],[256,8,32],[256.5,8,32.5]],
    ] },
    { id: "castle-rampart-to-castle-tower", from: "castle-rampart", to: "castle-tower", paths: [
      [[256.5,8,32.5],[256,8,32],[208,8,31],[207,8,30],[205,16,6],[203,16,-4]],
    ] },
    { id: "castle-tower-to-castle-throne", from: "castle-tower", to: "castle-throne", paths: [
      [[203,16,-4],[292,16,-2],[312,24,-2],[314,24,-4]],
    ] },
  ],
  "stormhill": [
    { id: "storm-chapel-to-storm-gatefront", from: "storm-chapel", to: "storm-gatefront", paths: [
      [[2.5,0,-6.5],[2,0,-7],[6,0,-4],[55,0,-3],[130,0,-3],[131,0,-6],[133,0,-16],[133,0,-15.5]],
    ] },
    { id: "storm-gatefront-to-storm-bridge", from: "storm-gatefront", to: "storm-bridge", paths: [
      [[133,0,-15.5],[133,0,-16],[159,0,-13],[170,0,-2],[190,8,-2],[222,8,-2],[224,8,-6],[224,8,-6.2]],
    ] },
  ],
  "stormveil": [
    { id: "veil-gate-to-veil-tower", from: "veil-gate", to: "veil-tower", paths: [
      [[13.5,0,-4.3],[13,0,-4],[31,0,-14],[36,0,-23],[70,0,-23],[86,8,-27],[136,8,-27],[140,8,-29],[140,8,-28.5]],
    ] },
    { id: "veil-tower-to-veil-liftside", from: "veil-tower", to: "veil-liftside", paths: [
      [[140,8,-28.5],[140,8,-29],[139,8,-16],[138,0,4],[138,0,62],[133,0,70],[133.5,0,70.5]],
    ] },
  ],
  "evergaol": [
    { id: "gaol-landing-to-gaol-isle", from: "gaol-landing", to: "gaol-isle", paths: [
      [[3,0,-4.5],[3,0,-5],[14,0,-1],[62,0,-1],[74,6,-1],[104,6,-1],[108,6,-3]],
    ] },
    { id: "gaol-isle-to-gaol-last", from: "gaol-isle", to: "gaol-last", paths: [
      [[108,6,-3],[106,6,5],[106,6,44],[106,12,56],[106,12,57],[115,12,65],[131,12,65],[132,12,63],[132,12,62.8]],
    ] },
  ],
  "leyndell": [
    { id: "ley-gate-to-ley-plaza", from: "ley-gate", to: "ley-plaza", paths: [
      [[13.5,0,-4.5],[13,0,-5],[42,0,-3],[120,0,-3],[120,0,-2.8]],
    ] },
    { id: "ley-plaza-to-ley-throne", from: "ley-plaza", to: "ley-throne", paths: [
      [[120,0,-2.8],[120,0,-3],[122,0,-3],[142,10,3],[157,10,16],[157,10,46],[153,10,54],[153.5,10,54.5]],
    ] },
  ],
  "ashen-capital": [
    { id: "ash-gate-to-ash-yard", from: "ash-gate", to: "ash-yard", paths: [
      [[11.5,0,-3.5],[11,0,-4],[34,0,-3],[71,0,-3]],
      [[71,-5,-3],[85,-5,-12],[85,0,-28],[78,0,-31],[78,0,-30.5]],
    ] },
    { id: "ash-yard-to-ash-throne", from: "ash-yard", to: "ash-throne", paths: [
      [[78,0,-30.5],[78,0,-31],[160,0,-31],[177,0,-10],[177,10,12],[171,10,20],[171.5,10,20.5]],
    ] },
  ],
  "farum-azula": [
    { id: "farum-arrival-to-farum-terrace", from: "farum-arrival", to: "farum-terrace", paths: [
      [[3,0,-4.5],[3,0,-5],[16,0,-1],[64,0,-1],[80,8,-2],[105,8,-2]],
      [[105,0,-2],[114,0,-9],[130,8,-9],[132,8,-2]],
    ] },
    { id: "farum-terrace-to-farum-spire", from: "farum-terrace", to: "farum-spire", paths: [
      [[132,8,-2],[214,8,-2],[230,16,-2],[231,16,-3],[232,16,-6]],
    ] },
  ],
  "erdtree": [
    { id: "tree-hollow-to-tree-amber", from: "tree-hollow", to: "tree-amber", paths: [
      [[3,0,-5.5],[3,0,-6],[17,0,-1],[72,0,-1],[90,8,1],[103,8,14],[103,8,40],[97,8,52],[97.5,8,52.5]],
    ] },
    { id: "tree-amber-to-tree-throne", from: "tree-amber", to: "tree-throne", paths: [
      [[97.5,8,52.5],[97,8,52],[101,8,53],[102,8,54],[104,16,72],[105,16,73],[120,16,83],[150,16,83],[151,16,82],[151,16,77],[151.5,16,77.5]],
    ] },
  ],
  "haligtree": [
    { id: "halig-ledge-to-halig-elphael", from: "halig-ledge", to: "halig-elphael", paths: [
      [[3,24,-4.5],[3,24,-5],[14,24,-2],[72,24,-2],[92,16,-2],[93,16,-2],[102,16,-12],[102,0,-40],[90,0,-52]],
    ] },
    { id: "halig-elphael-to-halig-lake", from: "halig-elphael", to: "halig-lake", paths: [
      [[90,0,-52],[104,0,-47],[164,0,-47],[184,0,-47],[186,0,-38]],
    ] },
  ],
};
