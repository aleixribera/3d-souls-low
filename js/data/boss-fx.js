'use strict';
// ============================================================================
// Boss effects (the Ultra preset, js/ultra-boss.js): what each boss's power looks like, attack by attack
// ============================================================================
// Drawing only. An ELEMENT is a look: colours, the sparks it throws, what its blows do to the ground (`impact`, one of
// BOSS_FX_IMPACTS), whether its blade smokes or burns. Each boss has an element, optionally one per phase, and any
// attack may name its own element and impact; `windup: 'gather'` draws power into the weapon through a heavy wind-up
// (every heavy, held, leaping or ringing hit gathers anyway), `aura` overrides the colour of the motes round the body.
// Checked at load (js/validate.js): every boss, phase and attack named here must exist.
const BOSS_FX_IMPACTS = ['quake', 'pillar', 'blaze', 'geyser', 'bloom', 'void', 'gale', 'roar', 'toll', 'shatter'];
const FX_ELEMENTS = {
  // core: the hot centre of its light; glow: its colour; mote: the dust it sheds; trail: its swing ribbon; sparks: a spark
  // palette (VISUALS.ultra.sparks.colors); impact: default ground effect; smoke: a dark colour its blade trails, if any.
  steel: { core: 0xfff2dc, glow: 0xffb070, mote: 0xffd8a8, trail: 0xffc89a, sparks: 'clash', impact: 'quake' },
  holy:  { core: 0xfffbe8, glow: 0xffc860, mote: 0xffe4a0, trail: 0xffe2a0, sparks: 'holy', impact: 'pillar' },
  fire:  { core: 0xfff0b0, glow: 0xff6a18, mote: 0xff8a30, trail: 0xff9038, sparks: 'ember', impact: 'blaze' },
  blood: { core: 0xff9070, glow: 0xd01408, mote: 0xff3418, trail: 0xff3a22, sparks: 'blood', impact: 'geyser' },
  rot:   { core: 0xffc0a0, glow: 0xff3a2a, mote: 0xff6048, trail: 0xff5a44, sparks: 'rot', impact: 'bloom' },
  black: { core: 0xff5a40, glow: 0x9a0606, mote: 0xff2414, trail: 0xff3428, sparks: 'blood', impact: 'void', smoke: 0x120606 },
  storm: { core: 0xf0f6ff, glow: 0x9ec0ff, mote: 0xd2e0ff, trail: 0xd8e6ff, sparks: 'storm', impact: 'gale' },
  earth: { core: 0xffe2b0, glow: 0xd09048, mote: 0xe0c090, trail: 0xffc880, sparks: 'clash', impact: 'quake' },
  bone:  { core: 0xf0ead8, glow: 0xb8b0a0, mote: 0xd8d0c0, trail: 0xe8e0cc, sparks: 'clash', impact: 'quake', smoke: 0x3a3630 },
  toll:  { core: 0xe8f4ff, glow: 0x7aa8d8, mote: 0xb8d4f0, trail: 0xc8dcf0, sparks: 'storm', impact: 'toll' },
};
const BOSS_FX = {
  // Margit: grey cane work (steel) until his golden weapons of light; his plunge already calls the light down.
  margit: { element: 'steel', aura: 0xffd27a, phases: { golden: 'holy' }, attacks: {
    caneOverhead: { impact: 'shatter', windup: 'gather' }, canePlunge: { element: 'holy', impact: 'pillar' },
    daggerToss: { element: 'holy' }, daggerDouble: { element: 'holy' }, daggerPunish: { element: 'holy' }, daggerRetreat: { element: 'holy' },
    daggerSlash: { element: 'holy' }, crossSlash: { element: 'holy', windup: 'gather' },
    hammerOpener: { element: 'holy', impact: 'pillar' }, hammerLeap: { element: 'holy', impact: 'pillar' }, hammerStomp: { element: 'holy', impact: 'pillar' },
    spinSweep: { element: 'holy' }, swordFlurry: { element: 'holy' }, swordCombo: { element: 'holy', impact: 'pillar' } } },
  // Godrick: storm winds round his axe; once the dragon arm wakes, everything burns.
  godrick: { element: 'storm', aura: 0xffb070, phases: { dragon: 'fire' }, attacks: {
    kneel: { impact: 'gale' }, stormLeap: { impact: 'gale' }, jumpSlam: { element: 'earth', impact: 'quake' }, rampage: { element: 'steel' },
    doubleStep: { element: 'steel' }, backhand: { element: 'steel' }, dragSlash: { element: 'steel' },
    armChop: { element: 'blood', impact: 'geyser' }, flameSweep: { element: 'fire' }, dragonGrab: { element: 'fire', windup: 'gather' },
    flameLeap: { element: 'fire', impact: 'blaze' }, flameKneel: { element: 'fire', impact: 'blaze' } } },
  // The Crucible Knight: amber bronze and the old gold of the Crucible's aspects.
  crucibleKnight: { element: 'earth', aura: 0xffd090, phases: { aspect: 'earth' }, attacks: {
    stomp: { impact: 'quake' }, stomp2: { impact: 'quake' }, overheadSlam: { impact: 'shatter', windup: 'gather' }, overheadSlam2: { impact: 'shatter', windup: 'gather' },
    wingsDive: { element: 'holy', impact: 'pillar' }, tailSwipe: { element: 'holy' }, tailDouble: { element: 'holy', windup: 'gather' } } },
  // Morgott: the omen king's golden conjurations, then the cursed blood boils out of him.
  morgott: { element: 'holy', aura: 0xffc060, phases: { cursed: 'holy' }, attacks: {
    chopThrust: { element: 'steel', impact: 'shatter' }, sweepSlash: { element: 'steel' }, tailSwipe: { element: 'steel' }, leapPunish: { element: 'steel', impact: 'quake' },
    defilement: { element: 'blood', impact: 'geyser', aura: 0xff2a14 }, bloodSlice: { element: 'blood', impact: 'geyser' },
    bloodyThrust: { element: 'blood', windup: 'gather' }, geysers: { element: 'blood', impact: 'geyser' } } },
  // Godfrey: the earth itself answers the first Elden Lord; Hoarah Loux roars it apart.
  godfrey: { element: 'earth', aura: 0xffc070, attacks: {
    regalRoar: { impact: 'roar' }, louxRage: { impact: 'roar' }, earthshaker: { impact: 'roar' }, axeDive: { impact: 'shatter' },
    fissure: { impact: 'shatter' }, powerBomb: { impact: 'shatter', windup: 'gather' }, seroshShed: { impact: 'roar' } } },
  // Maliketh: a grey beast-priest's stone and claws, then the Black Blade's crimson Destined Death.
  maliketh: { element: 'bone', aura: 0xc8b8a0, phases: { blackBlade: 'black' }, attacks: {
    shedRobes: { element: 'black', impact: 'void' }, beastClaw: { impact: 'gale' }, gurranqClaw: { impact: 'gale', windup: 'gather' } } },
  // Radagon: the Golden Order's light in every blow.
  radagon: { element: 'holy', aura: 0xffe0a0, attacks: {
    goldBreaker: { impact: 'pillar', windup: 'gather' }, eldenShattering: { impact: 'pillar', windup: 'gather' }, runeSlam: { impact: 'pillar' },
    runeBurst: { impact: 'pillar' }, spearThrust: { impact: 'pillar' }, hammerCombo: { impact: 'shatter' }, stompChop: { impact: 'shatter' } } },
  // Malenia: a clean steel blade until the scarlet rot blooms; the Waterfowl and Aeonia are rot whatever the phase.
  malenia: { element: 'steel', aura: 0xff5040, phases: { rot: 'rot' }, attacks: {
    dance: { element: 'rot', impact: 'bloom' }, dance2: { element: 'rot', impact: 'bloom' }, slamRot: { element: 'rot', impact: 'bloom' },
    aeoniaOpen: { element: 'rot', impact: 'bloom', windup: 'gather' }, aeonia: { element: 'rot', impact: 'bloom', windup: 'gather' }, phantoms: { element: 'rot' } } },
  // The story's bosses.
  giant: { element: 'bone', aura: 0xd8d0c0, attacks: { stomp: { impact: 'shatter', windup: 'gather' } } },
  pillagerCaptain: { element: 'steel', aura: 0xff9a50, attacks: { captainOverhead: { element: 'fire', impact: 'blaze', windup: 'gather' } } },
  bellWarden: { element: 'toll', aura: 0xb8d4f0, attacks: { bellSlam: { impact: 'toll', windup: 'gather' } } },
  varn: { element: 'steel', aura: 0xff8040, phases: { throne: 'fire', knell: 'fire' }, attacks: {
    varnStomp: { impact: 'shatter' }, varnLeap: { impact: 'shatter' }, knellSweep: { element: 'fire' }, knellLeap: { impact: 'blaze' },
    knellStomp: { impact: 'blaze' }, tollingChain: { element: 'toll' }, lastToll: { element: 'toll', impact: 'toll', windup: 'gather' },
    ashWave: { element: 'fire' }, burningAscent: { element: 'fire', impact: 'blaze', windup: 'gather' } } },
};
