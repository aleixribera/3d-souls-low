# Cataclysm's floor slabs (design/abilities/cataclysm.md): six broken flagstones the burst throws up and drops back. Each
# its own piece, modelled round its own middle so the game throws and spins it like a bone (js/legend-fx-3.js): an
# irregular broken slab 0.9 to 1.3 m across and 0.2 m thick, its top chipped at a corner (slot `stone`, flat planes for
# the cel bands), and the glowing underside it was torn from the burning floor with (slot `ember`, a thinner hull just
# under it). Named slabs:slab<n>__<slot>. Budget: under 600 triangles for all six.
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib; importlib.reload(snow_lib)
from snow_lib import G, new_obj, tinted
import bpy, bmesh

COL = {'stone': (0.29, 0.27, 0.25), 'ember': (0.9, 0.45, 0.2)}
rnd = random.Random(11)

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

for n in range(6):
    sides = rnd.randint(5, 7); r0 = rnd.uniform(0.45, 0.65); th = rnd.uniform(0.16, 0.24)
    ring = []
    for k in range(sides):
        a = (k + rnd.uniform(-0.3, 0.3)) / sides * math.tau
        r = r0 * rnd.uniform(0.75, 1.15)
        ring.append((math.cos(a) * r * 1.2, math.sin(a) * r))   # a little long, as flagstones are
    chip = rnd.randrange(sides)
    pts = []
    for k, (x, z) in enumerate(ring):
        top = th / 2 - (0.07 if k == chip else rnd.uniform(0, 0.025))   # one corner knocked off, the rest worn
        pts.append((x, top, z)); pts.append((x * 0.96, -th / 2, z * 0.96))
    hull(f'slabs:slab{n}__stone', pts, 'stone')
    hull(f'slabs:slab{n}__ember', [(x * 0.88, -th / 2 - 0.035, z * 0.88) for x, z in ring] + [(x * 0.9, -th / 2 + 0.01, z * 0.9) for x, z in ring], 'ember')

obs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('slabs:')]
by = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs}
result = {'pieces': len(obs), 'tris': sum(by.values()), 'by': by}
