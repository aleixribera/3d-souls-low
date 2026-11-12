# The Crucible Squire, a young knight of the Crucible (LORE.md, the Stormhill Evergaol). One rigid mesh per game bone
# (js/rig.js skeleton at scale 1, MODEL_DEFS.crucibleSquire), named squire:<bone>__<material slot>[.n], so every key pose,
# the walk and the death drive it. Rest pose: upright, arms hanging (the model's posture bends the elbows in the game).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.37, y 1.55,
# elbows y 1.25, wrists .95 (the sword's grip runs along z through the right wrist; the kit's oval shield hangs off the
# left forearm); hips x +-.15, y .90, knees .45. Cloth bones: loinF (0, .91, .17), loinB (0, .91, -.17), capeA
# (0, 1.56, -.2) and capeB (0, 1.14, -.2) below it.
# The look (the MODEL_DEFS brief; LORE.md: the old life of the Crucible shows as gold, as wings, as a tail): a young
# knight in dark bronze half-plate, slighter than the Crucible Knight. A closed helm with a prow down the face, a T of
# slits, a gilt brow band, a cross-guard and crest spike on the crown and two gilt horns rising like a lyre; a ridged
# cuirass with a gilt vortex boss; layered pauldrons with gilt rivets, amber growths breaking out of the right one and
# out of the back through a short russet cape; mail at the joints, vambraces and bronze gauntlets; a belt, tassets and
# a mail skirt over russet loincloths; cuisses, knee cops, greaves and sabatons.
# Enemy budget: about 3,000 triangles with the oval shield and the knight's greatsword, which the kit still builds.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'plate': (0.36, 0.23, 0.13), 'gilt': (0.72, 0.55, 0.28), 'guard': (0.44, 0.3, 0.17), 'mail': (0.24, 0.21, 0.19),
       'grip': (0.25, 0.17, 0.11), 'cloth': (0.42, 0.22, 0.11), 'amber': (1.0, 0.66, 0.2), 'dark': (0.03, 0.025, 0.02)},
      prefix='squire:')

SX, EL, WR = .37, 1.25, .95
EYE = 1.84   # MODEL_DEFS.crucibleSquire.eyes: head + .15
rnd = random.Random(11)

def crystal(bm, base, d, ln, r):
    """An amber spike: a four-sided shard from `base` along `d`, widest a third of the way, to a point."""
    d = Vector(d).normalized(); b = Vector(base)
    tube(bm, [tuple(b), tuple(b + d * ln * .35), tuple(b + d * ln)], [r * .75, r, .002], 4)

def cluster(bm, base, d, n, size, seed):
    r = random.Random(seed); d = Vector(d).normalized()
    a = d.cross(Vector((0, 1, 0)) if abs(d.y) < .9 else Vector((1, 0, 0))).normalized(); b = d.cross(a).normalized()
    for k in range(n):
        spread = .25 + .5 * (k > 0)
        dk = (d + a * r.uniform(-spread, spread) + b * r.uniform(-spread, spread)).normalized()
        off = (a * r.uniform(-1, 1) + b * r.uniform(-1, 1)) * .03 * size
        ln = (.2 if k == 0 else r.uniform(.08, .15)) * size
        crystal(bm, Vector(base) + off, dk, ln, (.03 if k == 0 else r.uniform(.016, .024)) * size)

# ---- head: a closed helm with a prow down the face, a T of slits, gilt brow band, cross-guard, crest and lyre horns ---------
def prow(a, y): return .1 * max(0.0, math.cos(a)) ** 5 * max(0.0, min(1.0, (1.99 - y) / .05))
HELM = [(1.63, 0, -.006, .116, .126), (1.7, 0, -.002, .13, .142), (1.82, 0, 0, .137, .15), (1.93, 0, -.004, .13, .143),
        (1.99, 0, -.008, .108, .118), (2.02, 0, -.01, .06, .066)]
def helm_at(a, y, out=0.0):
    for (y0, _, c0, rx0, rz0), (y1, _, c1, rx1, rz1) in zip(HELM, HELM[1:]):
        if y1 >= y >= y0:
            t = (y - y0) / (y1 - y0); c, rx, rz = c0 + (c1 - c0) * t, rx0 + (rx1 - rx0) * t, rz0 + (rz1 - rz0) * t
            r = 1 + prow(a, y)
            return (math.sin(a) * (rx * r + out), y, c + math.cos(a) * (rz * r + out))
hard('head__plate', lambda bm: loft(bm, HELM, 10, push=prow))

def slits(bm):   # the eye slit across the face and the breathing slit down the prow, a T
    n = 6
    top = [bm.verts.new(G(*helm_at(-.62 + 1.24 * i / n, EYE + .009, .004))) for i in range(n + 1)]
    bot = [bm.verts.new(G(*helm_at(-.62 + 1.24 * i / n, EYE - .009, .004))) for i in range(n + 1)]
    for i in range(n): bm.faces.new((top[i], top[i + 1], bot[i + 1], bot[i]))
    q = [bm.verts.new(G(*helm_at(a, y, .006))) for a, y in ((-.035, EYE - .012), (.035, EYE - .012), (.035, 1.72), (-.035, 1.72))]
    bm.faces.new(q)
hard('head__dark', slits, outward=(0, 1.8, 0))

hard('head__gilt.1', lambda bm: loft(bm, [(1.915, 0, -.003, .139, .152), (1.885, 0, -.002, .142, .155)], 10, cap=False,
                                      push=lambda a, y: prow(a, y) * .95), outward=lambda c: Vector((0, c.y, 0)))   # the brow band
def helm_gilt(bm):
    loft(bm, [(2.035, 0, -.01, .15, .03), (2.0, 0, -.01, .15, .03)], 4, cap=True)                 # the cross-guard on the crown
    tube(bm, [(0, 1.99, .045), (0, 2.12, .03), (0, 2.27, .0)], [.024, .014, .002], 4)              # the crest spike
    for s in (1, -1):                                                                               # the horns, a lyre
        tube(bm, [(s * .115, 1.93, -.01), (s * .19, 1.97, -.02), (s * .26, 2.05, -.035), (s * .3, 2.16, -.05),
                  (s * .3, 2.26, -.06), (s * .26, 2.34, -.06)], [.03, .026, .021, .016, .01, .002], 4)
hard('head__gilt', helm_gilt)

# ---- neck: mail under the gorget --------------------------------------------------------------------------------------------
hard('neck__mail', lambda bm: loft(bm, [(1.7, 0, -.01, .095, .095), (1.6, 0, -.005, .105, .105)], 6, cap=False),
     outward=lambda c: Vector((0, c.y, 0)))

# ---- chest: a ridged cuirass and gorget, the gilt vortex boss and collar rim, amber breaking out of the back -----------------
def ridge(a, y): return .055 * max(0.0, math.cos(a)) ** 8 * max(0, min(1, (1.58 - y) / .12))
def cuirass(bm):
    loft(bm, [(1.62, 0, -.01, .2, .13), (1.57, 0, .0, .28, .17), (1.46, 0, .02, .28, .19), (1.33, 0, .03, .26, .195),
              (1.21, 0, .02, .22, .17), (1.11, 0, .005, .2, .155)], 10, cap=True, push=ridge)
    loft(bm, [(1.6, 0, -.012, .23, .16), (1.67, 0, -.016, .16, .14), (1.705, 0, -.018, .14, .13)], 10, cap=False)   # the gorget
hard('chest__plate', cuirass)
hard('chest__gilt', lambda bm: tube(bm, [(0, 1.42, .205), (0, 1.42, .232), (0, 1.42, .242)], [.052, .044, .016], 6))   # the vortex boss
hard('chest__gilt.1', lambda bm: loft(bm, [(1.715, 0, -.018, .145, .135), (1.69, 0, -.017, .155, .14)], 10, cap=False),
     outward=lambda c: Vector((0, c.y, -.018)))                                                     # the gorget's rim
hard('chest__amber', lambda bm: cluster(bm, (.05, 1.47, -.15), (.3, .8, -1), 5, 1.1, 8))

# ---- the short cape on its two swinging bones, behind the cuirass -----------------------------------------------------------
def cape_at(u, y, w, bow):
    x = (u - .5) * w; return (x, y, -.225 + bow * x * x)
hard('capeA__cloth', lambda bm: sheet(bm, 5, 2, lambda u, v: cape_at(u, 1.6 - .46 * v, .48 + .14 * v, 1.0 - .2 * v)))
hard('capeB__cloth', lambda bm: sheet(bm, 5, 2, lambda u, v: cape_at(u, 1.14 - .4 * v, .62 + .08 * v, .8 - .1 * v),
                                      ragged=.07, seed=4))

# ---- spin: the belt, tassets front and side, a mail skirt -----------------------------------------------------------------
hard('spin__grip', lambda bm: loft(bm, [(1.125, 0, .005, .205, .16), (1.08, 0, .005, .21, .165)], 8, cap=False),
     outward=lambda c: Vector((0, c.y, 0)))
hard('spin__mail', lambda bm: loft(bm, [(1.09, 0, .0, .215, .165), (.92, 0, .0, .235, .18), (.82, 0, -.005, .24, .185)], 6, cap=False), thick=.008)
def tassets(bm):
    loft(bm, [(1.085, 0, .006, .222, .172), (.99, 0, .01, .243, .188)], 6, cap=False, a0=-2.1, a1=2.1)
    loft(bm, [(1.0, 0, .01, .238, .184), (.9, 0, .012, .256, .198)], 6, cap=False, a0=-1.9, a1=1.9)
hard('spin__plate', tassets, thick=.011)

# ---- the russet loincloths, front and back, each on its swinging bone ------------------------------------------------------
for bone, s, w, ln, seed in (('loinF', 1, .26, .52, 5), ('loinB', -1, .3, .56, 9)):
    hard(f'{bone}__cloth', lambda bm, s=s, w=w, ln=ln, seed=seed: sheet(bm, 3, 3, lambda u, v: (
        (u - .5) * w * (1 + .15 * v), .95 - ln * v, s * (.205 + .03 * v - .25 * ((u - .5) * w) ** 2)), ragged=.06, seed=seed))

# ---- arms: mail sleeves under layered pauldrons with gilt rivets, vambraces and bronze gauntlets ---------------------------------
for s, n, f in ((1, 'L', 1.0), (-1, 'R', 1.12)):
    x = s * SX
    hard(f'arm{n}__mail', lambda bm, x=x: loft(bm, [(1.58, x, 0, .07, .07), (1.42, x, 0, .066, .066), (EL + .03, x, 0, .06, .06)], 7, cap=True))
    def pauldron(bm, x=x, s=s, f=f):
        side = s * math.pi / 2; cx = s * .34
        def slope(p, a, e):
            d = (p.x - cx) * s
            return (p.x, p.y - .11 * max(0, d) * (1 - .5 * math.sin(e)) + .04 * max(0, -d), p.z)
        shell(bm, (cx, 1.56, -.005), .13 * f, .12 * f, .14 * f, 0, math.pi / 2, 0, math.tau, nu=8, nv=2, warp=slope)
        for k in range(2):   # two lames under the cop, open on the inside
            y = 1.53 - .018 * f - k * .045 * f; r = (.092 - .003 * k) * f
            loft(bm, [(y, x + s * (.02 + .006 * k), -.005, r, r * 1.05), (y - .055 * f, x + s * (.026 + .008 * k), -.005, r + .011, (r + .011) * 1.05)],
                 5, cap=False, a0=side - 1.9, a1=side + 1.9)
    hard(f'arm{n}__plate', pauldron, thick=.011)
    def rivets(bm, x=x, s=s, f=f):   # gilt rivets along the lower lame, and a gilt edge on the cop
        for k in range(3):
            a = s * math.pi / 2 + (k - 1) * .8; r = (.089 + .011) * f + .012
            p = Vector((x + s * .034 + math.sin(a) * r, 1.53 - .018 * f - .045 * f - .03 * f, -.005 + math.cos(a) * r * 1.05))
            n = Vector((math.sin(a), 0, math.cos(a)))
            tube(bm, [tuple(p - n * .004), tuple(p + n * .007)], [.009, .006], 4)
    hard(f'arm{n}__gilt', rivets)
    def vambrace(bm, x=x):
        loft(bm, [(EL + .05, x, -.008, .052, .052), (EL, x, -.02, .07, .074), (EL - .055, x, -.008, .058, .058),
                  (WR + .12, x, 0, .05, .052), (WR + .06, x, 0, .056, .058), (WR + .03, x, 0, .064, .066)], 7, cap=True)
    hard(f'elbow{n}__plate', vambrace)
    def gauntlet(bm, x=x, s=s):   # the fist closed round a grip along z through the wrist
        blob(bm, (x + s * .026, WR - .02, 0), .055, (.62, 1.0, 1.15), 1)
        for zf in (-.036, -.012, .012, .036):
            tube(bm, [(x + s * .036, WR - .025, zf), (x + s * .026, WR - .074, zf * 1.1), (x - s * .024, WR - .079, zf * 1.1), (x - s * .044, WR - .036, zf)],
                 [.017, .016, .014, .013], 5)
        tube(bm, [(x + s * .02, WR - .006, .054), (x - s * .014, WR, .066), (x - s * .044, WR - .01, .059)], [.016, .014, .012], 5)
    soft(f'elbow{n}__guard', gauntlet, 56, voxel=.0058)

hard('armR__amber', lambda bm: cluster(bm, (-.43, 1.6, -.02), (-.6, 1, -.3), 4, 1.0, 3))

# ---- legs: mail under cuisses, knee cops, greaves, sabatons -------------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    soft(f'leg{n}__mail', lambda bm, hx=hx: tube(bm, [(hx, .97, -.01), (hx * 1.05, .72, .0), (hx, .5, .01)], [.11, .095, .078], 8), 40, voxel=.012)
    def cuisse(bm, hx=hx, s=s):
        c = s * .3   # over the front and the outside of the thigh
        loft(bm, [(.86, hx + s * .01, .006, .11, .112), (.6, hx + s * .006, .016, .092, .094)], 6, cap=False, a0=c - 1.5, a1=c + 1.5)
        def point(p, a, e): return (p.x, p.y, p.z + .022 * max(0, math.cos(a)) * max(0, 1 - abs(e)))
        shell(bm, (hx, .455, .042), .074, .074, .056, -1.1, 1.2, -1.4, 1.4, nu=4, nv=2, warp=point)
    hard(f'leg{n}__plate', cuisse, thick=.011)
    hard(f'knee{n}__plate', lambda bm, hx=hx: loft(bm, [(.43, hx, .005, .074, .076), (.33, hx, -.006, .084, .09), (.2, hx, .0, .068, .07), (.11, hx, .004, .064, .066)], 8, cap=True))
    def sabaton(bm, hx=hx):
        blob(bm, (hx, .085, -.005), .064, (1.0, .95, 1.1), 1)
        blob(bm, (hx, .058, .078), .062, (1.0, .82, 1.6), 1)
        blob(bm, (hx, .046, .18), .044, (1.0, .78, 1.1), 1)
        blob(bm, (hx, .044, -.052), .045, (1.0, .9, .8), 1)
    soft(f'knee{n}__guard', sabaton, 56, voxel=.008)

result = tally()
