# Hale and Harrow, the Castellans (STORY.md 10d): twin sisters who split the one suit of armour that came back gilded
# from Aurel. Level 8's bosses. Both figures come from this one script: they are twins, so they share the under-kit, and
# each half of the suit is its own set of pieces, so a sister left alone can wear her sister's half too (the model defs
# in js/data/bosses/castellans.js pick the pieces and hide the other half until the `whole` phase reveals it).
# One rigid mesh per game bone (js/rig.js skeleton at scale 1), named castellans:<bone>__<piece>[.n]. The game scales them
# 1.75x (bulk 1.15). Rest pose: upright, arms hanging. Game axes (x = the figure's left, y up, z forward), through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.38, y 1.55, elbows
# y 1.25, wrists .95; hips x +-.15, y .90, knees .45. The axe is baked on the `weapon` bone (origin the right wrist, its haft
# along +z through the fist). Model bones: loinF (0, .93, .2), loinB (0, .93, -.2); Hale's cape capeA (0, 1.58, -.25),
# capeB (0, 1.16, -.29), capeC (0, .76, -.31); Harrow's braid (0, 1.74, -.12).
# The look: Saltgrave's sea-grey and salt-white garrison kit (a mail hauberk, a surcoat with the garrison's white bar, a
# belt) under the one gilded suit, worn gold over salt-crusted steel. Hale has its top half: a close helm with a gilt crest
# like a breaking wave and a narrow eye slit, a breastplate with spaulders and the fortress's tower-over-waves on the
# breast, and the bearded axe; leather bracers and boots, a short ragged cape. Harrow has its bottom half: great gauntlets
# with fluted cuffs and ridged knuckles, greaves with fanned knee cops and pointed sabatons; bare-headed, her hair drawn
# back tight into one long braid, a quilted gambeson. Boss budget: 14,000 per figure.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'gilt': (0.62, 0.5, 0.26), 'steel': (0.42, 0.43, 0.44), 'dark': (0.03, 0.03, 0.035), 'mail': (0.3, 0.31, 0.32),
       'quilt': (0.36, 0.38, 0.36), 'skin': (0.62, 0.52, 0.46), 'hair': (0.14, 0.11, 0.09), 'coat': (0.26, 0.31, 0.31),
       'band': (0.74, 0.74, 0.7), 'leather': (0.24, 0.19, 0.15), 'bracer': (0.2, 0.16, 0.13), 'cape': (0.22, 0.27, 0.27),
       'haft': (0.18, 0.15, 0.12)}, prefix='castellans:')

SX, EL, WR = .38, 1.25, .95

def box(bm, c, h):
    c = Vector(c); vs = []
    for dx, dy, dz in ((-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1), (-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)):
        vs.append(bm.verts.new(G(*(c + Vector((dx * h[0], dy * h[1], dz * h[2]))))))
    for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (2, 3, 7, 6), (1, 2, 6, 5), (0, 4, 7, 3)):
        bm.faces.new([vs[i] for i in f])

def lerp_rows(rows, y):
    """rows: (y, cz, rx, rz) top to bottom; the values interpolated at height y."""
    if y >= rows[0][0]: return rows[0][1:]
    for r0, r1 in zip(rows, rows[1:]):
        if r1[0] <= y <= r0[0]:
            f = (y - r0[0]) / (r1[0] - r0[0]); return tuple(a + (b - a) * f for a, b in zip(r0[1:], r1[1:]))
    return rows[-1][1:]

def slab(bm, outline, x0, half, edge=None):
    """A flat plate in the y-z plane at x0 from an outline of (y, z) game points; `half` its half thickness, thinned to
    `edge` at the points whose index is in edge (an axe's cutting edge)."""
    f, b = [], []
    for i, (y, z) in enumerate(outline):
        t = half if not edge or i not in edge else half * .25
        f.append(bm.verts.new(G(x0 + t, y, z))); b.append(bm.verts.new(G(x0 - t, y, z)))
    bm.faces.new(f); bm.faces.new(list(reversed(b)))
    n = len(outline)
    for k in range(n):
        j = (k + 1) % n; bm.faces.new((f[k], b[k], b[j], f[j]))

# ==== HEAD ==================================================================================================================
# ---- Hale: a gilded close helm, a narrow eye slit, a crest like a wave breaking backward -------------------------------------
HELM = [(2.0, -.015, .04, .045), (1.985, -.015, .095, .105), (1.95, -.012, .132, .148), (1.89, -.006, .146, .162),
        (1.83, 0, .148, .168), (1.76, .006, .144, .17), (1.7, .004, .136, .16), (1.65, -.012, .13, .148)]
FTOP, FBOT, FA = 1.842, 1.814, 1.0      # the eye slit: between these heights, FA radians either side of forward
def chin(a, y):   # the bevor runs to a blunt prow at the chin
    return .05 * max(0.0, math.cos(a)) ** 6 * max(0.0, min(1.0, (1.78 - y) / .08))
def helm_at(a, y, lift=0.0):
    cz, rx, rz = lerp_rows(HELM, y); r = 1 + chin(a, y) + lift
    return (math.sin(a) * rx * r, y, cz + math.cos(a) * rz * r)
def helm(bm):
    rows = lambda ys: [(y, 0, *lerp_rows(HELM, y)) for y in ys]
    loft(bm, rows([y for y, *_ in HELM if y > FTOP] + [FTOP]), 22, cap=False, push=chin)
    loft(bm, rows([FTOP, FBOT]), 16, cap=False, a0=FA, a1=math.tau - FA, push=chin)
    loft(bm, rows([FBOT, 1.79] + [y for y, *_ in HELM if y < 1.79]), 22, cap=False, push=chin)
hard('head__gilt', helm, thick=.013, outward=(0, 1.83, -.02))
def slit_dark(bm):   # the dark behind the slit and the breaths
    loft(bm, [(y, 0, cz - .012, rx - .03, rz - .03) for y in (FTOP + .012, FBOT - .012) for cz, rx, rz in [lerp_rows(HELM, y)]], 10,
         cap=False, a0=-FA - .25, a1=FA + .25)
hard('head__dark', slit_dark, outward=(0, 1.83, -.5))
def helm_steel(bm):   # the slit's raised lips, breaths down the cheeks, a rolled rim at the neck, and the wave crest
    for y0, y1 in ((FTOP + .016, FTOP), (FBOT, FBOT - .016)):
        rows = [(y, 0, cz, rx * 1.03, rz * 1.03) for y in (y0, y1) for cz, rx, rz in [lerp_rows(HELM, y)]]
        loft(bm, rows, 8, cap=False, a0=-FA - .05, a1=FA + .05, push=chin)
    for s in (-1, 1):   # three breaths each side, short raised bars
        for k in range(3):
            a = s * (.55 + .14 * k)
            p0, p1 = Vector(helm_at(a, 1.775, .02)), Vector(helm_at(a, 1.725, .025))
            tube(bm, [tuple(p0), tuple(p1)], [.006, .006], 4)
    loft(bm, [(1.66, 0, -.012, .136, .154), (1.645, 0, -.012, .138, .156)], 18, cap=False)
    # the crest: a fin over the crown, low at the brow, rising toward the back and curling forward over itself
    def frame(u):   # a point on the crown's centre line, its outward normal and its tangent toward the back
        f = .45 + 2.25 * u
        p = Vector((0, 1.84 + .158 * math.sin(f), -.01 + .17 * math.cos(f)))
        return p, Vector((0, math.sin(f), math.cos(f))), Vector((0, math.cos(f), -math.sin(f)))
    def base(u): return frame(u)[0] + frame(u)[1] * -.004
    def top(u):
        p, nrm, t = frame(u); h = .03 + .15 * u ** 1.4
        if u < .72: return p + nrm * h
        ang = (u - .72) / .28 * 1.9   # the curl: the crest's top bends forward over itself
        return p + nrm * h * math.cos(ang) - t * h * math.sin(ang)
    sheet(bm, 14, 2, lambda u, v: tuple(base(u).lerp(top(u), v)))
hard('head__steel', helm_steel, thick=.012)

# ---- Harrow: her face, the hair drawn back tight, the long braid --------------------------------------------------------------
def face(bm):
    blob(bm, (0, 1.835, -.01), .095, (.94, 1.1, 1.08), 3)        # the skull
    blob(bm, (0, 1.735, .03), .066, (1.02, .82, .98), 3)         # the jaw
    blob(bm, (0, 1.695, .07), .026, (1.1, .9, .9), 2)            # the chin
    for s in (-1, 1):
        blob(bm, (s * .05, 1.79, .062), .03, (1.0, .8, .8), 2)   # cheekbones
        blob(bm, (s * .031, 1.828, .082), .021, (1.45, .55, .6), 2)   # brows
        blob(bm, (s * .09, 1.79, -.008), .024, (.45, 1.15, .85), 1)   # ears
    blob(bm, (0, 1.788, .093), .016, (.8, 1.75, 1.25), 2)        # the nose
    blob(bm, (0, 1.736, .084), .019, (1.5, .48, .62), 1)         # the mouth
    tube(bm, [(0, 1.73, -.012), (0, 1.66, -.01), (0, 1.6, -.008)], [.058, .056, .062], 10)   # the neck
soft('head__skin', face, 1100, voxel=.0055)
def hair(bm):   # pulled hard back from the brow: a close cap, two plaits over the crown into the braid
    def cap(p, a, e): return (p.x, p.y, p.z + .01 * max(0.0, math.cos(a)) * max(0.0, e))
    shell(bm, (0, 1.84, -.016), .102, .118, .112, .45, 1.57, 0, math.tau, nu=18, nv=5, warp=cap)
    shell(bm, (0, 1.84, -.016), .104, .118, .114, -.45, .47, 1.25, math.tau - 1.25, nu=12, nv=4)
    for s in (-1, 1):
        pts = [(s * .028, 1.93, .07), (s * .03, 1.96, .0), (s * .024, 1.93, -.08), (s * .012, 1.85, -.12), (0, 1.77, -.12)]
        tube(bm, pts, [.015, .017, .017, .016, .015], 6)
soft('head__hair', hair, 700, voxel=.0065)
def braid(bm):   # one long braid from the nape down the back, bound at the end
    r = []
    for k in range(13):
        t = k / 12; y = 1.76 - .52 * t; z = -.115 - .1 * t ** 1.2
        r.append(((.012 if k % 2 else -.012) * (1 - t * .5), y, z))
        blob(bm, r[-1], .03 - .01 * t, (1.15, 1.25, .95), 1)
    tube(bm, [(0, 1.24, -.215), (0, 1.17, -.22), (.006, 1.08, -.225)], [.013, .018, .006], 6)   # the tail
soft('braid__hair', braid, 420, voxel=.007)
hard('braid__gilt', lambda bm: loft(bm, [(1.262, 0, -.21, .02, .02), (1.236, 0, -.213, .021, .021)], 8, cap=True))   # its gold ring

# ==== NECK: a mail collar standing up round the throat (both) =================================================================
hard('neck__mail', lambda bm: loft(bm, [(1.7, 0, -.005, .09, .085), (1.64, 0, -.008, .13, .12), (1.58, 0, -.01, .22, .17)], 12, cap=False), thick=.01)

# ==== CHEST ===================================================================================================================
MAIL = [(1.62, -.01, .17, .13), (1.56, 0, .27, .185), (1.45, .01, .27, .195), (1.32, .01, .24, .18), (1.2, 0, .2, .155),
        (1.08, 0, .215, .16), (1.0, 0, .235, .17)]
hard('chest__mail', lambda bm: loft(bm, [(y, 0, cz, rx, rz) for y, cz, rx, rz in MAIL], 14, cap=True))
# ---- Harrow: a quilted gambeson with a standing collar, stitched in long channels ------------------------------------------------
QUILT = [(1.665, -.01, .11, .1), (1.63, -.01, .16, .13), (1.57, 0, .29, .2), (1.45, .01, .295, .215), (1.32, .01, .262, .2),
         (1.2, 0, .222, .174), (1.08, 0, .236, .178), (1.0, 0, .255, .186)]
def channels(a, y): return -.035 * abs(math.sin(a * 7)) ** 3 if y < 1.6 else 0.0
hard('chest__quilt', lambda bm: loft(bm, [(y, 0, cz, rx, rz) for y, cz, rx, rz in QUILT], 42, cap=True, push=channels))
# ---- Hale: the gilded breastplate and its gorget, the tower over the waves on the breast -------------------------------------------
PLATE = [(1.6, -.005, .2, .16), (1.555, .005, .3, .222), (1.46, .02, .315, .24), (1.34, .02, .278, .224), (1.22, .01, .24, .196),
         (1.1, .005, .258, .198)]
def bust(a, y):   # a shaped breastplate: a keel down the middle and two gentle swells
    k = .03 * max(0.0, math.cos(a)) ** 10 * max(0.0, min(1.0, (1.55 - y) / .1))
    s = sum(.05 * math.exp(-((a - c) / .32) ** 2) for c in (-.45, .45)) * math.exp(-((y - 1.41) / .085) ** 2)
    return k + s
hard('chest__gilt', lambda bm: loft(bm, [(y, 0, cz, rx, rz) for y, cz, rx, rz in PLATE], 28, cap=True, push=bust))
def plate_at(a, y, out=0.0):
    cz, rx, rz = lerp_rows(PLATE, y); r = 1 + bust(a, y)
    return Vector((math.sin(a) * (rx * r + out), y, cz + math.cos(a) * (rz * r + out)))
def gorget(bm):
    loft(bm, [(1.69, 0, -.005, .1, .095), (1.63, 0, -.008, .145, .13), (1.585, 0, -.01, .215, .17)], 16, cap=False)
hard('chest__gilt.1', gorget, thick=.012)
def plate_steel(bm):   # rolled rims at the neck and hem, and the sigil: a tower on three waves
    loft(bm, [(1.605, 0, -.005, .205, .165), (1.59, 0, -.005, .245, .18)], 16, cap=False)
    loft(bm, [(1.115, 0, .005, .268, .205), (1.095, 0, .005, .27, .206)], 18, cap=False)
    c = plate_at(0, 1.29, .006)
    box(bm, (0, 1.31, c.z + .004), (.022, .045, .006))             # the tower
    for k in (-1, 0, 1): box(bm, (k * .016, 1.362, c.z + .004), (.006, .009, .006))   # its merlons
    for i, y in enumerate((1.255, 1.235, 1.215)):                   # the waves under it
        pts = [(x, y + .008 * math.sin(x * 70 + i), plate_at(math.asin(max(-1, min(1, x / .26))), y, .01).z) for x in [(-.06 + .12 * j / 8) for j in range(9)]]
        tube(bm, pts, [.004] * 9, 4)
hard('chest__steel', plate_steel, outward=(0, 1.3, -.05))
# ---- Hale: the short cape, sea-grey, torn at the hem ----------------------------------------------------------------------------
TOP, HEM = 1.56, .52
def cape_at(u, v):
    y = TOP + (HEM - TOP) * v; w = .56 + .26 * v ** .8
    bow = (.12 - .03 * v) * (1 - math.cos((u - .5) * math.pi))
    return ((u - .5) * w, y, -.25 - .07 * v ** 1.2 + bow + .012 * math.sin(u * 15))
SEGS = [('capeA', 1.58), ('capeB', 1.16), ('capeC', .76)]
def v_of(y): return (TOP - y) / (TOP - HEM)
for i, (bone, y0) in enumerate(SEGS[:2]):
    v0, v1 = (0 if i == 0 else v_of(y0)), v_of(SEGS[i + 1][1])
    hard(f'{bone}__cape', lambda bm, v0=v0, v1=v1: sheet(bm, 10, 3, lambda u, v: cape_at(u, v0 + (v1 - v0) * v)))
def cape_hem(bm):
    r = random.Random(5); n = 6; v0 = v_of(.76)
    for k in range(n):
        u0, u1 = k / n + .004, (k + 1) / n - .004; ln = r.uniform(.7, 1.0)
        sheet(bm, 2, 3, lambda u, v, u0=u0, u1=u1, ln=ln: cape_at(u0 + (u1 - u0) * u, v0 + (1 - v0) * ln * v), ragged=.06, seed=k + 20)
hard('capeC__cape', cape_hem)

# ==== SPIN: the mail skirt, the belt (both) ==================================================================================
hard('spin__mail', lambda bm: loft(bm, [(1.06, 0, 0, .238, .172), (.88, 0, .005, .27, .2), (.66, 0, 0, .29, .215)], 12, cap=False), thick=.008)
hard('spin__leather', lambda bm: loft(bm, [(1.085, 0, .003, .265, .195), (1.03, 0, .003, .27, .2)], 14, cap=False), thick=.014)
def buckle(bm):
    box(bm, (0, 1.058, .205), (.034, .03, .008))
    box(bm, (.0, 1.058, .214), (.022, .018, .004))
hard('spin__steel', buckle)
# ---- the surcoat panels front and back, sea-grey with the garrison's white bar ---------------------------------------------------
for bone, s, w, ln, seed in (('loinF', 1, .36, .6, 3), ('loinB', -1, .4, .64, 6)):
    hard(f'{bone}__coat', lambda bm, s=s, w=w, ln=ln, seed=seed: sheet(bm, 4, 5, lambda u, v: (
        (u - .5) * w * (1 + .16 * v), 1.0 - ln * v, s * (.218 + .04 * v - .3 * ((u - .5) * w) ** 2)), ragged=.05, seed=seed))
    hard(f'{bone}__band', lambda bm, s=s, w=w, ln=ln: sheet(bm, 4, 1, lambda u, v: (
        (u - .5) * w * (1 + .16 * (.2 + .06 * v)), 1.0 - ln * (.2 + .06 * v), s * (.222 + .04 * (.2 + .06 * v) - .3 * ((u - .5) * w) ** 2))),
        outward=(0, .85, -s * .5))

# ==== ARMS ===================================================================================================================
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    hard(f'arm{n}__mail', lambda bm, x=x: loft(bm, [(1.6, x, 0, .082, .082), (1.42, x, 0, .076, .076), (EL + .03, x, 0, .068, .068)], 8, cap=True))
    hard(f'elbow{n}__mail', lambda bm, x=x: loft(bm, [(EL + .03, x, 0, .066, .066), (EL - .12, x, 0, .06, .06), (WR + .06, x, 0, .052, .054)], 8, cap=True))
    # Harrow: the gambeson's padded sleeves, ringed
    def sleeve(bm, x=x):
        rows = []
        for k in range(7):
            y = 1.6 - .05 * k; r = .1 - .004 * k + (.008 if k % 2 == 0 else 0)
            rows.append((y, x, 0, r, r))
        loft(bm, rows, 10, cap=True)
    hard(f'arm{n}__quilt', sleeve)
    # Hale: gilded spaulders, three lames
    def spaulder(bm, x=x, s=s):
        side = s * math.pi / 2; cx = x - s * .02
        def slope(p, a, e):
            d = (p.x - cx) * s
            return (p.x, p.y - .09 * max(0, d) * (1 - .5 * math.sin(e)) + .03 * max(0, -d), p.z)
        shell(bm, (cx, 1.575, -.005), .124, .1, .136, 0, math.pi / 2, 0, math.tau, nu=12, nv=3, warp=slope)
        for k in range(2):
            y = 1.535 - k * .05; r = .104 - .006 * k
            loft(bm, [(y, x + s * (.02 + .008 * k), -.005, r, r * 1.08), (y - .064, x + s * (.03 + .01 * k), -.005, r + .012, (r + .012) * 1.08)],
                 8, cap=False, a0=side - 2.0, a1=side + 2.0)
    hard(f'arm{n}__gilt', spaulder, thick=.012)
    def spaulder_rim(bm, x=x, s=s):   # a rolled steel edge on the lowest lame
        side = s * math.pi / 2; r = .098 + .012
        loft(bm, [(1.535 - .05 - .058, x + s * .04, -.005, r + .004, (r + .004) * 1.08), (1.535 - .05 - .07, x + s * .04, -.005, r + .004, (r + .004) * 1.08)],
             8, cap=False, a0=side - 2.0, a1=side + 2.0)
    hard(f'arm{n}__steel', spaulder_rim, thick=.008)
    # Hale: leather bracers and gloved fists
    def bracer(bm, x=x, s=s):
        loft(bm, [(EL - .06, x, 0, .066, .068), (WR + .16, x, 0, .062, .064), (WR + .03, x, 0, .06, .062)], 8, cap=True)
        blob(bm, (x + s * .03, WR - .024, 0), .06, (.62, 1.0, 1.1), 1)
        for zf in (-.04, -.013, .014, .04):
            tube(bm, [(x + s * .04, WR - .03, zf), (x + s * .03, WR - .082, zf * 1.1), (x - s * .028, WR - .088, zf * 1.1), (x - s * .05, WR - .042, zf)],
                 [.018, .017, .016, .015], 5)
        tube(bm, [(x + s * .022, WR - .006, .06), (x - s * .015, WR, .072), (x - s * .047, WR - .012, .066)], [.017, .016, .014], 5)
    soft(f'elbow{n}__bracer', bracer, 300, voxel=.0062)
    # Harrow: the great gauntlets: a fanned couter, a fluted vambrace with a flared cuff, plated fingers, ridged knuckles
    def gauntlet(bm, x=x, s=s):
        loft(bm, [(EL - .05, x, -.004, .072, .074), (EL - .2, x, -.002, .074, .076), (WR + .1, x, 0, .08, .082), (WR + .04, x, 0, .108, .11),
                  (WR + .02, x, 0, .112, .114)], 12, cap=False,
             push=lambda a, y: .06 * abs(math.sin(a * 6)) ** 4 if y < WR + .12 else 0.0)
        shell(bm, (x, EL, -.03), .085, .075, .07, -1.2, 1.2, math.pi - 1.6, math.pi + 1.6, nu=8, nv=4)   # the couter
        for k in (-1, 1):   # its fan, a gilt leaf to either side
            sheet(bm, 2, 2, lambda u, v, k=k: (x + k * (.06 + .05 * u), EL + .05 - .1 * v, -.04 - .02 * u))
    hard(f'elbow{n}__gilt', gauntlet, thick=.011, outward=lambda c, x=x: Vector((x, c.y, 0)))
    def fist(bm, x=x, s=s):   # the plated fist, larger than her own
        blob(bm, (x + s * .034, WR - .026, 0), .072, (.66, 1.0, 1.18), 1)
        for zf in (-.048, -.016, .016, .048):
            tube(bm, [(x + s * .048, WR - .034, zf), (x + s * .035, WR - .096, zf * 1.1), (x - s * .034, WR - .102, zf * 1.1), (x - s * .058, WR - .046, zf)],
                 [.023, .022, .02, .019], 5)
        tube(bm, [(x + s * .026, WR - .006, .07), (x - s * .018, WR, .084), (x - s * .056, WR - .012, .076)], [.022, .02, .018], 5)
    soft(f'elbow{n}__gilt.1', fist, 340, voxel=.0062)
    def knuckles(bm, x=x, s=s):   # a steel ridge across the knuckles, spiked
        tube(bm, [(x + s * .05, WR - .1, -.07), (x + s * .055, WR - .108, 0), (x + s * .05, WR - .1, .07)], [.016, .018, .016], 6)
        for zf in (-.048, -.016, .016, .048):
            tube(bm, [(x + s * .062, WR - .11, zf), (x + s * .09, WR - .118, zf)], [.012, .002], 5)
    hard(f'elbow{n}__steel', knuckles)

# ==== LEGS ===================================================================================================================
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    soft(f'leg{n}__mail', lambda bm, hx=hx: tube(bm, [(hx, .97, -.01), (hx * 1.05, .72, .0), (hx, .48, .01)], [.122, .104, .084], 8), 44, voxel=.012)
    # Hale: tall riding boots, the cuff turned down
    def boot(bm, hx=hx):
        loft(bm, [(.47, hx, .0, .086, .09), (.43, hx, .0, .082, .086), (.3, hx, -.004, .072, .076), (.16, hx, .0, .066, .07), (.1, hx, .005, .068, .072)], 10, cap=True)
        blob(bm, (hx, .07, .06), .062, (1.0, .72, 1.75), 2)
        blob(bm, (hx, .06, -.04), .05, (1.0, .9, .9), 1)
    soft(f'knee{n}__bracer', boot, 300, voxel=.008)
    # Harrow: greaves with a fanned knee cop, pointed sabatons, all gilt
    def greave(bm, hx=hx, s=s):
        loft(bm, [(.4, hx, .006, .082, .09), (.3, hx, .0, .078, .086), (.18, hx, .004, .07, .078), (.1, hx, .008, .07, .08)], 12, cap=False,
             push=lambda a, y: .035 * max(0.0, math.cos(a)) ** 8)   # a keel down the shin
        shell(bm, (hx, .45, .045), .088, .075, .07, -1.1, 1.2, -1.45, 1.45, nu=8, nv=3,
              warp=lambda p, a, e: (p.x, p.y, p.z + .025 * max(0, math.cos(a)) * max(0, 1 - abs(e))))
        for k in (-1, 1):   # the cop's fan
            sheet(bm, 2, 2, lambda u, v, k=k: (hx + k * (.07 + .045 * u), .5 - .1 * v, .03 - .015 * u))
    hard(f'knee{n}__gilt', greave, thick=.011, outward=lambda c, hx=hx: Vector((hx, c.y, 0)))
    def sabaton(bm, hx=hx):
        blob(bm, (hx, .092, -.005), .074, (1.0, .95, 1.1), 1)
        for k in range(4):   # overlapping lames down the foot to a point
            z = .05 + .05 * k
            blob(bm, (hx, .07 - .006 * k, z), .07 - .011 * k, (1.0, .74, .9), 1)
        tube(bm, [(hx, .045, .2), (hx, .035, .28)], [.03, .004], 6)
        blob(bm, (hx, .05, -.065), .052, (1.0, .9, .8), 1)
    soft(f'knee{n}__gilt.1', sabaton, 320, voxel=.0075)

# ==== THE AXE (on the weapon bone): a long haft, a bearded gilt head with a back spike, a spike on top =========================
BX, BY = -SX, WR - .045
def haft(bm):
    tube(bm, [(BX, BY, -.3), (BX, BY, .4), (BX, BY, 1.0), (BX, BY, 1.52)], [.026, .025, .024, .023], 8)
hard('weapon__haft', haft)
def axe_head(bm):
    # the blade on the haft's -y side (its leading side as it chops), the beard sweeping down toward the hand
    yo = lambda dy: BY + dy
    outline = [(yo(-.02), 1.48), (yo(-.1), 1.53), (yo(-.2), 1.6), (yo(-.3), 1.6), (yo(-.35), 1.52), (yo(-.38), 1.4), (yo(-.38), 1.26),
               (yo(-.35), 1.13), (yo(-.29), .99), (yo(-.24), .95), (yo(-.2), .99), (yo(-.12), 1.12), (yo(-.05), 1.21), (yo(-.02), 1.25)]
    slab(bm, outline, BX, .012, edge={2, 3, 4, 5, 6, 7, 8, 9})
    # the socket round the haft
    tube(bm, [(BX, BY, 1.24), (BX, BY, 1.5)], [.036, .034], 8)
hard('weapon__gilt', axe_head, smooth=False)
def axe_steel(bm):   # the back spike, the top spike, langets down the haft, bands, the butt cap
    tube(bm, [(BX, BY + .03, 1.38), (BX, BY + .12, 1.37), (BX, BY + .19, 1.34)], [.024, .014, .002], 6)
    tube(bm, [(BX, BY, 1.5), (BX, BY, 1.6), (BX, BY, 1.72)], [.024, .016, .002], 6)
    for sx in (-1, 1): box(bm, (BX + sx * .026, BY, 1.1), (.004, .012, .14))
    for z in (.62, .24, -.12):
        tube(bm, [(BX, BY, z - .018), (BX, BY, z + .018)], [.031, .031], 8)
    blob(bm, (BX, BY, -.33), .036, (1, 1, 1.3), 1)
hard('weapon__steel', axe_steel)
def grip(bm):   # a leather wrap either side of the fist
    for z0, z1 in ((-.27, -.09), (.08, .22)):
        tube(bm, [(BX, BY, z0), (BX, BY, z1)], [.03, .03], 8)
hard('weapon__leather', grip)

result = tally()
