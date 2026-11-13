# The Shover, the Ironbound brute behind a wall of a shield (STORY.md: the king's old household guard, kept at their posts
# past death). One rigid mesh per game bone (js/rig.js skeleton at scale 1, MODEL_DEFS.ironShover), named
# shover:<bone>__<material slot>[.n], so every key pose, the walk and the death drive it. Rest pose: upright, arms hanging
# (the model's posture hunches the chest and bends the elbows in the game).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.35, y 1.55,
# elbows y 1.25, wrists .95 (the kit's pavise hangs off the left forearm; no weapon, the shield is the weapon); hips
# x +-.15, y .90, knees .45. Cloth bones: loinF (0, .93, .16), loinB (0, .93, -.16).
# The look (the MODEL_DEFS brief: a barrel-chested brute behind a wall-sized shield): a deep round cuirass bound with two
# iron hoops like a barrel, the pavise's leather guige strap across it; a kettle hat with a comb and a wide brim over a
# high bevor, the eyes glowing in the shadow between them, a mail aventail behind; a great three-lamed pauldron on the
# shield arm and a small one on the other; mail sleeves, a plate vambrace on the shield arm, a leather bracer bound in
# iron on the other, heavy iron fists; a wide belt over a mail skirt and fauld, a long brown tabard front and back;
# mail thighs, cuisses, greaves bound in iron, iron sabatons.
# Enemy budget: about 3,000 triangles with the pavise, which the kit still builds.
import sys, math
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'plate': (0.4, 0.42, 0.44), 'rust': (0.36, 0.26, 0.2), 'mail': (0.27, 0.28, 0.3), 'leather': (0.24, 0.2, 0.16),
       'tabard': (0.33, 0.27, 0.2), 'stripe': (0.55, 0.42, 0.22), 'trim': (0.6, 0.55, 0.42), 'dark': (0.03, 0.03, 0.035)},
      prefix='shover:')

SX, EL, WR = .35, 1.25, .95
EYE = 1.81   # MODEL_DEFS.ironShover.eyes: head + .12, z .165

def lerp_rows(rows, a, y, out=0.0, push=None):
    """A point on a loft's surface at angle a and height y, `out` beyond it."""
    for (y0, _, c0, rx0, rz0), (y1, _, c1, rx1, rz1) in zip(rows, rows[1:]):
        if min(y0, y1) <= y <= max(y0, y1):
            t = (y - y0) / (y1 - y0); c, rx, rz = c0 + (c1 - c0) * t, rx0 + (rx1 - rx0) * t, rz0 + (rz1 - rz0) * t
            r = 1 + (push(a, y) if push else 0)
            return Vector((math.sin(a) * (rx * r + out), y, c + math.cos(a) * (rz * r + out)))
    raise ValueError(y)

# ---- head: a kettle hat with a comb and a wide brim, a high bevor, the face in shadow, a mail aventail ---------------------
def comb(a, y): return .09 * abs(math.cos(a)) ** 12 * max(0.0, min(1.0, (y - 1.86) / .04))
SKULL = [(1.84, 0, -.006, .142, .152), (1.9, 0, -.008, .138, .148), (1.955, 0, -.01, .116, .125), (1.99, 0, -.012, .072, .078),
         (2.005, 0, -.012, .02, .02)]
def kettle(bm):
    loft(bm, SKULL, 10, push=comb)
    n = 12   # the brim: level over the face, sloping down at the sides and the back, a turned-down lip
    def r_at(a, y, rx, rz, d=0.0):
        k = 1 - .14 * max(0.0, math.cos(a))
        return bm.verts.new(G(math.sin(a) * rx * k, y - d, -.006 + math.cos(a) * rz * k))
    inner = [r_at(math.tau * i / n, 1.85, .146, .156) for i in range(n)]
    drop = lambda a: .05 * (1 - math.cos(a)) / 2
    outer = [r_at(math.tau * i / n, 1.832 - drop(math.tau * i / n), .25, .26) for i in range(n)]
    lip = [r_at(math.tau * i / n, 1.812 - drop(math.tau * i / n), .255, .265) for i in range(n)]
    bridge(bm, [inner, outer, lip])
hard('head__plate', kettle)
def bevor(bm):   # the high bevor over the chin and the mouth, a blunt ridge down its front
    ridge = lambda a, y: .07 * max(0.0, math.cos(a)) ** 6
    loft(bm, [(EYE - .015, 0, -.004, .132, .166), (1.74, 0, .004, .14, .174), (1.67, 0, -.006, .128, .158), (1.62, 0, -.01, .14, .148)],
         8, cap=False, a0=-2.1, a1=2.1, push=ridge)
hard('head__plate.1', bevor, thick=.01)
hard('head__dark', lambda bm: loft(bm, [(1.87, 0, -.01, .124, .142), (1.78, 0, -.01, .12, .138)], 8, cap=True))   # the face's shadow
def aventail(bm):   # mail hanging from the hat at the sides and the back, onto the shoulders
    loft(bm, [(1.84, 0, -.01, .144, .154), (1.72, 0, -.025, .165, .168), (1.6, 0, -.035, .2, .19)], 8, cap=False, a0=1.5, a1=math.tau - 1.5)
hard('head__mail', aventail, thick=.006)
def rivets(bm):   # rivets round the hat's band
    for k in range(3):
        a = -1.9 + 3.8 * k / 2
        p = lerp_rows(SKULL, a, 1.87, .004)
        n = Vector((math.sin(a), 0, math.cos(a)))
        tube(bm, [tuple(p - n * .004), tuple(p + n * .008)], [.009, .006], 4)
hard('head__rust', rivets)

# ---- neck: an iron gorget -----------------------------------------------------------------------------------------------
hard('neck__rust', lambda bm: loft(bm, [(1.7, 0, -.01, .11, .11), (1.59, 0, -.004, .19, .17)], 6, cap=False),
     thick=.01)

# ---- chest: the barrel cuirass, two iron hoops round it, the pavise's guige strap across, a worn gilt collar rim ----------
BARREL = [(1.62, 0, -.01, .21, .15), (1.57, 0, .005, .31, .21), (1.45, 0, .03, .33, .25), (1.32, 0, .04, .315, .262),
          (1.2, 0, .03, .275, .232), (1.1, 0, .01, .232, .192)]
def keel(a, y): return .035 * max(0.0, math.cos(a)) ** 8 * max(0, min(1, (1.57 - y) / .1))
hard('chest__plate', lambda bm: loft(bm, BARREL, 12, cap=True, push=keel))
def hoops(bm):
    for yc in (1.42, 1.22):
        top = [lerp_rows(BARREL, math.tau * i / 12, yc + .02, .012, keel) for i in range(12)]
        bot = [lerp_rows(BARREL, math.tau * i / 12, yc - .02, .012, keel) for i in range(12)]
        rings = [[bm.verts.new(G(*p)) for p in r] for r in (top, bot)]
        bridge(bm, rings)
hard('chest__rust', hoops, outward=lambda c: Vector((0, c.y, .03)))
def guige(bm):   # the shield's strap, from the right shoulder across the chest to the left hip, and back round behind
    for a0, a1 in ((-.62, .95), (-2.5, -4.05)):
        cols = 10; top, bot = [], []
        for i in range(cols + 1):
            t = i / cols; a = a0 + (a1 - a0) * t; y = 1.585 - .43 * t
            top.append(bm.verts.new(G(*lerp_rows(BARREL, a, min(1.6, y + .03), .02, keel))))
            bot.append(bm.verts.new(G(*lerp_rows(BARREL, a, y - .03, .02, keel))))
        for i in range(cols): bm.faces.new((top[i], top[i + 1], bot[i + 1], bot[i]))
hard('chest__leather', guige, outward=lambda c: Vector((0, c.y, .03)))
hard('chest__trim', lambda bm: loft(bm, [(1.64, 0, -.01, .2, .145), (1.605, 0, -.008, .26, .185)], 10, cap=False),
     outward=lambda c: Vector((0, c.y - .1, 0)))

# ---- spin: a wide belt with a gilt buckle, a mail skirt and a fauld ---------------------------------------------------------
hard('spin__leather', lambda bm: loft(bm, [(1.13, 0, .01, .238, .198), (1.07, 0, .01, .244, .204)], 10, cap=False), thick=.014)
hard('spin__trim', lambda bm: loft(bm, [(1.125, 0, .225, .045, .012), (1.075, 0, .225, .045, .012)], 4, cap=True))
hard('spin__mail', lambda bm: loft(bm, [(1.09, 0, .005, .238, .194), (.9, 0, .005, .262, .212), (.76, 0, .0, .272, .222)], 6, cap=False), thick=.008)
def fauld(bm):
    loft(bm, [(1.08, 0, .008, .25, .206), (.99, 0, .012, .27, .222)], 6, cap=False, a0=-2.3, a1=2.3)
    loft(bm, [(1.0, 0, .012, .266, .218), (.91, 0, .014, .284, .234)], 6, cap=False, a0=-2.1, a1=2.1)
hard('spin__plate', fauld, thick=.011)

# ---- the long tabard, front and back, each on its swinging bone, a worn gilt band down the front ---------------------------
for bone, s, w, ln, seed in (('loinF', 1, .3, .6, 3), ('loinB', -1, .34, .7, 6)):
    hard(f'{bone}__tabard', lambda bm, s=s, w=w, ln=ln, seed=seed: sheet(bm, 3, 4, lambda u, v: (
        (u - .5) * w * (1 + .12 * v), .98 - ln * v, s * (.245 + .03 * v - .3 * ((u - .5) * w) ** 2)), ragged=.07, seed=seed))
hard('loinF__trim', lambda bm: sheet(bm, 1, 4, lambda u, v: ((u - .5) * .06, .98 - .56 * v, .257 + .03 * v), ragged=.03, seed=2),
     outward=(0, .7, 0))

# ---- arms: mail sleeves, a great pauldron on the shield arm and a small one on the other ----------------------------------
for s, n, f, lames in ((1, 'L', 1.4, 2), (-1, 'R', .95, 1)):
    x = s * SX
    hard(f'arm{n}__mail', lambda bm, x=x: loft(bm, [(1.6, x, 0, .088, .088), (1.42, x, 0, .082, .082), (EL + .03, x, 0, .074, .074)], 7, cap=True))
    def pauldron(bm, x=x, s=s, f=f, lames=lames):
        side = s * math.pi / 2; cx = x - s * .03
        def slope(p, a, e):
            d = (p.x - cx) * s
            return (p.x, p.y - .11 * max(0, d) * (1 - .5 * math.sin(e)) + .04 * max(0, -d), p.z)
        shell(bm, (cx, 1.56, -.005), .14 * f, .12 * f, .155 * f, 0, math.pi / 2, 0, math.tau, nu=8, nv=2, warp=slope)
        for k in range(lames):   # lames under the cop, open on the inside
            y = 1.53 - .02 * f - k * .055 * f; r = (.1 - .004 * k) * f
            loft(bm, [(y, x + s * (.02 + .008 * k), -.005, r, r * 1.08), (y - .068 * f, x + s * (.03 + .01 * k), -.005, r + .013, (r + .013) * 1.08)],
                 6, cap=False, a0=side - 2.0, a1=side + 2.0)
    hard(f'arm{n}__plate', pauldron, thick=.013)

def big_rivets(bm):   # iron rivets along the great pauldron's lowest lame
    x, s, f = SX, 1, 1.4
    for k in range(3):
        a = s * math.pi / 2 + (k - 1) * .75; r = (.096 + .013) * f + .01
        p = Vector((x + s * .04 + math.sin(a) * r, 1.53 - .02 * f - .055 * f - .05 * f, -.005 + math.cos(a) * r * 1.08))
        nn = Vector((math.sin(a), 0, math.cos(a)))
        tube(bm, [tuple(p - nn * .004), tuple(p + nn * .008)], [.011, .007], 4)
hard('armL__rust', big_rivets)

def vambrace(bm, x=SX):   # the shield arm's forearm: a plate vambrace with a flared couter
    loft(bm, [(EL + .05, x, -.008, .06, .06), (EL, x, -.022, .08, .084), (EL - .06, x, -.008, .068, .068),
              (WR + .12, x, 0, .06, .062), (WR + .06, x, 0, .066, .068), (WR + .03, x, 0, .074, .076)], 8, cap=True)
hard('elbowL__plate', vambrace)
def bracer(bm, x=-SX):   # the other forearm: a leather bracer
    loft(bm, [(EL + .04, x, -.006, .066, .066), (EL - .04, x, -.008, .07, .07), (WR + .1, x, 0, .062, .064), (WR + .03, x, 0, .068, .07)], 7, cap=True)
hard('elbowR__leather', bracer)
def bands(bm, x=-SX):   # bound round with iron bands
    for y in (EL - .03, WR + .08):
        loft(bm, [(y + .018, x, -.004, .077, .079), (y - .018, x, -.004, .077, .079)], 6, cap=False)
hard('elbowR__rust', bands, thick=.008)
for s, n in ((1, 'L'), (-1, 'R')):
    def fist(bm, x=s * SX, s=s):   # a heavy iron fist closed round a grip along z through the wrist
        blob(bm, (x + s * .03, WR - .022, 0), .064, (.64, 1.0, 1.15), 1)
        for zf in (-.042, -.014, .014, .042):
            tube(bm, [(x + s * .042, WR - .03, zf), (x + s * .031, WR - .086, zf * 1.1), (x - s * .03, WR - .092, zf * 1.1), (x - s * .052, WR - .042, zf)],
                 [.02, .019, .017, .016], 5)
        tube(bm, [(x + s * .022, WR - .006, .062), (x - s * .016, WR, .076), (x - s * .05, WR - .012, .068)], [.019, .017, .015], 5)
    soft(f'elbow{n}__rust.1', fist, 56, voxel=.0062)

# ---- legs: mail thighs under cuisses, greaves bound in iron, iron sabatons ---------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    soft(f'leg{n}__mail', lambda bm, hx=hx: tube(bm, [(hx, .97, -.01), (hx * 1.06, .72, .0), (hx, .5, .01)], [.13, .112, .09], 8), 42, voxel=.012)
    def cuisse(bm, hx=hx, s=s):
        c = s * .3   # over the front and the outside of the thigh
        loft(bm, [(.84, hx + s * .012, .006, .128, .13), (.58, hx + s * .008, .016, .106, .108)], 5, cap=False, a0=c - 1.5, a1=c + 1.5)
        def point(p, a, e): return (p.x, p.y, p.z + .025 * max(0, math.cos(a)) * max(0, 1 - abs(e)))
        shell(bm, (hx, .455, .05), .082, .082, .062, -1.1, 1.2, -1.4, 1.4, nu=4, nv=2, warp=point)
    hard(f'leg{n}__plate', cuisse, thick=.012)
    hard(f'knee{n}__plate', lambda bm, hx=hx: loft(bm, [(.43, hx, .005, .084, .086), (.33, hx, -.006, .094, .1), (.2, hx, .0, .078, .08), (.12, hx, .004, .074, .076)], 8, cap=True))
    def greave_bands(bm, hx=hx):
        for y in (.32,):
            loft(bm, [(y + .015, hx, -.004, .097 if y > .3 else .083, .102 if y > .3 else .085),
                      (y - .015, hx, -.004, .096 if y > .3 else .082, .1 if y > .3 else .084)], 6, cap=False)
    hard(f'knee{n}__rust', greave_bands, thick=.008)
    def sabaton(bm, hx=hx):
        blob(bm, (hx, .09, -.005), .074, (1.0, .95, 1.1), 1)
        blob(bm, (hx, .062, .085), .07, (1.0, .82, 1.6), 1)
        blob(bm, (hx, .05, .195), .05, (1.0, .78, 1.1), 1)
        blob(bm, (hx, .048, -.06), .05, (1.0, .9, .8), 1)
    soft(f'knee{n}__rust.1', sabaton, 54, voxel=.008)

result = tally()
