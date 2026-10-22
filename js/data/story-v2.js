'use strict';
// A third campaign with its own save slot; original chapter arrays stay intact.
const STORY_V2 = {
  "id": "story-v2",
  "name": "Ashmere: Story V2",
  "short": "Story V2",
  "menuTitle": "ASHMERE · STORY V2",
  "menuSub": "THE SHORTER ROAD",
  "description": "A gentler first journey. Five compact levels, clear duels and deliberate enemy pairs.",
  "tutorial": {
    "level": "tutorial",
    "title": "THE TRAINING HALL",
    "line": "Before the road, learn the blade."
  },
  "chapters": [
    {
      "level": "v2-broken-hall",
      "title": "THE BROKEN HALL",
      "line": "An open cell, a broken court, and the keeper of the lower stair. Read the blade before answering it."
    },
    {
      "level": "v2-cistern-walk",
      "title": "THE CISTERN WALK",
      "line": "Below the hall, the old keep holds its prisoners beside the water. Draw the wardens apart and open the river door."
    },
    {
      "level": "v2-corvel-street",
      "title": "CORVEL'S LAST STREET",
      "line": "Corvel burns. Cross the crooked market and silence the invaders' commander at the river road."
    },
    {
      "level": "v2-bell-ascent",
      "title": "THE BELL ASCENT",
      "line": "Above the town, sheltered stairs climb to the Bell of Waking. Take the high ground and call the crown to answer."
    },
    {
      "level": "v2-crown-answer",
      "title": "THE CROWN'S ANSWER",
      "line": "Aldric answers outside his gates. Follow him through the ash garden to the throne, and put the Ember out."
    }
  ],
  "done": "The ash has stopped falling. The road is walked.",
  "credits": {
    "companion": "Ysolde of Corvel",
    "foes": [
      "The Pillager Captain",
      "The Bell Warden",
      "Aldric, the Gaoler King",
      "Aldric, the Ember-Crowned"
    ]
  },
  "progress": {
    "currency": 0,
    "equipment": {},
    "upgrades": {}
  }
};
STORIES.push(STORY_V2);
