# v7.15.0 — Companions on the road

Idle bots used to choose the nearest ally, including another bot, so a pair could keep each other stationary. The server also moved a companion directly behind the nearest human whenever it was 26 metres away or on another floor. Companions now receive human assignments and walk to them.

## Party assignments

In normal levels, living bots split as evenly as possible across living participating humans. Extra slots go to players closest in three dimensions to the remaining living enemies; sleeping and lurking enemies also count as the road ahead. Thus one bot goes to the front player, two bots support two players, and three bots with two players put two companions at the front and one behind. With no remaining enemy, stable player-id order breaks the tie.

Assignments use player ids, survive ordinary pose replacement and preserve slots while their quotas remain valid. They refresh every 0.5 seconds and immediately when the living roster changes. Away/stale/disconnected people already leave the simulation's participating roster. Bots never choose other bots as leaders. With no human present, the existing bot combat and persistent-lobby rules continue.

Enemy acquisition and combat take priority. Ordinary level awareness and obstacles still limit detection; following does not grant arena-wide vision.

## Walking routes

`BotNavigation` in `js/bot-navigation.js` finds routes over the world's actual floors. Layered floor nodes connect through ramps and steps, with body clearance against walls, props, rails, gates and ceilings. Samples reject pits, floor holes, rot and drops beyond eight metres. The campaigns' mandatory four-, five- and eight-metre falls remain physical falls, including their normal damage.

A bounded A* search advances 96 nodes per bot per fixed step, with a 24,000-node search limit, shared lazy geometry samples and cached edges. Completed paths replan on a clock or after the target moves. An unfinished search completes against its captured goal so a moving player cannot starve it; a subsequent search updates the goal. Closed gates, trap changes and collapsed floor slabs invalidate cached connectivity. Unreachable destinations wait and retry.

Bots begin following outside 5.5 metres and continue to approximately 2.5 metres, including along ramps. Route smoothing checks the same floors/collision metadata. Movement still goes through ordinary Player inputs and physics.

## Stuck recovery

Distance and floor height never trigger a catch-up teleport. A companion must spend eight seconds failing to move at least 0.5 metres in its one-second progress samples while free, grounded and trying to follow. Physical displacement measures progress, so walking away from the player to take a doorway is healthy movement. Fighting, jumping, falling, stun and target changes reset this clock.

Recovery requires an existing valid route and a clear landing point only one to three metres along it. It cannot skip a closed gate or bring a distant bot straight to the player. The server applies the short reposition and clears velocity; no health, stamina, flask or damage rules change.

All follow, route and recovery tuning lives in `CONFIG.bot` and is validated at startup. Browser and headless script ordering load the same navigation module.

## Validation

- `node tests/bot-follow.cjs`: all 18 ratios of one–three bots and one–six humans, front priority for a lone bot, stable identities, dead/absent humans, actual walking and inner-gap stopping, winding rooms, all Tower stair layers, rot, floor holes, gate waiting/reopening, real mandatory falls, delayed short recovery, moving targets during long searches, and routes across all 14 normal maps.
- Bot behavior and all three profiles across 12 bosses with six duel trials each (216 fights); bot integration and spectator browser checks.
- Persistent-lobby, multiplayer/campaign, boss-only, fullscreen/Auto and full solo browser regressions.

The container publishing workflow runs the new follow regression before building the release.
