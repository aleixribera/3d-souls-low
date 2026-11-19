'use strict';
// ============================================================================
// Boss effects (the Ultra preset, js/ultra-boss.js): what each boss's power looks like, attack by attack
// ============================================================================
// Drawing only. An ELEMENT is a look: colours, the sparks it throws, what its blows do to the ground (`impact`, one of
// BOSS_FX_IMPACTS), whether its blade smokes or burns. Each boss has an element, optionally one per phase, and any
// attack may name its own element and impact; `windup: 'gather'` draws power into the weapon through a heavy wind-up
// (every heavy, held, leaping or ringing hit gathers anyway), `aura` overrides the colour of the motes round the body.
// Checked at load (js/validate.js): every boss, phase and attack named here must exist.
const BOSS_FX_IMPACTS = ['quake', 'pillar', 'blaze', 'geyser', 'bloom', 'void', 'gale', 'roar', 'toll', 'shatter', 'prism'];
const BOSS_FX_SLASHES = ['sweep', 'backhand', 'chop', 'claw', 'wheel', 'thrust', 'uppercut', 'cross'];
const BOSS_FX_GLYPHS = ['shatter', 'toll', 'arcane', 'vortex', 'rend'];
const BOSS_FX_SPIRES = ['bone', 'stone', 'flame', 'ice', 'iron', 'thorn', 'gold', 'prism'];
const BOSS_FX_AMBIENTS = ['grave', 'furnace', 'arson', 'bronze', 'emberCrown', 'feral', 'lantern', 'tempest', 'seismic', 'chains', 'gilt', 'seams', 'storm', 'roots', 'blade', 'celestial'];
const BOSS_FX_WINDUPS = ['gather', 'none', 'vortex', 'crackle'];
const FX_ELEMENTS = {
  // core: the hot centre of its light; glow: its colour; mote: the dust it sheds; trail: its swing ribbon; sparks: a spark
  // palette (VISUALS.ultra.sparks.colors); impact: default ground effect; smoke: a dark colour its blade trails, if any.
  steel:     { core: 0xfff2dc, glow: 0xffb070, mote: 0xffd8a8, trail: 0xffc89a, sparks: 'clash', impact: 'quake' },
  holy:      { core: 0xfffbe8, glow: 0xffc860, mote: 0xffe4a0, trail: 0xffe2a0, sparks: 'holy', impact: 'pillar' },
  fire:      { core: 0xfff0b0, glow: 0xff6a18, mote: 0xff8a30, trail: 0xff9038, sparks: 'ember', impact: 'blaze' },
  blood:     { core: 0xff9070, glow: 0xd01408, mote: 0xff3418, trail: 0xff3a22, sparks: 'blood', impact: 'geyser' },
  rot:       { core: 0xffc0a0, glow: 0xff3a2a, mote: 0xff6048, trail: 0xff5a44, sparks: 'rot', impact: 'bloom' },
  black:     { core: 0xff5a40, glow: 0x9a0606, mote: 0xff2414, trail: 0xff3428, sparks: 'blood', impact: 'void', smoke: 0x120606 },
  storm:     { core: 0xf0f6ff, glow: 0x9ec0ff, mote: 0xd2e0ff, trail: 0xd8e6ff, sparks: 'storm', impact: 'gale' },
  earth:     { core: 0xffe2b0, glow: 0xd09048, mote: 0xe0c090, trail: 0xffc880, sparks: 'clash', impact: 'quake' },
  bone:      { core: 0xe6f4ff, glow: 0x4e96f0, mote: 0x8cc4ff, trail: 0x98ccff, sparks: 'bone', impact: 'shatter', smoke: 0x161b26 },
  gravefire: { core: 0xfff2c4, glow: 0xff520c, mote: 0xff8828, trail: 0xff741c, sparks: 'gravefire', impact: 'blaze', smoke: 0x1a100c },
  arson:     { core: 0xfff6cc, glow: 0xff3e06, mote: 0xff7a1a, trail: 0xff5e10, sparks: 'ember', impact: 'blaze', smoke: 0x140a06 },
  bronze:    { core: 0xeafff4, glow: 0x46c490, mote: 0x94f0c8, trail: 0x74e4b4, sparks: 'bronze', impact: 'toll' },
  resonance: { core: 0xf4fff9, glow: 0x26e8a8, mote: 0x9effdc, trail: 0x5effc8, sparks: 'bronze', impact: 'toll' },
  toll:      { core: 0xe8f4ff, glow: 0x7aa8d8, mote: 0xb8d4f0, trail: 0xc8dcf0, sparks: 'storm', impact: 'toll' },
  lunar:     { core: 0xf4fbff, glow: 0x78c8ff, mote: 0xc0e6ff, trail: 0xa4daff, sparks: 'lunar', impact: 'prism' },
  eclipse:   { core: 0xfff0ff, glow: 0x9c54ff, mote: 0xd4a4ff, trail: 0xb874ff, sparks: 'eclipse', impact: 'prism', smoke: 0x120820 },
};
const BOSS_FX = {
  // The Giant Skeleton (Level 1): spectral grave-bone & cold soul-ash rising from its spine, turning to a raging pit
  // furnace inside its ribs once the dead gather in Phase 2.
  giant: {
    element: 'bone', aura: 0xb8d4f8,
    phases: { gathered: 'gravefire' },
    ambient: { kind: 'grave', color: 0x7cbaff, secondary: 0x1b2436, rate: 34, radius: 1.6, height: 3.6 },
    phaseAmbient: { gathered: { kind: 'furnace', color: 0xff6214, secondary: 0xffe088, rate: 52, radius: 1.7, height: 3.8 } },
    phaseFx: { dome: { radius: 7.4, height: 5.2, time: 0.62 }, spires: { count: 16, radius: 4.4, height: 3.2, style: 'bone' },
               pillar: { radius: 2.1, height: 15 }, glyph: 'shatter', arcs: 10, rings: 3 },
    attacks: {
      sweep: { windup: 'gather', slash: { kind: 'sweep', scale: 1.45, tilt: 0.08, y: 1.35 }, arcs: 2 },
      stomp: { impact: 'shatter', windup: 'vortex', dome: { radius: 4.8, height: 2.6 },
               spires: { count: 10, radius: 3.2, height: 2.1, style: 'bone' }, glyph: 'shatter', arcs: 4 },
      giantClaw: { windup: 'crackle', slash: { kind: 'claw', scale: 1.35, y: 1.3 }, arcs: 3 },
      giantSlam: { impact: 'shatter', windup: 'vortex', slash: { kind: 'chop', scale: 1.5, y: 1.8 },
                   dome: { radius: 5.8, height: 3.6 }, spires: { count: 14, radius: 3.8, height: 2.9, style: 'bone' },
                   glyph: 'shatter', arcs: 6 },
      giantTaking: { windup: 'vortex', slash: { kind: 'sweep', scale: 1.15, tilt: -0.14, y: 0.85 }, arcs: 4 },
      giantTakingPunish: { windup: 'vortex', slash: { kind: 'sweep', scale: 1.15, tilt: -0.14, y: 0.85 }, arcs: 4 },
      giantClubClaw: { impact: 'shatter', windup: 'gather', hits: [
        { slash: { kind: 'backhand', scale: 1.35, tilt: -0.1, y: 1.35 }, arcs: 2 },
        { slash: { kind: 'claw', scale: 1.35, y: 1.25 }, arcs: 3 },
        { slash: { kind: 'chop', scale: 1.5, y: 1.8 }, dome: { radius: 5.4, height: 3.4 },
          spires: { count: 12, radius: 3.5, height: 2.6, style: 'bone' }, glyph: 'shatter', arcs: 6 },
      ] },
      giantGathering: { element: 'gravefire', impact: 'blaze', windup: 'vortex',
                        dome: { radius: 7.2, height: 4.8, time: 0.6 },
                        spires: { count: 18, radius: 4.6, height: 3.4, style: 'bone' },
                        glyph: 'shatter', arcs: 12 },
      giantReach: { impact: 'shatter', windup: 'vortex', slash: { kind: 'claw', scale: 1.35, y: 1.0 },
                    dome: { radius: 4.5, height: 2.6 }, spires: { count: 8, radius: 2.8, height: 2.0, style: 'bone' },
                    glyph: 'rend', arcs: 5 },
      giantWheel: { windup: 'crackle', slash: { kind: 'wheel', scale: 1.85, y: 1.65 }, arcs: 6, hits: [
        { slash: { kind: 'wheel', scale: 1.8, tilt: 0.08, y: 1.6 }, arcs: 5 },
        { slash: { kind: 'wheel', scale: 1.95, tilt: -0.08, y: 1.75 }, dome: { radius: 5.8, height: 2.6 }, arcs: 7 },
      ] },
      giantPitStomps: { impact: 'shatter', windup: 'gather', hits: [
        { dome: { radius: 3.6, height: 2.0 }, spires: { count: 7, radius: 2.6, height: 1.7, style: 'bone' }, glyph: 'shatter', arcs: 3 },
        { dome: { radius: 3.8, height: 2.1 }, spires: { count: 7, radius: 2.7, height: 1.8, style: 'bone' }, glyph: 'shatter', arcs: 3 },
        { impact: 'blaze', dome: { radius: 6.4, height: 3.8 }, spires: { count: 14, radius: 4.2, height: 2.9, style: 'bone' },
          glyph: 'shatter', arcs: 8 },
      ] },
    },
  },
  // The Pillager Captain, Torch of Corvel (Level 3): blackened iron & violent steel sparks in Phase 1; pitch-soaked
  // arson inferno billowing black tar-smoke & burning floor fires once he lights his bill in Phase 2.
  pillagerCaptain: {
    element: 'steel', aura: 0xff9a48,
    phases: { lit: 'arson' },
    ambient: { kind: 'arson', color: 0xff9848, secondary: 0x1a1412, rate: 14, radius: 1.1, height: 2.4 },
    phaseAmbient: { lit: { kind: 'arson', color: 0xff5a12, secondary: 0x120806, rate: 46, radius: 1.4, height: 2.8 } },
    phaseFx: { dome: { radius: 7.4, height: 4.8, time: 0.6 }, spires: { count: 16, radius: 4.5, height: 3.0, style: 'flame' },
               pillar: { radius: 1.8, height: 14 }, glyph: 'shatter', arcs: 10, rings: 3 },
    attacks: {
      captainThrust: { windup: 'gather', slash: { kind: 'thrust', scale: 1.45, y: 1.25 }, arcs: 3 },
      captainThrustPunish: { windup: 'gather', slash: { kind: 'thrust', scale: 1.5, y: 1.25 }, arcs: 3 },
      captainCombo: { windup: 'gather', hits: [
        { slash: { kind: 'sweep', scale: 1.35, tilt: 0.42, y: 1.3 }, arcs: 2 },
        { slash: { kind: 'backhand', scale: 1.35, tilt: -0.38, y: 1.35 }, arcs: 2 },
        { slash: { kind: 'chop', scale: 1.45, y: 1.5 }, dome: { radius: 3.4, height: 2.0 }, arcs: 4 },
      ] },
      captainComboLit: { element: 'arson', windup: 'crackle', hits: [
        { slash: { kind: 'sweep', scale: 1.45, tilt: 0.42, y: 1.3 }, arcs: 3 },
        { slash: { kind: 'backhand', scale: 1.45, tilt: -0.38, y: 1.35 }, arcs: 3 },
        { impact: 'blaze', slash: { kind: 'chop', scale: 1.6, y: 1.55 }, dome: { radius: 4.4, height: 2.8 },
          spires: { count: 8, radius: 2.6, height: 2.0, style: 'flame' }, glyph: 'shatter', arcs: 6 },
      ] },
      captainOverhead: { impact: 'shatter', windup: 'vortex', slash: { kind: 'chop', scale: 1.6, y: 1.6 },
        dome: { radius: 4.6, height: 3.0 }, spires: { count: 10, radius: 3.0, height: 2.3, style: 'iron' },
        glyph: 'shatter', arcs: 5 },
      captainOverheadLit: { element: 'arson', impact: 'blaze', windup: 'vortex', slash: { kind: 'chop', scale: 1.75, y: 1.65 },
        dome: { radius: 5.8, height: 3.8 }, spires: { count: 14, radius: 3.6, height: 2.8, style: 'flame' },
        glyph: 'shatter', arcs: 8 },
      captainHook: { windup: 'gather', hits: [
        { slash: { kind: 'sweep', scale: 1.5, tilt: -0.06, y: 0.55 }, arcs: 4 },
        { slash: { kind: 'chop', scale: 1.3, y: 1.35 }, arcs: 3 },
      ] },
      captainWheel: { windup: 'crackle', hits: [
        { slash: { kind: 'wheel', scale: 1.65, tilt: 0.06, y: 1.25 }, arcs: 5 },
        { slash: { kind: 'wheel', scale: 1.75, tilt: -0.08, y: 0.55 }, dome: { radius: 4.8, height: 2.2 }, arcs: 6 },
      ] },
      captainFurrow: { impact: 'shatter', windup: 'gather', hits: [
        { glyph: 'rend', spires: { count: 8, radius: 2.6, height: 1.8, style: 'iron' }, arcs: 4 },
        { slash: { kind: 'uppercut', scale: 1.45, y: 1.45 }, arcs: 3 },
      ] },
      captainFurrowLit: { element: 'arson', impact: 'blaze', windup: 'crackle', hits: [
        { glyph: 'rend', dome: { radius: 4.0, height: 2.4 }, spires: { count: 12, radius: 3.0, height: 2.3, style: 'flame' }, arcs: 6 },
        { slash: { kind: 'uppercut', scale: 1.6, y: 1.5 }, arcs: 5 },
      ] },
      captainHaftBack: { windup: 'gather', dome: { radius: 2.6, height: 1.6 }, arcs: 3 },
      captainKindling: { element: 'arson', impact: 'blaze', windup: 'vortex',
        dome: { radius: 7.4, height: 4.8, time: 0.62 },
        spires: { count: 16, radius: 4.4, height: 3.1, style: 'flame' },
        glyph: 'shatter', arcs: 12 },
      captainFirebrand: { element: 'arson', windup: 'crackle', hits: [
        { slash: { kind: 'sweep', scale: 1.7, tilt: 0.05, y: 1.0 }, glyph: 'rend', dome: { radius: 4.6, height: 2.4 }, arcs: 6 },
        { slash: { kind: 'thrust', scale: 1.65, y: 1.2 }, arcs: 6 },
      ] },
    },
  },
  // The Bell Warden (Level 4): verdigris-bronze acoustic shockwaves & harmonic bell ripples; woken in Phase 2,
  // his chains shatter and every blow erupts with blinding spectral mint-emerald resonance.
  bellWarden: {
    element: 'bronze', aura: 0x8ef2c4,
    phases: { woken: 'resonance' },
    ambient: { kind: 'bronze', color: 0x8ef2c4, secondary: 0x46c490, rate: 22, radius: 1.5, height: 3.1 },
    phaseAmbient: { woken: { kind: 'bronze', color: 0x74ffd0, secondary: 0x22e4a4, rate: 46, radius: 1.8, height: 3.4 } },
    phaseFx: { dome: { radius: 7.8, height: 5.0, time: 0.64 }, spires: { count: 14, radius: 4.5, height: 2.8, style: 'iron' },
               pillar: { radius: 2.2, height: 15 }, glyph: 'toll', arcs: 12, rings: 3 },
    attacks: {
      wardenSweep: { windup: 'gather', slash: { kind: 'sweep', scale: 1.5, tilt: 0.06, y: 1.15 }, arcs: 3 },
      wardenHammerfall: { impact: 'toll', windup: 'vortex', slash: { kind: 'chop', scale: 1.65, y: 1.65 },
        dome: { radius: 5.8, height: 3.6 }, spires: { count: 10, radius: 3.5, height: 2.4, style: 'iron' },
        glyph: 'toll', arcs: 6 },
      wardenPush: { windup: 'gather', slash: { kind: 'thrust', scale: 1.4, y: 1.2 }, dome: { radius: 3.6, height: 2.2 }, arcs: 4 },
      wardenCharge: { windup: 'crackle', slash: { kind: 'thrust', scale: 1.55, y: 1.2 }, arcs: 4 },
      wardenChargePunish: { windup: 'crackle', slash: { kind: 'thrust', scale: 1.6, y: 1.2 }, arcs: 4 },
      wardenBackhand: { impact: 'toll', windup: 'gather', hits: [
        { slash: { kind: 'backhand', scale: 1.4, tilt: -0.35, y: 1.2 }, arcs: 3 },
        { slash: { kind: 'chop', scale: 1.55, y: 1.55 }, dome: { radius: 5.2, height: 3.2 },
          spires: { count: 8, radius: 3.2, height: 2.2, style: 'iron' }, glyph: 'toll', arcs: 6 },
      ] },
      wardenUpswing: { windup: 'gather', slash: { kind: 'uppercut', scale: 1.5, y: 1.45 }, arcs: 4 },
      wardenAnswer: { element: 'resonance', impact: 'toll', windup: 'vortex',
        dome: { radius: 6.4, height: 4.2, time: 0.56 }, glyph: 'toll', arcs: 10 },
      wardenAnswerTwice: { element: 'resonance', impact: 'toll', windup: 'vortex', hits: [
        { dome: { radius: 6.2, height: 4.0, time: 0.54 }, glyph: 'toll', arcs: 8 },
        { dome: { radius: 7.4, height: 4.8, time: 0.62 }, spires: { count: 12, radius: 4.2, height: 2.6, style: 'iron' },
          glyph: 'toll', arcs: 12 },
      ] },
      wardenWaking: { element: 'resonance', impact: 'toll', windup: 'vortex',
        dome: { radius: 7.8, height: 5.0, time: 0.64 }, spires: { count: 14, radius: 4.6, height: 2.9, style: 'iron' },
        glyph: 'toll', arcs: 12 },
      wardenFall: { element: 'resonance', impact: 'toll', windup: 'vortex', slash: { kind: 'chop', scale: 1.6, y: 1.5 },
        dome: { radius: 6.2, height: 3.8 }, spires: { count: 12, radius: 3.8, height: 2.6, style: 'iron' },
        glyph: 'toll', arcs: 8 },
      wardenThreeTolls: { element: 'resonance', impact: 'toll', windup: 'crackle', hits: [
        { slash: { kind: 'chop', scale: 1.45, tilt: 0.36, y: 1.4 }, dome: { radius: 4.0, height: 2.4 }, glyph: 'toll', arcs: 4 },
        { slash: { kind: 'chop', scale: 1.5, tilt: -0.36, y: 1.4 }, dome: { radius: 4.6, height: 2.8 }, glyph: 'toll', arcs: 5 },
        { slash: { kind: 'chop', scale: 1.7, y: 1.65 }, dome: { radius: 6.4, height: 4.0 },
          spires: { count: 12, radius: 4.0, height: 2.7, style: 'iron' }, glyph: 'toll', arcs: 9 },
      ] },
    },
  },
  varn: { element: 'steel', aura: 0xff8040, phases: { throne: 'fire', knell: 'fire' }, attacks: {
    varnLeap: { impact: 'shatter' }, knellSweep: { element: 'fire' }, knellLeap: { impact: 'blaze' },
    tollingChain: { element: 'toll' }, lastToll: { element: 'toll', impact: 'toll', windup: 'gather' },
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
  // Vesper, the Pale Meridian (Boss Rush / Practice): cold moonlight silver & ice-cyan glass prisms; past half her
  // strength the eclipse opens, her rings flare violet-silver and her blade trails dark astral mist.
  vesper: { element: 'lunar', aura: 0x98dcff, phases: { eclipse: 'eclipse' }, attacks: {
    zenithFall: { impact: 'prism', windup: 'gather' }, prismSeed: { impact: 'prism' },
    starAlignment: { impact: 'prism', windup: 'gather' },
    eclipseOpen: { element: 'eclipse', impact: 'prism', aura: 0xb874ff, windup: 'gather' },
    mirrorStep: { element: 'eclipse', impact: 'gale' },
    eclipseCross: { element: 'eclipse', impact: 'prism', windup: 'gather' },
    lunarTempest: { element: 'eclipse', impact: 'prism', windup: 'gather' } } },
};
