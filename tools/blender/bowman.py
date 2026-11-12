# The Rampart Bowman, the Hollowed archer. One rigid mesh per game bone (js/rig.js skeleton at scale 1,
# MODEL_DEFS.rampartBowman), named bowman:<bone>__<material slot>[.n], so every key pose, the walk and the death drive it.
# Rest pose: upright, arms hanging (the model's posture hunches it in the game).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest (shoulderX .31, the left arm 8% longer, as the Rogue): spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0),
# head (0, 1.69, 0); arms at x +-.31, y 1.55; left elbow y 1.226, wrist .902; right elbow 1.25, wrist .95. The bow's grip
# runs along z through the right wrist (the kit builds the bow). Hips x +-.15, y .90, knees .45.
# Cloth bones (they swing): loinF (.02, .93, .13), loinB (-.03, .93, -.13).
# The look (v5.5's brief, LORE.md's Hollowed): a hunched archer of the walls, a gaunt sunken face in a deep canvas cowl,
# a short ragged mantle, a fitted canvas doublet with a leather harness across it, a quiver on the back bristling with
# fletched arrows, bare sinewy arms out of short sleeves, a leather bracer on the bow arm and rag wraps on the other,
# canvas breeches, wrapped shins and turnshoes. Enemy budget: about 3,000 triangles with the bow.
import sys, math
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'skin': (0.5, 0.47, 0.41), 'cloth': (0.38, 0.4, 0.31), 'hood': (0.33, 0.36, 0.3), 'leather': (0.27, 0.29, 0.22),
       'wrap': (0.55, 0.51, 0.43), 'metal': (0.5, 0.5, 0.47), 'wood': (0.45, 0.38, 0.3)}, prefix='bowman:')

SX = .31
ARMS = ((1, 'L', 1.226, .902), (-1, 'R', 1.25, .95))
EYES = [(s * .048, 1.785, .085) for s in (-1, 1)]
seams = lambda g: .004 * abs(math.sin(math.atan2(g.x, g.z) * 7))          # the doublet's panels
bands = lambda g: .011 * abs(math.sin(g.y * 70 + math.atan2(g.x, g.z)))    # wraps wound in a spiral

# ---- head: a gaunt sunken face in a deep canvas cowl ---------------------------------------------------------------------
def face(bm):
    blob(bm, (0, 1.8, -.005), .097, (.95, 1.1, 1.04), 2)         # the skull
    blob(bm, (0, 1.722, .038), .054, (1.1, .74, 1.0), 2)         # the jaw, slack
    for s in (-1, 1): blob(bm, (s * .053, 1.765, .064), .028, (1, .8, .8), 1)   # cheekbones
    blob(bm, (0, 1.805, .083), .044, (1.5, .45, .55), 1)          # the brow ridge
def sunken(g):   # eye sockets and hollow cheeks pressed in, the nose gone to a pit
    d = 0.0
    for e in EYES:
        r = (g - Vector(e)).length; d -= .022 * max(0, 1 - r / .032)
    for s in (-1, 1):
        r = (g - Vector((s * .05, 1.735, .072))).length; d -= .012 * max(0, 1 - r / .035)
    r = (g - Vector((0, 1.765, .098))).length; d -= .014 * max(0, 1 - r / .02)
    return d
soft('head__skin', face, 190, voxel=.006, after=sunken)

def cowl(bm):   # a loose canvas sheet round the head, open over the face, the brow peaked forward; it falls onto the shoulders
    c = (0, 1.8, -.02)
    def at(u, v):
        fold = 1 + .07 * math.sin(u * math.tau * 4 + .7) * min(1, v * 2)
        if v <= .7:
            e = 1.45 - (v / .7) * 2.15
            op = .78 + .18 * max(0, -math.sin(e))
            a = op + (math.tau - 2 * op) * u
            x = math.sin(a) * math.cos(e) * .145 * fold; y = c[1] + math.sin(e) * .16; z = c[2] + math.cos(a) * math.cos(e) * .158 * fold
            z += .06 * max(0, math.cos(a)) ** 2 * max(0, math.sin(e) + .35)    # the peak hangs over the eyes
            y += .025 * max(0, -math.cos(a)) * max(0, math.sin(e))              # the crown drawn back into a point
            return (x, y, z - .035 * max(0, -math.cos(a)) * max(0, math.sin(e)) ** 2)
        k = (v - .7) / .3
        op = 1.05 - .5 * k
        a = op + (math.tau - 2 * op) * u
        return (math.sin(a) * (.15 + .1 * k) * fold, 1.69 - .14 * k, -.03 + math.cos(a) * (.15 + .035 * k) * fold)
    sheet(bm, 14, 6, at, ragged=.03, seed=4)
hard('head__hood', cowl)   # the canvas is double-sided

hard('neck__skin', lambda bm: loft(bm, [(1.72, 0, .0, .052, .05), (1.6, 0, -.01, .062, .058)], 7))

# ---- chest: a fitted canvas doublet, the mantle, a harness and the quiver ------------------------------------------------
TORSO = [(1.0, 0, 0, .16, .11), (1.12, 0, .004, .155, .108), (1.28, 0, .012, .175, .125), (1.42, 0, .008, .19, .126),
         (1.51, 0, -.004, .185, .118), (1.57, 0, -.012, .145, .098), (1.61, 0, -.015, .09, .082)]
def torso_at(y):
    rows = sorted(TORSO)
    for (y0, _, c0, x0, z0), (y1, _, c1, x1, z1) in zip(rows, rows[1:]):
        if y0 <= y <= y1:
            k = (y - y0) / (y1 - y0); return (c0 + (c1 - c0) * k, x0 + (x1 - x0) * k, z0 + (z1 - z0) * k)
    return rows[0][2:] if y < rows[0][0] else rows[-1][2:]
def surface(a, y, out=0.0):   # a point on the torso at angle a (0 = front), height y, pushed out by `out`
    cz, rx, rz = torso_at(y)
    return (math.sin(a) * (rx + out), y, cz + math.cos(a) * (rz + out))
def doublet(bm):
    loft(bm, TORSO, 12)
    loft(bm, [(1.58, 0, -.015, .095, .09), (1.65, 0, -.02, .1, .094)], 10)   # the standing collar
    for s in (-1, 1): blob(bm, (s * .2, 1.5, -.005), .072, (1.15, .75, 1), 1)  # the shoulders
soft('chest__cloth', doublet, 230, after=seams)

def mantle(bm):   # a short ragged shoulder cape of canvas: from the collar over the shoulders to the upper arms, open in front
    def at(u, v):
        a = .5 + (math.tau - 1.0) * u
        e = 1.3 - 1.6 * v
        r = 1.0 + .05 * math.sin(u * math.tau * 6 + 1.1) * v                      # it falls in folds
        x = math.sin(a) * math.cos(e) * .4 * r; z = -.01 + math.cos(a) * math.cos(e) * .2 * r
        return (x, 1.42 + math.sin(e) * .26 - .04 * max(0, math.cos(a)) * v, z)
    sheet(bm, 16, 4, at, ragged=.05, seed=9)
hard('chest__hood', mantle)

QB, QT = Vector((-.11, 1.1, -.215)), Vector((.12, 1.53, -.235))   # the quiver: low on the right of the back to over the left shoulder
def leather(bm):
    # the harness: a strap from the left shoulder across the chest to the right hip, and back up behind
    for side in (1, -1):
        rows = []
        for w in (.025, -.025):
            r = []
            for k in range(7):
                t = k / 6; y = 1.55 - .45 * t + w
                a = (.55 - 1.1 * t) if side > 0 else math.pi - (.55 - 1.1 * t)
                r.append(bm.verts.new(G(*surface(a, y, .03 + .012 * math.sin(t * math.pi)))))
            rows.append(r)
        bridge(bm, rows, closed=False)
    # the quiver, a tapering leather tube with a stiff rim
    ax = (QT - QB).normalized()
    pts = [QB + ax * (QT - QB).length * f for f in (0, .08, .5, .92, 1.0)]
    tube(bm, pts, [.03, .042, .046, .05, .054], 7)
hard('chest__leather', leather, thick=.006)

def metal(bm):   # the harness ring and the quiver's iron mouth band
    p = surface(-.05, 1.3, .045)
    loft(bm, [(p[1] + .02, p[0], p[2], .018, .006), (p[1] - .02, p[0], p[2], .018, .006)], 6)
    ax = (QT - QB).normalized(); c = QT - ax * .03
    tube(bm, [c - ax * .012, c + ax * .012], [.057, .057], 8)
hard('chest__metal', metal)

ARROWS = [(-.022, .0, .17, -.08), (.018, .012, .2, .02), (.0, -.024, .16, .1), (.03, -.01, .19, .16), (-.03, .02, .14, -.15),
          (.008, .028, .21, -.03), (-.012, -.03, .18, .06)]
def arrow_frame(k):
    dx, dz, ln, lean = ARROWS[k]
    ax = (QT - QB).normalized(); side = ax.cross(Vector((0, 0, 1))).normalized()
    base = QT + side * dx + Vector((0, 0, dz)) - ax * .05
    d = (ax + side * lean).normalized()
    return base, d, base + d * ln, side
def shafts(bm):
    for k in range(len(ARROWS)):
        b, d, tip, _ = arrow_frame(k)
        tube(bm, [b, tip], [.006, .006], 3)
hard('chest__wood', shafts)
def fletching(bm):   # two crossed vanes on each nock, pale feathers
    for k in range(len(ARROWS)):
        b, d, tip, side = arrow_frame(k)
        n = d.cross(side).normalized()
        for e in (side, n):
            p0 = tip - d * .085; p1 = tip - d * .012
            q = [p0 + e * .004, p1 + e * .004, p1 + e * .022, p0 + e * .03]
            r = [p0 - e * .004, p1 - e * .004, p1 - e * .022, p0 - e * .03]
            bm.faces.new([bm.verts.new(G(*v)) for v in q]); bm.faces.new([bm.verts.new(G(*v)) for v in reversed(r)])
hard('chest__wrap', fletching, smooth=False)

# ---- spin: the breeches' seat, the doublet's back skirt, the belt and a pouch ---------------------------------------------
def seat(bm):
    loft(bm, [(1.06, 0, 0, .155, .108), (.98, 0, 0, .168, .115), (.9, 0, -.01, .172, .118), (.83, 0, -.005, .152, .108)], 10)
    for s in (-1, 1): blob(bm, (s * .09, .86, -.02), .088, (1, .9, 1), 1)
soft('spin__cloth', seat, 90)

def skirt(a, v, out=0.0):   # a point of the doublet's skirt: angle a around the body (0 = front), v = 0 belt .. 1 hem
    return (math.sin(a) * (.18 + out + .05 * v), 1.03 - .22 * v, -.005 + math.cos(a) * (.125 + out + .045 * v))
hard('spin__cloth.1', lambda bm: sheet(bm, 6, 2, lambda u, v: skirt(math.pi * (.5 + 1.0 * u), v), ragged=.03, seed=3), thick=.008)

def belt(bm):
    loft(bm, [(1.065, 0, 0, .182, .128), (1.025, 0, 0, .182, .128)], 10, cap=False)
hard('spin__leather', belt, thick=.01)
def pouch(bm):   # a pouch of spare strings and arrowheads on the left hip
    loft(bm, [(1.02, .185, .055, .042, .033), (.96, .195, .055, .052, .038), (.9, .195, .055, .046, .034)], 6)
    blob(bm, (.185, 1.015, .067), .04, (1.2, .5, .9), 1)
soft('spin__leather.1', pouch, 48, voxel=.008)

def strip(bm, x, z, w, ln, seed):   # a ragged canvas tail of the tunic under the doublet
    sheet(bm, 2, 3, lambda u, v: (x + (u - .5) * w * (1 - .25 * v), .99 - ln * v, z + math.copysign(.01 + .025 * v, z)), ragged=.06, seed=seed)
hard('loinF__cloth', lambda bm: strip(bm, .02, .14, .17, .4, 3))
hard('loinB__cloth', lambda bm: strip(bm, -.03, -.14, .19, .48, 7))

# ---- arms: bare sinewy arms under the mantle, a bracer and glove on the bow arm, rag wraps on the draw arm ---------------
for s, n, el, wr in ARMS:
    x = s * SX
    def upper(bm, x=x, s=s, el=el):   # bare and thin: a knot of shoulder, a stringy biceps
        loft(bm, [(1.52, x - s * .012, 0, .054, .056), (1.4, x, .004, .05, .052), (1.33, x, .006, .047, .048),
                  (el + .04, x, 0, .04, .041), (el, x, 0, .038, .038)], 8)
        blob(bm, (x, 1.38, .016), .036, (.9, 1.6, .9), 1)
    soft(f'arm{n}__skin', upper, 70, voxel=.007)

L_EL, L_WR = ARMS[0][2], ARMS[0][3]
def draw_arm(bm):   # the left forearm and a bare hand, half closed (it draws the string)
    x = SX
    loft(bm, [(L_EL + .03, x, 0, .038, .038), (L_EL - .06, x, .004, .045, .045), (L_WR + .03, x, .006, .031, .033)], 8)
    blob(bm, (x, L_EL, 0), .038, (1, 1, 1), 1)
    blob(bm, (x + .012, L_WR - .02, .004), .036, (.62, 1.2, 1.05), 1)                 # the palm
    for zf in (-.021, -.007, .007, .021):
        tube(bm, [(x + .02, L_WR - .045, zf), (x + .018, L_WR - .075, zf * 1.05), (x - .006, L_WR - .085, zf)], [.009, .008, .007], 5)
    tube(bm, [(x + .006, L_WR - .012, .03), (x - .006, L_WR - .03, .042), (x - .016, L_WR - .05, .036)], [.009, .008, .007], 5)   # the thumb
soft('elbowL__skin', draw_arm, 150, voxel=.005)
def rags(bm):   # rag strips wound round the left forearm
    for k in range(3):
        y = L_EL - (.25 + .22 * k) * (L_EL - L_WR)
        loft(bm, [(y + .02, SX, .005, .042 - .004 * k, .043 - .004 * k), (y - .02, SX, .005, .04 - .004 * k, .041 - .004 * k)], 6, cap=False)
hard('elbowL__wrap', rags)

R_EL, R_WR = ARMS[1][2], ARMS[1][3]
def bow_forearm(bm):
    x = -SX
    loft(bm, [(R_EL + .03, x, 0, .038, .038), (R_EL - .06, x, .004, .045, .045), (R_WR + .05, x, .006, .033, .035)], 8)
    blob(bm, (x, R_EL, 0), .038, (1, 1, 1), 1)
soft('elbowR__skin', bow_forearm, 56, voxel=.006)
def bracer(bm):   # a stiff leather bracer laced over the inner forearm, where the string slaps
    x = -SX; L = R_EL - R_WR
    loft(bm, [(R_EL - .25 * L, x, .005, .047, .048), (R_EL - .6 * L, x, .006, .044, .046), (R_WR + .02, x, .006, .04, .042)], 7, cap=False)
hard('elbowR__leather', bracer, thick=.007)
def glove(bm):   # the fist closed round the bow's grip, along z through the wrist
    x, s = -SX, -1
    blob(bm, (x + s * .016, R_WR - .005, 0), .042, (.66, 1.15, 1.15), 1)
    for zf in (-.025, -.008, .008, .025):
        tube(bm, [(x + s * .023, R_WR - .016, zf), (x + s * .016, R_WR - .05, zf * 1.1), (x - s * .016, R_WR - .053, zf * 1.1), (x - s * .028, R_WR - .023, zf)],
             [.01, .0095, .0085, .0075], 5)
    tube(bm, [(x + s * .012, R_WR - .004, .036), (x - s * .01, R_WR, .044), (x - s * .028, R_WR - .007, .039)], [.01, .0095, .0075], 5)   # the thumb
soft('elbowR__leather.1', glove, 66, voxel=.005)
hard('elbowR__metal', lambda bm: [stud(bm, (-SX + math.sin(a) * .049, R_EL - .42 * (R_EL - R_WR), math.cos(a) * .05), .007)
                                  for a in (-.9, -.3, .3, .9)])

# ---- legs: canvas breeches, the doublet's front skirt, wrapped shins and turnshoes ----------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    def thigh(bm, hx=hx):
        loft(bm, [(1.0, hx * .8, -.01, .08, .08), (.85, hx, 0, .078, .08), (.62, hx, .01, .064, .066), (.46, hx, .01, .055, .057)], 8)
    soft(f'leg{n}__cloth', thigh, 72)
    hard(f'leg{n}__cloth.1', lambda bm, s=s: sheet(bm, 3, 2, lambda u, v: skirt(s * (-.1 + 1.75 * u), v, .01), ragged=.025, seed=5 + s), thick=.008)
    def shin(bm, hx=hx):   # breeches tucked into rag wraps from the knee to the ankle
        loft(bm, [(.47, hx, .01, .056, .058), (.4, hx, .006, .057, .06), (.27, hx, .0, .056, .06), (.13, hx, .0, .044, .047), (.09, hx, .0, .043, .046)], 8)
    soft(f'knee{n}__wrap', shin, 80, after=bands)
    def shoe(bm, hx=hx):   # a soft leather turnshoe
        loft(bm, [(.12, hx, .0, .047, .05), (.08, hx, .02, .05, .085), (.03, hx, .05, .05, .11), (.0, hx, .055, .05, .115)], 8)
        blob(bm, (hx, .035, .14), .04, (1.0, .75, 1.1), 1)
        blob(bm, (hx, .04, -.035), .042, (1, .9, 1), 1)
    soft(f'knee{n}__leather', shoe, 64, voxel=.008)

result = tally()
