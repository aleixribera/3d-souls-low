# Colossus's ember giant (design/abilities/colossus.md): an armoured warrior 20 m tall standing, of which the game
# raises only the upper body out of the floor (about 12 m shows, waist to helm). Hard planes, no fine detail: it is
# seen huge and briefly. The packed format holds still meshes, so the spec's bones are pieces, each modelled at its own
# pivot for the game to turn like a bone (js/legend-fx-5.js):
#   colossus:body__plate, colossus:body__seam   the torso from the waist (origin) up: hips, chest, pauldrons, closed
#                                               helm with two eye slits; facing +z.
#   colossus:arms__plate, colossus:arms__seam   both arms holding the sword two-handed, modelled about the chest pivot
#                                               (the game puts it 8.5 m up the body and turns it for the stance, the
#                                               wind-up and the horizontal cut).
#   colossus:sword__fire, colossus:sword__core  the fire sword in the same arms frame: hilt in the hands, a 16 m blade
#                                               forward along +z; `core` its white-hot middle.
# Slots: `plate` ash-black plates, `seam` the molten seams (white-hot lines along the plates' joints, the eye slits),
# drawn by the game in its cel shader inside a black ink rim. Budget: under 3,000 triangles for all six.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib; importlib.reload(snow_lib)
from snow_lib import G, new_obj, tinted
import bpy, bmesh

COL = {'plate': (0.16, 0.14, 0.13), 'seam': (1.0, 0.92, 0.75), 'fire': (0.9, 0.6, 0.36), 'core': (1.0, 0.95, 0.85)}

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

def ring(y, w, d, x=0.0, z=0.0, n=6):
    """A flat-sided ring of n points at height y: w half-wide, d half-deep."""
    return [(x + math.cos(i / n * math.pi * 2) * w, y, z + math.sin(i / n * math.pi * 2) * d) for i in range(n)]

def bar(a, b, r):
    """A square bar from a to b, r half-thick: a seam line or a limb."""
    return [(a[0] + dx, a[1] + dy, a[2] + dz) for dx in (-r, r) for dy in (-r, r) for dz in (-r, r)][:4] + \
           [(b[0] + dx, b[1] + dy, b[2] + dz) for dx in (-r, r) for dy in (-r, r) for dz in (-r, r)][4:] + \
           [(a[0] - r, a[1] + r, a[2] + r), (a[0] + r, a[1] - r, a[2] - r), (b[0] - r, b[1] - r, b[2] - r), (b[0] + r, b[1] + r, b[2] + r)]

# ---- the body: hip plates, a chest in two broad plates, pauldrons, a gorget, the closed helm with a crest ------------
body = [
    ring(0.0, 2.2, 1.5) + ring(2.6, 2.4, 1.7),                         # the hips and belly
    ring(2.4, 2.5, 1.75) + ring(6.4, 3.9, 2.4) + ring(8.6, 3.4, 2.0),   # the chest, broad at the top
    ring(8.4, 1.4, 1.2) + ring(9.6, 1.2, 1.0),                         # the gorget
    ring(9.4, 1.35, 1.45, z=0.15, n=8) + ring(11.4, 1.3, 1.4, z=0.1, n=8) + [(0, 12.4, 0.0), (0, 11.0, 1.75)],   # the helm, a ridge down the face
    [(0, 11.9, -0.6), (0.18, 12.2, -1.4), (-0.18, 12.2, -1.4), (0, 13.4, -2.6), (0, 12.6, 0.4)],   # the crest blade swept back
]
for s in (1, -1):   # pauldrons: three stacked plates over each shoulder
    for k in range(3):
        y = 8.6 - k * 0.9
        body.append([(s * 2.6, y + 0.5, 1.6), (s * 2.6, y + 0.5, -1.6), (s * (4.4 + k * 0.3), y - 0.4, 1.4), (s * (4.4 + k * 0.3), y - 0.4, -1.4),
                     (s * 3.4, y + 0.9, 0), (s * 2.8, y - 0.3, 0)])
hulls('colossus:body__plate', 'plate', body)

# The seams: the molten lines where the plates meet, standing a hair proud of them, and the two eye slits.
seam = []
for y, w, d in [(2.5, 2.52, 1.77), (5.2, 3.48, 2.24), (8.5, 3.44, 2.04)]:   # bands round the body
    pts = ring(y, w, d, n=8)
    for i in range(8):
        a, b = pts[i], pts[(i + 1) % 8]
        if i in (5, 6, 7) and y > 5: continue   # broken at the back, as a forge seam would be
        seam.append(bar(a, b, 0.09))
seam.append(bar((0, 2.6, 1.95), (0, 8.4, 2.1), 0.1))   # down the sternum
for s in (1, -1):
    seam.append([(s * 0.25, 10.75, 1.5), (s * 0.95, 10.95, 1.32), (s * 0.95, 10.75, 1.32), (s * 0.25, 10.95, 1.5), (s * 0.6, 10.85, 1.46)])   # an eye slit
    seam.append(bar((s * 2.7, 8.95, 1.0), (s * 4.5, 8.0, 1.0), 0.08))   # the pauldron's edge
hulls('colossus:body__seam', 'seam', seam)

# ---- the arms about the chest pivot: shoulders out to each side, both hands meeting forward and down on the grip -------
HANDS = (0.5, -2.6, 3.2)
arms = []
for s in (1, -1):
    sh = (s * 3.4, 0.0, 0.0)
    el = (s * 3.2, -2.6, 1.4)
    hand = (HANDS[0] + s * 0.55, HANDS[1], HANDS[2])
    arms.append(ring(0.4, 1.2, 1.1, x=sh[0]) + ring(-1.0, 1.0, 0.95, x=sh[0]))                # the upper arm's plate
    arms.append([(el[0] + dx, el[1] + dy, el[2] + dz) for dx, dy, dz in [(-0.8, 0.5, -0.6), (0.8, 0.5, -0.6), (-0.8, -0.5, 0.6), (0.8, -0.5, 0.6), (0, 0.9, 0), (0, -0.9, 0.5)]]
                + [(sh[0] - 0.7, -0.9, 0), (sh[0] + 0.7, -0.9, 0)])                            # the elbow cop and upper arm
    arms.append([(el[0] - 0.65, el[1], el[2]), (el[0] + 0.65, el[1], el[2]), (el[0], el[1] + 0.6, el[2]), (el[0], el[1] - 0.6, el[2]),
                 (hand[0] - 0.55, hand[1], hand[2] - 0.2), (hand[0] + 0.55, hand[1], hand[2] - 0.2), (hand[0], hand[1] + 0.5, hand[2]), (hand[0], hand[1] - 0.5, hand[2])])   # the forearm
    arms.append([(hand[0] + dx, hand[1] + dy, hand[2] + dz) for dx in (-0.5, 0.5) for dy in (-0.55, 0.55) for dz in (-0.45, 0.5)])   # the gauntlet
hulls('colossus:arms__plate', 'plate', arms)
aseam = []
for s in (1, -1):
    aseam.append(bar((s * 3.4 + s * 1.1, 0.2, 0.3), (s * 3.25 + s * 0.85, -2.2, 1.6), 0.08))   # down the outer arm
    aseam.append(bar((s * 3.1, -3.0, 1.9), (HANDS[0] + s * 0.95, HANDS[1] + 0.1, HANDS[2] - 0.3), 0.08))   # the forearm's seam
hulls('colossus:arms__seam', 'seam', aseam)

# ---- the fire sword: a guard across the hands, the grip through them, a 16 m blade forward along +z --------------------
GZ = HANDS[2] + 0.9   # the guard
sword = [
    [(HANDS[0] + dx, HANDS[1] + dy, z) for dx in (-0.25, 0.25) for dy in (-0.25, 0.25) for z in (HANDS[2] - 1.4, GZ)],   # the grip
    [(HANDS[0] + dx, HANDS[1] + dy, GZ + dz) for dx in (-1.9, 1.9) for dy in (-0.3, 0.3) for dz in (0, 0.5)],         # the guard
]
blade = [(HANDS[0], HANDS[1], GZ + 16.4)]
for z, w in [(GZ + 0.4, 0.85), (GZ + 4, 0.95), (GZ + 12, 0.8), (GZ + 15.2, 0.4)]:
    blade += [(HANDS[0] + w, HANDS[1], z), (HANDS[0] - w, HANDS[1], z), (HANDS[0], HANDS[1] + 0.22 * w, z), (HANDS[0], HANDS[1] - 0.22 * w, z)]
sword.append(blade)
hulls('colossus:sword__fire', 'fire', sword)
core = [(HANDS[0], HANDS[1], GZ + 15.6)]
for z, w in [(GZ + 0.5, 0.32), (GZ + 6, 0.38), (GZ + 13, 0.22)]:
    core += [(HANDS[0] + w, HANDS[1], z), (HANDS[0] - w, HANDS[1], z), (HANDS[0], HANDS[1] + 0.3, z), (HANDS[0], HANDS[1] - 0.3, z)]   # proud of the blade's faces
hulls('colossus:sword__core', 'core', [core])

obs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('colossus:')]
by = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs}
result = {'pieces': len(obs), 'tris': sum(by.values()), 'by': by}
