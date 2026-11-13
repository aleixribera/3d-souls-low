# The Gargoyle, the castle's carved guardian woken by the Ember's heat (LORE.md). One rigid mesh per game bone (js/rig.js
# skeleton at scale 1, MODEL_DEFS.gargoyle), named gargoyle:<bone>__<material slot>[.n], so every key pose, the walk and
# the death drive it. Rest pose: upright, arms hanging (the model's posture hunches the chest hard and tilts the wings
# back in the game).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.35, y 1.55, both
# 24% longer (elbow y 1.178, wrist .812, no weapon: the hands are the weapon); hips x +-.15, y .90, knees .45. Extra bones:
# wingL / wingR (+-.14, 1.52, -.15) on the chest, tail (0, .95, -.14) on the spin.
# The look (the MODEL_DEFS brief): dark soot-stained basalt, a roaring fanged hound-demon head under a verdigris bronze
# brow crown, two horns swept back; a carved muscular torso, a bronze collar and a sternum medallion, spikes down the
# spine; long arms with stone forearm plates and long curved talons; heavy thighs over hocked shins and four-taloned
# raptor feet; a stone tail with a spade tip; great gothic stone wings rising from the back, an inward-curling volute at
# each wing's root, a hooked horn at its wrist, four fingers fanning a scalloped stone membrane, two tiers of carved
# covert feathers along its arm. Enemy budget: 3,000 triangles (no weapon).
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'stone': (0.3, 0.29, 0.28), 'carved': (0.36, 0.35, 0.33), 'wing': (0.26, 0.25, 0.24), 'bronze': (0.3, 0.45, 0.38),
       'teeth': (0.62, 0.58, 0.52), 'void': (0.03, 0.03, 0.03)}, prefix='gargoyle:')

SX, EL, WR = .35, 1.178, .812
EYES = [(s * .05, 1.82, .1) for s in (-1, 1)]   # MODEL_DEFS.gargoyle.eyes: head + (0, .13, .1), spread .05
rnd = random.Random(23)

def cone(bm, base, tip, r, sides=3):   # a talon, a fang, a spike
    tube(bm, [base, tip], [r, r * .1], sides)

def hook(bm, pts, r0, sides=4):   # a curved talon or horn through game points, tapering to a point
    n = len(pts)
    tube(bm, pts, [r0 * (1 - .9 * k / (n - 1)) for k in range(n)], sides)

def wedge(bm, p, n, lay, ln, w):
    """A flat closed wedge (an ear, a carved feather, a spike fin): base on a surface at p (its outward normal n), laid along `lay`."""
    p, n, lay = Vector(p), Vector(n).normalized(), Vector(lay).normalized()
    t = lay.cross(n)
    if t.length < 1e-4: t = Vector((1, 0, 0))
    t.normalize()
    a, b, c = p + t * w, p - t * w, p - n * w * .5
    tip = p + lay * ln + n * ln * .12
    vs = [bm.verts.new(G(*q)) for q in (a, b, c, tip)]
    for f in ((0, 1, 3), (1, 2, 3), (2, 0, 3), (0, 2, 1)): bm.faces.new([vs[i] for i in f])

# ---- head: a hound-demon's skull roaring open, fangs, horns swept back, a bronze brow crown -------------------------------
def skull(bm):
    blob(bm, (0, 1.8, -.015), .098, (1.05, .95, 1.05), 2)          # the cranium
    blob(bm, (0, 1.836, .066), .06, (1.55, .55, .8), 1)             # the heavy brow
    blob(bm, (0, 1.79, .11), .062, (1.05, .85, 1.0), 2)             # the snout, root to nose
    blob(bm, (0, 1.778, .168), .048, (1.0, .78, 1.1), 1)
    blob(bm, (0, 1.783, .212), .03, (1.25, .8, .8), 1)
    for s in (-1, 1): blob(bm, (s * .072, 1.77, .028), .05, (.8, 1.1, 1.1), 1)   # the jaw muscles
def snarl(g):   # deep eye sockets under the brow, wrinkles over the snout
    d = 0.0
    for e in EYES:
        r = (g - Vector(e)).length; d -= .016 * max(0, 1 - r / .03)
    if .1 < g.z < .2 and g.y > 1.79:
        d -= .004 * max(0, math.cos((g.z - .1) / .025 * math.pi)) ** 4
    return d
soft('head__carved', skull, 180, voxel=.006, noise=.002, after=snarl)
def jaw(bm):   # the lower jaw dropped open in a roar
    blob(bm, (0, 1.705, .085), .058, (1.15, .42, 1.15), 1)
    blob(bm, (0, 1.688, .15), .04, (1.0, .45, 1.1), 1)
    for s in (-1, 1): blob(bm, (s * .06, 1.725, .04), .03, (.7, 1.2, 1.0), 1)
soft('head__carved.1', jaw, 60, voxel=.006, noise=.002)
hard('head__void', lambda bm: blob(bm, (0, 1.735, .12), .046, (.85, .5, 1.45), 1))   # the throat's dark inside
def fangs(bm):
    for s in (-1, 1):
        cone(bm, (s * .034, 1.758, .19), (s * .03, 1.704, .197), .009)     # upper canines
        cone(bm, (s * .03, 1.698, .168), (s * .029, 1.742, .176), .008)     # lower canines
hard('head__teeth', fangs)
def horns(bm):
    for s in (-1, 1):
        hook(bm, [(s * .055, 1.86, .03), (s * .105, 1.935, -.04), (s * .15, 1.965, -.14), (s * .165, 1.925, -.235), (s * .14, 1.86, -.28)], .032, 4)
hard('head__stone', horns)
def ears(bm):
    for s in (-1, 1):
        wedge(bm, (s * .095, 1.81, -.02), (s, .2, -.2), (s * 1, .45, -.7), .13, .028)
hard('head__stone.1', ears, smooth=False)
def crown(bm):   # a bronze band over the brow, five points rising at the front
    rings = [ring(bm, y, 0, .012, rx, rz, 12) for y, rx, rz in ((1.848, .103, .118), (1.874, .1, .112))]
    bridge(bm, rings)
    for k in range(5):
        a = (k - 2) * .38; p = Vector((math.sin(a) * .106, 1.872, .012 + math.cos(a) * .118))
        n = Vector((math.sin(a), 0, math.cos(a)))
        cone(bm, p - n * .004, p + Vector((0, .05 if k % 2 == 0 else .032, 0)) + n * .012, .013)
hard('head__bronze', crown, outward=lambda c: (0, c.y, .012))

# ---- neck: thick and corded ------------------------------------------------------------------------------------------
def neck(bm):
    loft(bm, [(1.79, 0, -.03, .078, .078), (1.7, 0, -.02, .098, .095), (1.6, 0, -.02, .125, .112)], 8)
    for s in (-1, 1): blob(bm, (s * .06, 1.66, -.05), .05, (1, 1.5, .8), 1)   # the trapezius
soft('neck__carved', neck, 60, voxel=.009, noise=.003)

# ---- chest: a carved muscular torso, wing roots on the back, a bronze collar and medallion, spines ------------------------
TORSO = [(1.0, 0, 0, .17, .12), (1.1, 0, .005, .16, .12), (1.22, 0, .02, .19, .14), (1.34, 0, .03, .23, .16),
         (1.45, 0, .02, .25, .155), (1.54, 0, 0, .23, .14), (1.6, 0, -.01, .15, .11), (1.64, 0, -.02, .1, .09)]
def torso_at(y):
    rows = sorted(TORSO)
    for (y0, _, c0, x0, z0), (y1, _, c1, x1, z1) in zip(rows, rows[1:]):
        if y0 <= y <= y1:
            k = (y - y0) / (y1 - y0); return (c0 + (c1 - c0) * k, x0 + (x1 - x0) * k, z0 + (z1 - z0) * k)
    return rows[0][2:] if y < rows[0][0] else rows[-1][2:]
def surface(a, y, out=0.0):
    cz, rx, rz = torso_at(y)
    return Vector((math.sin(a) * (rx + out), y, cz + math.cos(a) * (rz + out)))
def body(bm):
    loft(bm, TORSO, 12)
    for s in (-1, 1):
        blob(bm, (s * .27, 1.5, 0), .09, (1.1, .85, 1), 1)            # the shoulders
        blob(bm, (s * .095, 1.41, .115), .085, (1.15, .7, .5), 1)     # the pectorals
        blob(bm, (s * .13, 1.47, -.11), .095, (1, 1.15, .65), 1)      # the wing roots over the shoulder blades
        blob(bm, (s * .17, 1.25, -.02), .07, (.7, 1.6, 1), 1)          # the flanks
        for k, y in enumerate((1.28, 1.18, 1.08)):
            blob(bm, (s * .047, y, .125 - .012 * k), .043, (1.05, .8, .45), 1)   # the carved belly
def grooves(g):   # the carving: a line down the sternum and the spine
    d = 0.0
    if abs(g.x) < .012 and 1.05 < g.y < 1.55: d -= .006 * (1 - abs(g.x) / .012)
    return d
soft('chest__carved', body, 280, voxel=.01, noise=.003, after=grooves)
def collar(bm):
    rings = [ring(bm, y, 0, -.012, rx, rz, 12) for y, rx, rz in ((1.585, .158, .124), (1.615, .135, .108))]
    bridge(bm, rings)
hard('chest__bronze', collar, outward=lambda c: (0, c.y, -.012))
hard('chest__bronze.1', lambda bm: blob(bm, (0, 1.47, .176), .034, (1, 1.15, .32), 1))   # the sternum medallion
def spines(bm):
    for k in range(6):
        y = 1.56 - .085 * k; p = surface(math.pi, y, -.01)
        cone(bm, p, p + Vector((0, .04, -.075 + .006 * k)), .022 - .002 * k, 3)
hard('chest__stone', spines, smooth=False)

# ---- spin: the hips and a carved stone loin plate ------------------------------------------------------------------------
def hips(bm):
    loft(bm, [(1.06, 0, .005, .16, .115), (.98, 0, 0, .17, .12), (.9, 0, -.01, .175, .12), (.83, 0, -.005, .155, .11)], 10)
    for s in (-1, 1): blob(bm, (s * .095, .87, -.03), .09, (1, .9, 1), 1)
soft('spin__stone', hips, 90, noise=.003)
def loin(bm):   # a pointed V-plate hanging over the groin, a raised rim round it
    sheet(bm, 3, 2, lambda u, v: ((u - .5) * .22 * (1 - .75 * v), 1.02 - .27 * v, .128 + .03 * v + .015 * math.sin(u * math.pi)))
hard('spin__carved', loin, thick=.022, outward=(0, .95, 0))

# ---- tail: stone, arcing back and down, a spade at the tip ----------------------------------------------------------------
def tail(bm):
    pts, rs = [], []
    for k in range(7):
        t = k / 6; a = t * 2.2
        pts.append((.05 * math.sin(t * 3), .93 - .25 * (1 - math.cos(a)) * .5 - .55 * t * t, -.16 - .42 * math.sin(a * .7)))
        rs.append(.055 * (1 - .78 * t))
    tube(bm, pts, rs, 5)
hard('tail__stone', tail)
def spade(bm):
    tip = Vector((.05 * math.sin(3), .93 - .25 * (1 - math.cos(2.2)) * .5 - .55, -.16 - .42 * math.sin(2.2 * .7)))
    wedge(bm, tip + Vector((0, .02, 0)), (0, 0, -1), (0, -.55, -.6), .13, .05)
hard('tail__carved', spade, smooth=False)

# ---- arms: long and corded, stone plates down the forearm, open hands with long curved talons -----------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    def upper(bm, x=x, s=s):
        loft(bm, [(1.57, x - s * .01, -.005, .082, .082), (1.46, x, 0, .072, .074), (1.34, x, .005, .06, .062),
                  (1.24, x, 0, .052, .054), (EL, x, 0, .05, .05)], 8)
        blob(bm, (x - s * .005, 1.51, 0), .068, (1.05, 1.15, 1), 1)              # the deltoid
        blob(bm, (x, 1.37, .03), .045, (.9, 1.6, .9), 1); blob(bm, (x, 1.39, -.03), .045, (.9, 1.6, .9), 1)
    soft(f'arm{n}__stone', upper, 70, voxel=.008, noise=.003)
    def fore(bm, x=x):
        loft(bm, [(EL + .03, x, 0, .052, .052), (EL - .08, x, -.005, .062, .064), (EL - .22, x, 0, .05, .052), (WR + .03, x, .005, .038, .04)], 8)
        blob(bm, (x, EL, 0), .055, (1, 1, 1), 1)
    soft(f'elbow{n}__stone', fore, 60, voxel=.008, noise=.003)
    def plates(bm, x=x, s=s):   # two carved stone plates on the forearm's outer face, a spur at the elbow
        for y0, y1 in ((EL - .04, WR + .04),):
            sheet(bm, 2, 2, lambda u, v, y0=y0, y1=y1: (x + s * (.058 - .01 * v) * math.cos((u - .5) * 1.6), y0 + (y1 - y0) * v,
                                                          .058 * math.sin((u - .5) * 1.6) * (1 - .3 * v)))
        cone(bm, (x + s * .02, EL + .01, -.045), (x + s * .03, EL - .02, -.13), .022, 4)
    hard(f'elbow{n}__carved', plates, thick=.014, outward=lambda c, x=x: (x, c.y, 0))
    def hand(bm, x=x, s=s):   # a big open hand, four long fingers half curled and a thumb
        blob(bm, (x + s * .01, WR - .035, .004), .048, (.6, 1.25, 1.1), 1)
        for zf in (-.032, -.011, .011, .032):
            tube(bm, [(x + s * .014, WR - .075, zf), (x + s * .016, WR - .125, zf * 1.15), (x + s * .002, WR - .17, zf * 1.2)], [.013, .011, .009], 5)
        tube(bm, [(x + s * .002, WR - .02, .04), (x - s * .012, WR - .05, .058), (x - s * .024, WR - .078, .055)], [.012, .011, .009], 5)
    soft(f'elbow{n}__stone.1', hand, 62, voxel=.0055)
    def talons(bm, x=x, s=s):
        for zf in (-.032, -.011, .011, .032):
            hook(bm, [(x + s * .002, WR - .168, zf * 1.2), (x - s * .018, WR - .2, zf * 1.25), (x - s * .045, WR - .212, zf * 1.25)], .009, 3)
        hook(bm, [(x - s * .022, WR - .076, .056), (x - s * .04, WR - .095, .05), (x - s * .055, WR - .098, .04)], .008, 3)
    hard(f'elbow{n}__carved.1', talons, smooth=False)

# ---- legs: heavy thighs, a pointed knee, hocked shins, four-taloned raptor feet -------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    def thigh(bm, hx=hx):
        loft(bm, [(1.0, hx * .75, -.01, .105, .105), (.88, hx, 0, .112, .112), (.7, hx * 1.02, .01, .095, .098), (.55, hx, 0, .074, .076), (.46, hx, 0, .064, .066)], 8)
        blob(bm, (hx, .74, .05), .06, (.9, 1.6, .8), 1)
    soft(f'leg{n}__stone', thigh, 70, noise=.004)
    def shin(bm, hx=hx):   # back from the knee to a raised hock, then down and forward to the foot
        tube(bm, [(hx, .48, .01), (hx, .36, -.035), (hx, .22, -.08), (hx, .12, -.04), (hx, .06, .03)], [.068, .06, .048, .042, .045], 8)
        blob(bm, (hx, .46, .01), .066, (1, 1, 1), 1)
        blob(bm, (hx, .38, -.05), .055, (1, 1.6, .9), 1)                  # the calf
    soft(f'knee{n}__stone', shin, 70, voxel=.008, noise=.004)
    TOES = [(s * d, z) for d, z in ((-.038, -.004), (0, .018), (.038, -.004))]
    def foot(bm, hx=hx, TOES=TOES):
        blob(bm, (hx, .045, .07), .055, (1.0, .6, 1.4), 1)
        for dx, dz in TOES:
            tube(bm, [(hx + dx * .6, .05, .1 + dz), (hx + dx, .035, .16 + dz), (hx + dx * 1.15, .022, .2 + dz)], [.022, .019, .015], 5)
        tube(bm, [(hx, .05, .03), (hx, .03, -.03)], [.02, .016], 5)          # the hind toe
    soft(f'knee{n}__carved', foot, 50, voxel=.006)
    def claws(bm, hx=hx, TOES=TOES, s=s):
        for dx, dz in TOES:
            hook(bm, [(hx + dx * 1.15, .03, .2 + dz), (hx + dx * 1.2, .028, .235 + dz), (hx + dx * 1.22, .004, .255 + dz)], .012, 3)
        hook(bm, [(hx, .03, -.028), (hx, .02, -.065), (hx, .002, -.075)], .011, 3)
        cone(bm, (hx, .49, .05), (hx, .56, .1), .024, 4)                        # the knee's spur
    hard(f'knee{n}__carved.1', claws, smooth=False)

# ---- wings: an arm from the back to a high wrist, four fingers fanning a scalloped membrane -------------------------------
def frame(s):   # a point of the wing in its own terms (x outward, y up, z forward) -> game space; the def's size 1.02
    R = Vector((s * .14, 1.52, -.15))
    return lambda p: R + Vector((s * p[0], p[1], p[2])) * 1.02

WRIST = (.8, .95, -.12)
RAYS = [   # from the wrist out; in order round the fan, the membrane spans each neighbouring pair
    [WRIST, (.4, .5, -.1), (.05, .06, -.02)],          # the arm, back to the root
    [WRIST, (.42, .2, -.13), (.1, -.3, -.04)],         # the membrane's root on the back
    [WRIST, (.74, .32, -.17), (.62, -.42, -.2)],       # four fingers, innermost first
    [WRIST, (1.04, .44, -.16), (1.2, -.08, -.18)],
    [WRIST, (1.24, .78, -.12), (1.56, .42, -.14)],
    [WRIST, (1.25, 1.07, -.07), (1.62, 1.0, -.07)],
]
SCALLOP = [0, .22, .28, .28, .22]
def along(ray, v):
    f = v * (len(ray) - 1); i = min(int(f), len(ray) - 2); k = f - i
    return Vector(ray[i]).lerp(Vector(ray[i + 1]), k)
def membrane_at(i, t, v):
    w = v * (1 - SCALLOP[i] * math.sin(t * math.pi))
    p = along(RAYS[i], w).lerp(along(RAYS[i + 1], w), t)
    p.z -= .05 * math.sin(t * math.pi) * math.sin(v * math.pi)          # a billow back between the fingers
    return p
for s, n in ((1, 'L'), (-1, 'R')):
    W = frame(s)
    def membrane(bm, W=W):
        for i in range(len(RAYS) - 1):
            sheet(bm, 3, 4, lambda t, v, i=i: W(membrane_at(i, t, .07 + .93 * v)))
    hard(f'wing{n}__wing', membrane, smooth=True)
    def bones(bm, W=W, s=s):
        tube(bm, [W(p) for p in (RAYS[0][2], (.2, .25, -.06), RAYS[0][1], (.62, .76, -.11), WRIST)], [.06, .055, .048, .042, .045], 4)
        for ray in RAYS[2:]:
            tube(bm, [W(p) for p in (WRIST, ray[1], ray[2])], [.032, .022, .006], 4)
        tube(bm, [W(p) for p in (RAYS[1][1], RAYS[1][2])], [.016, .01], 4)
        hook(bm, [W(p) for p in ((.8, .97, -.12), (.84, 1.1, -.1), (.8, 1.22, -.06), (.72, 1.27, -.02))], .04, 4)   # the wrist's horn
        pts = []                                                                    # the volute curling in over the root
        for k in range(7):
            a = -.6 + k / 6 * math.tau * 1.05; r = .13 * (1 - .62 * k / 6)
            pts.append(W((.07 + math.cos(a) * r, .36 + math.sin(a) * r, -.05)))
        tube(bm, pts, [.034 * (1 - .55 * k / 6) for k in range(7)], 4)
    hard(f'wing{n}__stone', bones)
    def coverts(bm, W=W):   # two tiers of carved stone feathers hanging off the arm over the membrane
        for tier, (n_, off, ln) in enumerate(((8, .02, .17), (6, .14, .15))):
            for k in range(n_):
                t = .12 + .82 * (k + .5 * tier) / n_
                a = Vector(RAYS[0][2]).lerp(Vector(WRIST), t)
                lay = Vector((.62, -.78, -.05)); base = a + lay * off + Vector((0, 0, .03 + .012 * tier))
                g0, g1 = W(base), W(base + lay * ln)
                wedge(bm, g0, Vector((0, 0, 1)), g1 - g0, ln * (1 + rnd.uniform(-.1, .1)), .058)
    hard(f'wing{n}__carved', coverts, smooth=False)

result = tally()
