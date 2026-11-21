# The showcase as an anime opening (pass 160)

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

## Beat-by-beat (128 bpm, 0.469 s a beat, 64 beats = 30.0 s)

| Beats | Picture | Music |
|---|---|---|
| 0-4 | **Cold open.** The Antlered Hunger already mid-fight, its **Starving Frenzy** dashed through blow by blow. Letterbox bars. Cuts on the riff's hits: 0 face (the boss looming), 1.5 low, 3 over. | Three unison hits (0, 1.5, 3) over silence, a tom fill on 3.5. |
| 4-6 | The bars snap open: **freeze card 1, The Antlered Hunger**, on the counter. Ink and gold, speed lines, the name slammed in. | Break: one hit, its tail, a swell back in. |
| 6-12 | The groove. Wind Blade (key 1) at 8 from a crane; the bot's own fighting. Cuts 6 behind, 8 crane, 10 wide. | The groove drops in: kick, backbeat snare, hats, bass, ostinato. |
| 12-14 | Cut to **Gemini, Neon High**, face on. | Groove. |
| 14-16 | Its **Lunar Tempest**: the first blow deflected; **freeze card 2** on the parry's spark, ink and violet. | Break on the parry. |
| 16-24 | The other blows deflected, the counter; the bot's own fighting. Cuts 16 over, 18 low, 20 wide, 22 behind. | Groove, fuller. |
| 24-26 | Hard cut to the **Giant Skeleton** squared up to the player: **freeze card 3**, ink and ember. | Break. |
| 26-32 | Its **Claw** deflected (29), the counter. Cuts 26 crane, 27 wide, 29 low, 31 over. | Groove. |
| 32-34 | Hard cut to **The King's Blade** facing the player: **freeze card 4**, ink and red. | Break. |
| 34-40 | **The Hunger's Cuts** dashed through (36), the counter (his guard cracks). Cuts every beat from 36. | Pre-chorus: snare roll, riser, half a beat of silence at 39.5. |
| 40-46 | **The drop: Ash Legion** (key 4). One white ink frame on 40, the phantom army charging through him. Cuts 40 behind, 42 over (the judge's weakest moment was a crane here: tiny figures on bare floor), 44 low. | Chorus: the full band, a lead hook, a four-chord climb. |
| 46-56 | **Keeping the River** deflected (50), the counter is the **Finishing Blow**. | Chorus. |
| 56-60 | The blow's own cuts; he falls. Cuts 56 crane, 58 fallen. | Hits on the blow's steps. |
| 60-64 | **Title slam** on the victor: freeze, ink, speed lines, the game's name slammed in. | The last chord, a deep hit, held. |

Each new fight is staged at its card's freeze, and the last fight's sparks and star flares are cleared with it (they age
in real time, so a freeze would hold them glaring over the new boss).

## Skipping

The first showing ever plays through. Every later one (each update, once a day at most, or the title's Tutorial) shows a
small key cap with "Skip" in a corner for its first seconds, and again when a key is pressed; Esc skips, as does a
controller's Start or B, and on a touch screen the cap is a button.

## Rules kept

- No flash above 3 Hz: two white ink frames in the whole show (beats 40 and 60), nine seconds apart. Cuts are not flashes.
- `reducedMotion()`: no white frames, speed lines still and not flickering, cards fade in instead of slamming.
- Nothing allocated per frame: the speed lines are a fixed set of numbers drawn into one canvas.
