# The duel arena's ruins (pass 162, the cel look carried to the levels): the arena every Practice duel, Boss Rush fight
# and the sparring ring is fought in (js/levels/arena.js) had box pillars and box walls. These are its stones instead, cut
# for the cel bands and ink: big flat planes, chamfered edges that catch a light band, joints the ink draws, a ruin's
# irregularity (drums set a little off true, broken tops), nothing smaller than a hand. Modelled in game space (x, y up,
# z), each piece round its own base centre, placed by js/scene.js buildArena (drawing only: collision is the level's).
#   arena:column__stone   a whole column, 9 m: plinth, eight stacked drums, a capital block
#   arena:broken__stone   the same snapped at 6 m, the top drum broken off at a slant
#   arena:stump__stone    three drums and a jagged break, 2.6 m
#   arena:drum__stone     a fallen drum on its side (rubble beside the stumps)
#   arena:wall__stone     2 m of the low parapet (x along it, z through it, 0.9 m thick, 1.3 m high): two courses, a
#                         chamfered block each and a coping slab that overhangs a little on both sides
#   arena:pier__stone     a corner pier, 1.3 m square, a block higher than the wall
# Budget: under 3,000 triangles for all six.
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib; importlib.reload(snow_lib)
from snow_lib import G, new_obj, tinted
import bpy, bmesh

COL = (0.42, 0.37, 0.32)
rnd = random.Random(7)

def hull(bm, pts):
    vs = [bm.verts.new(G(*p)) for p in pts]
    r = bmesh.ops.convex_hull(bm, input=vs)
    loose = [v for v in bm.verts if not v.link_faces]
    if loose: bmesh.ops.delete(bm, geom=loose, context='VERTS')

def block(bm, cx, cz, w, d, y0, y1, ch=0.05, yaw=0.0, slant=None):
    """A chamfered block w x d (x, z) from y0 to y1, turned `yaw` round its centre; `slant`: (dx, dz, drop) breaks its
    top off at a slant, lower by `drop` toward (dx, dz)."""
    c, s = math.cos(yaw), math.sin(yaw)
    pts = []
    for (hx, hz, k) in ((w / 2, d / 2 - ch, 0), (w / 2 - ch, d / 2, 0)):
        for sx in (-1, 1):
            for sz in (-1, 1):
                x, z = sx * hx, sz * hz
                X, Z = cx + x * c - z * s, cz + x * s + z * c
                for y in (y0 + ch, y1 - ch):
                    top = y > (y0 + y1) / 2
                    if top and slant:
                        dx, dz, drop = slant
                        y = y - drop * max(0, (x * dx + z * dz) / max(w, d) + 0.5)
                    pts.append((X, y, Z))
                # the chamfer's inner ring at the top and bottom faces
                X2, Z2 = cx + x * (1 - ch / max(w, 0.1)) * c - z * (1 - ch / max(d, 0.1)) * s, cz + x * (1 - ch / max(w, 0.1)) * s + z * (1 - ch / max(d, 0.1)) * c
                pts.append((X2, y0, Z2))
                yt = y1
                if slant:
                    dx, dz, drop = slant
                    yt = y1 - drop * max(0, (x * dx + z * dz) / max(w, d) + 0.5)
                pts.append((X2, yt, Z2))
    hull(bm, pts)

def finish(name, bm):
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = new_obj(name, bm); tinted(ob, 'stone', COL)
    for p in ob.data.polygons: p.use_smooth = False
    return ob

def column(name, drums, top='capital', drop=0.0):
    bm = bmesh.new()
    block(bm, 0, 0, 1.9, 1.9, 0.0, 0.32, ch=0.08)           # plinth, two steps
    block(bm, 0, 0, 1.62, 1.62, 0.32, 0.55, ch=0.06)
    y = 0.55
    for i in range(drums):
        h = rnd.uniform(0.9, 1.08); w = 1.32 - i * 0.012
        last = i == drums - 1 and top == 'broken'
        sx = rnd.choice((-1, 1))
        block(bm, rnd.uniform(-0.05, 0.05), rnd.uniform(-0.05, 0.05), w, w, y, y + h, ch=0.07, yaw=rnd.uniform(-0.09, 0.09),
              slant=(sx * 0.8, rnd.uniform(-0.6, 0.6), drop) if last else None)
        if last:   # the break stepped, not sawn: a shard still standing on the high side, broken the other way
            block(bm, -sx * w * 0.24, rnd.uniform(-0.15, 0.15), w * 0.46, w * 0.7, y + h - drop * 0.6, y + h + 0.35, ch=0.05,
                  yaw=rnd.uniform(-0.2, 0.2), slant=(-sx * 0.6, 0.5, 0.45))
        y += h
    if top == 'capital':
        block(bm, 0, 0, 1.5, 1.5, y, y + 0.22, ch=0.05)       # echinus, then the abacus slab
        block(bm, 0, 0, 1.95, 1.95, y + 0.22, y + 0.55, ch=0.08)
        y += 0.55
    finish(name, bm)
    return y

h_col = column('arena:column__stone', 7)
h_brk = column('arena:broken__stone', 5, top='broken', drop=0.9)
h_stp = column('arena:stump__stone', 2, top='broken', drop=0.7)

bm = bmesh.new()   # a fallen drum, lying along x
block(bm, 0, 0, 1.0, 1.3, 0.0, 1.3, ch=0.07, yaw=0.0, slant=(1, 0, 0.25))
finish('arena:drum__stone', bm)

bm = bmesh.new()   # the parapet: 2 m, two courses of offset blocks, a coping slab
L, T = 2.0, 0.9
for (y0, y1) in ((0.0, 0.55), (0.55, 1.08)):   # one block a course: a joint every 2 m, the ink's one clean line, not a scatter of scratches
    block(bm, 0, rnd.uniform(-0.02, 0.02), L - 0.04, T - 0.04, y0, y1, ch=0.08)
block(bm, 0, 0, L, T + 0.14, 1.08, 1.3, ch=0.05)
finish('arena:wall__stone', bm)

bm = bmesh.new()   # a corner pier
block(bm, 0, 0, 1.3, 1.3, 0.0, 1.25, ch=0.08)
block(bm, 0, 0, 1.45, 1.45, 1.25, 1.62, ch=0.07)
block(bm, 0, 0, 1.0, 1.0, 1.62, 1.85, ch=0.06)
finish('arena:pier__stone', bm)

obs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('arena:')]
by = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs}
result = {'pieces': len(obs), 'tris': sum(by.values()), 'by': by, 'heights': [round(h_col, 2), round(h_brk, 2), round(h_stp, 2)]}
