# The Rogue, the Hollowed cutthroat. One rigid mesh per game bone (js/rig.js skeleton at scale 1, MODEL_DEFS.rogue),
# named rogue:<bone>__<material slot>, so every key pose, the walk and the death drive it. Rest pose: upright, arms
# hanging (the model's posture hunches it hard in the game).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.31, y 1.55;
# the left arm is 8% longer (elbow y 1.226, wrist .902), the right elbow y 1.25, wrist .95. The scimitar's grip runs along
# z through the right wrist, the kit dagger's along z through the left. Hips x +-.15, y .90, knees .45.
# Cloth bones (they swing): loinF (.02, .93, .12), loinB (-.03, .93, -.12), hoodTail (0, 1.66, -.1).
# The look (v5.5's brief): a deep charcoal hood over a black face wrap with a dim slit for the eyes, layered belted leather
# over blue-black scale, a leather pauldron on the sword arm, studded bracers, blackened steel greaves and knee cops.
# Enemy budget: about 3,000 triangles with the scimitar and the dagger, which the kit still builds.
import sys, math
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'scales': (0.12, 0.14, 0.19), 'leather': (0.3, 0.23, 0.16), 'hood': (0.17, 0.17, 0.18), 'mask': (0.08, 0.08, 0.085),
       'steel': (0.33, 0.34, 0.36), 'strap': (0.22, 0.16, 0.11)}, prefix='rogue:')

SX = .31
ARMS = ((1, 'L', 1.226, .902), (-1, 'R', 1.25, .95))
EYE_Y = 1.785
scale_rows = lambda g: .004 * abs(math.sin(g.y * 70 + .5 * math.sin(g.x * 60)))   # the overlapping rows of scale

# ---- head: a black face wrap, a slit for the eyes, a deep hood -----------------------------------------------------------
def wrap(bm):
    blob(bm, (0, 1.795, -.005), .098, (.95, 1.08, 1.04), 2)        # the head
    blob(bm, (0, 1.735, .035), .06, (1.1, .75, 1.0), 2)             # the wrapped jaw
def slit(g):   # the gap in the wrap where the eyes show
    if g.z < .03: return 0
    return -.014 * max(0, 1 - abs(g.y - EYE_Y) / .014) * max(0, 1 - abs(g.x) / .075)
soft('head__mask', wrap, 140, voxel=.006, after=slit)

def hood(bm):   # a loose sheet round the head, open over the face, the brow overhanging, a cowl lying on the shoulders
    c = (0, 1.805, -.025)
    def at(u, v):
        fold = 1 + .06 * math.sin(u * math.tau * 4 + 1.3) * min(1, v * 2)        # the cloth falls in folds
        if v <= .66:
            e = 1.5 - (v / .66) * 2.2
            op = .72 + .2 * max(0, -math.sin(e))
            a = op + (math.tau - 2 * op) * u
            x = math.sin(a) * math.cos(e) * .148 * fold; y = c[1] + math.sin(e) * .165; z = c[2] + math.cos(a) * math.cos(e) * .162 * fold
            z += .07 * max(0, math.cos(a)) ** 2 * max(0, math.sin(e) + .3)    # the brow hangs forward over the slit
            y += .02 * max(0, -math.cos(a)) * max(0, math.sin(e))               # the crown drawn back into a soft point
            return (x, y, z - .03 * max(0, -math.cos(a)) * max(0, math.sin(e)) ** 2)
        k = (v - .66) / .34
        op = 1.0 - .45 * k
        a = op + (math.tau - 2 * op) * u
        return (math.sin(a) * (.15 + .085 * k) * fold, 1.69 - .17 * k, -.03 + math.cos(a) * (.15 + .025 * k) * fold)
    sheet(bm, 14, 6, at, ragged=.035, seed=5)
hard('head__hood', hood)   # the hood cloth is double-sided

# the hood's tail down the back, on its own swinging bone
hard('hoodTail__hood', lambda bm: sheet(bm, 3, 3, lambda u, v: ((u - .5) * (.2 - .1 * v), 1.7 - .32 * v, -.15 - .035 * v - .02 * math.sin(u * math.pi)),
                                         ragged=.05, seed=8))

hard('neck__mask', lambda bm: loft(bm, [(1.72, 0, .0, .058, .058), (1.6, 0, -.01, .07, .066)], 8))

# ---- chest: scale under a leather jerkin, two belts across, a collar ---------------------------------------------------
TORSO = [(1.0, 0, 0, .165, .115), (1.12, 0, .005, .162, .112), (1.28, 0, .015, .185, .132), (1.42, 0, .01, .2, .132),
         (1.51, 0, -.004, .192, .122), (1.57, 0, -.012, .15, .1), (1.61, 0, -.015, .095, .085)]
def torso_at(y):
    rows = sorted(TORSO)
    for (y0, _, c0, x0, z0), (y1, _, c1, x1, z1) in zip(rows, rows[1:]):
        if y0 <= y <= y1:
            k = (y - y0) / (y1 - y0); return (c0 + (c1 - c0) * k, x0 + (x1 - x0) * k, z0 + (z1 - z0) * k)
    return rows[0][2:] if y < rows[0][0] else rows[-1][2:]
def torso(bm):
    loft(bm, TORSO, 12)
    for s in (-1, 1): blob(bm, (s * .21, 1.5, -.005), .075, (1.15, .75, 1), 1)   # the shoulders
soft('chest__scales', torso, 200, after=scale_rows)

def jerkin(bm):   # a leather vest over the scale: open down the front, flaring a little at the hem
    def at(u, v):
        op = .2 + .05 * v
        a = op + (math.tau - 2 * op) * u
        y = 1.57 - .5 * v; cz, rx, rz = torso_at(y)
        sh = max(0, 1 - v * 4) * .03
        return (math.sin(a) * (rx + .012 + sh), y, cz + math.cos(a) * (rz + .012 + .3 * sh))
    sheet(bm, 8, 3, at)
    loft(bm, [(1.6, 0, -.015, .11, .095), (1.67, 0, -.022, .104, .094)], 8, cap=False)   # the collar
hard('chest__leather', jerkin, thick=.008)

def straps(bm):   # two belts round the chest, tilted, buckled on the front
    for (y, tilt) in ((1.2, .05), (1.33, -.045)):
        rows = []
        for dy in (.016, -.016):
            r = []
            for k in range(8):
                a = k / 8 * math.tau; yy = y + dy + tilt * math.sin(a)
                cz, rx, rz = torso_at(yy)
                r.append(bm.verts.new(G(math.sin(a) * (rx + .024), yy, cz + math.cos(a) * (rz + .024))))
            rows.append(r)
        bridge(bm, rows)
hard('chest__strap', straps, thick=.006)

def buckles(bm):
    for (y, x) in ((1.2, .05), (1.33, -.06)):
        cz, rx, rz = torso_at(y); z = cz + rz * math.sqrt(max(0, 1 - (x / rx) ** 2)) + .03
        loft(bm, [(y + .022, x, z, .02, .006), (y - .022, x, z, .02, .006)], 4, cap=True)
hard('chest__steel', buckles)

# ---- spin: scale over the hips, the belt and pouch, the jerkin's back skirt -------------------------------------------------
def seat(bm):
    loft(bm, [(1.06, 0, 0, .16, .11), (.98, 0, 0, .172, .118), (.9, 0, -.01, .175, .12), (.83, 0, -.005, .155, .11)], 10)
    for s in (-1, 1): blob(bm, (s * .09, .86, -.02), .09, (1, .9, 1), 1)
soft('spin__scales', seat, 90, after=scale_rows)

def skirt(a, v, out=0.0):   # a point of the jerkin's skirt: angle a around the body (0 = front), v = 0 belt .. 1 hem
    return (math.sin(a) * (.19 + out + .06 * v), 1.04 - .3 * v, -.005 + math.cos(a) * (.13 + out + .05 * v))
def belt_and_skirt(bm):
    sheet(bm, 6, 2, lambda u, v: skirt(math.pi * (.5 + 1.0 * u), v), ragged=.03, seed=3)
    loft(bm, [(1.07, 0, 0, .19, .133), (1.025, 0, 0, .19, .133)], 10, cap=False)   # the belt
hard('spin__leather', belt_and_skirt, thick=.01)

def pouch(bm):   # a pouch on the left hip, its buckle a steel stud
    loft(bm, [(1.03, .19, .06, .045, .035), (.97, .2, .06, .055, .04), (.91, .2, .06, .05, .036)], 6)
    blob(bm, (.19, 1.025, .072), .042, (1.2, .5, .9), 1)
soft('spin__strap', pouch, 50, voxel=.008)

# the long leather flaps, front and back, on their swinging bones
def flap(bm, x, z, w, ln, seed):
    sheet(bm, 2, 3, lambda u, v: (x + (u - .5) * w * (1 - .2 * v), 1.0 - ln * v, z + math.copysign(.012 + .03 * v, z)), ragged=.06, seed=seed)
hard('loinF__leather', lambda bm: flap(bm, .02, .14, .17, .42, 3), thick=.006)
hard('loinB__leather', lambda bm: flap(bm, -.03, -.14, .2, .48, 7), thick=.006)

# ---- arms: scale sleeves, a leather pauldron on the sword arm, bracers, gloves round the grips ---------------------------
for s, n, el, wr in ARMS:
    x = s * SX
    def upper(bm, x=x, s=s, el=el):
        loft(bm, [(1.58, x - s * .035, -.005, .045, .05), (1.52, x - s * .005, 0, .058, .06), (1.4, x, 0, .054, .054),
                  (el + .04, x, 0, .046, .046), (el, x, 0, .044, .044)], 8)
        blob(bm, (x - s * .015, 1.55, 0), .056, (1, .9, 1), 1)
    soft(f'arm{n}__scales', upper, 90, after=scale_rows)
    def fore(bm, x=x, el=el, wr=wr):
        loft(bm, [(el + .03, x, 0, .044, .044), (el - .05, x, .004, .05, .052), (wr + .03, x, .006, .038, .04)], 8)
        blob(bm, (x, el, 0), .044, (1, 1, 1), 1)
    soft(f'elbow{n}__scales', fore, 60, after=scale_rows)
    def bracer(bm, x=x, el=el, wr=wr):   # two leather bands bound round the forearm, then the glove round the grip
        L = el - wr
        for k in range(2):
            y = el - (.5 + .3 * k) * L
            loft(bm, [(y + .03, x, .005, .047 - .004 * k, .049 - .004 * k), (y - .03, x, .005, .045 - .004 * k, .047 - .004 * k)], 6, cap=False)
    hard(f'elbow{n}__strap', bracer, thick=.007)
    def glove(bm, x=x, s=s, wr=wr):   # the fist closed round a grip along z through the wrist
        blob(bm, (x + s * .016, wr - .005, 0), .044, (.66, 1.15, 1.15), 1)
        for zf in (-.026, -.009, .009, .026):
            tube(bm, [(x + s * .024, wr - .016, zf), (x + s * .017, wr - .052, zf * 1.1), (x - s * .017, wr - .055, zf * 1.1), (x - s * .03, wr - .024, zf)],
                 [.011, .01, .009, .008], 5)
        tube(bm, [(x + s * .012, wr - .004, .038), (x - s * .01, wr, .046), (x - s * .03, wr - .007, .041)], [.011, .01, .008], 5)   # the thumb
    soft(f'elbow{n}__leather', glove, 70, voxel=.005)

def pauldron(bm):   # a cupped leather plate over the right shoulder, a second lame under it
    cx = -SX - .01
    shell(bm, (cx, 1.555, -.005), .1, .085, .1, .1, math.pi / 2, 0, math.tau, nu=7, nv=2,
          warp=lambda p, a, e: (p.x, p.y - .12 * max(0, -(p.x - cx)) + .05 * max(0, p.x - cx), p.z))
    side = -math.pi / 2
    loft(bm, [(1.52, cx - .012, -.005, .092, .095), (1.45, cx - .02, -.005, .1, .103)], 7, cap=False, a0=side - 1.9, a1=side + 1.9)
hard('armR__leather', pauldron, thick=.009)

def studs(bm):   # iron spikes along the outside of the left bracer
    el, wr = ARMS[0][2], ARMS[0][3]; x = SX
    for k in range(3):
        y = el - (.42 + .2 * k) * (el - wr)
        tube(bm, [(x + .045, y, -.012), (x + .085, y - .012, -.016)], [.012, .001], 4)
hard('elbowL__steel', studs)

# ---- legs: scale breeches, the jerkin's front skirt, blackened steel cops, greaves and boots --------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    def thigh(bm, hx=hx):
        loft(bm, [(1.0, hx * .8, -.01, .085, .085), (.85, hx, 0, .082, .084), (.62, hx, .01, .068, .07), (.46, hx, .01, .058, .06)], 8)
    soft(f'leg{n}__scales', thigh, 80, after=scale_rows)
    def panel(bm, hx=hx, s=s):   # the jerkin's skirt in front, split at the middle and the side
        sheet(bm, 3, 2, lambda u, v: skirt(s * (-.1 + 1.75 * u), v, .01), ragged=.025, seed=5 + s)
    hard(f'leg{n}__leather', panel, thick=.01)
    def steel(bm, hx=hx, s=s):
        shell(bm, (hx, .455, .01), .066, .065, .068, -.9, .95, -1.15, 1.15, nu=4, nv=3,                   # the knee cop, ridged
              warp=lambda p, a, e: (p.x, p.y, p.z + .016 * math.cos(e) * max(0, math.cos(a)) ** 2))
        loft(bm, [(.41, hx, .012, .06, .062), (.28, hx, .006, .066, .07), (.11, hx, .006, .055, .058)], 6, cap=False,
             a0=-1.9, a1=1.9)                                                                                 # the greave, open behind
    hard(f'knee{n}__steel', steel, thick=.008)
    def boot(bm, hx=hx):
        loft(bm, [(.42, hx, 0, .052, .054), (.3, hx, -.004, .056, .058), (.16, hx, -.004, .048, .05), (.08, hx, 0, .052, .058)], 8)   # the calf
        loft(bm, [(.12, hx, .025, .048, .085), (.07, hx, .06, .05, .115), (.02, hx, .065, .052, .125)], 8)                              # the foot
        blob(bm, (hx, .038, .165), .042, (1.0, .8, 1.15), 1)                                                                            # the toe
        blob(bm, (hx, .045, -.04), .045, (1, .9, 1), 1)                                                                                 # the heel
    soft(f'knee{n}__leather', boot, 90, voxel=.008)

result = tally()
