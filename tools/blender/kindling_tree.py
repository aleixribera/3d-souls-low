# The Kindling Tree (STORY.md 10i): the Ember's own root, given limbs, where it began. Level 13's boss.
# One rigid mesh per game bone (js/rig.js skeleton at scale 1, arms 1.5 long), named tree:<bone>__<piece>[.n]. The game
# scales it 2.5x. Rest pose: upright, boughs hanging. Game axes (x = the figure's left, y up, z forward), through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); boughs at x +-.42, y 1.55,
# elbows y 1.1, wrists .65; hips x +-.15, y .90, knees .45. Model bones: vineL / vineR, a root hanging from each bough's
# crook (at the elbow), swinging.
# The look: not a man and not a tree with a face. An enormous trunk of living red-gold wood, tapering up, twisted as if it
# had grown turning toward a light it never had, its foot flaring into buttress roots over two great braids of root;
# two boughs where shoulders would be, gnarled and long, each ending in a splay of thorned twigs; a crown of bare
# branches with a few leaves the colour of embers. In its breast the hollow where the Seven took their coal: a split in
# the bark lipped with pale heartwood, and in its depth the coal that grew back, glowing (`ember`). Thin seams of fire in
# the bark's cracks (`ember`, always); when it catches (`burn`, drawn only while it burns) wide seams of fire climb the
# trunk and boughs and the crown's tips flame.
# Boss budget: about 14,000.
import math, random
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob, bent_spike
from snow_lib import tube as otube
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'bark': (0.36, 0.14, 0.07), 'heartwood': (0.78, 0.56, 0.34), 'root': (0.2, 0.09, 0.05), 'thorn': (0.85, 0.78, 0.62),
       'leaf': (0.85, 0.3, 0.08), 'ember': (1.0, 0.55, 0.15), 'burn': (1.0, 0.42, 0.12)}, prefix='tree:')

SX, SH, EL, WR = .42, 1.55, 1.1, .65
R = random.Random(13)

def V(*p): return Vector(p)

def gnarl(pts, amt, seed):
    """Knock each inner point of a polyline aside a little, the same way every build."""
    r = random.Random(seed); out = [V(*pts[0])]
    for p in pts[1:-1]: out.append(V(*p) + V(r.uniform(-amt, amt), r.uniform(-amt, amt) * .5, r.uniform(-amt, amt)))
    out.append(V(*pts[-1])); return out

def curve(a, b, bend, n=6):
    """n+1 points from a to b, bowed by `bend` at the middle."""
    a, b, bend = V(*a), V(*b), V(*bend)
    return [a.lerp(b, k / n) + bend * math.sin(math.pi * k / n) for k in range(n + 1)]

def limb(bm, pts, r0, r1, sides=8, knots=0, seed=1):
    """A tapering branch through pts, with a few knots (swellings) along it."""
    n = len(pts); radii = [r0 + (r1 - r0) * (k / (n - 1)) ** .9 for k in range(n)]
    tube(bm, pts, radii, sides)
    rr = random.Random(seed)
    for _ in range(knots):
        k = rr.randint(1, n - 2); blob(bm, tuple(pts[k]), radii[k] * 1.35, (1, .8, 1), 1)

def twig(bm, base, d, ln, r, seed, kids=2):
    """A thin twig from base along d (a Vector), forking once or twice near its end."""
    rr = random.Random(seed); d = d.normalized(); tip = base + d * ln
    pts = gnarl([base, base.lerp(tip, .35), base.lerp(tip, .7), tip], ln * .08, seed)
    tube(bm, pts, [r, r * .75, r * .5, r * .15], 5)
    for k in range(kids):
        p = pts[1 + k]; side = V(rr.uniform(-1, 1), rr.uniform(-.3, .8), rr.uniform(-1, 1)).normalized()
        q = p + (d * .6 + side * .7).normalized() * ln * .45
        tube(bm, [p, p.lerp(q, .5), q], [r * .55, r * .35, r * .08], 4)

def thorns(bm, pts, count, ln, seed, r=.012):
    """Thorns jutting from a branch along pts, pointing out and a little toward its tip."""
    rr = random.Random(seed)
    for _ in range(count):
        k = rr.uniform(0, len(pts) - 1.001); i = int(k); f = k - i
        p = pts[i].lerp(pts[i + 1], f); t = (pts[i + 1] - pts[i]).normalized()
        out = t.cross(V(rr.uniform(-1, 1), rr.uniform(-1, 1), rr.uniform(-1, 1))).normalized()
        base = p + out * (r * 2.5); tip = base + (out * .8 + t * .45).normalized() * ln * rr.uniform(.7, 1.2)
        bent_spike(bm, tuple(base), tuple(tip), r * rr.uniform(.8, 1.2), (t * ln * .15)[:], 4)

# ==== THE TRUNK (chest): enormous, tapering up, twisted; the hollow in its breast ===============================================
TRUNK = [(1.94, 0, -.02, .19, .16), (1.86, 0, -.02, .26, .22), (1.74, 0, -.01, .31, .26), (1.6, 0, 0, .34, .28), (1.44, 0, .01, .36, .3),
         (1.28, 0, .015, .39, .32), (1.12, 0, .01, .42, .34), (1.0, 0, 0, .45, .37), (.9, 0, 0, .5, .41), (.78, 0, 0, .52, .43)]   # the last row sinks inside the bole: no gap as it bends
def twist(a, y):   # bark ridges spiralling up the trunk, and the hollow pressed deep into the front
    ridge = .06 * max(0, math.sin(a * 9 + y * 7)) ** 2
    hollow = -.72 * math.exp(-(a / .34) ** 2) * math.exp(-((y - 1.36) / .15) ** 2)
    return ridge + hollow
def trunk(bm):
    loft(bm, TRUNK, 44, cap=True, push=twist)
    for s in (-1, 1):                                       # where the boughs grow out: knotted, sloping into the bark
        blob(bm, (s * .33, 1.62, -.01), .12, (1.2, .9, 1.0), 2)
    for k in range(8):                                      # burls on the bark
        a = R.uniform(-math.pi, math.pi); y = R.uniform(1.06, 1.8)
        if abs(a) < .7 and 1.12 < y < 1.6: continue
        rr = lerp_r(y); blob(bm, (math.sin(a) * rr[0] * .95, y, math.cos(a) * rr[1] * .95), R.uniform(.045, .075), (1, 1.4, .7), 1)
def lerp_r(y):
    for r0, r1 in zip(TRUNK, TRUNK[1:]):
        if r1[0] <= y <= r0[0]:
            f = (y - r0[0]) / (r1[0] - r0[0]); return (r0[3] + (r1[3] - r0[3]) * f, r0[4] + (r1[4] - r0[4]) * f)
    return TRUNK[-1][3:]
soft('chest__bark', trunk, 2200, voxel=.011)
def lips(bm):   # the split's pale heartwood edges, curling outward, torn where the coal was taken
    for s in (-1, 1):
        pts = [(s * .02, 1.57, .22), (s * .1, 1.51, .27), (s * .14, 1.42, .3), (s * .145, 1.31, .31), (s * .12, 1.21, .3), (s * .03, 1.14, .26)]
        tube(bm, gnarl(pts, .008, 3 + s), [.02, .03, .036, .034, .028, .018], 7)
    for k in range(6):                                      # splinters standing out of the lips
        s = 1 if k % 2 else -1; y = 1.2 + k * .06
        bent_spike(bm, (s * .13, y, .3), (s * .21, y + .04, .36), .013, (0, .01, 0), 4)
soft('chest__heartwood', lips, 650, voxel=.006)
def heart(bm):   # the coal that grew back, deep in the hollow, and fire in the bark's cracks
    blob(bm, (0, 1.36, .1), .08, (1, 1.4, .8), 2)
    blob(bm, (.035, 1.45, .12), .035, (1, 1, 1), 1); blob(bm, (-.03, 1.28, .12), .03, (1, 1, 1), 1)
    for k in range(9):                                      # seams of fire down the crevices between the ridges
        a = -math.pi + (k + .5) / 9 * math.tau
        if abs(a) < .55: continue
        pts = []
        for j in range(6):
            y = 1.78 - j * .15; aa = a - (y - 1.0) * 7 / 9 + .17 + .05 * math.sin(j * 2.1 + k)
            rx, rz = lerp_r(y); pts.append(Vector((math.sin(aa) * (rx + .004), y, math.cos(aa) * (rz + .004) + .005)))
        tube(bm, pts, [.004, .007, .008, .008, .007, .004], 4)
hard('chest__ember', heart)
def burn_trunk(bm):   # when it catches: wide seams climbing the trunk to the boughs
    for k in range(7):
        a0 = -math.pi + (k + .5) / 7 * math.tau; pts = []
        for j in range(9):
            y = 1.02 + j * .1; aa = a0 + j * .2 + .1 * math.sin(j * 1.7 + k)
            rx, rz = lerp_r(y); pts.append(Vector((math.sin(aa) * (rx + .012), y, math.cos(aa) * (rz + .012))))
        tube(bm, pts, [.01, .016, .02, .022, .02, .018, .016, .012, .006], 5)
    blob(bm, (0, 1.36, .16), .11, (1.1, 1.5, .5), 2)          # the hollow blazing
hard('chest__burn', burn_trunk)
hard('chest__thorn', lambda bm: [thorns(bm, [V(math.sin(a) * lerp_r(y)[0], y, math.cos(a) * lerp_r(y)[1]) for y in (1.08, 1.34, 1.6, 1.82)], 2, .08, 40 + i, .011)
                                 for i, a in enumerate([1.2, 1.9, 2.6, -1.2, -1.9, -2.6, 3.1])])

# ==== THE BOLE (spin): the trunk flaring into the floor over its two roots, lesser roots splaying out round it ==================
def bole(bm):
    loft(bm, [(1.2, 0, 0, .28, .23), (1.1, 0, 0, .32, .26), (1.0, 0, 0, .38, .31), (.9, 0, 0, .49, .4), (.8, 0, .0, .57, .47), (.71, 0, 0, .62, .51), (.64, 0, 0, .58, .47)], 32, cap=True,
         push=lambda a, y: .1 * max(0, math.sin(a * 7 + y * 6)) ** 2)
    rr = random.Random(77)
    for k in range(9):   # buttress roots from the flare down into the floor, all round
        a = -math.pi + (k + .5) / 9 * math.tau + rr.uniform(-.12, .12)
        if abs(math.sin(a)) > .93: continue   # leave the sides clear for the two great roots
        s, c = math.sin(a), math.cos(a); ln = rr.uniform(.85, 1.1)
        top = V(s * .52, .84, c * .43); mid = V(s * .74 * ln, .3, c * .62 * ln); low = V(s * .92 * ln, .07, c * .78 * ln); end = V(s * 1.12 * ln, .01, c * .95 * ln)
        limb(bm, gnarl([top, top.lerp(mid, .5), mid, low, end], .035, 70 + k), .15, .025, 8, 1, 70 + k)
soft('spin__bark', bole, 1700, voxel=.013)

# ==== THE ROOTS (legs): two great braids, each of three roots, splaying into the floor ==========================================
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    def braid(bm, hx=hx, s=s, top=1.0, bot=.43, seed=0):
        for j in range(3):   # three roots wound about each other
            a0 = j / 3 * math.tau; pts = []
            for k in range(7):
                f = k / 6; y = top + (bot - top) * f; a = a0 + f * 2.4
                pts.append(V(hx + s * .02 * f + math.sin(a) * .07, y, math.cos(a) * .07))
            tube(bm, pts, [.085, .08, .075, .072, .07, .068, .066], 7)
    soft(f'leg{n}__root', lambda bm, hx=hx, s=s: braid(bm, hx, s, 1.02, .43, 0), 900, voxel=.011)
    def foot(bm, hx=hx, s=s):
        for j in range(3):   # the braid goes on down to the ankle
            a0 = j / 3 * math.tau + 2.4; pts = []
            for k in range(5):
                f = k / 4; y = .47 - .4 * f; a = a0 + f * 1.6
                pts.append(V(hx + s * .02 + math.sin(a) * .07 * (1 + .4 * f), y, math.cos(a) * .07 * (1 + .4 * f)))
            tube(bm, pts, [.068, .066, .066, .07, .075], 7)
        rr = random.Random(5 + s)
        for k, a in enumerate((-.5, .1, .7, 1.4, 2.4, 3.2, -1.3)):   # and splays out over the floor
            a = a * s + rr.uniform(-.15, .15); ln = rr.uniform(.42, .62)
            d = V(math.sin(a), 0, math.cos(a)); st = V(hx + s * .02, .1, 0) + d * .05
            pts = [st, st + d * ln * .3 + V(0, -.04, 0), st + d * ln * .65 + V(0, -.07, 0), st + d * ln + V(0, -.09, 0)]
            limb(bm, gnarl(pts, .025, 90 + k + (s > 0) * 20), .06, .015, 6, 0)
    soft(f'knee{n}__root', foot, 1000, voxel=.011)

# ==== THE BOUGHS (arms): gnarled and long, each ending in a splay of thorned twigs =============================================
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    up = gnarl(curve((x, SH + .04, 0), (x + s * .02, EL, .01), (s * .05, 0, .03), 6), .015, 11 + (s > 0))
    lo = gnarl(curve((x + s * .02, EL + .02, .01), (x + s * .01, WR, .02), (s * .04, 0, -.02), 6), .012, 13 + (s > 0))
    def upper(bm, up=up, s=s, x=x):
        limb(bm, up, .16, .1, 9, 2, 21 + (s > 0))
        for k in range(2):   # side shoots
            p = up[2 + 2 * k]; twig(bm, p, V(s * .8, .3 - .5 * k, .3 * (1 - 2 * k)), .2, .022, 31 + k + 10 * (s > 0), 1)
    soft(f'arm{n}__bark', upper, 900, voxel=.01)
    def lower(bm, lo=lo, s=s, x=x):
        limb(bm, lo, .105, .07, 8, 1, 23 + (s > 0))
        twig(bm, lo[3], V(s * .7, .2, -.5), .18, .018, 41 + 10 * (s > 0), 1)
    soft(f'elbow{n}__bark', lower, 700, voxel=.009)
    def claw(bm, s=s, x=x):   # five long twigs from the wrist, splayed like a hand that has never opened
        w = V(x + s * .01, WR + .02, .02)
        blob(bm, tuple(w), .085, (1, 1.2, 1), 2)
        for k in range(5):
            a = (-1 + k / 2) * .55; d = V(s * math.sin(a) * .55, -1, math.cos(a) * .55 + .25).normalized()
            ln = (.4, .48, .54, .48, .38)[k]; tip = w + d * ln + V(0, 0, .08)
            pts = gnarl(curve(w, tip, (0, 0, .07), 4), .012, 51 + k + 10 * (s > 0))
            tube(bm, pts, [.04, .034, .026, .016, .006], 6)
    soft(f'elbow{n}__root', claw, 900, voxel=.0065)
    def bough_thorns(bm, up=up, lo=lo, s=s, x=x):
        thorns(bm, up, 7, .07, 61 + (s > 0), .012); thorns(bm, lo, 6, .06, 63 + (s > 0), .01)
        w = V(x + s * .01, WR + .02, .02)
        for k in range(5):   # each twig's tip a pale hooked thorn
            a = (-1 + k / 2) * .55; d = V(s * math.sin(a) * .55, -1, math.cos(a) * .55 + .25).normalized()
            ln = (.4, .48, .54, .48, .38)[k]; tip = w + d * ln + V(0, 0, .08)
            bent_spike(bm, tuple(tip - d * .02), tuple(tip + d * .1 + V(0, 0, .03)), .012, (0, 0, .02), 4)
    hard(f'elbow{n}__thorn', bough_thorns)
    hard(f'arm{n}__thorn', lambda bm, up=up, s=s: thorns(bm, up, 6, .08, 65 + (s > 0), .013))
    def bough_burn(bm, up=up, lo=lo, s=s):   # fire along each bough's underside when it catches
        tube(bm, [p + V(0, 0, -.07) for p in up[1:-1]], [.014] * (len(up) - 2), 5)
    hard(f'arm{n}__burn', bough_burn)
    hard(f'elbow{n}__burn', lambda bm, lo=lo: tube(bm, [p + V(0, 0, -.055) for p in lo[1:-1]], [.012] * (len(lo) - 2), 5))
    def vine(bm, x=x, s=s):   # a root hanging from the bough's crook, swinging (the vine bones)
        a = V(x + s * .05, EL - .02, -.04)
        pts = gnarl([a, a + V(s * .01, -.15, -.02), a + V(s * .03, -.3, 0), a + V(s * .02, -.45, .01), a + V(s * .03, -.58, .0)], .02, 81 + (s > 0))
        tube(bm, pts, [.026, .022, .018, .012, .004], 6)
        p = pts[2]; tube(bm, [p, p + V(s * .06, -.1, .03), p + V(s * .07, -.2, .04)], [.012, .008, .003], 5)
    soft(f'vine{n}__root', vine, 260, voxel=.006)

# ==== THE CROWN (head): bare branches rising and spreading wide; a few leaves the colour of embers ==============================
CROWN_TIPS = []
def crown(bm):
    blob(bm, (0, 1.9, -.02), .19, (1.1, .7, .95), 2)        # where the trunk ends and the crown begins
    for k in range(8):
        a = -math.pi + (k + .3) / 8 * math.tau + R.uniform(-.2, .2); lean = R.uniform(.7, 1.1)
        base = V(math.sin(a) * .1, 1.92, math.cos(a) * .08 - .02)
        mid = base + V(math.sin(a) * .34 * lean, .34, math.cos(a) * .28 * lean)
        tip = mid + V(math.sin(a) * .44 * lean, R.uniform(.18, .36), math.cos(a) * .36 * lean)
        pts = gnarl([base, base.lerp(mid, .5), mid, mid.lerp(tip, .5), tip], .035, 101 + k)
        limb(bm, pts, .085, .022, 7, 1, 101 + k)
        for j in range(3):   # it forks, and forks again
            p = pts[1 + j]; d = (tip - base).normalized() + V(R.uniform(-.8, .8), R.uniform(.1, .6), R.uniform(-.8, .8))
            q = p + d.normalized() * R.uniform(.22, .36)
            f = gnarl([p, p.lerp(q, .5), q], .02, 111 + k * 3 + j)
            tube(bm, f, [.036 - .006 * j, .022, .007], 5); CROWN_TIPS.append(q)
            if j == 1:
                r2 = q + (d.normalized() + V(R.uniform(-.6, .6), .3, R.uniform(-.6, .6))).normalized() * .16
                tube(bm, [f[1], f[1].lerp(r2, .5), r2], [.014, .01, .004], 4); CROWN_TIPS.append(r2)
        CROWN_TIPS.append(tip)
soft('head__bark', crown, 2000, voxel=.0085)
def leaves(bm):   # a few leaves at the tips, ember-red, each a small bent blade
    rr = random.Random(7)
    for k, t in enumerate(CROWN_TIPS):
        for j in range(4 if k % 3 else 6):
            c = t + V(rr.uniform(-.08, .08), rr.uniform(-.09, .03), rr.uniform(-.08, .08))
            d = V(rr.uniform(-1, 1), rr.uniform(-.6, .3), rr.uniform(-1, 1)).normalized(); n = d.cross(V(rr.uniform(-1, 1), 1, rr.uniform(-1, 1))).normalized()
            L, W = rr.uniform(.055, .08), rr.uniform(.018, .026)
            q = [c, c + d * L * .5 + n * W, c + d * L + V(0, -.012, 0), c + d * L * .5 - n * W]
            vs = [bm.verts.new(G(*p)) for p in q]; bm.faces.new(vs)
hard('head__leaf', leaves, smooth=False)
hard('head__thorn', lambda bm: [thorns(bm, [V(0, 1.92, 0), t], 2, .06, 131 + i, .009) for i, t in enumerate(CROWN_TIPS[::3])])
def crown_fire(bm):   # when it catches: the tips burn
    for k, t in enumerate(CROWN_TIPS):
        if k % 2: continue
        bent_spike(bm, tuple(t - V(0, .03, 0)), tuple(t + V(0, .2, 0)), .05, (.02 * (k % 3 - 1), 0, .02), 6)
        blob(bm, tuple(t), .045, (1, 1, 1), 1)
hard('head__burn', crown_fire)
hard('head__ember', lambda bm: [blob(bm, tuple(t + V(0, -.02, 0)), .02, (1, 1, 1), 1) for t in CROWN_TIPS[1::3]])

result = tally()
