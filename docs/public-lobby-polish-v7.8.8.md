# Public lobby audit and polish — v7.8.8

Audited locally on 22 October 2026, from initial connection through campaigns, boss runs, spectating, recovery and return to the lobby.

## Changes

The previous lobby placed a twelve-row controls reference above the adventure selector. At 1280 × 720 the card needed scrolling; in a 390-pixel window the adventure and Start action were entirely below the visible area. The new lobby puts the adventure, a brief explanation and the primary action first. A separate party area provides names, leadership and capacity; party management and the controls reference expand only when requested. Empty notices and unavailable run actions take no space.

The layout follows the game's charcoal and gold palette, with a restrained entrance animation, visible focus outlines and reduced-motion support. A running adventure makes Return to game the primary action. Guests see an explanation of the leader's role and their own return action. Options is available before starting and during a run, and both Back and Escape return to the correct lobby.

| Area | Findings and resulting behavior |
| --- | --- |
| Joining and recovery | Failed requests have readable connection feedback and a Try again action; incompatible versions offer Reload game. Leaving still cancels automatic retries. Ping is available in the lobby rather than occupying the combat HUD. |
| Menus and hierarchy | The primary action stays visible without first reading controls. Run actions appear during a run. The mode description follows the selected adventure. Online pause menus explicitly say the world keeps running. |
| Party management | Player count includes capacity. Long names truncate visually while retaining their full tooltip/accessibility label. Make leader and Remove are available through Manage party. Blank name edits retain the current name. |
| Keyboard and controller | Tab/Shift+Tab stay inside the dialog. Hidden/disabled controls are excluded. Roster refreshes preserve keyboard selection and controller focus. The controller name keyboard uses the full card width. Help dismisses before Escape leaves the lobby. |
| Gameplay HUD | Compact chapter/boss progress and allied health replace repeated lobby/pause copy. Party UI and world labels hide during menus, loading, openings and credits. Fallen-player labels and the watched teammate's own nameplate stay hidden. FPS defaults off; saved preferences still apply. |
| Guidance | Rest and Talk use their actual separate bindings. Online help names the lobby shortcut instead of promising a personal restart; menu and chapter-completion copy reflect shared play. Victory instructions survive device changes, including the final boss's return to the lobby. Gauntlet death copy explains the team-wipe rule. The initial 30-second control tips continue counting across automatic chapters/bosses instead of replaying over every encounter. |
| Audio | Lobby and spectator actions use existing event-driven menu sounds. Spectator distance/panning and enemy footsteps follow the watched teammate; death muffling clears while watching. Returning to a menu with no player restores the normal audio filter. Volume and hidden-tab suspension remain intact. |
| Animation and drawing | Teammate walk cycles interpolate between received poses. Nameplate projection reuses a vector, and allied-health DOM work runs with received frames rather than every render. Combat timing, enemy telegraphs, execution ownership and damage authority are unchanged. |
| Graphics | Existing Low/High/Ultra budgets remain in force. Live preset switching is checked without leaving the shared run. Low retains its inexpensive surface path. Auto's benchmark clears errors left by earlier WebGL draws before measuring, so those errors cannot falsely fail the new graphics check; errors during the check still reject it. |
| Shared progression | Both campaigns, ordered boss runs, loading barriers, grace periods, refills, deaths, endings, leader handoff, checkpoints and late joins retain their existing server ownership. Co-op never writes solo saves. |

## Verification

The full game suite passed **280/280**. The lobby, controller, spectator, opening, recovery, campaign, arena-wipe and multiplayer browser checks passed, as did all listed server/transport fixtures, fullscreen checks and 13/13 Auto policy fixtures. Both campaigns were completed online: five Ashmere chapters and eight Lands Between chapters, including endings and late join. The focused lobby checks confirmed error-free live Low → High → Ultra → Low rendering, full-party layout and primary-action visibility from 320 × 568 through 1920 × 1080, including short landscape windows.

`tests/lobby-polish-browser.cjs` covers desktop, narrow and short-window layouts, a full party, optional help/management, keyboard focus, idle/running Options, device changes, HUD visibility, live graphics changes, spectator audio, failed connections and incompatible-version recovery. Screenshots are written to `.scratch/lobby-polish/`.

Regression coverage includes:

- Server/transport: `net-timing`, `network-load`, `multiplayer`, `lobby-leader`, `lobby-continuity`, `multiplayer-campaign`, `boss-only`, `arena-wipe`.
- Browser flows: `lobby-controller-browser`, `boss-only-browser`, `spectator-browser`, `run-intro-browser`, `reconnect-browser`, `campaign-browser`, `arena-wipe-browser`, `multiplayer-browser` (including the full solo suite). Run `campaign-browser` normally for the Lands Between and with `ARENA_CAMPAIGN=ashmere` for all five Ashmere chapters, ending and late join.
- Graphics/fullscreen policy: `fullscreen`, `autoquality`, plus renderer and audio checks in the full browser suite.

These are local automated browser/server checks, with visual inspection of captured screens. They do not establish public-host latency, internet reliability, physical-controller behavior or subjective speaker/headphone quality. No remote deployment or image publication is part of this change.
