# The showcase as an anime opening (passes 160 and 164)

Aleix (2026-11-21): "Completely redesign it, it should make the player excited about the game." Direction: an anime
opening, in the cel look. Ideas and patterns only: no names, looks or music of the references reach the game.

## References and what they share

Openings studied for their editing (from memory of the cuts; no clip is kept in the repo):

1. **Kill la Kill, OP1**: every major character introduced by a freeze frame and a name card in huge heavy type that
   fills half the frame; the card slams in on a drum hit and holds for about a bar.
2. **Persona 5's animated opening**: a strict palette (black, white, one accent colour), the frame dropping to two tones
   on each character beat, hard cuts on every downbeat, typography as a graphic element.
3. **Jujutsu Kaisen, OP1**: a cold open of short detail cuts over a sparse riff, then the beat drops and the cuts lock to
   it; silhouettes and speed lines around a fight pose; the title lands on the chorus.
4. **Demon Slayer, OP1**: action cut on the beat through the verse, one big technique as the chorus peak (a full-screen
   effect with a white flash), the title card held over the last chord.
5. **Guilty Gear Strive's opening cinematic**: fighter by fighter, each a few seconds of action ending in a frozen pose with
   their name slammed across it; speed lines and an impact frame on each hit; the logo slam at the end.

### The patterns

- **Cut rhythm**: one cut per beat or every two beats once the drums are in; the cold open cuts on the riff's accents
  instead, with silence between. A cut always lands on a drum hit.
- **Freeze-frame name cards**: the action stops dead at its peak (a wind-up, an impact), the frame drops to ink and one
  accent colour, speed lines close in, and the name slams in big. About two beats, then the action resumes mid-motion.
- **The break**: under a freeze the music cuts out to one hit and its tail, so the restart hits harder.
- **Speed lines and impact frames**: radial lines on freezes and the climax; a single white ink frame on the biggest hit.
- **A build to a climax**: cuts tighten (one a beat), a snare roll and a riser, a half-beat of silence, then the drop:
  the chorus and the biggest technique together.
- **The final title hit**: the last blow, a freeze on the fallen foe, the title slammed over it on the last chord.

## Where ours departs

The default would be a highlight reel of fights with a logo at the end (what the old showcase was). Ours keeps the
engine live (seeded, deterministic) and turns its fixed step into the opening's grammar: a freeze is the simulation
held while the camera and the ink overlay keep moving, so every card is a real frame of the game, not a drawing.
What would prove it wrong: a judge naming the cards or the freezes as the weakest moment (too static, or the duotone
hides the models).

## Pass 164: from a reel to an opening

Aleix (2026-11-21): "Why did the showcase video look almost like the old one? ... make it spectacular, polished,
engaging." Pass 160 had changed the overlay and the music but kept the old camera: two small fighters on the bare Arena
floor, seen from a crane. What reads as an opening is the camera and the places, so pass 164 changed those:

- **Authored cinematography.** Close-ups on a bone of a body (`part`: the boss's head, the blade hand, the blade's tip,
  the player's helm) from a distance scaled to the body's height; low hero angles that fill the frame (`fit` 0.8);
  Dutch angles (`roll`, turning by `spin`), crash zooms (`zoom`: the lens slams in from wider in 0.1 s) and whip pans
  (`whip`: the shot arrives swung off and snaps onto its subject in 0.12 s, with streaks).
- **Time ramps.** `ramps`: the game runs slowed (0.3) while the camera and music run on, and snaps back to full speed on
  a hit: the cold open's frenzy crawling in, the dash on its snap, the Giant's claw, the King's Blade's last blow.
- **Each boss on its own ground.** A fight's `ground` is a Story level's boss room (read only: where its boss waits):
  the Hunger in the Night Gaol, Vesper in the Final Castle, the Giant in the Ember Root, the King's Blade in
  Saltgrave (pale grounds, the Torn Abbey and the Still Mere, washed the frame out). Every ground is built once behind the loading screen, so the hard cut to it costs a frame.
- **Kinetic type.** `words`: a field of the fight's colour over the whole frame and one heavy word slammed edge to edge
  (Dash, Counter, Finish), three quarters of a beat each, on the music's stabs. They hide the cut to the next ground.
- **Light kept off white.** The judge's note on pass 160 was glare: bloom and flashes washing the frame white. `glare`
  turns the bloom down and its threshold up for the show, scales screen flashes down, and replaces the white impact frame
  with a dark ink one.
- **The title's own beat.** At `title.dark` the action is cut away to an empty ink frame and half a beat of silence; the
  logo then slams in part by part on three hits (an outlined COMBAT, a solid ARENA, a red stamped 3D), over red rays.

## Beat-by-beat (128 bpm, 0.469 s a beat, 64 beats = 30.0 s)

| Beats | Picture | Music |
|---|---|---|
| 0-4 | **Cold open, Night Gaol.** The Hunger's eyes in close-up as its frenzy crawls in slowed; the blade hand in a crash zoom; a low hero angle snapping to speed on the dash; a whip pan back onto its eyes. | Hits over silence; a swell over each ramp and a hit on its snap. |
| 4-6 | **Freeze card 1, The Antlered Hunger**: ink and gold, speed lines, the name slammed in. | Break. |
| 6-12 | The groove. The frenzy's last blows dashed through (its slow motion stretched it): the blade's tip, the boss from below, the helm, the counter at 11. | Groove drops in. |
| 11.25-12 | **DASH**: kinetic type in gold; under it the cut to the Final Castle. | A stab. |
| 12-16 | Vesper's eyes; its **Lunar Tempest**, **freeze card 2** on the parry's spark. | Break on the parry. |
| 16-24 | The other blows deflected, the counter: blade, low orbit, helm. Wind Blade (key 1) at 20 from a low push-in on the caster, then the boss from below; a whip pan. | Groove. |
| 23.25-24 | **COUNTER**, ember. Cut to the Ember Root. | Stab. |
| 24-32 | **Freeze card 3**, the Giant; its claw met in slow motion (28) and deflected on the snap (29). | Swell and snap hit. |
| 31.25-32 | **FINISH**, red. Cut to Saltgrave. | Stab. |
| 32-40 | **Freeze card 4**, the King's Blade; the Hunger's Cuts dashed through at 36, a cut a beat. | Pre-chorus build. |
| 40-46 | **The drop: Ash Legion** (key 4) and one dark ink impact frame. | Chorus. |
| 46-59 | Keeping the River met in slow motion (49) and deflected; the counter is the **Finishing Blow**; he falls. | Chorus. |
| 59.5-64 | **The title's own beat**: cut to ink and silence, then the logo slams in on three hits and holds. | Silence, swell, three hits, the last chord. |

## Skipping

The first showing ever plays through. Every later one (each update, once a day at most, or the title's Tutorial) shows a
small key cap with "Skip" in a corner for its first seconds, and again when a key is pressed; Esc skips, as does a
controller's Start or B, and on a touch screen the cap is a button.

## Rules kept

- No flash above 3 Hz: one dark ink impact frame in the whole show (beat 40), no white one. Cuts are not flashes; a
  kinetic word is held at least 1/3 s and comes 1/3 s or more from another word or an impact frame (validated).
- No HUD: the key cap of pass 160 is gone (the judge's biggest giveaway); only the small skip cap, on later showings.
- `reducedMotion()`: no impact frame, no crash zoom, whip pan or turning roll; speed lines still; cards, words and the
  logo fade in (and words out) instead of slamming.
- Nothing allocated per frame: the speed lines are a fixed set of numbers drawn into one canvas.
