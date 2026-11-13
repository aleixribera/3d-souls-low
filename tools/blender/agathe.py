# Mother Agathe, the Rending Hand (STORY.md 10h): the abbess who held the knife when Thrale's monks tried to cut the Ember
# out of the earth and tore the hill loose into the storm. Level 12's boss. One rigid mesh per game bone (js/rig.js
# skeleton at scale 1), named agathe:<bone>__<piece>[.n]. The game scales her 1.95x. Rest pose: upright, arms hanging.
# Game axes (x = the figure's left, y up, z forward), through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.38, y 1.55, elbows
# y 1.25, wrists .95; hips x +-.15, y .90, knees .45. The great hook is baked on the `weapon` bone (origin the right wrist,
# its haft along +z through the fist, the hook's crescent rising above the haft's head). Model bones: loinF (0, .93, .2),
# loinB (0, .93, -.2), and the mantle's chain capeA (0, 1.58, -.24), capeB (0, 1.14, -.3), capeC (0, .70, -.34).
# The look: an old abbess, tall, narrow and hard, who has held one thing so long she has become the grip on it. A gaunt
# face, hollow-cheeked, a long hooked nose, the mouth a pressed line, framed tight in a white linen coif under a black
# veil that falls to her shoulders and on down her back as a long torn mantle. A white guimpe over the shoulders; a black
# habit to the floor, a storm-grey scapular over it, front and back, its hem torn; a rope cincture knotted at the waist,
# its ends hanging; a rosary of rough grey stones, and on an iron chain the abbey's sign: a ring with a hook through it.
# Wide bell sleeves; long bony hands bound in linen strips (she did not let go). The great hook: an ash haft taller than a
# man, iron-shod, and on its head a crescent blade as long as an arm, curling over and down to an inward point, prayer
# cloths tied under it. In the storm (`storm` slots, shown only while the storm is at her back) a seam of lightning runs
# along the hook's inner edge and the sign on her breast.
# Boss budget: about 14,000.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'skin': (0.62, 0.56, 0.5), 'linen': (0.82, 0.8, 0.74), 'habit': (0.06, 0.06, 0.07), 'scap': (0.3, 0.31, 0.34),
       'iron': (0.3, 0.29, 0.28), 'rope': (0.55, 0.5, 0.42), 'wood': (0.36, 0.28, 0.2), 'steel': (0.5, 0.5, 0.52),
       'wrap': (0.7, 0.66, 0.58), 'leather': (0.12, 0.1, 0.09), 'storm': (0.7, 0.82, 1.0)}, prefix='agathe:')

SX, EL, WR = .38, 1.25, .95

def arcpts(c, r, a0, a1, n, plane):
    """Points on an arc round c: plane 'xz' (round the body, a = 0 forward), 'xy' (side to side)."""
    out = []
    for k in range(n + 1):
        t = a0 + (a1 - a0) * k / n
        if plane == 'xz': out.append((c[0] + math.sin(t) * r[0], c[1], c[2] + math.cos(t) * r[1]))
        else: out.append((c[0] + math.sin(t) * r[0], c[1] + math.cos(t) * r[1], c[2]))
    return out

def lerp_rows(rows, y):
    if y >= rows[0][0]: return rows[0][1:]
    for r0, r1 in zip(rows, rows[1:]):
        if r1[0] <= y <= r0[0]:
            f = (y - r0[0]) / (r1[0] - r0[0]); return tuple(a + (b - a) * f for a, b in zip(r0[1:], r1[1:]))
    return rows[-1][1:]

# ==== HEAD ==================================================================================================================
# ---- the face: long and gaunt, the cheeks hollow under high bones, a long hooked nose, the mouth a pressed line ----------
def face(bm):
    blob(bm, (0, 1.835, -.02), .086, (.84, 1.1, 1.04), 3)          # the skull, long and narrow
    blob(bm, (0, 1.742, .022), .05, (.8, .86, .95), 3)             # the jaw, narrow, the chin pointed
    blob(bm, (0, 1.703, .058), .019, (1.0, .9, .9), 2)             # the chin
    for s in (-1, 1):
        blob(bm, (s * .05, 1.802, .052), .022, (1.0, .62, .7), 2)     # the cheekbones, high and sharp
        blob(bm, (s * .032, 1.842, .07), .02, (1.5, .55, .6), 2)      # the brow ridge, heavy over deep sockets
        blob(bm, (s * .031, 1.817, .07), .012, (1.3, .5, .4), 1)      # the lids, heavy
    blob(bm, (0, 1.79, .088), .013, (.65, 2.1, 1.2), 2)            # the nose, long
    blob(bm, (0, 1.77, .1), .011, (.8, .9, 1.0), 1)                # its hooked tip, drooping
    tube(bm, [(-.022, 1.733, .078), (0, 1.731, .083), (.022, 1.733, .078)], [.004, .0045, .004], 6)   # the mouth, pressed thin
soft('head__skin', face, 1250, voxel=.0048)
# ---- the coif: white linen tight round the face, over the brow and under the chin, round the throat ----------------------
def coif(bm):
    shell(bm, (0, 1.81, -.018), .11, .132, .118, -.9, 1.5, .8, math.tau - .8, nu=16, nv=9)   # round the sides and back
    shell(bm, (0, 1.81, -.018), .112, .132, .12, .45, 1.5, -.95, .95, nu=10, nv=5)              # the band over the brow
    loft(bm, [(1.75, 0, .0, .08, .076), (1.68, 0, -.004, .082, .078), (1.58, 0, -.01, .095, .09)], 14, cap=False)   # the throat
    shell(bm, (0, 1.75, .01), .082, .05, .07, -1.3, .1, -1.0, 1.0, nu=10, nv=4)                # under the chin
hard('head__linen', coif, thick=.009, outward=(0, 1.8, -.01))
# ---- the black veil over the coif, falling back to the shoulders --------------------------------------------------------
def veil(bm):
    def warp(p, a, e):   # it stands off the head a little at the brow and hangs out behind as it falls
        fall = max(0.0, -e) * .06
        return (p[0] * (1 + fall * .4), p[1], p[2] - fall * max(0.0, -math.cos(a)) * .6 - .01 * max(0.0, math.cos(a)))
    shell(bm, (0, 1.825, -.024), .126, .15, .134, -1.45, 1.52, 1.0, math.tau - 1.0, nu=18, nv=10, warp=warp)
hard('head__habit', veil, thick=.008, outward=(0, 1.8, 0))

def drape(bm):   # the veil falls from behind the head over the shoulders and down the back, under the mantle's top
    def at(u, v):
        a = math.pi + (u - .5) * 3.4; r = .12 + .17 * v
        return (math.sin(a) * r * 1.25, 1.72 - .3 * v, math.cos(a) * r * .8 - .05 - .04 * v)
    sheet(bm, 16, 4, at)
hard('chest__habit.1', drape, thick=.008, outward=(0, 1.6, .05))

# ==== CHEST: the habit's body, the guimpe over the shoulders, the scapular, the rosary and the abbey's sign ===============
HAB = [(1.6, -.01, .08, .07), (1.565, -.012, .2, .115), (1.5, 0, .29, .135), (1.4, .008, .24, .135), (1.28, .01, .178, .118),
       (1.15, 0, .158, .108), (1.05, 0, .172, .118)]
hard('chest__habit', lambda bm: loft(bm, [(y, 0, cz, rx, rz) for y, cz, rx, rz in HAB], 22, cap=True))
def hab_at(a, y, out=0.0):
    cz, rx, rz = lerp_rows(HAB, y)
    return Vector((math.sin(a) * (rx + out), y, cz + math.cos(a) * (rz + out)))
def guimpe(bm):   # a round white cape from the throat over the shoulders, longer and pointed in front
    def push(a, y): return 0.0
    rows = []
    for k, (y, rx, rz) in enumerate([(1.62, .096, .09), (1.585, .21, .14), (1.53, .32, .175), (1.46, .345, .185)]):
        rows.append((y, 0, -.006, rx, rz))
    rings = loft(bm, rows, 26, cap=False)
    # the front drawn down into a blunt point
    for v in rings[-1] + rings[-2]:
        p = Vector((v.co.x, v.co.z, -v.co.y)); a = math.atan2(p.x, p.z)
        drop = .07 * max(0.0, math.cos(a)) ** 2 * (1 if v in rings[-1] else .5)
        v.co = G(p.x, p.y - drop, p.z + drop * .25)
hard('chest__linen', guimpe, thick=.008, outward=(0, 1.62, -.02))
def scap_front(bm):   # storm-grey, a hand wide, from under the guimpe to the waist (it goes on to the hem on loinF)
    sheet(bm, 6, 6, lambda u, v: tuple(hab_at((u - .5) * .9, 1.47 - .42 * v, .012)))
hard('chest__scap', scap_front, outward=(0, 1.25, -.1))
def scap_back(bm):
    sheet(bm, 6, 6, lambda u, v: tuple(hab_at(math.pi + (u - .5) * .9, 1.47 - .42 * v, .012)))
hard('chest__scap.1', scap_back, outward=(0, 1.25, .1))
def rosary(bm):   # rough grey stones on a cord: round the neck over the guimpe, a long loop down the front
    r = random.Random(7)
    pts = arcpts((0, 1.575, -.01), (.2, .15), -2.4, 2.4, 22, 'xz')
    loop = []
    for k in range(13):
        f = k / 12; a = (f - .5) * 1.5
        loop.append((math.sin(a) * .16 * (1 - abs(f - .5)), 1.5 - .3 * (1 - (2 * f - 1) ** 2), .19 - .02 * abs(f - .5)))
    for p in pts[::2] + loop:
        blob(bm, p, .013 + r.uniform(-.002, .003), (1 + r.uniform(-.2, .2), .9 + r.uniform(-.1, .2), 1), 1)
hard('chest__rope', rosary)
def sign(bm):   # the abbey's sign on an iron chain: a ring with a hook through it
    for s in (-1, 1):
        tube(bm, [(s * .07, 1.6, .05), (s * .06, 1.48, .14), (s * .02, 1.36, .158)], [.005, .005, .005], 5)
    c = (0, 1.3, .162)
    p = arcpts(c, (.044, .044), 0, math.tau, 18, 'xy'); tube(bm, p, [.008] * len(p), 6)       # the ring
    tube(bm, [(0, 1.355, .166), (0, 1.3, .17), (0, 1.25, .168), (.02, 1.228, .166), (.036, 1.24, .164), (.03, 1.26, .163)],
         [.007, .007, .006, .006, .005, .003], 6)                                              # the hook through it
hard('chest__iron', sign)
def sign_storm(bm):   # the storm in the sign: a seam of light down the hook
    tube(bm, [(0, 1.35, .175), (0, 1.3, .179), (0, 1.25, .177), (.02, 1.232, .175), (.034, 1.244, .173)], [.0035] * 5, 4)
hard('chest__storm', sign_storm)

# ==== SPIN: the habit over the hips, the rope cincture knotted at the front ==================================================
hard('spin__habit', lambda bm: loft(bm, [(1.07, 0, 0, .176, .122), (.9, 0, .004, .215, .16), (.74, 0, 0, .24, .175)], 18, cap=False), thick=.01, outward=(0, .9, 0))
def cincture(bm):
    p = arcpts((0, 1.04, .0), (.188, .132), 0, math.tau, 24, 'xz'); tube(bm, p + [p[0]], [.013] * (len(p) + 1), 6)
    blob(bm, (.05, 1.035, .14), .026, (1.1, 1.0, .8), 2)   # the knot, off to her left
hard('spin__rope', cincture)

# ---- the habit's skirts, front and back, to the floor; the scapular over them, its hem torn ----------------------------------
def skirt_at(s, w, u, v):
    x = (u - .5) * w * (1 + .6 * v)
    return (x, .9 - .86 * v, s * (.17 + .09 * v - .45 * x * x) + .02 * math.sin(u * 14 + v * 3) * v ** .6)
for bone, s, w in (('loinF', 1, .36), ('loinB', -1, .4)):
    hard(f'{bone}__habit', lambda bm, s=s, w=w: sheet(bm, 12, 8, lambda u, v: skirt_at(s, w, u, v), ragged=.03, seed=3 + s), outward=(0, .5, -s * .3))
    hard(f'{bone}__scap', lambda bm, s=s: sheet(bm, 5, 7, lambda u, v: Vector(skirt_at(s, .17, u, v * .8)) + Vector((0, 0, s * .012)),
                                                ragged=.09, seed=11 + s), outward=(0, .5, -s * .3))
def rope_ends(bm):   # the cincture's two ends from the knot, down the front of the skirt, knotted at their tips
    for dx, ln in ((.04, .5), (.07, .42)):
        pts = [(dx + .01, 1.02, .15), (dx + .015, .92, .2), (dx + .01, 1.02 - ln, .2 + .04 * ln)]
        tube(bm, pts, [.009, .009, .009], 5)
        blob(bm, pts[-1], .016, (1, 1.3, 1), 1)
hard('loinF__rope', rope_ends)

# ==== the mantle: the veil's black, from the shoulders to the floor behind her, torn at the hem =============================
TOP, HEM = 1.58, .04
def mantle_at(u, v):   # u across (0 the figure's right), v = 0 the shoulders .. 1 the hem
    y = TOP + (HEM - TOP) * v; w = .44 + .5 * v ** .8
    x = (u - .5) * w
    bow = (.15 - .02 * v) * (1 - math.cos((u - .5) * math.pi))
    z = -.22 - .16 * v ** 1.1 + bow + .045 * math.sin(u * 11 + v * 2.5) * v ** .7
    return (x, y, z)
SEGS = [('capeA', 1.58), ('capeB', 1.14), ('capeC', .70)]
def v_of(y): return (TOP - y) / (TOP - HEM)
for i, (bone, y0) in enumerate(SEGS):
    v0 = 0 if i == 0 else v_of(y0); v1 = v_of(SEGS[i + 1][1]) if i < 2 else 1.0
    hard(f'{bone}__habit', lambda bm, v0=v0, v1=v1, last=(i == 2): sheet(bm, 14, 3, lambda u, v: mantle_at(u, v0 + (v1 - v0) * v),
                                                                     ragged=.12 if last else 0, seed=21), outward=(0, .9, .2))

# ==== ARMS: the habit's sleeves, wide bell cuffs from the elbow; long bony hands bound in linen ===============================
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    soft(f'arm{n}__habit', lambda bm, x=x, s=s: (blob(bm, (x - s * .045, 1.5, 0), .085, (1.1, 1.0, 1.0), 2),
                                                tube(bm, [(x - s * .05, 1.54, 0), (x - s * .01, 1.4, .004), (x, EL + .01, 0)], [.075, .078, .082], 10)), 420, voxel=.008)
    def bell(bm, x=x):   # the sleeve widens from the elbow into a deep bell, open at the wrist
        loft(bm, [(EL + .02, x, 0, .078, .078), (EL - .1, x, -.004, .09, .092), (WR + .12, x, -.012, .12, .124), (WR + .02, x, -.02, .15, .155)],
             16, cap=False)
    hard(f'elbow{n}__habit', bell, thick=.008, outward=lambda c, x=x: (x, c.y, -.01))
    def hand(bm, x=x, s=s):
        tube(bm, [(x, EL - .02, 0), (x, WR + .02, .004)], [.04, .034], 8)                       # the forearm, thin
        if s < 0:   # the right: a closed grip round the haft, the knuckles sharp
            blob(bm, (x + s * .024, WR - .03, 0), .052, (.6, 1.0, 1.12), 2)
            for zf in (-.036, -.012, .012, .036):
                tube(bm, [(x + s * .036, WR - .032, zf), (x + s * .028, WR - .085, zf * 1.1), (x - s * .028, WR - .09, zf * 1.1), (x - s * .046, WR - .044, zf)],
                     [.014, .013, .012, .011], 6)
                blob(bm, (x + s * .03, WR - .086, zf * 1.1), .013, (1, 1, 1), 1)                 # the knuckle
            tube(bm, [(x + s * .02, WR - .008, .052), (x - s * .014, WR - .004, .064), (x - s * .044, WR - .018, .056)], [.013, .012, .01], 6)
        else:       # the left: long fingers half closed, hooked like the blade
            blob(bm, (x, WR - .042, .004), .046, (.48, 1.1, 1.0), 2)
            for k, zf in enumerate((-.03, -.01, .01, .03)):
                ln = (.09, .1, .096, .08)[k]
                tube(bm, [(x, WR - .075, zf), (x + .004, WR - .075 - ln * .55, zf * 1.1 + .01), (x + .006, WR - .075 - ln * .9, zf * 1.15 + .04),
                          (x + .004, WR - .075 - ln * .95, zf * 1.15 + .062)], [.011, .01, .009, .007], 6)
            tube(bm, [(x - .006, WR - .04, .042), (x + .002, WR - .08, .064), (x + .006, WR - .1, .08)], [.012, .01, .008], 6)
    soft(f'elbow{n}__skin', hand, 620, voxel=.005)
    def strips(bm, x=x):   # linen bound round wrist and palm, a loose end
        for k in range(5):
            y = WR + .03 - k * .022; tw = k * .5
            p = arcpts((x, y, .0), (.042 - k * .002, .045), tw, tw + math.tau * .85, 10, 'xz')
            tube(bm, p, [.006] * len(p), 4)
        tube(bm, [(x, WR - .07, -.04), (x + .01, WR - .14, -.05), (x + .004, WR - .2, -.046)], [.008, .007, .005], 4)
    hard(f'elbow{n}__wrap', strips)

# ==== LEGS: the habit's black over the legs (under the skirts); plain soft shoes =============================================
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .13
    soft(f'leg{n}__habit', lambda bm, hx=hx: tube(bm, [(hx, .96, -.01), (hx * 1.03, .72, 0), (hx, .47, .01)], [.09, .072, .054], 8), 160, voxel=.01)
    soft(f'knee{n}__habit', lambda bm, hx=hx: tube(bm, [(hx, .48, .01), (hx, .3, 0), (hx, .12, -.005)], [.052, .045, .04], 8), 140, voxel=.01)
    def shoe(bm, hx=hx):
        blob(bm, (hx, .06, .03), .06, (.75, .7, 1.7), 2)
        blob(bm, (hx, .05, .12), .035, (1.0, .7, 1.2), 1)
    soft(f'knee{n}__leather', shoe, 160, voxel=.009)

# ==== THE GREAT HOOK (on the weapon bone): an ash haft, iron-shod; a crescent blade curling over to an inward point =========
BX, BY = -SX, WR - .045
HEAD = 1.4            # where the haft meets the socket (z, along the haft)
hard('weapon__wood', lambda bm: tube(bm, [(BX, BY, -.78), (BX, BY, .0), (BX, BY, .7), (BX, BY, HEAD)], [.021, .023, .022, .021], 8))
# The crescent's spine, in the plane of the haft and "up" (dy, z): from the socket up and forward, over, and down to a point
# turned back toward the haft. Its width runs inward from the spine (the edge is the inner curve).
CREST = [(0.0, HEAD), (.1, HEAD + .06), (.22, HEAD + .14), (.33, HEAD + .27), (.38, HEAD + .42), (.35, HEAD + .56), (.26, HEAD + .66),
         (.13, HEAD + .7), (.0, HEAD + .67), (-.09, HEAD + .6)]
WID = [.05, .085, .1, .1, .095, .085, .07, .055, .035, .004]
def crest_frames():
    out = []
    for i, (dy, z) in enumerate(CREST):
        a = CREST[max(0, i - 1)]; b = CREST[min(len(CREST) - 1, i + 1)]
        t = Vector((0, b[0] - a[0], b[1] - a[1])).normalized()
        n = Vector((0, -t.z, t.y))                       # the inward normal (toward the curl's centre)
        c = Vector((0, .22, HEAD + .38))
        if n.dot(c - Vector((0, dy, z))) < 0: n = -n
        out.append((Vector((BX, BY + dy, z)), n, WID[i]))
    return out
def blade(bm):   # a diamond section: the spine, a flat to each side, the edge on the inner curve
    rings = []
    for p, n, w in crest_frames():
        th = .016 if w > .02 else .005
        rings.append([bm.verts.new(G(*(p + Vector(o)))) for o in ((0, 0, 0), tuple(n * w * .45 + Vector((th, 0, 0)))[:3],
                                                                     tuple(n * w), tuple(n * w * .45 - Vector((th, 0, 0))))])
    figure_lib.bridge(bm, rings, True, True)
hard('weapon__steel', blade, smooth=False)
def blade_storm(bm):   # the seam of lightning along the inner edge, while the storm is at her back
    pts = [tuple(p + n * w * .9) for p, n, w in crest_frames()[1:-1]]
    tube(bm, pts, [.007] * len(pts), 4)
hard('weapon__storm', blade_storm)
def fittings(bm):   # the socket and its langets, a spur behind, a ring at the grip, the iron shoe at the butt
    tube(bm, [(BX, BY, HEAD - .16), (BX, BY, HEAD - .02), (BX, BY + .01, HEAD + .04)], [.03, .034, .04], 10)
    for s in (-1, 1): tube(bm, [(BX + s * .024, BY, HEAD - .16), (BX + s * .024, BY, HEAD - .42)], [.008, .004], 4)
    tube(bm, [(BX, BY - .02, HEAD - .02), (BX, BY - .1, HEAD - .02), (BX, BY - .16, HEAD + .04)], [.016, .01, .003], 6)   # the spur
    tube(bm, [(BX, BY, .16), (BX, BY, .2)], [.028, .028], 10)
    tube(bm, [(BX, BY, -.7), (BX, BY, -.8), (BX, BY, -.9)], [.026, .02, .004], 8)
hard('weapon__iron', fittings)
def cloths(bm):   # prayer cloths tied under the socket, hanging
    r = random.Random(5)
    tube(bm, [(BX, BY, HEAD - .22), (BX, BY, HEAD - .18)], [.03, .03], 8)
    for k in range(4):
        a = k / 4 * math.tau + .4; dx, dyy = math.sin(a) * .03, math.cos(a) * .03
        ln = r.uniform(.18, .32)
        tube(bm, [(BX + dx, BY + dyy - .01, HEAD - .2), (BX + dx * 1.3, BY - ln * .5, HEAD - .24 - r.uniform(0, .04)), (BX + dx * 1.2, BY - ln, HEAD - .3)],
             [.012, .01, .004], 4)
hard('weapon__wrap', cloths)

result = tally()
