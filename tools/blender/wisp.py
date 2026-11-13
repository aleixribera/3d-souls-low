# The Toll Wisp, the soul of one of the tower's old bell-ringers (STORY.md). One rigid mesh per game bone (js/rig.js skeleton
# at scale 1, MODEL_DEFS.tollWisp), named wisp:<bone>__<material slot>[.n], so every key pose, the walk and the death drive it.
# Rest pose: upright, arms hanging (the model's posture stoops it a little in the game).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest (shoulderX .30, both arms 4% longer): spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0);
# arms at x +-.30, y 1.55, elbows y 1.238, wrists .926. Hips x +-.15, y .90, knees .45.
# Cloth bones (they swing): tasselF (-.055, .97, .19), robeB (0, 1.48, -.18).
# The look (v5.5's brief on MODEL_DEFS.tollWisp, STORY.md's Toll Wisps): a weathered wandering ringer in an enormous
# wide-brimmed felt hat with a slouching hooked crown, a patterned brim border and a rope hatband with tassels; a face lost
# in shadow over a flowing white beard; a chestnut shoulder capelet with a knotted cravat, sage shoulder caps and a buckled
# baldric; wide sleeves with pale X-lacing and gold cuffs over bony hands; a twisted rope girdle with long front tassels, an
# angled belt and a hip satchel; a floor-length dark coat open over a cream-gold brocade robe with a rust-amber stripe and a
# wide hem border, over boots. STORY.md binds each ringer to a small bell of its own: a handbell in the left hand.
# Enemy budget: about 3,000 triangles (no weapon).
import sys, math
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'hat': (0.3, 0.26, 0.23), 'brimTrim': (0.42, 0.37, 0.3), 'beard': (0.85, 0.84, 0.8), 'mantle': (0.48, 0.32, 0.22),
       'epaulette': (0.38, 0.42, 0.3), 'brocade': (0.78, 0.68, 0.48), 'trim': (0.75, 0.5, 0.2), 'coat': (0.24, 0.25, 0.21),
       'rope': (0.7, 0.66, 0.56), 'leather': (0.32, 0.2, 0.12), 'buckle': (0.68, 0.58, 0.38), 'skin': (0.55, 0.52, 0.46),
       'void': (0.04, 0.035, 0.03)}, prefix='wisp:')

SX, EL, WR = .30, 1.238, .926
folds = lambda k, amp: (lambda a, y: amp * math.sin(a * k + y * 9))

# ---- head: the great hat, the shadowed face and the beard ---------------------------------------------------------------
CROWN = [(0, 1.875, -.005), (0, 1.96, -.012), (0, 2.05, -.03), (.006, 2.12, -.07), (.012, 2.16, -.13), (.016, 2.15, -.19), (.02, 2.11, -.23)]
def crown(bm):   # the slouching felt crown, its point hooked back and down
    tube(bm, CROWN, [.138, .126, .102, .074, .05, .03, .012], 10)
hard('head__hat', crown)

BRIM_IN, BRIM_OUT = .13, .31
def brim_at(u, v, lift=0.0):
    a = u * math.tau; r = BRIM_IN + (BRIM_OUT - BRIM_IN) * v
    y = 1.882 - .055 * v ** 1.6 - .028 * v * max(0, math.cos(a)) + .014 * v * math.sin(a * 5 + .4) + lift   # it sags at the front, waves
    return (math.sin(a) * r, y, -.01 + math.cos(a) * r * 1.04)
def brim(bm):
    sheet(bm, 20, 2, brim_at)
hard('head__hat.1', brim)
def brim_band(bm):   # the patterned border round the brim's edge
    sheet(bm, 20, 1, lambda u, v: brim_at(u, .78 + .2 * v, .004))
hard('head__brimTrim', brim_band)

def hatband(bm):   # a twisted pale rope round the crown's base, two tassels hanging at the back on the right
    pts = [(math.sin(a) * .142, 1.9 + .004 * math.sin(a * 3), -.007 + math.cos(a) * .142) for a in [k / 12 * math.tau for k in range(13)]]
    tube(bm, pts, [.011] * 13, 4)
    for dx, ln in ((-.09, .11), (-.06, .14)):
        tube(bm, [(dx, 1.895, -.11), (dx - .01, 1.86 - ln * .4, -.13), (dx - .012, 1.86 - ln, -.13)], [.008, .007, .016], 4)
hard('head__rope', hatband)

def face(bm):   # the face under the brim, lost in shadow
    blob(bm, (0, 1.79, .0), .094, (.95, 1.08, 1.0), 2)
    blob(bm, (0, 1.735, .035), .055, (1.05, .8, 1.0), 1)
soft('head__void', face, 70, voxel=.01)
def nose(bm):   # a long bony nose catching the light out of the shadow
    tube(bm, [(0, 1.81, .085), (0, 1.785, .108), (0, 1.768, .112)], [.013, .015, .011], 5)
hard('head__skin', nose)

def beard(bm):   # a flowing white beard from the cheeks over the throat, down onto the chest
    loft(bm, [(1.78, 0, .06, .075, .04), (1.73, 0, .085, .085, .05), (1.66, 0, .1, .078, .05), (1.58, 0, .12, .062, .045),
              (1.5, 0, .135, .045, .035), (1.44, 0, .14, .025, .022)], 10)
    for s in (-1, 1): blob(bm, (s * .03, 1.755, .1), .03, (1.3, .55, .8), 1)   # the moustache
strands = lambda g: -.008 * abs(math.sin(g.x * 120 + g.y * 8))
soft('head__beard', beard, 150, voxel=.007, after=strands)

hard('neck__void', lambda bm: loft(bm, [(1.72, 0, -.01, .05, .05), (1.6, 0, -.015, .06, .056)], 7))

# ---- chest: the coat's body, the brocade front, the capelet, cravat, shoulder caps and baldric -----------------------------
TORSO = [(1.0, 0, 0, .17, .12), (1.12, 0, .004, .168, .118), (1.28, 0, .012, .18, .13), (1.42, 0, .008, .19, .13),
         (1.51, 0, -.004, .18, .12), (1.57, 0, -.012, .14, .1), (1.61, 0, -.015, .09, .082)]
def torso_at(y):
    rows = sorted(TORSO)
    for (y0, _, c0, x0, z0), (y1, _, c1, x1, z1) in zip(rows, rows[1:]):
        if y0 <= y <= y1:
            k = (y - y0) / (y1 - y0); return (c0 + (c1 - c0) * k, x0 + (x1 - x0) * k, z0 + (z1 - z0) * k)
    return rows[0][2:] if y < rows[0][0] else rows[-1][2:]
def surface(a, y, out=0.0):
    cz, rx, rz = torso_at(y)
    return (math.sin(a) * (rx + out), y, cz + math.cos(a) * (rz + out))
def coat_body(bm):
    loft(bm, TORSO, 12)
    for s in (-1, 1): blob(bm, (s * .2, 1.5, -.005), .07, (1.15, .75, 1), 1)
soft('chest__coat', coat_body, 200)

def front(bm):   # the brocade robe showing where the coat stands open
    sheet(bm, 3, 3, lambda u, v: surface(-.5 + u, 1.5 - .5 * v, .006))
hard('chest__brocade', front)
def stripe(bm):   # the rust-amber stripe down its middle and the coat's gold-edged lapels
    sheet(bm, 1, 3, lambda u, v: surface(-.09 + .18 * u, 1.46 - .46 * v, .011))
    for s in (-1, 1):
        sheet(bm, 1, 3, lambda u, v, s=s: surface(s * (.5 + .08 * u), 1.52 - .52 * v, .008))
hard('chest__trim', stripe)

def capelet(bm):   # a chestnut shoulder capelet from the collar to the upper arms, in loose folds
    def at(u, v):
        a = .28 + (math.tau - .56) * u
        e = 1.3 - 1.45 * v
        r = 1.0 + .05 * math.sin(u * math.tau * 7 + .6) * v
        x = math.sin(a) * math.cos(e) * .41 * r; z = -.012 + math.cos(a) * math.cos(e) * .2 * r
        return (x, 1.43 + math.sin(e) * .25 - .03 * max(0, math.cos(a)) * v, z)
    sheet(bm, 18, 4, at, ragged=.03, seed=6)
hard('chest__mantle', capelet)
def cravat(bm):   # the knotted cloth cravat at the throat, two short ends hanging
    blob(bm, (0, 1.6, .105), .036, (1.2, .9, .8), 1)
    for s in (-1, 1):
        tube(bm, [(s * .012, 1.585, .125), (s * .03, 1.52, .14), (s * .036, 1.46, .145)], [.02, .022, .018], 5)
hard('chest__mantle.1', cravat)

def caps(bm):   # sage shoulder caps over the capelet
    for s in (-1, 1):
        shell(bm, (s * .27, 1.5, -.005), .1, .075, .1, .15, 1.45, s * .2, s * 2.9, nu=6, nv=3,
              warp=lambda p, a, e: (p.x, p.y + .015 * math.sin(a * 6), p.z))
hard('chest__epaulette', caps)

def baldric(bm):   # a leather strap from the right shoulder across the chest to the left hip, and down the back
    for side in (1, -1):
        rows = []
        for w in (.024, -.024):
            r = []
            for k in range(7):
                t = k / 6; y = 1.53 - .5 * t + w
                a = (-.62 + 1.24 * t) if side > 0 else math.pi + (-.62 + 1.24 * t)
                r.append(bm.verts.new(G(*surface(a, y, .03 + .01 * math.sin(t * math.pi)))))
            rows.append(r)
        bridge(bm, rows, closed=False)
hard('chest__leather', baldric, thick=.006)
def buckle(bm):
    p = surface(-.05, 1.29, .048)
    loft(bm, [(p[1] + .022, p[0], p[2], .02, .006), (p[1] - .022, p[0], p[2], .02, .006)], 6)
hard('chest__buckle', buckle)

# ---- spin: the robe at the hips, the rope girdle, the angled belt and a satchel --------------------------------------------
def hips(bm):
    loft(bm, [(1.06, 0, 0, .17, .122), (.98, 0, 0, .19, .135), (.9, 0, -.005, .2, .145), (.84, 0, -.005, .2, .148)], 10)
soft('spin__coat', hips, 90)
hard('spin__brocade', lambda bm: sheet(bm, 2, 2, lambda u, v: (math.sin(-.5 + u) * (.195 + .012 * v), 1.0 - .16 * v, math.cos(-.5 + u) * (.137 + .012 * v) + .004)))
hard('spin__trim', lambda bm: sheet(bm, 1, 2, lambda u, v: (math.sin(-.09 + .18 * u) * .2, 1.0 - .16 * v, math.cos(-.09 + .18 * u) * .147 + .006)))

def girdle(bm):   # two twisted strands of pale rope wound round the waist
    for k, y in enumerate((1.005, .98)):
        loft(bm, [(y + .013, 0, 0, .19, .14), (y, 0, 0, .2, .148), (y - .013, 0, 0, .19, .14)], 16, cap=False,
             push=lambda a, yy, k=k: .03 * math.sin(a * 16 + k * 1.6 + yy * 200))
hard('spin__rope', girdle)
def belt(bm):   # an angled leather belt, high on the right hip, low on the left
    rows = []
    for w in (.02, -.02):
        rows.append(ring(bm, 0, 0, 0, .205, .152, 14, push=None))
    for r, w in zip(rows, (.02, -.02)):
        for v in r:
            g = Vector((v.co.x, v.co.z, -v.co.y)); g.y = .955 - .045 * (g.x / .205) + w
            v.co = G(*g)
    bridge(bm, rows, closed=True)
hard('spin__leather', belt, thick=.008)
def satchel(bm):   # a worn satchel on the left hip
    loft(bm, [(.92, .2, .02, .05, .03), (.86, .215, .02, .062, .036), (.79, .215, .02, .056, .033)], 7)
    blob(bm, (.2, .915, .035), .05, (1.15, .45, .8), 1)
soft('spin__leather.1', satchel, 50, voxel=.008)
hard('spin__buckle', lambda bm: loft(bm, [(.97, -.06, .156, .018, .005), (.94, -.06, .156, .018, .005)], 6))

# ---- tasselF: the long rope tassels hanging from the girdle's knot ----------------------------------------------------------
def tassels(bm):   # positions relative to nothing: game space at rest, the knot at (-.055, .97, .19)
    blob(bm, (-.055, .975, .165), .03, (1.1, .9, .8), 1)
    for dx, ln in ((-.02, .36), (.018, .42)):
        x = -.055 + dx
        tube(bm, [(x, .965, .17), (x + .005, .82, .19), (x, .97 - ln, .2), (x, .97 - ln - .07, .2)], [.009, .009, .016, .006], 5)
hard('tasselF__rope', tassels)

# ---- legs: the floor-length robe, split down the middle; each half swings with its leg -------------------------------------
HEM = .07
def robe_at(a, v, out=0.0, s=1):
    """A point of one half of the robe: angle a (0 = front, pi/2 the left side), v = 0 at the waist .. 1 at the hem."""
    y = .93 - (.93 - HEM) * v
    rx = .2 + .085 * v ** 1.2 + out; rz = .148 + .08 * v ** 1.2 + out
    f = 1 + .045 * math.sin(a * 9 + 1.3) * v                # folds deepen toward the hem
    return (math.sin(a) * rx * f, y, -.005 + math.cos(a) * rz * f)
for s, n in ((1, 'L'), (-1, 'R')):
    def coat(bm, s=s):   # the dark outer coat: the side and the back, open in front
        sheet(bm, 6, 4, lambda u, v: robe_at(s * (.55 + (math.pi - .57) * u), v, .012), ragged=.025, seed=3 + s)
    hard(f'leg{n}__coat', coat)
    def robe(bm, s=s):   # the brocade robe in front
        sheet(bm, 4, 4, lambda u, v: robe_at(s * (.02 + .7 * u), v))
    hard(f'leg{n}__brocade', robe)
    def border(bm, s=s):   # the wide embroidered border at the hem, and the half of the stripe
        sheet(bm, 4, 1, lambda u, v: robe_at(s * (.02 + .7 * u), .84 + .15 * v, .004))
        sheet(bm, 1, 3, lambda u, v: robe_at(s * (.02 + .07 * u), .84 * v, .004))
    hard(f'leg{n}__trim', border)
    hx = s * .15
    def boot(bm, hx=hx):   # a brown boot, its toe out under the hem
        loft(bm, [(.2, hx, .0, .052, .055), (.1, hx, .01, .052, .07), (.04, hx, .05, .052, .1), (.0, hx, .055, .05, .11)], 8)
        blob(bm, (hx, .035, .13), .042, (1.0, .75, 1.1), 1)
    soft(f'knee{n}__leather', boot, 56, voxel=.008)

# ---- robeB: the coat's back drapery, falling from between the shoulders ----------------------------------------------------
def drape(bm):   # a fold of the coat's back under the capelet, down to the girdle, hugging the body
    sheet(bm, 6, 2, lambda u, v: ((u - .5) * (.3 + .08 * v), 1.36 - .4 * v,
                                  -.142 - .016 * v - (.006 + .01 * v) * math.cos((u - .5) * math.pi * 4) + .22 * (u - .5) ** 2),
          ragged=.04, seed=7)
hard('robeB__coat', drape)

# ---- arms: wide brown sleeves with X-lacing, gold cuffs, bony hands; the bell in the left --------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    def upper(bm, x=x, s=s):
        loft(bm, [(1.55, x - s * .01, 0, .066, .068), (1.42, x + s * .004, 0, .07, .072), (1.32, x + s * .006, .002, .072, .074),
                  (EL + .01, x + s * .004, .002, .076, .078)], 8, push=folds(5, .05))
    hard(f'arm{n}__mantle', upper)
    def lacing(bm, x=x, s=s):   # pale cord crossed in Xs down the sleeve's outer side
        ox = x + s * .074
        for k in range(3):
            y0 = 1.48 - k * .075; y1 = y0 - .06
            tube(bm, [(ox, y0, .02), (ox + s * .004, y1, -.02)], [.005, .005], 3)
            tube(bm, [(ox, y0, -.02), (ox + s * .004, y1, .02)], [.005, .005], 3)
    hard(f'arm{n}__rope', lacing)
    def fore(bm, x=x, s=s):   # the sleeve flares toward the wrist, open at the end
        loft(bm, [(EL + .03, x + s * .004, .002, .074, .076), (EL - .12, x + s * .008, .01, .085, .088),
                  (WR + .04, x + s * .012, .016, .11, .108)], 9, cap=False, push=folds(6, .06))
    hard(f'elbow{n}__mantle', fore)
    def cuff(bm, x=x, s=s):
        loft(bm, [(WR + .1, x + s * .011, .015, .105, .104), (WR + .04, x + s * .012, .016, .114, .112)], 9, cap=False,
             push=folds(6, .06))
    hard(f'elbow{n}__trim', cuff)
    hard(f'elbow{n}__void', lambda bm, x=x, s=s: loft(bm, [(WR + .05, x + s * .012, .016, .1, .098), (WR + .045, x + s * .012, .016, .1, .098)], 8))
    def hand(bm, x=x, s=s):   # a bony hand, long fingers half curled
        loft(bm, [(WR + .06, x, .012, .03, .032), (WR - .005, x, .012, .028, .03)], 6)
        blob(bm, (x + s * .01, WR - .03, .012), .036, (.6, 1.15, 1.05), 1)                     # the palm
        curl = .03 if s > 0 else .012
        for zf in (-.022, -.008, .006, .02):
            tube(bm, [(x + s * .016, WR - .058, .012 + zf), (x + s * .014, WR - .1, .012 + zf * 1.1), (x - s * curl * .3, WR - .125, .012 + zf)],
                 [.008, .007, .006], 4)
        tube(bm, [(x + s * .004, WR - .02, .045), (x - s * .01, WR - .045, .056), (x - s * .02, WR - .068, .05)], [.009, .008, .006], 4)
    soft(f'elbow{n}__skin', hand, 100, voxel=.005)

# the handbell: a wooden-handled bell held mouth down in the left hand, its clapper showing
HB = Vector((SX + .002, WR - .085, .012))
def bell(bm):
    loft(bm, [(HB.y - .03, HB.x, HB.z, .016, .016), (HB.y - .045, HB.x, HB.z, .03, .03), (HB.y - .08, HB.x, HB.z, .038, .038),
              (HB.y - .11, HB.x, HB.z, .052, .052), (HB.y - .118, HB.x, HB.z, .056, .056)], 10, cap=False)
    blob(bm, (HB.x, HB.y - .03, HB.z), .018, (1, .5, 1), 1)
hard('elbowL__buckle', bell)
def handle(bm):
    tube(bm, [(HB.x, HB.y + .03, HB.z), (HB.x, HB.y - .03, HB.z)], [.012, .014], 6)
    blob(bm, (HB.x, HB.y + .035, HB.z), .016, (1, .8, 1), 1)
hard('elbowL__leather', handle)
hard('elbowL__void.1', lambda bm: blob(bm, (HB.x, HB.y - .12, HB.z), .014, (1, 1, 1), 1))   # the clapper

result = tally()
