# v7.3.1 — Easier Start

Story now shows both campaigns on one screen. Each offers New, plus Continue when a readable save exists. Tutorial: On is the default for new games; turning it off starts chapter one. Starting uses the existing graphics choice, without another picker. New only asks for confirmation when replacing a valid save, with Cancel selected first. Each campaign retains its own save slot and checkpoint format. An unreadable save offers a clearly labelled fresh start. Restricted storage still permits unsaved play.

Fullscreen begins on the first primary click or key press because browsers require user activation. It tries once per visit and respects Escape afterward. Options includes a manual fullscreen toggle. Unsupported or refused requests leave the game usable in its window. Controller-only play remains usable when the browser does not grant fullscreen activation from a gamepad.

The tutorial keeps whole sequences visible: hold and release a heavy attack, jump then attack while airborne, and make the dummy kneel then approach its front and execute. Bindings follow the active keyboard or controller. The rest step refers to its bonfire by string id. Its HUD compass rotates with the camera, shows distance, says Turn around for a fire behind the view, and shows the rest button on arrival. The world arrow stays too. The HUD only reads game state.

Automatic targeting now uses the optional, validated enemy field `autoLock: false`. Rampart Bowman, its Castle Bowman clone, and Toll Wisp keep manual targeting. Other enemies and bosses remain automatic targets even with projectile moves or a phase that adds them. This applies to continuous retargeting, first encounters and transfers after a kill. Projectile AI behavior, manual lock and target switching retain their existing rules.

Verification:

- Full browser regression suite, including Combat clarity, Story, Menus, tutorial compass and mixed melee/projectile lock-on tests.
- `node tests/fullscreen.cjs`: first click/key, respecting exit, explicit toggling, unsupported APIs and rejected requests.
- `node tests/autoquality.cjs`: Auto policy and matching VERSION / LOAD_STAMP.
- `node tests/onboarding.cjs`: actual Edge fullscreen, mouse/controller Story flow, save protection and tutorial layouts at desktop and small window sizes.
- `node tests/quality-picker.cjs`: the optional developer quality comparison remains available, while normal Story starts skip it.

The browser runners use Playwright as an optional development tool, with no runtime dependency added to the game.
