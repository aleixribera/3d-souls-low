# Phoenix Dive's firebird (design/abilities/phoenix-dive.md): about 5 m from beak to tail tip, a 6 m span, the body the
# player becomes for the dives. Hard flat planes: a swept head and body, two wings of four long feather blades each, a
# tail of five streamers 3 m long. The packed format holds still meshes, so the spec's bones are pieces, each modelled
# at its own pivot for the game to turn like a bone (js/legend-fx-4.js): the body at its middle (beak toward +z), each
# wing at its shoulder (the right along +x, the left along -x), the tail at its root (streaming toward -z).
# Each piece in two slots: `ember` the outer faces, `core` the white-hot inner faces (a thinner hull inside the body, the
# inner vane of each feather); the game draws them in the effect's cel shader inside a black ink rim.
#   phoenix:body__ember, phoenix:body__core, phoenix:wingR__ember, phoenix:wingR__core, phoenix:wingL__ember,
#   phoenix:wingL__core, phoenix:tail__ember, phoenix:tail__core
# Budget: under 1,500 triangles for all eight.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib; importlib.reload(snow_lib)
from snow_lib import G, new_obj, tinted
import bpy, bmesh

COL = {'ember': (0.9, 0.6, 0.36), 'core': (1.0, 0.95, 0.85)}

def hulls(name, slot, groups):
    bm = bmesh.new()
    for pts in groups:
        g = bmesh.new()
        vs = [g.verts.new(G(*p)) for p in pts]
        bmesh.ops.convex_hull(g, input=vs)
        loose = [v for v in g.verts if not v.link_faces]
        if loose: bmesh.ops.delete(g, geom=loose, context='VERTS')
        me = bpy.data.meshes.new('tmp'); g.to_mesh(me); g.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = new_obj(name, bm); tinted(ob, slot, COL[slot])
    for p in ob.data.polygons: p.use_smooth = False
    return ob

def section(z, w, h, y=0.0, k=1.0):
    """A diamond section of the body at z: w wide, h tall, centred at height y, scaled by k."""
    return [(w * k, y, z), (-w * k, y, z), (0, y + h * k, z), (0, y - h * 0.8 * k, z)]

# ---- the body: the head swept back from its beak, a crest of three blades, the chest, narrowing to the tail root ------
def body(k):
    beak = [(0, 0.18 * k, 2.2), (0.06 * k, 0.22, 1.9), (-0.06 * k, 0.22, 1.9)]
    head = section(1.65, 0.24, 0.26, 0.24, k) + section(1.25, 0.3, 0.3, 0.2, k)
    chest = section(0.7, 0.5, 0.42, 0.0, k) + section(0.0, 0.46, 0.36, 0.0, k) + section(-0.7, 0.22, 0.2, 0.05, k)
    groups = [beak + head, section(1.25, 0.3, 0.3, 0.2, k) + chest]
    if k == 1:
        for i, a in enumerate((-0.35, 0, 0.35)):   # the crest: three blades swept back off the crown
            groups.append([(0, 0.45, 1.5), (math.sin(a) * 0.12 + 0.03, 0.5, 1.3), (math.sin(a) * 0.12 - 0.03, 0.5, 1.3),
                           (math.sin(a) * 0.5, 1.0 - 0.15 * i % 2, 0.55)])
    return groups
hulls('phoenix:body__ember', 'ember', body(1.0))
hulls('phoenix:body__core', 'core', [[(x * 0.9, y * 0.9 - 0.13, z * 0.97) for x, y, z in g] for g in body(1.0)[:2]])   # lower and narrower: pokes out under the ember hull, the white-hot belly and throat

# ---- a wing: four long feather blades fanned from the shoulder, swept back, each with a white inner vane ---------------
def wing(side, slot):
    groups = []
    root = [(0, 0.08, 0.35), (0, -0.08, 0.35), (0, 0.06, -0.3), (0, -0.06, -0.3), (side * 0.9, 0.05, 0.25), (side * 0.9, -0.05, -0.2)]
    if slot == 'ember': groups.append(root)
    for f in range(4):
        sweep = 0.15 + f * 0.28   # each blade further back
        L = 3.0 - f * 0.35
        tip = (side * L * math.cos(sweep), 0.25 - f * 0.1, -L * math.sin(sweep) + 0.1)
        base = (side * 0.7, 0, 0.15 - f * 0.17)
        wdt = 0.24 - f * 0.02
        if slot == 'ember':
            groups.append([(base[0], 0.05, base[2] + wdt), (base[0], -0.05, base[2] - wdt), (base[0], 0.05, base[2] - wdt),
                           ((base[0] + tip[0]) / 2, tip[1] / 2 + 0.04, (base[2] + tip[2]) / 2 + wdt * 0.8),
                           ((base[0] + tip[0]) / 2, tip[1] / 2 - 0.04, (base[2] + tip[2]) / 2 - wdt * 0.8), tip])
        else:   # the inner vane: a thin sliver along the blade's leading half, a hair above it
            m = ((base[0] + tip[0]) / 2, tip[1] / 2, (base[2] + tip[2]) / 2)
            groups.append([(base[0] * 1.1, 0.1, base[2] + wdt * 0.5), (base[0] * 1.1, 0.06, base[2]), (m[0], m[1] + 0.12, m[2] + wdt * 0.55),
                           (m[0], m[1] + 0.08, m[2]), (tip[0] * 0.85, tip[1] * 0.85 + 0.09, tip[2] * 0.85)])
    return groups
for side, n in ((1, 'R'), (-1, 'L')):
    hulls(f'phoenix:wing{n}__ember', 'ember', wing(side, 'ember'))
    hulls(f'phoenix:wing{n}__core', 'core', wing(side, 'core'))

# ---- the tail: five streamers 3 m long fanned behind, each a flat blade with a white spine -----------------------------
def tail(slot):
    groups = []
    for s in range(5):
        a = (s - 2) * 0.22
        L = 3.0 - abs(s - 2) * 0.3
        tip = (math.sin(a) * L, -0.25 - 0.1 * abs(s - 2), -L * math.cos(a))
        if slot == 'ember':
            groups.append([(0.08, 0.05, 0), (-0.08, -0.05, 0), (math.sin(a) * L * 0.6 + 0.16, tip[1] * 0.6 + 0.03, tip[2] * 0.6),
                           (math.sin(a) * L * 0.6 - 0.16, tip[1] * 0.6 - 0.03, tip[2] * 0.6), tip])
        else:
            groups.append([(0.03, 0.08, -0.1), (-0.03, 0.06, -0.1), (math.sin(a) * L * 0.7, tip[1] * 0.7 + 0.07, tip[2] * 0.7), (tip[0] * 0.9, tip[1] * 0.9 + 0.05, tip[2] * 0.9)])
    return groups
hulls('phoenix:tail__ember', 'ember', tail('ember'))
hulls('phoenix:tail__core', 'core', tail('core'))

obs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('phoenix:')]
by = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs}
result = {'pieces': len(obs), 'tris': sum(by.values()), 'by': by}
