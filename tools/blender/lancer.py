# The Ashen Lancer, the second enemy met most. One rigid mesh per game bone (js/rig.js skeleton at scale 1,
# MODEL_DEFS.ashLancer), named lancer:<bone>__<material slot>[.n], so every key pose, the walk, the cloth swing and the
# death drive it. Rest pose: upright, arms hanging (the model's posture hunches it in the game).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.31, y 1.55,
# elbows y 1.235, wrists y .92 (the glaive's shaft runs along z through the right wrist); hips x +-.15, y .90, knees .45.
# Cloth bones (they swing): loinF (0, .93, .13), loinB (0, .93, -.13), loinL/R (+-.16, .92, .02), capeA (0, 1.54, -.16),
# capeB (0, 1.12, -.16).
# The look (v5.5's brief): a hunched dead militiaman. A deep burlap hood over a skull, a ragged poncho that parts over the
# chest on the ribcage, a twisted red cord at the neck, bare ivory bones for forearms, shins and feet with dark knee
# knobs, leather bindings, and burlap tatters at the waist and down the back. Enemy budget: about 3,000 triangles with
# the glaive, which the kit still builds.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'bone': (0.78, 0.72, 0.6), 'darkBone': (0.36, 0.3, 0.23), 'socket': (0.05, 0.04, 0.04), 'shroud': (0.36, 0.31, 0.26),
       'rags': (0.33, 0.28, 0.24), 'collar': (0.42, 0.17, 0.12), 'leather': (0.22, 0.17, 0.14)}, prefix='lancer:')

SX, EL, WR = .31, 1.235, .92

# ---- head: a skull deep in a pointed burlap hood ----------------------------------------------------------------------
EYES = [(s * .036, 1.802, .1) for s in (-1, 1)]
def skull(bm):
    blob(bm, (0, 1.815, -.01), .092, (.92, 1.0, 1.12), 2)        # the cranium
    blob(bm, (0, 1.745, .045), .05, (1.0, .7, .95), 2)            # the upper jaw and teeth
    blob(bm, (0, 1.712, .03), .045, (1.05, .45, 1.0), 1)          # the jaw, hanging slack
    for s in (-1, 1): blob(bm, (s * .056, 1.77, .06), .026, (1, .7, .9), 1)   # cheekbones
    blob(bm, (0, 1.835, .075), .05, (1.45, .45, .5), 1)           # the brow
def hollows(g):   # deep sockets, the nose a dark pit, a crack under the teeth
    d = 0.0
    for e in EYES:
        r = (g - Vector(e)).length; d -= .03 * max(0, 1 - r / .03)
    r = (g - Vector((0, 1.765, .095))).length; d -= .02 * max(0, 1 - r / .018)
    r = (g - Vector((0, 1.728, .085))).length; d -= .008 * max(0, 1 - r / .04)
    return d
soft('head__bone', skull, 180, voxel=.006, after=hollows)

def voids(bm):   # the dark inside of the sockets and the nose, behind the glowing eyes
    for e in EYES: blob(bm, (e[0], e[1], e[2] - .022), .02, (1.1, 1, .6), 1)
    blob(bm, (0, 1.765, .07), .012, (.8, 1.2, .6), 1)
hard('head__socket', voids)

def hood(bm):   # a sheet round the skull, open over the face, its brow pulled into a point, falling as a cowl to the shoulders
    c = (0, 1.82, -.012)
    def at(u, v):
        if v <= .75:
            e = 1.45 - (v / .75) * 2.35                            # crown .. under the jaw
            op = .62 + .28 * max(0, -math.sin(e))                   # the face opening, wider at the chin
            a = op + (math.tau - 2 * op) * u
            rx, ry, rz = .135, .15, .15
            x, y, z = math.sin(a) * math.cos(e) * rx, c[1] + math.sin(e) * ry, c[2] + math.cos(a) * math.cos(e) * rz
            front = max(0, math.cos(a)) ** 2
            z += .05 * front * max(0, math.sin(e) + .3)              # the brow hangs forward
            back = max(0, -math.cos(a)) * max(0, math.sin(e))
            return (x, y + .045 * back ** 3, z - .035 * back ** 2)   # the peak, drawn up and back
        k = (v - .75) / .25                                         # the cowl over the shoulders
        op = .9 - .25 * k
        a = op + (math.tau - 2 * op) * u
        return (math.sin(a) * (.13 + .08 * k), 1.69 - .12 * k, -.015 + math.cos(a) * (.13 + .045 * k))
    sheet(bm, 12, 6, at, ragged=.035, seed=4)
hard('head__shroud', hood)   # single sheets: the burlap is double-sided

# ---- neck: the vertebrae under the hood ---------------------------------------------------------------------------------
def vertebrae(bm):
    for i, y in enumerate((1.635, 1.675, 1.715)): blob(bm, (0, y, -.02), .026 - .002 * i, (1.1, .7, 1), 1)
soft('neck__darkBone', vertebrae, 50, voxel=.006)

# ---- chest: the ribcage, the poncho that parts over it, the red cord ------------------------------------------------------
def ribs(bm):
    for k in range(5):
        y = 1.47 - k * .065; rx = .13 + .02 * math.sin(k / 4 * math.pi); rz = .1
        for s in (-1, 1):
            pts = [(s * math.sin(a) * rx, y - .05 * (1 - a / 1.7), -.01 + math.cos(a) * rz)
                   for a in (1.75, 1.15, .6, .22)]
            tube(bm, pts, [.011, .012, .011, .009], 4)
    tube(bm, [(0, 1.5, .1), (0, 1.38, .108), (0, 1.25, .1)], [.016, .018, .013], 4)   # the sternum
    for s in (-1, 1): tube(bm, [(s * .05, 1.555, .07), (s * .15, 1.565, .03), (s * .27, 1.56, -.01)], [.012, .012, .014], 4)   # collarbones
hard('chest__bone', ribs)

def cavity(bm):   # the dark inside of the ribcage, so the poncho does not show through it
    blob(bm, (0, 1.32, -.025), .12, (1.05, 1.45, .75), 1)
hard('chest__socket', cavity)

def poncho(bm):
    def at(u, v):
        op = .32 + .5 * math.sin(min(1, v / .55) * math.pi / 2) - .12 * max(0, v - .55) / .45   # parted widest over the ribs
        a = op + (math.tau - 2 * op) * u
        y = 1.635 - .6 * v
        w = math.sin(min(1, v / .24) * math.pi / 2); low = max(0, v - .24) / .76
        rx = .1 + .135 * w - .05 * math.sin(low * math.pi) + .02 * low     # drawn in at the waist, the hem flaring
        rz = .09 + .075 * w - .012 * math.sin(low * math.pi) + .012 * low
        return (math.sin(a) * rx, y - .07 * max(0, -math.cos(a)) * v, -.012 + math.cos(a) * rz)   # longer behind
    sheet(bm, 14, 6, at, ragged=.11, seed=9)
hard('chest__shroud', poncho)

def cord(bm):   # a twisted red cord round the cowl, its two ends hanging in front
    pts, rad = [], []
    for k in range(13):
        a = .5 + (math.tau - 1.0) * k / 12
        pts.append((math.sin(a) * .205 + .007 * math.sin(k * 3.1), 1.585 + .006 * math.cos(k * 3.1), -.012 + math.cos(a) * .165))
        rad.append(.013)
    tube(bm, pts, rad, 4)
    for s in (-1, 1): tube(bm, [(s * .1, 1.585, .14), (s * .06, 1.5, .155), (s * .07, 1.42, .155)], [.012, .011, .009], 4)
hard('chest__collar', cord)

# ---- spin: the pelvis and lumbar spine, the belt ---------------------------------------------------------------------------
def pelvis(bm):
    for s in (-1, 1):
        blob(bm, (s * .095, .985, -.02), .07, (.75, .85, .5), 1)     # the hip blades
        blob(bm, (s * .13, .9, .0), .03, (1, 1, 1), 1)                # the sockets the femurs turn in
    blob(bm, (0, .93, .06), .035, (1.6, .5, .6), 1)                   # the pubic arch
    blob(bm, (0, .95, -.06), .04, (.8, 1.2, .6), 1)                   # the sacrum
    for y in (1.0, 1.06): blob(bm, (0, y, -.07), .026, (1, .7, 1), 1)  # lumbar vertebrae
soft('spin__darkBone', pelvis, 110, voxel=.008)

def wrap(bm):   # a band of rag wound round the hips, the tatters tucked under it
    loft(bm, [(1.085, 0, -.005, .158, .13), (1.03, 0, -.005, .17, .14), (.985, 0, -.005, .168, .138)], 10, cap=False)
hard('spin__rags', wrap, thick=.01)

# ---- the tatters at the waist (they swing on their own bones) -------------------------------------------------------------
def strip(bm, top, w, ln, seed, side=None):
    """A frayed strip hanging from the belt. top: (x, y, z) of its middle; side: hang across x (front/back) or z (sides)."""
    def at(u, v):
        x, y, z = top; t = (u - .5) * w * (1 - .25 * v)
        bow = .02 * math.sin(u * math.pi)
        if side is None: return (x + t, y - ln * v, z + math.copysign(bow * .4 + .035 * v, z))
        return (x + math.copysign(bow + .03 * v, x), y - ln * v, z + t)
    sheet(bm, 2 if w < .15 else 3, 4, at, ragged=.09, seed=seed)
hard('loinF__rags', lambda bm: [strip(bm, (x, 1.06, .146 + .006 * i), w, ln, 3 + i) for i, (x, w, ln) in enumerate(((-.095, .1, .52), (.0, .09, .42), (.09, .11, .56)))])
hard('loinB__rags', lambda bm: strip(bm, (0, 1.06, -.145), .28, .68, 7))
hard('loinL__shroud', lambda bm: strip(bm, (.172, 1.06, .01), .2, .64, 11, side=1))
hard('loinR__shroud', lambda bm: strip(bm, (-.172, 1.06, .01), .2, .64, 13, side=1))

# ---- the cloak down the back: two segments, each on its own swinging bone ----------------------------------------------------
def cape(bm, y0, w0, w1, ln, z0, z1, bow, seed, rows):
    sheet(bm, 6, rows, lambda u, v: ((u - .5) * (w0 + (w1 - w0) * v), y0 - ln * v, z0 + (z1 - z0) * v + bow * .07 * (1 - math.sin(u * math.pi))),
          ragged=.1 if rows > 2 else 0, seed=seed)
hard('capeA__shroud', lambda bm: cape(bm, 1.57, .38, .48, .46, -.2, -.215, .95, 2, 2))
hard('capeB__rags', lambda bm: cape(bm, 1.12, .48, .56, .5, -.215, -.235, .78, 6, 3))

# ---- arms: humerus under a ragged sleeve, bare forearms, bound wrists, bony fists ---------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    def humerus(bm, x=x, s=s):
        tube(bm, [(x - s * .005, 1.55, 0), (x, 1.42, 0), (x, EL + .05, 0)], [.024, .019, .022], 6)
        blob(bm, (x - s * .01, 1.555, 0), .036, (1, 1, 1), 1)             # the head of the bone in its socket
        blob(bm, (x, EL + .01, .005), .034, (1.25, .8, 1), 1)             # the elbow knob
    soft(f'arm{n}__bone', humerus, 70, voxel=.006)
    def sleeve(bm, x=x, s=s):   # a cap of burlap over the shoulder joint, hanging ragged over the upper arm
        def at(u, v):
            a = u * math.tau; e = 1.35 - 1.35 * min(1, v / .45)                     # the dome, then a flaring skirt
            r = math.cos(e) + .3 * max(0, v - .45)
            return (x - s * .01 + math.sin(a) * .08 * r, 1.53 + math.sin(e) * .06 - .22 * max(0, v - .45) - .03 * v * max(0, -math.cos(a)),
                    math.cos(a) * .076 * r)
        sheet(bm, 8, 4, at, ragged=.07, seed=11 + s)
    hard(f'arm{n}__shroud', sleeve)
    def forearm(bm, x=x, s=s):
        for d in (-1, 1): tube(bm, [(x + d * .012, EL - .01, d * .006), (x + d * .015, (EL + WR) / 2, d * .008), (x + d * .01, WR + .02, d * .004)], [.014, .011, .013], 4)
        # the hand closed round the shaft (along z through the wrist): back of the hand outside, fingers curled under
        blob(bm, (x + s * .028, WR + .01, 0), .025, (.7, 1.0, 1.25), 1)      # the wrist bones, outside the shaft
        for i, zf in enumerate((-.03, -.01, .01, .03)):
            pts = [(x + s * .03, WR - .005, zf), (x + s * .02, WR - .04, zf * 1.1), (x - s * .015, WR - .042, zf * 1.1), (x - s * .03, WR - .01, zf)]
            tube(bm, pts, [.009, .008, .007, .006], 4)
        tube(bm, [(x + s * .015, WR + .01, .035), (x - s * .01, WR + .015, .045), (x - s * .03, WR + .01, .04)], [.009, .008, .006], 4)   # the thumb, over the shaft
    soft(f'elbow{n}__bone', forearm, 120, voxel=.005)
    def binding(bm, x=x):
        loft(bm, [(EL - .07, x, .0, .034, .032), (EL - .17, x, .003, .031, .029)], 6, cap=False)
    hard(f'elbow{n}__leather', binding, thick=.007)

# ---- legs: femurs, dark knee knobs, shins, bindings and bony feet ---------------------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    def femur(bm, hx=hx, s=s):
        tube(bm, [(hx - s * .02, .9, -.005), (hx, .72, .005), (hx, .5, .01)], [.03, .024, .028], 6)
        blob(bm, (hx + s * .025, .875, -.01), .03, (1, 1.1, 1), 1)        # the hip knuckle
    soft(f'leg{n}__bone', femur, 70, voxel=.007)
    hard(f'leg{n}__darkBone', lambda bm, hx=hx: blob(bm, (hx, .45, .018), .05, (1.1, .95, 1), 2))   # the knee, black with grime
    def shin(bm, hx=hx, s=s):
        tube(bm, [(hx, .43, .012), (hx, .26, .006), (hx, .09, .0)], [.026, .02, .024], 6)            # the tibia
        tube(bm, [(hx + s * .026, .42, -.008), (hx + s * .028, .25, -.01), (hx + s * .022, .1, -.008)], [.012, .01, .012], 4)   # the fibula
        blob(bm, (hx, .055, -.005), .04, (1, .75, 1.35), 1)                  # the ankle bones
        blob(bm, (hx, .035, -.045), .028, (.9, 1, 1.1), 1)                   # the heel
        for i in range(4):                                                   # the bones of the foot, splayed, ending in toes
            o = (i - 1.5) * .019
            tube(bm, [(hx + o * .7, .05, .025), (hx + o, .026, .09), (hx + o * 1.1, .014, .135)], [.012, .01, .008], 4)
    soft(f'knee{n}__bone', shin, 150, voxel=.006)
    def ankle(bm, hx=hx):
        loft(bm, [(.23, hx, .004, .036, .034), (.11, hx, .002, .036, .034)], 6, cap=False)
    hard(f'knee{n}__leather', ankle, thick=.007)

result = tally()
