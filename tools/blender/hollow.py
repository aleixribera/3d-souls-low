# The Hollow Soldier, the enemy met most. One rigid mesh per game bone (js/rig.js skeleton at scale 1, MODEL_DEFS.hollowSoldier),
# named hollow:<bone>__<material slot>[.n], so every key pose, the walk and the death drive it. Rest pose: upright, arms hanging.
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.32, y 1.55,
# elbows y 1.238 (left, its arm 4% longer) and 1.25, wrists y .93 / .95; hips x +-.15, y .90, knees y .45, soles y 0.
# The look (v5.5's brief): a dead conscript still in his kit. A quilted ochre gambeson to mid-thigh with puffed sleeves and a
# standing collar, two straps crossed over the chest, a pouch on the belt, rust-red trousers, leather cuffs and gloves, iron
# knee cops over turned-down boot cuffs, and a dented, crested morion over a sunken face. Enemy budget: about 3,000
# triangles with the sword, which the kit still builds (ruinedSword).
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'quilt': (0.52, 0.45, 0.25), 'trousers': (0.45, 0.20, 0.13), 'leather': (0.32, 0.24, 0.17), 'strap': (0.38, 0.31, 0.23),
       'iron': (0.42, 0.42, 0.43), 'skin': (0.45, 0.37, 0.27)}, prefix='hollow:')

# Quilting: vertical channels on the body, rings on the sleeves (the texture carries the stitches; this gives them relief).
channels = lambda g: .005 * abs(math.sin(math.atan2(g.x, g.z) * 9))
bands = lambda g: .006 * abs(math.sin(g.y * 52))

# ---- spin: the trousers' seat, the gambeson's back skirt, the belt and its pouch ---------------------------------------
def seat(bm):
    loft(bm, [(1.06, 0, 0, .17, .12), (.98, 0, 0, .185, .13), (.9, 0, -.01, .19, .13), (.83, 0, -.005, .17, .12)], 12)
    for s in (-1, 1): blob(bm, (s * .1, .86, -.025), .1, (1, .9, 1), 1)
soft('spin__trousers', seat, 110)

def skirt(a, v, out=0.0):   # a point of the gambeson's skirt: angle a around the body (0 = front), v = 0 belt .. 1 hem
    return (math.sin(a) * (.212 + out + .075 * v), 1.02 - .4 * v, -.005 + math.cos(a) * (.155 + out + .06 * v))
def back_skirt(bm):   # the gambeson below the belt, behind: hip to mid-thigh, split from the front panels at the sides
    sheet(bm, 6, 3, lambda u, v: skirt(math.pi * (.5 + 1.0 * u), v), ragged=.03, seed=3)
hard('spin__quilt', back_skirt, thick=.02)

def belt(bm):
    loft(bm, [(1.055, 0, 0, .22, .16), (1.005, 0, 0, .22, .16)], 12, cap=False)
hard('spin__strap', belt, thick=.012)

def pouch(bm):   # a big pouch on the left hip, its flap folded over
    loft(bm, [(1.02, .2, .06, .055, .04), (.95, .21, .06, .065, .045), (.88, .21, .06, .06, .042)], 8)
    blob(bm, (.2, 1.0, .075), .05, (1.2, .5, .9), 1)
soft('spin__leather', pouch, 60, voxel=.008)

# ---- chest: the gambeson's body and standing collar, the crossed straps -------------------------------------------------
TORSO = [(1.0, 0, 0, .19, .14), (1.1, 0, .004, .185, .138), (1.27, 0, .016, .21, .158), (1.42, 0, .012, .228, .156),
         (1.51, 0, -.002, .22, .14), (1.57, 0, -.01, .17, .12), (1.61, 0, -.012, .11, .1)]
def torso_at(y):   # (cz, rx, rz) of the torso at height y
    rows = sorted(TORSO)
    for (y0, _, c0, x0, z0), (y1, _, c1, x1, z1) in zip(rows, rows[1:]):
        if y0 <= y <= y1:
            k = (y - y0) / (y1 - y0); return (c0 + (c1 - c0) * k, x0 + (x1 - x0) * k, z0 + (z1 - z0) * k)
    return rows[0][2:] if y < rows[0][0] else rows[-1][2:]
def torso(bm):
    loft(bm, TORSO, 14)
    loft(bm, [(1.58, 0, -.015, .1, .094), (1.64, 0, -.02, .104, .098), (1.675, 0, -.026, .112, .104)], 12)   # the collar
    for s in (-1, 1): blob(bm, (s * .24, 1.5, -.005), .085, (1.15, .75, 1), 1)   # the shoulders the sleeves hang from
soft('chest__quilt', torso, 330, after=lambda g: channels(g) if g.y < 1.57 else .004 * abs(math.sin(g.y * 70)))

def straps(bm):   # shoulder to opposite hip, over the front and the back
    for sx in (-1, 1):
        for sign in (1, -1):
            pts = []
            for i in range(5):
                t = i / 4; y = 1.52 - .47 * t; x = sx * (-.15 + .33 * t)
                cz, rx, rz = torso_at(y); rx += .012; rz += .012
                z = cz + sign * (rz * math.sqrt(max(.04, 1 - (x / rx) ** 2)) + .01)
                pts.append((x, y, z))
            sheet(bm, 1, 4, lambda u, v, p=pts: (p[round(v * 4)][0] + (u - .5) * .042, p[round(v * 4)][1] + (u - .5) * .026, p[round(v * 4)][2]))
hard('chest__strap', straps, thick=.008)

# ---- neck and head: a sunken face under a crested morion --------------------------------------------------------------
def neck(bm):
    loft(bm, [(1.74, 0, .0, .062, .06), (1.63, 0, -.005, .068, .064)], 8)
soft('neck__skin', neck, 50)

EYES = [(s * .048, 1.785, .085) for s in (-1, 1)]
def face(bm):
    blob(bm, (0, 1.8, -.005), .1, (.98, 1.1, 1.04), 2)          # the skull
    blob(bm, (0, 1.725, .04), .058, (1.15, .72, 1.0), 2)          # the jaw, slack
    for s in (-1, 1): blob(bm, (s * .055, 1.765, .065), .03, (1, .8, .8), 1)   # cheekbones
    blob(bm, (0, 1.805, .085), .045, (1.5, .45, .55), 1)         # the brow ridge
def sunken(g):   # eye sockets and hollow cheeks pressed in, the nose gone to a pit
    d = 0.0
    for e in EYES:
        r = (g - Vector(e)).length; d -= .022 * max(0, 1 - r / .032)
    for s in (-1, 1):
        r = (g - Vector((s * .05, 1.735, .075))).length; d -= .01 * max(0, 1 - r / .035)
    r = (g - Vector((0, 1.765, .1))).length; d -= .014 * max(0, 1 - r / .02)
    return d
soft('head__skin', face, 210, voxel=.006, after=sunken)

def morion(bm):
    c = (0, 1.82, -.005)
    shell(bm, c, .128, .104, .136, 0, 1.45, 0, math.tau, nu=10, nv=3,                        # the dome, dented on one side
          warp=lambda p, a, e: (p[0], p[1] - .012 * max(0, math.cos(a - 2.2)) * math.cos(e), p[2]))
    # the brim: flat at the sides, swept up into points at the front and back
    rows = []
    for (r, lift) in [(1.0, 0), (1.32, 1)]:
        rows.append([bm.verts.new(G(math.sin(a) * .128 * r, 1.82 - .004 + lift * (.006 + .045 * math.cos(a) ** 4), -.005 + math.cos(a) * .136 * r * (1 + .22 * lift * math.cos(a) ** 2)))
                     for a in [k / 14 * math.tau for k in range(14)]])
    bridge(bm, rows)
    # the comb: a thin crest from brow to nape
    prof = [(-.13, .0), (-.085, .035), (-.02, .05), (.04, .048), (.1, .028), (.135, .0)]
    top = [bm.verts.new(G(side * .012, 1.82 + .104 * math.sqrt(max(0, 1 - (z / .136) ** 2)) + h, z - .005)) for z, h in prof for side in (-1, 1)]
    base = [bm.verts.new(G(side * .012, 1.82 + .104 * math.sqrt(max(0, 1 - (z / .136) ** 2)) - .005, z - .005)) for z, h in prof for side in (-1, 1)]
    for i in range(len(prof) - 1):
        for side in (0, 1):
            a, b = 2 * i + side, 2 * (i + 1) + side
            bm.faces.new((base[a], base[b], top[b], top[a]))
        bm.faces.new((top[2 * i], top[2 * i + 2], top[2 * i + 3], top[2 * i + 1]))
hard('head__iron', morion)   # single sheets: the iron material is double-sided

# ---- arms: puffed quilted sleeves, the forearms, leather cuffs and gloves ------------------------------------------------
for s, n, sx, el, wr in ((1, 'L', .32, 1.238, .926), (-1, 'R', -.32, 1.25, .95)):
    def upper(bm, x=sx, s=s, el=el):
        loft(bm, [(1.58, x - s * .045, -.005, .052, .058), (1.53, x - s * .006, 0, .072, .074), (1.45, x + s * .006, 0, .078, .077),
                  (1.36, x + s * .004, 0, .068, .067), (el + .04, x, 0, .052, .052), (el, x, 0, .05, .05)], 10)
        blob(bm, (x - s * .02, 1.55, 0), .066, (1, .9, 1), 1)
    soft(f'arm{n}__quilt', upper, 120, after=bands)
    def fore(bm, x=sx, el=el, wr=wr):
        loft(bm, [(el + .03, x, 0, .05, .05), (el - .06, x, .004, .058, .06), (wr + .12, x, .008, .048, .05)], 10)
        blob(bm, (x, el, 0), .05, (1, 1, 1), 1)
    soft(f'elbow{n}__quilt', fore, 70, after=bands)
    def cuff(bm, x=sx, el=el, wr=wr):   # a flared leather cuff over the wrist
        loft(bm, [(wr + .15, x, .008, .064, .066), (wr + .08, x, .009, .056, .058), (wr + .03, x, .01, .05, .052)], 8, cap=False)
    hard(f'elbow{n}__leather', cuff, thick=.008)
    def glove(bm, x=sx, s=s, wr=wr):
        blob(bm, (x, wr - .01, .02), .048, (.85, 1.1, 1.1), 1)
        blob(bm, (x, wr - .06, .035), .042, (.95, .75, 1.1), 1)
        blob(bm, (x - s * .036, wr - .02, .055), .021, (1, 1.5, 1), 1)   # thumb
    soft(f'elbow{n}__leather.2', glove, 70, voxel=.007)

# ---- legs: trousers, the gambeson's front panels, knee cops and turned-down boots -----------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    def thigh(bm, hx=hx):
        loft(bm, [(1.0, hx * .8, -.01, .1, .1), (.85, hx, 0, .096, .098), (.62, hx, .01, .08, .082), (.45, hx, .01, .07, .072)], 10)
        blob(bm, (hx, .45, .015), .07, (1, 1, 1), 1)
    soft(f'leg{n}__trousers', thigh, 96, after=lambda g: .003 * math.sin(g.y * 60 + g.x * 40))
    def panel(bm, hx=hx, s=s):   # the gambeson's front skirt, split at the middle and the side
        sheet(bm, 4, 3, lambda u, v: skirt(s * (-.12 + 1.82 * u), v, .012), ragged=.025, seed=5 + s)
    hard(f'leg{n}__quilt', panel, thick=.02)
    def shin(bm, hx=hx):
        loft(bm, [(.47, hx, .01, .068, .07), (.36, hx, .0, .062, .062)], 8)
    soft(f'knee{n}__trousers', shin, 50)
    def boot(bm, hx=hx):
        loft(bm, [(.36, hx, 0, .066, .07), (.22, hx, -.005, .062, .066), (.12, hx, -.01, .058, .064), (.06, hx, 0, .062, .07)], 10)
        loft(bm, [(.13, hx, .03, .056, .1), (.08, hx, .07, .056, .13), (.025, hx, .075, .06, .14)], 10)   # the foot
        blob(bm, (hx, .045, .19), .05, (1.05, .85, 1.1), 1)                                          # toe
        blob(bm, (hx, .05, -.045), .05, (1, .9, 1), 1)                                               # heel
        loft(bm, [(.4, hx, .0, .085, .088), (.33, hx, -.004, .09, .093), (.29, hx, -.006, .082, .086)], 10)   # the turned-down cuff
        loft(bm, [(.018, hx, .07, .064, .15), (.0, hx, .07, .064, .15)], 10)                         # the sole
    soft(f'knee{n}__leather', boot, 150, voxel=.009)
    def cop(bm, hx=hx):   # a dished iron cop over the knee, with a wing to the outside
        shell(bm, (hx, .46, .005), .075, .07, .075, -.9, .9, -1.1, 1.1, nu=6, nv=3,
              warp=lambda p, a, e: (p[0], p[1], p[2] + .012 * math.cos(e) * math.cos(a)))
    hard(f'knee{n}__iron', cop)

result = tally()
