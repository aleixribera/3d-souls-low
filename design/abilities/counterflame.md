# Counterflame

| | |
| --- | --- |
| Id | `counterflame` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Triggered (no key) |
| Trigger | `parry`: you deflect a blow |
| Origin | Kept from js/data/abilities.js: the same power, text and numbers; the flare becomes a hard-edged blue-white burst |

## Card

**Deflect: fire bursts on the boss.** (6 words, 33 chars)

- Icon (48×48 line drawing): two crossed blades with a five-tongued flame bursting out of the cross point.
- Hover loop (1.4 s): a small figure deflects a falling blow (0.3 s), a burst of blue-white flame tongues blooms on the boss at the contact point (0.4 s); hold, fade.

## Idea

Every deflect throws fire back into the attacker: the deflect is the attack. A deflect build stops trading damage for safety, and a boss's long combo becomes a string of bursts on it.

## Data

```js
{ id: 'counterflame', name: 'Counterflame', rarity: 'rare',
  text: 'Deflect: fire bursts on the boss.',
  power: { when: 'parry', then: 'flare' },
  levels: [
    { damage: 40, cooldown: 1 },
    { damage: 55, cooldown: 1 },
    { damage: 70, cooldown: 1 },
  ] },
```

Numbers: a deflecting player turns 10-25 blows a fight; the 1 s cooldown caps a fast combo at one burst a second. 400-1000 damage a fight at level I is a lot, but only for players who deflect that much, which is the skill the game asks for. Kept as is.

## Engine work

- None for the rule: `parry/flare` exists.
- New look in js/ability-fx.js (`flareOn`): the burst below instead of the round flare. Fire Burst (key 1) also uses `flare` but draws the lotus; the two are told apart by the event's `v.charge` (a press), never by id.

## Multiplayer

The server sees the parry and resolves the flare on the shared enemy (as today). It wounds enemies only. Every browser draws the burst.

## Effect

Layered, timed from the deflect (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Burst | 5 flat flame tongues bursting outward from the contact point on the boss, 1.4 m, white-hot core, blue outer edge, dark inner lines | `#f2f6fa` core, `#8fb8dc` edge, `#2c5f8a` inner lines, `#0e1218` ink |
| 0.05-0.35 | Lick | The tongues curl up and thin, scaling 1.2× | as above |
| 0.05-0.45 | Embers | 12 sharp blue-white flakes rising off the burst | `#cfe2f2` |
| 0.30-0.50 | Out | The tongues shrink to their roots and vanish | to transparent |

Budget (Rare class): 2 pooled meshes (the tongue cluster, a scorch decal) + 12 particles (7 on Normal), 1 effect light (blue-white, 0.3 s, × 0.65 on Normal), no ribbon, no impact frame. Peak 0.35 s. Never covers the boss's weapon: drawn at the contact point and 50% translucent within 1 m of the boss's weapon. Reduced motion: no change needed (no flash).

## Sound

`abilityFlare` (kept): the dry pop of fire, its body band shifted up (900-2000 Hz) for a colder, sharper burst.

## Camera

Kept: `CONFIG.camera.feel.powers.flare = [-1.1, 0.03]`, on top of the parry's own punch.

## Images

- `img/counterflame-1.webp`: a sword deflect against a boss's blade, a hard-edged burst of blue-white fire blooming on the boss at the point of contact.
