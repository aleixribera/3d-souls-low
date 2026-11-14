# The Lancer of Ash, the summon of the Lancer of Ash ability (pass 80): a knight burnt down to ash that still holds its
# charge. One rigid mesh per game bone (js/rig.js skeleton at scale 1, MODEL_DEFS.lancerOfAsh), named
# ashlancer:<bone>__<material slot>, so the summon's key poses, its run and its thrust drive it (js/summon-figures.js).
# Rest pose: upright, arms hanging (the model's posture brings the spear level in the game).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.33, y 1.55,
# elbows y 1.25, wrists y .95 (the spear's shaft runs along z through the right fist); hips x +-.15, y .90, knees .45;
# loinF (0, .93, .15) and loinB (0, .93, -.15) for its tassets; capeA (0, 1.54, -.16) and capeB (0, 1.12, -.16) for the
# two halves of its torn cape.
# The look: lean, tall and upright, nothing like the hooded, bony Ashen Lancer it used to borrow. A tall keeled helm with
# one slit of cinder light across the visor and a plume of charred strands streaming back; a narrow keeled cuirass with
# a hole burnt through the breast, cinder glowing in it and cracking out from it; one great layered pauldron on the
# guard side and a small one on the spear side; ash-grey plate over a charred black body; a torn cape and ragged
# tassets for the charge to throw back; long greaves and pointed sabatons. Its spear is longer than its body: a charred
# shaft, a winged socket, a long leaf blade whose edges burn, a cinder binding under the socket and a burnt pennant.
# Three slots, drawn by the summon's shader (VIS.abilityFx.lancer.slots): `ash` (pale ash-grey plate), `char` (charred
# black: the body under the plate, cloth, plume, shaft) and `cinder` (the light).
# No enemy wears this: a summon must never be mistaken for a foe.
# Budget: about 3,500 triangles.
import sys, math
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'ash': (0.56, 0.54, 0.52), 'char': (0.15, 0.14, 0.14), 'cinder': (0.78, 0.68, 1.0)}, prefix='ashlancer:')

SX, EL, WR = .33, 1.25, .95

def keel(k, p=6):   # a ridge down the front of a loft: angle 0 faces forward
    return lambda a, y: k * max(0.0, math.cos(a)) ** p

def lerp_rows(rows, y):
    """rows: (y, *values) top to bottom; the values linearly interpolated at height y."""
    if y >= rows[0][0]: return rows[0][1:]
    for r0, r1 in zip(rows, rows[1:]):
        if r1[0] <= y <= r0[0]:
            f = (y - r0[0]) / (r1[0] - r0[0]); return tuple(a + (b - a) * f for a, b in zip(r0[1:], r1[1:]))
    return rows[-1][1:]

def on(rows, push, x, y, lift=.004):
    """The point of a loft's surface at (x, y) on its front, `lift` proud of it."""
    cx, cz, rx, rz = lerp_rows(rows, y)
    a = math.asin(max(-.98, min(.98, (x - cx) / rx)))
    for _ in range(3):   # the push widens the loft too: settle the angle
        a = math.asin(max(-.98, min(.98, (x - cx) / (rx * (1 + push(a, y))))))
    r = 1 + push(a, y)
    return (x, y, cz + math.cos(a) * rz * r + lift)

# ---- head: a tall keeled helm, a slit of cinder across the visor, a plume of charred strands --------------------------
HELM = [(2.0, 0, -.03, .01, .012), (1.985, 0, -.025, .06, .07), (1.935, 0, -.015, .1, .115), (1.865, 0, 0, .12, .134),
        (1.78, 0, .008, .121, .137), (1.7, 0, -.012, .113, .142), (1.645, 0, -.045, .121, .163)]   # the tail flares back
HPUSH = keel(.11, 8)
def helm(bm):
    loft(bm, HELM, 16, cap=True, push=HPUSH)
    def at(u, v):   # a crest fin over the crown, front to back, the plume growing from its tail
        a = (u - .45) * 2.6; z = .125 * math.sin(a); y = 1.865 + .125 * math.cos(a) * .98
        return (0, y + .09 * v * math.sin(math.pi * min(1, u * 1.15)), z - .015 * v)
    sheet(bm, 10, 1, at)
hard('head__ash', helm, thick=.014)
def visor(bm):
    pts = [on(HELM, HPUSH, .118 * math.sin(a), 1.842, .002) for a in [i * .15 - .9 for i in range(13)]]
    tube(bm, pts, [.006] + [.0105] * 11 + [.006], 5)
    for s in (1, -1):   # breath holes under the slit, three a side
        for k in range(3):
            x = s * (.035 + .022 * k); blob(bm, on(HELM, HPUSH, x, 1.775 - .006 * k, -.002), .0075, (1, 1, .6), 1)
hard('head__cinder', visor)
def plume(bm):   # charred strands from the crown, streaming back and down
    for k, dx in enumerate((-.032, -.016, 0, .016, .032)):
        drop = .03 * abs(k - 2)
        pts = [(dx * .3, 1.98, -.1), (dx, 1.98, -.19), (dx * 1.5, 1.9 - drop, -.3), (dx * 2, 1.74 - drop, -.38), (dx * 2.4, 1.52 - drop * 2, -.42)]
        tube(bm, pts, [.014, .019, .016, .011, .003], 5)
hard('head__char', plume)

# ---- neck: a gorget -----------------------------------------------------------------------------------------------------
hard('neck__char', lambda bm: loft(bm, [(1.71, 0, -.005, .085, .092), (1.6, 0, 0, .13, .118)], 10, cap=False), thick=.012)

# ---- chest: a narrow keeled cuirass, straps across its waist, a burnt hole in the breast -------------------------------
TORSO = [(1.62, 0, -.01, .15, .11), (1.56, 0, 0, .24, .148), (1.46, 0, .014, .262, .16), (1.34, 0, .014, .225, .15),
         (1.2, 0, .004, .178, .13), (1.1, 0, 0, .172, .126)]
TPUSH = keel(.08, 6)
hard('chest__ash', lambda bm: loft(bm, TORSO, 14, cap=True, push=TPUSH))
def straps(bm):
    for y in (1.27, 1.205):
        cx, cz, rx, rz = lerp_rows(TORSO, y)
        loft(bm, [(y + .016, cx, cz, rx + .009, rz + .009), (y - .016, cx, cz, rx + .009, rz + .009)], 14, cap=False, push=TPUSH)
    for s in (1, -1):   # the cape's two clasps on the shoulders
        blob(bm, (s * .17, 1.585, .06), .028, (1, .8, .7), 1)
hard('chest__char', straps, thick=.01)
HX, HY = .06, 1.42   # the hole's heart
def heart(bm):
    blob(bm, on(TORSO, TPUSH, HX, HY, -.006), .034, (1.0, 1.25, .45), 2)
    for path in ([(HX, HY), (.1, 1.47), (.14, 1.5)], [(HX, HY), (.045, 1.49), (.0, 1.535)],
                 [(HX, HY), (.03, 1.38), (-.02, 1.345)], [(HX, HY), (.1, 1.37), (.115, 1.31)]):
        pts = [on(TORSO, TPUSH, x, y, .001) for x, y in path]
        tube(bm, pts, [.01, .007, .003], 4)
hard('chest__cinder', heart)

# ---- spin: a charred belt with a cinder buckle, ash faulds over the hips ------------------------------------------------
hard('spin__char', lambda bm: loft(bm, [(1.12, 0, 0, .182, .136), (1.03, 0, 0, .196, .146)], 12, cap=False), thick=.012)
hard('spin__ash', lambda bm: loft(bm, [(1.04, 0, 0, .21, .156), (.94, 0, .0, .228, .172), (.86, 0, 0, .238, .18)], 12, cap=False), thick=.014)
hard('spin__cinder', lambda bm: blob(bm, (0, 1.075, .152), .024, (1.2, 1.0, .45), 1))

# ---- tassets: ragged charred cloth, front and back, each on its own bone -----------------------------------------------
def tasset(z, sign, strips, seed):
    # strips: (x0, x1, length) of torn cloth hanging side by side from the belt, a little apart.
    def build(bm):
        for k, (x0, x1, ln) in enumerate(strips):
            def at(u, v, x0=x0, x1=x1, ln=ln):
                x = x0 + (x1 - x0) * u
                return (x * (1 + .22 * v), .98 - ln * v, z + sign * (.04 * v + .012 * math.sin(u * math.pi) * v))
            sheet(bm, 2, 4, at, ragged=.12, seed=seed + k)
    return build
hard('loinF__char', tasset(.185, 1, [(-.15, -.01, .5), (.01, .15, .44)], 4), thick=.012)
hard('loinB__char', tasset(-.19, -1, [(-.18, -.07, .56), (-.06, .06, .66), (.07, .18, .52)], 9), thick=.012)

# ---- the cape: two halves on their own bones, torn at the hem --------------------------------------------------------
def cape_top(bm):
    def at(u, v):
        return ((u - .5) * .46 * (1 + .1 * v), 1.6 - .45 * v, -.12 - .08 * math.sin(u * math.pi) - .04 * v)
    sheet(bm, 6, 3, at)
hard('capeA__char', cape_top, thick=.012)
def cape_hem(bm):   # torn into three tails of different lengths
    for k, (u0, u1, ln) in enumerate(((0, .37, .6), (.35, .67, .74), (.65, 1, .54))):
        def at(u, v, u0=u0, u1=u1, ln=ln):
            w = u0 + (u1 - u0) * u
            return ((w - .5) * .506 * (1 + .16 * v), 1.15 - ln * v, -.16 - .08 * math.sin(w * math.pi) - .07 * v)
        sheet(bm, 3, 4, at, ragged=.16, seed=5 + k)
hard('capeB__char', cape_hem, thick=.012)

# ---- arms: charred sleeves, a great layered pauldron on the left (the guard side), a small one on the right ------------
def pauldron(x, s, r, lames, ridge):
    def build(bm):
        cx = s * (SX - .01)
        def slope(p, a, e):
            d = (p.x - cx) * s
            return (p.x, p.y - .09 * max(0, d) * (1 - .5 * math.sin(e)) + .03 * max(0, -d), p.z)
        shell(bm, (cx, 1.58, -.005), r, r * .8, r, 0, math.pi / 2, 0, math.tau, nu=10, nv=3, warp=slope)
        side = s * math.pi / 2
        for k in range(lames):   # lames under the dome, open on the inside, each a little wider
            y = 1.54 - k * .055; rr = r * .78 + .008 * k
            loft(bm, [(y, x + s * (.02 + .012 * k), -.005, rr, rr * 1.05), (y - .07, x + s * (.03 + .014 * k), -.005, rr + .014, (rr + .014) * 1.05)],
                 7, cap=False, a0=side - 2.1, a1=side + 2.1)
        if ridge:   # a raised flange on the neck side, to turn a blow from the head
            def at(u, v):
                a = (u - .5) * 1.6
                return (x - s * .1 + s * .03 * (1 - math.cos(a)), 1.64 + .1 * (1 - v) * math.cos(a * .8), .09 * math.sin(a))
            sheet(bm, 6, 1, at)
    return build
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    hard(f'arm{n}__char', lambda bm, x=x: loft(bm, [(1.6, x, 0, .058, .058), (1.42, x, 0, .05, .05), (EL + .03, x, 0, .044, .044)], 8, cap=True))
    def upper(bm, x=x, s=s):
        pauldron(x, s, .155 if s > 0 else .13, 3 if s > 0 else 2, s > 0)(bm)
        side = s * math.pi / 2   # a rerebrace round the outside of the upper arm
        loft(bm, [(1.44, x, 0, .062, .062), (1.31, x, 0, .056, .056)], 7, cap=False, a0=side - 1.9, a1=side + 1.9)
    hard(f'arm{n}__ash', upper, thick=.016)
    def vambrace(bm, x=x, s=s):
        loft(bm, [(EL - .005, x, 0, .046, .046), (EL - .06, x, 0, .054, .054), (WR + .1, x, 0, .05, .05), (WR + .04, x, 0, .058, .058),
                  (WR + .012, x, 0, .066, .066)], 8, cap=True)   # flaring to a cuff over the gauntlet
        blob(bm, (x, EL + .005, -.035), .042, (1.0, 1.0, .8), 1)   # the couter, over the elbow
        tube(bm, [(x, EL + .005, -.06), (x, EL + .02, -.12)], [.016, .002], 4)   # its spike
    hard(f'elbow{n}__ash', vambrace)
    hard(f'elbow{n}__cinder', lambda bm, x=x, s=s: tube(bm, [(x + s * .061, EL - .07, .0), (x + s * .062, (EL + WR) / 2, .0), (x + s * .055, WR + .06, .0)],
                                                       [.003, .0065, .003], 4))
    def fist(bm, x=x, s=s):   # a gauntlet closed round a shaft along z through the wrist
        blob(bm, (x + s * .01, WR - .045, .005), .058, (.7, 1.0, 1.15), 2)
        blob(bm, (x - s * .028, WR - .03, .045), .023, (.8, 1.3, .8), 1)   # the thumb over the shaft
    hard(f'elbow{n}__char', fist)

# ---- legs: charred thighs under ash cuisses, poleyns, long keeled greaves, pointed sabatons ----------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    hard(f'leg{n}__char', lambda bm, hx=hx: loft(bm, [(.98, hx, -.01, .088, .09), (.75, hx, 0, .075, .078), (.48, hx, .005, .058, .062)], 8, cap=True))
    hard(f'leg{n}__ash', lambda bm, hx=hx: loft(bm, [(.94, hx, .004, .095, .098), (.72, hx, .01, .088, .092), (.55, hx, .014, .076, .08)], 8, cap=False,
                                                a0=-1.35, a1=1.35), thick=.014)
    def greave(bm, hx=hx):
        loft(bm, [(.445, hx, .006, .058, .064), (.34, hx, -.004, .066, .074), (.19, hx, 0, .05, .055), (.12, hx, .0, .053, .057)], 10, cap=True,
             push=keel(.14, 8))
        blob(bm, (hx, .465, .058), .046, (1.0, 1.15, .7), 1)   # the poleyn
        blob(bm, (hx * 1.42, .46, .02), .042, (.35, 1.0, 1.0), 1)   # its wing, on the outside
    hard(f'knee{n}__ash', greave)
    hard(f'knee{n}__char', lambda bm, hx=hx: loft(bm, [(.125, hx, .02, .058, .11), (.06, hx, .045, .064, .165), (.0, hx, .055, .06, .19)], 8, cap=True,
                                                  push=keel(.5, 4)))   # a pointed sabaton

# ---- the spear (on the weapon bone): a charred shaft, a winged socket, a long leaf blade with burning edges ----------------
BX, BY = -SX, WR - .045
def shaft(bm):
    tube(bm, [(BX, BY, -.84), (BX, BY, 1.5)], [.019, .019], 6)
    for k, (z0, ln) in enumerate(((1.44, .42), (1.4, .3))):   # two burnt streamers tied under the socket, trailing back
        def at(u, v, z0=z0, ln=ln):
            return (BX + .006 * k, BY - .02 - ln * v, z0 - .06 * u * (1 - .5 * v) - .16 * v * v)
        sheet(bm, 1, 4, at, ragged=.06, seed=3 + k)
hard('weapon__char', shaft, thick=.008)
BLADE = [(1.66, .028, .016), (1.75, .068, .02), (1.88, .074, .019), (2.04, .04, .013), (2.18, .003, .003)]
def head(bm):
    tube(bm, [(BX, BY, -.84), (BX, BY, -.99)], [.024, .003], 4)   # the butt spike
    tube(bm, [(BX, BY, 1.47), (BX, BY, 1.6), (BX, BY, 1.67)], [.022, .03, .02], 6)   # the socket
    for s in (1, -1):   # the wings, swept back
        tube(bm, [(BX, BY, 1.6), (BX + s * .07, BY, 1.585), (BX + s * .12, BY, 1.545)], [.017, .009, .003], 4)
    rings = [[bm.verts.new(G(BX + dx * t, BY + dy * w, z)) for dx, dy in ((1, 0), (0, 1), (-1, 0), (0, -1))] for z, w, t in BLADE]
    bridge(bm, rings, True, True)
hard('weapon__ash', head)
def burn(bm):
    for s in (1, -1):   # each edge of the blade, glowing
        tube(bm, [(BX, BY + s * (w - .002), z) for z, w, t in BLADE[:-1]] + [(BX, BY, 2.17)], [.004, .006, .006, .005, .002], 4)
    pts = [(BX + .023 * math.cos(k * .95), BY + .023 * math.sin(k * .95), 1.26 + k * .009) for k in range(24)]   # the binding
    tube(bm, pts, [.0045] * 24, 4)
hard('weapon__cinder', burn)

result = tally()
