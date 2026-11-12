# The Pale Duelist, the Hollowed fencer: a gaunt fallen noble. One rigid mesh per game bone (js/rig.js skeleton at scale 1,
# MODEL_DEFS.paleDuelist), named duelist:<bone>__<material slot>[.n], so every key pose, the walk and the death drive it.
# Rest pose: upright, arms hanging (the model's posture bends the elbows in the game).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.28, y 1.55;
# the left arm is 5% longer (elbow y 1.235, wrist .92), the right elbow y 1.25, wrist .95. The rapier's grip runs along z
# through the right wrist, the kit dagger's along z through the left. Hips x +-.15, y .90, knees .45.
# Cloth bones (they swing): loinF (.02, .93, .12), loinB (-.03, .93, -.12), loinS (.19, .93, 0), capeA (.1, 1.53, -.15),
# capeB (.1, 1.11, -.15).
# The look (the model's brief): upright and thin, a plumed cap, rapier and dagger. A pale gaunt face under a crimson beret
# with a white feather, a pleated ruff, a pale linen doublet with gilt buttons, puffed and slashed crimson sleeves and
# trunk hose, a crimson half cape over the left shoulder, grey gauntlet gloves, pale hose and tall turned-down boots.
# Enemy budget: about 3,000 triangles with the rapier and the dagger, which the kit still builds.
import sys, math
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'skin': (0.72, 0.69, 0.63), 'cloth': (0.78, 0.75, 0.68), 'plume': (0.4, 0.06, 0.08), 'trim': (0.7, 0.58, 0.32),
       'leather': (0.3, 0.32, 0.31)}, prefix='duelist:')

SX = .28
ARMS = ((1, 'L', 1.235, .92), (-1, 'R', 1.25, .95))
EYE_Y, EYE_Z = 1.785, .1   # MODEL_DEFS.paleDuelist.eyes glow here
def panes(n, depth):   # a puffed, slashed garment: the cloth bulges between n seams
    return lambda a, y: depth * math.cos(a * n)

# ---- head: a gaunt face, sunken cheeks and deep sockets, under a crimson beret with a white feather ---------------------
def face(bm):
    blob(bm, (0, 1.8, -.012), .1, (.86, 1.06, 1.0), 2)              # the skull
    blob(bm, (0, 1.735, .04), .052, (.82, 1.25, .9), 2)              # the long narrow jaw
    blob(bm, (0, 1.69, .07), .02, (1.0, 1.1, 1.0), 1)               # the pointed chin
    tube(bm, [(0, 1.8, .092), (0, 1.777, .104), (0, 1.762, .105)], [.009, .011, .008], 5)   # the long nose
    for s in (-1, 1):
        blob(bm, (s * .046, 1.77, .068), .022, (1.0, .8, .9), 1)    # the cheekbones
        blob(bm, (s * .09, 1.78, -.01), .02, (.5, 1.2, .8), 1)      # the ears
def gaunt(g):
    d = 0.0
    for s in (-1, 1):
        d -= .013 * max(0, 1 - ((g.x - s * .041) ** 2 + (g.y - EYE_Y) ** 2 * 1.6) / .022 ** 2) * (g.z > .03)   # the sockets
        d -= .009 * max(0, 1 - ((g.x - s * .048) ** 2 + (g.y - 1.738) ** 2) / .026 ** 2) * (g.z > 0)          # the hollow cheeks
    return d
soft('head__skin', face, 180, voxel=.005, after=gaunt)

def beret(bm):   # a soft crown slouched over the left, a narrow brim
    blob(bm, (.018, 1.912, -.012), .112, (1.05, .42, 1.02), 2)
    blob(bm, (.0, 1.884, -.006), .128, (1.0, .14, 1.0), 2)
soft('head__plume', beret, 120, voxel=.006)

def feather(bm):   # a long white plume sweeping back from the left of the cap, its tip curling down
    n = 7; top, bot = [], []
    for i in range(n + 1):
        t = i / n
        c = Vector((.1 + .03 * t, 1.92 + .14 * t - .1 * t * t, .04 - .34 * t))
        w = .05 * math.sin(math.pi * min(1, t * 1.1 + .05))
        top.append(bm.verts.new(G(c.x + .01, c.y + w, c.z))); bot.append(bm.verts.new(G(c.x - .01, c.y - w * .6, c.z)))
    for i in range(n): bm.faces.new((top[i], top[i + 1], bot[i + 1], bot[i]))
hard('head__cloth', feather)   # the cloth is double-sided

# ---- neck: thin, wrapped in a pleated millstone ruff ---------------------------------------------------------------------------
hard('neck__skin', lambda bm: loft(bm, [(1.72, 0, .0, .045, .05), (1.6, 0, -.01, .055, .055)], 8))
hard('neck__cloth', lambda bm: loft(bm, [(1.692, 0, .0, .058, .058), (1.68, 0, .0, .122, .118), (1.646, 0, -.003, .122, .118), (1.632, 0, -.004, .062, .06)],
                                     24, cap=False, push=lambda a, y: .17 * math.cos(a * 12) * (y > 1.64 and y < 1.685)))   # thick and pleated

# ---- chest: the fitted doublet, a peascod front and gilt buttons ---------------------------------------------------------------
TORSO = [(1.04, 0, .0, .15, .102), (1.12, 0, .006, .145, .1), (1.26, 0, .018, .168, .12), (1.4, 0, .008, .186, .12),
         (1.5, 0, -.004, .18, .114), (1.575, 0, -.012, .135, .092), (1.62, 0, -.014, .08, .072)]
def peascod(a, y): return .1 * max(0.0, math.cos(a)) ** 6 * max(0, 1 - abs(y - 1.2) / .17)   # the doublet's padded belly point
def torso_at(y):
    rows = sorted(TORSO)
    for (y0, _, c0, x0, z0), (y1, _, c1, x1, z1) in zip(rows, rows[1:]):
        if y0 <= y <= y1:
            k = (y - y0) / (y1 - y0); return (c0 + (c1 - c0) * k, x0 + (x1 - x0) * k, z0 + (z1 - z0) * k)
    return rows[0][2:] if y < rows[0][0] else rows[-1][2:]
hard('chest__cloth', lambda bm: loft(bm, TORSO, 14, push=peascod))

def buttons(bm):   # gilt buttons down the front, a gilt band at the waist
    for k in range(7):
        y = 1.52 - k * .065; cz, rx, rz = torso_at(y); z = cz + rz * (1 + peascod(0, y)) + .006
        loft(bm, [(y + .008, 0, z, .008, .006), (y - .008, 0, z, .008, .006)], 4)
    loft(bm, [(1.065, 0, .002, .156, .106), (1.035, 0, .0, .153, .104)], 12, cap=False, push=lambda a, y: .04 * max(0, math.cos(a)) ** 4)
hard('chest__trim', buttons)

def baldric(bm):   # a crimson sword belt from the right shoulder across the chest to the left hip
    rows = []
    for dy in (.026, -.026):
        r = []
        for k in range(12):
            a = k / 12 * math.tau; y = 1.3 - .19 * math.sin(a) + dy
            cz, rx, rz = torso_at(y); f = 1 + peascod(a, y)
            r.append(bm.verts.new(G(math.sin(a) * (rx + .012), y, cz + math.cos(a) * (rz * f + .012))))
        rows.append(r)
    bridge(bm, rows)
hard('chest__plume', baldric, thick=.005)

# ---- spin: paned trunk hose, the doublet's short skirt, the belt and its gilt buckle, a crimson sash knotted at the hip -----
hard('spin__plume', lambda bm: loft(bm, [(1.02, 0, .0, .15, .105), (.95, 0, .0, .2, .145), (.875, 0, -.005, .2, .145), (.81, 0, -.005, .158, .112)],
                                     14, cap=False, push=lambda a, y: .12 * math.cos(a * 7) * (y < 1.0 and y > .82)))
def skirt(u, v):   # the doublet's short skirt of tabs round the waist
    a = u * math.tau; return (math.sin(a) * (.156 + .05 * v), 1.05 - .1 * v, math.cos(a) * (.108 + .05 * v))
hard('spin__cloth', lambda bm: sheet(bm, 14, 1, skirt, ragged=.05, seed=6))   # double-sided cloth
hard('spin__leather', lambda bm: loft(bm, [(1.045, 0, .002, .162, .112), (1.015, 0, .002, .164, .114)], 10, cap=False), thick=.008)
hard('spin__trim', lambda bm: loft(bm, [(1.048, 0, .122, .022, .006), (1.012, 0, .122, .022, .006)], 4))

# the doublet's tails front and back and the sash end at the left hip, on their swinging bones
def tail(bm, x, z, w, ln, seed):
    sheet(bm, 2, 3, lambda u, v: (x + (u - .5) * w * (1 - .25 * v), .97 - ln * v, z + math.copysign(.03 + .03 * v, z)), ragged=.04, seed=seed)
hard('loinF__cloth', lambda bm: tail(bm, .02, .12, .12, .16, 2))
hard('loinB__cloth', lambda bm: tail(bm, -.03, -.13, .2, .36, 5))
hard('loinS__plume', lambda bm: sheet(bm, 1, 3, lambda u, v: (.215 + .015 * v, 1.0 - .46 * v, (u - .5) * (.07 - .015 * v)), ragged=.05, seed=8))

# ---- the half cape over the left shoulder, in two swinging pieces ------------------------------------------------------------
def cape_at(u, v):   # u across (0 the right of the back, 1 over the left shoulder), v = 0 the shoulder .. 1 the hem
    x = -.12 + .46 * u + .04 * v
    y = 1.6 - .06 * u * u - .95 * v
    over = max(0, u - .55) / .45                                        # the part draped over the shoulder comes forward
    z = -.142 - .05 * v + .12 * over * max(0, 1 - v * 3) - .03 * math.sin(math.pi * u) * v
    z += .028 * math.sin(u * math.tau * 2.5 + .6) * min(1, v * 2.2)        # the cloth falls in folds
    return (x, y, z)
hard('capeA__plume', lambda bm: sheet(bm, 10, 3, lambda u, v: cape_at(u, v * .47)))
hard('capeB__plume', lambda bm: sheet(bm, 10, 3, lambda u, v: cape_at(u, .47 + v * .53), ragged=.07, seed=4))

# ---- arms: puffed slashed sleeve caps, fitted linen sleeves, grey gauntlet gloves round the grips ----------------------------
for s, n, el, wr in ARMS:
    x = s * SX
    hard(f'arm{n}__plume', lambda bm, x=x, s=s: loft(bm, [(1.61, x - s * .012, 0, .05, .055), (1.555, x, 0, .074, .076), (1.47, x, 0, .072, .074),
                                                         (1.415, x, 0, .046, .048)], 12, cap=False, push=lambda a, y: .22 * math.cos(a * 6) * (y < 1.6 and y > 1.42)))
    soft(f'arm{n}__cloth', lambda bm, x=x, s=s, el=el: loft(bm, [(1.5, x, 0, .044, .046), (1.38, x, 0, .042, .043), (el + .04, x, 0, .037, .038),
                                                                (el, x, 0, .036, .036)], 8), 60, voxel=.008)
    def fore(bm, x=x, el=el, wr=wr):
        loft(bm, [(el + .03, x, 0, .036, .036), (el - .05, x, .004, .042, .044), (wr + .08, x, .004, .032, .034)], 8)
        blob(bm, (x, el, 0), .037, (1, 1, 1), 1)
    soft(f'elbow{n}__cloth', fore, 50, voxel=.008)
    hard(f'elbow{n}__leather.1', lambda bm, x=x, wr=wr: loft(bm, [(wr + .115, x, .004, .058, .06), (wr + .025, x, 0, .036, .038)], 8, cap=False), thick=.006)   # the flared cuff
    def glove(bm, x=x, s=s, wr=wr):   # the fist closed round a grip along z through the wrist
        loft(bm, [(wr + .04, x, 0, .034, .036), (wr, x + s * .006, 0, .036, .04)], 6)
        blob(bm, (x + s * .014, wr - .008, 0), .04, (.64, 1.15, 1.15), 1)
        for zf in (-.024, -.008, .008, .024):
            tube(bm, [(x + s * .022, wr - .018, zf), (x + s * .015, wr - .05, zf * 1.1), (x - s * .016, wr - .053, zf * 1.1), (x - s * .028, wr - .024, zf)],
                 [.01, .009, .008, .0075], 5)
        tube(bm, [(x + s * .011, wr - .005, .035), (x - s * .009, wr - .001, .043), (x - s * .027, wr - .008, .039)], [.01, .009, .0075], 5)   # the thumb
    soft(f'elbow{n}__leather', glove, 70, voxel=.0048)

# ---- legs: pale hose, tall boots with turned-down cuffs and a gilt strap at the ankle -----------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    soft(f'leg{n}__cloth', lambda bm, hx=hx: loft(bm, [(.98, hx * .8, -.008, .074, .076), (.84, hx, 0, .07, .072), (.62, hx, .008, .056, .058),
                                                     (.46, hx, .008, .048, .05)], 8), 60, voxel=.01)
    def boot(bm, hx=hx):
        loft(bm, [(.52, hx, 0, .05, .052), (.36, hx, -.004, .054, .057), (.2, hx, -.002, .043, .046), (.09, hx, 0, .046, .052)], 8)   # the shaft
        loft(bm, [(.12, hx, .025, .044, .08), (.065, hx, .07, .044, .12), (.02, hx, .08, .045, .13)], 8)                              # the foot
        blob(bm, (hx, .032, .19), .03, (1.0, .78, 1.6), 1)                                                                            # the long toe
        blob(bm, (hx, .04, -.04), .04, (1, 1.0, 1), 1)                                                                                # the heel
    soft(f'knee{n}__leather', boot, 100, voxel=.007)
    hard(f'knee{n}__leather.1', lambda bm, hx=hx: loft(bm, [(.585, hx, .004, .07, .072), (.5, hx, 0, .055, .057)], 10, cap=False), thick=.006)   # the cuff
    hard(f'knee{n}__trim', lambda bm, hx=hx: loft(bm, [(.135, hx, .0, .049, .053), (.11, hx, .002, .05, .055)], 8, cap=False), thick=.005)

result = tally()
