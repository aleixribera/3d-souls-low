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
  giant: { element: 'bone', aura: 0xd8d0c0, attacks: { stomp: { impact: 'shatter', windup: 'gather' },
    giantBonebreaker: { impact: 'shatter' } } },
  pillagerCaptain: { element: 'steel', aura: 0xff9a50, attacks: { captainOverhead: { element: 'fire', impact: 'blaze', windup: 'gather' } } },
  bellWarden: { element: 'toll', aura: 0xb8d4f0, attacks: { bellSlam: { impact: 'toll', windup: 'gather' },
    bellHammerChain: { impact: 'toll' }, bellStompChop: { impact: 'toll' } } },
  varn: { element: 'steel', aura: 0xff8040, phases: { throne: 'fire', knell: 'fire' }, attacks: {
    varnStomp: { impact: 'shatter' }, varnLeap: { impact: 'shatter' }, knellSweep: { element: 'fire' }, knellLeap: { impact: 'blaze' },
    knellStomp: { impact: 'blaze' }, tollingChain: { element: 'toll' }, lastToll: { element: 'toll', impact: 'toll', windup: 'gather' },
    ashWave: { element: 'fire' }, burningAscent: { element: 'fire', impact: 'blaze', windup: 'gather' } } },
  // Old Ostrey (Level 7): iron on iron, and coals from his lantern; once he opens it (the second phase), fire.
  ostrey: { element: 'steel', aura: 0xffb050, phases: { kindled: 'fire' }, attacks: {
    gateDrop: { impact: 'shatter', windup: 'gather' }, threeKnocks: { impact: 'shatter' }, shoulderGate: { impact: 'shatter' },
    lanternCoals: { element: 'fire' }, coalPunish: { element: 'fire' }, lanternSwing: { element: 'fire' }, emberRain: { element: 'fire' },
    lanternBursts: { element: 'fire', impact: 'blaze', windup: 'gather' }, lanternBreath: { element: 'fire', windup: 'gather' },
    burningDrop: { element: 'fire', impact: 'blaze' }, kindledSweep: { element: 'fire' } } },
  // Hale and Harrow (Level 8): the sea wind round Hale's axe, iron and stone under Harrow's greaves; taking up her sister's
  // half is a grief, not a fire: storm for both once alone, and gold round the suit made whole.
  hale: { element: 'storm', aura: 0xc8d4dc, phases: { whole: 'storm' }, attacks: {
    crownCleave: { impact: 'shatter', windup: 'gather' }, beardsHook: { element: 'steel' }, helmsSalute: { element: 'steel' }, haftsHeel: { element: 'steel' },
    wallTurns: { impact: 'gale' }, offTheRampart: { impact: 'gale' },
    stampStones: { element: 'earth', impact: 'quake' }, fallingWeight: { element: 'earth', impact: 'quake' }, greaveSlide: { element: 'earth' }, backHeel: { element: 'earth' },
    sistersHalf: { impact: 'shatter', windup: 'gather' }, bothHalves: { impact: 'shatter', windup: 'gather' } } },
  harrow: { element: 'earth', aura: 0xc8d4dc, phases: { whole: 'storm' }, attacks: {
    stampStones: { impact: 'quake' }, hammerOfHands: { impact: 'quake', windup: 'gather' }, fallingWeight: { impact: 'quake' }, knuckleHeel: { element: 'steel' },
    crownCleave: { element: 'storm', impact: 'shatter', windup: 'gather' }, wallTurns: { element: 'storm', impact: 'gale' }, offTheRampart: { element: 'storm', impact: 'gale' },
    saltWind: { element: 'storm' }, sistersHalf: { impact: 'shatter', windup: 'gather' }, bothHalves: { impact: 'shatter', windup: 'gather' } } },
  // The Ringer of Thrale (Level 9): old iron while she is chained, her knells the pale toll of a bell; over the line,
  // all of it rings.
  ringer: { element: 'steel', aura: 0xb8c8ff, phases: { tolling: 'toll' }, attacks: {
    strikeHour: { impact: 'shatter', windup: 'gather' }, strikeHour2: { impact: 'toll', windup: 'gather' }, risingToll: { windup: 'gather' },
    fetterStamp: { element: 'earth', impact: 'quake' }, fetterStamp2: { element: 'earth', impact: 'quake' },
    callAcross: { element: 'toll', impact: 'toll', windup: 'gather' }, callPunish: { element: 'toll', impact: 'toll' },
    overTheLine: { element: 'toll', impact: 'toll', windup: 'gather' }, nineTailors: { element: 'toll', impact: 'toll' },
    peal: { impact: 'toll' }, outOfTheRing: { impact: 'shatter' } } },
  // The Regent Hollis (Level 10): gold leaf and the light off it; past the worst of his hurt the gilt cracks and the
  // hunger burns through it (his hanging cuts themselves are drawn by js/gilt-echo.js, on every preset).
  hollis: { element: 'holy', aura: 0xffc860, phases: { hungry: 'fire' }, attacks: {
    salute: { element: 'steel' }, measure: { element: 'steel' }, turnCloak: { element: 'steel' }, judgement: { impact: 'pillar', windup: 'gather' },
    giltCracks: { element: 'fire', impact: 'blaze', aura: 0xff6a20, windup: 'gather' }, ravenous: { element: 'fire' },
    callHome: { element: 'fire' }, feast: { element: 'fire', impact: 'blaze', windup: 'gather' } } },
  // Oswin, the First Crown (Level 11): the ash king's stomps and axe crack the floor, and the cracks stay open (drawn by
  // js/ember-seams.js on every preset); from 40 % the axe is cast down and the Ember takes his hands.
  oswin: { element: 'earth', aura: 0xff8a40, phases: { uncrowned: 'fire' }, attacks: {
    tread: { impact: 'quake' }, twinTread: { element: 'fire', impact: 'quake' }, headsman: { impact: 'shatter', windup: 'gather' },
    threefold: { impact: 'quake' }, kingsLeap: { impact: 'shatter' }, leapPunish: { impact: 'shatter' }, sceptre: { element: 'steel' }, turn: { element: 'steel' }, backhand: { element: 'fire' },
    longLive: { element: 'fire', impact: 'blaze', windup: 'gather' }, crownCastDown: { element: 'fire', impact: 'roar', windup: 'gather' },
    emberFists: { element: 'fire', impact: 'quake' }, groundBreaker: { element: 'fire', impact: 'quake', windup: 'gather' },
    firstHunger: { element: 'fire', impact: 'blaze', windup: 'gather' } } },
  // Mother Agathe, the Rending Hand (Level 12): the hook's steel, and the torn earth and stones, in the first half; then
  // the storm comes at her back: the hook seamed with lightning, and the storm falls where you stand
  // (js/data/bosses/agathe.js, loaded after this file; checked at validation).
  agathe: { element: 'steel', aura: 0xc8d4e8, phases: { storm: 'storm' }, attacks: {
    hookHaul: { impact: 'shatter' }, rendEarth: { element: 'earth', impact: 'quake', windup: 'gather' }, tornStones: { element: 'earth' },
    cornerstone: { element: 'earth', impact: 'quake', windup: 'gather' },
    stormComes: { element: 'storm', impact: 'gale', windup: 'gather' }, stormKnows: { element: 'storm', impact: 'gale', windup: 'gather' },
    stormFurrow: { element: 'storm', impact: 'gale', windup: 'gather' }, stormLeap: { element: 'storm', impact: 'gale' } } },
  // The Rending Brothers (Level 12): the hooked knife, and the floor rent open.
  rendingBrother: { element: 'steel', aura: 0xb8c4d8, attacks: { brotherRend: { element: 'earth', impact: 'gale' } } },
  // The Kindling Tree (Level 13): its wood and its earth; its mark and its rising burst in the Ember's fire, and once it
  // catches (the second phase) everything burns (js/data/bosses/kindling-tree.js, loaded after this file).
  kindlingTree: { element: 'earth', aura: 0xff9a50, phases: { kindled: 'fire' }, attacks: {
    fallingBough: { impact: 'shatter' }, kindlingMark: { element: 'fire', impact: 'blaze' }, thornVolley: { element: 'fire' },
    rootsRise: { impact: 'quake', windup: 'gather' }, intoTheRoots: { impact: 'quake' }, risingPunish: { impact: 'quake' }, deepRoots: { impact: 'quake' },
    uprooted: { element: 'fire', impact: 'blaze', windup: 'gather' }, greatKindling: { element: 'fire', impact: 'blaze', windup: 'gather' },
    rootCharge: { impact: 'quake' } } },
  // The Rootbound (Level 13): wood, and the mark that burns.
  rootbound: { element: 'earth', aura: 0xff9a50, attacks: { rootMark: { element: 'fire', impact: 'blaze', windup: 'gather' }, rootThorn: { element: 'fire' } } },
  // The King's Blade (Level 14): the champion's steel, until the Ember shows through it (the second phase)
  // (js/data/bosses/kings-blade.js, loaded after this file).
  kingsBlade: { element: 'steel', aura: 0xff8a40, phases: { emberWorn: 'fire' }, attacks: {
    crownsWeight: { impact: 'shatter', windup: 'gather' }, torchTaken: { element: 'fire', impact: 'blaze', windup: 'gather' },
    corvel: { element: 'fire', impact: 'blaze', windup: 'gather' }, emberLeap: { element: 'fire', impact: 'blaze', windup: 'gather' },
    shieldBurns: { element: 'fire', impact: 'blaze' } } },
};
