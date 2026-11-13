# The Executioner, one of the Ashbound (STORY.md: the king's own army, turned). One rigid mesh per game bone (js/rig.js
# skeleton at scale 1, MODEL_DEFS.ashExecutioner), named exec:<bone>__<material slot>[.n], so every key pose, the walk,
# the cloth swing and the death drive it. Rest pose: upright, arms hanging (the posture bends the elbows in the game).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.37, y 1.55, the
# left 4% longer (elbow y 1.238, wrist .926), the right 2% (elbow 1.244, wrist .938). The greataxe's haft runs along z
# through the right wrist (the kit builds it). Hips x +-.15, y .90, knees .45.
# Cloth bones (they swing): tasselL (.06, 1.38, .19), tasselR (-.07, 1.36, .19), cloakB (0, 1.52, -.2), and the skirt's
# four panels loinF (0, .82, .19), loinB (0, .82, -.19), loinL (.2, .82, 0), loinR (-.2, .82, 0).
# The look (the MODEL_DEFS brief): a towering executioner, unhelmed, swept-back auburn hair and a black eyepatch tied
# diagonally over the left eye; a silver-grey hauberk of feathered scale, the leaf-scales layered over the chest, the
# shoulders and the hips; an open collar over a dark undertunic; a banded amber sash and a diagonal strap with red-and-white
# cord tassels; an olive skirt bordered in embroidery; rust-orange sleeves, a heavy scaled gauntlet on the left arm and a
# smooth leather bracer on the right; dark banded greaves with iron knee-cops, dark boots. Enemy budget: about 3,000
# triangles with the greataxe, which the kit still builds.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'skin': (0.74, 0.5, 0.38), 'hair': (0.5, 0.2, 0.1), 'patch': (0.08, 0.07, 0.07), 'plumage': (0.66, 0.65, 0.63),
       'sleeve': (0.55, 0.22, 0.12), 'sash': (0.72, 0.53, 0.28), 'cord': (0.66, 0.18, 0.12), 'skirt': (0.5, 0.46, 0.33),
       'trim': (0.76, 0.7, 0.5), 'leather': (0.33, 0.2, 0.14), 'darkLeather': (0.14, 0.12, 0.11), 'gauntlet': (0.42, 0.43, 0.46),
       'iron': (0.32, 0.31, 0.3)}, prefix='exec:')

SX = .37
ARMS = ((1, 'L', 1.238, .926), (-1, 'R', 1.244, .938))
EYES = [(s * .042, 1.81, .108) for s in (-1, 1)]   # MODEL_DEFS.ashExecutioner.eyes glow here; the left one is under the patch

def leaf(bm, top, down, side, out, w, h, tilt):
    """A pointed leaf-scale hanging from `top`: `w` wide along `side`, `h` long along `down`, its tip flared out by `tilt`."""
    top, down, side, out = Vector(top), Vector(down).normalized(), Vector(side).normalized(), Vector(out).normalized()
    p = lambda f, v: top + side * (f * w / 2) + down * (v * h) + out * (tilt * v * h)
    vs = [bm.verts.new(G(*q)) for q in (p(-1, 0), p(1, 0), p(.9, .55), p(-.9, .55), p(0, 1))]
    bm.faces.new((vs[0], vs[1], vs[2], vs[3])); bm.faces.new((vs[3], vs[2], vs[4]))

def ring_leaves(bm, y, at, n, w, h, tilt, a0=0.0, a1=math.tau, skip=None, phase=0.0):
    """A row of leaf-scales round a body: at(a, y) -> (point, outward normal); `skip(a)` leaves a gap."""
    closed = a1 - a0 >= math.tau - 1e-6
    for k in range(n):
        a = a0 + (a1 - a0) * ((k + phase) / n if closed else k / max(1, n - 1))
        if skip and skip(a): continue
        p, o = at(a, y); t = Vector((math.cos(a), 0, -math.sin(a)))
        leaf(bm, p, (0, -1, 0), t, o, w, h, tilt)

# ---- head: a broad weathered face, a black patch tied over the left eye, auburn hair swept back -------------------------
def face(bm):
    blob(bm, (0, 1.8, -.012), .118, (.92, 1.05, 1.0), 2)            # the skull
    blob(bm, (0, 1.728, .04), .064, (1.02, .85, .92), 2)            # the heavy square jaw
    blob(bm, (0, 1.69, .078), .026, (1.25, .9, .9), 1)              # the chin
    blob(bm, (0, 1.835, .088), .046, (1.6, .34, .55), 1)            # the brow ridge
    tube(bm, [(0, 1.822, .104), (0, 1.79, .122), (0, 1.772, .124)], [.011, .014, .012], 5)   # the broad nose
    for s in (-1, 1):
        blob(bm, (s * .056, 1.778, .07), .026, (1.0, .78, .9), 1)   # the cheekbones
        blob(bm, (s * .108, 1.79, -.012), .022, (.45, 1.15, .75), 1)  # the ears
def sockets(g):
    d = 0.0
    for e in EYES:
        d -= .011 * max(0, 1 - ((g.x - e[0]) ** 2 + (g.y - e[1]) ** 2 * 1.8) / .022 ** 2) * (g.z > .04)
    d -= .006 * max(0, 1 - ((g.x) ** 2 * 2 + (g.y - 1.738) ** 2) / .03 ** 2) * (g.z > .08)   # the lip line
    return d
soft('head__skin', face, 185, voxel=.005, after=sockets)

HC = Vector((0, 1.8, -.012))
def hair(bm):   # a shell over the crown from the brow back to the collar, combed into ridges that run front to back
    nu, nv = 14, 5; grid = []
    for j in range(nv + 1):
        line = []
        for i in range(nu + 1):
            a = -math.pi + math.tau * i / nu                                    # 0 = forward, round the head
            front = max(0.0, math.cos(a)) ** 1.5
            e0 = .47 * front + .3 * (1 - front) - 1.25 * max(0.0, -math.cos(a)) ** 2   # the hairline: brow, over the ears, nape
            e0 -= .1 * (i % 2) * max(0.0, -math.cos(a)) if j == nv else 0              # ragged locks at the nape
            e = e0 + (math.pi / 2 - e0) * (1 - j / nv)
            r = 1 + .13 * (i % 2) * (j / nv) ** .6 + .04 * front * (1 - j / nv)       # combed ridges, lifted off the brow
            x, y, z = math.sin(a) * math.cos(e) * .124 * r, math.sin(e) * .14, math.cos(a) * math.cos(e) * .134 * r
            back = max(0.0, -math.cos(a))
            line.append(bm.verts.new(G(HC.x + x, HC.y + .012 + y, HC.z + z - .06 * back * (j / nv) ** 2 + .006)))
        grid.append(line)
    for j in range(nv):
        for i in range(nu): bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
hard('head__hair', hair, outward=HC)

def eyepatch(bm):
    # the patch: a small cupped disc over the left eye, in front of its glow
    c = Vector((EYES[1][0] + .002, EYES[1][1] + .002, .121)); ring_ = []
    for k in range(7):
        a = k / 7 * math.tau
        ring_.append(bm.verts.new(G(c.x + math.cos(a) * .027, c.y + math.sin(a) * .021, c.z - .009 * (1 - .0))))
    mid = bm.verts.new(G(c.x, c.y, c.z + .004))
    for k in range(7): bm.faces.new((ring_[k], ring_[(k + 1) % 7], mid))
    # the cord: tied round the head on a slant, up across the brow to the right, down behind the left ear
    th = -.42; rows = []
    for dy in (.006, -.006):
        r = []
        for k in range(16):
            t = k / 16 * math.tau; x, y = math.sin(t) * .124, dy
            x, y = x * math.cos(th) - y * math.sin(th), x * math.sin(th) + y * math.cos(th)
            r.append(bm.verts.new(G(x, 1.832 + y, -.012 + math.cos(t) * .132)))
        rows.append(r)
    bridge(bm, rows)
hard('head__patch', eyepatch, outward=HC)

# ---- neck: thick, the dark undertunic's collar round it ---------------------------------------------------------------------
hard('neck__skin', lambda bm: loft(bm, [(1.73, 0, .0, .062, .064), (1.6, 0, -.012, .078, .075)], 10))

# ---- chest: the feathered scale hauberk, its open collar, the strap across it ---------------------------------------------
TORSO = [(.99, 0, .0, .19, .14), (1.12, 0, .006, .2, .146), (1.27, 0, .016, .226, .16), (1.42, 0, .01, .24, .16),
         (1.52, 0, -.006, .226, .15), (1.585, 0, -.016, .17, .12), (1.635, 0, -.02, .1, .086)]
def torso_at(y):
    rows = sorted(TORSO)
    for (y0, _, c0, x0, z0), (y1, _, c1, x1, z1) in zip(rows, rows[1:]):
        if y0 <= y <= y1:
            k = (y - y0) / (y1 - y0); return (c0 + (c1 - c0) * k, x0 + (x1 - x0) * k, z0 + (z1 - z0) * k)
    return rows[0][2:] if y < rows[0][0] else rows[-1][2:]
def on_torso(off):
    def at(a, y):
        cz, rx, rz = torso_at(y)
        p = Vector((math.sin(a) * (rx + off), y, cz + math.cos(a) * (rz + off)))
        n = Vector((math.sin(a) / (rx + off), 0, math.cos(a) / (rz + off))).normalized()
        return p, n
    return at
hard('chest__plumage', lambda bm: loft(bm, TORSO, 12))

V_GAP = lambda a: abs(math.atan2(math.sin(a), math.cos(a))) < .5    # the open collar at the front
def mail(bm):   # rows of pointed leaf-scales, each row overlapping the next; the cloak covers the back's upper rows
    for i, (y, n, w, h, off) in enumerate(((1.56, 12, .11, .15, .012), (1.44, 14, .108, .16, .022), (1.31, 14, .108, .16, .03),
                                           (1.18, 12, .11, .15, .034))):
        ring_leaves(bm, y, on_torso(off), n, w, h, .22, skip=V_GAP if i < 2 else None, phase=.5 * (i % 2))
hard('chest__plumage.1', mail, outward=lambda c: Vector((0, c.y, 0)))

def undertunic(bm):   # the dark tunic in the V of the open collar
    def at(u, v):
        y = 1.64 - .19 * v; cz, rx, rz = torso_at(y); hw = .085 * (1 - v) + .006
        a = (u - .5) * 2 * hw / rx
        return (math.sin(a) * (rx + .004), y, cz + math.cos(a) * (rz + .004))
    sheet(bm, 2, 3, at)
hard('chest__darkLeather', undertunic, outward=(0, 1.4, 0))

def lapels(bm):   # the collar's two turned-back edges down the V, in the same scale
    for s in (-1, 1):
        def at(u, v, s=s):
            y = 1.645 - .2 * v; cz, rx, rz = torso_at(y); hw = .09 * (1 - v) + .01 + .035 * u
            a = s * hw / rx
            return (math.sin(a) * (rx + .014 + .01 * u), y, cz + math.cos(a) * (rz + .014 + .01 * u))
        sheet(bm, 1, 3, at)
hard('chest__plumage.2', lapels)   # the scale is double-sided

def strap(bm):   # a leather strap from the right shoulder across the chest to the left hip, round the back
    rows = []
    for dy in (.026, -.026):
        r = []
        for k in range(12):
            a = k / 12 * math.tau; y = 1.36 - .24 * math.sin(a) + dy
            cz, rx, rz = torso_at(y)
            r.append(bm.verts.new(G(math.sin(a) * (rx + .05), y, cz + math.cos(a) * (rz + .05))))
        rows.append(r)
    bridge(bm, rows)
hard('chest__leather', strap, outward=lambda c: Vector((0, c.y, 0)))

# the red-and-white cord tassels hanging from the strap, on their swinging bones
def tassel(bm, top, ln, seed):
    r = random.Random(seed); x, y, z = top
    blob(bm, (x, y, z), .018, (1, 1.1, .8), 1)                            # the knot
    for k in range(3):
        dx = (k - 1) * .012
        tube(bm, [(x + dx * .3, y - .01, z), (x + dx, y - ln * .5, z + .006), (x + dx * 1.3 + r.uniform(-.006, .006), y - ln, z + .01)],
             [.0065, .0055, .005], 3)
for bone, top, ln, seed in (('tasselL', (.06, 1.38, .215), .36, 5), ('tasselR', (-.07, 1.36, .215), .42, 9)):
    hard(f'{bone}__cord', lambda bm, top=top, ln=ln, seed=seed: tassel(bm, top, ln, seed))
    hard(f'{bone}__trim', lambda bm, top=top, ln=ln: [loft(bm, [(top[1] - ln * f + .012, top[0], top[2] + .006 * f, .022, .012),
                                                              (top[1] - ln * f - .012, top[0], top[2] + .006 * f, .022, .012)], 6, cap=False)
                                                      for f in (.45,)])

# ---- the feathered mantle down the back, on its swinging bone ---------------------------------------------------------------
def mantle(bm):
    for i, (y, n, w, h) in enumerate(((1.6, 5, .13, .2), (1.45, 6, .12, .21), (1.3, 6, .12, .21), (1.16, 5, .12, .2))):
        for k in range(n):
            u = (k + .5) / n - .5; x = u * (.44 + .06 * i)
            cz, rx, rz = torso_at(y); a = math.pi - math.asin(max(-1, min(1, x / (rx + .05))))
            z = cz + math.cos(a) * (rz + .05 + .012 * i)
            leaf(bm, (x, y, z), (0, -1, -.12), (-1, 0, 0), (math.sin(a) * .3, 0, -1), w, h, .2)
hard('cloakB__plumage', mantle, outward=(0, 1.3, .1))

# ---- spin: the banded sash, the lower scales, the skirt's yoke, the pouch ---------------------------------------------------
def sash(bm):
    rows = [(1.115, .202, .148), (1.085, .215, .158), (1.055, .204, .15), (1.025, .215, .158), (.99, .206, .152)]
    loft(bm, [(y, 0, .004, rx, rz) for y, rx, rz in rows], 10, cap=False)
hard('spin__sash', sash)

def skirt_at(a, y):   # the skirt's cone: from the waist (.99) to the hem (.5)
    k = (.99 - y) / .49; rx, rz = .2 + .07 * k, .15 + .06 * k
    p = Vector((math.sin(a) * rx, y, .0 + math.cos(a) * rz)); n = Vector((math.sin(a) / rx, 0, math.cos(a) / rz)).normalized()
    return p, n
def peplum(bm):
    ring_leaves(bm, .985, lambda a, y: (skirt_at(a, y)[0] + skirt_at(a, y)[1] * .03, skirt_at(a, y)[1]), 13, .11, .16, .16)
    ring_leaves(bm, .9, lambda a, y: (skirt_at(a, y)[0] + skirt_at(a, y)[1] * .036, skirt_at(a, y)[1]), 13, .115, .15, .14, phase=.5)
hard('spin__plumage', peplum, outward=lambda c: Vector((0, c.y, 0)))
hard('spin__skirt', lambda bm: loft(bm, [(y, 0, 0, skirt_at(math.pi / 2, y)[0].x, skirt_at(0, y)[0].z) for y in (.995, .9, .8)], 14, cap=False))
def pouch(bm):
    blob(bm, (-.235, .96, .05), .05, (.55, 1.0, .85), 1)
    blob(bm, (-.24, 1.0, .05), .045, (.6, .35, .9), 1)                    # the flap
soft('spin__leather', pouch, 40, voxel=.008)

# the skirt's four panels, bordered at the hem, each on its own swinging bone
PANELS = {'loinF': (0.0, .004), 'loinL': (math.pi / 2, .01), 'loinB': (math.pi, .004), 'loinR': (-math.pi / 2, .01)}   # the sides lap over
span = 1.45
for bone, (ac, off) in PANELS.items():
    def panel(bm, ac=ac, off=off, y0=.82, y1=.5):
        def at(u, v):
            a = ac + (u - .5) * span * 1.12; y = y0 + (y1 - y0) * v
            p, n = skirt_at(a, y); return tuple(p + n * off * (1 + v))
        sheet(bm, 4, 3, at)
    def border(bm, ac=ac, off=off):
        def at(u, v):
            a = ac + (u - .5) * span * 1.12; y = .585 - .085 * v
            p, n = skirt_at(a, y); return tuple(p + n * (off + .008))
        sheet(bm, 4, 1, at)
    hard(f'{bone}__skirt', panel)
    hard(f'{bone}__trim', border)

# ---- arms: feathered pauldrons, rust sleeves; a leather bracer and glove on the right, a scaled gauntlet on the left -------
for s, n, el, wr in ARMS:
    x = s * SX
    def pauldron(bm, x=x, s=s):
        shell(bm, (x, 1.55, 0), .125, .085, .128, .05, 1.45, -.25, math.pi + .25, nu=8, nv=3,
              warp=lambda p, a, e, s=s, x=x: (x + s * (p[0] - x + .012), p[1], p[2]))
        for (y, r, cnt, w, h) in ((1.565, .13, 7, .085, .13), (1.48, .118, 6, .08, .12)):
            for k in range(cnt):
                a = -.2 + (math.pi + .4) * k / (cnt - 1)
                p = Vector((x + s * math.sin(a) * r, y, math.cos(a) * r)); o = Vector((s * math.sin(a), .15, math.cos(a)))
                leaf(bm, p, (0, -1, 0), (math.cos(a) * s, 0, -math.sin(a)), o, w, h, .25)
    hard(f'arm{n}__plumage', pauldron, outward=lambda c, x=x: Vector((x - math.copysign(.03, x), 1.5, 0)))
    soft(f'arm{n}__sleeve', lambda bm, x=x, s=s, el=el: loft(bm, [(1.52, x - s * .01, 0, .085, .086), (1.4, x, 0, .082, .084),
                                                                  (el + .04, x, 0, .072, .074), (el - .01, x, .004, .068, .07)], 10), 70, voxel=.008,
         after=lambda g: .006 * math.sin(g.y * 70))                     # the cloth's folds
    soft(f'elbow{n}__sleeve', lambda bm, x=x, el=el, wr=wr: (loft(bm, [(el + .02, x, .004, .068, .07), (el - .08, x, .006, .07, .072),
                                                                         (wr + .06, x, .004, .05, .052)], 10), blob(bm, (x, el, 0), .068, (1, 1, 1), 1)),
         56, voxel=.008)
    def fist(bm, x=x, s=s, wr=wr, k=1.0):   # the hand closed round a grip along z through the wrist
        loft(bm, [(wr + .05, x, 0, .045, .047), (wr, x + s * .006, 0, .046, .05)], 8)
        blob(bm, (x + s * .018, wr - .01, 0), .05, (.64, 1.15, 1.15), 1)
        for zf in (-.03, -.01, .01, .03):
            tube(bm, [(x + s * .028, wr - .022, zf), (x + s * .019, wr - .062, zf * 1.1), (x - s * .02, wr - .066, zf * 1.1), (x - s * .034, wr - .03, zf)],
                 [.0125 * k, .0115 * k, .01 * k, .0095 * k], 5)
        tube(bm, [(x + s * .014, wr - .006, .044), (x - s * .011, wr - .001, .054), (x - s * .034, wr - .01, .049)], [.0125 * k, .011 * k, .0095 * k], 5)   # the thumb
    if s < 0:   # the right: a smooth leather bracer, a dark glove
        hard(f'elbow{n}__leather', lambda bm, x=x, el=el, wr=wr: loft(bm, [(el - .06, x, .005, .074, .076), (wr + .11, x, .004, .064, .066),
                                                                            (wr + .03, x, .002, .058, .06)], 10, cap=False), outward=lambda c, x=x: Vector((x, c.y, .004)))
        soft(f'elbow{n}__darkLeather', fist, 80, voxel=.0055)
    else:       # the left: four overlapping scaled plates down the forearm, three spikes on the outside, a scaled fist
        def plates(bm, x=x, s=s, el=el, wr=wr):
            for i in range(4):
                t0 = el - .03 - i * .075; t1 = t0 - .085; r = .074 - .005 * i
                loft(bm, [(t0, x, .004, r * .9, r * .92), (t0 - .02, x, .004, r, r * 1.02), (t1, x, .004, r * 1.06, r * 1.08)], 8, cap=False)
        hard(f'elbow{n}__gauntlet', plates, outward=lambda c, x=x: Vector((x, c.y, .004)))
        def spikes(bm, x=x, s=s, el=el):
            for i in range(3):
                y = el - .07 - i * .08; b = Vector((x + s * .07, y, .01))
                vs = [bm.verts.new(G(*q)) for q in (b + Vector((0, .02, -.016)), b + Vector((0, .02, .016)), b + Vector((0, -.022, 0)), b + Vector((s * .055, -.01, 0)))]
                for f in ((0, 1, 3), (1, 2, 3), (2, 0, 3)): bm.faces.new([vs[j] for j in f])
        hard(f'elbow{n}__iron', spikes)
        soft(f'elbow{n}__gauntlet.1', lambda bm, fist=fist: fist(bm, k=1.12), 80, voxel=.0055)

# ---- legs: dark leather cuisses, dark boots, banded greaves with iron knee-cops -------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    soft(f'leg{n}__darkLeather', lambda bm, hx=hx: loft(bm, [(.95, hx * .8, -.01, .1, .1), (.8, hx, 0, .098, .1), (.6, hx, .008, .085, .087),
                                                            (.46, hx, .01, .076, .078)], 10), 66, voxel=.01)
    def boot(bm, hx=hx):
        loft(bm, [(.46, hx, .004, .072, .074), (.33, hx, -.004, .068, .072), (.17, hx, -.002, .056, .06), (.08, hx, 0, .058, .066)], 10)   # the shaft
        loft(bm, [(.12, hx, .03, .056, .09), (.065, hx, .075, .056, .125), (.02, hx, .085, .058, .135)], 8)                                 # the foot
        blob(bm, (hx, .035, .19), .036, (1.0, .78, 1.3), 1)                                                                                  # the toe
        blob(bm, (hx, .045, -.045), .05, (1, 1, .9), 1)                                                                                      # the heel
    soft(f'knee{n}__darkLeather', boot, 110, voxel=.008)
    def greaves(bm, hx=hx):
        for i in range(3):
            t0 = .39 - i * .085; r = .08 - .005 * i
            loft(bm, [(t0, hx, .01, r * .94, r * .96), (t0 - .08, hx, .008, r * 1.04, r * 1.06)], 10, cap=False)
    hard(f'knee{n}__darkLeather.1', greaves, outward=lambda c, hx=hx: Vector((hx, c.y, .008)))
    soft(f'knee{n}__iron', lambda bm, hx=hx: (blob(bm, (hx, .455, .062), .062, (1.0, 1.05, .62), 2), blob(bm, (hx, .45, .102), .02, (1, 1, 1), 1)), 56, voxel=.007)

result = tally()
