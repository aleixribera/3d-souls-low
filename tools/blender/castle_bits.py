# Castle set pieces (pass 172, the Story levels redone in cel): Saltgrave's main yard and ward were bare but for banner
# strips, and the Final Castle's field before the gate wide and empty (docs/story/audit.md). Two pieces, cut for the cel
# bands and ink (flat facets, every edge a clean silhouette), built in a prop's own space round its base centre: x across,
# y up, z forward (toward its front). js/town.js PROP_LOOKS draws them; the collision is js/data/props.js PROP_KINDS.
#   gibbet: the Gaoler King's law on the road to his gate: a squared post on a stone footing, an arm braced off it, and
#           an iron cage hanging on a chain from the arm's end (over x +1.35).
#   rack:   a garrison's weapon rack: two A-frame trestles and their bars, six spears leaning on it, a round shield at its foot.
# Slots: castle-bits:gibbet__stone  gibbet__wood  gibbet__iron   castle-bits:rack__wood  rack__iron
# Budget: under 1,200 triangles for the five.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib; importlib.reload(snow_lib)
from snow_lib import G, new_obj, tinted, box
import bmesh
from mathutils import Vector

def beam(bm, a, b, w, d=None, up=(0, 1, 0)):
    """A square-section beam from point a to point b (game space), w wide and d deep, its faces out."""
    d = d or w
    A, B = Vector(a), Vector(b); ax = (B - A).normalized()
    u = Vector(up); u = (u - ax * u.dot(ax)); u = u.normalized() if u.length > 1e-6 else Vector((1, 0, 0))
    v = ax.cross(u).normalized()
    if abs(ax.y) > 0.99: u, v = Vector((1, 0, 0)), Vector((0, 0, 1))
    corners = [(-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2), (-w / 2, d / 2)]
    lo = [bm.verts.new(G(*(A + u * cu + v * cv))) for (cu, cv) in corners]
    hi = [bm.verts.new(G(*(B + u * cu + v * cv))) for (cu, cv) in corners]
    for k in range(4):
        m = (k + 1) % 4; bm.faces.new((lo[k], lo[m], hi[m], hi[k]))
    bm.faces.new(list(reversed(lo))); bm.faces.new(hi)

def spike(bm, base, tip, r, sides=4):
    """A pyramid head from a ring of radius r at base to a point at tip."""
    B, T = Vector(base), Vector(tip); ax = (T - B).normalized()
    u = Vector((1, 0, 0)) if abs(ax.x) < 0.9 else Vector((0, 0, 1)); u = (u - ax * u.dot(ax)).normalized(); v = ax.cross(u)
    ring = [bm.verts.new(G(*(B + (u * math.cos(k / sides * math.tau) + v * math.sin(k / sides * math.tau)) * r))) for k in range(sides)]
    t = bm.verts.new(G(*T))
    for k in range(sides): bm.faces.new((ring[k], ring[(k + 1) % sides], t))
    bm.faces.new(list(reversed(ring)))

def disc(bm, centre, normal, r, t, sides=8):
    """A flat round plate (a shield) of radius r and thickness t, facing `normal`."""
    C, n = Vector(centre), Vector(normal).normalized()
    u = Vector((0, 1, 0)); u = (u - n * u.dot(n)).normalized(); v = n.cross(u)
    ring = lambda off: [bm.verts.new(G(*(C + n * off + (u * math.cos(k / sides * math.tau) + v * math.sin(k / sides * math.tau)) * r))) for k in range(sides)]
    a, b = ring(-t / 2), ring(t / 2)
    for k in range(sides):
        m = (k + 1) % sides; bm.faces.new((a[k], a[m], b[m], b[k]))
    bm.faces.new(list(reversed(a))); bm.faces.new(b)

def finish(name, bm, slot, rgb):
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = new_obj(name, bm); tinted(ob, slot, rgb)
    for p in ob.data.polygons: p.use_smooth = False
    return ob

# ---- the gibbet ---------------------------------------------------------------------------------------------------
bm = bmesh.new()   # a stepped stone footing
box(bm, -0.55, 0.55, 0.0, 0.22, -0.55, 0.55)
box(bm, -0.42, 0.42, 0.22, 0.42, -0.42, 0.42)
finish('castle-bits:gibbet__stone', bm, 'stone', (0.55, 0.52, 0.48))

CX, TOP = 1.35, 3.95
bm = bmesh.new()   # the post, the arm, its brace, and a cap on the post
box(bm, -0.15, 0.15, 0.42, 4.25, -0.15, 0.15)
box(bm, -0.15, CX + 0.25, TOP - 0.12, TOP + 0.12, -0.11, 0.11)
beam(bm, (0.1, 3.05, 0.0), (0.95, TOP - 0.08, 0.0), 0.13, 0.13, up=(0, 0, 1))
box(bm, -0.2, 0.2, 4.25, 4.35, -0.2, 0.2)
finish('castle-bits:gibbet__wood', bm, 'wood', (0.25, 0.18, 0.12))

bm = bmesh.new()   # the chain, and the cage: two hoops, eight bars, a domed top to the ring at the chain
y0, y1, R = 1.45, 2.85, 0.38
beam(bm, (CX, TOP - 0.12, 0.0), (CX, y1 + 0.32, 0.0), 0.05, 0.05, up=(0, 0, 1))
pts = lambda y, r: [(CX + r * math.cos(k / 8 * math.tau), y, r * math.sin(k / 8 * math.tau)) for k in range(8)]
lo, hi, crown = pts(y0, R), pts(y1, R), (CX, y1 + 0.34, 0.0)
for k in range(8):
    m = (k + 1) % 8
    beam(bm, lo[k], lo[m], 0.06, 0.06); beam(bm, hi[k], hi[m], 0.06, 0.06)
    beam(bm, lo[k], hi[k], 0.045, 0.045, up=(0, 0, 1))
    if k % 2 == 0: beam(bm, hi[k], crown, 0.045, 0.045, up=(0, 0, 1))
box(bm, CX - R, CX + R, y0 - 0.06, y0, -R, R)   # its iron floor
finish('castle-bits:gibbet__iron', bm, 'iron', (0.22, 0.22, 0.24))

# ---- the weapon rack ----------------------------------------------------------------------------------------------
bm = bmesh.new()   # two A-frames, the top bar, a foot bar, the shield at its foot
for s in (-1, 1):
    beam(bm, (s * 1.3, 0.0, -0.42), (s * 1.3, 1.62, 0.0), 0.1, 0.1, up=(1, 0, 0))
    beam(bm, (s * 1.3, 0.0, 0.42), (s * 1.3, 1.62, 0.0), 0.1, 0.1, up=(1, 0, 0))
box(bm, -1.45, 1.45, 1.48, 1.62, -0.06, 0.06)
box(bm, -1.4, 1.4, 0.3, 0.4, -0.28, -0.2)
disc(bm, (0.85, 0.46, 0.5), (0.25, 0.35, 1.0), 0.44, 0.05)
finish('castle-bits:rack__wood', bm, 'wood', (0.36, 0.26, 0.16))

bm = bmesh.new()   # six spears leaning on the top bar, their heads and butts; the shield's boss and rim band
for k, x in enumerate((-1.0, -0.6, -0.2, 0.2, 0.6, 1.0)):
    lean = 0.08 if k % 2 else -0.06
    base, top = (x + lean, 0.0, 0.5), (x - lean, 2.35, -0.32)
    beam(bm, base, top, 0.05, 0.05)
    d = Vector(top) - Vector(base); d.normalize()
    spike(bm, top, tuple(Vector(top) + d * 0.32), 0.07)
disc(bm, (0.85 + 0.25 * 0.04, 0.46 + 0.35 * 0.04, 0.5 + 0.04), (0.25, 0.35, 1.0), 0.12, 0.05, sides=6)
finish('castle-bits:rack__iron', bm, 'iron', (0.6, 0.6, 0.62))

import bpy
obs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('castle-bits:')]
by = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs}
result = {'pieces': len(obs), 'tris': sum(by.values()), 'by': by}
