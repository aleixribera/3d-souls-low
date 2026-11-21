# Aldric, the Gaoler King

The fourth boss through the system (`system.md`; PLAN item 6, the roster in the order players meet them). Data:
`js/data/bosses/aldric.js` (boss id `varn`, model `varn`); model: `tools/blender/aldric.py`. Status: pass 128, his
own sweep wind-up, the Turning Key (the man's second string) and his cel look (dark cloth, banded steel, the tell on
the blade's edge, soft joints, a smear on his swings). Next: in-between keys where his strips look stiff, then Aleix.

## Moveset audit (pass 127): restyle, plus a string and a wind-up of his own

Against the system's bars (`system.md` section 0), with Aleix's word that some bosses need a rework, not a restyle:
- **8 to 12 attacks of his own: meets.** 10 moves made for him in pass 75 (his own `aldric*` key poses, no move
  sources): six as the man, four more as the Ember-Crowned. The Ember-Crowned also burns six of the man's moves
  faster (the Burning Sweep and the rest), and the Rebuke is the Iron Shoulder as an answer.
- **3 or 4 combos: meets overall, short for the man.** Two Cuts, the Tolling Chain, the Burning Ascent and the Last
  Toll, but the man's two bars (the field and the throne room) hold only Two Cuts. Next pass adds a second string
  there.
- **One or two signature moments a phase: meets.** The man: the Undying Ember closing his wounds (his bar glows, then
  fills) and the Withheld Sentence; the Ember-Crowned: the Last Toll.
- **`noParry` on a quarter at most: meets** (none; the leaps, the Ascent and the Last Toll are roll only).
- **A real phase two: meets.** He burns, mends faster, and four new moves come (the chain, the wave along the floor,
  the leaping ascent, the three tolls).
- **Every wind-up his own: missed.** The Gaol Sweep's tell (the blade hauled back low behind his right hip, his back
  half turned) is the Giant Skeleton's Club Sweep tell, word for word (VISION: "each of a boss's attacks has its own
  wind-up", "no two bosses share attacks"). Next pass gives his sweep a king's wind-up of its own.

So he keeps his moves; the work is his sweep's wind-up, a string for the man, then the look, the animation and the judge.
Done in pass 128: the sweep's wind-up is the blade flat over his left shoulder (a left-to-right sweep; the Burning
Sweep and the Tolling Chain's third cut follow it), and the Turning Key is the man's second string.

## Idea

The last king to swear the Oath of the Open Hand, who feared death after the plague year and took the Undying Ember to
cheat it (STORY.md, part one). It keeps its bargain: he will not stay hurt. **Fighting him is about pressing:** every
wound you give him glows and closes once you stop, so keep at him, or crack his guard to make the wounds stay; and a
king who was a soldier punishes a string of blows too long with his shoulder.

## Silhouette

A tall armoured king (1.75x): a crown of shackles, plate gone dark bronze under a slate tabard with a tarnished gold
stripe, a long ash-grey cloak, and a broad two-handed greatsword whose cross ends in manacle cuffs. From 20 m: the
crown, the cloak and the long blade held in both hands.

## Moveset (19 attacks; 5 strings)

| Attack | Tell (his own pose) | Answer | Punishes |
| --- | --- | --- | --- |
| Gaol Sweep | the blade laid flat over his left shoulder, point behind him, his right fist by his left ear (pass 128) | parry | standing at his side |
| The Turning Key | the Gaol Sweep's, then the blade turned over at his right, then the hilt high, blade standing behind his shoulder | parry, parry, parry (or step back from the pommel) | rolling after the first |
| Two Cuts | over his right shoulder, point to the sky | parry, parry | rolling after the first |
| The Withheld Sentence | the blade across the back of his neck, a headsman's yoke; held | parry, on its fall | rolling early |
| Shackle Lunge | drawn back level at his right hip, point at you | parry | keeping your distance |
| Iron Shoulder | the blade let down along his thigh, his left shoulder squared to you | parry | standing close |
| The King's Rebuke | the Iron Shoulder, sooner, after a string of your blows | parry, or stop and roll | greed |
| Judgement Leap | crouched, the blade over his shoulder, point behind | roll | keeping your distance |
| Burning Sweep (Ember-Crowned) | the Gaol Sweep, faster | parry | standing at his side |
| The Turning Key, Two Cuts, The Withheld Sentence, Shackle Lunge, The King's Rebuke, Judgement Leap (Ember-Crowned) | the same, burning, faster | as above | as above |
| Tolling Chain (Ember-Crowned) | four guards in a row, the last held | parry four | mashing |
| Ash Wave (Ember-Crowned) | the point dragged on the floor behind him | sidestep or roll | keeping your distance |
| Burning Ascent (Ember-Crowned) | low at his left | roll, roll | standing in front |
| The Last Toll (Ember-Crowned) | the hilt raised to his chest, the blade hanging point down | roll or jump each ring | staying in the room |

Strings, every one broken by a counter (PLAN item 3): **Two Cuts**; **the Turning Key** (pass 128), the sweep, back
across, the pommel to the face; its first blow is the Gaol Sweep, so the branch is after it; **the Tolling Chain**, four cuts; **the Burning
Ascent**, the cut that lifts him and the crash; **the Last Toll**, three rings and the fire round him.

## Signature moments

- **The man: the Undying Ember.** Every wound glows on his bar and his plate's cracks; stop, and embers stream back into
  him. The Withheld Sentence, held as long as he likes, is the moment players retell.
- **The Ember-Crowned: the Last Toll.** The blade driven into the floor three times, three rings of fire out across the
  throne room, then the fire breaks out round him.

## Phase two

At his second bar he gives himself to the Ember: he burns (`ignite`), mends faster, comes closer (approach 0.85), and
four moves of his own come: the chain, the wave, the ascent and the toll.

## Effects

On impact (the Sentence's and the leaps' cracks and rings), the Ember's wounds closing, the ignition and the Last Toll's
rings. Since pass 128 the wind-up tell is on the blade's edge near the point (`edgeTell`), never over his body, and his
swings leave a thin trail with a smear (BOSS_FX `trail`).

## Animation

Key poses per hit in the data file (pass 75), the blade in both hands (`grip`). Next: in-between keys where the strips
look stiff.
