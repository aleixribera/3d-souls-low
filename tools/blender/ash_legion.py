# Ash Legion's phantom army (design/abilities/ash-legion.md): two figures the game draws many times over as two
# instanced meshes, so the army costs a handful of draw calls. Both face +z (the charge), feet on the floor at the origin.
# One script for both (the spec's ash_rider.py and ash_spearman.py), since they share their parts and their slots:
#   legion:rider__ash, legion:rider__ember     a hooded rider on a lean horse at the gallop (legs mid-stride), its lance
#                                              couched forward; about 3 m tall at the hood, the lance 4 m.
#   legion:spear__ash, legion:spear__ember     a hooded spearman mid-stride, a long spear levelled forward; 2 m tall.
# `ash` the grey bodies, `ember` their eyes and spear points; the game draws them in its cel shader inside a black ink
# rim and bobs each figure on its own phase (the packed format holds still meshes: the spec's two-frame stride is the
# game's bob and lean). Budget: under 1,200 triangles for all four.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib; importlib.reload(snow_lib)
from snow_lib import G, new_obj, tinted
import bpy, bmesh

COL = {'ash': (0.42, 0.39, 0.37), 'ember': (0.9, 0.6, 0.36)}

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

def limb(a, b, ra, rb=None):
    """A four-sided limb from a to b, half-thick ra at a and rb at b."""
    rb = ra if rb is None else rb
    return [(a[0] - ra, a[1], a[2]), (a[0] + ra, a[1], a[2]), (a[0], a[1], a[2] - ra), (a[0], a[1], a[2] + ra),
            (b[0] - rb, b[1], b[2]), (b[0] + rb, b[1], b[2]), (b[0], b[1], b[2] - rb), (b[0], b[1], b[2] + rb)]

def hood(cx, cy, cz, s):
    """A hood leaning forward, peaked, open at the face (the face is the ink inside it)."""
    return [(cx - 0.2 * s, cy, cz - 0.2 * s), (cx + 0.2 * s, cy, cz - 0.2 * s), (cx - 0.2 * s, cy, cz + 0.18 * s), (cx + 0.2 * s, cy, cz + 0.18 * s),
            (cx - 0.16 * s, cy + 0.32 * s, cz + 0.05 * s), (cx + 0.16 * s, cy + 0.32 * s, cz + 0.05 * s), (cx, cy + 0.5 * s, cz - 0.12 * s), (cx, cy + 0.12 * s, cz + 0.3 * s)]

def slice_(z, w, lo, hi):
    """A six-sided cross-section of a body at z: w half-wide, from lo to hi."""
    m = (lo + hi) / 2
    return [(w, m + (hi - lo) * 0.2, z), (-w, m + (hi - lo) * 0.2, z), (w * 0.7, lo, z), (-w * 0.7, lo, z), (w * 0.55, hi, z), (-w * 0.55, hi, z)]

def eyes(cx, cy, cz, s):
    return [[(cx + k * 0.07 * s - 0.035 * s, cy + 0.2 * s, cz + 0.3 * s), (cx + k * 0.07 * s + 0.035 * s, cy + 0.2 * s, cz + 0.3 * s),
             (cx + k * 0.07 * s, cy + 0.24 * s, cz + 0.27 * s), (cx + k * 0.07 * s, cy + 0.17 * s, cz + 0.27 * s)] for k in (-1, 1)]

# ---- the rider: a lean horse at the gallop, a cloaked rider, a couched lance ------------------------------------------
H = 1.45   # the horse's back
rider = [
    slice_(1.0, 0.24, H - 0.45, H + 0.08) + slice_(0.55, 0.33, H - 0.62, H + 0.04) + slice_(-0.2, 0.31, H - 0.55, H + 0.0),   # the deep chest
    slice_(-0.2, 0.31, H - 0.55, H + 0.0) + slice_(-0.75, 0.3, H - 0.4, H + 0.06) + slice_(-0.98, 0.2, H - 0.25, H + 0.02),   # the tucked belly and croup
    limb((0, H, 0.95), (0, H + 0.75, 1.45), 0.2, 0.13),          # the neck, reaching forward
    [(0.12, H + 0.85, 1.4), (-0.12, H + 0.85, 1.4), (0.08, H + 0.55, 2.05), (-0.08, H + 0.55, 2.05), (0, H + 0.95, 1.3), (0, H + 0.6, 1.5)],   # the long head
    limb((0, H - 0.15, -0.85), (0, H - 0.5, -1.55), 0.12, 0.05),   # the tail streaming back
]
for side, fz, kz in ((0.2, 0.75, 1.3), (-0.2, 0.75, 0.2), (0.2, -0.7, -0.15), (-0.2, -0.7, -1.3)):   # legs at the gallop: two reaching, two pushing
    knee = (side, 0.6, (fz + kz) / 2 + 0.12)
    rider.append(limb((side, H - 0.4, fz), knee, 0.1, 0.07))
    rider.append(limb(knee, (side, 0.0, kz), 0.07, 0.05))
rider += [
    [(x, y, z) for x in (-0.24, 0.24) for y, z in [(H + 0.1, 0.25), (H + 0.1, -0.35), (H + 0.85, 0.15), (H + 0.85, -0.2)]],   # the rider's body
    [(-0.42, H + 0.15, -0.4), (0.42, H + 0.15, -0.4), (-0.3, H + 0.8, -0.25), (0.3, H + 0.8, -0.25), (0, H + 0.3, -0.95)],    # the cloak streaming back
    hood(0, H + 0.82, 0.05, 1.0),
    limb((0.25, H + 0.7, 0.05), (0.32, H + 0.45, 0.55), 0.07),   # the lance arm
    limb((0.34, H + 0.5, -0.9), (0.34, H + 0.95, 3.5), 0.045),   # the lance's shaft, couched and rising
]
hulls('legion:rider__ash', 'ash', rider)
hulls('legion:rider__ember', 'ember', eyes(0, H + 0.82, 0.05, 1.0) + [
    [(0.34, H + 0.95, 3.45), (0.24, H + 0.93, 3.25), (0.44, H + 0.93, 3.25), (0.34, H + 1.05, 3.25), (0.34, H + 0.85, 3.25), (0.34, H + 1.0, 4.0)],   # the lance's point
    [(0.34 + dx, H - 0.2 + dy, 1.95) for dx in (-0.06, 0.06) for dy in (0.55, 0.6)] + [(0.34, H + 0.37, 1.98)],   # (the horse's eye, on its right)
])

# ---- the spearman: hooded, mid-stride, the spear levelled forward in both hands ----------------------------------------
spear = [
    [(x, y, z) for x in (-0.2, 0.2) for y, z in [(0.95, 0.05), (0.95, -0.15), (1.5, 0.22), (1.5, -0.02)]],   # the body, leaning in
    [(-0.28, 0.9, -0.2), (0.28, 0.9, -0.2), (-0.22, 1.45, -0.08), (0.22, 1.45, -0.08), (0, 0.4, -0.55)],      # the cloak behind
    hood(0, 1.42, 0.14, 0.85),
    limb((0.12, 0.95, 0.0), (0.12, 0.5, 0.35), 0.08, 0.06), limb((0.12, 0.5, 0.35), (0.12, 0.0, 0.42), 0.06, 0.05),     # the leading leg
    limb((-0.12, 0.95, -0.1), (-0.12, 0.5, -0.38), 0.08, 0.06), limb((-0.12, 0.5, -0.38), (-0.12, 0.05, -0.7), 0.06, 0.05),   # the pushing leg
    limb((0.2, 1.4, 0.1), (0.14, 1.1, 0.5), 0.05), limb((-0.2, 1.4, 0.05), (0.06, 1.15, 0.15), 0.05),   # the arms on the shaft
    limb((0.1, 1.05, -0.9), (0.1, 1.3, 2.2), 0.03),   # the spear's shaft
]
hulls('legion:spear__ash', 'ash', spear)
hulls('legion:spear__ember', 'ember', eyes(0, 1.42, 0.14, 0.85) + [
    [(0.1, 1.3, 2.15), (0.03, 1.28, 2.0), (0.17, 1.28, 2.0), (0.1, 1.36, 2.0), (0.1, 1.22, 2.0), (0.1, 1.33, 2.65)],   # the point
])

obs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('legion:')]
by = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs}
result = {'pieces': len(obs), 'tris': sum(by.values()), 'by': by}
