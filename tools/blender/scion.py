# The Grafted Scion, one of Godrick's grafted things (LORE.md, Stormveil). One rigid mesh per game bone (js/rig.js skeleton
# at scale 1, MODEL_DEFS.graftedScion), named scion:<bone>__<material slot>[.n], so every key pose, the walk and the death
# drive it. Rest pose: upright, arms hanging (the model's posture hunches it low in the game).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.30, y 1.55, the
# left 18% longer (elbow y 1.196, wrist .842), the right 15% (elbow 1.205, wrist .86). The scimitar's grip runs along z
# through the right wrist (the kit builds it). Hips x +-.15, y .90, knees .45. Cloth bones: loinF (0, .92, .15), loinB
# (0, .92, -.15).
# The look (the MODEL_DEFS brief): a thin pale body stitched together, a blank gold mask crowned with a fan of knife-rays,
# four extra arms sewn on at the back and the sides, each gripping a blade; a sword in the hand; a stained loincloth on a
# belt; leather-bound shins, bare bony feet. Enemy budget: about 3,000 triangles with the scimitar.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'skin': (0.66, 0.6, 0.53), 'gold': (0.72, 0.55, 0.22), 'void': (0.05, 0.04, 0.03), 'cloth': (0.4, 0.22, 0.16),
       'leather': (0.3, 0.21, 0.14), 'blade': (0.62, 0.62, 0.64)}, prefix='scion:')

SX = .3
ARM = {'L': (1, 1.196, .842), 'R': (-1, 1.205, .86)}   # side, elbow y, wrist y
rnd = random.Random(7)

def quad(bm, p, u, v, hu, hv, n, out=.004):   # a flat bar centred on p: half-length hu along u, half-width hv along v, lifted by n
    p = Vector(p) + Vector(n) * out; u, v = Vector(u), Vector(v)
    vs = [bm.verts.new(G(*q)) for q in (p - u * hu - v * hv, p + u * hu - v * hv, p + u * hu + v * hv, p - u * hu + v * hv)]
    bm.faces.new(vs)

def seam(bm, pts, normal, bars=True, w=.0035, bar=.013):
    """A sewn seam over a surface: a thin dark thread along the points and short cross-stitches over it."""
    pts = [Vector(p) for p in pts]
    for a, b in zip(pts, pts[1:]):
        d = (b - a); ln = d.length; d.normalize(); n = normal((a + b) / 2); t = d.cross(n).normalized()
        quad(bm, (a + b) / 2, d, t, ln / 2, w, n)
        if bars: quad(bm, (a + b) / 2, t, d, bar, w * 1.1, n, .005)

def stitch_ring(bm, c, n, r, k, bar=.012):   # cross-stitches round a graft: k bars across a circle of radius r about c
    c, n = Vector(c), Vector(n).normalized()
    a = n.cross(Vector((0, 1, 0)) if abs(n.y) < .9 else Vector((1, 0, 0))).normalized(); b = n.cross(a).normalized()
    for i in range(k):
        t = math.tau * (i + .5) / k; u = a * math.cos(t) + b * math.sin(t); v = n.cross(u)
        quad(bm, c + u * r, u, v, bar, .0035, n)

def spike(bm, base, tip, side, w, t):   # a flat knife-point: a diamond base (w wide along `side`, t thick) to a tip
    base, tip, side = Vector(base), Vector(tip), Vector(side).normalized()
    d = (tip - base).normalized(); th = d.cross(side).normalized()
    vs = [bm.verts.new(G(*q)) for q in (base + side * w, base + th * t, base - side * w, base - th * t, tip)]
    for f in ((0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4), (3, 2, 1, 0)): bm.faces.new([vs[i] for i in f])

# ---- head: a bald pale skull behind a blank gold mask, a crown of knife-rays fanned round it ---------------------------------
def skull(bm):
    blob(bm, (0, 1.8, -.02), .097, (.95, 1.08, 1.02), 2)
    blob(bm, (0, 1.73, .025), .055, (1.1, .8, 1.0), 1)          # the jaw under the mask
soft('head__skin', skull, 130, voxel=.007)

MC, MR = Vector((0, 1.79, 0)), (.108, .14, .135)
def mask_warp(p, a, e):   # a soft nose ridge down the middle, a flat brow
    x, y, z = p
    z += .016 * max(0, 1 - abs(x) / .028) * max(0, 1 - abs(y - 1.775) / .05)
    return (x, y, z)
hard('head__gold', lambda bm: shell(bm, MC, *MR, -.95, 1.15, -1.35, 1.35, nu=10, nv=7, warp=mask_warp), outward=(0, 1.79, -.06))

def mask_at(x, y, out=0.0):   # the point of the mask's surface in front of (x, y)
    k = 1 - (x / MR[0]) ** 2 - ((y - MC.y) / MR[1]) ** 2
    return Vector((x, y, MR[2] * math.sqrt(max(0, k)) + out))
def slits(bm):   # two narrow eye slits and the seam of a mouth, cut dark into the gold
    for s in (-1, 1): blob(bm, mask_at(s * .042, 1.825, .002), .021, (1.25, .2, .3), 0)
    blob(bm, mask_at(0, 1.725, .002), .022, (1.45, .12, .3), 0)
hard('head__void', slits)
def brow(bm):   # a raised gold ridge over the slits
    tube(bm, [mask_at(.095 * math.sin(a), 1.858 + .006 * math.cos(a), .004) for a in [-1.1 + 2.2 * k / 6 for k in range(7)]], [.006, .008, .009, .009, .009, .008, .006], 4)
hard('head__gold.1', brow)

HALO = Vector((0, 1.8, -.045))
def crown(bm):   # the band behind the mask's top edge, and the rays: flat knife points fanned over the head, long and short
    tube(bm, [HALO + Vector((math.sin(a) * .118, math.cos(a) * .118, -.02 * math.cos(a))) for a in [-1.45 + 2.9 * k / 8 for k in range(9)]], [.012] * 9, 4)
    for i in range(11):
        a = -1.25 + 2.5 * i / 10; ln = (.12 + .09 * math.cos(a * 1.25)) * (1.0 if i % 2 == 0 else .72)
        d = Vector((math.sin(a), math.cos(a), -.3)).normalized()
        base = HALO + Vector((math.sin(a) * .118, math.cos(a) * .118, -.02 * math.cos(a)))
        spike(bm, base, base + d * ln, (math.cos(a), -math.sin(a), 0), .012, .004)
hard('head__gold.2', crown, smooth=False)

# ---- neck: thin and corded, a gold circlet at its root --------------------------------------------------------------------
def neck(bm):
    loft(bm, [(1.78, 0, -.02, .046, .046), (1.7, 0, -.012, .047, .046), (1.62, 0, -.008, .058, .052)], 8)
    for s in (-1, 1): tube(bm, [(s * .02, 1.74, .03), (s * .042, 1.63, .045)], [.012, .014], 5)   # the cords of the throat
soft('neck__skin', neck, 64, voxel=.006)
hard('neck__gold', lambda bm: loft(bm, [(1.675, 0, -.008, .062, .057), (1.655, 0, -.008, .07, .065), (1.635, 0, -.008, .074, .069)], 10, cap=False),
     outward=(0, 1.65, -.008))

# ---- chest: a starved, stitched torso; four arms grafted on at the back and the sides, each gripping a blade ------------------
TORSO = [(1.0, 0, 0, .13, .096), (1.1, 0, .003, .12, .09), (1.22, 0, .014, .148, .11), (1.34, 0, .02, .172, .122),
         (1.45, 0, .01, .186, .118), (1.53, 0, -.01, .178, .108), (1.6, 0, -.016, .11, .085), (1.64, 0, -.016, .06, .058)]
def torso_at(y):
    rows = sorted(TORSO)
    for (y0, _, c0, x0, z0), (y1, _, c1, x1, z1) in zip(rows, rows[1:]):
        if y0 <= y <= y1:
            k = (y - y0) / (y1 - y0); return (c0 + (c1 - c0) * k, x0 + (x1 - x0) * k, z0 + (z1 - z0) * k)
    return rows[0][2:] if y < rows[0][0] else rows[-1][2:]
def surface(x, y, front=1, out=0.0):   # the torso's surface at (x, y), front (1) or back (-1), pushed out by `out`
    cz, rx, rz = torso_at(y); k = max(.02, 1 - (x / rx) ** 2)
    return Vector((x, y, cz + front * (rz * math.sqrt(k) + out)))
def torso_normal(p):
    cz, rx, rz = torso_at(p.y)
    return Vector(((p.x) / rx ** 2, 0, (p.z - cz) / rz ** 2)).normalized()

def body(bm):
    loft(bm, TORSO, 12)
    for s in (-1, 1):
        blob(bm, (s * .21, 1.5, -.01), .062, (1.1, .8, 1), 1)                 # the shoulders, bony
        blob(bm, (s * .085, 1.585, .045), .02, (3, .6, .7), 1)               # the collarbones
    for k in range(9): blob(bm, surface(0, 1.58 - .065 * k, -1, -.004), .019, (1.1, .8, 1), 0)   # the spine's knuckles
def starved(g):   # ribs pressed in down the front and the sides, the belly sunk under them
    d = 0.0
    if 1.2 < g.y < 1.47 and g.z > -.04 and abs(g.x) > .02:
        d -= .008 * (.5 + .5 * math.cos((g.y - 1.2) / .054 * math.tau)) ** 3
    if 1.04 < g.y < 1.2 and g.z > 0: d -= .01 * math.sin((g.y - 1.04) / .16 * math.pi) * max(0, 1 - abs(g.x) / .1)
    return d
soft('chest__skin', body, 270, voxel=.008, after=starved)

GRAFTS = []   # (root, elbow, hand, blade length), from MODEL_DEFS v5.5's scionLimbs, in rest space
for s in (1, -1):
    GRAFTS.append(((s * .12, 1.5, -.12), (s * .42, 1.62, -.32), (s * .6, 1.3, -.12), .5))   # the upper pair, off the shoulder blades
    GRAFTS.append(((s * .15, 1.28, -.07), (s * .4, 1.18, -.24), (s * .52, .92, .05), .44))    # the lower pair, off the flanks
for i, (root, elbow, hand, L) in enumerate(GRAFTS):
    R, E, H = Vector(root), Vector(elbow), Vector(hand)
    def limb(bm, R=R, E=E, H=H):
        m1 = R.lerp(E, .5) + Vector((0, .025, 0)); m2 = E.lerp(H, .5)
        tube(bm, [R, m1, E, m2, H], [.042, .033, .031, .027, .024], 7)
        blob(bm, R, .048, (1, 1, .85), 1)                                       # the stump sewn into the body
        blob(bm, E, .033, (1, 1, 1), 1)                                         # the elbow's knob
        d = (H - E).normalized(); blob(bm, H + d * .015, .032, (1, 1.15, 1), 1)  # the fist round the blade's grip
    soft(f'chest__skin.{i + 1}', limb, 78, voxel=.007, noise=.002)
def grafts_void(bm):   # the seams: down the breastbone, across the belly, and stitched round every grafted stump
    seam(bm, [surface(.004 * math.sin(k * 2.1), 1.56 - .065 * k, 1, .002) for k in range(8)], torso_normal)
    seam(bm, [surface(.13 - .045 * k, 1.21 - .035 * k, 1, .002) for k in range(6)], torso_normal)
    for root, elbow, hand, L in GRAFTS:
        R = Vector(root); n = (R - Vector((0, R.y, torso_at(R.y)[0]))).normalized()
        stitch_ring(bm, R + n * .02, n, .05, 7)
hard('chest__void', grafts_void, smooth=False, outward=(0, 1.32, .0))
def blades(bm):   # a narrow, slightly curved blade held out along each forearm's line, a small cross-guard at the fist
    for root, elbow, hand, L in GRAFTS:
        E, H = Vector(elbow), Vector(hand); d = (H - E).normalized()
        side = d.cross(Vector((0, 0, 1))).normalized(); flat = d.cross(side).normalized()   # the blade's face looks along z
        rings = []
        for j in range(7):
            t = j / 6; c = H + d * (.03 + L * t) + side * .035 * math.sin(t * math.pi * .9)
            w = .026 * (1 - t ** 2.2) + .0015; th = .006 * (1 - t) + .001
            rings.append([bm.verts.new(G(*q)) for q in (c + side * w, c + flat * th, c - side * w * .6, c - flat * th)])
        bridge(bm, rings, True, True)
        tube(bm, [H + d * .03 - side * .045, H + d * .03 + side * .045], [.009, .009], 4)
hard('chest__blade', blades, smooth=False)

# ---- spin: bony hips, a leather belt with a gold buckle, a stained rag wrapped round -----------------------------------------
def hips(bm):
    loft(bm, [(1.06, 0, 0, .128, .096), (.98, 0, 0, .142, .1), (.9, 0, -.01, .152, .104), (.84, 0, -.005, .138, .098)], 10)
    for s in (-1, 1): blob(bm, (s * .085, .86, -.02), .08, (1, .9, 1), 1); blob(bm, (s * .12, 1.0, .03), .025, (1, 1.4, 1), 0)
soft('spin__skin', hips, 90)
hard('spin__leather', lambda bm: loft(bm, [(1.04, 0, 0, .145, .106), (1.0, 0, 0, .152, .11)], 12, cap=False), outward=(0, 1.02, 0))
hard('spin__gold', lambda bm: blob(bm, (0, 1.02, .112), .022, (1.2, 1, .45), 0))
def wrap(bm):   # a short rag skirt under the belt, torn
    sheet(bm, 12, 2, lambda u, v: (math.sin(a := math.tau * u) * (.158 + .03 * v), 1.0 - .13 * v, math.cos(a) * (.114 + .025 * v)), ragged=.05, seed=3)
hard('spin__cloth', wrap)

def strip(bm, z, w, ln, seed):   # the loincloth's front and back flaps, hanging from the belt
    sheet(bm, 3, 3, lambda u, v: ((u - .5) * w * (1 - .25 * v), .99 - ln * v, z + math.copysign(.004 + .02 * v, z)), ragged=.07, seed=seed)
hard('loinF__cloth', lambda bm: strip(bm, .128, .22, .44, 4))
hard('loinB__cloth', lambda bm: strip(bm, -.128, .26, .5, 6))

# ---- arms: long thin arms sewn on at the shoulders, knobbed elbows, bony hands; the sword arm wrapped ---------------------------
for n, (s, el, wr) in ARM.items():
    x = s * SX
    def upper(bm, x=x, s=s, el=el):
        loft(bm, [(1.58, x - s * .02, -.005, .05, .052), (1.5, x, 0, .046, .048), (1.38, x, .004, .036, .038), (el + .03, x, 0, .03, .031)], 8)
        blob(bm, (x - s * .01, 1.55, 0), .05, (1, .9, 1), 1)
    soft(f'arm{n}__skin', upper, 60, voxel=.006)
    def shoulder_seam(bm, x=x):   # the arm was sewn on too: cross-stitches round the top of it
        for k in range(8):
            t = math.tau * (k + .5) / 8; n = (math.sin(t), 0, math.cos(t))
            quad(bm, (x + n[0] * .045, 1.47 + .004 * math.sin(3 * t), n[2] * .047), (0, 1, 0), (n[2], 0, -n[0]), .011, .0035, n, .0)
    hard(f'arm{n}__void', shoulder_seam, smooth=False, outward=(x, 1.47, 0))

def fore(x, el, wr):
    def run(bm):
        loft(bm, [(el + .02, x, 0, .031, .031), (el - .06, x, -.004, .034, .036), (el - .2, x, 0, .027, .029), (wr + .03, x, .004, .021, .023)], 8)
        blob(bm, (x, el, -.005), .036, (1, 1, 1.05), 1)                       # the elbow's knob
    return run
def scaled(build, c, k, keep=None):   # a hand built, then scaled by k about the wrist c (the forearm, built in `keep`, stays)
    def run(bm):
        if keep: keep(bm)
        n0 = len(bm.verts); build(bm); bm.verts.ensure_lookup_table(); o = G(*c)
        for v in bm.verts[n0:]: v.co = o + (v.co - o) * k
    return run
def open_hand(bm):   # the left hand open, long bony fingers half curled
    x, wr = SX, ARM['L'][2]
    blob(bm, (x + .008, wr - .03, .004), .03, (.55, 1.25, 1.05), 1)
    for zf in (-.021, -.007, .007, .021):
        tube(bm, [(x + .012, wr - .058, zf), (x + .014, wr - .1, zf * 1.1), (x + .002, wr - .13, zf * 1.15)], [.0075, .0066, .0052], 5)
    tube(bm, [(x + .004, wr - .015, .028), (x - .008, wr - .045, .04), (x - .016, wr - .066, .036)], [.0075, .0066, .0052], 5)   # the thumb
soft('elbowL__skin', scaled(open_hand, (SX, ARM['L'][2], 0), 1.25, fore(SX, *ARM['L'][1:])), 120, voxel=.0045)
def fist(bm):   # the right fist closed round the grip, along z through the wrist
    x, s, wr = -SX, -1, ARM['R'][2]
    blob(bm, (x + s * .014, wr - .005, 0), .036, (.66, 1.15, 1.15), 1)
    for zf in (-.021, -.007, .007, .021):
        tube(bm, [(x + s * .019, wr - .014, zf), (x + s * .013, wr - .045, zf * 1.1), (x - s * .014, wr - .047, zf * 1.1), (x - s * .024, wr - .02, zf)],
             [.0088, .0084, .0076, .0068], 5)
    tube(bm, [(x + s * .01, wr - .004, .031), (x - s * .008, wr, .038), (x - s * .023, wr - .006, .034)], [.0088, .0084, .0068], 5)   # the thumb
soft('elbowR__skin', scaled(fist, (-SX, ARM['R'][2], 0), 1.2, fore(-SX, *ARM['R'][1:])), 110, voxel=.0045)
def arm_wraps(bm):   # leather bands round the sword arm's forearm, slanting
    x, el, wr = -SX, ARM['R'][1], ARM['R'][2]
    for k in range(3):
        y = el - .1 - .07 * k; r = .036 - .004 * k
        rings = loft(bm, [(y + .02, x, .002, r + .003, r + .004), (y - .006, x, .002, r + .004, r + .005)], 8, cap=False)
        for v in rings[0] + rings[1]: v.co.z += (v.co.x - x) * .25   # the band's slant (co.z is game y)
hard('elbowR__leather', arm_wraps, outward=lambda g: (-SX, g.y, .002))

# ---- legs: thin thighs, knobbed knees, leather-bound shins, bare bony feet ---------------------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    def thigh(bm, hx=hx):
        loft(bm, [(1.0, hx * .8, -.01, .074, .074), (.88, hx, 0, .07, .072), (.7, hx, .01, .058, .06), (.53, hx, 0, .046, .048), (.46, hx, 0, .044, .045)], 8)
    soft(f'leg{n}__skin', thigh, 68)
    def shin(bm, hx=hx):   # exact rings, open ends: a remeshed shin decimates to slivers whose normals tip down to the ankle
        loft(bm, [(.5, hx, .0, .04, .041), (.455, hx, .014, .047, .05), (.4, hx, -.004, .044, .048), (.32, hx, -.012, .043, .048),
                  (.2, hx, -.002, .032, .035), (.09, hx, 0, .028, .03)], 7, cap=False)
    hard(f'knee{n}__skin', shin)
    def foot(bm, hx=hx, s=s):
        loft(bm, [(.12, hx, 0, .029, .031), (.06, hx, 0, .03, .032)], 8)
        blob(bm, (hx, .035, -.02), .034, (1, .9, 1.1), 1)                       # the heel
        blob(bm, (hx, .032, .06), .036, (1.05, .55, 1.7), 1)                    # the instep
        for dx in (-.026, -.009, .008, .024):
            tube(bm, [(hx + s * dx, .025, .1), (hx + s * dx * 1.15, .016, .148), (hx + s * dx * 1.2, .011, .17)], [.0105, .0095, .008], 5)   # toes
    soft(f'knee{n}__skin.1', foot, 80, voxel=.006)
    def shin_wraps(bm, hx=hx, s=s):
        for k in range(4):
            y = .35 - .065 * k; cz, r = -.006 + .002 * k, .045 - .004 * k
            rings = loft(bm, [(y + .022, hx, cz, r + .004, r + .006), (y - .012, hx, cz, r + .005, r + .007)], 8, cap=False)
            for v in rings[0] + rings[1]: v.co.z += s * (v.co.x - hx) * .3
    hard(f'knee{n}__leather', shin_wraps, outward=lambda g, hx=hx: (hx, g.y, -.005))

result = tally()
