# The Undead Knight, the Ironbound's heavy. One rigid mesh per game bone (js/rig.js skeleton at scale 1,
# MODEL_DEFS.undeadKnight), named knight:<bone>__<material slot>, so every key pose, the walk and the death drive it.
# Rest pose: upright, arms hanging (the model's posture leans it in the game).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.39, y 1.55,
# elbows y 1.25, wrists y .95 (the greatsword's grip runs along z through the right wrist); hips x +-.15, y .90,
# knees .45.
# The look (the model's brief): full worn plate. A rounded close helm with a beaked visor over a broad gorget, a
# swelling ridged breastplate, great three-lamed pauldrons (the left the larger), mail at the joints, banded vambraces,
# dark gauntlets and sabatons, greaves with knee cops, tassets over dark brown trousers. No shield, no tabard.
# Enemy budget: about 3,000 triangles with the greatsword, which the kit still builds.
import sys, math
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'plate': (0.56, 0.57, 0.6), 'gauntlet': (0.36, 0.36, 0.38), 'mail': (0.3, 0.3, 0.32), 'trousers': (0.3, 0.22, 0.16),
       'leather': (0.3, 0.2, 0.13), 'dark': (0.03, 0.03, 0.035)}, prefix='knight:')

SX, EL, WR = .39, 1.25, .95
SLIT = 1.873   # the eye slit: MODEL_DEFS.undeadKnight.eyes sit in it

# ---- head: a rounded close helm, its visor drawn out into a blunt beak, a low comb over the crown ---------------------
def helm(bm):
    blob(bm, (0, 1.835, -.01), .15, (.92, 1.0, 1.04), 2)            # the skull of the helm
    blob(bm, (0, 1.79, .05), .112, (.95, .95, 1.0), 2)              # the visor, filling the face
    blob(bm, (0, 1.79, .13), .062, (.7, .9, 1.3), 1)                # the beak, below the slit
    blob(bm, (0, SLIT + .024, .1), .055, (1.85, .45, .9), 1)        # the brow over the slit
    blob(bm, (0, 1.71, -.04), .128, (1.08, .5, 1.05), 1)            # the flared lower rim at the nape
    tube(bm, [(0, 1.945, .11), (0, 1.995, .0), (0, 1.97, -.11), (0, 1.9, -.16)], [.012, .02, .018, .01], 5)   # the comb
soft('head__plate', helm, 236, voxel=.0065)

def ray_points(ob, pts, lift=.003):
    """Project game points onto the helm along rays toward its centre line, lifted a little off the surface."""
    mw = ob.matrix_world.inverted(); out = []
    for p in pts:
        o = G(p[0] * 3, p[1], p[2] * 3 + .02); t = G(0, p[1], -.01)
        lo, ld = mw @ o, (mw @ t - mw @ o).normalized()
        ok, loc, nor, _ = ob.ray_cast(lo, ld)
        out.append(Vector((loc.x, loc.z, -loc.y)) + Vector((nor.x, nor.z, -nor.y)) * lift if ok else Vector(p))
    return out

def slit(bm):   # a dark band across the visor: the eyes glow in it
    ob = bpy.data.objects['knight:head__plate']; cols = 9
    for (y0, y1, half) in ((SLIT + .007, SLIT - .007, .95),):
        top = ray_points(ob, [(math.sin(-half + 2 * half * i / cols) * .14, y0, math.cos(-half + 2 * half * i / cols) * .14) for i in range(cols + 1)])
        bot = ray_points(ob, [(math.sin(-half + 2 * half * i / cols) * .14, y1, math.cos(-half + 2 * half * i / cols) * .14) for i in range(cols + 1)])
        a = [bm.verts.new(G(*p)) for p in top]; b = [bm.verts.new(G(*p)) for p in bot]
        for i in range(cols): bm.faces.new((a[i], a[i + 1], b[i + 1], b[i]))
    # breathing holes down each cheek of the visor
    for s in (-1, 1):
        for k in range(3):
            y = 1.82 - k * .028
            c = ray_points(ob, [(s * .09 * .8, y, .11)])[0]
            q = [bm.verts.new(G(c.x + dx, c.y + dy, c.z)) for dx, dy in ((-.007, -.006), (.007, -.006), (.007, .006), (-.007, .006))]
            bm.faces.new(q)
hard('head__dark', slit, outward=(0, 1.82, 0))

# ---- neck: mail under the gorget ------------------------------------------------------------------------------------------
hard('neck__mail', lambda bm: loft(bm, [(1.73, 0, -.01, .085, .085), (1.6, 0, -.005, .095, .095)], 7, cap=False), thick=.008)

# ---- chest: the breastplate with its ridge and swell, the gorget over it --------------------------------------------------
def ridge(a, y): return .07 * max(0.0, math.cos(a)) ** 8 * max(0, min(1, (1.6 - y) / .15))
def cuirass(bm):
    loft(bm, [(1.62, 0, -.01, .2, .13), (1.565, 0, .0, .275, .17), (1.45, 0, .02, .275, .19), (1.32, 0, .03, .245, .195),
              (1.2, 0, .02, .2, .165), (1.1, 0, .005, .182, .148)], 14, cap=True, push=ridge)
    # the gorget: a broad collar of two lames over the top of the breastplate, up under the helm's rim
    loft(bm, [(1.585, 0, -.01, .24, .18), (1.64, 0, -.012, .19, .15), (1.7, 0, -.015, .12, .11)], 14, cap=False)
    loft(bm, [(1.66, 0, -.012, .16, .135), (1.645, 0, -.012, .2, .162)], 14, cap=False)
hard('chest__plate', cuirass)

# ---- spin: the belt, the fauld, the mail skirt and the seat of the trousers ------------------------------------------------
def fauld(bm):
    loft(bm, [(1.11, 0, .005, .19, .152), (1.03, 0, .008, .22, .17)], 10, cap=False)
    loft(bm, [(1.045, 0, .008, .213, .165), (.95, 0, .012, .25, .188)], 10, cap=False)
hard('spin__plate', fauld, thick=.011)
hard('spin__leather', lambda bm: loft(bm, [(1.135, 0, .005, .19, .152), (1.095, 0, .005, .193, .155)], 10, cap=False), thick=.012)
hard('spin__mail', lambda bm: loft(bm, [(.98, 0, .0, .22, .165), (.86, 0, .0, .235, .175), (.79, 0, -.005, .24, .18)], 10, cap=False), thick=.008)
soft('spin__trousers', lambda bm: blob(bm, (0, .9, -.005), .14, (1.25, .62, 1.0), 1), 50, voxel=.012)

# ---- arms: mail sleeves under great three-lamed pauldrons; couters, vambraces and gauntlets -------------------------------
for s, n, f in ((1, 'L', 1.18), (-1, 'R', 1.0)):
    x = s * SX
    hard(f'arm{n}__mail', lambda bm, x=x: loft(bm, [(1.58, x, 0, .07, .07), (1.42, x, 0, .066, .066), (EL + .03, x, 0, .06, .06)], 7, cap=True))
    def pauldron(bm, x=x, s=s, f=f):
        side = s * math.pi / 2; cx = s * .355
        def slope(p, a, e):   # the cap falls away from the neck: high inside, low over the arm
            d = (p.x - cx) * s
            return (p.x, p.y - .14 * max(0, d) * (1 - .5 * math.sin(e)) + .05 * max(0, -d), p.z)
        shell(bm, (cx, 1.56, -.005), .142 * f, .13 * f, .145 * f, 0, math.pi / 2, 0, math.tau, nu=10, nv=3, warp=slope)
        for k in range(3):   # the lames step down and out over the upper arm, open on the inside
            y = 1.555 - .02 * f - k * .052 * f; r = (.122 - .006 * k) * f
            loft(bm, [(y, x + s * (.02 + .006 * k), -.005, r, r * 1.05), (y - .062 * f, x + s * (.028 + .008 * k), -.005, r + .012, (r + .012) * 1.05)],
                 7, cap=False, a0=side - 2.0, a1=side + 2.0)
    hard(f'arm{n}__plate', pauldron, thick=.012)
    def vambrace(bm, x=x, s=s):
        loft(bm, [(EL + .05, x, -.008, .05, .05), (EL, x, -.018, .066, .07), (EL - .055, x, -.008, .058, .058),
                  (WR + .12, x, 0, .05, .052), (WR + .06, x, 0, .056, .058), (WR + .03, x, 0, .064, .066)], 8, cap=True)
    hard(f'elbow{n}__plate', vambrace)
    def gauntlet(bm, x=x, s=s):   # the fist closed round the grip (along z through the wrist): back of the hand outside
        blob(bm, (x + s * .026, WR - .02, 0), .054, (.62, 1.0, 1.15), 1)
        for zf in (-.036, -.012, .012, .036):
            tube(bm, [(x + s * .036, WR - .024, zf), (x + s * .026, WR - .074, zf * 1.1), (x - s * .024, WR - .079, zf * 1.1), (x - s * .043, WR - .036, zf)],
                 [.017, .016, .014, .013], 5)
        tube(bm, [(x + s * .018, WR - .006, .054), (x - s * .014, WR, .066), (x - s * .043, WR - .01, .058)], [.016, .014, .012], 5)   # the thumb over the grip
    soft(f'elbow{n}__gauntlet', gauntlet, 90, voxel=.0055)

# ---- legs: trousers under tassets and knee cops, greaves and sabatons -------------------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    soft(f'leg{n}__trousers', lambda bm, hx=hx: tube(bm, [(hx, .97, -.01), (hx * 1.05, .72, .0), (hx, .5, .01)], [.118, .1, .08], 8), 60, voxel=.012)
    def tassets(bm, hx=hx, s=s):
        c = s * .5   # over the front and the outside of the thigh
        loft(bm, [(.975, hx + s * .005, .0, .118, .12), (.855, hx + s * .016, .006, .126, .128)], 6, cap=False, a0=c - 1.25, a1=c + 1.25)
        loft(bm, [(.88, hx + s * .012, .004, .118, .12), (.765, hx + s * .022, .01, .124, .126)], 6, cap=False, a0=c - 1.1, a1=c + 1.1)
        def point(p, a, e): return (p.x, p.y, p.z + .025 * max(0, math.cos(a)) * max(0, 1 - abs(e)))   # the poleyn's ridge
        shell(bm, (hx, .455, .04), .074, .075, .058, -1.1, 1.2, -1.4, 1.4, nu=5, nv=3, warp=point)
    hard(f'leg{n}__plate', tassets, thick=.011)
    hard(f'knee{n}__plate', lambda bm, hx=hx: loft(bm, [(.43, hx, .005, .074, .076), (.33, hx, -.006, .084, .09), (.2, hx, .0, .068, .07), (.11, hx, .004, .064, .066)], 8, cap=True))
    def sabaton(bm, hx=hx):
        blob(bm, (hx, .085, -.005), .064, (1.0, .95, 1.1), 1)           # the ankle
        blob(bm, (hx, .06, .075), .062, (1.0, .82, 1.6), 1)             # the lames over the foot
        blob(bm, (hx, .048, .175), .044, (1.0, .78, 1.1), 1)            # the blunt toe
        blob(bm, (hx, .045, -.05), .045, (1.0, .9, .8), 1)              # the heel
    soft(f'knee{n}__gauntlet', sabaton, 80, voxel=.008)

result = tally()
