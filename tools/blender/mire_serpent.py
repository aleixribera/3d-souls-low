# The Mire Serpent, a summon (the ability of the same name, design/abilities/mire-serpent.md): a long eel-like serpent of
# black water that rises from a pool under the boss and coils round its body. No skeleton: js/summon-coil.js lays twelve
# copies of one body segment along a helix round the enemy (stretching each along its length to fit the helix and
# narrowing them toward the tail), then the head on its own pivot at the top, the jaw hinged under it.
# Pieces, each at its own pivot's origin (game axes: x = its left, y up, z forward, written to Blender through G()):
#   seg   a body segment 1 m long, centred on the origin along z, 0.34 m thick; the drawing scales it.
#   head  the head, its neck at the origin, pointing +z.   jaw  the lower jaw, hinged at (0, -.05, .06) (JAW below).
# The look: smooth glossy black water (`body`); a ridge of tall, thin, hard-edged spines down the back and two long
# fin-frills behind the blunt eyeless head (`spine`: the game makes them glow blue); one row of needle teeth (`tooth`).
# About 2,400 triangles as drawn (12 segments and the head).
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob, bent_spike
from snow_lib import tube as stube
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'body': (0.043, 0.051, 0.071), 'spine': (0.56, 0.72, 0.86), 'tooth': (0.9, 0.92, 0.95)}, prefix='serpent:')

JAW = (0, -.05, .06)

# ---- a body segment: a soft oval tube, overlapping its neighbours a little; three spines on its back ------------------
def seg(bm):
    stube(bm, [(0, 0, -.56), (0, .005, -.2), (0, .005, .2), (0, 0, .56)], [.16, .17, .17, .16], 9, ovals=[(1.1, .9)] * 4)
hard('seg__body', seg)
def seg_spines(bm):
    for k, (z, h) in enumerate(((-.33, .2), (0, .27), (.33, .22))):
        bent_spike(bm, (0, .12, z), (0, .12 + h, z - .12), .03, (0, 0, .02), sides=3)
hard('seg__spine', seg_spines, smooth=False)

# ---- the head: blunt, eyeless, a wide mouth; the frills behind it; the upper teeth --------------------------------------
def head(bm):
    stube(bm, [(0, 0, -.12), (0, .02, .08), (0, .03, .26), (0, .0, .42), (0, -.03, .48)], [.15, .16, .14, .09, .03], 9,
          ovals=[(1.1, .9), (1.25, .8), (1.3, .65), (1.2, .55), (1, .5)])
hard('head__body', head)
def frills(bm):
    for s in (1, -1):
        def at(u, v, s=s):
            z = .1 - .5 * u; out = .12 + .3 * v * math.sin(math.pi * (u * .8 + .2))
            return (s * out, .05 + .2 * v * (1 - u * .5), z - .05 * v)
        sheet(bm, 4, 2, at, ragged=.03, seed=5 + s)
hard('head__spine', frills, thick=.008, outward=lambda c: (0, c.y, c.z), smooth=False)
def upper_teeth(bm):
    for k in range(7):
        a = (k / 6 - .5) * 2.2; x = math.sin(a) * .13; z = .28 + math.cos(a) * .17
        bent_spike(bm, (x, -.04, z), (x, -.1, z + .01), .009, sides=3)
hard('head__tooth', upper_teeth)
def jaw(bm):
    stube(bm, [(0, -.05, .0), (0, -.08, .22), (0, -.07, .42)], [.1, .1, .03], 8, ovals=[(1.3, .45), (1.3, .4), (1, .4)])
hard('jaw__body', jaw)
def lower_teeth(bm):
    for k in range(6):
        a = (k / 5 - .5) * 2.0; x = math.sin(a) * .11; z = .26 + math.cos(a) * .14
        bent_spike(bm, (x, -.06, z), (x, -.005, z + .01), .008, sides=3)
hard('jaw__tooth', lower_teeth)

result = tally()
