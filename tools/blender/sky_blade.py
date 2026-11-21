# Sky Blade's sword (design/abilities/sky-blade.md): a plain greatsword 30 m long that forms over the boss and drops
# point-first into the floor. Modelled point down at the origin, hilt up +y, so the game plants it by its point
# (js/legend-fx-4.js). Plain and heavy, like no known sword: a 24 m blade of diamond section with a broad fuller, a
# straight cross guard, a wrapped grip and a ring pommel.
#   sword:blade__steel   the blade's body, the guard, the grip and the ring: dark steel, flat planes;
#   sword:blade__edge    what the game lights: both cutting edges and the fuller's line down each face (ember-gold, cooling
#                        from the point up once it is planted).
# Budget: under 800 triangles.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib; importlib.reload(snow_lib)
from snow_lib import G, new_obj, tube, tinted, box
import bpy, bmesh
from mathutils import Vector

COL = {'steel': (0.2, 0.2, 0.23), 'edge': (0.91, 0.77, 0.42)}
BLADE, HALF, THICK = 24.0, 1.2, 0.26

def hull(bm, pts):
    vs = [bm.verts.new(G(*p)) for p in pts]
    bmesh.ops.convex_hull(bm, input=vs)
    loose = [v for v in bm.verts if not v.link_faces]
    if loose: bmesh.ops.delete(bm, geom=loose, context='VERTS')

# ---- steel: the blade a diamond section tapering to its point, the guard, the grip, the pommel ring ------------------
bm = bmesh.new()
blade = [(0, 0, 0)]
for y, w in [(1.6, 0.7), (4.0, 1.0), (10.0, 1.12), (BLADE, HALF)]:
    blade += [(w, y, 0), (-w, y, 0), (0, y, THICK * w / HALF), (0, y, -THICK * w / HALF)]
hull(bm, blade)
g = bmesh.new()
hull(g, [(sx * 3.5, BLADE + dy, sz * 0.45) for sx in (-1, 1) for dy in (0, 0.9) for sz in (-1, 1)] + [(sx * 3.9, BLADE + 0.45, 0) for sx in (-1, 1)])
tube(g, [(0, BLADE + 0.9, 0), (0, BLADE + 5.0, 0)], [0.34, 0.3], sides=6)
ring = [(math.sin(a) * 0.95, BLADE + 6.0 + math.cos(a) * 0.95, 0) for a in [k / 12 * math.tau for k in range(13)]]
tube(g, ring, [0.24] * len(ring), sides=5, cap=False)
tube(g, [(0, BLADE + 4.9, 0), (0, BLADE + 5.15, 0)], [0.45, 0.45], sides=6)
me = bpy.data.meshes.new('tmp'); g.to_mesh(me); g.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
steel = new_obj('sword:blade__steel', bm); tinted(steel, 'steel', COL['steel'])

# ---- edge: thin bars along both edges, and the fuller's line on each face -------------------------------------------
bm = bmesh.new()
for s in (-1, 1):
    tube(bm, [(0, 0.05, 0), (s * 0.71, 1.6, 0), (s * 1.01, 4.0, 0), (s * 1.13, 10.0, 0), (s * (HALF + 0.01), BLADE - 0.05, 0)], [0.07, 0.09, 0.1, 0.1, 0.1], sides=4)
    tube(bm, [(0, 3.0, s * 0.2), (0, 10.0, s * THICK * 1.12 / HALF + s * 0.005), (0, BLADE - 0.8, s * (THICK + 0.005))], [0.05, 0.16, 0.18], sides=4, ovals=[(1, 0.25)] * 3)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
edge = new_obj('sword:blade__edge', bm); tinted(edge, 'edge', COL['edge'])

for ob in (steel, edge):
    for p in ob.data.polygons: p.use_smooth = False

obs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('sword:')]
by = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs}
result = {'pieces': len(obs), 'tris': sum(by.values()), 'by': by}
