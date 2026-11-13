# The Shield Warden, the Ironbound gaoler of the Sunken Keep. One rigid mesh per game bone (js/rig.js skeleton at scale 1,
# MODEL_DEFS.ironWarden), named warden:<bone>__<material slot>, so every key pose, the walk and the death drive it.
# Rest pose: upright, arms hanging (the model's posture bends the elbows in the game).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.38, y 1.55,
# elbows y 1.25, wrists y .95 (the greatsword's grip runs along z through the right wrist; the kit's greatshield hangs
# off the left forearm); hips x +-.15, y .90, knees .45.
# The look (STORY.md: the king's old household guard, set to hold the deep gaol): heavy blued plate. A tall flat-topped
# tower helm with a cross of slits and a riveted brow, a standing collar, a broad squared cuirass with a plackart over
# the belly, round pauldrons (the sword arm's the larger, spiked), mail at the joints, vambraces and dark gauntlets,
# tassets and a ring of gaol keys at the belt, cuisses, knee cops, greaves and dark sabatons.
# Enemy budget: about 3,000 triangles with the greatshield and the greatsword, which the kit still builds.
import sys, math
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'plate': (0.42, 0.46, 0.52), 'guard': (0.3, 0.32, 0.36), 'mail': (0.28, 0.29, 0.31), 'leather': (0.25, 0.22, 0.18),
       'rust': (0.4, 0.3, 0.22), 'dark': (0.03, 0.03, 0.035)}, prefix='warden:')

SX, EL, WR = .38, 1.25, .95
SLIT = 1.842   # the eye slit: MODEL_DEFS.ironWarden.eyes sit in it

# ---- head: a tall tower helm, flat-topped and slightly tapered, a riveted brow band and a cross of slits ---------------------
HELM = [(1.64, 0, -.01, .132, .142), (1.72, 0, -.008, .14, .152), (1.86, 0, -.004, .142, .156), (1.96, 0, -.006, .134, .146),
        (2.0, 0, -.008, .118, .128)]
def helm(bm):
    loft(bm, HELM, 10, push=lambda a, y: .1 * max(0.0, math.cos(a)) ** 6 * (y < 1.99))   # a blunt ridge down the face
    loft(bm, [(SLIT + .05, 0, -.004, .151, .165), (SLIT + .024, 0, -.004, .152, .166)], 10, cap=False)   # the brow band
hard('head__plate', helm)

def slits(bm):   # the eye slit across the face and the breathing slit down the middle, a cross
    def on(a, y, out=.004):
        c, rx, rz = -.004, .142, .156
        r = 1 + .1 * max(0.0, math.cos(a)) ** 6
        return G(math.sin(a) * rx * r + math.sin(a) * out, y, c + math.cos(a) * rz * r + math.cos(a) * out)
    n = 8
    top = [bm.verts.new(on(-.95 + 1.9 * i / n, SLIT + .008)) for i in range(n + 1)]
    bot = [bm.verts.new(on(-.95 + 1.9 * i / n, SLIT - .008)) for i in range(n + 1)]
    for i in range(n): bm.faces.new((top[i], top[i + 1], bot[i + 1], bot[i]))
    for (a0, a1) in ((-.07, -.025), (.025, .07)):   # the breathing slit, either side of the face's ridge
        q = [bm.verts.new(on(a, y, .006)) for a, y in ((a0, SLIT - .03), (a1, SLIT - .03), (a1, 1.71), (a0, 1.71))]
        bm.faces.new(q)
hard('head__dark', slits, outward=(0, 1.8, 0))

def rivets(bm):   # rivets round the brow band
    for k in range(4):
        a = -1.8 + 3.6 * k / 3
        loft(bm, [(SLIT + .043, math.sin(a) * .162, -.004 + math.cos(a) * .176, .007, .007), (SLIT + .031, math.sin(a) * .162, -.004 + math.cos(a) * .176, .007, .007)], 4)
hard('head__guard', rivets)

# ---- neck: mail under a standing collar -------------------------------------------------------------------------------------
hard('neck__mail', lambda bm: loft(bm, [(1.7, 0, -.01, .1, .1), (1.6, 0, -.005, .11, .11)], 6, cap=False), thick=.008)

# ---- chest: the cuirass, broad and squared, a plackart over the belly, the standing collar ---------------------------------
def ridge(a, y): return .06 * max(0.0, math.cos(a)) ** 8 * max(0, min(1, (1.58 - y) / .12))
def cuirass(bm):
    loft(bm, [(1.62, 0, -.01, .22, .14), (1.57, 0, .0, .3, .18), (1.45, 0, .02, .3, .2), (1.32, 0, .03, .28, .205),
              (1.2, 0, .02, .235, .18), (1.1, 0, .005, .21, .16)], 10, cap=True, push=ridge)
    loft(bm, [(1.6, 0, -.012, .25, .17), (1.69, 0, -.016, .17, .15), (1.73, 0, -.018, .15, .14)], 12, cap=False)   # the collar
hard('chest__plate', cuirass)
def plackart(bm):   # two lames over the belly, overlapping upward
    for k, (y0, y1) in enumerate(((1.31, 1.21), (1.215, 1.11))):
        loft(bm, [(y0, 0, .04 - .012 * k, .27 - .03 * k, .2 - .01 * k), (y1, 0, .036 - .012 * k, .25 - .03 * k, .19 - .01 * k)], 6, cap=False,
             a0=-1.35, a1=1.35, push=lambda a, y: ridge(a, 1.4) * .6)
hard('chest__guard', plackart, thick=.01)

# ---- spin: the belt, a mail skirt, tassets front and side, the gaol keys ---------------------------------------------------
hard('spin__leather', lambda bm: loft(bm, [(1.12, 0, .005, .215, .165), (1.075, 0, .005, .22, .17)], 8, cap=False), thick=.012)
hard('spin__mail', lambda bm: loft(bm, [(1.08, 0, .0, .225, .17), (.9, 0, .0, .245, .185), (.8, 0, -.005, .25, .19)], 8, cap=False), thick=.008)
def fauld(bm):
    loft(bm, [(1.09, 0, .006, .23, .175), (1.0, 0, .01, .25, .19)], 8, cap=False, a0=-2.2, a1=2.2)
    loft(bm, [(1.01, 0, .01, .245, .186), (.92, 0, .012, .262, .2)], 8, cap=False, a0=-2.0, a1=2.0)
hard('spin__plate', fauld, thick=.011)
def keys(bm):   # an iron ring of long keys on the left hip
    cx, cy, cz = .24, 1.02, .02
    loft(bm, [(cy + .045, cx, cz, .012, .045), (cy - .045, cx, cz, .012, .045)], 6, cap=False)
    for k, (dz, ln) in enumerate(((-.025, .16), (.0, .2), (.028, .14))):
        tube(bm, [(cx + .004, cy - .04, cz + dz), (cx + .008, cy - .04 - ln, cz + dz * 1.4)], [.007, .006], 4)
        loft(bm, [(cy - .03 - ln, cx + .008, cz + dz * 1.4 + .012, .004, .012), (cy - .055 - ln, cx + .008, cz + dz * 1.4 + .012, .004, .012)], 4)   # the bit
hard('spin__rust', keys)

# ---- arms: mail sleeves under round pauldrons (the right the larger, spiked), couters, vambraces and gauntlets ----------------
for s, n, f in ((1, 'L', 1.0), (-1, 'R', 1.2)):
    x = s * SX
    hard(f'arm{n}__mail', lambda bm, x=x: loft(bm, [(1.58, x, 0, .075, .075), (1.42, x, 0, .07, .07), (EL + .03, x, 0, .064, .064)], 7, cap=True))
    def pauldron(bm, x=x, s=s, f=f):
        side = s * math.pi / 2; cx = s * .35
        def slope(p, a, e):
            d = (p.x - cx) * s
            return (p.x, p.y - .12 * max(0, d) * (1 - .5 * math.sin(e)) + .05 * max(0, -d), p.z)
        shell(bm, (cx, 1.56, -.005), .14 * f, .13 * f, .15 * f, 0, math.pi / 2, 0, math.tau, nu=8, nv=2, warp=slope)
        for k in range(2):   # two lames under the cop, open on the inside
            y = 1.53 - .02 * f - k * .05 * f; r = (.098 - .004 * k) * f
            loft(bm, [(y, x + s * (.02 + .006 * k), -.005, r, r * 1.05), (y - .064 * f, x + s * (.028 + .008 * k), -.005, r + .012, (r + .012) * 1.05)],
                 6, cap=False, a0=side - 2.0, a1=side + 2.0)
    hard(f'arm{n}__plate', pauldron, thick=.012)
    def vambrace(bm, x=x):
        loft(bm, [(EL + .05, x, -.008, .054, .054), (EL, x, -.02, .072, .076), (EL - .055, x, -.008, .062, .062),
                  (WR + .12, x, 0, .054, .056), (WR + .06, x, 0, .06, .062), (WR + .03, x, 0, .068, .07)], 8, cap=True)
    hard(f'elbow{n}__plate', vambrace)
    def gauntlet(bm, x=x, s=s):   # the fist closed round a grip along z through the wrist
        blob(bm, (x + s * .028, WR - .02, 0), .058, (.62, 1.0, 1.15), 1)
        for zf in (-.038, -.013, .013, .038):
            tube(bm, [(x + s * .038, WR - .026, zf), (x + s * .028, WR - .078, zf * 1.1), (x - s * .026, WR - .083, zf * 1.1), (x - s * .046, WR - .038, zf)],
                 [.018, .017, .015, .014], 5)
        tube(bm, [(x + s * .02, WR - .006, .057), (x - s * .015, WR, .07), (x - s * .046, WR - .01, .062)], [.017, .015, .013], 5)
    soft(f'elbow{n}__guard', gauntlet, 76, voxel=.0058)

def spikes(bm):   # three short spikes on the right pauldron's crown
    for k, (dx, dz) in enumerate(((-.03, -.06), (-.06, .0), (-.03, .06))):
        p = Vector((-.35 + dx, 1.6 + .04 * (k == 1), dz))
        tube(bm, [tuple(p), tuple(p + Vector((-.05, .07, dz * .3)))], [.017, .001], 4)
hard('armR__guard', spikes)

# ---- legs: mail under cuisses, knee cops, greaves, sabatons -------------------------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    soft(f'leg{n}__mail', lambda bm, hx=hx: tube(bm, [(hx, .97, -.01), (hx * 1.05, .72, .0), (hx, .5, .01)], [.12, .102, .082], 8), 52, voxel=.012)
    def cuisse(bm, hx=hx, s=s):
        c = s * .3   # over the front and the outside of the thigh
        loft(bm, [(.86, hx + s * .01, .006, .118, .12), (.6, hx + s * .006, .016, .098, .1)], 6, cap=False, a0=c - 1.5, a1=c + 1.5)
        def point(p, a, e): return (p.x, p.y, p.z + .025 * max(0, math.cos(a)) * max(0, 1 - abs(e)))
        shell(bm, (hx, .455, .045), .078, .078, .06, -1.1, 1.2, -1.4, 1.4, nu=4, nv=2, warp=point)
    hard(f'leg{n}__plate', cuisse, thick=.011)
    hard(f'knee{n}__plate', lambda bm, hx=hx: loft(bm, [(.43, hx, .005, .078, .08), (.33, hx, -.006, .088, .094), (.2, hx, .0, .072, .074), (.11, hx, .004, .068, .07)], 8, cap=True))
    def sabaton(bm, hx=hx):
        blob(bm, (hx, .085, -.005), .068, (1.0, .95, 1.1), 1)
        blob(bm, (hx, .06, .08), .065, (1.0, .82, 1.6), 1)
        blob(bm, (hx, .048, .185), .046, (1.0, .78, 1.1), 1)
        blob(bm, (hx, .045, -.055), .047, (1.0, .9, .8), 1)
    soft(f'knee{n}__guard', sabaton, 70, voxel=.008)

result = tally()
