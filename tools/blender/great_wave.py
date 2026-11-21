# Great Wave's crest (design/abilities/great-wave.md): one curling wave 12 m wide and 9 m tall, crashing toward +z. The
# game drives it like a bone (js/legend-fx-4.js): it rises out of the floor leaning back, surges forward and curls,
# then flattens as it crashes (scaled and turned about its root at the floor's middle). The spec's shape key (rising,
# curled, crashed) is this pose plus that drive: the packed format holds still meshes only.
# Three pieces, each one slot, flat planes so the cel bands break across them like painted water:
#   wave:body__deep   the water's body: a closed curl profile (back, crest, lip, barrel, face) swept across its width,
#                     its crest and lip swelling and falling along it so it never reads as an extruded prism;
#   wave:band__mid    a lighter band laid just proud of the face, between the barrel and the foot;
#   wave:foam__foam   the foam: a rope along the lip and five claws curling forward and down off it.
# The game draws the deep body indigo, the band blue, the foam white, each in two bands inside a black ink rim.
# Budget: under 2,500 triangles for all three.
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib; importlib.reload(snow_lib)
from snow_lib import G, new_obj, tube, tinted
import bpy, bmesh
from mathutils import Vector

COL = {'deep': (0.12, 0.16, 0.36), 'mid': (0.17, 0.37, 0.54), 'foam': (0.95, 0.96, 0.98)}
W, SEG = 12.0, 16

def shape(u):
    """The crest's profile at u (-1..1 across its width): (z, y) points of a closed loop, back foot first, round over the
    crest and lip, in under the barrel, down the face to the front foot. Taller and further curled in the middle."""
    k = 1 - 0.28 * u * u + 0.06 * math.sin(u * 7.0)
    lip = 1 + 0.18 * math.cos(u * 4.2)
    return [(-2.4, 0.0), (-2.1, 2.8 * k), (-1.4, 5.9 * k), (-0.2, 8.4 * k), (1.1, 9.0 * k), (2.5 * lip, 8.5 * k),
            (3.4 * lip, 7.3 * k), (3.5 * lip, 6.2 * k), (2.9 * lip, 6.5 * k), (2.0, 7.2 * k), (1.1, 6.6 * k),
            (0.7, 5.0 * k), (0.9, 3.0 * k), (1.6, 1.2 * k), (2.8, 0.0)]

def profile_at(i):
    u = i / SEG * 2 - 1
    return u * W / 2, shape(u)

# ---- the body: the profile swept across the width, capped at both ends --------------------------------------------
bm = bmesh.new(); rings = []
for i in range(SEG + 1):
    x, pts = profile_at(i)
    rings.append([bm.verts.new(G(x, y, z)) for z, y in pts])
n = len(rings[0])
for r0, r1 in zip(rings, rings[1:]):
    for k in range(n):
        m = (k + 1) % n
        bm.faces.new((r0[k], r0[m], r1[m], r1[k]))
bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
body = new_obj('wave:body__deep', bm); tinted(body, 'deep', COL['deep'])

# ---- the band: a strip just proud of the face (profile points 11 to 13), its own thin slab ---------------------------
bm = bmesh.new(); outer, inner = [], []
for i in range(1, SEG):
    x, pts = profile_at(i)
    face = [pts[11], pts[12], pts[13]]
    outer.append([bm.verts.new(G(x, y, z + 0.09)) for z, y in face])
    inner.append([bm.verts.new(G(x, y, z - 0.05)) for z, y in face])
for j in range(len(outer) - 1):
    for k in range(2):
        bm.faces.new((outer[j][k], outer[j][k + 1], outer[j + 1][k + 1], outer[j + 1][k]))
        bm.faces.new((inner[j][k], inner[j + 1][k], inner[j + 1][k + 1], inner[j][k + 1]))
    for k in (0, 2):
        bm.faces.new((outer[j][k], outer[j + 1][k], inner[j + 1][k], inner[j][k]))
for j in (0, len(outer) - 1):
    for k in range(2):
        bm.faces.new((outer[j][k], inner[j][k], inner[j][k + 1], outer[j][k + 1]))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
band = new_obj('wave:band__mid', bm); tinted(band, 'mid', COL['mid'])

# ---- the foam: a rope along the lip, five claws curling forward and down off it ---------------------------------------
bm = bmesh.new()
lip = []
for i in range(SEG + 1):
    x, pts = profile_at(i)
    z, y = pts[6]; lip.append((x * 0.98, y + 0.15, z + 0.1))
tube(bm, lip, [0.34 + 0.08 * math.sin(i * 1.7) for i in range(len(lip))], sides=5)
for c in range(5):
    u = (c + 0.5) / 5 * 2 - 1
    x = u * W / 2 * 0.92
    z0, y0 = shape(u)[6]
    hook = [(x, y0 + 0.2, z0 - 0.2), (x + 0.15, y0 + 0.5, z0 + 0.8), (x + 0.25, y0 - 0.1, z0 + 1.6), (x + 0.3, y0 - 1.1, z0 + 1.8), (x + 0.32, y0 - 1.9, z0 + 1.3)]
    tube(bm, hook, [0.55, 0.5, 0.36, 0.2, 0.04], sides=5)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
foam = new_obj('wave:foam__foam', bm); tinted(foam, 'foam', COL['foam'])

for ob in (body, band, foam):
    for p in ob.data.polygons: p.use_smooth = False

obs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('wave:')]
by = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs}
result = {'pieces': len(obs), 'tris': sum(by.values()), 'by': by}
