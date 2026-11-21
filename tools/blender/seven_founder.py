# The Seven's founder (design/abilities/the-seven.md): one tall hooded figure 2.6 m high, drawn seven times round a
# boss. Metres, +y up, facing +z, origin on the floor at the hem's centre. Hard planes, no fine detail. The packed format
# holds still meshes, so the spec's bones are pieces, each modelled about its own pivot for the game to turn:
#   founder:robe__gold        the hood (a deep cowl open at the front) and the long plain robe, shoulders to a ragged
#                             hem of hanging tongues (no feet), slightly flared. No arms.
#   founder:robe__ink         seven dark fold strips standing just proud of the robe.
#   founder:lining__crimson   the crimson lining inside the hood's opening: a rim round the face and the back of the cowl.
#   founder:face__wood        the flat oval face panel (0.26 x 0.34 m, centre y 2.25) set in the hood, facing +z.
#   founder:face__paint       the painted folk features on it: two round eyes, two straight brows, a line mouth.
#   founder:face__cheek       two small red cheek marks.
#   founder:mark0__paint ..   the seven founders' marks, one piece each, on the same panel: 0 a beard line, 1 a braid
#   founder:mark6__paint      beside the face, 2 a scar across one eye, 3 a lined brow, 4 round painted spectacles,
#                             5 a dot on the chin (the young face), 6 deep lines under the eyes (the old face).
#   founder:armL__gold        a sleeved arm with a bare open hand, the SHOULDER AT THE ORIGIN, hanging down -y about
#   founder:armR__gold        1 m to the fingertips, palm to +z, the sleeve flaring at the wrist. The game places armL at
#                             (+0.42, 2.02, 0.02) and armR at (-0.42, 2.02, 0.02) and turns them about x. +x is the
#                             figure's left; the thumb is on the outer side (palms forward).
# Slots: `gold` the emissive oath-gold robe, `ink` its fold lines, `crimson` the lining, `wood` the unlit face panel,
# `paint` the black folk paint, `cheek` the red; the game draws them in its cel shader inside a black ink rim.
# Budget: at most 1,600 triangles for all pieces together.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib; importlib.reload(snow_lib)
from snow_lib import G, new_obj, tinted
import bpy, bmesh

COL = {'gold': (0.91, 0.72, 0.3), 'ink': (0.05, 0.04, 0.04), 'crimson': (0.55, 0.06, 0.07), 'wood': (0.72, 0.55, 0.36),
       'paint': (0.06, 0.05, 0.05), 'cheek': (0.8, 0.12, 0.1)}

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

def ring(y, w, d, x=0.0, z=0.0, n=6, a0=0.0):
    """A flat-sided ring of n points at height y: w half-wide, d half-deep."""
    return [(x + math.cos(a0 + i / n * math.pi * 2) * w, y, z + math.sin(a0 + i / n * math.pi * 2) * d) for i in range(n)]

# ---- paint on the face panel: flat shapes in the panel's plane, sunk into it at the back, proud of it at the front ----
FZ = 0.11   # the panel's front

def flat(outline, z0=FZ - 0.006, z1=FZ + 0.007):
    """A thin plate from a convex outline of (x, y) points, between depths z0 and z1."""
    return [(x, y, z) for x, y in outline for z in (z0, z1)]

def dot(cx, cy, r, n=6, **k):
    return flat([(cx + math.cos(i / n * math.pi * 2) * r, cy + math.sin(i / n * math.pi * 2) * r) for i in range(n)], **k)

def line(a, b, r, **k):
    """A painted stroke from a to b, r half-thick."""
    dx, dy = b[0] - a[0], b[1] - a[1]; l = math.hypot(dx, dy); nx, ny = -dy / l * r, dx / l * r
    return flat([(a[0] + nx, a[1] + ny), (a[0] - nx, a[1] - ny), (b[0] + nx, b[1] + ny), (b[0] - nx, b[1] - ny)], **k)

# ---- the robe: a flared skirt, the torso, the shoulders, a hood in five hard planes round an open face ---------------
SK0, SK1 = (0.14, 0.56, 0.48), (0.95, 0.44, 0.35)   # the skirt's rings: y, half-wide, half-deep
robe = [
    ring(*SK0, n=12) + ring(*SK1, n=12),                                                    # the skirt, flared at the hem
    ring(0.93, 0.44, 0.35, n=12) + ring(1.72, 0.37, 0.26, n=12),                            # the torso
    ring(1.7, 0.4, 0.28, n=8) + [(s * 0.47, 1.96, z) for s in (1, -1) for z in (-0.13, 0.13)]
    + [(s * 0.28, 2.1, z) for s in (1, -1) for z in (-0.17, 0.14)],                         # the shoulders, sloped
    # the hood: the back of the cowl, rounded, its peak swept back
    [(s * w, y, z) for s in (1, -1) for y, w, z0, z1 in [(1.95, 0.3, -0.26, 0.06), (2.3, 0.27, -0.3, 0.03), (2.52, 0.21, -0.26, 0.0)] for z in (z0, z1)]
    + [(0, 1.95, -0.31), (0, 2.6, -0.2)],
    # the chin drape, falling to a point on the chest
    [(s * x, y, z) for s in (1, -1) for x, y, z0, z1 in [(0.28, 2.05, -0.05, 0.25), (0.34, 1.92, -0.1, 0.2)] for z in (z0, z1)] + [(0, 1.86, 0.27)],
    # the brow: the cowl's top, coming forward to a point over the face
    [(s * x, y, z) for s in (1, -1) for x, y, z in [(0.22, 2.44, 0.0), (0.22, 2.44, 0.27), (0.15, 2.44, 0.28), (0.17, 2.55, -0.02)]]
    + [(0, 2.6, 0.04), (0, 2.5, 0.3), (0, 2.46, 0.3)],
]
for s in (1, -1):   # the hood's two sides, framing the face, leaning forward at the top
    robe.append([(s * x, y, z) for y, xo, zf in [(1.98, 0.28, 0.25), (2.46, 0.22, 0.28)] for x, z in [(0.15, 0.0), (0.15, zf), (xo, 0.0), (xo, zf - 0.03)]])
for i in range(12):   # the ragged hem: a tongue of cloth hanging below the skirt at every other step
    a = (i + 0.5) / 12 * math.pi * 2; c, s_ = math.cos(a), math.sin(a)
    tip = [0.0, 0.05, 0.02, 0.07][i % 4]
    tx, tz = -s_, c   # the skirt's tangent there
    pts = []
    for y, w, r in [(0.26, 0.15, 1.0), (tip, 0.06, 1.05)]:
        for dr in (-0.03, 0.025):
            for k in (-1, 1):
                rr = r + dr
                pts.append((c * SK0[1] * rr + tx * w * k, y, s_ * SK0[2] * rr + tz * w * k))
    robe.append(pts)
hulls('founder:robe__gold', 'gold', robe)

# The ink folds: strips along the skirt's long edges, a hair proud of them, and two on the chest.
ink = []
for i in (0, 2, 3, 4, 6, 8, 10):
    a = i / 12 * math.pi * 2; c, s_ = math.cos(a), math.sin(a); tx, tz = -s_, c
    pts = []
    lo, hi = (0.32, 0.86) if i in (2, 4) else (0.2, 0.94)   # the two beside the centre are shorter
    for y in (lo, hi):
        f = (y - SK0[0]) / (SK1[0] - SK0[0]); w = SK0[1] + (SK1[1] - SK0[1]) * f; d = SK0[2] + (SK1[2] - SK0[2]) * f   # the skirt's edge at y
        for dr in (-0.02, 0.012):
            for k in (-1, 1):
                pts.append((c * w * (1 + dr) + tx * 0.018 * k, y, s_ * d * (1 + dr) + tz * 0.018 * k))
    ink.append(pts)
for s in (1, -1):   # two folds down the chest from the hood's drape
    ink.append([(s * 0.12 + dx, y, z) for dx in (-0.016, 0.016) for y, z in [(1.9, 0.205), (1.9, 0.24), (1.25, 0.31), (1.25, 0.345)]])
hulls('founder:robe__ink', 'ink', ink)

# The crimson lining: a wedge on each side of the opening covering its tunnel and a rim on the front, and the cowl's back.
OX, OY0, OY1 = 0.15, 2.06, 2.46   # the opening
lining = [
    [(s * x, y, z) for s in (1, -1) for x in (OX, 0.15) for y in (OY0, OY1) for z in (0.05, 0.08)],   # behind the face
]
for s in (1, -1):
    lining.append([(s * x, y, z) for y in (OY0 - 0.02, OY1 + 0.02) for x, z in [(OX - 0.004, 0.08), (OX - 0.004, 0.236), (OX + 0.035, 0.236), (OX + 0.035, 0.225)]])
for y0, sy in ((OY1, 1), (OY0, -1)):
    lining.append([(x, y0 + sy * dy, z) for x in (-OX - 0.03, OX + 0.03) for dy, z in [(-0.004, 0.08), (-0.004, 0.236), (0.035, 0.236), (0.035, 0.225)]])
hulls('founder:lining__crimson', 'crimson', lining)

# ---- the face ------------------------------------------------------------------------------------------------------
FY = 2.25
hulls('founder:face__wood', 'wood', [[(math.cos(i / 12 * math.pi * 2) * 0.13, FY + math.sin(i / 12 * math.pi * 2) * 0.17, z)
                                       for i in range(12) for z in (0.09, FZ)]])
EYE = 0.052   # the eyes' x
hulls('founder:face__paint', 'paint', [
    dot(EYE, FY + 0.03, 0.022), dot(-EYE, FY + 0.03, 0.022),                               # round eyes
    line((EYE - 0.035, FY + 0.075), (EYE + 0.035, FY + 0.075), 0.007),                     # straight brows
    line((-EYE - 0.035, FY + 0.075), (-EYE + 0.035, FY + 0.075), 0.007),
    line((-0.04, FY - 0.085), (0.04, FY - 0.085), 0.006),                                  # a line mouth
])
hulls('founder:face__cheek', 'cheek', [dot(0.078, FY - 0.035, 0.018), dot(-0.078, FY - 0.035, 0.018)])

M = dict(z0=FZ - 0.006, z1=FZ + 0.01)   # the marks stand a hair prouder than the features, so a scar crosses an eye
marks = [
    [line((-0.08, FY - 0.1), (-0.04, FY - 0.135), 0.006, **M), line((-0.04, FY - 0.135), (0.04, FY - 0.135), 0.006, **M),
     line((0.04, FY - 0.135), (0.08, FY - 0.1), 0.006, **M)],                                               # 0 a beard line
    [flat([(0.118 + dx, y + dy) for dx, dy in [(-0.018, 0), (0.018, 0), (0, 0.028), (0, -0.028)]], **M) for y in (FY + 0.06, FY, FY - 0.06, FY - 0.12, FY - 0.18)],   # 1 a braid
    [line((-EYE - 0.045, FY + 0.09), (-EYE + 0.03, FY - 0.04), 0.007, **M)],                                # 2 a scar across one eye
    [line((-0.04, FY + 0.105), (0.04, FY + 0.105), 0.005, **M), line((-0.03, FY + 0.125), (0.03, FY + 0.125), 0.005, **M)],   # 3 a lined brow
    None,                                                                                                  # 4 spectacles (below)
    [dot(0.0, FY - 0.125, 0.01, **M)],                                                                     # 5 a dot on the chin
    [line((s * EYE - 0.025, FY - 0.005 - k * 0.018), (s * EYE + 0.025, FY - 0.005 - k * 0.018), 0.004, **M) for s in (1, -1) for k in (0, 1)],   # 6 under the eyes
]
# The spectacles are rims, not discs: a thin hexagonal frame round each eye, sunk behind the eye's paint so the eye shows.
specs = []
for cx in (EYE, -EYE):
    for i in range(6):
        a, b = i / 6 * math.pi * 2, (i + 1) / 6 * math.pi * 2
        specs.append(line((cx + math.cos(a) * 0.04, FY + 0.03 + math.sin(a) * 0.04), (cx + math.cos(b) * 0.04, FY + 0.03 + math.sin(b) * 0.04), 0.005, **M))
marks[4] = specs + [line((EYE - 0.04, FY + 0.03), (-EYE + 0.04, FY + 0.03), 0.005, **M)]
for k, groups in enumerate(marks):
    hulls(f'founder:mark{k}__paint', 'paint', groups)

# ---- the arms: shoulder at the origin, hanging down -y; a sleeve flaring at the wrist, a bare open hand palm to +z ---
def arm(s):
    g = [
        ring(0.07, 0.12, 0.12, n=8) + ring(-0.38, 0.1, 0.1, n=8),                   # the upper sleeve, a shoulder cap
        ring(-0.36, 0.1, 0.1, n=8) + ring(-0.7, 0.16, 0.15, n=8),                   # the lower sleeve, flared
        [(x, y, z) for x in (-0.045, 0.045) for y in (-0.66, -0.86) for z in (-0.016, 0.016)] + [(0, -0.64, 0.0)],   # the palm
        [(s * 0.05 + dx, y, z) for dx in (-0.015, 0.015) for y in (-0.76,) for z in (-0.012, 0.012)]
        + [(s * 0.085 + dx, -0.86, z) for dx in (-0.012, 0.012) for z in (-0.01, 0.01)],   # the thumb, on the outer side
    ]
    for k, fx in enumerate((-0.033, -0.011, 0.011, 0.033)):   # four fingers, open and a little spread
        tip = -0.99 + abs(fx) * 1.2 - (0.01 if abs(fx) < 0.02 else 0.0)
        g.append([(fx + dx, -0.85, z) for dx in (-0.0095, 0.0095) for z in (-0.012, 0.012)]
                 + [(fx * 1.35 + dx, tip, z) for dx in (-0.008, 0.008) for z in (-0.009, 0.009)])
    return g
hulls('founder:armL__gold', 'gold', arm(1))
hulls('founder:armR__gold', 'gold', arm(-1))

obs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('founder:')]
by = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs}
result = {'pieces': len(obs), 'tris': sum(by.values()), 'by': by}
