# The Lantern Spirit, a summon (the ability of the same name, js/data/abilities.js; design/abilities/lantern-spirit.md):
# a round paper lantern that floats at its holder's shoulder with an eye of blue flame inside. Rigid pieces named
# lantern:<part>__<slot>[.n], each built at its rest place round the lantern's middle (the origin); js/summon-lantern.js
# hangs each on a pivot (LANTERN_JOINTS there, the same numbers as JOINT below): the body, the flame inside it (it turns
# to look at the boss) and three streamers on swing bones under the base.
# Game axes (x = its left, y up, z forward), written to Blender through G().
# The look: slightly squashed, .45 m across and .6 m tall with its dark wooden cap and base; its ribs of dark bamboo
# standing proud of the paper so they read through the glow; one tear in the paper; three long paper streamers. Slots:
# `frame` (ink-dark ribs, cap, base), `paper` (lit from inside: it glows) and `flame` (the almond eye, white-hot).
# No face painted on it. About 900 triangles.
import sys, math
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'frame': (0.05, 0.05, 0.07), 'paper': (0.56, 0.72, 0.86), 'flame': (0.95, 0.96, 0.98)}, prefix='lantern:')
JOINT = {'body': (0, 0, 0), 'flame': (0, 0, 0), 's1': (.09, -.25, .02), 's2': (-.09, -.25, .02), 's3': (0, -.25, -.09)}
RX, RY = .225, .19   # the paper's half-width and half-height
RIBS = 8

def paper_r(y):   # the paper's radius at height y: a squashed sphere, a little flattened at the top and bottom
    t = max(0.0, 1 - (y / RY) ** 2)
    return RX * math.sqrt(t)

def paper(bm):
    rows = []
    for k in range(9):
        y = RY * .92 - k * (RY * 1.84 / 8)
        r = max(.06, paper_r(y))
        rows.append((y, 0, 0, r, r))
    loft(bm, rows, 16, cap=False)
hard('body__paper', paper, thick=.004)

def frame(bm):
    loft(bm, [(RY + .055, 0, 0, .085, .085), (RY + .02, 0, 0, .1, .1), (RY - .005, 0, 0, .095, .095)], 12, cap=True)   # the cap
    tube(bm, [(0, RY + .055, 0), (0, RY + .1, 0)], [.012, .008], 6)   # its knob
    loft(bm, [(-RY + .005, 0, 0, .095, .095), (-RY - .025, 0, 0, .1, .1), (-RY - .055, 0, 0, .08, .08)], 12, cap=True)   # the base
    for i in range(RIBS):   # the bamboo ribs, each a little proud of the paper, top to bottom
        a = math.tau * i / RIBS
        pts = []
        for k in range(9):
            y = RY * .95 - k * (RY * 1.9 / 8); r = max(.07, paper_r(y)) + .007
            pts.append((math.sin(a) * r, y, math.cos(a) * r))
        tube(bm, pts, [.007] * 9, 4)
    for y in (RY * .55, -RY * .55):   # two hoops round its middle
        r = paper_r(y) + .008
        tube(bm, [(math.sin(math.tau * k / 16) * r, y, math.cos(math.tau * k / 16) * r) for k in range(17)], [.006] * 17, 4)
hard('body__frame', frame)

def tear(bm):   # a torn flap of paper curling off its side, lit like the rest
    a = .9; y = -.02; r = paper_r(y)
    base = Vector((math.sin(a) * r, y, math.cos(a) * r))
    out = Vector((math.sin(a), 0, math.cos(a)))
    pts = [base + Vector((0, .05, 0)), base + out * .05 + Vector((.02, .03, 0)), base + out * .07 + Vector((.03, -.04, 0)), base + Vector((0, -.05, 0))]
    v = [bm.verts.new(G(*p)) for p in pts]
    bm.faces.new(v)
hard('body__paper.1', tear, thick=.003)

def eye(bm):   # the almond flame, its point up, set a little forward to look out through the paper
    blob(bm, (0, -.01, .03), .06, (.75, 1.6, .5), 2)
    blob(bm, (0, .1, .03), .02, (.6, 1.6, .5), 1)   # its tip
hard('flame__flame', eye)

for name in ('s1', 's2', 's3'):
    j = JOINT[name]
    def streamer(bm, j=j):   # a long paper strip hanging from the base, a little twisted
        def at(u, v):
            tw = .6 * v
            w = (u - .5) * .045
            return (j[0] + w * math.cos(tw), j[1] - .7 * v, j[2] + w * math.sin(tw) + .02 * math.sin(v * 3))
        sheet(bm, 2, 6, at)
    hard(f'{name}__paper', streamer, thick=.003)

result = tally()
