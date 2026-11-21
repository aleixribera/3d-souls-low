# Frozen Lotus's flower (design/abilities/frozen-lotus.md): a lotus of ice 7 m across that blooms under the boss, its
# petals spearing up through it. Three kinds of piece, each modelled at its own root so the game can place and drive it
# like a bone (js/legend-fx-3.js): a spear petal of the inner ring (root at the floor, point up +y, 4 m), a cupped petal
# of the outer ring (root at the flower's middle, lying out along +x to 3.4 m) and the crown at the middle. Every piece
# is a faceted hull (flat planes, so the cel bands break across them like cut ice) in slot `ice`, with thin ridges along
# its facet edges in slot `edge` (ember in the game: the legendary's colour caught in the ice). The game draws ice
# translucent pale blue in two bands inside a black ink rim. Budget: under 1,500 triangles for all three kinds.
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib; importlib.reload(snow_lib)
from snow_lib import G, new_obj, tube, tinted
import bpy, bmesh
from mathutils import Vector

COL = {'ice': (0.81, 0.91, 0.96), 'edge': (0.9, 0.6, 0.36)}
rnd = random.Random(7)

def hull(name, pts, slot):
    bm = bmesh.new()
    vs = [bm.verts.new(G(*p)) for p in pts]
    bmesh.ops.convex_hull(bm, input=vs)
    loose = [v for v in bm.verts if not v.link_faces]
    if loose: bmesh.ops.delete(bm, geom=loose, context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = new_obj(name, bm); tinted(ob, slot, COL[slot])
    for p in ob.data.polygons: p.use_smooth = False
    return ob

def ridges(name, lines, r=0.03):
    bm = bmesh.new()
    for pts in lines: tube(bm, pts, [r] * len(pts), sides=3)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = new_obj(name, bm); tinted(ob, 'edge', COL['edge'])
    for p in ob.data.polygons: p.use_smooth = False
    return ob

# ---- the spear petal: a diamond section swelling from the root, its point 4 m up, a little twist ---------------------
spear, lines = [], [[], [], [], []]
for y, w, d in [(0.0, 0.32, 0.22), (0.5, 0.5, 0.34), (1.3, 0.56, 0.38), (2.4, 0.4, 0.27), (3.3, 0.2, 0.14)]:
    tw = y * 0.08
    for k, (sx, sz) in enumerate([(1, 0), (0, 1), (-1, 0), (0, -1)]):
        x, z = sx * w, sz * d
        c, s = math.cos(tw), math.sin(tw)
        p = (x * c - z * s, y, x * s + z * c)
        spear.append(p); lines[k].append(Vector(p) * 1.015)
spear.append((0.0, 4.0, 0.0))
for l in lines: l.append(Vector((0.0, 4.0, 0.0)))
hull('lotus:spear__ice', spear, 'ice')
ridges('lotus:spear__edge', lines)

# ---- the outer petal: cupped, broad in its middle, its tip lifted; a keel under it -----------------------------------
L, outer = 3.4, []
for t, w, up in [(0.0, 0.2, 0.0), (0.25, 0.75, 0.2), (0.55, 0.85, 0.42), (0.8, 0.55, 0.72), (1.0, 0.0, 1.0)]:
    x = t * L
    for s in (-1, 1): outer.append((x, up + 0.18 * abs(s) * (w > 0) , s * w))
    outer.append((x, up + 0.28 if w else up, 0.0))   # the ridge down its middle
    outer.append((x, up - 0.12 if t < 1 else up, 0.0))   # its keel
ob = hull('lotus:outer__ice', outer, 'ice')
mid = [Vector((t * L, (0.0 if t == 0 else [0.2, 0.42, 0.72, 1.0][[0.25, 0.55, 0.8, 1.0].index(t)]) + (0.29 if t < 1 else 0.01), 0)) for t in (0.0, 0.25, 0.55, 0.8, 1.0)]
rim = [[Vector((t * L, up + 0.19, s * w * 1.01)) for t, w, up in [(0.0, 0.2, 0.0), (0.25, 0.75, 0.2), (0.55, 0.85, 0.42), (0.8, 0.55, 0.72)]] + [Vector((L, 1.0, 0))] for s in (-1, 1)]
ridges('lotus:outer__edge', [mid] + rim, 0.035)

# ---- the crown: a low ring of small faceted points round the middle ---------------------------------------------------
crown = []
for k in range(10):
    a = k / 10 * math.tau
    for r, y in [(0.95, 0.0), (0.7, 0.55 + 0.25 * (k % 2)), (0.3, 0.75)]:
        crown.append((math.cos(a + (0.3 if r < 0.9 else 0)) * r, y, math.sin(a + (0.3 if r < 0.9 else 0)) * r))
hull('lotus:crown__ice', crown, 'ice')
ridges('lotus:crown__edge', [[Vector((math.cos(a) * 0.96, 0.02, math.sin(a) * 0.96)) for a in [k / 16 * math.tau for k in range(17)]]], 0.04)

obs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('lotus:')]
by = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs}
result = {'pieces': len(obs), 'tris': sum(by.values()), 'by': by}
