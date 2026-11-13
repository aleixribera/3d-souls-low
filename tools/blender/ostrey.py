# Old Ostrey, the Porter (STORY.md 10c): the giant who keeps Thrale's gate bridge for a king long dead, an iron gate-bar
# in his right hand and a lantern in his left. Level 7's boss. One rigid mesh per game bone (js/rig.js skeleton at scale 1,
# MODEL_DEFS.oldOstrey), named ostrey:<bone>__<material slot>[.n], so every key pose, the walk, the cloth and the death
# drive it. The game scales him 2.1x (bulk 1.2). Rest pose: upright, arms hanging (the model's posture stoops him).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.38, y 1.55,
# elbows y 1.25, wrists y .95; hips x +-.15, y .90, knees .45. The bar is baked on the `weapon` bone (origin the right
# wrist, its length along +z through the fist); the lantern on elbowL, hung from the left fist.
# Cloth bones (they swing): loinF (0, .93, .2), loinB (0, .93, -.2), and the mantle's chain capeA (0, 1.58, -.27),
# capeB (0, 1.14, -.29), capeC (0, .70, -.3).
# The look: a porter dressed for a storm that never lifts. An oilcloth hood over a round great helm whose face is a
# portcullis (iron bars over the dark, his eyes lit behind them), a heavy mail collar; a broad cuirass with the porter's
# great key hung on a chain over the breast; layered round pauldrons; a ring of gate keys at the left hip; a slate apron
# of the gate-wardens front and back with a worn gold bar; a long oilcloth mantle down the back, torn at the hem; cuisses,
# knee cops, greaves bound in iron, broad sabatons. The gate-bar: a square iron beam bound in bands, the grip wrapped, a
# hooked staple at the far end. The lantern: an iron cage of four horn panes under a pointed roof, its flame (`glass`)
# always lit; when he is hurt past bearing the panes burst and fire leaps out of it (`burn`, drawn only while he burns).
# Boss budget: 14,000.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'plate': (0.36, 0.37, 0.38), 'iron': (0.3, 0.25, 0.21), 'dark': (0.04, 0.04, 0.045), 'mail': (0.28, 0.29, 0.3),
       'leather': (0.24, 0.2, 0.16), 'mantle': (0.22, 0.25, 0.24), 'mantleHem': (0.16, 0.18, 0.17), 'tabard': (0.24, 0.28, 0.36),
       'stripe': (0.56, 0.45, 0.22), 'bar': (0.26, 0.24, 0.23), 'glass': (1.0, 0.7, 0.3), 'burn': (1.0, 0.45, 0.12)},
      prefix='ostrey:')

SX, EL, WR = .38, 1.25, .95

def box(bm, c, h, tw=None):
    """A box centred at c with half-sizes h; `tw` twists it about y (radians)."""
    c = Vector(c); vs = []
    for dx, dy, dz in ((-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1), (-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)):
        p = Vector((dx * h[0], dy * h[1], dz * h[2]))
        if tw: p = Vector((p.x * math.cos(tw) + p.z * math.sin(tw), p.y, -p.x * math.sin(tw) + p.z * math.cos(tw)))
        vs.append(bm.verts.new(G(*(c + p))))
    for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (2, 3, 7, 6), (1, 2, 6, 5), (0, 4, 7, 3)):
        bm.faces.new([vs[i] for i in f])

def beam(bm, pts, hw, hh):
    """A square-sectioned beam through game points running mostly along z (half width hw, half height hh)."""
    rings = []
    for p in pts:
        p = Vector(p)
        rings.append([bm.verts.new(G(p.x + dx * hw, p.y + dy * hh, p.z)) for dx, dy in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    bridge(bm, rings, True, True)

def lerp_rows(rows, y):
    """rows: (y, cz, rx, rz) top to bottom; the values interpolated at height y."""
    if y >= rows[0][0]: return rows[0][1:]
    for r0, r1 in zip(rows, rows[1:]):
        if r1[0] <= y <= r0[0]:
            f = (y - r0[0]) / (r1[0] - r0[0]); return tuple(a + (b - a) * f for a, b in zip(r0[1:], r1[1:]))
    return rows[-1][1:]

def loop(bm, pts, wire, sides=4):
    """A closed tube through game points (a ring, a chain link)."""
    pts = [Vector(p) for p in pts]; n = len(pts); rings = []
    for i, p in enumerate(pts):
        t = (pts[(i + 1) % n] - pts[i - 1]).normalized()
        a = t.cross(Vector((0, 1, 0)) if abs(t.y) < .9 else Vector((1, 0, 0))).normalized(); b = t.cross(a)
        rings.append([bm.verts.new(G(*(p + (a * math.cos(k / sides * math.tau) + b * math.sin(k / sides * math.tau)) * wire))) for k in range(sides)])
    for i in range(n):
        r0, r1 = rings[i], rings[(i + 1) % n]
        for k in range(sides): bm.faces.new((r0[k], r0[(k + 1) % sides], r1[(k + 1) % sides], r1[k]))

def link(bm, c, t, nrm, L=.05, W=.03, wire=.007, seg=6):
    c, t = Vector(c), Vector(t).normalized(); b = t.cross(Vector(nrm)).normalized()
    loop(bm, [c + t * math.cos(k / seg * math.tau) * L / 2 + b * math.sin(k / seg * math.tau) * W / 2 for k in range(seg)], wire)

# ---- head: a round great helm, its face a portcullis; an oilcloth hood over it ------------------------------------------------
HELM = [(2.02, -.012, .045, .05), (2.0, -.012, .11, .118), (1.965, -.01, .145, .155), (1.91, -.006, .158, .168),
        (1.84, -.002, .162, .174), (1.76, 0, .163, .176), (1.7, -.004, .166, .176), (1.655, -.01, .17, .172)]
FTOP, FBOT, FA = 1.885, 1.705, 0.62     # the face window: between these heights, FA radians either side of forward
def helm_at(a, y, lift=0.0):
    cz, rx, rz = lerp_rows(HELM, y); r = 1 + lift
    return (math.sin(a) * rx * r, y, cz + math.cos(a) * rz * r)
def helm(bm):
    rows = lambda ys: [(y, 0, *lerp_rows(HELM, y)) for y in ys]
    loft(bm, rows([y for y, *_ in HELM if y > FTOP] + [FTOP]), 20, cap=False)
    loft(bm, rows([FTOP, 1.84, 1.76, FBOT]), 14, cap=False, a0=FA, a1=math.tau - FA)
    loft(bm, rows([FBOT] + [y for y, *_ in HELM if y < FBOT]), 20, cap=False)
hard('head__plate', helm, thick=.014, outward=(0, 1.83, -.02))
def recess(bm):   # the dark behind the bars
    loft(bm, [(y, 0, cz - .01, rx - .05, rz - .05) for y in (FTOP + .01, 1.8, FBOT - .01) for cz, rx, rz in [lerp_rows(HELM, y)]], 8,
         cap=False, a0=-FA - .3, a1=FA + .3)
hard('head__dark', recess, outward=(0, 1.8, -.5))
def portcullis(bm):   # the grille: five uprights ending in points below, two cross bars, a heavy frame round the window
    for k in range(5):
        a = -FA * .8 + FA * 1.6 * k / 4
        top, bot = Vector(helm_at(a, FTOP + .006, .02)), Vector(helm_at(a, FBOT - .03, .045))
        tube(bm, [tuple(top), tuple(top.lerp(bot, .5)), tuple(bot)], [.009, .009, .003], 4)
    for y in (1.835, 1.765):
        tube(bm, [helm_at(-FA + .02 + 2 * (FA - .02) * i / 6, y, .03) for i in range(7)], [.008] * 7, 4)
    for a0, a1, y0, y1 in ((-FA - .1, FA + .1, FTOP + .022, FTOP), (-FA - .1, FA + .1, FBOT, FBOT - .022)):   # the frame
        rows = [(y, 0, cz, rx * 1.03, rz * 1.03) for y in (y0, y1) for cz, rx, rz in [lerp_rows(HELM, y)]]
        loft(bm, rows, 8, cap=False, a0=a0, a1=a1)
hard('head__iron', portcullis, outward=(0, 1.8, -.1))
def crest(bm):   # a low iron comb over the crown, front to back
    for i in range(7):
        a = -1.2 + 2.4 * i / 6
        y = 1.97 + .05 * math.cos(a * .9)
        box(bm, (0, y, math.sin(a) * .13 - .01), (.01, .03 + .01 * math.cos(a), .022))
hard('head__iron.1', crest)
def hood(bm):   # the oilcloth hood, up over the helm and open round the face, falling into a cowl on the shoulders
    def warp(p, a, e):
        sag = .02 * math.sin(a * 3) * max(0, -e)
        return (p.x * (1 + sag), p.y, p.z)
    shell(bm, (0, 1.86, -.03), .205, .2, .215, -1.05, 1.2, FA + .55, math.tau - FA - .55, nu=12, nv=6, warp=warp)
hard('head__mantle', hood, thick=.012, outward=(0, 1.86, -.03))

# ---- neck: a heavy mail collar onto the shoulders ----------------------------------------------------------------------------
hard('neck__mail', lambda bm: loft(bm, [(1.72, 0, -.01, .15, .15), (1.64, 0, -.01, .2, .19), (1.58, 0, -.01, .27, .22)], 10, cap=False), thick=.01)

# ---- chest: a broad cuirass, the cowl over the shoulders behind, the great key on its chain ---------------------------------------
CUIRASS = [(1.62, -.01, .23, .16), (1.57, .0, .33, .22), (1.46, .025, .35, .255), (1.33, .035, .335, .265),
           (1.2, .025, .29, .235), (1.1, .008, .245, .195)]
def keel(a, y): return .04 * max(0.0, math.cos(a)) ** 8 * max(0, min(1, (1.57 - y) / .1))
hard('chest__plate', lambda bm: loft(bm, [(y, 0, cz, rx, rz) for y, cz, rx, rz in CUIRASS], 14, cap=True, push=keel))
def cuirass_at(a, y, out=0.0):
    cz, rx, rz = lerp_rows(CUIRASS, y); r = 1 + keel(a, y)
    return Vector((math.sin(a) * (rx * r + out), y, cz + math.cos(a) * (rz * r + out)))
def plates(bm):   # a darker lame over the belly and a rim at the neck
    loft(bm, [(1.22, 0, .03, .3, .245), (1.11, 0, .012, .262, .21)], 10, cap=False, a0=-1.9, a1=1.9, push=lambda a, y: keel(a, 1.3) * .7)
    loft(bm, [(1.64, 0, -.012, .225, .158), (1.61, 0, -.01, .27, .19)], 12, cap=False)
hard('chest__iron', plates, thick=.012, outward=lambda c: Vector((0, c.y, -.05)))
def cowl(bm):   # the hood's cowl over the shoulders and the upper back (open at the front)
    loft(bm, [(1.7, 0, -.03, .22, .2), (1.6, 0, -.05, .34, .27), (1.48, 0, -.07, .43, .31)], 12, cap=False, a0=1.05, a1=math.tau - 1.05)
hard('chest__mantle', cowl, thick=.012, outward=(0, 1.3, -.02))
def key_chain(bm):   # a chain from the neck to the great key on the breast
    for s in (1, -1):
        for i in range(6):
            t = (i + .5) / 6
            p = Vector((s * (.12 - .1 * t), 1.6 - .2 * t, .2 + .07 * t)); d = Vector((-s * .1, -.2, .07))
            link(bm, p, d, (0, 0, 1) if i % 2 else (s, 0, 0))
hard('chest__iron.1', key_chain)
def great_key(bm):   # the porter's key: a ring bow, a long shank, a toothed bit, hung bit-down on the breast
    c = cuirass_at(0, 1.36, .03); top = Vector((0, 1.43, c.z - .01))
    loop(bm, [top + Vector((math.sin(k / 10 * math.tau) * .042, math.cos(k / 10 * math.tau) * .042, 0)) for k in range(10)], .01, 5)
    tube(bm, [tuple(top - Vector((0, .045, 0))), tuple(Vector((0, 1.22, c.z + .012)))], [.011, .011], 5)
    box(bm, (.022, 1.235, c.z + .012), (.022, .018, .008))
    box(bm, (.038, 1.255, c.z + .012), (.008, .01, .008))
hard('chest__iron.2', great_key)

# ---- spin: a wide belt, a mail skirt, a fauld, the ring of gate keys at the left hip -------------------------------------------
hard('spin__leather', lambda bm: loft(bm, [(1.14, 0, .01, .25, .205), (1.07, 0, .01, .256, .21)], 10, cap=False), thick=.014)
hard('spin__iron', lambda bm: box(bm, (0, 1.105, .222), (.05, .04, .012)))
hard('spin__mail', lambda bm: loft(bm, [(1.09, 0, .005, .25, .2), (.9, 0, .005, .275, .222), (.74, 0, 0, .285, .232)], 8, cap=False), thick=.008)
def fauld(bm):
    loft(bm, [(1.08, 0, .008, .262, .212), (.99, 0, .012, .282, .228)], 8, cap=False, a0=-2.3, a1=2.3)
    loft(bm, [(1.0, 0, .012, .278, .224), (.91, 0, .014, .296, .24)], 8, cap=False, a0=-2.1, a1=2.1)
hard('spin__plate', fauld, thick=.011)
def keys(bm):   # a great iron ring of gate keys on the left hip
    cx, cy, cz = .29, 1.0, .03
    loop(bm, [(cx + .01 * math.cos(k / 12 * math.tau), cy + .06 * math.cos(k / 12 * math.tau), cz + .06 * math.sin(k / 12 * math.tau)) for k in range(12)], .008, 4)
    r = random.Random(4)
    for k, dz in enumerate((-.05, -.022, .006, .034, .058)):
        ln = r.uniform(.14, .24); z0 = cz + dz
        tube(bm, [(cx + .012, cy - .055, z0), (cx + .02, cy - .055 - ln, z0 + dz * .5)], [.008, .007], 4)
        box(bm, (cx + .02, cy - .05 - ln, z0 + dz * .5 + .016), (.005, .016, .014))
hard('spin__iron.1', keys)

# ---- the slate apron of the gate-wardens, front and back, a worn gold bar across the front ------------------------------------
for bone, s, w, ln, seed in (('loinF', 1, .36, .66, 3), ('loinB', -1, .4, .72, 6)):
    hard(f'{bone}__tabard', lambda bm, s=s, w=w, ln=ln, seed=seed: sheet(bm, 4, 5, lambda u, v: (
        (u - .5) * w * (1 + .14 * v), .99 - ln * v, s * (.255 + .035 * v - .3 * ((u - .5) * w) ** 2)), ragged=.06, seed=seed))
def bar_badge(bm):   # the wardens' sign: an arched gate, shut by a bar laid across it, on the apron's front
    z = lambda y, k=.003: .255 + .035 * ((.99 - y) / .66) + k
    for x in (-.07, .07):   # the gateposts
        sheet(bm, 1, 1, lambda u, v, x=x: (x + (u - .5) * .02, .9 - .2 * v, z(.9 - .2 * v)))
    n = 7   # the arch over them
    for i in range(n):
        a0, a1 = math.pi * i / n, math.pi * (i + 1) / n
        def at(u, v, a0=a0, a1=a1):
            a = a0 + (a1 - a0) * u; r = .07 + .02 * (1 - v)
            return (math.cos(a) * r, .9 + math.sin(a) * r * .8, z(.9))
        sheet(bm, 1, 1, at)
    sheet(bm, 1, 1, lambda u, v: ((u - .5) * .22, .8 - .026 * v, z(.8, .005)))   # the bar, wider than the gate
hard('loinF__stripe', bar_badge, outward=(0, .8, 0))

# ---- the mantle: long oilcloth down the back, from under the cowl, torn at the hem ----------------------------------------
TOP, HEM = 1.56, .3
def mantle_at(u, v):   # u across (0 the figure's right), v = 0 the shoulders .. 1 the hem
    y = TOP + (HEM - TOP) * v; w = .7 + .34 * v ** .8
    x = (u - .5) * w
    bow = (.14 - .04 * v) * (1 - math.cos((u - .5) * math.pi))
    z = -.28 - .08 * v ** 1.2 - .03 * math.sin(v * math.pi) + bow + .015 * math.sin(u * 17)   # a few long folds
    return (x, y, z)
SEGS = [('capeA', 1.58), ('capeB', 1.14), ('capeC', .70)]
def v_of(y): return (TOP - y) / (TOP - HEM)
for i, (bone, y0) in enumerate(SEGS[:2]):
    v0, v1 = (0 if i == 0 else v_of(y0)), v_of(SEGS[i + 1][1])
    hard(f'{bone}__mantle', lambda bm, v0=v0, v1=v1: sheet(bm, 12, 3, lambda u, v: mantle_at(u, v0 + (v1 - v0) * v)))
def hem(bm):
    r = random.Random(11); n = 7; v0 = v_of(.70)
    for k in range(n):
        u0, u1 = k / n + .004, (k + 1) / n - .004; ln = r.uniform(.72, 1.0)
        sheet(bm, 2, 3, lambda u, v, u0=u0, u1=u1, ln=ln: mantle_at(u0 + (u1 - u0) * u, v0 + (1 - v0) * ln * v), ragged=.07, seed=k + 40)
hard('capeC__mantleHem', hem)

# ---- arms: mail sleeves, round layered pauldrons (the bar arm's the heavier), vambraces, great fists ----------------------------
for s, n, f, lames in ((1, 'L', 1.15, 2), (-1, 'R', 1.35, 3)):
    x = s * SX
    hard(f'arm{n}__mail', lambda bm, x=x: loft(bm, [(1.6, x, 0, .092, .092), (1.42, x, 0, .086, .086), (EL + .03, x, 0, .078, .078)], 8, cap=True))
    def pauldron(bm, x=x, s=s, f=f, lames=lames):
        side = s * math.pi / 2; cx = x - s * .03
        def slope(p, a, e):
            d = (p.x - cx) * s
            return (p.x, p.y - .1 * max(0, d) * (1 - .5 * math.sin(e)) + .04 * max(0, -d), p.z)
        shell(bm, (cx, 1.57, -.005), .145 * f, .125 * f, .16 * f, 0, math.pi / 2, 0, math.tau, nu=10, nv=3, warp=slope)
        for k in range(lames):
            y = 1.54 - .02 * f - k * .052 * f; r = (.1 - .003 * k) * f
            loft(bm, [(y, x + s * (.02 + .008 * k), -.005, r, r * 1.08), (y - .066 * f, x + s * (.03 + .01 * k), -.005, r + .013, (r + .013) * 1.08)],
                 7, cap=False, a0=side - 2.1, a1=side + 2.1)
    hard(f'arm{n}__plate', pauldron, thick=.013)
    def rivets(bm, x=x, s=s, f=f):   # iron rivets round the cop's rim
        for k in range(5):
            a = s * math.pi / 2 + (k - 2) * .6; r = .145 * f
            p = Vector((x - s * .03 + math.sin(a) * r, 1.575, -.005 + math.cos(a) * r * 1.1))
            nn = Vector((math.sin(a), .5, math.cos(a))).normalized()
            tube(bm, [tuple(p - nn * .004), tuple(p + nn * .01)], [.011, .006], 4)
    hard(f'arm{n}__iron', rivets)
    def vambrace(bm, x=x):
        loft(bm, [(EL + .05, x, -.008, .064, .064), (EL, x, -.024, .086, .09), (EL - .06, x, -.008, .072, .072),
                  (WR + .12, x, 0, .064, .066), (WR + .06, x, 0, .07, .072), (WR + .03, x, 0, .078, .08)], 8, cap=True)
    hard(f'elbow{n}__plate', vambrace)
    def bands(bm, x=x):
        for y in (EL - .1, WR + .09):
            loft(bm, [(y + .016, x, -.004, .079, .081), (y - .016, x, -.004, .079, .081)], 8, cap=False)
    hard(f'elbow{n}__iron', bands, thick=.008)
    def fist(bm, x=x, s=s):   # a heavy gauntlet closed round a grip along z through the wrist
        blob(bm, (x + s * .032, WR - .024, 0), .068, (.64, 1.0, 1.15), 1)
        for zf in (-.045, -.015, .015, .045):
            tube(bm, [(x + s * .045, WR - .032, zf), (x + s * .033, WR - .09, zf * 1.1), (x - s * .032, WR - .096, zf * 1.1), (x - s * .055, WR - .044, zf)],
                 [.021, .02, .018, .017], 5)
        tube(bm, [(x + s * .024, WR - .006, .066), (x - s * .017, WR, .08), (x - s * .053, WR - .012, .072)], [.02, .018, .016], 5)
    soft(f'elbow{n}__leather', fist, 64, voxel=.0062)

# ---- the lantern, held by its ring in the left fist ----------------------------------------------------------------------------
LX, LT = SX + .005, WR - .15        # its axis (x) and the top of its roof (y); it hangs a hand's width below the fist
LW, LH = .095, .22                  # half its width, the height of its cage
def lantern(bm):
    cz = 0.0; y0 = LT - .07; y1 = y0 - LH
    # the ring through the fist and the short hanger down to the roof
    loop(bm, [(LX + .045 * math.sin(k / 10 * math.tau), WR - .06 + .055 * math.cos(k / 10 * math.tau), cz) for k in range(10)], .009, 4)
    tube(bm, [(LX, WR - .115, cz), (LX, LT + .005, cz)], [.009, .009], 4)
    # the pointed roof with a vent cap, the top and bottom frames, four corner posts, the foot
    loft(bm, [(LT, LX, cz, .02, .02), (LT - .02, LX, cz, .03, .03), (LT - .025, LX, cz, .045, .045), (y0 + .004, LX, cz, LW * 1.35, LW * 1.35),
              (y0 - .006, LX, cz, LW * 1.35, LW * 1.35)], 4, cap=True, a0=math.pi / 4, a1=math.pi / 4 + math.tau)
    for y in (y0 - .01, y1 + .012):
        loft(bm, [(y + .012, LX, cz, LW * 1.28, LW * 1.28), (y - .012, LX, cz, LW * 1.28, LW * 1.28)], 4, cap=True, a0=math.pi / 4, a1=math.pi / 4 + math.tau)
    for dx, dz in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        box(bm, (LX + dx * LW, (y0 + y1) / 2, cz + dz * LW), (.009, LH / 2, .009))
    loft(bm, [(y1 - .002, LX, cz, LW * 1.1, LW * 1.1), (y1 - .03, LX, cz, LW * .8, LW * .8), (y1 - .04, LX, cz, LW * .8, LW * .8)], 4, cap=True,
         a0=math.pi / 4, a1=math.pi / 4 + math.tau)
    for k in range(4):   # a cross bar of the cage on each face
        a = k * math.pi / 2; nx, nz = math.sin(a), math.cos(a)
        box(bm, (LX + nx * (LW + .004), (y0 + y1) / 2, cz + nz * (LW + .004)), (.006 + abs(nz) * LW, .006, .006 + abs(nx) * LW))
hard('lantern__iron', lantern)
def panes(bm):   # four horn panes and the flame inside, lit
    cz = 0.0; y0 = LT - .08; y1 = y0 - LH + .02
    loft(bm, [(y0, LX, cz, LW * 1.25, LW * 1.25), (y1, LX, cz, LW * 1.25, LW * 1.25)], 4, cap=True, a0=math.pi / 4, a1=math.pi / 4 + math.tau)
hard('lantern__glass', panes)
def fire(bm):   # out through the burst panes and the vents: tongues of flame, licking up and out
    r = random.Random(7); cz = 0.0; yc = LT - .07 - LH / 2
    for k in range(4):
        a = k * math.pi / 2 + r.uniform(-.2, .2); nx, nz = math.sin(a), math.cos(a)
        base = Vector((LX + nx * LW * .9, yc - .04, cz + nz * LW * .9))
        mid = base + Vector((nx * .07, .1, nz * .07)); tip = mid + Vector((nx * .03, .14 + r.uniform(0, .06), nz * .03))
        tube(bm, [tuple(base), tuple(mid), tuple(tip)], [.055, .04, .004], 6)
    tube(bm, [(LX, LT - .02, cz), (LX + .01, LT + .12, cz), (LX - .01, LT + .28, cz)], [.05, .035, .004], 6)
hard('lantern__burn', fire)

# ---- the gate-bar, on the weapon bone: a square iron beam, banded, the grip wrapped, a hooked staple at the end -------------------
BX, BY = -SX, WR - .045             # the fist's centre: the beam runs along z through it
BZ0, BZ1 = -.3, 1.45                # from its butt behind the fist to its far end
def gate_bar(bm):
    beam(bm, [(BX, BY, BZ0), (BX, BY, BZ0 + .1), (BX, BY, .9), (BX, BY, BZ1)], .036, .042)
hard('weapon__bar', gate_bar)
def bar_iron(bm):   # bands and studs along it, a butt cap, the hooked staple at its end
    for z in (.35, .62, .9, 1.18, 1.44):
        beam(bm, [(BX, BY, z - .025), (BX, BY, z + .025)], .044, .05)
    for z in (.5, .76, 1.04, 1.31):
        for dy in (1, -1):
            box(bm, (BX, BY + dy * .045, z), (.012, .006, .012))
    beam(bm, [(BX, BY, BZ0 - .02), (BX, BY, BZ0 + .04)], .046, .052)
    # the staple: a bent iron hook off the far end, the catch that once dropped into the gate's cradle
    tube(bm, [(BX, BY + .03, BZ1 - .1), (BX, BY + .12, BZ1 - .06), (BX, BY + .15, BZ1 + .02), (BX, BY + .1, BZ1 + .08), (BX, BY + .04, BZ1 + .06)],
         [.022, .022, .02, .018, .014], 6)
hard('weapon__iron', bar_iron)
def bar_grip(bm):   # a leather wrap either side of the fist
    for z0, z1 in ((-.27, -.09), (.09, .2)):
        beam(bm, [(BX, BY, z0), (BX, BY, z1)], .042, .048)
hard('weapon__leather', bar_grip)

# ---- legs: mail under cuisses, knee cops, greaves bound in iron, broad sabatons --------------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    soft(f'leg{n}__mail', lambda bm, hx=hx: tube(bm, [(hx, .97, -.01), (hx * 1.06, .72, .0), (hx, .5, .01)], [.135, .116, .094], 8), 48, voxel=.012)
    def cuisse(bm, hx=hx, s=s):
        c = s * .3
        loft(bm, [(.85, hx + s * .012, .006, .132, .134), (.58, hx + s * .008, .016, .11, .112)], 6, cap=False, a0=c - 1.5, a1=c + 1.5)
        def point(p, a, e): return (p.x, p.y, p.z + .025 * max(0, math.cos(a)) * max(0, 1 - abs(e)))
        shell(bm, (hx, .455, .052), .086, .086, .064, -1.1, 1.2, -1.4, 1.4, nu=5, nv=2, warp=point)
    hard(f'leg{n}__plate', cuisse, thick=.012)
    hard(f'knee{n}__plate', lambda bm, hx=hx: loft(bm, [(.43, hx, .005, .088, .09), (.33, hx, -.006, .098, .104), (.2, hx, .0, .082, .084), (.12, hx, .004, .078, .08)], 8, cap=True))
    def greave_bands(bm, hx=hx):
        for y, r in ((.34, .101), (.2, .086)):
            loft(bm, [(y + .015, hx, -.004, r, r * 1.05), (y - .015, hx, -.004, r, r * 1.05)], 8, cap=False)
    hard(f'knee{n}__iron', greave_bands, thick=.008)
    def sabaton(bm, hx=hx):
        blob(bm, (hx, .092, -.005), .078, (1.0, .95, 1.1), 1)
        blob(bm, (hx, .064, .09), .074, (1.05, .82, 1.6), 1)
        blob(bm, (hx, .052, .2), .054, (1.05, .78, 1.1), 1)
        blob(bm, (hx, .05, -.065), .054, (1.0, .9, .8), 1)
    soft(f'knee{n}__iron.1', sabaton, 60, voxel=.008)

result = tally()
