# The Giant Skeleton, the Gaol's Dead

The third boss through the system (`system.md`; PLAN item 6, the roster in the order players meet them). Data:
`js/data/bosses/giant-skeleton.js`; model: `tools/blender/giant.py`. Status: pass 125, the moveset audit (below) and a
second string for the gaol phase, Claw and Taking. Pass 127: the cel look (black iron, the club's tell on its skull,
smaller claw and foot halos, a soft spine), in-between keys, the `edges-1` judge (round 9) and its one fix. Pass 132: every follow-through carries the body on past the strike (`tools/body-check.cjs`, none flagged). Awaiting Aleix.

## Moveset audit (pass 125): restyle, plus one string

Against the system's bars (`system.md` section 0), with Aleix's word that some bosses need a rework, not a restyle:
- **8 to 12 attacks of his own: meets.** 10 moves made for him in pass 72 (11 with pass 125's string) (his own `giant*` key poses, no move sources,
  nothing renamed from another boss), plus one variant (the Taking sooner, when you drink).
- **3 or 4 combos: met only now.** Club and Claw, Pit Stomps and the Bonewheel (one move turning twice), and the gaol
  phase had a single string. Pass 125 adds **Claw and Taking** (both phases).
- **One or two signature moments a phase: meets.** The Taking (the hand that holds you up to its skull); the Gathering
  and the Reaching Hand.
- **`noParry` on a quarter at most: missed (4 of 10: the Taking, the Gathering, the Reaching Hand, the Bonewheel),
  near now (3 of 11).** The Bonewheel's first turn takes a parry; the other three are the two grabs (a closing hand
  can't be parried) and the phase opener.
- **A real phase two: meets.** New moves (the Gathering, the Reaching Hand, the Bonewheel, Pit Stomps) and a new rule:
  distance stops being safe, because the hand leaps 11 m to take you.

So he keeps his moves; the work is the look, the animation and the judge.

## Idea

The gaol's dead, made one (STORY.md, part one). Those who died in the Long Hall's cells went down the pit at the hall's
end, and the Ember's heat stood their bones up again as one giant, still in its irons. It keeps the hall's last gate and
does what the gaol did to them: it takes the living and holds them. **Fighting him is about the open hand:** his club
and claw can be parried, but the hand that opens low is a cell, and a parry there is a player held up to the skull. Read
the hand, not the arm.

## Silhouette

A spectral giant (2.3x): a huge domed skull hung low before the chest on a long neck, a barrel of ribs on a white-hot
spine, a long clawed left hand with a manacle and a swinging chain, and a gaoler's club (a thigh bone bound in iron) in
the right. From 20 m: the low skull and the long hand. Cel style (next pass): pale bone in flat bands, black iron, the
spine the one light until the heat fills his ribs. Pass 127: the irons in black (`wardenPlate`; `rustedIron` read mid
grey, and in cel a tint sets hue only); his spine and neck bend as one column (`softJoints`), his limbs stay hinged, as
bones are.

## Moveset (12 attacks; 4 strings)

| Attack | Tell (his own pose) | Answer | Punishes |
| --- | --- | --- | --- |
| Club Sweep | club hauled back low behind his right hip, the skull on you over his left shoulder | parry | standing at his side |
| Stomp | one knee raised to his hip, arms spread, skull bowed between his feet | roll, or jump | standing under him |
| The Long Claw | the claw drawn up over his left shoulder, fingers spread | parry | staying in reach |
| Gaol Slam | club high on his right, the claw aimed at you; held | roll | greed after a combo |
| The Taking | crouched and twisted left, the open hand held out wide and low | roll | standing in front |
| Club and Claw | the club cocked across his chest to the left | parry, parry, roll | mashing |
| Claw and Taking | the Long Claw's raise; then the hand left open, low at his right knee | parry, then roll | parrying on rhythm |
| The Taking (when you drink) | the Taking, sooner | don't drink in his sight | healing |
| The Gathering (gathered opener) | both hands raised high | roll, or be out of reach | standing close at the change |
| The Reaching Hand (gathered) | crouched on his haunches, the claw stretched back | roll | keeping your distance |
| The Bonewheel (gathered) | the club straight out to his right, coiled left | parry the first turn, or roll both | standing close |
| Pit Stomps (gathered) | hunched, a foot lifted, marching | roll, or jump | backing off in a line |

Strings, every one broken by a counter (PLAN item 3): **the Bonewheel** (a parry on its first turn stops the second); **Club and Claw** (backhand, claw, then the club high and down);
**Claw and Taking** (the rake, then the open hand back along the floor: the one string whose second blow must not be
parried); **Pit Stomps**, right, left, right. Unparryable (`noParry`): the Taking, the Reaching Hand and the Gathering, 3 of his
11 moves. Roll only: the Stomp, the Gaol Slam, Pit Stomps and the strings' grabs and last blows. Pass 125: the Bonewheel
was unparryable too (4 of 10); its first turn is the club's, so now it takes a parry.

## Signature moments

- **Gaol: the Taking.** The hand closes, lifts you to the skull, and the heat in its spine breathes on you while you
  struggle loose (strike or roll, again and again).
- **Gathered: the Gathering, then the Reaching Hand.** He drives both hands into the floor and the pit gives him more of
  its dead; then he leaps the length of the hall hand first.

## Phase two

The pit gives him more of its dead: the heat fills his ribs (`reveal`), he comes closer and faster (approach 0.7), and
the rule changes: distance is no longer safe (the Reaching Hand leaps up to 11 m), standing close is no longer safe
(the Bonewheel, Pit Stomps).

## Effects

On impact (the Slam's and the stamps' cracks and dust), the Taking's grip, the Gathering and the phase change (the
`revealBurst`). Pass 127, from his first strips in cel: the Gaol Slam lit the whole club blue and tinted his body
orange, and the claw's halo covered his hip and shoulder. Now the club's tell sits on the skull at its end (`edgeTell` on
its own `clubHead` slot), the claw's and the feet's halos are half the size, his body keeps its colour, and his swings
leave a thin arc with a smear (`BOSS_FX` `trail`). His blows into the floor (the Slam, Club and Claw's last) crack it
wider and throw more stone (judge round 9).

## Animation

Key poses per hit in the data file (pass 72). Claw and Taking reuses the Long Claw's hit, and its grab comes back from
where the rake ended, so the hand never resets between the blows.

Pass 127: in-between keys (`via`) on the Club Sweep, the Long Claw, the Gaol Slam and Club and Claw's last blow. His
hips and chest lead and the club or the long arm trails, then whips through; a raise overhead dips before it rises and
arches at the top (the load); after a blow into the floor his hips drop and his knees give (`slamLanded`).

Judge `edges-1`, round 9 (line drawings; Sekiro x2 and Stellar Blade beside the Slam and the Sweep): caught 9/10, motion
5, readability 7, spectacle 4 (the Sweep 5, 7, 3); giveaway: a small clean silhouette under a fixed wide camera, and the
world does not react when it lands. One fix (wider cracks, more stone and dust on his floor blows); the judge's camera
and dust gaps are the Captain's and the Warden's again, and the edge filter drops soft dust, so he goes to Aleix
(`system.md` section 6).
