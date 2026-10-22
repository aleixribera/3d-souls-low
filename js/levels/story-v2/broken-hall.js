'use strict';
// Independent Story V2 geometry and encounters. Existing level data is never modified.
const STORY_V2_1 = {
  "id": "v2-broken-hall",
  "layout": "rooms",
  "alert": true,
  "cull": true,
  "wakeZones": true,
  "steer": true,
  "clearGates": true,
  "name": "Story V2 · 1: The Broken Hall",
  "description": "An open cell, a broken court, and the keeper of the lower stair. Read the blade before answering it.",
  "help": "Read one wind-up at a time. Parry red cues, dodge blue cues; heavies break the knight for an execution.",
  "next": "v2-cistern-walk",
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
    "background": 658706,
    "fog": 1448997,
    "fogDensity": 0.027,
    "moon": {
      "color": 9413320,
      "intensity": 1.9,
      "position": [
        -6,
        14,
        8
      ]
    },
    "ambient": {
      "color": 4477034,
      "intensity": 1.45
    },
    "hemi": {
      "sky": 5925510,
      "ground": 2760728,
      "intensity": 0.75
    },
    "exposure": 1.12,
    "ash": 0.45,
    "dust": 0.35,
    "rim": 9413572,
    "grade": {
      "shadowTint": [
        0.82,
        0.93,
        1.16
      ],
      "highlightTint": [
        1.05,
        1,
        0.92
      ],
      "saturation": 0.66
    },
    "surface": {
      "moss": 0.3,
      "grime": 1.15
    },
    "shafts": {
      "rooms": true,
      "color": 11057360,
      "opacity": 0.18
    },
    "banners": [
      4856858,
      2894387
    ],
    "debris": 0.25
  },
  "start": {
    "x": 4,
    "y": 0,
    "z": 0,
    "yaw": 1.5707963267948966
  },
  "rooms": [
    {
      "id": "open-cell",
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
      "id": "broken-court",
      "rect": [
        14,
        34,
        -9,
        8
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "pillars": [
        [
          19,
          -6
        ],
        [
          30,
          5
        ]
      ]
    },
    {
      "id": "arch",
      "rect": [
        34,
        42,
        -3,
        3
      ],
      "height": 7,
      "open": false,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738
    },
    {
      "id": "judgment-gallery",
      "rect": [
        42,
        62,
        -7,
        10
      ],
      "height": 9,
      "open": false,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738
    },
    {
      "id": "side-passage",
      "rect": [
        62,
        70,
        4,
        10
      ],
      "height": 7,
      "open": false,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738
    },
    {
      "id": "stair-refuge",
      "rect": [
        70,
        86,
        0,
        14
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "lamps": [
        [
          82,
          12
        ]
      ]
    },
    {
      "id": "lower-door",
      "rect": [
        86,
        92,
        4,
        10
      ],
      "height": 7,
      "open": false,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738
    },
    {
      "id": "bone-court",
      "rect": [
        92,
        122,
        -6,
        20
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "pillars": [
        [
          97,
          -3
        ],
        [
          118,
          17
        ]
      ]
    },
    {
      "id": "lower-stair",
      "rect": [
        122,
        128,
        4,
        10
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
      "id": "first-blade",
      "trigger": [
        16,
        24,
        -9,
        8
      ],
      "gate": {
        "x": 24,
        "y": 0,
        "z": -0.5,
        "width": 17,
        "along": "z"
      },
      "enemies": [
        {
          "enemy": "hollow",
          "arena": true,
          "spawn": {
            "x": 21,
            "y": 0,
            "z": 0,
            "yaw": -1.5707963267948966
          }
        }
      ]
    },
    {
      "id": "patient-blade",
      "trigger": [
        25,
        34,
        -9,
        8
      ],
      "gate": {
        "x": 34,
        "y": 0,
        "z": 0,
        "width": 6,
        "along": "z"
      },
      "enemies": [
        {
          "enemy": "knight",
          "arena": true,
          "spawn": {
            "x": 30,
            "y": 0,
            "z": 0,
            "yaw": -1.5707963267948966
          }
        }
      ]
    },
    {
      "id": "split-pair",
      "trigger": [
        43,
        62,
        -7,
        10
      ],
      "gate": {
        "x": 62,
        "y": 0,
        "z": 7,
        "width": 6,
        "along": "z"
      },
      "enemies": [
        {
          "enemy": "hollow",
          "arena": true,
          "spawn": {
            "x": 51,
            "y": 0,
            "z": 1,
            "yaw": -1.5707963267948966
          }
        },
        {
          "enemy": "rogue",
          "arena": true,
          "spawn": {
            "x": 57,
            "y": 0,
            "z": 6,
            "yaw": -1.5707963267948966
          }
        }
      ]
    },
    {
      "id": "bone-keeper",
      "trigger": [
        93,
        122,
        -6,
        20
      ],
      "gate": {
        "x": 122,
        "y": 0,
        "z": 7,
        "width": 6,
        "along": "z"
      },
      "enemies": [
        {
          "enemy": "giant",
          "arena": true,
          "spawn": {
            "x": 111,
            "y": 0,
            "z": 7,
            "yaw": -1.5707963267948966
          }
        }
      ]
    }
  ],
  "dispersed": [],
  "bonfires": [
    {
      "id": "v2-cell",
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
      "id": "v2-gallery",
      "x": 38,
      "y": 0,
      "z": -1,
      "spawn": {
        "x": 39.5,
        "y": 0,
        "z": 0.5,
        "yaw": 1.5707963267948966
      }
    },
    {
      "id": "v2-bones",
      "x": 77,
      "y": 0,
      "z": 2,
      "spawn": {
        "x": 78.5,
        "y": 0,
        "z": 3.5,
        "yaw": 1.5707963267948966
      }
    }
  ],
  "sealed": [
    {
      "id": "bone-fog",
      "gate": {
        "x": 92,
        "y": 0,
        "z": 7,
        "width": 6,
        "along": "z"
      },
      "fog": "bone-keeper"
    }
  ],
  "props": [
    {
      "kind": "crates",
      "x": 46,
      "z": -4
    },
    {
      "kind": "heap",
      "x": 59,
      "z": -4
    }
  ],
  "devJumps": [
    {
      "name": "Story V2 1: v2-cell",
      "at": "v2-cell",
      "won": []
    },
    {
      "name": "Story V2 1: v2-gallery",
      "at": "v2-gallery",
      "won": [
        "first-blade",
        "patient-blade"
      ]
    },
    {
      "name": "Story V2 1: v2-bones",
      "at": "v2-bones",
      "won": [
        "first-blade",
        "patient-blade",
        "split-pair"
      ]
    }
  ]
};
