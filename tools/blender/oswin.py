# Oswin, the First Crown (STORY.md 10g): the first king of Thrale the Ember ever wore, laid beneath the throne with the
# crown still on him, risen to his throne in the ash. Level 11's boss. One rigid mesh per game bone (js/rig.js skeleton
# at scale 1, MODEL_DEFS.oswinFirstCrown), named oswin:<bone>__<material slot>[.n]. The game scales him 2.2x (bulk 1.3).
# Rest pose: upright, arms hanging. Game axes (x = the figure's left, y up, z forward), through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.42 (his
# shoulderX), y 1.55, elbows y 1.25, wrists .95; hips x +-.15, y .90, knees .45. The Crown's Axe is baked on the `weapon`
# bone (origin the right wrist, its haft along +z through the fist, the bit's edge toward -y: it leads a downward chop).
# Model bones: loinF (0, .93, .2), loinB (0, .93, -.2), and the mantle's chain capeA (0, 1.58, -.28), capeB (0, 1.14, -.32),
# capeC (0, .70, -.35).
# The look: older than every other king in the game, and buried. A huge, gaunt man whose skin has gone to ash, grey and
# cracked; a long white beard and mane matted with ash; deep-set eyes that burn. The First Crown sits fused to his brow:
# a broad band of dark old gold rough-forged into seven tall uneven tines like flames, ember-stones set in it that never
# went out. A great gold torc; an archaic cuirass of bronze scales, row on row, with round bronze pauldrons; burial bands
# wound round his forearms, shins and feet; gold arm-rings on bare ash arms; a kilt of leather lappets studded with gold;
# the king's mantle, crimson burned nearly black, its hem burned away into a smouldering ragged edge (`ember`, always lit).
# The Crown's Axe: a long haft bound in gold, a great bearded crescent of blackened bronze inlaid with gold along its edge,
# a back spike, a crowned butt. When the Ember takes his hands (`burn`, drawn only while he burns) seams of fire open up
# his forearms and hands, across his breast and his face.
# Boss budget: about 15,000.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'skin': (0.34, 0.32, 0.3), 'hair': (0.82, 0.8, 0.76), 'gold': (0.72, 0.54, 0.22), 'bronze': (0.36, 0.27, 0.15),
       'cloth': (0.5, 0.46, 0.4), 'mantle': (0.24, 0.05, 0.04), 'leather': (0.14, 0.1, 0.08), 'iron': (0.16, 0.15, 0.14),
       'ember': (1.0, 0.5, 0.15), 'burn': (1.0, 0.42, 0.12)}, prefix='oswin:')

SX, EL, WR = .42, 1.25, .95

def arcpts(c, r, a0, a1, n):
    """Points on a horizontal arc round c (a = 0 forward, pi/2 the figure's left)."""
    return [(c[0] + math.sin(a0 + (a1 - a0) * k / n) * r[0], c[1], c[2] + math.cos(a0 + (a1 - a0) * k / n) * r[1]) for k in range(n + 1)]

def crack(bm, pts, r=.004):
    tube(bm, pts, [r] * len(pts), 4)

# ==== HEAD ==================================================================================================================
def face(bm):   # gaunt and long: a heavy brow, sunken cheeks under high bones, a long nose, the neck thick with age
    blob(bm, (0, 1.87, -.016), .1, (.9, 1.08, 1.06), 3)            # the skull
    blob(bm, (0, 1.76, .03), .066, (.92, .9, .95), 3)              # the jaw
    blob(bm, (0, 1.835, .085), .03, (2.6, .55, .7), 2)             # the brow ridge, heavy
    for s in (-1, 1):
        blob(bm, (s * .058, 1.81, .062), .026, (1.0, .75, .7), 2)      # the cheekbones
        blob(bm, (s * .097, 1.82, -.01), .022, (.4, 1.25, .8), 1)      # the ears
        blob(bm, (s * .034, 1.812, .078), .012, (1.4, .5, .5), 1)      # the lids, sunk deep
    blob(bm, (0, 1.79, .1), .016, (.8, 2.1, 1.3), 2)               # the nose
    tube(bm, [(0, 1.76, -.02), (0, 1.66, -.014), (0, 1.57, -.01)], [.06, .062, .07], 10)   # the neck
soft('head__skin', face, 1300, voxel=.0055)
def beard(bm):   # white, long, matted into strands down onto his breast; the mane swept back over the skull and down
    for k in range(9):
        u = (k - 4) / 4; x = u * .06
        top = (x, 1.75 - .02 * abs(u), .085 - .02 * abs(u)); end = (x * 1.3, 1.38 + .05 * abs(u) + .02 * (k % 2), .15 - .03 * abs(u))
        mid = ((top[0] + end[0]) / 2, (top[1] + end[1]) / 2, max(top[2], end[2]) + .03)
        tube(bm, [top, mid, end], [.018, .016, .005], 6)
    for s in (-1, 1):   # the moustache into the beard
        tube(bm, [(s * .01, 1.775, .1), (s * .04, 1.765, .095), (s * .058, 1.72, .085)], [.008, .01, .007], 6)
    shell(bm, (0, 1.87, -.02), .107, .112, .114, -.2, 1.4, -1.85, 1.85, nu=14, nv=8)   # the mane over the skull
    for k in range(7):
        a = (k - 3) / 3 * 1.2; x = math.sin(a) * .1
        tube(bm, [(x, 1.86, -.06 - .04 * math.cos(a)), (x * 1.2, 1.7, -.13), (x * 1.3, 1.45 + .03 * (k % 2), -.17)], [.026, .024, .01], 6)
soft('head__hair', beard, 1100, voxel=.005)
def crown(bm):   # the First Crown: a broad band of dark old gold, seven tall uneven tines like flames, fused to the brow
    loft(bm, [(1.955, 0, -.016, .108, .12), (1.9, 0, -.016, .112, .124), (1.885, 0, -.016, .114, .126)], 24, cap=False)
    for k in range(7):
        a = (k - 3) / 3 * 1.6; h = (.12, .17, .14, .22, .14, .17, .12)[k]
        cx, cz = math.sin(a) * .114, -.016 + math.cos(a) * .126
        ox, oz = math.sin(a) * .03, math.cos(a) * .03
        lean = .25 * (1 if k % 2 else -1)
        tube(bm, [(cx, 1.93, cz), (cx + ox * .6 + lean * .02, 1.95 + h * .5, cz + oz * .6), (cx + ox + lean * .04, 1.95 + h, cz + oz)],
             [.022, .014, .002], 6)
    for k in range(13):   # rivets round the band
        a = k / 13 * math.tau; blob(bm, (math.sin(a) * .118, 1.89, -.016 + math.cos(a) * .13), .007, (1, 1, 1), 1)
hard('head__gold', crown)
def stones(bm):   # the ember-stones that never went out: one in each tine's foot, the great one over the brow
    for k in range(7):
        a = (k - 3) / 3 * 1.6
        blob(bm, (math.sin(a) * .122, 1.925, -.016 + math.cos(a) * .134), .013 if k != 3 else .019, (1, 1.3, .6), 1)
hard('head__ember', stones)
hard('head__burn', lambda bm: [crack(bm, p, .0035) for p in (
    [(.02, 1.88, .09), (.04, 1.85, .09), (.05, 1.81, .08), (.068, 1.78, .055)],
    [(-.03, 1.87, .092), (-.05, 1.82, .085), (-.065, 1.77, .06), (-.06, 1.74, .04)])])

# ==== CHEST: ash skin under an archaic cuirass of bronze scales; the torc; the mantle over the shoulders ==========================
TORSO = [(1.62, -.01, .09, .08), (1.58, -.01, .2, .13), (1.5, 0, .3, .17), (1.38, .01, .29, .18), (1.24, .01, .25, .17),
         (1.1, 0, .22, .155), (1.02, 0, .22, .155)]
def lerp_rows(rows, y):
    if y >= rows[0][0]: return rows[0][1:]
    for r0, r1 in zip(rows, rows[1:]):
        if r1[0] <= y <= r0[0]:
            f = (y - r0[0]) / (r1[0] - r0[0]); return tuple(a + (b - a) * f for a, b in zip(r0[1:], r1[1:]))
    return rows[-1][1:]
hard('chest__skin', lambda bm: loft(bm, [(y, 0, cz, rx * .96, rz * .96) for y, cz, rx, rz in TORSO[:3]], 18, cap=False))
def scales(bm):   # rows of bronze scales: each row's lower edge stands proud of the one below
    rows = []
    y = 1.55
    while y > 1.03:
        cz, rx, rz = lerp_rows(TORSO, y); rows.append((y, 0, cz, rx + .012, rz + .012))
        cz, rx, rz = lerp_rows(TORSO, y - .045); rows.append((y - .044, 0, cz, rx + .03, rz + .03)); y -= .045
    loft(bm, rows, 30, cap=False, push=lambda a, yy: .03 * abs(math.sin(a * 15 + (yy * 22) % 2 * 1.57)) * .5)
hard('chest__bronze', scales)
def cui_at(a, y, out=0.0):
    cz, rx, rz = lerp_rows(TORSO, y); return (math.sin(a) * (rx + .035 + out), y, cz + math.cos(a) * (rz + .035 + out))
def regalia(bm):   # the torc with its plain terminals; a gold rim at the cuirass's neck and hem; the breast-boss
    p = arcpts((0, 1.6, .0), (.15, .12), -2.6, 2.6, 22); tube(bm, p, [.024] * len(p), 7)
    for s in (-1, 1): blob(bm, (s * .15 * math.sin(2.6), 1.6, .12 * math.cos(2.6)), .03, (1, 1, 1), 2)
    for y in (1.55, 1.04):
        p = [cui_at(k / 28 * math.tau, y, -.01) for k in range(29)]; tube(bm, p, [.011] * len(p), 5)
    c = cui_at(0, 1.33, .02)
    tube(bm, [(0, 1.33, c[2] - .02), (0, 1.33, c[2] + .012)], [.06, .055], 16)
    for k in range(3):   # the crown's three points on the boss
        x = (k - 1) * .03; tube(bm, [(x, 1.35, c[2] + .012), (x, 1.385 + .012 * (k == 1), c[2] + .01)], [.01, .002], 5)
hard('chest__gold', regalia)
MANTLE_TOP = [(1.66, -.06, .2, .16), (1.6, -.05, .34, .2), (1.5, -.04, .36, .22), (1.36, -.04, .32, .21)]
hard('chest__mantle', lambda bm: loft(bm, [(y, 0, cz, rx, rz) for y, cz, rx, rz in MANTLE_TOP], 22, cap=False, a0=1.0, a1=math.tau - 1.0),
     thick=.014, outward=(0, 1.4, .1))
hard('chest__burn', lambda bm: [crack(bm, [cui_at(a, y, .02) for y, a in p]) for p in (
    [(1.5, .5), (1.44, .3), (1.38, .42), (1.3, .2), (1.22, .35)], [(1.48, -.4), (1.4, -.55), (1.33, -.3), (1.25, -.45)])])

# ==== SPIN: the belt, the kilt's top; the lappets front and back =================================================================
hard('spin__cloth', lambda bm: loft(bm, [(1.05, 0, 0, .225, .16), (.9, 0, .004, .245, .18), (.78, 0, 0, .25, .185)], 18, cap=False))
def belt(bm):
    loft(bm, [(1.1, 0, 0, .245, .178), (1.02, 0, 0, .25, .182)], 24, cap=False)
hard('spin__leather', belt, thick=.008, outward=(0, 1.06, 0))
def plaques(bm):
    for k in range(10):
        a = k / 10 * math.tau; blob(bm, (math.sin(a) * .258, 1.06, math.cos(a) * .19), .028, (1.0, 1.15, .4), 1)
hard('spin__gold', plaques)
def lappet_at(s, u, v, w):   # u across the strip set, v down
    x = (u - .5) * w * (1 + .3 * v)
    return (x, .98 - .5 * v, s * (.2 + .06 * v - .4 * x * x))
for bone, s in (('loinF', 1), ('loinB', -1)):
    def strips(bm, s=s):
        n = 6
        for k in range(n):
            u0, u1 = (k + .06) / n, (k + .94) / n
            ln = .9 + .1 * ((k * 7) % 3) / 2
            sheet(bm, 1, 4, lambda u, v, u0=u0, u1=u1, ln=ln: lappet_at(s, u0 + (u1 - u0) * u, v * ln, .44))
    hard(f'{bone}__leather', strips, thick=.008, outward=(0, .7, -s * .2))
    def studs(bm, s=s):
        for k in range(6):
            u = (k + .5) / 6
            for v in (.3, .75):
                p = lappet_at(s, u, v, .44); blob(bm, (p[0], p[1], p[2] + s * .012), .011, (1, 1, .6), 1)
    hard(f'{bone}__gold', studs)

# ==== the mantle: the king's crimson, burned nearly black, its hem burned away and still smouldering =============================
TOP, HEM = 1.6, .08
def mantle_at(u, v):
    y = TOP + (HEM - TOP) * v; w = .62 + .42 * v ** .8; x = (u - .5) * w
    bow = (.2 - .03 * v) * (1 - math.cos((u - .5) * math.pi))
    return (x, y, -.27 - .15 * v ** 1.1 + bow + .075 * math.sin(u * 15 + v * 2.5) * (.25 + v ** .7))
SEGS = [('capeA', 1.58), ('capeB', 1.14), ('capeC', .70)]
def v_of(y): return (TOP - y) / (TOP - HEM)
for i, (bone, y0) in enumerate(SEGS):
    v0 = 0 if i == 0 else v_of(y0); v1 = v_of(SEGS[i + 1][1]) if i < 2 else 1.0
    if i < 2: hard(f'{bone}__mantle', lambda bm, v0=v0, v1=v1: sheet(bm, 14, 3, lambda u, v: mantle_at(u, v0 + (v1 - v0) * v)), outward=(0, .9, .2))
    else: hard(f'{bone}__mantle', lambda bm, v0=v0, v1=v1: sheet(bm, 18, 4, lambda u, v: mantle_at(u, v0 + (v1 - v0) * v), ragged=.12, seed=7), outward=(0, .9, .2))
def hem(bm):   # the smouldering edge: a ragged line of embers along the burned hem
    r = random.Random(3); pts = []
    for k in range(25):
        u = k / 24; p = Vector(mantle_at(u, .985)); p.y += r.uniform(0, .07); p.z -= .006; pts.append(tuple(p))
    tube(bm, pts, [.007] * len(pts), 4)
hard('capeC__ember', hem)

# ==== ARMS: round bronze pauldrons, bare ash arms with gold rings, burial bands round the forearms, big hands ======================
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    hard(f'arm{n}__skin', lambda bm, x=x: loft(bm, [(1.6, x, 0, .09, .09), (1.45, x, 0, .088, .086), (1.32, x, .004, .078, .076), (EL - .01, x, 0, .07, .07)], 12, cap=True))
    def pauldron(bm, x=x, s=s):   # a broad dome over the shoulder, three lames stepping down over the arm, outside only
        a0, a1 = (-.55, math.pi + .55) if s > 0 else (-math.pi - .55, .55)
        shell(bm, (x - s * .02, 1.53, 0), .16, .1, .155, -.15, 1.5, a0, a1, nu=14, nv=6)
        for k in range(3):
            y = 1.5 - .045 * k
            shell(bm, (x + s * .008 * k, y, 0), .165 + .007 * k, .06, .16 + .007 * k, -.95, -.15, a0 + .25, a1 - .25, nu=12, nv=2)
    hard(f'arm{n}__bronze', pauldron, thick=.01, outward=(x - s * .03, 1.42, 0))
    def rings(bm, x=x, s=s):   # two arm-rings, and a gold rim along the dome's lower edge
        for y in (1.36, 1.31):
            p = arcpts((x, y, .002), (.084, .082), 0, math.tau, 14); tube(bm, p, [.011] * len(p), 5)
        a0, a1 = (-.3, math.pi + .3) if s > 0 else (-math.pi - .3, .3)
        p = [(x + s * .016 + math.sin(a) * .178, 1.4 + .02 * math.cos(a) ** 2, math.cos(a) * .173) for a in [a0 + (a1 - a0) * k / 16 for k in range(17)]]
        tube(bm, p, [.009] * len(p), 5)
    hard(f'arm{n}__gold', rings)
    hard(f'elbow{n}__skin', lambda bm, x=x: loft(bm, [(EL + .02, x, 0, .072, .072), (EL - .08, x, .006, .07, .07), (WR + .1, x, .004, .056, .056), (WR + .02, x, 0, .052, .05)], 12, cap=False))
    def bands(bm, x=x):   # burial linen wound round the forearm, each turn a flat band a little askew
        for k in range(6):
            y = EL - .03 - k * .05; r = .076 - .004 * k; t = .022 * (1 if k % 2 else -1)
            loft(bm, [(y + .02 + t * .3, x, .004, r + .004, r + .004), (y - .02 - t * .3, x, .004, r + .002, r + .002)], 12, cap=False)
    hard(f'elbow{n}__cloth', bands, thick=.006, outward=lambda c, x=x: (x, c.y, .004))
    def hand(bm, x=x, s=s):
        if s < 0:   # the right: a great fist round the haft
            blob(bm, (x + s * .03, WR - .035, 0), .066, (.62, 1.0, 1.15), 2)
            for zf in (-.045, -.015, .015, .045):
                tube(bm, [(x + s * .045, WR - .04, zf), (x + s * .035, WR - .1, zf * 1.1), (x - s * .035, WR - .105, zf * 1.1), (x - s * .056, WR - .05, zf)],
                     [.021, .02, .019, .017], 6)
            tube(bm, [(x + s * .024, WR - .01, .064), (x - s * .02, WR, .078), (x - s * .054, WR - .02, .068)], [.02, .018, .016], 6)
        else:       # the left: half shut, a claw that grips: it takes hold of you
            blob(bm, (x, WR - .05, .006), .058, (.55, 1.1, 1.05), 2)
            for k, zf in enumerate((-.038, -.013, .013, .038)):
                ln = (.09, .1, .095, .08)[k]
                tube(bm, [(x, WR - .09, zf), (x + .01, WR - .09 - ln * .6, zf * 1.1 + .02), (x + .03, WR - .09 - ln, zf * 1.15 + .045)], [.016, .014, .011], 6)
            tube(bm, [(x - .01, WR - .045, .05), (x + .0, WR - .095, .08), (x + .02, WR - .125, .09)], [.017, .014, .011], 6)
        tube(bm, [(x, WR + .04, 0), (x, WR - .02, 0)], [.054, .056], 10)
    soft(f'elbow{n}__skin.1', hand, 800, voxel=.006)
    def seams(bm, x=x, s=s):   # the Ember in his hands: fire up the forearm and over the back of the hand
        for k, (dz, ph) in enumerate(((.06, 0), (-.05, 1.3), (.0, 2.4))):
            pts = []
            for j in range(6):
                f = j / 5; y = EL - .02 - f * (EL - WR + .08)
                a = ph + f * 1.4; r = (.074 if y > WR + .1 else .06) + .006
                pts.append((x + math.sin(a) * r, y, math.cos(a) * r))
            crack(bm, pts, .0045)
        crack(bm, [(x - s * .0, WR - .04, .062), (x, WR - .08, .07), (x + s * .02, WR - .1, .06)], .005)
    hard(f'elbow{n}__burn', seams)

# ==== LEGS: ash thighs under the kilt; burial bands down the shins; bronze greaves; wrapped feet ==================================
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    hard(f'leg{n}__skin', lambda bm, hx=hx: loft(bm, [(.98, hx, -.01, .11, .11), (.72, hx * 1.03, 0, .09, .09), (.47, hx, .01, .066, .066)], 12, cap=True))
    hard(f'knee{n}__skin', lambda bm, hx=hx: loft(bm, [(.5, hx, .01, .068, .068), (.3, hx, 0, .06, .062), (.12, hx, -.006, .048, .05)], 12, cap=False))
    def greave(bm, hx=hx):
        loft(bm, [(.44, hx, .02, .07, .066), (.3, hx, .016, .068, .066), (.17, hx, .008, .058, .056)], 12, cap=False, a0=-1.9, a1=1.9)
        shell(bm, (hx, .47, .035), .06, .06, .052, -.9, .9, -1.3, 1.3, nu=8, nv=4)   # the knee cop
    hard(f'knee{n}__bronze', greave, thick=.007, outward=(hx, .3, -.05))
    def feet(bm, hx=hx):   # wrapped in burial linen, broad
        blob(bm, (hx, .06, .06), .07, (.75, .65, 1.6), 2)
        tube(bm, [(hx, .14, -.01), (hx, .07, .0)], [.055, .06], 10)
        for k in range(3): blob(bm, (hx, .09 + .03 * k, .02 - .01 * k), .062 - .004 * k, (1, .25, 1.05), 1)
    soft(f'knee{n}__cloth', feet, 450, voxel=.008)

# ==== THE CROWN'S AXE (on the weapon bone): a long haft bound in gold, a great bearded crescent, a crowned butt =====================
BX, BY = -SX, WR - .045
Z0, Z1 = -.62, 1.08          # the butt and the head's top along the haft
hard('weapon__leather', lambda bm: tube(bm, [(BX, BY, Z0 + .04), (BX, BY, .3), (BX, BY, Z1)], [.026, .024, .022], 8))
def axe_head(bm):   # a crescent in the plane x = BX: from the haft (v = 0) out to the edge (v = 1) toward -y; thin at the edge
    nu, nv = 10, 5
    def at(u, v):    # u along the head, 0 its foot (the beard) .. 1 its top
        za, zb = .66, 1.06                              # where it meets the haft
        ze0, ze1 = .5, 1.2                              # where the edge runs, the beard hooked down toward the haft
        z = za + (zb - za) * u
        ze = ze0 + (ze1 - ze0) * u
        depth = .27 + .07 * math.sin(u * math.pi)       # how far the edge stands out from the haft
        zz = z + (ze - z) * v ** 1.4
        yy = -(.02 + depth * v) - .05 * math.sin(u * math.pi) * v ** 2
        return yy, zz
    def th(v): return .022 * (1 - v) ** 1.2 + .0025
    grids = []
    for side in (1, -1):
        g = [[bm.verts.new(G(BX + side * th(j / nv), BY + at(i / nu, j / nv)[0], at(i / nu, j / nv)[1])) for j in range(nv + 1)] for i in range(nu + 1)]
        grids.append(g)
    A, B = grids
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((A[i][j], A[i + 1][j], A[i + 1][j + 1], A[i][j + 1]))
            bm.faces.new((B[i][j], B[i][j + 1], B[i + 1][j + 1], B[i + 1][j]))
    for i in range(nu):   # the edge and the haft side
        bm.faces.new((A[i][nv], A[i + 1][nv], B[i + 1][nv], B[i][nv]))
        bm.faces.new((A[i][0], B[i][0], B[i + 1][0], A[i + 1][0]))
    for i in (0, nu):     # the ends
        for j in range(nv): bm.faces.new((A[i][j], A[i][j + 1], B[i][j + 1], B[i][j]))
    tube(bm, [(BX, BY + .02, .88), (BX, BY + .1, .9), (BX, BY + .2, .93)], [.03, .02, .003], 6)   # the back spike
hard('weapon__iron', axe_head, smooth=False)
def fittings(bm):
    for z in (Z0 + .1, -.05, .2, .45, .62):   # gold bands down the haft
        tube(bm, [(BX, BY, z - .018), (BX, BY, z + .018)], [.031, .031], 10)
    tube(bm, [(BX, BY, .64), (BX, BY, 1.08)], [.034, .03], 8)   # the socket through the head
    for k in range(5):   # the crowned butt
        t = k / 5 * math.tau
        tube(bm, [(BX + math.sin(t) * .028, BY + math.cos(t) * .028, Z0 + .03), (BX + math.sin(t) * .036, BY + math.cos(t) * .036, Z0 - .05)], [.01, .002], 4)
    blob(bm, (BX, BY, Z0 + .03), .036, (1, 1, .7), 2)
    tube(bm, [(BX, BY - .03, 1.08), (BX, BY - .03, 1.2)], [.012, .002], 5)   # the top spike
    p = []                                         # the gold inlay along the edge
    for k in range(11):
        u = k / 10; z = .5 + .7 * u; depth = .27 + .07 * math.sin(u * math.pi)
        zz = (.66 + .4 * u) + (z - (.66 + .4 * u)) * .88 ** 1.4; yy = -(.02 + depth * .88) - .05 * math.sin(u * math.pi) * .88 ** 2
        p.append((BX, BY + yy, zz))
    for side in (1, -1): tube(bm, [(x + side * .007, y, z) for x, y, z in p], [.006] * len(p), 4)
hard('weapon__gold', fittings)

result = tally()
