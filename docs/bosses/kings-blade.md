# The King's Blade

The thirteenth boss through the system (`system.md`; PLAN item 6, the roster in the order players meet them). Data:
`js/data/bosses/kings-blade.js` (boss id `kingsBlade`, model `kingsBlade`); model: `tools/blender/kings_blade.py`; level:
`js/levels/still-mere.js` (Level 14). Status: pass 152, the audit and the restyle (below); awaiting Aleix's fight.

## Moveset audit (pass 152): restyle, with three moves made fair

Against the system's bars (`system.md` section 0), with Aleix's word that some bosses need a rework, not a restyle:
- **8 to 12 attacks of its own: met.** Nine distinct moves a phase, all made for it in pass 55 (its own `kb*` key poses,
  no move sources, no other boss's names). Ten entries a phase; the King's Reach is listed twice (once as the drink punish).
- **3 or 4 combos: met.** Keeping the River (three blows), the Hunger's Cuts (three), the Shield Wall, the Answer and
  Gives Ground (two each); pass 152 makes the Shield Burns a string of two.
- **One or two signature moments a phase: met.** The blade: the Oath Guard, which turns a blow into its front and
  answers with the Answer. Ember-Worn: Corvel Burns, the torch held while three blows landed make the memory refuse and
  kneel, open (a hit's `falter`); and the Torch Taken Up, the change.
- **A real phase two: met.** The guard is gone, the moveset turns over (five new moves, the fire on the shield and the
  sword), and it runs at you faster and more often.
- **`noParry` on at most a quarter of moves: missed, fixed.** Ember-Worn had four of ten unparried (the Torch Taken Up,
  Corvel Burns, the Ember Leaps, the Shield Burns), and the Shield Wall was unparried whole. Now the Ember Leaps is
  parried as it lands, the Shield Burns opens with a parried shield swing before its rolled slam, and the Shield Wall's
  cut is parried after its rolled shield run: two of ten whole attacks unparried a phase (the change and Corvel Burns).
- **Every wind-up its own: one shared, fixed.** The Ember Leaps rose into the Crown's Weight's roof, the shield over its
  head, and one of the two was parried. It now sinks low to spring, the sword trailed low behind it, point back.
- **The body check: 13 of 23 hits flagged, fixed to 0 of 24.** Most stopped dead at the strike (`NO OVERSHOOT`); the
  Hunger's Cuts' thrust over the rim was all arm. The follow-throughs now carry past the strike and every hit has its
  in-between keys (as the Kindling Tree's, pass 149); the thrust over the rim leans and turns into it.

So the verdict is a restyle: the moves are its own and they meet the bars; what failed was fairness and the motion.

## Idea

The hunger, beaten in every body it wore, in the last one it kept: the champion's burned-out memory (`STORY.md`). The only
enemy that fights the way the player does: it waits behind the round shield and answers. Past half the hunger takes the
memory and does what the champion refused at Corvel: the sword becomes the torch, the shield burns and the guard is gone.

## Silhouette

The champion's statue in the castle chapel come down off its plinth in ash: deep hood and mantle, a surcoat with the
seven-pointed crown, a great pauldron on the shield side, a long cape, all charred black, only the scarf red. No face,
two embers in its cracks. A big round shield and the King's sword, long and bright. Read from far off: the round shield
held high with a long level blade over its rim.

## Moveset

The blade (patient, behind the shield; frontal blows glance off the guard, a heavy breaks it):
- **The Oath Guard**: the shield high, the sword over its rim; it waits. Strike its front and it answers; wait it out and
  the sword comes over the rim (parry).
- **The Answer**: only ever a blow turned on the Oath Guard: the shield into you, then the sword down across.
- **Keeping the River**: across at the waist, a step and up from low, the shield driven after it (three blows).
- **The King's Reach**: drawn back at the shoulder, held; a long lunge. Also its punish when you drink in its sight.
- **The Shield Wall**: from off, a run behind the shield (roll), then a cut over it (parry).
- **The Crown's Weight**: the shield a roof over its head, the sword laid back under it, held; straight down.
- **Gives Ground**: struck, it springs back with a parting cut, then comes again with the reach.
- **The Turn**: behind it, a look over its shoulder; the sword comes round.
- **The Shield's Rim**: at its shield side, the shield swung out at you, rim first.

Ember-Worn (no guard, faster):
- **The Torch Taken Up**: the change; raised like a torch, driven into the ice, the fire running out from it (roll).
- **Corvel Burns**: the torch raised and held; land three blows and it kneels, open; otherwise the fire runs out twice.
- **The Hunger's Cuts**: the burning shield driven in, the blade over its rim, then over the shield and down across.
- **The Ember Leaps**: sunk low to spring, a leap from far off, down where you were in fire (parry as it lands).
- **The Shield Burns**: at its shield side, the burning shield swung across into you (parry), then raised and slammed
  into the ice, the fire running out round it (roll).
- Kept from the blade: the King's Reach, the Crown's Weight, Keeping the River, the Turn.

## Signature moments

- **The Oath Guard and the Answer** (the blade): the boss that blocks like the player. Hit its front and you are
  answered; break it with a heavy or go round the shield.
- **Corvel Burns** (Ember-Worn): the torch held over its head; three blows landed through it and the memory refuses
  again and kneels, the image the story ends on (`brokenPose`, every Finishing Blow that leaves it standing).

## Phase two

At half, the Torch Taken Up (it cannot be hurt through it). The guard is gone, the shield and sword burn (`ignite`), it
closes faster (`approach`, `speed`) and swings sooner (`cooldown`). Five moves of its own in place of the blade's guard
game; four of the blade's carry over.

## Effects

Steel on the blade (`BOSS_FX.kingsBlade`, element `steel`; banded as steel in cel since pass 152) with a short trail;
fire past half (`phases.emberWorn: 'fire'`), the impact rings and cracks of the torch, the Ember Leaps and the Shield
Burns on the ice. Tells: a sword blow's wind-up is told on the blade's edge (`edgeTell`, pass 152; before it a heavy
tinted the whole body), a shield blow on the shield's face (`shieldTell`, a hit's `tell: 'shield'`).

## Animation

Key poses in `ATTACK_POSES.kb*`, with the blade's angle as a `pitch` and the shield's as a `face`, worked into bone
angles by the loop after the poses. Since pass 152 that loop first carries every follow-through a fifth past the strike
(lean, bend, turn) and settles a blow that neither drops nor leans, then adds in-between keys from each hit's own poses
(`via`, all `rel`). `node tools/body-check.cjs kingsBlade`: 24 hits, 0 flagged.
