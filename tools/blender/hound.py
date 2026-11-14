# The Grave Hound, a summon (the ability of the same name, js/data/abilities.js): a gaunt spectral hound that bounds out
# of its holder's shadow and harries the boss. Not a rig figure: one rigid mesh per joint of its own, named
# hound:<part>__<material slot>[.n], each built at its rest place; js/summon-hound.js hangs each on a pivot (HOUND_JOINTS
# there, the same numbers as JOINT below) and runs its gait, its lunge and bite, and its howl itself.
# Game axes (x = the hound's left, y up, z forward: its nose points +z), written to Blender through G().
# Joints at rest: body (0, .74, 0); neck (0, .9, .4) on the body; head (0, 1.08, .66) on the neck; jaw (0, 1.03, .74) on
# the head; tail (0, .86, -.6) on the body; legs on the body, the front pair's shoulders (+-.15, .84, .3) and elbows
# (+-.15, .48, .27), the hind pair's hips (+-.15, .8, -.48) and hocks (+-.16, .27, -.6).
# The look: a starved wolfhound of the grave, about .95 m at the shoulder. A deep keel of a chest over a tucked waist with
# the ribs standing out, a ridge of spine spurs and a ragged mane of torn fur down the neck and back; a long narrow skull
# whose bone shows through over the muzzle and brow (the `bone` slot), deep sockets, swept-back torn ears, long fangs; long
# thin legs with knuckled paws and hooked claws; a long ragged tail. The game draws it as cold spectral fire (a fresnel
# shader), so the shapes carry it: silhouette first. Summon budget: about 8,000 triangles.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob, bent_spike
from figure_lib import *
from snow_lib import tube as stube   # its rings keep one orientation down a near-vertical limb (figure_lib.tube flips at |t.y| .9)
import bpy, bmesh
from mathutils import Vector

begin({'hide': (0.32, 0.36, 0.4), 'bone': (0.78, 0.76, 0.7)}, prefix='hound:')
rnd = random.Random(61)
JOINT = {'body': (0, .74, 0), 'neck': (0, .9, .4), 'head': (0, 1.08, .66), 'jaw': (0, 1.03, .74), 'tail': (0, .86, -.6),
         'shoulder': (.15, .84, .3), 'elbow': (.15, .48, .27), 'hip': (.15, .8, -.48), 'hock': (.16, .27, -.6)}

def spur(bm, base, tip, r):   # a spine spur, a fang, a claw
    tube(bm, [base, tip], [r, r * .08], 4)

def tuft(bm, base, lay, ln, r, n, spread=.04):   # torn fur: a fan of bent spikes laid along `lay`
    base, lay = Vector(base), Vector(lay).normalized()
    for k in range(n):
        j = Vector((rnd.uniform(-spread, spread), rnd.uniform(-spread, spread) * .6, rnd.uniform(-spread, spread)))
        L = ln * rnd.uniform(.7, 1.2)
        bent_spike(bm, base + j, base + j + lay * L + Vector((0, -.25 * L, 0)), r * rnd.uniform(.8, 1.2), (0, .08 * L, 0), sides=4)

# ---- body: keel chest, tucked waist, haunch, ribs and the spine's spurs -------------------------------------------------
def body(bm):
    blob(bm, (0, .76, .22), .23, (.64, 1.08, 1.0), 2)        # the deep chest
    blob(bm, (0, .63, .28), .14, (.6, 1.0, .95), 2)           # the keel under it
    blob(bm, (0, .85, -.1), .15, (.66, .72, 1.25), 2)        # the waist, high and tucked
    blob(bm, (0, .82, -.42), .19, (.85, .9, 1.0), 2)         # the haunch
    for s in (-1, 1):
        blob(bm, (s * .1, .84, .28), .11, (.8, 1.0, 1.0), 1)   # the shoulder blades
        blob(bm, (s * .11, .78, -.46), .13, (.75, 1.05, 1.0), 1)   # the thighs' tops
        for k in range(6):   # the ribs stand out of the starved flank
            z = .3 - k * .075; top = .93 - k * .006; bot = .64 + k * .045
            tube(bm, [(s * .1, top, z), (s * (.165 - k * .006), (top + bot) / 2 + .02, z - .02), (s * .1, bot, z - .05)], [.022, .026, .018], 6)
body_ob = soft('body__hide', body, 2300, voxel=.014, noise=.008)

def spine(bm):   # spurs along the back, raking backwards
    for k in range(9):
        z = .38 - k * .1; y = .99 - abs(z + .05) * .12
        spur(bm, (0, y - .03, z), (0, y + .09 - k * .004, z - .06), .028)
hard('body__bone', spine)

def mane(bm):   # torn fur over the withers and along the back
    for k in range(7):
        z = .34 - k * .1
        for s in (-1, 1):
            tuft(bm, (s * .06, .97 - k * .01, z), (s * .5, .35, -1), .2 - k * .015, .03, 2)
soft('body__hide.1', mane, 700, voxel=.012)

# ---- neck: a long, low-carried neck under a ragged ruff -------------------------------------------------------------------
def neck(bm):
    tube(bm, [(0, .86, .3), (0, .94, .46), (0, 1.02, .6), (0, 1.06, .68)], [.15, .13, .1, .085], 10)
    for k in range(5):
        a = .3 + k * .07
        for s in (-1, 0, 1):
            tuft(bm, (s * .07, .96 + k * .02, a + .04), (s * .7, .5, -1), .17, .03, 1, .02)
soft('neck__hide', neck, 1000, voxel=.012, noise=.006)

# ---- head: a long narrow skull, the bone showing over brow and muzzle, swept torn ears ---------------------------------------
EYES = [(s * .055, 1.13, .8) for s in (-1, 1)]   # HOUND_EYES in js/summon-hound.js
def skull(bm):
    blob(bm, (0, 1.1, .7), .09, (.95, .85, 1.1), 2)          # the cranium
    tube(bm, [(0, 1.1, .74), (0, 1.08, .86), (0, 1.055, .98), (0, 1.04, 1.06)], [.07, .062, .05, .036], 10, )   # the muzzle
    for s in (-1, 1): blob(bm, (s * .06, 1.06, .74), .05, (.8, 1.0, 1.1), 1)   # the cheeks
def sockets(g):   # deep sockets under the brow
    d = 0.0
    for e in EYES:
        r = (g - Vector(e)).length; d -= .02 * max(0, 1 - r / .035)
    return d
soft('head__hide', skull, 1200, voxel=.01, after=sockets)

def mask(bm):   # the skull's bone through the hide: a brow plate and a ridge down the muzzle
    shell(bm, (0, 1.1, .71), .085, .08, .1, .25, 1.1, -1.2, 1.2, 12, 5)
    tube(bm, [(0, 1.135, .8), (0, 1.11, .9), (0, 1.085, 1.0), (0, 1.07, 1.05)], [.024, .022, .018, .012], 6)
    for s in (-1, 1):
        tube(bm, [(s * .045, 1.15, .78), (s * .075, 1.14, .82), (s * .085, 1.12, .84)], [.016, .013, .008], 5)   # brow hooks over the sockets
        for k in range(4):   # upper fangs
            z = 1.03 - k * .055; x = s * (.032 + k * .006)
            spur(bm, (x, 1.03, z), (x, .965 - (.02 if k == 0 else 0), z - .005), .011 + (.004 if k == 0 else 0))
hard('head__bone', mask, outward=(0, 1.08, .8))

def ears(bm):   # swept back and torn
    for s in (-1, 1):
        stube(bm, [(s * .05, 1.15, .67), (s * .095, 1.18, .58), (s * .125, 1.185, .48)], [.03, .022, .004], 5, ovals=[(1.6, .6)] * 3)
        tuft(bm, (s * .085, 1.2, .6), (s * .3, .1, -1), .08, .014, 2, .012)
soft('head__hide.1', ears, 300, voxel=.009)

def jaw(bm):
    tube(bm, [(0, 1.02, .76), (0, 1.0, .88), (0, .99, .98), (0, 1.0, 1.04)], [.05, .045, .036, .026], 8)
soft('jaw__hide', jaw, 400, voxel=.009)
def lower_teeth(bm):
    for s in (-1, 1):
        for k in range(3):
            z = 1.0 - k * .06; x = s * (.026 + k * .006)
            spur(bm, (x, 1.01, z), (x, 1.065, z + .005), .009 + (.003 if k == 0 else 0))
hard('jaw__bone', lower_teeth)

# ---- legs: long and thin, knuckled paws, hooked claws ------------------------------------------------------------------------
def paw(bm, x, z):
    blob(bm, (x, .045, z + .035), .05, (.85, .55, 1.25), 2)
    blob(bm, (x, .07, z - .01), .035, (.9, .9, 1.0), 1)   # the knuckle over it
def claws(bm, x, z):
    for k in (-1, 0, 1):
        spur(bm, (x + k * .022, .035, z + .09), (x + k * .028, -.0, z + .14), .011)

# Limbs are exact tubes (hard): a long thin limb fused and decimated comes out in slivers and slabs. The upper pieces
# are thick where they meet the body and tuck inside its flank.
for s, side in ((1, 'L'), (-1, 'R')):
    sx = s * .15
    def fu(bm, sx=sx, s=s):   # the shoulder blade sloping forward to the point of the shoulder, the upper arm back to the elbow
        stube(bm, [(s * .09, .9, .25), (s * .12, .8, .32), (s * .135, .7, .36), (s * .145, .6, .32), (sx, .48, .265)], [.05, .062, .06, .048, .04], 12)
        blob(bm, (sx, .49, .265), .042, (1, 1, 1), 1)   # the elbow
    soft(f'f{side}u__hide', fu, 700, voxel=.01)
    def fl(bm, sx=sx):   # the long fore-shin, the wrist's knuckle, the paw
        stube(bm, [(sx, .5, .265), (sx, .32, .285), (sx, .14, .305), (sx, .08, .325)], [.04, .03, .024, .028], 10)
        blob(bm, (sx, .15, .305), .03, (1, 1.2, 1), 1)   # the wrist
        paw(bm, sx, .32)
    hard(f'f{side}l__hide', fl)
    hard(f'f{side}l__bone', lambda bm, sx=sx: claws(bm, sx, .32))
    def hu(bm, sx=sx, s=s):   # hip, the heavy thigh forward to the stifle, the shin back to the hock
        stube(bm, [(s * .1, .84, -.48), (s * .14, .7, -.42), (sx, .56, -.37), (s * .155, .44, -.45), (s * .16, .28, -.59)], [.1, .09, .06, .042, .032], 12)
        blob(bm, (s * .13, .72, -.44), .1, (.6, 1.1, 1.05), 2)   # the thigh's muscle
        blob(bm, (s * .16, .28, -.6), .034, (1, 1, 1.2), 1)   # the hock's point
    soft(f'h{side}u__hide', hu, 800, voxel=.01)
    def hl(bm, s=s):   # hock to paw
        stube(bm, [(s * .16, .29, -.61), (s * .16, .16, -.56), (s * .16, .08, -.51)], [.032, .024, .028], 10)
        paw(bm, s * .16, -.51)
    hard(f'h{side}l__hide', hl)
    hard(f'h{side}l__bone', lambda bm, s=s: claws(bm, s * .16, -.51))

# ---- tail: long and ragged, carried low ---------------------------------------------------------------------------------------
def tail(bm):
    pts = [(0, .86, -.58), (0, .8, -.76), (0, .66, -.92), (0, .52, -1.02)]
    tube(bm, pts, [.05, .04, .03, .018], 8)
    for k in range(4):
        p = Vector(pts[k]); tuft(bm, p, (0, -.2, -1), .14, .022, 2, .03)
soft('tail__hide', tail, 450, voxel=.01)

result = tally()
