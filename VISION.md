# Vision

What Combat Arena 3D is, in Aleix's words. This file wins over everything else in the folder. The director edits it
only with Aleix's OK.

## What binds

- Aleix's words are the truth: this file, his feedback in `.claude/feedback.md`, and his answers recorded in
  `PLAN.md`. Everything else agents wrote (`AGENTS.md`, the story file, docs, notes, earlier passes' code) is a draft,
  not a rule.
- Agents may change key parts of the game from the ground up (enemies, bosses, levels, systems) as long as the result
  follows this vision.
- An agent has full authority over whatever it works on: enemy and boss balance, numbers, timing windows, attack
  frequency, anything. Weak foundations get fixed or rebuilt, never built on.

## The bar

The game must feel AAA in quality and polish, run on a toaster, be fun and challenging, and give the rush that makes
players want to keep coming back. The end result must be excellent.

## The game

A Souls-like in the browser that Aleix plays with his friends, who are new to the genre. It has two main modes, built
side by side, and each should feel like the main event.

- **Story**, alone: one road through a dark world, chapter by chapter. It keeps growing until Aleix says it's done.
  Progression is the player's own skill, a few more flasks along the way, and harder enemies. No levelling, no stat
  sheet.
- **Boss Rush**, with friends, the lobby's default. It has to play well and be fun and challenging. An endless run of
  bosses: the first fights bring the easier bosses, then the whole roster opens up, and they get harder fight after
  fight, their modifiers shown on screen. Difficulty grows exponentially with the fights won, but subtly: fairly easy
  at first, slowly more challenging for a good while, until it becomes genuinely impossible. It depends only on how
  far the run has got, never on team size: no enemy or boss gets stronger because more players (or newer players)
  joined. Between fights, blessings: common ones are small; rare ones are exciting (skills,
  passives, things that change the fight, maybe a companion). Like a true roguelike, an ability offered again can be
  taken to upgrade it, level by level, so a run builds up. Upgrades happen inside the game, during the run, not in a
  menu between runs. It's multiplayer, so one player's abilities don't affect the other players too much: no
  slowing, moving, linking or taking over a teammate's fight. Players stack strong abilities, and the difficulty curve is
  balanced with that in mind. Playing earns levels; each level gives a crate, opened
  on the end-of-run screen, with a small chance of something cool that joins your pool for later runs. A small
  Collection page shows what you own. No money and no shop: menus are not where the game is played.
- **The crates** must be addictive: players play again just to open the next one. Opening one is a roll, like the old
  CS case opening (a strip of rewards spinning past and slowing onto one). One reward per crate, shown with its name,
  description and everything it does. The crates look great: cool animations, cool effects, all of it.
- **Practice**: one small, fast mode to fight any enemy or boss (one or several, or bosses against each other) or start
  any level. Aleix uses it to test. In the lobby, the leader has a small Mode option for Single, Double, Triple and
  Quad Boss runs.

## How it should feel

- **Fair but challenging.** Every attack, the fast ones included, shows clearly that it's coming and can be dodged on
  its tell. Nothing hits without warning. Each of a boss's attacks has its own wind-up, so players rarely mistake one
  attack for another.
- **Spectacular bosses.** Each boss is its own idea, with its own meaning and backstory, its own moveset, big effects
  and high-quality animation. No two bosses share attacks. Don't hold back on boss effects.
- **Exceptional models,** the big bosses most of all: the best detail and art direction.
- **Smooth animation.** No hard edges: motion follows smooth curves with real-world acceleration and easing.
- **A compelling story,** told in whatever way works best, without ever taking control from the player: movement and
  the camera are always theirs.
- **Learn from the best.** Take what works and what is acclaimed in popular, praised games (Dark Souls 1-3,
  Bloodborne, Sekiro, Lies of P, Elden Ring and others): attack patterns, combos, boss and level design, UI. Build our
  own version of the core idea. Ideas and mechanics only, never their names, characters, looks or story.
- **The UI** fits the game's dark tone, is easy to use and looks great. Plain English in menus, the HUD and end screens.
- **Smooth on integrated graphics:** at least 60 fps on the Normal preset. Two presets: Normal for everyone, Ultra for
  Aleix's PC. Models may be as detailed as they need to be within that. No preset ever renders below 100% render
  scale (it looks terrible): find the speed elsewhere. Normal has all of Ultra's cool effects, just toned down
  slightly so they run as well as possible on low-end PCs. Lighting is baked for everything: levels, boss arenas,
  Boss Rush, every preset.

## Rules

- Every character is a real Blender model, with Claude-only textures and no stock-AI UI (Aleix's `~/.claude/CLAUDE.md`).
- A new model or boss is seen working in a preview, standing and through every attack, and judged on whether it will
  work in the game.
- Everything is original. The Elden Ring bosses and the Lands Between leave the game (Aleix, 2026-11-13).
- The story and its levels aren't fixed. Many levels were built long ago and some have clear flaws: they are weak
  foundations, and a pass working near one should see that and improve, redesign or rework it. Replacing a level
  with one built from zero is allowed when it's really needed, but it isn't the norm and never the default choice.
- Story saves may be dropped when the story changes a lot, with a line in the changelog. Otherwise they keep working.
- Screen flashes stay under 3 a second.
