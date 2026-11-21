# The shade clone, the summon of the Shade Host legendary (design/abilities/shade-host.md): the holder's silhouette in
# black ink, not their mesh. The wanderer's own pieces (tools/blender/wanderer.py, run here with the prefix "shade:") so
# hood, scarf, cape and round shield read as the player from any side, every piece of a bone fused into one flat plate
# of ink (`ink`; the scarf too, so the clone is one stroke of black), its plates kept coarser than the Ember Twin's
# (brush planes, not a body), then dry-brush splits laid along the surface (`split`: long pale-grey strokes, straighter
# than the twin's cracks, as a brush running dry leaves) and two ember points in the hood's dark (`eye`). One rigid mesh
# per game bone, named shade:<bone>__<slot>, on the wanderer's bones (MODEL_DEFS.shadeClone extends it), so the player's
# own key poses and the cape's cloth springs drive it. The game draws it in cel ink (js/legend-fx-2.js): ink flat and
# black under a hard ember rim, the splits grey, the eyes ember. Budget: about 3,000 triangles with the splits.
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, new_obj, blob, tinted
import bpy, bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'wanderer.py'), encoding='utf8').read()
src = src.replace('begin(COL)', "begin(COL, prefix='shade:')").replace('result = tally()', '')
exec(compile(src, 'wanderer.py', 'exec'), {'__name__': 'wanderer_for_shade'})

COL = {'ink': (0.03, 0.03, 0.04), 'split': (0.32, 0.31, 0.34), 'eye': (1.0, 0.6, 0.3)}
rnd = random.Random(31)
KEEP = 0.2   # of the wanderer's triangles each plate keeps: flat brush planes

# ---- fuse each bone's pieces into its ink plate (the scarf in it too) ---------------------------------------
groups = {}
for ob in list(figure_lib.pieces):
    bone, slot = ob.name[len('shade:'):].split('__')
    slot = 'ink'
    groups.setdefault((bone, slot), []).append(ob)
fused = {}
for (bone, slot), obs in groups.items():
    bm = bmesh.new()
    for ob in obs:
        tmp = bmesh.new(); tmp.from_mesh(ob.data); tmp.transform(ob.matrix_world)
        m = bpy.data.meshes.new('tmp'); tmp.to_mesh(m); tmp.free(); bm.from_mesh(m); bpy.data.meshes.remove(m)
        bpy.data.objects.remove(ob, do_unlink=True)
    name = f'shade:{bone}__{slot}'
    out = new_obj(name, bm); tinted(out, slot, COL[slot])
    tris = sum(len(p.vertices) - 2 for p in out.data.polygons)
    figure_lib.keep_tris(out, max(40, int(tris * KEEP)))   # a silhouette of plates, not the wanderer's every fold
    for p in out.data.polygons: p.use_smooth = False   # flat planes: the cel bands break on them like brush strokes
    fused[(bone, slot)] = out

# ---- the splits: long dry-brush strokes walked over each plate's surface, nearly straight ---------------------------------------------
CRACKS = {'chest': 7, 'spin': 4, 'head': 3, 'armL': 2, 'armR': 2, 'legL': 2, 'legR': 2, 'capeA': 4, 'capeB': 4, 'capeC': 5}
def faces_by_area(me):
    polys = list(me.polygons); total = sum(p.area for p in polys); acc, out = 0.0, []
    for p in polys: acc += p.area / total; out.append((acc, p))
    return out
def pick(table):
    r = rnd.random()
    for acc, p in table:
        if acc >= r: return p
    return table[-1][1]
made = {}
for bone, n in CRACKS.items():
    ob = fused.get((bone, 'ink'))
    if not ob: continue
    me = ob.data; bvh = BVHTree.FromObject(ob, bpy.context.evaluated_depsgraph_get()); table = faces_by_area(me)
    bm = bmesh.new()
    for _ in range(n):
        f = pick(table); p = Vector(f.center); nrm = Vector(f.normal)
        t = nrm.cross(Vector((0, 0, 1)));
        if t.length < 1e-3: t = nrm.cross(Vector((1, 0, 0)))
        t.normalize(); pts = [(p, nrm)]
        steps = rnd.randint(6, 10)
        for k in range(steps):
            t = (t + nrm.cross(t) * rnd.uniform(-0.15, 0.15)).normalized()   # a brush stroke bends little
            q, qn, _, _ = bvh.find_nearest(p + t * 0.032)
            if q is None or qn.normalized().dot(nrm) < 0.5: break   # never over a thin edge onto the far face
            p, nrm = q, qn.normalized(); pts.append((p, nrm))
            t = (t - nrm * t.dot(nrm)).normalized()
        if len(pts) < 3: continue
        verts = []
        for i, (q, qn) in enumerate(pts):
            a = pts[max(i - 1, 0)][0]; b = pts[min(i + 1, len(pts) - 1)][0]
            d = (b - a); d = d.normalized() if d.length > 1e-6 else Vector((1, 0, 0))
            side = d.cross(qn).normalized(); w = 0.012 * (1 - 0.8 * (i / (len(pts) - 1)))   # full where the brush lands, dry at its end
            c = q + qn * 0.004
            verts.append((bm.verts.new(c - side * w), bm.verts.new(c + side * w), qn))
        for i in range(len(verts) - 1):
            a0, a1, qn = verts[i]; b0, b1, _ = verts[i + 1]
            f = bm.faces.new((a0, a1, b1, b0)); f.normal_update()
            if f.normal.dot(qn) < 0: f.normal_flip()
    out = new_obj(f'shade:{bone}__split', bm); tinted(out, 'split', COL['split']); made[bone] = out

# ---- two ember points in the hood's dark --------------------------------------------------------------------------
bm = bmesh.new()
for s in (-1, 1): blob(bm, (s * .038, 1.755, .128), .013, (1.4, .8, .7), 1)
eye = new_obj('shade:head__eye', bm); tinted(eye, 'eye', COL['eye'])

obs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('shade:')]
by = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs}
result = {'pieces': len(obs), 'tris': sum(by.values()), 'names': sorted(by)}
