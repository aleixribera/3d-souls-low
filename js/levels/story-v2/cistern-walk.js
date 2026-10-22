'use strict';
// Independent Story V2 geometry and encounters. Existing level data is never modified.
const STORY_V2_2 = {
  "id": "v2-cistern-walk",
  "layout": "rooms",
  "alert": true,
  "cull": true,
  "wakeZones": true,
  "steer": true,
  "clearGates": true,
  "name": "Story V2 · 2: The Cistern Walk",
  "description": "Below the hall, the old keep holds its prisoners beside the water. Draw the wardens apart and open the river door.",
  "help": "Keep both enemies in view. Draw the quick fighter away from the shield, then circle the slower defender.",
  "next": "v2-corvel-street",
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
    "background": 395784,
    "fog": 1581597,
    "fogDensity": 0.026,
    "moon": {
      "color": 10336936,
      "intensity": 1.35,
      "position": [
        8,
        14,
        -6
      ]
    },
    "ambient": {
      "color": 4215370,
      "intensity": 1.55
    },
    "hemi": {
      "sky": 7309944,
      "ground": 1317394,
      "intensity": 0.45
    },
    "exposure": 1.12,
    "ash": 0.25,
    "dust": 0.6,
    "rim": 10273966,
    "grade": {
      "shadowTint": [
        0.9,
        1.03,
        0.98
      ],
      "highlightTint": [
        1.06,
        1.02,
        0.9
      ],
      "saturation": 0.7
    },
    "surface": {
      "moss": 0.95,
      "grime": 1.25
    },
    "shafts": {
      "rooms": true,
      "color": 13952716,
      "opacity": 0.2
    },
    "banners": [
      2898474,
      3810336
    ],
    "debris": 0.35
  },
  "start": {
    "x": 4,
    "y": 0,
    "z": 0,
    "yaw": 1.5707963267948966
  },
  "rooms": [
    {
      "id": "water-entry",
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
      "id": "west-bank",
      "rect": [
        14,
        32,
        -8,
        8
      ],
      "height": 9,
      "open": false,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "pillars": [
        [
          19,
          -5
        ]
      ]
    },
    {
      "id": "sluice-turn",
      "rect": [
        26,
        32,
        8,
        26
      ],
      "height": 7,
      "open": false,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738
    },
    {
      "id": "north-refuge",
      "rect": [
        26,
        42,
        26,
        38
      ],
      "height": 7,
      "open": false,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738
    },
    {
      "id": "cistern-bank",
      "rect": [
        42,
        66,
        22,
        40
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "edges": {
        "s": "rail"
      },
      "pillars": [
        [
          49,
          36
        ]
      ]
    },
    {
      "id": "river-neck",
      "rect": [
        66,
        74,
        24,
        30
      ],
      "height": 7,
      "open": false,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738
    },
    {
      "id": "river-court",
      "rect": [
        74,
        96,
        16,
        34
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "pillars": [
        [
          79,
          19
        ],
        [
          91,
          31
        ]
      ]
    },
    {
      "id": "river-exit",
      "rect": [
        96,
        102,
        22,
        28
      ],
      "height": 7,
      "open": false,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738
    }
  ],
  "ramps": [],
  "gated": [
    {
      "id": "shield-pair",
      "trigger": [
        15,
        32,
        -8,
        8
      ],
      "gate": {
        "x": 29,
        "z": 8,
        "width": 6,
        "along": "x",
        "y": 0
      },
      "enemies": [
        {
          "enemy": "warden",
          "arena": true,
          "spawn": {
            "x": 24,
            "y": 0,
            "z": 1,
            "yaw": -1.5707963267948966
          }
        },
        {
          "enemy": "hollow",
          "arena": true,
          "spawn": {
            "x": 27,
            "y": 0,
            "z": -3,
            "yaw": -1.5707963267948966
          }
        }
      ]
    },
    {
      "id": "cistern-pair",
      "trigger": [
        43,
        66,
        22,
        40
      ],
      "gate": {
        "x": 66,
        "y": 0,
        "z": 27,
        "width": 6,
        "along": "z"
      },
      "enemies": [
        {
          "enemy": "lancer",
          "arena": true,
          "spawn": {
            "x": 56,
            "y": 0,
            "z": 28,
            "yaw": -1.5707963267948966
          }
        },
        {
          "enemy": "rogue",
          "arena": true,
          "spawn": {
            "x": 60,
            "y": 0,
            "z": 33,
            "yaw": -1.5707963267948966
          }
        }
      ]
    },
    {
      "id": "river-guard",
      "trigger": [
        75,
        96,
        16,
        34
      ],
      "gate": {
        "x": 96,
        "y": 0,
        "z": 25,
        "width": 6,
        "along": "z"
      },
      "enemies": [
        {
          "enemy": "executioner",
          "arena": true,
          "spawn": {
            "x": 87,
            "y": 0,
            "z": 25,
            "yaw": -1.5707963267948966
          }
        }
      ]
    }
  ],
  "dispersed": [],
  "bonfires": [
    {
      "id": "v2-water",
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
      "id": "v2-sluice",
      "x": 29,
      "y": 0,
      "z": 32,
      "spawn": {
        "x": 30.5,
        "y": 0,
        "z": 33.5,
        "yaw": 1.5707963267948966
      }
    },
    {
      "id": "v2-river",
      "x": 69,
      "y": 0,
      "z": 25,
      "spawn": {
        "x": 70.5,
        "y": 0,
        "z": 26.5,
        "yaw": 1.5707963267948966
      }
    }
  ],
  "sealed": [],
  "props": [
    {
      "kind": "crates",
      "x": 37,
      "z": 35
    },
    {
      "kind": "heap",
      "x": 63,
      "z": 37
    }
  ],
  "devJumps": [
    {
      "name": "Story V2 2: v2-water",
      "at": "v2-water",
      "won": []
    },
    {
      "name": "Story V2 2: v2-sluice",
      "at": "v2-sluice",
      "won": [
        "shield-pair"
      ]
    },
    {
      "name": "Story V2 2: v2-river",
      "at": "v2-river",
      "won": [
        "shield-pair",
        "cistern-pair"
      ]
    }
  ]
};
