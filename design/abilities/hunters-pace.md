# Hunter's Pace

| | |
| --- | --- |
| Id | `hunters-pace` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Triggered perk (no key) |
| Trigger | `fightStart` (new): a fight begins (the moment the player gets control after the boss's entrance) |
| Origin | New |

## Card

**Fight start: free dashes for {time}.** (6 words, 31 chars; level I reads "Fight start: free dashes for 4 s.")

- Icon (48×48 line drawing): three chevrons in a row pointing right, with three short speed lines behind them.
- Hover loop (1.8 s): three dash bars glow (0.2 s), a figure dashes three times in quick succession with speed lines behind it (0.9 s), the bars dim back (0.2 s); hold, fade.

## Idea

The first seconds of every fight, dashes cost nothing: open with a rush. The start of a boss fight is the one moment you know exactly what comes next, and this turns it into a charge in: close the gap, circle to the flank, set up the first counter. It never helps later in the fight, so it changes how you open, not how you survive.

## Data

```js
{ id: 'hunters-pace', name: "Hunter's Pace", rarity: 'common',
  text: 'Fight start: free dashes for {time}.',
  perk: { when: 'fightStart', then: 'freeDash' },
  levels: [{ time: 4 }, { time: 5 }, { time: 6 }, { time: 7 }] },
```

Numbers: a dash is 0.36 s, so 4 s holds up to 11 dashes, in practice 4-6 used, against the 3 charges a player starts with; level IV's 7 s covers the opening exchange of most bosses. It deals no damage: its worth is the safe, fast approach and a first counter set up sooner.

## Engine work

- New `when: 'fightStart'`: fired on the holder's body when a fight begins (Boss Rush: control given after the boss's entrance; js/game.js's fight start, the same moment the fight's timer starts). Perks only.
- Reuses Last Breath's `then: 'freeDash'`. New pair `ABILITY_PERKS['fightStart/freeDash'] = ['time']`. Perk clocks: `hunt` (s left), set to `time` on the trigger, counted down in `abilityClocks`. `Player.freeDash()` also returns true while `hunt` > 0. Emits `abilityPerk` `{ perk: 'fightStart/freeDash' }`.
- Shared by the effect commons: the validate.js kind rule and the camera-feel.js common skip (see Spark Step).

## Multiplayer

A perk on the holder's own body: their browser runs it from the fight's start it already receives from the server (each client owns its movement and dashes). The server needs nothing. It moves only its holder. The speed lines are drawn in the holder's browser, as every perk cue is today.

## Effect

Layered, timed from the fight's start (t = 0) for its `time`; each dash inside it at its start (t' = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 to time | Bars (HUD) | The dash charge bars glow white with a thin bone rim and stay full, dimming in the last 1 s to show the end | `#f4f1e8` fill, `#cfc8b6` rim |
| t' 0.00-0.30 | Lines | 10 bone-white radial speed lines streak back off the body along the dash (flat hard streaks, 0.6-1.2 m) | `#f4f1e8` heads, `#cfc8b6` body, `#16130f` tail tips |
| t' 0.20-0.40 | Fade | The lines thin and fade | to transparent |

Budget (Common class): 1 pooled mesh (the speed-line set, one instanced strip), 10 lines a dash (6 on Normal), no light, no ribbon, no impact frame. Peak 0.3 s a dash. Reduced motion: the speed lines hold still behind the body instead of streaking.

## Sound

Reuse `abilityStep` (a quick swish and a bright chime) at pitch 1.2 and vel 0.45 at the fight's start; the dashes keep their own sounds. The holder's only.

## Camera

No camera kick: commons never take one. camera-feel.js's `perkFov` skips this common's `abilityPerk`.

## Images

- `img/hunters-pace-1.webp`: the swordsman rushing toward a boss at the start of a fight, multiple dashes chained with bone-white speed lines streaking behind.
