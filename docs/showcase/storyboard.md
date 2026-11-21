# The showcase in the player's view (pass 166)

Aleix (2026-11-21): "I need the showcase to not be this. I want it to be a 'player view' all the time, and there were
too many cuts/titles, keep it simple, and also add a bit of an overlay that shows that the player is not controlling the
sequence, and that it is a showcase."

This replaces the anime opening of passes 160 and 164 (authored angles, crash zooms, whip pans, Dutch tilts, slow-motion
ramps, freeze-frame name cards, kinetic words, a logo slam) and pass 164's planned second pass on it. Their code, data
and checks are gone, not switched off.

## The design

- **The player's camera, all the way.** The game's own third-person camera, locked on to the boss, exactly as in play
  (`Game.updateCamera`, run by the game's own step). The showcase never places the camera; it only snaps it behind the
  player when a fight is staged. The Finishing Blow's camera lean is the game's own.
- **The HUD a player sees.** The player's bars, the boss's bar and name, the ability slots, damage numbers and the lock
  marker stay. What speaks to someone at the controls (world hints, lessons, prompts, tips, the win banner) is hidden
  while it plays (`#hud.sc-hud`), because nobody is.
- **Few cuts.** Three fights, each on its own ground (pass 164's places). The only cut is a short fade to black
  (`fade`, 0.35 s each way) into each new fight, on a bar line. One fade in at the start, one fade out into the title.
- **The showcase overlay.** A small "Showcase" tag in the top-right corner with a red dot that breathes slowly (one
  breath in 2.4 s, steady under reduced motion), and four thin corner marks framing the picture, like a viewfinder. It is
  up the whole time but for the title. On a later showing the "Esc Skip" cap sits bottom-right for its first seconds.
- **One title.** The game's name alone on black for the last 6 beats, in the title screen's own type, placed where the
  first-launch "Press any key" gate puts it.

## Beat by beat (128 bpm, 0.469 s a beat, 62 beats = 29.1 s)

| Beats | Picture | Music |
|---|---|---|
| 0-16 | Fade in. **The Antlered Hunger in the Night Gaol**: its frenzy dashed through and countered (1), Wind Blade on key 1 (9). | The groove from the first beat. |
| 16 | Fade through black. | Toms down into it, a stab and a crash. |
| 16-32 | **Vesper in the Final Castle**: the Lunar Tempest deflected and countered (19), Ash Legion on key 4 (27). | Groove. |
| 28-32 | | The build: snare roll, riser, half a beat of silence under the fade. |
| 32-56 | Fade through black. **The King's Blade in Saltgrave**: the Hunger's Cuts dashed through (35); Keeping the River deflected (44), the counter is the **Finishing Blow**, and he falls. | The chorus: the four-chord climb and the hook. |
| 56-62 | Fade to black; **Combat Arena 3D**. | A swell, the deep hit, the last chord held. |

## Skipping

The first showing ever plays through. Every later one (each update, once a day at most, or the title's Tutorial) shows a
small key cap with "Skip" in a corner for its first seconds, and again when a key is pressed; Esc skips, as does a
controller's Start or B, and on a touch screen the cap is a button.

## Rules kept

- No flash above 3 Hz: the fades are a third of a second each way, the tag's dot breathes at 0.4 Hz, and the show's
  `glare` keeps the game's bloom and screen flashes down and its white impact frames off.
- `reducedMotion()`: the tag's dot holds still; the game's own reduced-motion rules apply to the rest.
- Nothing allocated per frame: the overlay is a few elements whose opacity is written only when it changes.
- Validated (`js/validate.js`): fights and the title on bar lines, every fight at least three fades long, the fade 0-1 s.
