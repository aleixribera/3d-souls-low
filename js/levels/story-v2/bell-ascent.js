'use strict';
// Independent Story V2 geometry and encounters. Existing level data is never modified.
const STORY_V2_4 = {
  "id": "v2-bell-ascent",
  "layout": "rooms",
  "alert": true,
  "cull": true,
  "wakeZones": true,
  "steer": true,
  "clearGates": true,
  "name": "Story V2 · 4: The Bell Ascent",
  "description": "Above the town, sheltered stairs climb to the Bell of Waking. Take the high ground and call the crown to answer.",
  "help": "Fight on the wide landings. Climb to the bowman; keep your back away from the terrace edge.",
  "next": "v2-crown-answer",
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
    "background": 2303278,
    "fog": 3356228,
    "fogDensity": 0.011,
    "moon": {
      "color": 12109024,
      "intensity": 2.1,
      "position": [
        -30,
        18,
        10
      ]
    },
    "ambient": {
      "color": 4870244,
      "intensity": 1.15
    },
    "hemi": {
      "sky": 9081520,
      "ground": 2235930,
      "intensity": 0.6
    },
    "exposure": 1.02,
    "ash": 1,
    "dust": 0.15,
    "rim": 12110056,
    "grade": {
      "shadowTint": [
        0.86,
        0.95,
        1.14
      ],
      "highlightTint": [
        1.04,
        1,
        0.94
      ],
      "saturation": 0.72
    },
    "surface": {
      "moss": 0.55,
      "grime": 1.1
    },
    "banners": [
      3811882,
      2764346
    ],
    "debris": 0.2,
    "sky": {
      "zenith": 1974838,
      "sun": 13666928,
      "sunDir": [
        -0.8,
        0.12,
        0.35
      ]
    },
    "silhouettes": 3,
    "grass": 1
  },
  "start": {
    "x": 4,
    "y": 0,
    "z": 0,
    "yaw": 1.5707963267948966
  },
  "rooms": [
    {
      "id": "cliff-shelter",
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
      "id": "stair-yard",
      "rect": [
        14,
        32,
        -10,
        8
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "lamps": [
        [
          18,
          -7
        ]
      ]
    },
    {
      "id": "first-landing",
      "rect": [
        44,
        62,
        -5,
        9
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "y": 4,
      "edges": {
        "s": "rail",
        "n": "rail"
      }
    },
    {
      "id": "north-turn",
      "rect": [
        56,
        62,
        9,
        22
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "y": 4,
      "edges": {
        "w": "rail"
      }
    },
    {
      "id": "bell-refuge",
      "rect": [
        56,
        74,
        22,
        34
      ],
      "height": 7,
      "open": false,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "y": 4
    },
    {
      "id": "upper-terrace",
      "rect": [
        86,
        108,
        22,
        36
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "y": 8,
      "edges": {
        "s": "rail",
        "n": "rail"
      },
      "lamps": [
        [
          89,
          33
        ]
      ]
    },
    {
      "id": "bell-shelter",
      "rect": [
        108,
        122,
        24,
        38
      ],
      "height": 7,
      "open": false,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "y": 8
    },
    {
      "id": "bell-door",
      "rect": [
        122,
        128,
        27,
        33
      ],
      "height": 7,
      "open": false,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "y": 8
    },
    {
      "id": "bell-platform",
      "rect": [
        128,
        158,
        16,
        44
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "y": 8,
      "edges": {
        "n": "rail",
        "s": "rail"
      },
      "lamps": [
        [
          132,
          19
        ],
        [
          153,
          40
        ]
      ]
    },
    {
      "id": "castle-view",
      "rect": [
        158,
        164,
        27,
        33
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "y": 8
    }
  ],
  "ramps": [
    {
      "id": "lower-stair",
      "rect": [
        32,
        44,
        -3,
        3
      ],
      "axis": "x",
      "from": 0,
      "to": 4,
      "stairs": true,
      "height": 7,
      "edges": {
        "n": "rail",
        "s": "rail"
      },
      "floor": 4538682,
      "wall": 6380368
    },
    {
      "id": "upper-stair",
      "rect": [
        74,
        86,
        25,
        31
      ],
      "axis": "x",
      "from": 4,
      "to": 8,
      "stairs": true,
      "height": 7,
      "edges": {
        "n": "rail",
        "s": "rail"
      },
      "floor": 4538682,
      "wall": 6380368
    }
  ],
  "gated": [
    {
      "id": "stair-guard",
      "trigger": [
        15,
        32,
        -10,
        8
      ],
      "gate": {
        "x": 32,
        "y": 0,
        "z": 0,
        "width": 6,
        "along": "z"
      },
      "enemies": [
        {
          "enemy": "lancer",
          "arena": true,
          "spawn": {
            "x": 26,
            "y": 0,
            "z": 0,
            "yaw": -1.5707963267948966
          }
        }
      ]
    },
    {
      "id": "high-bow",
      "trigger": [
        [
          32,
          44,
          -3,
          3
        ],
        [
          44,
          62,
          -5,
          9
        ]
      ],
      "gate": {
        "x": 59,
        "z": 9,
        "width": 6,
        "along": "x",
        "y": 4
      },
      "enemies": [
        {
          "enemy": "bowman",
          "arena": true,
          "spawn": {
            "x": 56,
            "y": 4,
            "z": 3,
            "yaw": -1.5707963267948966
          }
        }
      ]
    },
    {
      "id": "terrace-pair",
      "trigger": [
        87,
        108,
        22,
        36
      ],
      "gate": {
        "x": 108,
        "y": 8,
        "z": 31,
        "width": 14,
        "along": "z"
      },
      "enemies": [
        {
          "enemy": "hollow",
          "arena": true,
          "spawn": {
            "x": 94,
            "y": 8,
            "z": 27,
            "yaw": -1.5707963267948966
          }
        },
        {
          "enemy": "knight",
          "arena": true,
          "spawn": {
            "x": 101,
            "y": 8,
            "z": 31,
            "yaw": -1.5707963267948966
          }
        }
      ]
    },
    {
      "id": "bell-keeper",
      "trigger": [
        129,
        158,
        16,
        44
      ],
      "gate": {
        "x": 158,
        "y": 8,
        "z": 30,
        "width": 6,
        "along": "z"
      },
      "enemies": [
        {
          "enemy": "bellWarden",
          "arena": true,
          "spawn": {
            "x": 145,
            "y": 8,
            "z": 30,
            "yaw": -1.5707963267948966
          }
        }
      ]
    }
  ],
  "dispersed": [],
  "bonfires": [
    {
      "id": "v2-cliff",
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
      "id": "v2-turn",
      "x": 59,
      "y": 4,
      "z": 28,
      "spawn": {
        "x": 60.5,
        "y": 4,
        "z": 29.5,
        "yaw": 1.5707963267948966
      }
    },
    {
      "id": "v2-bell",
      "x": 113,
      "y": 8,
      "z": 33,
      "spawn": {
        "x": 114.5,
        "y": 8,
        "z": 34.5,
        "yaw": 1.5707963267948966
      }
    }
  ],
  "sealed": [
    {
      "id": "bell-fog",
      "gate": {
        "x": 128,
        "y": 8,
        "z": 30,
        "width": 6,
        "along": "z"
      },
      "fog": "bell-keeper"
    }
  ],
  "props": [],
  "completeHint": "The bell has rung. The crown must answer.",
  "devJumps": [
    {
      "name": "Story V2 4: v2-cliff",
      "at": "v2-cliff",
      "won": []
    },
    {
      "name": "Story V2 4: v2-turn",
      "at": "v2-turn",
      "won": [
        "stair-guard"
      ]
    },
    {
      "name": "Story V2 4: v2-bell",
      "at": "v2-bell",
      "won": [
        "stair-guard",
        "high-bow",
        "terrace-pair"
      ]
    }
  ]
};
