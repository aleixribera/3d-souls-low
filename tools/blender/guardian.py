# The Stone Guardian, the summon of the Stone Guardian ability (pass 78): a tomb effigy that wakes. One rigid mesh per game
# bone (js/rig.js skeleton at scale 1, MODEL_DEFS.stoneGuardian), named guardian:<bone>__<material slot>, so the summon's
# key poses, its walk and its strike drive it (js/summon-figures.js).
# Rest pose: upright, arms hanging (the model's posture bends the elbows in the game).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.38, y 1.55,
# elbows y 1.25, wrists y .95 (the right fist closed, empty); hips x +-.15, y .90, knees .45;
# loinF (0, .93, .16) and loinB (0, .93, -.16) for the two carved panels of its tabard.
# The look: a knight carved for a tomb, its stone come awake. A deep hood instead of a helm, the face inside it smooth and
# dark with two slits of cold light; a mantle over squared shoulders of cut stone blocks; a faceted breast split by a
# glowing crack; a heavy tabard carved in folds; legs and arms in stone drums bound at the knees and elbows by rings of
# light. No sword (pass 141, design/abilities/stone-guardian.md): a tower shield of cut stone on its left arm is its
# weapon, carved with a ring-cross, blue runes in its seams; it bashes and slams with it. Three slots, drawn by the summon's shader (VIS.abilityFx.guardian.slots): `stone` (pale carved
# stone), `worn` (darker, weathered stone: the face, the tabard, the joints, the shield's frame) and `rune` (the light).
# No enemy wears this: a summon must never be mistaken for a foe.
# Budget: about 3,000 triangles.
import sys, math
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'stone': (0.62, 0.6, 0.56), 'worn': (0.36, 0.35, 0.33), 'rune': (0.6, 0.85, 1.0)}, prefix='guardian:')

SX, EL, WR = .38, 1.25, .95
OCT = math.pi / 8   # an eight-sided loft turned this far shows a flat face to the front: carved, not turned

def facet(bm, rows, sides=8, cap=True):
    return loft(bm, rows, sides, cap=cap, a0=OCT, a1=OCT + math.tau)

def lerp_rows(rows, y):
    """rows: (y, *values) top to bottom; the values linearly interpolated at height y."""
    if y >= rows[0][0]: return rows[0][1:]
    for r0, r1 in zip(rows, rows[1:]):
        if r1[0] <= y <= r0[0]:
            f = (y - r0[0]) / (r1[0] - r0[0]); return tuple(a + (b - a) * f for a, b in zip(r0[1:], r1[1:]))
    return rows[-1][1:]

def band(bm, y, cx, cz, r, h=.022, sides=10):   # a ring of light round a joint, a little proud of the stone
    loft(bm, [(y + h / 2, cx, cz, r, r), (y - h / 2, cx, cz, r, r)], sides, cap=False)

def slab(bm, outline, z0, z1):
    """A prism: outline (x, y) points counter-clockwise seen from the front, from the back face z0 to the front z1."""
    back = [bm.verts.new(G(x, y, z0)) for x, y in outline]
    front = [bm.verts.new(G(x, y, z1)) for x, y in outline]
    bm.faces.new(front); bm.faces.new(list(reversed(back)))
    n = len(outline)
    for k in range(n):
        j = (k + 1) % n; bm.faces.new((back[k], back[j], front[j], front[k]))

# ---- head: a deep hood, the face inside it smooth and dark, two slits of light ------------------------------------------
HC = (0, 1.84, -.012)
def hood(bm):
    def peak(p, a, e):   # the crown drawn forward to a blunt point, the hem flaring onto the mantle
        up = max(0.0, math.sin(e)); flare = max(0.0, -e) * .5
        return (p.x * (1 + flare), p.y + .03 * up * up, p.z * (1 + flare) + .05 * up ** 3)
    shell(bm, HC, .168, .2, .182, -.42, math.pi / 2 - .02, .78, math.tau - .78, nu=14, nv=6, warp=peak)
hard('head__stone', hood, thick=.03)
hard('head__worn', lambda bm: blob(bm, (0, 1.8, .015), .118, (.88, 1.12, 1.0), 2))   # the face, set back in the hood
def eyes(bm):
    for s in (1, -1):
        blob(bm, (s * .043, 1.825, .128), .02, (1.7, .42, .55), 1)
hard('head__rune', eyes)

# ---- neck ---------------------------------------------------------------------------------------------------------------
hard('neck__worn', lambda bm: facet(bm, [(1.73, 0, -.01, .085, .085), (1.6, 0, -.01, .1, .1)]))

# ---- chest: a faceted breast, a mantle over the shoulders, the crack of light down the front ---------------------------
TORSO = [(1.64, 0, -.012, .2, .15), (1.56, 0, .0, .3, .19), (1.42, 0, .02, .3, .205), (1.28, 0, .022, .27, .19),
         (1.15, 0, .012, .235, .17), (1.08, 0, .0, .22, .16)]
hard('chest__stone', lambda bm: facet(bm, TORSO))
def mantle(bm):
    loft(bm, [(1.76, 0, -.025, .125, .12), (1.68, 0, -.03, .22, .19), (1.6, 0, -.035, .3, .235), (1.51, 0, -.04, .33, .255)],
         14, cap=False)
hard('chest__worn', mantle, thick=.032)
def front_z(y):   # the breast's flat front at height y
    cz, rx, rz = lerp_rows([(r[0], r[2], r[3], r[4]) for r in TORSO], y)
    return cz + rz * math.cos(OCT)
def crack(bm):   # from under the mantle down the breast, jagged, forking once
    path = [(.05, 1.5), (.02, 1.44), (.055, 1.38), (.0, 1.31), (.035, 1.24), (-.02, 1.17)]
    tube(bm, [(x, y, front_z(y) + .002) for x, y in path], [.011, .01, .01, .009, .008, .006], 4)
    fork = [(.055, 1.38), (.1, 1.33), (.12, 1.27)]
    tube(bm, [(x, y, front_z(y) - .004 * (x > .09)) for x, y in fork], [.008, .007, .004], 4)
hard('chest__rune', crack)

# ---- spin: the girdle and the hips ---------------------------------------------------------------------------------------
hard('spin__worn', lambda bm: facet(bm, [(1.13, 0, .005, .238, .176), (1.05, 0, .005, .245, .182)]))
hard('spin__stone', lambda bm: (facet(bm, [(1.05, 0, .0, .228, .168), (.9, 0, .0, .238, .178), (.83, 0, .0, .215, .16)]),
                                blob(bm, (0, 1.09, .19), .05, (1.25, .95, .5), 1)))   # the girdle's carved knot

# ---- the tabard: a front and a back panel carved in folds, each on its own bone ----------------------------------------
def panel(z, sign, w, ln, folds):
    def build(bm):
        def at(u, v):
            return ((u - .5) * w * (1 + .12 * v), 1.05 - ln * v, z + sign * (.02 * v + .014 * math.sin(u * math.pi * folds) * (.4 + v)))
        sheet(bm, 6, 4, at)
    return build
hard('loinF__worn', panel(.195, 1, .34, .56, 4), thick=.03)
hard('loinB__worn', panel(-.19, -1, .38, .64, 5), thick=.03)

# ---- arms: squared blocks of cut stone on the shoulders, stone drums, rings of light at the elbows, stone fists ---------
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    hard(f'arm{n}__worn', lambda bm, x=x: facet(bm, [(1.6, x, 0, .094, .094), (1.42, x, 0, .088, .088), (EL + .03, x, 0, .079, .079)]))
    def block(bm, x=x, s=s):   # the shoulder: a carved pauldron, a heavy dome over two lames, faceted like the rest
        side = s * math.pi / 2; cx = s * .36
        def slope(p, a, e):
            d = (p.x - cx) * s
            return (p.x, p.y - .1 * max(0, d) * (1 - .5 * math.sin(e)) + .04 * max(0, -d), p.z)
        shell(bm, (cx, 1.575, -.005), .17, .14, .17, 0, math.pi / 2, 0, math.tau, nu=8, nv=2, warp=slope)
        for k in range(2):   # two lames under the dome, open on the inside
            y = 1.53 - k * .065; r = .125 - .006 * k
            loft(bm, [(y, x + s * (.025 + .008 * k), -.005, r, r * 1.04), (y - .08, x + s * (.035 + .01 * k), -.005, r + .016, (r + .016) * 1.04)],
                 6, cap=False, a0=side - 2.0, a1=side + 2.0)
    hard(f'arm{n}__stone', block, thick=.022)
    hard(f'elbow{n}__stone', lambda bm, x=x: facet(bm, [(EL + .015, x, 0, .076, .076), (EL - .05, x, 0, .092, .092), (WR + .1, x, 0, .083, .083),
                                                        (WR + .035, x, 0, .072, .072)]))
    hard(f'elbow{n}__rune', lambda bm, x=x: band(bm, EL + .02, x, 0, .085), outward=(x, EL, 0))
    def fist(bm, x=x, s=s):   # closed round a grip along z through the wrist
        blob(bm, (x + s * .012, WR - .045, .005), .066, (.68, 1.0, 1.12), 2)
        blob(bm, (x - s * .03, WR - .03, .05), .026, (.8, 1.3, .8), 1)   # the thumb over the grip
    hard(f'elbow{n}__worn', fist)

# ---- legs: faceted stone thighs and greaves, rings of light at the knees, block feet ------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    hard(f'leg{n}__stone', lambda bm, hx=hx: facet(bm, [(.98, hx, -.01, .128, .132), (.72, hx * 1.05, .0, .118, .122), (.49, hx, .01, .098, .103)]))
    hard(f'knee{n}__rune', lambda bm, hx=hx: band(bm, .465, hx, .006, .101), outward=(hx, .45, 0))
    hard(f'knee{n}__stone', lambda bm, hx=hx: facet(bm, [(.45, hx, .006, .094, .098), (.31, hx, .0, .108, .113), (.16, hx, .0, .09, .094),
                                                         (.11, hx, .0, .096, .1)]))
    hard(f'knee{n}__worn', lambda bm, hx=hx: loft(bm, [(.125, hx, .05, .1, .2), (.0, hx, .06, .11, .225)], 4, cap=True,
                                                  a0=math.pi / 4, a1=math.pi / 4 + math.tau))

# ---- the tower shield, on the left forearm: a tall slab of cut stone (1.8 m by .9 m in the game, at the summon's scale
# 1.37), its rim a raised frame, a carved panel with a ring-cross, blue runes cut into its seams. It is its weapon. -------
SCX, SY0, SY1, SW = .4, .1, 1.42, .33    # its middle, its foot, its top, its half-width
ZB, ZF = .2, .28                         # its back and front
def outline(cx, y0, y1, hw, taper=.025):
    """Counter-clockwise seen from the front: the foot, the right side up, the top's shallow peak, the left side down."""
    return [(cx - hw, y0), (cx + hw, y0), (cx + hw + taper, y1 - .1), (cx + hw * .55, y1), (cx, y1 + .035), (cx - hw * .55, y1), (cx - hw - taper, y1 - .1)]
hard('elbowL__stone.1', lambda bm: slab(bm, outline(SCX, SY0, SY1, SW), ZB, ZF))   # the slab, its edge a frame round the panel
CX, CY, ZP = SCX, 1.02, ZF + .012   # the cross's heart; the panel's face
hard('elbowL__worn.1', lambda bm: slab(bm, outline(SCX, SY0 + .06, SY1 - .05, SW - .055, .02), ZF - .004, ZP))   # the panel, darker, a little proud
def relief(bm):   # a ring-cross standing out of the panel, its arms broad, and a boss of stone at its heart
    slab(bm, [(CX - .045, .3), (CX + .045, .3), (CX + .04, 1.3), (CX - .04, 1.3)], ZP - .002, ZP + .03)
    slab(bm, [(CX - .24, CY - .042), (CX + .24, CY - .042), (CX + .24, CY + .042), (CX - .24, CY + .042)], ZP - .002, ZP + .03)
    blob(bm, (CX, CY, ZP + .035), .07, (1, 1, .5), 1)
hard('elbowL__stone.2', relief)
def runes(bm):   # the ring of light behind the cross, runes cut down the panel's seams and across its foot
    z = ZP + .006
    tube(bm, [(CX + .16 * math.cos(math.tau * k / 24), CY + .16 * math.sin(math.tau * k / 24), z) for k in range(25)], [.014] * 25, 4)
    for sd in (1, -1):
        x = CX + sd * (SW - .075)
        for k in range(5):
            y0 = .32 + k * .2
            tube(bm, [(x, y0, z), (x + sd * .02, y0 + .06, z), (x, y0 + .12, z)], [.007, .007, .007], 4)
    for k, w in enumerate((.18, .12)):
        tube(bm, [(CX - w, .22 + k * .05, z), (CX + w, .22 + k * .05, z)], [.007, .007], 4)
hard('elbowL__rune.1', runes)

result = tally()
