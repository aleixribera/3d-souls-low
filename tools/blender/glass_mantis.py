# The Glass Mantis, a summon (the ability of the same name, design/abilities/glass-mantis.md): a tall mantis of clear
# faceted glass that stands over the boss and slices with two scythe forelegs. Not a rig figure: one rigid mesh per joint
# of its own, named mantis:<part>__<material slot>[.n], each built at its absolute rest place; js/summon-brutes.js hangs
# each on a pivot (BRUTE_JOINTS.mantis there, the same numbers as JOINT below) and moves it by hand.
# Game axes (x = its left, y up, z forward), written to Blender through G(). It stands reared: the abdomen low behind,
# the long thorax rising to a small triangular head, the scythes folded in front of it, four thin legs splayed wide.
# Joints at rest (x, y, z), parent:
#   body  (0, 1.0, 0)         root  (the waist: abdomen, thorax and the four legs' hips hang from it)
#   head  (0, 2.12, .34)      body
#   aLu   (+-.13, 1.78, .26)  body  (the scythe's upper half, from the shoulder down and forward)
#   aLl   (+-.17, 1.4, .62)   aLu   (the blade, folded back up from the elbow)
#   wL    (+-.07, 1.3, -.08)  body  (the folded wings over the abdomen; they flare when it strikes)
#   lL1   (+-.1, 1.0, .06)    body  (the middle legs)       lL2 (+-.1, .96, -.16) body (the hind legs)
# Slots: `glass` (the body: the game draws it clear and refracting-looking, bright at its facets), `edge` (the scythes'
# cutting edges and the spines: white), `eye` (the two compound eyes: blue). Faceted, flat-shaded. About 1,800 triangles.
# 2.4 m tall.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob, bent_spike
from snow_lib import tube as stube
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'glass': (0.62, 0.78, 0.86), 'edge': (0.95, 0.97, 0.98), 'eye': (0.35, 0.6, 0.95)}, prefix='mantis:')

JOINT = {'body': (0, 1.0, 0), 'head': (0, 2.12, .34), 'aLu': (.13, 1.78, .26), 'aLl': (.17, 1.4, .62),
         'wL': (.07, 1.3, -.08), 'lL1': (.1, 1.0, .06), 'lL2': (.1, .96, -.16)}

# ---- body: the segmented abdomen behind, the long thorax rising to the neck --------------------------------------------
def body(bm):
    stube(bm, [(0, 1.04, .02), (0, .98, -.25), (0, .9, -.55), (0, .82, -.85), (0, .76, -1.05), (0, .74, -1.15)],
          [.1, .19, .22, .19, .12, .03], 7, ovals=[(1.15, .85)] * 6)                                      # the abdomen
    stube(bm, [(0, .98, .06), (0, 1.25, .1), (0, 1.55, .16), (0, 1.8, .24), (0, 2.02, .3), (0, 2.14, .33)],
          [.1, .075, .06, .085, .05, .035], 6)                                                                   # the thorax
hard('body__glass', body, smooth=False)
def ridges(bm):
    for z, y, r in ((-.25, .98, .19), (-.55, .9, .22), (-.85, .82, .19)):                                  # segment rims
        stube(bm, [(0, y + .01, z + .015), (0, y - .01, z - .015)], [r * 1.06, r * 1.06], 7, ovals=[(1.15, .85)] * 2)
hard('body__glass.1', ridges, smooth=False)

# ---- head: a small triangle, the compound eyes at its corners, two antennae --------------------------------------------
def head(bm):
    stube(bm, [(0, 2.16, .3), (0, 2.12, .42), (0, 2.03, .5)], [.06, .055, .022], 5, ovals=[(2.2, .8), (1.7, .8), (1, 1)])
hard('head__glass', head, smooth=False)
def eyes(bm):
    for s in (1, -1): blob(bm, (s * .12, 2.17, .36), .045, (1, 1.15, 1), 1)
hard('head__eye', eyes, smooth=False)
def antennae(bm):
    for s in (1, -1): stube(bm, [(s * .04, 2.2, .38), (s * .14, 2.42, .46), (s * .2, 2.55, .4)], [.008, .006, .003], 3)
hard('head__edge', antennae)

# ---- the scythes: the upper arm forward and down from the shoulder; the blade folded back up, spined on its edge -------
for s, n in ((1, 'L'), (-1, 'R')):
    def upper(bm, s=s):
        stube(bm, [(s * .13, 1.78, .26), (s * .15, 1.6, .44), (s * .17, 1.4, .62)], [.05, .045, .04], 5, ovals=[(.7, 1.2)] * 3)
    hard(f'a{n}u__glass', upper, smooth=False)
    def upper_spines(bm, s=s):
        for k in range(4):
            t = .3 + k * .17; b = Vector((s * (.13 + .04 * t), 1.78 - .38 * t, .26 + .36 * t))
            bent_spike(bm, b + Vector((0, -.03, -.02)), b + Vector((0, -.06, -.11)), .012, sides=3)
    hard(f'a{n}u__edge', upper_spines)
    def blade(bm, s=s):
        # the tibia: a flat curved blade from the elbow back up toward the shoulder, its edge (inner, -y side) a ridge
        rows = []
        x = s * .17
        for k in range(8):
            t = k / 7
            p = Vector((x, 1.4 + .42 * t + .06 * math.sin(t * math.pi), .62 - .02 * t - .22 * t * t))
            w = .055 * (1 - .75 * t); th = .022 * (1 - .5 * t)
            rows.append([bm.verts.new(G(p.x, p.y + w * .4, p.z + w)), bm.verts.new(G(p.x + th, p.y, p.z)),
                         bm.verts.new(G(p.x, p.y - w * .4, p.z - w)), bm.verts.new(G(p.x - th, p.y, p.z))])
        tip = bm.verts.new(G(x, 1.84, .32))
        for a, b in zip(rows, rows[1:]):
            for i in range(4):
                j = (i + 1) % 4; bm.faces.new((a[i], a[j], b[j], b[i]))
        for i in range(4): bm.faces.new((rows[-1][i], rows[-1][(i + 1) % 4], tip))
        bm.faces.new(list(reversed(rows[0])))
    hard(f'a{n}l__glass', blade, smooth=False)
    def blade_edge(bm, s=s):
        x = s * .17
        pts = [(x, 1.4 + .42 * t + .06 * math.sin(t * math.pi) - .01, .62 - .02 * t - .22 * t * t - .055 * (1 - .75 * t) - .004)
               for t in (0, .25, .5, .75, 1)]
        stube(bm, pts, [.012, .011, .009, .006, .002], 3)                                                 # the white edge
        for k in range(4):                                                                                 # its teeth
            t = .15 + k * .2; y = 1.4 + .42 * t + .06 * math.sin(t * math.pi); z = .62 - .02 * t - .22 * t * t - .05 * (1 - .75 * t)
            bent_spike(bm, (x, y, z), (x, y - .03, z - .06), .01, sides=3)
    hard(f'a{n}l__edge', blade_edge)

# ---- wings: two long glass leaves folded flat over the abdomen ---------------------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    def wing(bm, s=s):
        def at(u, v):
            z = -.05 - 1.0 * v; w = .16 * math.sin(math.pi * min(1, v * 1.15 + .05)) + .02
            return (s * (.05 + w * u), 1.28 - .45 * v + .1 * u * (1 - v), z)
        sheet(bm, 2, 4, at)
    hard(f'w{n}__glass', wing, thick=.008, outward=lambda c: (0, c.y - .2, c.z), smooth=False)

# ---- legs: four thin legs, knee high and out, a sharp foot ---------------------------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    for idx, (hip, knee, foot) in ((1, ((.1, 1.0, .06), (.55, 1.25, .35), (.85, 0, .55))),
                                   (2, ((.1, .96, -.16), (.6, 1.2, -.5), (.9, 0, -.95)))):
        def leg(bm, hip=hip, knee=knee, foot=foot, s=s):
            h, k, f = [(s * p[0], p[1], p[2]) for p in (hip, knee, foot)]
            stube(bm, [h, k], [.028, .022], 5)
            stube(bm, [k, f], [.02, .006], 5)
        hard(f'l{n}{idx}__glass', leg, smooth=False)

result = tally()
