# The Bell Warden

The second boss through the system (`system.md`; PLAN item 5's real check). Data: `js/data/bosses/bell-warden.js`; model:
`tools/blender/bellwarden.py`. Status: pass 123, the design page and the cel look (dark bronze, the bell the one bright
metal, the tell on the bell's lip, soft joints, a smear on his swings), all by data. Pass 124: the moveset audit (below),
a second cold string, and in-between keys on seven attacks. Next: the `edges-1` judge, then Aleix.

## Idea

The tower's bellkeeper, chained into bronze cast like the Bell of Waking he keeps, set by the king on the Seven's
watchtower so the Bell is never rung (STORY.md, part one). He rings when struck. **Fighting him is about patience:**
every blow you land fills his bronze with a hum, and when it is full he gives it back as one toll all round him. Two or
three blows, then step away. Greed is what he punishes; the tower's open edge is what his push threatens.

## Silhouette

A squat bronze colossus (1.9x): a bell for a helm with a barred gaol window, bells for pauldrons and skirt, a bell maul
whose head is a real cast bell on a long haft. From 20 m the stacked bells and the maul's flared mouth read as nothing
else in the game. Cel style: dark weathered bronze, near black-green with worn gold trim bands; the maul's bell the one
bright bronze on him (where his reach ends); the pale green hum at his breast the one light until he wakes.

## Moveset audit (pass 124): restyle, not rework

Against the system's bars (`system.md` section 0), with Aleix's word that some bosses need a rework, not a restyle:
- **8 to 12 attacks of his own: meets.** 11 moves made for him in pass 68 (his own `warden*` key poses, no move sources,
  nothing renamed from another boss), plus two variants (the charge sooner, the answer twice).
- **3 or 4 combos: met only now.** Backhand and Hammer, Three Tolls and the Peal, but the Peal is one toll twice and the
  silent phase had a single string. Pass 124 adds **Sweep and Return** (both phases), so three real strings.
- **One or two signature moments a phase: meets.** The Answering Toll; the Waking.
- **A real phase two: meets.** New moves (the Waking, the Bronze Fall, Three Tolls, the Peal) and a new rule (his bronze
  fills at 4 blows, not 6, and answers twice).

So he keeps his moves; the work is the look, the animation and the judge.

## Moveset (13 attacks; 4 strings)

| Attack | Tell (his own pose) | Answer | Punishes |
| --- | --- | --- | --- |
| Bronze Sweep | maul hauled back low on his right, the bell trailing at his heel | parry | standing at his side |
| The Hammerfall | raised straight up, up on his toes, held | roll | greed after a combo |
| The Ward Push | haft crosswise before his chest, shoulder down | parry | standing near the edge |
| Rampart Charge | head down like a bull, the bell levelled under his arm | parry | backing off |
| Backhand and Hammer | maul high over his LEFT shoulder | parry the backhand; roll the hammer | rolling early |
| Sweep and Return | the sweep's haul, then the maul lifted over his left shoulder | parry, parry | rolling away after the sweep |
| The Upswing | bell let down on the floor ahead, crouched over it | parry | standing in front |
| The Answering Toll | maul hugged upright, head bowed, shaking | roll, or be out of reach | too many blows |
| Rampart Charge (punish) | the charge, sooner | don't drink in his sight | healing |
| The Waking (woken opener) | maul swung out wide on his right, his head turned to it | roll, or be out of reach | standing close at the change |
| The Bronze Fall (woken) | crouched, the bell swung behind him | roll | keeping your distance |
| Three Tolls (woken) | over his right shoulder, then his left, then straight up | parry, parry, roll | mashing |
| The Answering Peal (woken) | the answer's hug | roll twice | too many blows |

Strings, every one broken by a counter (PLAN item 3): **Backhand and Hammer** (the backhand decides where the hammer
falls); **Sweep and Return** (the sweep carries him round, and the backhand comes straight back); **Three Tolls**, right, left, then the held fall; **the Answering Peal**, two tolls. Unparryable: the Answering Toll, the Waking and the Peal (3 of 12; the
Hammerfall, the Bronze Fall and the strings' last blows are roll only).

## Signature moments

- **Silent: the Answering Toll.** The hum at his breast swells blow by blow and rings higher; when it is full he hugs
  the maul, bows and shakes, and every bell on him rings at once. Players learn to count their blows.
- **Woken: the Waking.** At half his strength he swings the maul into his own bell-helm: the chains fall from the bell,
  its old crack lights, and the toll breaks out of him.

## Phase two

The bell is unchained and the rule tightens: his bronze fills sooner (`resonance.max` 6 to 4) and his answer rings
twice. He leaps (the Bronze Fall), strikes three tolls in a row, and comes closer (approach 0.75, kite 0.05).

## Effects

On impact (each mouth-first blow's `toll` ring and dust), the answer and the Waking (the toll's ring, the phase's
`revealBurst`). Pass 123, from his first strips in cel: the heavy wind-ups tinted his whole body orange and lit the
whole haft; now the tell sits on the bell (`edgeTell` on the `bell` slot) and his body keeps its colour. His swings
leave a thin arc at the bell with a smear (`BOSS_FX` `trail`).

## Animation

Pass 124: in-between keys (`via`) on the Sweep, the Hammerfall, Backhand and Hammer, Sweep and Return, the Upswing, the
Bronze Fall and Three Tolls: his hips and chest lead and the bell trails, then whips through; on impact his weight sinks
on. Every heave overhead goes through the pose library's `haftOverheadRaise` with a last arch (the load); the held
hammers creep through their holds (`hold.creep`). The Bronze Fall now holds its coil on the ground (the tell) and swings
the bell overhead in the air, knees tucked, instead of flipping it up from behind as it lands.
