'use strict';
// Team identity and the spectator arena. Bosses themselves always come from the existing registries.
const BOSS_TEAMS = [
  { id: 'a', name: 'Team 1', color: '#80c9ed', side: -1 },
  { id: 'b', name: 'Team 2', color: '#efab7b', side: 1 },
];
const BOSS_BATTLE_ARENA = { ...ARENA, id: 'boss-battle', name: 'Boss vs Boss', halfX: 22, halfZ: 16,
  bonfires: [], help: 'Watch the bosses fight. Pause to edit teams; restart to replay the match.' };
