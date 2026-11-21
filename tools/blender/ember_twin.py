# The Ember Twin, the summon of the Ember Twin legendary (design/abilities/ember-twin.md): the holder's silhouette, not
# their mesh. The wanderer's own pieces (tools/blender/wanderer.py, run here with the prefix "twin:") so hood, scarf,
# cape and the round shield read as the player from any side, every piece of a bone fused into one plate of ash
# (`ash`), the scarf its own slot (`scarf`), then split by cracks of ember light laid on the surface (`crack`) and two
# ember points in the dark of the hood (`eye`). One rigid mesh per game bone, named twin:<bone>__<slot>, on the wanderer's
# bones (MODEL_DEFS.emberTwin extends it), so the player's own key poses and the cape's cloth springs drive it unchanged.
# The game draws it in cel ink (js/ability-fx.js): ash flat and dark under a hard ember rim, the cracks and eyes white-hot.
# Budget: about 4,000 triangles with the cracks.
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, new_obj, blob, tinted
import bpy, bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'wanderer.py'), encoding='utf8').read()
src = src.replace('begin(COL)', "begin(COL, prefix='twin:')").replace('result = tally()', '')
exec(compile(src, 'wanderer.py', 'exec'), {'__name__': 'wanderer_for_twin'})

COL = {'ash': (0.07, 0.065, 0.06), 'scarf': (0.25, 0.07, 0.05), 'crack': (1.0, 0.85, 0.6), 'eye': (1.0, 0.6, 0.3)}
rnd = random.Random(23)
KEEP = 0.27   # of the wanderer's triangles each plate keeps

# ---- fuse each bone's pieces into its ash plate (the scarf stays its own slot) ---------------------------------------
groups = {}
for ob in list(figure_lib.pieces):
    bone, slot = ob.name[len('twin:'):].split('__')
    slot = 'scarf' if slot.startswith('scarf') else 'ash'
    groups.setdefault((bone, slot), []).append(ob)
fused = {}
for (bone, slot), obs in groups.items():
    bm = bmesh.new()
    for ob in obs:
        tmp = bmesh.new(); tmp.from_mesh(ob.data); tmp.transform(ob.matrix_world)
        m = bpy.data.meshes.new('tmp'); tmp.to_mesh(m); tmp.free(); bm.from_mesh(m); bpy.data.meshes.remove(m)
        bpy.data.objects.remove(ob, do_unlink=True)
    name = f'twin:{bone}__{slot}'
    out = new_obj(name, bm); tinted(out, slot, COL[slot])
    tris = sum(len(p.vertices) - 2 for p in out.data.polygons)
    figure_lib.keep_tris(out, max(40, int(tris * KEEP)))   # a silhouette of plates, not the wanderer's every fold
    for p in out.data.polygons: p.use_smooth = True
    fused[(bone, slot)] = out

# ---- the cracks: jagged ribbons of light walked over each plate's surface ---------------------------------------------
CRACKS = {'chest': 12, 'spin': 7, 'head': 4, 'armL': 3, 'armR': 3, 'elbowL': 3, 'elbowR': 3, 'legL': 3, 'legR': 3,
          'kneeL': 3, 'kneeR': 3, 'capeA': 5, 'capeB': 5, 'capeC': 4}
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
    ob = fused.get((bone, 'ash'))
    if not ob: continue
    me = ob.data; bvh = BVHTree.FromObject(ob, bpy.context.evaluated_depsgraph_get()); table = faces_by_area(me)
    bm = bmesh.new()
    for _ in range(n):
        f = pick(table); p = Vector(f.center); nrm = Vector(f.normal)
        t = nrm.cross(Vector((0, 0, 1)));
        if t.length < 1e-3: t = nrm.cross(Vector((1, 0, 0)))
        t.normalize(); pts = [(p, nrm)]
        steps = rnd.randint(5, 8)
        for k in range(steps):
            t = (t + nrm.cross(t) * rnd.uniform(-0.9, 0.9)).normalized()
            q, qn, _, _ = bvh.find_nearest(p + t * 0.032)
            if q is None: break
            p, nrm = q, qn.normalized(); pts.append((p, nrm))
            t = (t - nrm * t.dot(nrm)).normalized()
        if len(pts) < 3: continue
        verts = []
        for i, (q, qn) in enumerate(pts):
            a = pts[max(i - 1, 0)][0]; b = pts[min(i + 1, len(pts) - 1)][0]
            d = (b - a); d = d.normalized() if d.length > 1e-6 else Vector((1, 0, 0))
            side = d.cross(qn).normalized(); w = 0.018 * (1 - 0.7 * abs(2 * i / (len(pts) - 1) - 1))   # thin at both ends
            c = q + qn * 0.004
            verts.append((bm.verts.new(c - side * w), bm.verts.new(c + side * w), qn))
        for i in range(len(verts) - 1):
            a0, a1, qn = verts[i]; b0, b1, _ = verts[i + 1]
            f = bm.faces.new((a0, a1, b1, b0)); f.normal_update()
            if f.normal.dot(qn) < 0: f.normal_flip()
    out = new_obj(f'twin:{bone}__crack', bm); tinted(out, 'crack', COL['crack']); made[bone] = out

# ---- two ember points in the hood's dark --------------------------------------------------------------------------
bm = bmesh.new()
for s in (-1, 1): blob(bm, (s * .038, 1.755, .128), .013, (1.4, .8, .7), 1)
eye = new_obj('twin:head__eye', bm); tinted(eye, 'eye', COL['eye'])

obs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('twin:')]
by = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs}
result = {'pieces': len(obs), 'tris': sum(by.values()), 'names': sorted(by)}
