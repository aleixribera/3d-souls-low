# The Ash Bear, a summon (the ability of the same name, design/abilities/ash-bear.md): a massive bear of packed grey ash
# that rises beside the boss, rears and mauls it. Not a rig figure: one rigid mesh per joint of its own, named
# bear:<part>__<material slot>[.n], each built at its absolute rest place; js/summon-brutes.js hangs each on a pivot
# (BRUTE_JOINTS.bear there, the same numbers as JOINT below) and moves it by hand. It rears by turning `body` about its
# hips (the hind legs hang from the root, so they stay planted) and swipes with both forepaws.
# Game axes (x = the bear's left, y up, z forward: its nose points +z), written to Blender through G(). Built on all fours.
# Joints at rest (x, y, z), parent:
#   body  (0, 1.0, -.55)      root     (the hips: the whole trunk, shoulders and hump hang from it)
#   neck  (0, 1.3, .72)       body     head (0, 1.28, 1.05) neck     jaw (0, 1.12, 1.18) head
#   fLu   (+-.34, 1.18, .55)  body     fLl  (+-.36, .58, .6)   fLu   (the forelegs: upper and lower with the paw)
#   hLu   (+-.32, 1.02, -.6)  root     hLl  (+-.34, .52, -.74) hLu   (the hind legs)
# The look: the shoulders hump high; its hide is thick overlapping plates like cracked cooling slag (`ash`), each a flat
# faceted slab, over a charred core whose seams between the plates glow (`ember`, the game makes it glow blue, white-hot
# inside); a heavy head with a short muzzle and small ember eyes; long ink claws (`char`). Its outline is broken into
# plates so it reads as made, not alive. 1.6 m at the shoulder on all fours, about 3.2 m reared. About 5,000 triangles (the plates are the look).
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob, bent_spike
from snow_lib import tube as stube
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'ash': (0.6, 0.58, 0.55), 'char': (0.043, 0.051, 0.071), 'ember': (0.56, 0.72, 0.86)}, prefix='bear:')
rnd = random.Random(147)

JOINT = {'body': (0, 1.0, -.55), 'neck': (0, 1.3, .72), 'head': (0, 1.28, 1.05), 'jaw': (0, 1.12, 1.18),
         'fLu': (.34, 1.18, .55), 'fLl': (.36, .58, .6), 'hLu': (.32, 1.02, -.6), 'hLl': (.34, .52, -.74)}

def inside(p, ells, margin):
    for (c, r) in ells:
        d = sum(((p[k] - c[k]) / (r[k] + margin)) ** 2 for k in range(3))
        if d < 1: return True
    return False

def slab(bm, p, n, size, th, sides=6):
    """A flat faceted plate centred on surface point p (game Vector), facing n: an irregular polygon `size` across,
    `th` thick, tilted a little at random so the plates overlap like slag."""
    n = (n + Vector((rnd.uniform(-.12, .12), rnd.uniform(-.12, .12), rnd.uniform(-.12, .12)))).normalized()
    a = n.cross(Vector((0, 1, 0)) if abs(n.y) < .9 else Vector((1, 0, 0))).normalized(); b = n.cross(a)
    spin = rnd.uniform(0, math.tau)
    rim = [size * rnd.uniform(.75, 1.05) for _ in range(sides)]
    top, bot = [], []
    for k in range(sides):
        ang = spin + k / sides * math.tau
        q = p + (a * math.cos(ang) + b * math.sin(ang)) * rim[k]
        top.append(bm.verts.new(G(*(q + n * th * .5)))); bot.append(bm.verts.new(G(*(q - n * th * .5))))
    bm.faces.new(top)   # no underside: it faces the core and is never seen
    for k in range(sides):
        j = (k + 1) % sides; bm.faces.new((top[j], top[k], bot[k], bot[j]))

def plates(ells, size, cover=1.15, th=.06, lift=.0):
    """Plates over a union of ellipsoids ((centre, radii) game tuples), spread evenly (a Fibonacci spiral, as many as
    cover each one's surface `cover` times over); those that would sit inside another ellipsoid are dropped, so the
    seams show where the shapes meet."""
    def build(bm):
        for i, (c, r) in enumerate(ells):
            p_ = 1.6; area = 4 * math.pi * (((r[0] * r[1]) ** p_ + (r[0] * r[2]) ** p_ + (r[1] * r[2]) ** p_) / 3) ** (1 / p_)
            N = max(4, round(area * cover / (math.pi * size * size)))
            for k in range(N):
                u = 1 - 2 * (k + .5) / N + rnd.uniform(-.3, .3) / N; v = k * 2.39996 + rnd.uniform(-.2, .2); s = math.sqrt(max(0, 1 - u * u))
                d = Vector((s * math.cos(v), u, s * math.sin(v)))
                p = Vector((c[0] + d.x * r[0], c[1] + d.y * r[1], c[2] + d.z * r[2]))
                if p.y < .05: continue
                if inside(p, ells[:i] + ells[i + 1:], -.02): continue
                n = Vector((d.x / r[0], d.y / r[1], d.z / r[2])).normalized()
                slab(bm, p + n * lift, n, size * rnd.uniform(.9, 1.15), th, 5)
    return build

def core(ells):
    def build(bm):
        for c, r in ells: blob(bm, c, 1, r, 2)
    return build

# ---- body: hips, barrel, the high shoulder hump ----------------------------------------------------------------------
BODY = [((0, 1.0, -.45), (.48, .46, .5)), ((0, 1.08, .05), (.55, .52, .55)), ((0, 1.28, .45), (.5, .42, .42)),
        ((0, 1.02, .5), (.45, .38, .4))]
soft('body__ember', core([(c, (r[0] * .95, r[1] * .95, r[2] * .95)) for c, r in BODY]), 300, voxel=.03)
hard('body__ash', plates(BODY, .2, th=.07), smooth=False)

# ---- neck and head: a thick neck, a heavy skull, a short muzzle, small ember eyes ------------------------------------
NECK = [((0, 1.28, .78), (.3, .3, .3))]
soft('neck__ember', core([(c, (r[0] * .95, r[1] * .95, r[2] * .95)) for c, r in NECK]), 160, voxel=.025)
hard('neck__ash', plates(NECK, .17, th=.06), smooth=False)
HEAD = [((0, 1.3, 1.08), (.25, .23, .25)), ((0, 1.2, 1.3), (.14, .12, .16))]
soft('head__ember', core([(c, (r[0] * .95, r[1] * .95, r[2] * .95)) for c, r in HEAD]), 200, voxel=.02)
hard('head__ash', plates(HEAD, .12, th=.05), smooth=False)
def ears(bm):
    for s in (1, -1): blob(bm, (s * .17, 1.5, 1.0), .07, (1, 1, .55), 1)
    blob(bm, (0, 1.24, 1.45), .05, (1.1, .75, .6), 1)   # the nose
hard('head__char', ears, smooth=False)
def eyes(bm):
    for s in (1, -1): blob(bm, (s * .1, 1.36, 1.27), .028, (1, .8, .6), 1)
hard('head__ember.1', eyes)
def jaw(bm):
    blob(bm, (0, 1.1, 1.26), 1, (.11, .05, .16), 1)
hard('jaw__ash', jaw, smooth=False)
def teeth(bm):
    for s in (1, -1): bent_spike(bm, (s * .06, 1.13, 1.38), (s * .06, 1.19, 1.39), .015, sides=4)
hard('jaw__char', teeth)

# ---- legs: thick plated columns, broad paws, long ink claws ---------------------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    fu = [((s * .34, .9, .58), (.2, .34, .22))]
    soft(f'f{n}u__ember', core(fu), 120, voxel=.025)
    hard(f'f{n}u__ash', plates(fu, .14, th=.05), smooth=False)
    fl = [((s * .36, .36, .62), (.15, .3, .16)), ((s * .36, .08, .7), (.17, .08, .2))]
    soft(f'f{n}l__ember', core(fl), 120, voxel=.025)
    hard(f'f{n}l__ash', plates(fl, .12, th=.045), smooth=False)
    def fclaws(bm, s=s):
        for k in (-1, 0, 1): bent_spike(bm, (s * .36 + k * .07, .06, .86), (s * .36 + k * .08, .0, 1.02), .025, (0, .03, 0), sides=4)
    hard(f'f{n}l__char', fclaws)
    hu = [((s * .32, .82, -.62), (.24, .36, .3))]
    soft(f'h{n}u__ember', core(hu), 120, voxel=.025)
    hard(f'h{n}u__ash', plates(hu, .15, th=.05), smooth=False)
    hl = [((s * .34, .3, -.72), (.14, .28, .15)), ((s * .34, .07, -.62), (.16, .07, .21))]
    soft(f'h{n}l__ember', core(hl), 110, voxel=.025)
    hard(f'h{n}l__ash', plates(hl, .11, th=.045), smooth=False)
    def hclaws(bm, s=s):
        for k in (-1, 0, 1): bent_spike(bm, (s * .34 + k * .065, .05, -.45), (s * .34 + k * .07, .0, -.34), .02, (0, .02, 0), sides=4)
    hard(f'h{n}l__char', hclaws)

result = tally()
