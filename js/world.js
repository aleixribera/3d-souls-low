'use strict';
// Walkable space for the current level. Every layout answers the same height questions: groundAt(x, z, y)
// (the floor a body there stands on), ceilingAt(x, z, y), floorY(x, z, y) for placements, and killY (pits).
// Hall and arena levels are flat: the floor is y = 0 everywhere.
const STEER_PROPS = new Set(['prop']), STEER_ALL = new Set(['prop', 'house', 'pillar', 'block']);
function makeWorld(def, st) {
  const flat = { groundAt: () => 0, floorY: () => 0, killY: -Infinity, traps: [], hazards: [] };
  if (def.layout === 'arena')
    return { ...flat, minX: -def.halfX, maxX: def.halfX, halfZ: def.halfZ, ceilingAt: () => Infinity, alcoves: [], gates: [], gateThickness: 0, bonfires: def.bonfires };
  if (def.layout === 'rooms') {   // `solids`: walls, rails, ledges and pillars; closed gates are added to them where needed
    const T = st.terrain, holes = [];   // floors opened since the level started (sprung traps)
    return { rooms: def.rooms, regions: T.regions, solids: st.solids, slabs: st.slabs, bonfires: def.bonfires,
             hasProps: (def.props || []).length > 0 || !!def.steer,
             // What chasing and homing enemies walk round (js/character.js): props; with the level's `steer` (v7.0) also
             // houses, pillars and blocks, so nothing presses into a ruin between it and the player.
             steerKinds: def.steer ? STEER_ALL : STEER_PROPS,
             groundAt: (x, z, y) => groundIn(T.regions, x, z, y, holes), ceilingAt: (x, z, y) => ceilingIn(T.regions, x, z, y, holes),
             floorY: (x, z, y = Infinity) => groundIn(T.regions, x, z, y, holes), killY: T.killY,
             gates: st.gates.map(g => ({ ...g, open: false, lift: 0 })),
             // state: 'set' | 'warning' | 'sprung'; timer: into the warning (s); dropTime: since it sprang (s)
             traps: st.traps.map(t => ({ ...t, state: 'set', timer: 0, dropTime: 0 })),
             // Hazard floors (v7.0): a rect on the floor at y that hurts while stood in; timer: s since the last tick
             hazards: (def.hazards || []).map(h => ({ ...h, y: h.y ?? 0, timer: 0 })),
             // A hole opens in a floor for good: bodies fall through it, and sight, bolts and the camera pass.
             openHole(region, rect) {
               holes.push({ region, rect });
               this.slabs = this.slabs.flatMap(s => s.kind !== 'floor' || s.region !== region ? [s]
                 : rectMinus([s.x0, s.x1, s.z0, s.z1], [rect]).map(q => ({ ...s, x0: q[0], x1: q[1], z0: q[2], z1: q[3] })));
             } };
  }
  return { ...flat, minX: 0, maxX: def.length, halfZ: def.halfZ, ceilingAt: () => def.wallHeight, gateThickness: def.gateThickness, bonfires: def.bonfires,
           gates: st.gates.map(g => ({ ...g, y: 0, open: false, lift: 0 })),
           alcoves: def.alcoves.map(a => ({ x0: a.x - def.alcoveWidth / 2, x1: a.x + def.alcoveWidth / 2, side: a.side, depth: def.alcoveDepth })) };
}
let world = null;
