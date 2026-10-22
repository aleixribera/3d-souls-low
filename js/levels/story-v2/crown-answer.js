'use strict';
// Independent Story V2 geometry and encounters. Existing level data is never modified.
const STORY_V2_5 = {
  "id": "v2-crown-answer",
  "layout": "rooms",
  "alert": true,
  "cull": true,
  "wakeZones": true,
  "steer": true,
  "clearGates": true,
  "name": "Story V2 · 5: The Crown's Answer",
  "description": "Aldric answers outside his gates. Follow him through the ash garden to the throne, and put the Ember out.",
  "help": "Leave stamina for an escape after every punish. Rest after the field fight and before the throne.",
  "ending": true,
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
    "background": 1315354,
    "fog": 2235944,
    "fogDensity": 0.011,
    "moon": {
      "color": 10135760,
      "intensity": 2.4,
      "position": [
        -16,
        40,
        -12
      ]
    },
    "ambient": {
      "color": 4209234,
      "intensity": 1.3
    },
    "hemi": {
      "sky": 6972552,
      "ground": 2365974,
      "intensity": 0.7
    },
    "exposure": 1.08,
    "ash": 1.2,
    "embers": 0.35,
    "dust": 0.2,
    "rim": 11581664,
    "grade": {
      "shadowTint": [
        0.9,
        0.92,
        1.12
      ],
      "highlightTint": [
        1.08,
        0.98,
        0.88
      ],
      "saturation": 0.62
    },
    "surface": {
      "moss": 0.4,
      "grime": 1.3
    },
    "banners": [
      3029578,
      5917218
    ],
    "debris": 0.3,
    "shafts": {
      "rooms": true,
      "color": 14207152,
      "opacity": 0.16
    },
    "sky": {
      "zenith": 1183516,
      "sun": 11554864,
      "sunDir": [
        1,
        0.05,
        -0.2
      ]
    },
    "silhouettes": 3,
    "grass": 0.6,
    "landmark": {
      "x": 640,
      "z": 0,
      "y": -10,
      "height": 340,
      "width": 380
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
      "id": "answer-refuge",
      "rect": [
        0,
        14,
        -6,
        6
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738
    },
    {
      "id": "answer-field",
      "rect": [
        14,
        46,
        -14,
        14
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "grass": true,
      "lamps": [
        [
          18,
          -11
        ],
        [
          41,
          11
        ]
      ]
    },
    {
      "id": "castle-neck",
      "rect": [
        46,
        52,
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
      "id": "castle-refuge",
      "rect": [
        52,
        68,
        -8,
        8
      ],
      "height": 7,
      "open": false,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738
    },
    {
      "id": "ash-garden",
      "rect": [
        68,
        92,
        -12,
        10
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "grass": true,
      "pillars": [
        [
          76,
          -8
        ],
        [
          87,
          7
        ]
      ]
    },
    {
      "id": "garden-turn",
      "rect": [
        86,
        92,
        10,
        22
      ],
      "height": 7,
      "open": true,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738
    },
    {
      "id": "procession",
      "rect": [
        86,
        110,
        22,
        38
      ],
      "height": 10,
      "open": false,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738
    },
    {
      "id": "throne-refuge",
      "rect": [
        110,
        126,
        24,
        40
      ],
      "height": 7,
      "open": false,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738
    },
    {
      "id": "throne-door",
      "rect": [
        126,
        132,
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
      "id": "throne",
      "rect": [
        132,
        172,
        12,
        50
      ],
      "height": 16,
      "open": false,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738,
      "lamps": [
        [
          137,
          15
        ],
        [
          168,
          47
        ]
      ]
    },
    {
      "id": "throne-apse",
      "rect": [
        172,
        178,
        28,
        34
      ],
      "height": 10,
      "open": false,
      "floor": 4538682,
      "wall": 6380368,
      "light": 16761738
    }
  ],
  "ramps": [],
  "gated": [
    {
      "id": "answer-field",
      "trigger": [
        15,
        46,
        -14,
        14
      ],
      "gate": {
        "x": 46,
        "y": 0,
        "z": 0,
        "width": 6,
        "along": "z"
      },
      "enemies": [
        {
          "enemy": "varn",
          "arena": true,
          "spawn": {
            "x": 33,
            "y": 0,
            "z": 0,
            "yaw": -1.5707963267948966
          },
          "boss": {
            "phases": [
              "field"
            ],
            "retreat": {
              "kneel": 1.6,
              "to": [
                49,
                8,
                -8
              ],
              "hop": 1.2,
              "wait": 1.4,
              "out": [
                58,
                0,
                -5
              ],
              "fly": 1,
              "height": 6
            }
          }
        }
      ]
    },
    {
      "id": "garden-pair",
      "trigger": [
        69,
        92,
        -12,
        10
      ],
      "gate": {
        "x": 89,
        "z": 10,
        "width": 6,
        "along": "x",
        "y": 0
      },
      "enemies": [
        {
          "enemy": "warden",
          "arena": true,
          "spawn": {
            "x": 79,
            "y": 0,
            "z": 0,
            "yaw": -1.5707963267948966
          }
        },
        {
          "enemy": "hollow",
          "arena": true,
          "spawn": {
            "x": 85,
            "y": 0,
            "z": 4,
            "yaw": -1.5707963267948966
          }
        }
      ]
    },
    {
      "id": "last-sentinel",
      "trigger": [
        87,
        110,
        22,
        38
      ],
      "gate": {
        "x": 110,
        "y": 0,
        "z": 31,
        "width": 14,
        "along": "z"
      },
      "enemies": [
        {
          "enemy": "sentinel",
          "arena": true,
          "spawn": {
            "x": 101,
            "y": 0,
            "z": 30,
            "yaw": -1.5707963267948966
          }
        }
      ]
    },
    {
      "id": "crown",
      "trigger": [
        133,
        172,
        12,
        50
      ],
      "gate": {
        "x": 172,
        "y": 0,
        "z": 31,
        "width": 6,
        "along": "z"
      },
      "enemies": [
        {
          "enemy": "varn",
          "arena": true,
          "spawn": {
            "x": 157,
            "y": 0,
            "z": 31,
            "yaw": -1.5707963267948966
          },
          "boss": {
            "phases": [
              "throne",
              "knell"
            ]
          }
        }
      ]
    }
  ],
  "dispersed": [],
  "bonfires": [
    {
      "id": "v2-answer",
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
      "id": "v2-castle",
      "x": 56,
      "y": 0,
      "z": -5,
      "spawn": {
        "x": 57.5,
        "y": 0,
        "z": -3.5,
        "yaw": 1.5707963267948966
      }
    },
    {
      "id": "v2-throne",
      "x": 116,
      "y": 0,
      "z": 26,
      "spawn": {
        "x": 117.5,
        "y": 0,
        "z": 27.5,
        "yaw": 1.5707963267948966
      }
    }
  ],
  "sealed": [
    {
      "id": "throne-fog",
      "gate": {
        "x": 132,
        "y": 0,
        "z": 31,
        "width": 6,
        "along": "z"
      },
      "fog": "crown"
    }
  ],
  "props": [
    {
      "kind": "heap",
      "x": 72,
      "z": 7
    },
    {
      "kind": "crates",
      "x": 65,
      "z": -5
    }
  ],
  "finaleRoom": {
    "y": 0,
    "throne": [
      168,
      31
    ],
    "windows": [
      [
        142,
        49.8
      ],
      [
        154,
        49.8
      ],
      [
        142,
        12.2
      ],
      [
        154,
        12.2
      ]
    ],
    "pillars": [
      [
        145,
        46,
        1
      ],
      [
        145,
        16,
        -1
      ]
    ],
    "fires": [
      [
        166,
        23
      ],
      [
        166,
        39
      ]
    ],
    "glow": [
      158,
      31
    ]
  },
  "devJumps": [
    {
      "name": "Story V2 5: v2-answer",
      "at": "v2-answer",
      "won": []
    },
    {
      "name": "Story V2 5: v2-castle",
      "at": "v2-castle",
      "won": [
        "answer-field"
      ]
    },
    {
      "name": "Story V2 5: v2-throne",
      "at": "v2-throne",
      "won": [
        "answer-field",
        "garden-pair",
        "last-sentinel"
      ]
    }
  ]
};
