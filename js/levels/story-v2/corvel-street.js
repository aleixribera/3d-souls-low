'use strict';
// Independent Story V2 geometry and encounters. Existing level data is never modified.
const STORY_V2_3 = {
  "id": "v2-corvel-street",
  "layout": "rooms",
  "alert": true,
  "cull": true,
  "wakeZones": true,
  "steer": true,
  "clearGates": true,
  "name": "Story V2 · 3: Corvel's Last Street",
  "description": "Corvel burns. Cross the crooked market and silence the invaders' commander at the river road.",
  "help": "Break the bowman’s line of sight behind the market ruins. Close the gap before taking on the guard.",
  "next": "v2-bell-ascent",
  "wallHeight": 8,
  "gateHeight": 3.4,
  "gateThickness": 0.5,
  "flasks": 5,
  "enemyTuning": {
    "health": 0.85,
    "bossHealth": 0.35,
    "damage": 0.65
  },
  "atmosphere": {
    "background": 3810850,
    "fog": 6044720,
    "fogDensity": 0.0085,
    "moon": {
      "color": 16754792,
      "intensity": 2,
      "position": [
        60,
        12,
        4
      ]
    },
    "ambient": {
      "color": 5915712,
      "intensity": 1
    },
    "hemi": {
      "sky": 13142120,
      "ground": 2759188,
      "intensity": 0.7
    },
    "exposure": 1.05,
    "embers": 0.9,
    "dust": 0.1,
    "rim": 16752752,
    "grade": {
      "shadowTint": [
        0.92,
        0.9,
        1.06
      ],
      "highlightTint": [
        1.08,
        0.97,
        0.85
      ],
      "saturation": 0.82
    },
    "surface": {
      "moss": 0.2,
      "grime": 1.1
    },
    "banners": [
      3811882,
      2764346
    ],
    "debris": 0.1,
    "sky": {
      "zenith": 2498616,
      "sun": 16742970,
      "sunDir": [
        1,
        0.08,
        0.05
      ]
    },
    "silhouettes": 2,
    "landmark": {
      "x": 700,
      "z": 60,
      "y": -20,
      "height": 300,
      "width": 320
    }
  },
  "start": {
    "x": 4,
    "y": 0,
    "z": 0,
    "yaw": 1.5707963267948966
  },
  "rooms": [
    {
      "id": "river-shelter",
      "rect": [
        0,
        14,
        -6,
        6
      ],
      "height": 7,
      "open": false,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738
    },
    {
      "id": "crooked-market",
      "rect": [
        14,
        44,
        -12,
        10
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "grass": true,
      "lamps": [
        [
          17,
          -9
        ],
        [
          40,
          7
        ]
      ]
    },
    {
      "id": "market-elbow",
      "rect": [
        38,
        44,
        10,
        24
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738
    },
    {
      "id": "well-square",
      "rect": [
        38,
        60,
        24,
        40
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "lamps": [
        [
          41,
          37
        ]
      ]
    },
    {
      "id": "back-street",
      "rect": [
        60,
        82,
        28,
        38
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "lamps": [
        [
          79,
          35
        ]
      ]
    },
    {
      "id": "chapel-refuge",
      "rect": [
        82,
        98,
        22,
        42
      ],
      "height": 7,
      "open": false,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738
    },
    {
      "id": "commander-door",
      "rect": [
        98,
        104,
        28,
        34
      ],
      "height": 7,
      "open": false,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738
    },
    {
      "id": "river-road",
      "rect": [
        104,
        136,
        18,
        46
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "lamps": [
        [
          107,
          21
        ],
        [
          132,
          42
        ]
      ]
    },
    {
      "id": "tower-road",
      "rect": [
        136,
        142,
        28,
        34
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738
    }
  ],
  "ramps": [],
  "gated": [
    {
      "id": "market-crossfire",
      "trigger": [
        15,
        44,
        -12,
        10
      ],
      "gate": {
        "x": 41,
        "z": 10,
        "width": 6,
        "along": "x",
        "y": 0
      },
      "enemies": [
        {
          "enemy": "hollow",
          "arena": true,
          "spawn": {
            "x": 24,
            "y": 0,
            "z": 1,
            "yaw": -1.5707963267948966
          }
        },
        {
          "enemy": "bowman",
          "arena": true,
          "spawn": {
            "x": 37,
            "y": 0,
            "z": 4,
            "yaw": -1.5707963267948966
          }
        }
      ]
    },
    {
      "id": "well-duel",
      "trigger": [
        48,
        60,
        24,
        40
      ],
      "gate": {
        "x": 60,
        "y": 0,
        "z": 33,
        "width": 10,
        "along": "z"
      },
      "enemies": [
        {
          "enemy": "duelist",
          "arena": true,
          "spawn": {
            "x": 53,
            "y": 0,
            "z": 32,
            "yaw": -1.5707963267948966
          }
        }
      ]
    },
    {
      "id": "street-pair",
      "trigger": [
        61,
        82,
        28,
        38
      ],
      "gate": {
        "x": 82,
        "y": 0,
        "z": 33,
        "width": 10,
        "along": "z"
      },
      "enemies": [
        {
          "enemy": "warden",
          "arena": true,
          "spawn": {
            "x": 73,
            "y": 0,
            "z": 31,
            "yaw": -1.5707963267948966
          }
        },
        {
          "enemy": "rogue",
          "arena": true,
          "spawn": {
            "x": 77,
            "y": 0,
            "z": 35,
            "yaw": -1.5707963267948966
          }
        }
      ]
    },
    {
      "id": "commander",
      "trigger": [
        105,
        136,
        18,
        46
      ],
      "gate": {
        "x": 136,
        "y": 0,
        "z": 31,
        "width": 6,
        "along": "z"
      },
      "enemies": [
        {
          "enemy": "pillagerCaptain",
          "arena": true,
          "spawn": {
            "x": 123,
            "y": 0,
            "z": 31,
            "yaw": -1.5707963267948966
          }
        }
      ]
    }
  ],
  "dispersed": [],
  "bonfires": [
    {
      "id": "v2-market",
      "x": 3,
      "y": 0,
      "z": -3,
      "spawn": {
        "x": 4.5,
        "y": 0,
        "z": -1.5,
        "yaw": 1.5707963267948966
      }
    },
    {
      "id": "v2-well",
      "x": 40,
      "y": 0,
      "z": 35,
      "spawn": {
        "x": 41.5,
        "y": 0,
        "z": 36.5,
        "yaw": 1.5707963267948966
      }
    },
    {
      "id": "v2-command",
      "x": 88,
      "y": 0,
      "z": 24,
      "spawn": {
        "x": 89.5,
        "y": 0,
        "z": 25.5,
        "yaw": 1.5707963267948966
      }
    }
  ],
  "sealed": [
    {
      "id": "commander-fog",
      "gate": {
        "x": 104,
        "y": 0,
        "z": 31,
        "width": 6,
        "along": "z"
      },
      "fog": "commander"
    }
  ],
  "props": [
    {
      "kind": "cart",
      "x": 18,
      "z": -8
    },
    {
      "kind": "brokenStall",
      "x": 56,
      "z": 37
    }
  ],
  "houses": [
    {
      "rect": [
        27,
        33,
        -4,
        3
      ],
      "eaves": 4,
      "ridge": "z",
      "ruined": true
    },
    {
      "rect": [
        46,
        51,
        25,
        29
      ],
      "eaves": 3.5,
      "ridge": "x",
      "burning": true
    }
  ],
  "devJumps": [
    {
      "name": "Story V2 3: v2-market",
      "at": "v2-market",
      "won": []
    },
    {
      "name": "Story V2 3: v2-well",
      "at": "v2-well",
      "won": [
        "market-crossfire"
      ]
    },
    {
      "name": "Story V2 3: v2-command",
      "at": "v2-command",
      "won": [
        "market-crossfire",
        "well-duel",
        "street-pair"
      ]
    }
  ]
};
