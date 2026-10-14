# Roadmap

Where the game is going. Read with [RULES.md](RULES.md). Build one step at a time, verify it works, commit, then move on.

## Vision

- **A polished vertical slice** that ends with a final boss. The structure must still scale to 20+ levels, or much bigger ones.
- **Platform:** desktop browser, with keyboard and mouse plus gamepad.
- **No stats, no souls, no saves.** Difficulty comes from new enemy mechanics that change how fights play, never from bigger numbers.
- **Fixed player kit.** The player grows only in skill.
- **Dying costs nothing beyond lost ground.** You respawn at the last bonfire with full flasks.
- **Playing stays simple:** double-click one HTML file.

## Combat direction

- **Attack tokens:** only a limited number of enemies attack at once (set per level, default 2). The rest circle to the player's sides and back, and swap in as the fight changes. Applies to every enemy.
- **Roll-only attacks:** cannot be blocked or parried. The weapon glows a different colour than the usual red wind-up, with a brief faint flash on the ground. New enemies only.
- **Lunges:** gap-closing dashes from mid range, and swings that keep tracking the player. New enemies only.

## Structure

- **Two modes:**
  - *Story:* every level in order, with a title card and a line of lore between them. Finishable in one sitting.
  - *All Levels:* pick any level.
- **Levels gain height** (stairs, ramps, drops) **and open areas**. Distant lights and enemies switch off to keep performance up.
- **Code is split into classic script files.** One tiny module loads Three.js r160, then loads the game files in order. This keeps double-click launching working.

## Steps

Each step is small and verified before the next.

1. [x] Split the single file into classic scripts (still launched from one HTML file).
2. [x] Gamepad support (standard Souls layout: RB light, RT heavy, LB block, LT parry, B roll, A jump, right stick click lock-on, right stick flick switch, X flask, Y rest, Start pause).
3. [x] Death refills flasks; remove souls and bloodstains.
4. [ ] Attack tokens and surrounding.
5. [ ] Roll-only attacks and lunges, as systems tested on test enemies.
6. [ ] New enemies that use them.
7. [ ] Height: stairs, ramps, drops.
8. [ ] Open areas, plus switching off distant lights and enemies.
9. [ ] Story and All Levels modes, with title cards.
10. [ ] Levels 3–5 and a final boss.
