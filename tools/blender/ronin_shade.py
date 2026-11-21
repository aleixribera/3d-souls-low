# The Ronin Shade, the summon of the Ronin Shade ability (design/abilities/ronin-shade.md): a lean wandering ghost
# swordsman who steps in beside its holder and duels the boss. One rigid mesh per game bone (js/rig.js skeleton at
# scale 1, MODEL_DEFS.roninShade), named ronin:<bone>__<material slot>[.n], each built at its bone's absolute rest place,
# so the summon's key poses (roninDraw, roninCross, its guard and its deflect) drive it (js/summon-figures.js).
# Rest pose: upright, arms hanging. Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest (the Bone Archer's proportions): spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0);
# arms at x +-.30, y 1.55, elbows y 1.25, wrists y .95; hips x +-.13, y .90, knees .45; loinF (0, .93, .14) and loinB
# (0, .93, -.14) for the coat's skirts; capeA (0, 1.54, -.14) and capeB (0, 1.12, -.14) for the cloak, its two halves.
# The look: a wide, shallow straw hat (1.0 m across) that hides the face; a plain wrapped coat with wide sleeves, a sash,
# wide trousers, straw sandals; a tattered cloak hanging from the shoulders to the shins; a long single-edged blade
# (1.1 m) in the right fist and its scabbard through the sash on the left hip. No crest, no hood, no scarf, so it is
# never mistaken for the player, and nothing an enemy wears.
# Slots, drawn by the figures' ink ghost shader (dark, translucent, bright at its edges): `cloth` (coat, cloak, trousers,
# the scabbard), `straw` (hat, sandals), `steel` (the blade's edge and the hat's rim: the game makes them glow).
# Budget: about 3,000 triangles.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from snow_lib import tube as stube
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'cloth': (0.05, 0.055, 0.07), 'straw': (0.55, 0.47, 0.3), 'steel': (0.95, 0.97, 0.98)}, prefix='ronin:')

SX, HX = .30, .13
FX, FY = -SX, .89          # the right fist, where the blade's grip passes through it

# ---- head: a dark head under the hat, and the hat ----------------------------------------------------------------------
def head(bm):
    blob(bm, (0, 1.75, .005), .105, (.95, 1.0, 1.05), 2)
    blob(bm, (0, 1.66, -.01), .07, (1.2, .8, 1.0), 1)   # the jaw and the coat's high collar behind it
hard('head__cloth', head)
def hat(bm):
    # a shallow cone, its top a small knot, its rim a flat brim turned down a little at the edge
    loft(bm, [(1.925, 0, -.01, .03, .03), (1.89, 0, -.01, .16, .16), (1.84, 0, -.01, .34, .34), (1.80, 0, -.01, .48, .48),
              (1.785, 0, -.01, .5, .5), (1.775, 0, -.01, .47, .47), (1.80, 0, -.01, .3, .3), (1.83, 0, -.01, .12, .12)], sides=18)
hard('head__straw', hat, smooth=False)
def hat_rim(bm):
    pts = [(math.sin(k / 24 * math.tau) * .5, 1.782, -.01 + math.cos(k / 24 * math.tau) * .5) for k in range(25)]
    stube(bm, pts, [.007] * 25, 4, cap=False)
hard('head__steel', hat_rim)

def neck(bm):
    stube(bm, [(0, 1.58, -.01), (0, 1.72, .0)], [.055, .05], 6)
hard('neck__cloth', neck)

# ---- chest: the wrapped coat, its collar crossing left over right ------------------------------------------------------
def coat(bm):
    loft(bm, [(1.0, 0, 0, .15, .11), (1.2, 0, .005, .16, .12), (1.4, 0, .01, .18, .13), (1.53, 0, 0, .2, .12), (1.6, 0, -.01, .12, .09)], sides=12)
hard('chest__cloth', coat)
def collar(bm):
    stube(bm, [(-.08, 1.62, .04), (-.02, 1.5, .12), (.06, 1.32, .14), (.12, 1.12, .12)], [.016, .016, .015, .014], 4)
    stube(bm, [(.08, 1.62, .04), (.04, 1.54, .1)], [.016, .015], 4)
hard('chest__cloth.1', collar)
# the cloak's shoulders: a ragged capelet, open at the front
def capelet(bm):
    def at(u, v):
        a = .6 + u * (math.tau - 1.2); y = 1.66 - .2 * v; r = .14 + .14 * v
        return (math.sin(a) * (r + .06), y, -.01 + math.cos(a) * r * .8)
    sheet(bm, 12, 2, at, ragged=.06, seed=7)
hard('chest__cloth.2', capelet, thick=.012, outward=lambda c: (0, c.y, -.01))

# ---- spin: the sash, the hips, the scabbard through the sash on the left -----------------------------------------------
def hips(bm):
    loft(bm, [(.86, 0, 0, .17, .12), (.95, 0, 0, .165, .115), (1.04, 0, 0, .155, .11)], sides=12)
    loft(bm, [(.95, 0, 0, .168, .118), (1.01, 0, 0, .162, .114)], sides=12)   # the sash
    stube(bm, [(.1, .98, .13), (.14, .9, .14), (.13, .84, .15)], [.02, .018, .01], 4)   # its knot's tail
hard('spin__cloth', hips)
def scabbard(bm):
    stube(bm, [(.2, .99, .25), (.18, .96, .05), (.15, .9, -.25), (.12, .82, -.6), (.11, .79, -.72)], [.024, .022, .02, .018, .016], 6,
          ovals=[(1, .6)] * 5)
hard('spin__cloth.1', scabbard)

# ---- the coat's skirts, front and back --------------------------------------------------------------------------------
def skirt(z, sign, seed):
    def build(bm):
        def at(u, v):
            x = (u - .5) * .36 * (1 + .2 * v)
            return (x, .9 - .32 * v, z * math.sqrt(max(.25, 1 - (x / .3) ** 2)) + sign * .03 * v)
        sheet(bm, 4, 2, at, ragged=.05, seed=seed)
    return build
hard('loinF__cloth', skirt(.135, 1, 11), thick=.01, outward=lambda c: (0, c.y, 0))
hard('loinB__cloth', skirt(-.135, -1, 12), thick=.01, outward=lambda c: (0, c.y, 0))

# ---- the cloak's back: the upper half on capeA, the tattered lower half on capeB, to the shins ------------------------
def cloak_top(bm):
    def at(u, v):
        return ((u - .5) * .56 * (1 + .25 * v), 1.5 - .36 * v, -.17 - .05 * math.sin(u * math.pi) - .03 * v - .02 * math.sin(u * math.pi * 4) * v)
    sheet(bm, 6, 3, at)
hard('capeA__cloth', cloak_top, thick=.012, outward=(0, 1.35, 0))
def cloak_hem(bm):
    for k, (u0, u1, ln) in enumerate(((0, .22, .74), (.2, .42, .84), (.4, .62, .7), (.6, .82, .86), (.8, 1, .72))):
        def at(u, v, u0=u0, u1=u1, ln=ln):
            w = u0 + (u1 - u0) * u
            return ((w - .5) * .7 * (1 + .18 * v), 1.15 - ln * v, -.2 - .05 * math.sin(w * math.pi) - .06 * v)
        sheet(bm, 2, 3, at, ragged=.12, seed=21 + k)
hard('capeB__cloth', cloak_hem, thick=.012, outward=lambda c: (0, c.y, 0))

# ---- arms: wide sleeves; the right fist round the grip -----------------------------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    def upper(bm, x=x):
        loft(bm, [(1.57, x * .96, -.005, .065, .06), (1.42, x, 0, .075, .07), (1.27, x, .005, .085, .08)], sides=8)
    hard(f'arm{n}__cloth', upper)
    def lower(bm, x=x, s=s):
        loft(bm, [(1.27, x, .005, .082, .078), (1.12, x, .01, .1, .095), (1.0, x, .015, .11, .1)], sides=8)   # the open sleeve
        stube(bm, [(x, 1.12, .005), (x, .97, .005)], [.03, .028], 6)          # the forearm in it
        blob(bm, (x, .9, .01), .042, (.8, 1.1, 1.0), 1)                       # the fist
    hard(f'elbow{n}__cloth', lower)

# ---- the blade in the right fist: a long single-edged sword pointing forward, a disc guard ----------------------------
def blade_body(bm):
    stube(bm, [(FX, FY, -.16), (FX, FY, .1)], [.017, .017], 6)                          # the grip, through the fist
    stube(bm, [(FX, FY, .1), (FX, FY, .125)], [.045, .045], 10, ovals=[(1, .8)] * 2)     # the guard
hard('elbowR__cloth.1', blade_body)
def blade(bm):
    # flat, single-edged, a slight curve up to the tip; the edge on the lower side
    rows = []
    for k in range(9):
        t = k / 8; z = .13 + t * .97; y = FY + .03 * t * t
        w = .022 * (1 - .55 * t * t)
        back, edge = y + w * .45, y - w * (1 - t * .2)
        if k == 8: back, edge = y + .002, y - .004
        rows.append([bm.verts.new(G(FX, back, z)), bm.verts.new(G(FX + .005, y, z)), bm.verts.new(G(FX, edge, z)), bm.verts.new(G(FX - .005, y, z))])
    tip = bm.verts.new(G(FX, FY + .03, 1.14))
    for a, b in zip(rows, rows[1:]):
        for i in range(4):
            j = (i + 1) % 4; bm.faces.new((a[i], a[j], b[j], b[i]))
    for i in range(4): bm.faces.new((rows[-1][i], rows[-1][(i + 1) % 4], tip))
    bm.faces.new(list(reversed(rows[0])))
hard('elbowR__steel', blade, smooth=False)

# ---- legs: wide trousers, bare-ish shins wrapped, straw sandals -------------------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * HX
    def thigh(bm, hx=hx):
        loft(bm, [(.92, hx * .8, 0, .1, .1), (.7, hx, .0, .115, .11), (.47, hx, .0, .125, .12)], sides=8)
    hard(f'leg{n}__cloth', thigh)
    def shin(bm, hx=hx):
        loft(bm, [(.47, hx, .0, .125, .12), (.3, hx, .0, .13, .125), (.17, hx, .0, .1, .1)], sides=8)   # the trousers' wide legs
        loft(bm, [(.17, hx, .0, .05, .05), (.06, hx, .0, .045, .05)], sides=6)                             # the wrapped ankle
        blob(bm, (hx, .045, .07), .05, (.75, .5, 1.6), 1)                                                   # the foot
    hard(f'knee{n}__cloth', shin)
    def sandal(bm, hx=hx):
        loft(bm, [(.005, hx, .06, .055, .14), (.025, hx, .06, .055, .14)], sides=10)
        stube(bm, [(hx - .045, .03, .13), (hx, .07, .1), (hx + .045, .03, .13)], [.008, .008, .008], 4)   # the thong
    hard(f'knee{n}__straw', sandal)

result = tally()
