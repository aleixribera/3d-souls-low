'use strict';
// LORE.md: Story V2, the shorter road through Ashmere.
LORE.levels['v2-broken-hall'] = {
  "npcs": [
    {
      "x": 8,
      "y": 0,
      "z": -3,
      "yaw": 1.5707963267948966,
      "pose": "stand",
      "bonfire": "v2-cell",
      "lines": [
        "Your door is open. Mine was, too. Someone has remembered mercy.",
        "Below this court lies the old keep. Beyond it, Corvel. If the river road still stands, I shall meet you there."
      ],
      "idle": "The road is still before you."
    }
  ],
  "inscriptions": [],
  "scenes": []
};
BONFIRE_GUIDANCE['v2-broken-hall'] = [
  {
    "id": "v2-route-1",
    "from": "v2-cell",
    "to": "v2-gallery",
    "paths": [
      [
        [
          3,
          0,
          -3
        ],
        [
          10,
          0,
          0
        ],
        [
          30,
          0,
          0
        ],
        [
          38,
          0,
          -1
        ]
      ]
    ]
  },
  {
    "id": "v2-route-2",
    "from": "v2-gallery",
    "to": "v2-bones",
    "paths": [
      [
        [
          38,
          0,
          -1
        ],
        [
          45,
          0,
          0
        ],
        [
          55,
          0,
          7
        ],
        [
          65,
          0,
          7
        ],
        [
          77,
          0,
          7
        ],
        [
          77,
          0,
          2
        ]
      ]
    ]
  }
];
LORE.levels['v2-cistern-walk'] = {
  "npcs": [
    {
      "x": 8,
      "y": 0,
      "z": -3,
      "yaw": 1.5707963267948966,
      "pose": "stand",
      "bonfire": "v2-water",
      "lines": [
        "The water carried our bells once. Now it carries the ash.",
        "The wardens have forgotten whom they guard. Do not let them hem you in."
      ],
      "idle": "The road is still before you."
    }
  ],
  "inscriptions": [],
  "scenes": []
};
BONFIRE_GUIDANCE['v2-cistern-walk'] = [
  {
    "id": "v2-route-1",
    "from": "v2-water",
    "to": "v2-sluice",
    "paths": [
      [
        [
          3,
          0,
          -3
        ],
        [
          12,
          0,
          0
        ],
        [
          29,
          0,
          0
        ],
        [
          29,
          0,
          32
        ]
      ]
    ]
  },
  {
    "id": "v2-route-2",
    "from": "v2-sluice",
    "to": "v2-river",
    "paths": [
      [
        [
          29,
          0,
          32
        ],
        [
          40,
          0,
          32
        ],
        [
          58,
          0,
          32
        ],
        [
          63,
          0,
          27
        ],
        [
          69,
          0,
          25
        ]
      ]
    ]
  }
];
LORE.levels['v2-corvel-street'] = {
  "npcs": [
    {
      "x": 8,
      "y": 0,
      "z": -3,
      "yaw": 1.5707963267948966,
      "pose": "stand",
      "bonfire": "v2-market",
      "lines": [
        "These are the king's soldiers. We called them invaders because we could not bear the other name.",
        "Above the town stands the Bell of Waking. Ring it, and the king must answer."
      ],
      "idle": "The road is still before you."
    }
  ],
  "inscriptions": [],
  "scenes": []
};
BONFIRE_GUIDANCE['v2-corvel-street'] = [
  {
    "id": "v2-route-1",
    "from": "v2-market",
    "to": "v2-well",
    "paths": [
      [
        [
          3,
          0,
          -3
        ],
        [
          12,
          0,
          0
        ],
        [
          23,
          0,
          7
        ],
        [
          35,
          0,
          7
        ],
        [
          41,
          0,
          7
        ],
        [
          41,
          0,
          31
        ],
        [
          40,
          0,
          35
        ]
      ]
    ]
  },
  {
    "id": "v2-route-2",
    "from": "v2-well",
    "to": "v2-command",
    "paths": [
      [
        [
          40,
          0,
          35
        ],
        [
          55,
          0,
          33
        ],
        [
          75,
          0,
          33
        ],
        [
          88,
          0,
          33
        ],
        [
          88,
          0,
          24
        ]
      ]
    ]
  }
];
LORE.levels['v2-bell-ascent'] = {
  "npcs": [
    {
      "x": 8,
      "y": 0,
      "z": -3,
      "yaw": 1.5707963267948966,
      "pose": "stand",
      "bonfire": "v2-cliff",
      "lines": [
        "The Seven cast that bell from their own crowns. No king was meant to keep the realm for himself.",
        "Who rings it calls the crown to answer. Let the crown come out."
      ],
      "idle": "The road is still before you."
    }
  ],
  "inscriptions": [
    {
      "id": "v2-bell-law",
      "x": 160,
      "y": 8,
      "z": 30,
      "yaw": 0,
      "mount": "none",
      "label": "The Bell of Waking",
      "lines": [
        "Who rings me calls the crown to answer. Let the crown come out."
      ]
    }
  ],
  "scenes": [
    {
      "kind": "bell",
      "x": 160,
      "y": 8,
      "z": 30
    }
  ]
};
BONFIRE_GUIDANCE['v2-bell-ascent'] = [
  {
    "id": "v2-route-1",
    "from": "v2-cliff",
    "to": "v2-turn",
    "paths": [
      [
        [
          3,
          0,
          -3
        ],
        [
          12,
          0,
          0
        ],
        [
          32,
          0,
          0
        ],
        [
          44,
          4,
          0
        ],
        [
          59,
          4,
          0
        ],
        [
          59,
          4,
          28
        ]
      ]
    ]
  },
  {
    "id": "v2-route-2",
    "from": "v2-turn",
    "to": "v2-bell",
    "paths": [
      [
        [
          59,
          4,
          28
        ],
        [
          74,
          4,
          28
        ],
        [
          86,
          8,
          28
        ],
        [
          104,
          8,
          28
        ],
        [
          113,
          8,
          28
        ],
        [
          113,
          8,
          33
        ]
      ]
    ]
  }
];
LORE.levels['v2-crown-answer'] = {
  "npcs": [
    {
      "x": 61,
      "y": 0,
      "z": -5,
      "yaw": 1.5707963267948966,
      "pose": "stand",
      "bonfire": "v2-castle",
      "after": "answer-field",
      "lines": [
        "He came out. The old law has not forgotten him.",
        "Follow him. Beneath that crown is the fire that ate our people. Let it hunger no more."
      ],
      "idle": "The road is still before you."
    }
  ],
  "inscriptions": [],
  "scenes": []
};
BONFIRE_GUIDANCE['v2-crown-answer'] = [
  {
    "id": "v2-route-1",
    "from": "v2-answer",
    "to": "v2-castle",
    "paths": [
      [
        [
          3,
          0,
          -3
        ],
        [
          12,
          0,
          0
        ],
        [
          49,
          0,
          0
        ],
        [
          56,
          0,
          0
        ],
        [
          56,
          0,
          -5
        ]
      ]
    ]
  },
  {
    "id": "v2-route-2",
    "from": "v2-castle",
    "to": "v2-throne",
    "paths": [
      [
        [
          56,
          0,
          -5
        ],
        [
          64,
          0,
          0
        ],
        [
          82,
          0,
          0
        ],
        [
          89,
          0,
          6
        ],
        [
          89,
          0,
          30
        ],
        [
          103,
          0,
          30
        ],
        [
          116,
          0,
          30
        ],
        [
          116,
          0,
          26
        ]
      ]
    ]
  }
];
