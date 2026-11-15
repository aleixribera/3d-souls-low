# Echo Step

| | |
| --- | --- |
| Id | `echo-step` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Triggered power (no key) |
| Trigger | `dodge`: a perfect dodge (a blow met the holder inside the dash's i-frames) |
| Origin | New |

## Card

**Perfect dodge: your afterimage strikes once.** (6 words, 44 chars)

- Icon (48×48 line drawing): a dashed outline of a figure with a single curved slash stroke in front of it, and a solid figure stepping away to the side.
- Hover loop (1.6 s): a figure sidesteps a falling blow (0.3 s), the dashed outline left behind swings one slash (0.2 s) and breaks into flakes (0.3 s); hold, fade.

## Idea

The perfect dodge already leaves an afterimage where you stood; Echo Step makes it swing once at the boss before it fades. The dodge itself hits back, so the boss is punished for the blow you slipped even before your counter lands. It reads as one clean beat: you are already gone, and the copy you left still cuts.

## Data

```js
{ id: 'echo-step', name: 'Echo Step', rarity: 'common',
  text: 'Perfect dodge: your afterimage strikes once.',
  power: { when: 'dodge', then: 'afterimage' },
  levels: [{ damage: 14 }, { damage: 18 }, { damage: 22 }, { damage: 26 }] },
```

Numbers: a light hit is 16, so the afterimage's cut is a light hit at level I and over one and a half at level IV. Perfect dodges come 6-12 times a fight: about 85-170 more at level I and 155-310 at level IV. No cooldown: a perfect dodge is earned each time. It never opens a counter of its own and never cracks a guard (a power's blow is never a counter).

## Engine work

- Reuses `when: 'dodge'` (Time Rift's and Counterstep's).
- New `then: 'afterimage'`: 0.15 s after the dodge (`CONFIG.abilities.commons.imageDelay`), `damage` to the dodged enemy if its body is within `CONFIG.abilities.commons.imageReach` (2.8 m) of where the holder stood when the blow met them (`ctx.x/z`, the dodge point), as a power's blow. Out of reach, nothing. Runs as a `running` entry (one strike, `next` = the delay), like a twin's echo. Add it to `ON_ENEMY`. `ABILITY_POWERS['dodge/afterimage'] = ['damage']`.
- Drawing: js/afterimage.js already leaves a brighter, longer copy on a perfect dodge. A new `afterimage` case in ability-fx.js poses that copy's figure in the swing (the `light` attack's active pose), turned to the enemy, and draws the slash and the flakes.
- Shared by the effect commons: the validate.js kind rule and the camera-feel.js common skip (see Spark Step).

## Multiplayer

The perfect dodge is already a claim (`ABILITY_CLAIMS` has `dodge`; the server checks a blow of that attack was out near the player). The claim adds the dodge point; the server checks it within 1.5 m of the player's pose at that time and the enemy within `imageReach` of it, then resolves the cut. It hits that enemy only. Everyone sees the copy swing.

## Effect

Layered, timed from the perfect dodge (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Copy | The perfect dodge's afterimage, recoloured as a flat grey ink silhouette with a dark outline, where the holder stood | `#8c877b` body, `#cfc8b6` rim, `#16130f` outline |
| 0.08-0.18 | Swing | The copy snaps into the light swing's active pose, turned to the enemy | as above |
| 0.15-0.30 | Slash | One flat brush-stroke crescent (1.4 m) along the swing, dry-brush ends, white core | `#f4f1e8` core, `#cfc8b6` edge, `#16130f` ends |
| 0.25-0.55 | Flakes | The copy dissolves into 16 hard-edged ink flakes drifting back and down | `#4a4740`, `#16130f`, a few `#cfc8b6` |

Budget (Common class): 2 pooled meshes (the copy, which is js/afterimage.js's pooled figure; the slash), 16 particles (9 on Normal), no light, no ribbon, no impact frame. Peak 0.15 s at the slash. Reduced motion: no change needed (no flash); the copy fades instead of flaking.

## Sound

Reuse `abilityEcho` (the ember twin's echoed blow) at pitch 1.2 and vel 0.55, played at the slash: a lighter echo of a cut.

## Camera

No camera kick: commons never take one (the perfect dodge has its slow beat).

## Images

- `img/echo-step-1.webp`: the swordsman dodging aside while a grey ink afterimage of them, left behind, swings a brush-stroke slash at the boss and flakes away.
