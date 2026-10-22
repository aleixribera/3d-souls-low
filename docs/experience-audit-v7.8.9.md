# Experience audit — v7.8.9

Audited locally on 22 October 2026 from the clean v7.8.8 checkout. The starting full game suite passed 280/280. The work focused on failures and friction at the boundaries of play: menus, focus changes, browser permissions, persistent progress and graphics transitions.

## Identity and scope

Ashmere and the Lands Between retain their level content, canonical lore, NPCs, endings, bosses and progression. Attack timings, enemy choices, damage, stamina, executions and the fixed simulation step are unchanged. The title keeps its black, white and gold treatment; the world keeps its procedural models, atmosphere and preset budgets. No build step or runtime dependency was added.

## Findings and fixes

| Finding | Result |
| --- | --- |
| Descriptions and navigation hints overlapped in short landscape windows; the title could exceed narrow windows. | Menus reserve space for their footer, reduce the title and spacing in short windows, and keep the selected action visible. Descriptions and hints have clearer contrast; button targets are larger. |
| Tab was suppressed, arrow selection did not move browser focus, and Space could activate a different button. | One focusable button tracks the selected action. Tab/Shift+Tab wrap, arrows navigate, Home/End jump through long lists, and Space activates the focused action once. Menus and their descriptions have accessible labels. |
| Control/Command/Alt shortcuts could also activate game controls. | Modified browser shortcuts and composing text bypass game input. Existing unmodified movement and combat bindings remain intact. |
| Blur cleared held keys but retained pending presses, the player's queued action and controller state. | Losing focus clears pending controls and pauses solo play, including the tutorial. Returning requires Resume. Controller buttons and sticks must return to neutral before acting again. Online simulation continues with personal inputs cleared. |
| A rejected promise from pointer capture could become an unhandled error and keep swallowing mouse attacks. | The capture click stays harmless. Rejected or unsupported capture falls back to normal mouse attacks on subsequent clicks; keyboard and controller controls remain available. |
| Camera spring motion had an option, but impact shake did not. | Camera shake has an independent saved option. Disabling it suppresses new shakes and existing shake offsets without changing impact, damage, timing or other feedback. |
| Unvalidated options could inject invalid numbers/types into camera, HUD or sound settings. Invalid saved graphics could skip Auto. | Known settings are validated individually, numeric values are bounded to supported steps, valid preferences are kept, and invalid graphics recover through measured Auto. Hitboxes default off; existing saved choices are preserved. |
| A syntactically valid checkpoint containing `inventory.flask: null` passed the shallow check, then crashed during Continue. | Inventory records and capacities, progress containers, completion and timestamps are checked before offering Continue. Malformed saves follow the existing broken-save flow. Valid unknown progress fields and separate campaign slots are retained. |
| Failed checkpoint writes were silent during play. | A brief event-driven notice reports a failed write once until storage recovers. The story remains playable; no repeated warning is added to each save attempt. |
| Low → High followed by rebuilding a level with an NPC could leave `GL_INVALID_VALUE` during shader/resource cleanup. | Loading now completes r160's lazy initialization of prepared shader variants before retired rigs are disposed. The regression keeps WebGL diagnostics enabled and checks preset changes plus subsequent level replacement without clearing errors between them. Low's surface shader also initializes its return value explicitly, retaining its one-sample path. |

## Verification

`tests/experience.cjs` checks invalid, absent and refused settings storage; valid preference preservation and bounds; suspended controller input; nested checkpoint corruption; unknown progress preservation; and save-failure notification deduplication/recovery.

`tests/experience-browser.cjs` exercises real Tab, Shift+Tab, arrow, Home, End and Space input; shortcut handling; every menu item across seven window sizes (320 × 568 through 1920 × 1080, including 640 × 360 and 844 × 390); solo focus loss and deliberate resume; held controller input on return; asynchronous pointer-lock refusal; independent camera shake; actual Low/High/Ultra rendering and level replacement; and online focus loss. Captures are saved to `.scratch/experience/`.

The existing full solo suite passed **280/280**, alongside the delayed-client multiplayer browser suite, lobby polish, controller, tutorial/onboarding, quality picker, fullscreen and Auto checks. Server checks cover shared simulation, transport, load, leader expiry, lobby continuity, boss progression, team wipes, campaign progression and deployment rollback. Auto now has 17 policy fixtures, including four malformed saved choices. The container workflow also runs the new persistence/input recovery fixtures.

Browser validation is local Windows/Edge. Publishing follows the repository's version tag and container workflow; the workflow separately checks the actual Linux container before publishing the versioned and latest images. Updating the running homelab is a separate deployment step.
