'use strict';
// Props: solid things standing in a room level's open spaces (a level's `props: [{ kind, x, z, yaw, y }]`, js/terrain.js).
// Each kind is a list of collision boxes in its own space, x across and z forward (toward its front) from its centre,
// y up from the floor it stands on: `x` and `z` place a box's centre (default 0), `w` x `d` x `h` is its size, `y` its
// bottom (default 0). Bodies walk round props, and props stop bolts, sight and the camera wherever they are tall enough
// to meet the line: a well (lower than the eyes) hides nobody, a stall's back panel does. A prop turns by `yaw` in
// quarter turns only, so its boxes stay square to the level. Its look is in js/town.js (PROP_LOOKS), under the same name.
const PROP_KINDS = {
  fountain: { boxes: [{ w: 4.4, d: 4.4, h: 0.85 }, { w: 0.9, d: 0.9, h: 2.8 }] },   // a basin round a column
  well: { boxes: [{ w: 1.9, d: 1.9, h: 0.95 }] },
  cart: { boxes: [{ w: 2.8, d: 1.5, h: 1.3 }] },
  stall: { boxes: [{ z: 0.35, w: 3.0, d: 0.8, h: 1.05 }, { z: -0.62, w: 3.0, d: 0.26, h: 2.5 }] },   // counter in front, panel behind
  brokenStall: { boxes: [{ w: 3.0, d: 1.6, h: 0.75 }] },   // a stall smashed flat: a low heap
  crates: { boxes: [{ w: 1.7, d: 1.7, h: 1.9 }] },
  heap: { boxes: [{ w: 3.6, d: 1.4, h: 1.3 }] },   // the townsfolk's failed barricade: an overturned cart, beams and barrels
};
// A prop's collision boxes in the level: { x0, x1, z0, z1, y0, y1 }, standing on floor height y.
function propBoxes(P, y) {
  const q = Math.round((P.yaw || 0) / (Math.PI / 2)), c = Math.round(Math.cos(q * Math.PI / 2)), s = Math.round(Math.sin(q * Math.PI / 2));
  return PROP_KINDS[P.kind].boxes.map(b => {
    const lx = b.x || 0, lz = b.z || 0, cx = P.x + lx * c + lz * s, cz = P.z - lx * s + lz * c;   // Three.js rotation.y by yaw
    const hw = (c ? b.w : b.d) / 2, hd = (c ? b.d : b.w) / 2, y0 = y + (b.y || 0);
    return { x0: cx - hw, x1: cx + hw, z0: cz - hd, z1: cz + hd, y0, y1: y0 + b.h };
  });
}
