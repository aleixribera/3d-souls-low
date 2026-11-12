# The Beastman of Farum Azula, the wolfish beast-man of the dragons' city. One rigid mesh per game bone (js/rig.js
# skeleton at scale 1, MODEL_DEFS.beastman), named beastman:<bone>__<material slot>[.n], so every key pose, the walk and
# the death drive it. Rest pose: upright, arms hanging (the model's posture hunches it hard in the game).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.31, y 1.55, both
# 12% longer (elbow y 1.214, wrist .878). The scimitar's grip runs along z through the right wrist (the kit builds it).
# Hips x +-.15, y .90, knees .45. Cloth bones (they swing): loinF (0, .93, .16), loinB (0, .93, -.16); tail (0, .95, -.14).
# The look (the MODEL_DEFS brief, LORE.md's Farum Azula): a lean grey wolfish beast-man, a long muzzle with bared fangs and
# long swept-back ears, matted locks of fur over the shoulders and down the spine, ribs under the fur, scraps of an old
# robe (a torn sash over one shoulder, a rope belt, rag tails), long clawed arms, heavy thighs over hocked shins and paws,
# a bushy tail. Enemy budget: about 3,000 triangles with the scimitar.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'fur': (0.44, 0.42, 0.39), 'hide': (0.3, 0.27, 0.25), 'rags': (0.33, 0.25, 0.19), 'leather': (0.25, 0.2, 0.16),
       'claw': (0.8, 0.76, 0.66), 'void': (0.04, 0.03, 0.02), 'steel': (0.4, 0.36, 0.3)}, prefix='beastman:')

SX, EL, WR = .31, 1.214, .878
EYES = [(s * .042, 1.81, .086) for s in (-1, 1)]
rnd = random.Random(11)

def tuft(bm, p, n, lay, ln, w):
    """A lock of matted fur: a flat closed wedge from a base on the body (p, its outward normal n) laid along `lay`."""
    p, n, lay = Vector(p), Vector(n).normalized(), Vector(lay).normalized()
    t = lay.cross(n)
    if t.length < 1e-4: t = Vector((1, 0, 0))
    t.normalize()
    a, b, c = p + t * w, p - t * w, p - n * w * .9
    tip = p + lay * ln + n * ln * .3
    vs = [bm.verts.new(G(*q)) for q in (a, b, c, tip)]
    for f in ((0, 1, 3), (1, 2, 3), (2, 0, 3), (0, 2, 1)): bm.faces.new([vs[i] for i in f])

def scaled(build, c, k):   # a build scaled by k about the game point c (the hands, made larger for a beast)
    def run(bm):
        build(bm); o = G(*c)
        for v in bm.verts: v.co = o + (v.co - o) * k
    return run

def cone(bm, base, tip, r):   # a claw or a fang
    tube(bm, [base, tip], [r, r * .12], 3)

# ---- head: a wolf's skull, a long muzzle with bared fangs, long swept-back ears -------------------------------------------
def skull(bm):
    blob(bm, (0, 1.8, -.012), .09, (1.05, .95, 1.1), 2)           # the cranium
    blob(bm, (0, 1.822, .045), .05, (1.35, .5, .75), 1)           # the brow
    blob(bm, (0, 1.785, .08), .068, (1.0, 1.0, 1.1), 2)            # the muzzle, root to nose
    blob(bm, (0, 1.775, .14), .052, (.95, .95, 1.25), 1)
    blob(bm, (0, 1.77, .193), .038, (.9, .9, 1.15), 1)
    blob(bm, (0, 1.72, .12), .042, (.9, .6, 1.7), 1)             # the lower jaw
    for s in (-1, 1): blob(bm, (s * .062, 1.77, .02), .04, (.8, 1.0, 1.1), 1)   # the cheeks
def snarl(g):   # eye sockets, and the mouth's line cut along the muzzle's sides
    d = 0.0
    for e in EYES:
        r = (g - Vector(e)).length; d -= .012 * max(0, 1 - r / .026)
    if .05 < g.z < .21 and abs(g.x) > .008:
        d -= .011 * max(0, 1 - abs(g.y - 1.738) / .008)
    return d
soft('head__fur', skull, 220, voxel=.006, noise=.002, after=snarl)
hard('head__void', lambda bm: blob(bm, (0, 1.738, .125), .04, (.85, .16, 1.7), 1))   # the mouth's dark inside
hard('head__hide', lambda bm: blob(bm, (0, 1.778, .227), .021, (1.3, .8, .9), 1))      # the nose
def fangs(bm):
    for s in (-1, 1):
        cone(bm, (s * .028, 1.746, .178), (s * .027, 1.71, .183), .0068)  # upper canines over the lip
        cone(bm, (s * .024, 1.728, .16), (s * .023, 1.757, .165), .0055)  # lower canines
hard('head__claw', fangs)

def ear_frame(s):
    base = Vector((s * .052, 1.86, -.035)); d = Vector((s * .4, 1, -.5)).normalized()
    fwd = Vector((s * .35, .1, 1)).normalized(); u = d.cross(fwd).normalized()
    return base, d, fwd, u
def ear_rows(s, width, depth, upto, shift):
    base, d, fwd, u = ear_frame(s); L = .15; rows = []
    for j in range(5):
        t = upto * j / 4; w = max(width * (1 - t) ** .85, .003); c = base + d * L * t + fwd * shift
        rows.append([c + u * w * (k / 1.5 - 1) + fwd * depth * ((k / 1.5 - 1) ** 2 - .6) * (1 - t) for k in range(4)])
    return rows
def ears(bm):
    for s in (-1, 1):
        rows = [[bm.verts.new(G(*p)) for p in r] for r in ear_rows(s, .04, .016, 1.0, 0)]
        bridge(bm, rows, closed=False)
hard('head__fur.1', ears, thick=.008)
def inner_ears(bm):
    for s in (-1, 1):
        rows = [[bm.verts.new(G(*p)) for p in r] for r in ear_rows(s, .03, .012, .8, .0045)]
        bridge(bm, rows, closed=False)
hard('head__hide.1', inner_ears, outward=(0, 1.86, -.2))

# ---- neck: a thick ruff -----------------------------------------------------------------------------------------------
def ruff(bm):
    loft(bm, [(1.78, 0, -.035, .068, .07), (1.7, 0, -.03, .085, .085), (1.62, 0, -.02, .105, .1)], 8)
    blob(bm, (0, 1.69, .045), .06, (1.2, 1.0, .7), 1)               # the throat ruff
soft('neck__fur', ruff, 80, voxel=.008, noise=.004)
def neck_locks(bm):
    for k in range(12):
        a = math.tau * k / 12 + rnd.uniform(-.15, .15); y = 1.7 + rnd.uniform(-.04, .05)
        p = Vector((math.sin(a) * .088, y, -.025 + math.cos(a) * .088)); n = Vector((math.sin(a), 0, math.cos(a)))
        tuft(bm, p, n, n * .5 + Vector((0, -1, -.3)), rnd.uniform(.08, .12), .022)
hard('neck__fur.1', neck_locks, smooth=False)

# ---- chest: a lean ribbed chest, a hump of mane over the shoulders, the locks and a torn robe sash ------------------------
TORSO = [(1.0, 0, 0, .15, .11), (1.1, 0, .005, .135, .105), (1.22, 0, .02, .16, .13), (1.34, 0, .025, .19, .145),
         (1.45, 0, .01, .205, .14), (1.54, 0, -.01, .19, .125), (1.6, 0, -.02, .12, .1), (1.64, 0, -.02, .08, .08)]
def torso_at(y):
    rows = sorted(TORSO)
    for (y0, _, c0, x0, z0), (y1, _, c1, x1, z1) in zip(rows, rows[1:]):
        if y0 <= y <= y1:
            k = (y - y0) / (y1 - y0); return (c0 + (c1 - c0) * k, x0 + (x1 - x0) * k, z0 + (z1 - z0) * k)
    return rows[0][2:] if y < rows[0][0] else rows[-1][2:]
def surface(a, y, out=0.0):   # a point on the torso at angle a (0 = front), height y, pushed out by `out`
    cz, rx, rz = torso_at(y)
    return Vector((math.sin(a) * (rx + out), y, cz + math.cos(a) * (rz + out)))
def body(bm):
    loft(bm, TORSO, 12)
    for s in (-1, 1): blob(bm, (s * .23, 1.5, -.01), .08, (1.1, .8, 1), 1)   # the shoulders
    blob(bm, (0, 1.48, -.075), .17, (1.25, .6, .75), 2)                       # the hump of mane on the back
def ribs(g):
    if not 1.17 < g.y < 1.43 or g.z < -.06: return 0
    k = (g.y - 1.17) / .052
    return -.007 * (.5 + .5 * math.cos(k * math.tau)) ** 3 * min(1, abs(g.x) / .08)
soft('chest__fur', body, 250, voxel=.009, noise=.003, after=ribs)

MANE = Vector((0, 1.47, -.03))
def mane_point(a, e):   # a point of the mane's shell round the shoulders (a = 0 front), and its outward normal
    n = Vector((math.sin(a) * math.cos(e), math.sin(e), math.cos(a) * math.cos(e)))
    return MANE + Vector((n.x * .27, n.y * .18, n.z * .17)), n
def mane(bm):   # matted clumps fused into one shaggy mass over the shoulders and the upper back, hanging in lobes
    for k in range(46):
        a = rnd.uniform(.8, math.tau - .8); e = rnd.uniform(-.15, 1.2)
        p, n = mane_point(a, e)
        blob(bm, p + n * .01 - Vector((0, .02, 0)), rnd.uniform(.04, .055), (1, rnd.uniform(1.5, 2.1), 1), 1)
    for k in range(9):    # the chest ruff under the throat
        a = rnd.uniform(-.75, .75); p = surface(a, rnd.uniform(1.47, 1.57), -.01)
        blob(bm, p - Vector((0, .02, 0)), .04, (1, 1.8, .8), 1)
    for k in range(8):    # the ridge down the spine
        blob(bm, surface(math.pi, 1.36 - .3 * k / 7, -.02), .035, (1.1, 1.6, 1), 1)
soft('chest__fur.1', mane, 270, voxel=.011, noise=.006)
def locks(bm):   # loose locks hanging off the mane's edge, so the silhouette is ragged
    for k in range(24):
        a = .85 + (math.tau - 1.7) * (k + rnd.uniform(-.3, .3)) / 23; e = rnd.uniform(-.2, .25)
        p, n = mane_point(a, e)
        tuft(bm, p, n, Vector((n.x * .45, -1, n.z * .35 - .15)), rnd.uniform(.09, .14), rnd.uniform(.03, .04))
hard('chest__fur.2', locks, smooth=False)

def sash(bm):   # a torn strip of the old robe from the left shoulder across the chest to the right hip, and down the back
    for side in (1, -1):
        def at(u, v, side=side):
            a = .62 - 1.25 * u
            if side < 0: a = math.pi - a
            return surface(a, 1.62 - .5 * u - .1 * v, .04 + .025 * math.sin(u * math.pi))
        sheet(bm, 7, 2, at, ragged=.04, seed=5 if side > 0 else 9)
hard('chest__rags', sash)

# ---- spin: the belly and hips, a rope belt with a knot, the robe's ragged back skirt -------------------------------------
def hips(bm):
    loft(bm, [(1.06, 0, .005, .14, .105), (.98, 0, 0, .155, .11), (.9, 0, -.01, .165, .115), (.83, 0, -.005, .15, .105)], 10)
    for s in (-1, 1): blob(bm, (s * .09, .86, -.02), .09, (1, .9, 1), 1)
soft('spin__fur', hips, 95, noise=.003)

def rope(bm):
    pts = [(math.sin(a) * .158, 1.03 - .008 * math.sin(a * 3), .003 + math.cos(a) * .118) for a in
           [-.25 + (math.tau + .5) * k / 13 for k in range(14)]]
    tube(bm, pts, [.013] * len(pts), 4)
    blob(bm, (.1, 1.025, .115), .024, (1.1, 1, .8), 0)                 # the knot
    for dx, ln in ((.0, .2), (.025, .15)):                               # its two ends
        tube(bm, [(.1 + dx, 1.02, .118), (.105 + dx * 1.4, 1.02 - ln * .5, .128), (.11 + dx * 1.8, 1.02 - ln, .124)], [.01, .009, .007], 4)
hard('spin__leather', rope)

def skirt(bm):   # the robe's hem behind and on the sides, torn short
    sheet(bm, 8, 3, lambda u, v: (math.sin(a := math.pi * (.45 + 1.1 * u)) * (.168 + .06 * v), 1.03 - .3 * v,
                                   -.005 + math.cos(a) * (.125 + .05 * v)), ragged=.09, seed=4)
hard('spin__rags', skirt)

def strip(bm, z, w, ln, seed):   # a ragged tail of the robe, hanging from the belt
    sheet(bm, 3, 3, lambda u, v: ((u - .5) * w * (1 - .3 * v), 1.0 - ln * v, z + math.copysign(.012 + .03 * v, z)), ragged=.08, seed=seed)
hard('loinF__rags', lambda bm: strip(bm, .135, .24, .44, 3))
hard('loinB__rags', lambda bm: strip(bm, -.135, .27, .5, 7))

# ---- tail: a bushy wolf's tail hanging down behind ----------------------------------------------------------------------
def tail(bm):   # from the base it arcs back, then hangs; thickest a third of the way down
    for k in range(12):
        t = k / 11; a = t * 1.9
        p = (0, .95 - .25 * (1 - math.cos(a)) * .5 - .2 * t, -.16 - .2 * math.sin(a * .8))
        r = .035 + .042 * math.sin(min(1, t * 1.4) * math.pi * .8) * (1 - .6 * t)
        blob(bm, p, r, (1, 1.15, 1), 1)
soft('tail__fur', tail, 100, voxel=.011, noise=.009)

# ---- arms: long sinewy furred arms, a rag tied on the sword arm, clawed hands ----------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    def upper(bm, x=x, s=s):
        loft(bm, [(1.56, x - s * .01, -.005, .068, .07), (1.45, x, 0, .062, .064), (1.34, x, .005, .052, .055),
                  (1.25, x, 0, .045, .046), (EL, x, 0, .043, .043)], 8)
        blob(bm, (x, 1.38, .02), .038, (.9, 1.7, .9), 1); blob(bm, (x, 1.4, -.025), .036, (.9, 1.6, .9), 1)
    soft(f'arm{n}__fur', upper, 70, voxel=.007, noise=.003)
    def fore(bm, x=x):
        loft(bm, [(EL + .03, x, 0, .045, .045), (EL - .07, x, -.005, .052, .055), (EL - .2, x, 0, .042, .044), (WR + .03, x, .005, .032, .034)], 8)
        blob(bm, (x, EL, 0), .046, (1, 1, 1), 1)                                    # the joint
        blob(bm, (x, EL - .01, -.045), .028, (.8, 1.3, 1.1), 1); blob(bm, (x, EL - .07, -.055), .024, (.8, 1.5, .9), 1)   # the elbow's fur
    soft(f'elbow{n}__fur', fore, 80, voxel=.007, noise=.004)
hard('armR__rags', lambda bm: sheet(bm, 8, 2, lambda u, v: (-SX + math.sin(u * math.tau) * (.075 + .012 * v), 1.5 - .17 * v,
                                                            math.cos(u * math.tau) * (.077 + .012 * v)), ragged=.05, seed=6))

def open_claw(bm):   # the left hand open, long fingers half curled
    x = SX
    blob(bm, (x + .012, WR - .025, .004), .038, (.62, 1.3, 1.1), 1)
    for zf in (-.024, -.008, .008, .024):
        tube(bm, [(x + .018, WR - .055, zf), (x + .02, WR - .09, zf * 1.1), (x + .004, WR - .118, zf * 1.1)], [.0095, .0085, .007], 5)
    tube(bm, [(x + .004, WR - .015, .032), (x - .008, WR - .04, .046), (x - .018, WR - .062, .042)], [.009, .008, .007], 5)   # the thumb
soft('elbowL__hide', scaled(open_claw, (SX, WR, 0), 1.25), 90, voxel=.005)
def left_claws(bm):
    for zf in (-.024, -.008, .008, .024):
        cone(bm, (SX + .004, WR - .116, zf * 1.1), (SX - .016, WR - .124, zf * 1.1), .0065)
    cone(bm, (SX - .017, WR - .06, .042), (SX - .03, WR - .07, .036), .006)
hard('elbowL__claw', scaled(left_claws, (SX, WR, 0), 1.25))

def fist(bm):   # the right fist closed round the grip, along z through the wrist
    x, s = -SX, -1
    blob(bm, (x + s * .016, WR - .005, 0), .044, (.66, 1.15, 1.15), 1)
    for zf in (-.026, -.009, .009, .026):
        tube(bm, [(x + s * .023, WR - .016, zf), (x + s * .016, WR - .052, zf * 1.1), (x - s * .016, WR - .055, zf * 1.1), (x - s * .028, WR - .023, zf)],
             [.0105, .01, .009, .008], 5)
    tube(bm, [(x + s * .012, WR - .004, .038), (x - s * .01, WR, .046), (x - s * .028, WR - .007, .041)], [.0105, .01, .008], 5)   # the thumb
soft('elbowR__hide', scaled(fist, (-SX, WR, 0), 1.2), 72, voxel=.005)
def right_claws(bm):
    x, s = -SX, -1
    for zf in (-.026, -.009, .009, .026):
        cone(bm, (x - s * .028, WR - .023, zf), (x - s * .03, WR + .002, zf * .95), .0065)
hard('elbowR__claw', scaled(right_claws, (-SX, WR, 0), 1.2))

# ---- legs: heavy furred thighs, hocked shins and paws with claws ---------------------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    def thigh(bm, hx=hx):
        loft(bm, [(1.0, hx * .75, -.01, .095, .095), (.88, hx, 0, .1, .1), (.7, hx * 1.02, .01, .085, .088), (.55, hx, 0, .068, .07), (.46, hx, 0, .058, .06)], 8)
        blob(bm, (hx, .74, -.045), .05, (.9, 1.6, .8), 1)
    soft(f'leg{n}__fur', thigh, 80, noise=.004)
    def shin(bm, hx=hx):   # the shin runs back to a raised hock, then down and forward to the paw
        tube(bm, [(hx, .48, .01), (hx, .36, -.03), (hx, .22, -.07), (hx, .12, -.03), (hx, .055, .03)], [.064, .058, .047, .04, .04], 8)
        blob(bm, (hx, .46, .005), .062, (1, 1, 1), 1)                              # the knee
        blob(bm, (hx, .21, -.088), .034, (1, 1.2, 1), 1)
        blob(bm, (hx, .39, -.045), .052, (1, 1.7, .9), 1)                   # the calf's fur
    soft(f'knee{n}__fur', shin, 80, voxel=.008, noise=.005)
    TOES = [(s * d, z) for d, z in ((-.03, .0), (-.01, .012), (.01, .012), (.03, .0))]
    def paw(bm, hx=hx, TOES=TOES):
        blob(bm, (hx, .04, .075), .05, (1.0, .62, 1.5), 1)
        for dx, dz in TOES:
            tube(bm, [(hx + dx, .045, .1 + dz), (hx + dx * 1.15, .03, .155 + dz), (hx + dx * 1.2, .018, .185 + dz)], [.019, .017, .013], 5)
    soft(f'knee{n}__hide', paw, 56, voxel=.006)
    def toe_claws(bm, hx=hx, TOES=TOES):
        for dx, dz in TOES:
            cone(bm, (hx + dx * 1.2, .02, .188 + dz), (hx + dx * 1.25, .003, .222 + dz), .0075)
    hard(f'knee{n}__claw', toe_claws)

result = tally()
