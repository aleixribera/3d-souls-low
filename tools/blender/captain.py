# The Pillager Captain, the Ashbound's commander (STORY.md: the king's own army, turned, taken by the burned towns for
# invaders). One rigid mesh per game bone (js/rig.js skeleton at scale 1, MODEL_DEFS.pillagerCaptain), named
# captain:<bone>__<material slot>[.n], so every key pose, the walk, the cloth swing and the death drive it. The game scales
# him 1.45x. Rest pose: upright, arms hanging (the model's posture leans him a little and bends the elbows in the game).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.40, y 1.55,
# elbows y 1.25, wrists y .95 (the bill's haft runs along z through the right fist, baked on the `weapon` bone); hips x +-.15,
# y .90, knees .45. Cloth bones (they swing): loinF (0, .93, .17), loinB (0, .93, -.17), and the cloak's chain capeA
# (0, 1.58, -.24), capeB (0, 1.16, -.24), capeC (0, .74, -.24), capeD (0, .40, -.24).
# The look (the MODEL_DEFS brief): a warlord in blackened plate over mail, wearing no colours. A sallet war-helm with a
# keeled crown, a long flared tail, a dark eye slit with the ember light behind it and a pointed bevor; great iron ram
# horns curling from its temples. A wide gorget of lames; a breastplate with a medial keel and rivets, a plackart over
# the belly; layered pauldrons, three lames stepping down the arm, iron spikes along the crown; fanned couters,
# vambraces, gauntlets closed in fists; a belt with an iron buckle, three fauld lames, a mail skirt; scorched
# loincloths front and back, a red rag of sash over the front one; cuisses, knee cops, keeled greaves, sabatons; a dark
# cloak from the shoulders, worn through and torn into strips below the knee. Boss budget: 14,000 triangles with the
# bill. Pass 63: his own weapon, a pillager's bill (below), held in both hands (MODEL_DEFS `grip`), and breaths in the bevor.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'plate': (0.2, 0.19, 0.19), 'mail': (0.16, 0.16, 0.16), 'iron': (0.32, 0.27, 0.24), 'leather': (0.2, 0.2, 0.2),
       'cloak': (0.22, 0.17, 0.16), 'cloakHem': (0.22, 0.17, 0.16), 'scorch': (0.36, 0.17, 0.13), 'sash': (0.6, 0.16, 0.1),
       'void': (0.02, 0.02, 0.02), 'wood': (0.3, 0.22, 0.16), 'blade': (0.42, 0.4, 0.38), 'pitch': (0.05, 0.04, 0.035),
       'burn': (1.0, 0.45, 0.12)}, prefix='captain:')

SX, EL, WR = .40, 1.25, .95
SLIT = 1.825   # the eye slit: MODEL_DEFS.pillagerCaptain.eyes glow behind it

def cone(bm, base, d, r, h, sides=5):
    """A spike: a `sides`-gon of radius r at `base`, its tip h along direction d."""
    base, d = Vector(base), Vector(d).normalized()
    a = d.cross(Vector((0, 1, 0)) if abs(d.y) < .9 else Vector((1, 0, 0))).normalized(); b = d.cross(a)
    ring_ = [bm.verts.new(G(*(base + (a * math.cos(k / sides * math.tau) + b * math.sin(k / sides * math.tau)) * r))) for k in range(sides)]
    tip = bm.verts.new(G(*(base + d * h)))
    for k in range(sides): bm.faces.new((ring_[k], ring_[(k + 1) % sides], tip))
    bm.faces.new(list(reversed(ring_)))

# ---- head: a sallet with a keeled crown and a long flared tail, an eye slit, a pointed bevor; ram horns ----------------------
def crown(a, y):   # a low keel front to back over the crown
    return .09 * abs(math.cos(a)) ** 14 * max(0, min(1, (y - 1.88) / .06))
def tail(a, y):    # the sallet's tail: the back of the helm sweeps out and down over the nape
    return .32 * max(0.0, -math.cos(a)) ** 2 * max(0, min(1, (1.82 - y) / .1))
SALLET = [(2.0, 0, -.02, .03, .034), (1.985, 0, -.02, .082, .094), (1.955, 0, -.02, .118, .134), (1.91, 0, -.02, .138, .156),
          (1.86, 0, -.02, .146, .164), (1.81, 0, -.02, .148, .168), (1.765, 0, -.03, .152, .172), (1.73, 0, -.05, .16, .178)]
hard('head__plate', lambda bm: loft(bm, SALLET, 16, cap=False, push=lambda a, y: crown(a, y) + tail(a, y)), outward=(0, 1.86, -.02))

def helm_point(a, y, lift=.004):
    """A point on the sallet's surface at angle a, height y, lifted off it."""
    rows = SALLET[::-1]
    for r0, r1 in zip(rows, rows[1:]):
        if r0[0] <= y <= r1[0]:
            f = (y - r0[0]) / (r1[0] - r0[0]); cz, rx, rz = (r0[k] + (r1[k] - r0[k]) * f for k in (2, 3, 4)); break
    r = 1 + crown(a, y) + tail(a, y) + lift
    return (math.sin(a) * rx * r, y, cz + math.cos(a) * rz * r)

def slit(bm):   # the dark eye slit across the front, and the breaths: three short slots each side below it
    cols, half = 8, 1.0
    a_ = [bm.verts.new(G(*helm_point(-half + 2 * half * i / cols, SLIT + .012))) for i in range(cols + 1)]
    b_ = [bm.verts.new(G(*helm_point(-half + 2 * half * i / cols, SLIT - .012))) for i in range(cols + 1)]
    for i in range(cols): bm.faces.new((a_[i], a_[i + 1], b_[i + 1], b_[i]))
hard('head__void', slit, outward=(0, 1.83, -.02))

def bevor(bm):   # a pointed chin guard over the lower face, from the slit's lip down over the gorget
    rows = [(SLIT - .018, 0, -.012, .156, .176), (1.77, 0, -.006, .158, .184), (1.72, 0, .0, .148, .182), (1.67, 0, -.008, .128, .162)]
    keel = lambda a, y: .1 * max(0.0, math.cos(a)) ** 6
    loft(bm, rows, 10, cap=False, a0=-1.75, a1=1.75, push=keel)
hard('head__plate.1', bevor, outward=(0, 1.76, -.04))

def horns(bm):   # iron ram horns: up and back from the temples, round behind the ear, the tips curling forward
    for s in (-1, 1):
        C = Vector((0, 1.87, -.08)); n = 22; pts, rad = [], []
        phi0 = .7; sweep = 1.72 * math.pi
        for i in range(n + 1):
            t = i / n; phi = phi0 - sweep * t; r = .15 - .045 * t
            x = s * (.1 + .21 * t ** .7)
            pts.append((x, C.y + math.cos(phi) * r, C.z + math.sin(phi) * r))
            rad.append((.056 - .042 * t) * (1 + .1 * (i % 2)))   # ribbed growth rings
        tube(bm, pts, rad, 7)
hard('head__iron', horns)

# ---- neck: mail under the helm ---------------------------------------------------------------------------------------------
hard('neck__mail', lambda bm: loft(bm, [(1.76, 0, -.02, .1, .1), (1.6, 0, -.01, .11, .11)], 8, cap=False), outward=(0, 1.68, -.01))

# ---- chest: a breastplate with a medial keel and rivets, a plackart, a gorget of lames -----------------------------------------
CUIRASS = [(1.64, 0, -.02, .18, .13), (1.58, 0, -.005, .28, .19), (1.47, 0, .015, .3, .205), (1.34, 0, .025, .27, .205),
           (1.21, 0, .02, .225, .175), (1.1, 0, .005, .205, .16)]
def keel(a, y): return .06 * max(0.0, math.cos(a)) ** 8 * max(0, min(1, (1.6 - y) / .12))
def cuirass(bm):
    loft(bm, CUIRASS, 16, cap=True, push=keel)
    for (y0, r0, y1, r1) in ((1.6, .245, 1.655, .2), (1.645, .205, 1.695, .16), (1.685, .165, 1.73, .132)):   # the gorget's lames
        loft(bm, [(y0, 0, -.015, r0, r0 * .78), (y1, 0, -.017, r1, r1 * .82)], 14, cap=False)
hard('chest__plate', cuirass)
def plackart(bm):   # a plate over the belly, its top edge pointed up the keel
    loft(bm, [(1.3, 0, .03, .278, .214), (1.22, 0, .025, .238, .19), (1.12, 0, .01, .214, .172)], 10, cap=False, a0=-1.45, a1=1.45,
         push=lambda a, y: keel(a, y) + .035)
hard('chest__plate.1', plackart, outward=lambda c: (0, c.y, -.05))
def torso(y):   # the cuirass's ellipse at height y: centre z, rx, rz
    rows = CUIRASS[::-1]
    if y <= rows[0][0]: return rows[0][2], rows[0][3], rows[0][4]
    for r0, r1 in zip(rows, rows[1:]):
        if y <= r1[0]:
            f = (y - r0[0]) / (r1[0] - r0[0]); return tuple(r0[k] + (r1[k] - r0[k]) * f for k in (2, 3, 4))
    return rows[-1][2], rows[-1][3], rows[-1][4]
def rivets(bm):   # a row of rivets round the plackart's top edge and down the keel
    for k in range(9):
        a = -1.3 + 2.6 * k / 8; y = 1.3 - .012
        cz, rx, rz = torso(y); r = 1 + keel(a, y) + .05
        stud(bm, (math.sin(a) * rx * r, y, cz + math.cos(a) * rz * r), .011)
    for y in (1.52, 1.45, 1.38):
        cz, rx, rz = torso(y)
        for s in (-1, 1):
            a = s * .22; r = 1 + keel(a, y) + .02
            stud(bm, (math.sin(a) * rx * r, y, cz + math.cos(a) * rz * r), .009)
hard('chest__iron', rivets)

# ---- spin: a belt with an iron buckle, three fauld lames, the mail skirt -------------------------------------------------------
hard('spin__leather', lambda bm: loft(bm, [(1.13, 0, .005, .21, .166), (1.07, 0, .006, .215, .17)], 12, cap=False), outward=(0, 1.1, 0))
def buckle(bm):
    blob(bm, (0, 1.1, .178), .034, (1.15, .95, .35), 1)
    blob(bm, (.08, 1.1, .17), .014, (1, 1, .6), 1)
hard('spin__iron', buckle)
def fauld(bm):
    for i in range(3):
        y0 = 1.075 - i * .065
        loft(bm, [(y0, 0, .006, .215 + .018 * i, .17 + .012 * i), (y0 - .085, 0, .01, .238 + .018 * i, .184 + .012 * i)], 12, cap=False,
             a0=-2.2, a1=2.2)
hard('spin__plate', fauld, outward=lambda c: (0, c.y + .05, 0))
hard('spin__mail', lambda bm: loft(bm, [(1.0, 0, .0, .222, .172), (.86, 0, .0, .25, .19), (.72, 0, -.005, .262, .2)], 12, cap=False),
     outward=lambda c: (0, c.y, 0))

# ---- the loincloths: scorched cloth front and back, a red rag of sash over the front one -----------------------------------------
def loin(name, z, w, top, hem, seed, rag):
    sz = 1 if z > 0 else -1
    def at(u, v, w=w):
        x = (u - .5) * w; y = top + (hem - top) * v
        return (x, y, z + sz * (.02 * math.cos((u - .5) * math.pi) + .03 * v))
    hard(name, lambda bm: sheet(bm, 5, 4, at, ragged=rag, seed=seed))
loin('loinF__scorch', .2, .3, .99, .42, 3, .1)
loin('loinB__scorch', -.205, .32, .99, .4, 7, .12)
def sash(bm):
    def at(u, v):
        x = .07 + (u - .5) * .085 + .02 * v; y = 1.03 + (.38 - 1.03) * v
        return (x, y, .22 + .03 * v + .012 * math.cos((u - .5) * math.pi))
    sheet(bm, 2, 5, at, ragged=.06, seed=11)
hard('loinF__sash', sash)

# ---- the cloak: from the shoulders behind the pauldrons, worn through and torn into strips below the knee ----------------------
TOP, HEM = 1.6, .05
def cloak_at(u, v):   # u across (0 the figure's right), v = 0 the shoulders .. 1 the hem
    y = TOP + (HEM - TOP) * v; w = .6 + .36 * v ** .8
    x = (u - .5) * w
    bow = (.12 - .04 * v) * (1 - math.cos((u - .5) * math.pi))          # the edges wrap forward round the body
    z = -.235 - .09 * v ** 1.2 - .04 * math.sin(v * math.pi) + bow
    if v < .08: z += .06 * (1 - v / .08) ** 2                               # it turns over the shoulders' top
    return (x, y, z)
SEGS = [('capeA', 1.58), ('capeB', 1.16), ('capeC', .74), ('capeD', .40)]
def v_of(y): return (TOP - y) / (TOP - HEM)
for i, (bone, y0) in enumerate(SEGS[:3]):
    v0, v1 = v_of(min(TOP, y0 + .02)) if i == 0 else v_of(y0), v_of(SEGS[i + 1][1])
    v0 = 0 if i == 0 else v0
    rows = 3 if i == 0 else 2
    hard(f'{bone}__cloak', lambda bm, v0=v0, v1=v1, rows=rows: sheet(bm, 10, rows, lambda u, v: cloak_at(u, v0 + (v1 - v0) * v)))
def strips(bm):   # below the knee the cloak hangs in torn strips of different lengths
    r = random.Random(4); n = 7; v0 = v_of(.40)
    for k in range(n):
        u0, u1 = k / n + .006, (k + 1) / n - .006; ln = r.uniform(.72, 1.0)
        sheet(bm, 2, 3, lambda u, v, u0=u0, u1=u1, ln=ln: cloak_at(u0 + (u1 - u0) * u, v0 + (1 - v0) * ln * v), ragged=.07, seed=k + 20)
hard('capeD__cloakHem', strips)

# ---- arms: mail sleeves under layered pauldrons with iron spikes along the crown -----------------------------------------------
PY, PR = 1.6, .19
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX; cx = s * .37
    hard(f'arm{n}__mail', lambda bm, x=x: loft(bm, [(1.62, x, 0, .085, .085), (1.42, x, 0, .08, .08), (EL + .03, x, 0, .072, .072)], 8, cap=True))
    def pauldron(bm, x=x, s=s, cx=cx):
        shell(bm, (cx, PY, -.01), PR, .13, PR * .95, 0, math.pi / 2, 0, math.tau, nu=14, nv=4,
              warp=lambda p, a, e, cx=cx, s=s: (p.x, p.y - .06 * max(0, (p.x - cx) * s) / PR, p.z))
        side = s * math.pi / 2
        for k, (y0, y1, r) in enumerate(((1.57, 1.49, .19), (1.5, 1.42, .17), (1.43, 1.36, .15))):   # three lames stepping down
            loft(bm, [(y0, x + s * .02, -.01, r * .82, r * .86), (y1, x + s * .03, -.01, r * .9, r * .94)], 8, cap=False,
                 a0=side - 1.95, a1=side + 1.95)
    hard(f'arm{n}__plate', pauldron, thick=.016)
    def spikes(bm, x=x, s=s, cx=cx):   # a row of spikes along the pauldron's crown, front to back, raking outward
        for k, z in enumerate((.09, .0, -.09)):
            h = .13 if k == 1 else .1
            cone(bm, (cx + s * .05, PY + .115, z), (s * .45, 1, -.15 * (k - 1)), .03, h, 5)
        for k in range(5):   # rivets round the cap's rim
            a = s * (math.pi / 2) - 1.5 + 3 * k / 4
            stud(bm, (cx + math.sin(a) * PR * 1.02, PY - .015, -.01 + math.cos(a) * PR * .97), .011)
    hard(f'arm{n}__iron', spikes)

# ---- forearms: fanned couters, vambraces, flared cuffs; gauntlets closed in fists ------------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    def couter(bm, x=x, s=s):   # a cup over the back of the elbow and a fan wing on the outside
        shell(bm, (x, EL, -.02), .085, .085, .08, -1.0, 1.1, math.pi - 1.4, math.pi + 1.4, nu=6, nv=3)
        def fan(u, v):
            a = -1.0 + 2.0 * u; r = .07 + .07 * v
            return (x + s * (.06 + .03 * v), EL + math.sin(a) * r * .9, -.01 + math.cos(a) * r * .5 - .02)
        sheet(bm, 5, 1, fan)
    hard(f'elbow{n}__plate', couter, thick=.012)
    hard(f'elbow{n}__plate.1', lambda bm, x=x: loft(bm, [
        (EL - .05, x, 0, .07, .072), (EL - .14, x, 0, .07, .072), (WR + .13, x, 0, .062, .064),
        (WR + .07, x, 0, .066, .068), (WR + .04, x, 0, .084, .086), (WR + .02, x, 0, .08, .082)], 10, cap=True))
    def gauntlet(bm, x=x, s=s):   # the fist closed round the grip (along z through the wrist): back of the hand outside
        blob(bm, (x + s * .028, WR - .02, 0), .06, (.62, 1.0, 1.15), 1)
        for zf in (-.04, -.013, .013, .04):
            tube(bm, [(x + s * .04, WR - .026, zf), (x + s * .029, WR - .081, zf * 1.1), (x - s * .026, WR - .087, zf * 1.1), (x - s * .047, WR - .04, zf)],
                 [.02, .019, .017, .015], 5)
        tube(bm, [(x + s * .02, WR - .007, .06), (x - s * .015, WR, .073), (x - s * .047, WR - .011, .065)], [.019, .017, .014], 5)   # the thumb
        if s > 0: blob(bm, (x - s * .006, WR - .055, 0), .036, (1.0, .9, 1.45), 1)   # the empty left fist: no hole through it
    soft(f'elbow{n}__plate.2', gauntlet, 110, voxel=.006)

# ---- legs: mail thighs under cuisses and knee cops; keeled greaves, sabatons ------------------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    hard(f'leg{n}__mail', lambda bm, hx=hx: loft(bm, [(.97, hx, -.01, .13, .13), (.72, hx * 1.04, .0, .112, .112), (.47, hx, .01, .09, .09)], 8, cap=True))
    def cuisse(bm, hx=hx, s=s):
        c = s * .35   # over the front and the outside of the thigh
        loft(bm, [(.86, hx + s * .01, .0, .126, .13), (.7, hx + s * .01, .01, .118, .122), (.54, hx, .016, .1, .104)], 8, cap=False,
             a0=c - 1.4, a1=c + 1.4)
        def point(p, a, e): return (p.x, p.y, p.z + .025 * max(0, math.cos(a)) * max(0, 1 - abs(e)))
        shell(bm, (hx, .455, .045), .085, .085, .066, -1.1, 1.25, -1.5, 1.5, nu=6, nv=3, warp=point)   # the knee cop
        def wing(u, v):   # its fan on the outside of the knee
            a = -1.1 + 2.2 * u; r = .05 + .045 * v
            return (hx + s * (.075 + .02 * v), .455 + math.sin(a) * r, .03 + math.cos(a) * r * .4)
        sheet(bm, 4, 1, wing)
    hard(f'leg{n}__plate', cuisse, outward=lambda c, hx=hx: (hx, c.y, -.02))
    def shin(a, y): return .14 * max(0.0, math.cos(a)) ** 6 * max(0, min(1, (y - .12) / .2))
    hard(f'knee{n}__plate', lambda bm, hx=hx, shin=shin: loft(bm, [(.42, hx, .004, .084, .086), (.33, hx, -.008, .092, .1),
                                                                 (.2, hx, .0, .076, .078), (.115, hx, .004, .072, .074)], 10, cap=True, push=shin))
    def sabaton(bm, hx=hx):
        blob(bm, (hx, .088, -.005), .07, (1.0, .95, 1.1), 1)
        for k in range(3): blob(bm, (hx, .07 - k * .008, .06 + k * .05), .064 - k * .006, (1.0, .8, .9), 1)
        blob(bm, (hx, .045, .205), .042, (1.0, .75, 1.25), 1)
        blob(bm, (hx, .048, -.055), .05, (1.0, .9, .8), 1)
    soft(f'knee{n}__plate.1', sabaton, 90, voxel=.008)

# ---- breaths: two rows of short slots down each side of the bevor, and a brow lip over the slit (the face is no bucket) ---
def bevor_point(a, y, lift=.004):
    """A point on the bevor's surface at angle a, height y (1.67 to 1.8), lifted off it."""
    rows = [(SLIT - .018, -.012, .156, .176), (1.77, -.006, .158, .184), (1.72, 0, .148, .182), (1.67, -.008, .128, .162)][::-1]
    for r0, r1 in zip(rows, rows[1:]):
        if r0[0] <= y <= r1[0]:
            f = (y - r0[0]) / (r1[0] - r0[0]); cz, rx, rz = (r0[k] + (r1[k] - r0[k]) * f for k in (1, 2, 3)); break
    r = 1 + .1 * max(0.0, math.cos(a)) ** 6 + lift
    return (math.sin(a) * rx * r, y, cz + math.cos(a) * rz * r)
def breaths(bm):
    for s in (-1, 1):
        for k in range(4):
            y = 1.785 - k * .024
            a0, a1 = s * .5, s * .78
            p = [bm.verts.new(G(*bevor_point(a, yy, .012))) for a, yy in ((a0, y + .006), (a1, y + .006), (a1, y - .006), (a0, y - .006))]
            bm.faces.new(p)
hard('head__void.1', breaths, outward=(0, 1.76, -.04))
def brow(bm):   # a riveted lip over the slit, standing off the helm, so the face has a brow and a shadow under it
    rows = 9
    top = [bm.verts.new(G(*helm_point(-1.05 + 2.1 * i / rows, SLIT + .03, .006))) for i in range(rows + 1)]
    out = [bm.verts.new(G(*helm_point(-1.05 + 2.1 * i / rows, SLIT + .02, .026))) for i in range(rows + 1)]
    low = [bm.verts.new(G(*helm_point(-1.05 + 2.1 * i / rows, SLIT + .014, .004))) for i in range(rows + 1)]
    for i in range(rows):
        bm.faces.new((top[i], top[i + 1], out[i + 1], out[i])); bm.faces.new((out[i], out[i + 1], low[i + 1], low[i]))
    for i in (1, 3, 5, 7):
        stud(bm, helm_point(-1.05 + 2.1 * (i + .5) / rows, SLIT + .022, .03), .006)
hard('head__iron.1', brow, smooth=False, outward=(0, 1.86, -.02))

# ==== THE BILL (on the weapon bone): a pillager's bill, the hedger's tool made a war-weapon ===============================
# An ash haft longer than a man (the game's 1.45x makes it 3.2 m), iron-shod; on its head a broad, heavy cleaver blade
# with a convex edge (on the head's "up", +dy), a long hook recurved back toward the wielder on the other side (the
# Hook catches with it), and a square spike on top. Pitch-soaked rags are wound round the haft under the socket. The
# `burn` slot (shown only while he burns, Torch of Corvel): the lit edge of the blade, fire in the rags, the hook's inner
# edge. Haft along +z through the right fist (x -SX, y WR - .05), its origin the right wrist.
BX, BY = -SX, WR - .05
HEAD = 1.3            # the socket's top, along the haft
hard('weapon__wood', lambda bm: tube(bm, [(BX, BY, -.8), (BX, BY, 0.0), (BX, BY, .8), (BX, BY, HEAD - .1)], [.022, .025, .024, .022], 8))

def plate(bm, outline, t0, t1, reach):
    """A flat blade in the haft's plane (dy, z): its outline [(dy, z)], t0 thick at the haft, thinning to t1 at `reach` dy."""
    def th(dy): return t0 + (t1 - t0) * min(1.0, abs(dy) / reach)
    f = [bm.verts.new(G(BX + th(dy), BY + dy, z)) for dy, z in outline]
    b = [bm.verts.new(G(BX - th(dy), BY + dy, z)) for dy, z in outline]
    bm.faces.new(f); bm.faces.new(list(reversed(b)))
    n = len(outline)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((f[j], f[i], b[i], b[j]))
BLADE = [(.02, HEAD - .16), (.09, HEAD - .2), (.17, HEAD - .2), (.25, HEAD - .12), (.3, HEAD + .0), (.315, HEAD + .12),
         (.3, HEAD + .24), (.25, HEAD + .33), (.19, HEAD + .36), (.13, HEAD + .29), (.06, HEAD + .2), (.02, HEAD + .14)]
HOOK = [(-.02, HEAD + .08), (-.12, HEAD + .1), (-.22, HEAD + .08), (-.31, HEAD + .01), (-.37, HEAD - .09), (-.38, HEAD - .21),
        (-.32, HEAD - .13), (-.25, HEAD - .065), (-.13, HEAD - .04), (-.02, HEAD - .055)]   # pass 66: longer and thicker, to read at fighting distance
def head(bm):
    plate(bm, BLADE, .016, .004, .3)
    plate(bm, HOOK, .022, .007, .38)
    # the spike: a square bodkin from the socket's top
    base = [bm.verts.new(G(BX + dx, BY + dy, HEAD + .02)) for dx, dy in ((.032, 0), (0, .032), (-.032, 0), (0, -.032))]   # pass 66: heavier
    mid = [bm.verts.new(G(BX + dx * 1.2, BY + dy * 1.2, HEAD + .16)) for dx, dy in ((.032, 0), (0, .032), (-.032, 0), (0, -.032))]
    tip = bm.verts.new(G(BX, BY, HEAD + .6))
    for k in range(4):
        j = (k + 1) % 4
        bm.faces.new((base[k], base[j], mid[j], mid[k])); bm.faces.new((mid[k], mid[j], tip))
    bm.faces.new(list(reversed(base)))
hard('weapon__blade', head, smooth=False)

def fittings(bm):   # the socket and its langets, two rings along the haft, the iron shoe at the butt
    tube(bm, [(BX, BY, HEAD - .2), (BX, BY, HEAD - .05), (BX, BY, HEAD + .04)], [.032, .036, .03], 10)
    for s in (-1, 1): tube(bm, [(BX + s * .026, BY, HEAD - .2), (BX + s * .026, BY, HEAD - .5)], [.009, .004], 4)
    for z in (.35, -.42): tube(bm, [(BX, BY, z), (BX, BY, z + .05)], [.029, .029], 10)
    tube(bm, [(BX, BY, -.68), (BX, BY, -.8), (BX, BY, -.92)], [.027, .022, .004], 8)
    for z in (HEAD - .12, HEAD - .02):   # rivets through the socket
        stud(bm, (BX + .037, BY, z), .007); stud(bm, (BX - .037, BY, z), .007)
hard('weapon__iron', fittings)

def rags(bm):   # pitch-soaked rags wound thick round the haft under the socket, three torn ends hanging
    r = random.Random(11)
    for k in range(6):
        z = HEAD - .26 - k * .045
        blob(bm, (BX, BY, z), .052 + r.uniform(-.006, .008), (1.0, 1.0, .75), 1)
    for k in range(3):
        a = k / 3 * math.tau + .5; dx, dy = math.sin(a) * .05, math.cos(a) * .05
        ln = r.uniform(.16, .26)
        tube(bm, [(BX + dx, BY + dy, HEAD - .3), (BX + dx * 1.2, BY + dy - ln * .45, HEAD - .36), (BX + dx * 1.1, BY + dy - ln, HEAD - .42)], [.016, .012, .004], 4)
soft('weapon__pitch', rags, 260, voxel=.008)

def burn(bm):   # while he burns: the blade's edge lit, the hook's inner edge, and fire through the rags
    edge = [(BX, BY + dy * 1.02, z) for dy, z in BLADE[2:9]]
    tube(bm, edge, [.006, .009, .011, .012, .011, .009, .006], 4)
    inner = [(BX, BY + dy, z) for dy, z in HOOK[5:9]]
    tube(bm, inner, [.004, .007, .007, .004], 4)
    r = random.Random(3)
    for k in range(5):
        z = HEAD - .26 - k * .05; a = r.uniform(0, math.tau)
        tube(bm, [(BX + math.sin(a) * .056, BY + math.cos(a) * .056, z), (BX + math.sin(a + 1.2) * .058, BY + math.cos(a + 1.2) * .058, z - .02),
                  (BX + math.sin(a + 2.3) * .055, BY + math.cos(a + 2.3) * .055, z - .01)], [.006, .009, .005], 4)
hard('weapon__burn', burn)

result = tally()
