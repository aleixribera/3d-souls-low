# The Bone Archer, the summon of the Bone Archer ability (design/abilities/bone-archer.md): a tall skeleton that climbs
# out of the floor at range and looses arrows of light into the boss. One rigid mesh per game bone (js/rig.js skeleton at
# scale 1, MODEL_DEFS), named bonearcher:<bone>__<material slot>[.n], each built at its bone's absolute rest place, so the
# summon's key poses, its climb and its loose drive it (js/summon-figures.js).
# Rest pose: upright, arms hanging. Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.30, y 1.55,
# elbows y 1.25, wrists y .95; hips x +-.13, y .90, knees .45; loinF (0, .93, .14) and loinB (0, .93, -.14) for the
# mantle's front and side strips; capeA (0, 1.54, -.14) and capeB (0, 1.12, -.14) for its back, the upper half and the
# torn hem.
# The look: a tall, narrow skeleton in a torn, hooded mantle that hangs to its knees in strips; a skull set deep in the
# hood with two eye points of light; a capelet over the shoulders, open at the front over a bare ribcage; long bony arms,
# long finger bones, bony legs. No armour, no hat: nothing like the enemy bowman. Its great bow is taller than it is
# (2.2 m), dark wood with bone horn tips, carried on the LEFT forearm (elbowL): the grip in the left fist just under the
# wrist (.30, .89, 0), the bow standing vertical in the yz plane through it, its back bowing forward (+z) and its
# recurved tips flicking forward again, its string a straight line of light on its back side (z -.1). Arrows of light
# in a dark quiver slung across its back (on chest, over the mantle), their heads over the right shoulder; one arrow of
# light in the right fist (elbowR), lying along the forearm, its head pointing down and forward.
# Slots, drawn by the figures' summon shader (lit): `bone` (pale cold bone), `cloth` (the ink-dark mantle), `wood` (the
# bow and the quiver), `light` (eyes, bowstring, arrows: the game makes them glow).
# Budget: about 3,600 triangles.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob, bent_spike
from snow_lib import tube as stube
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'bone': (0.78, 0.84, 0.86), 'cloth': (0.05, 0.055, 0.07), 'wood': (0.2, 0.15, 0.12), 'light': (0.95, 0.97, 0.98)},
      prefix='bonearcher:')

SX, EL, WR, HX = .30, 1.25, .95, .13
GX, GY = SX, WR - .06                 # the bow's grip, in the left fist
AX, AY, AZ = -SX, WR - .06, .064      # where the held arrow passes through the right fist

def bow_pt(t, e):
    """The bow's middle line at t (0 the grip, 1 a tip) on the upper (e = 1) or lower (e = -1) limb: the back bowing
    forward to the grip, the tips recurving forward again."""
    return Vector((GX, GY + e * 1.02 * t, -.15 * t * t + .055 * max(0.0, (t - .8) / .2) ** 2))

def knob(bm, c, r, scale=(1, 1, 1)):   # a joint's end of bone: a low-poly ball
    blob(bm, c, r, scale, 1)

def curl(bm, cx, cy, cz, s, r=.034, rad=.0085):
    """Four long finger bones closed round something upright through (cx, cz): from the palm on the outside (+s x),
    round the front, to the inside; a thumb round the back the other way."""
    for k in range(4):
        y = cy + .028 - k * .022
        pts = [(cx + s * math.sin(a) * r, y - .004 * j, cz + math.cos(a) * r) for j, a in enumerate((1.7, .65, -.4, -1.4))]
        stube(bm, pts, [rad, rad * .95, rad * .8, rad * .55], 4)
    stube(bm, [(cx + s * r, cy + .04, cz - .01), (cx + s * .01, cy + .05, cz - r), (cx - s * .02, cy + .045, cz - r * .7)],
          [rad * 1.1, rad, rad * .6], 4)
    blob(bm, (cx + s * (r + .006), cy + .01, cz), .03, (.45, 1.35, .9), 1)   # the palm's bones, on the outside

# ---- head: a skull set deep in the hood, two eye points ---------------------------------------------------------------
def skull(bm):
    blob(bm, (0, 1.815, -.005), .085, (.82, .95, 1.0), 2)    # the cranium
    blob(bm, (0, 1.762, .045), .055, (.95, .9, .9), 2)       # the face
    blob(bm, (0, 1.712, .05), .036, (1.1, .62, 1.0), 1)      # the jaw
    for s in (1, -1): blob(bm, (s * .05, 1.768, .048), .022, (1, .8, 1.2), 1)   # the cheekbones
soft('head__bone', skull, 200, voxel=.008)
HC = (0, 1.84, -.02)
def hood(bm):
    def deep(p, a, e):   # the crown drawn up and forward into a peak, the front overhanging the face, the hem flaring
        up = max(0.0, math.sin(e)); fr = max(0.0, math.cos(a)); flare = max(0.0, -e) * .45
        return (p.x * (1 + flare), p.y + .035 * up * up, p.z * (1 + flare) + .07 * up ** 2 * fr + .03 * up ** 3)
    shell(bm, HC, .148, .18, .168, -.78, math.pi / 2 - .02, .72, math.tau - .72, nu=10, nv=5, warp=deep)
hard('head__cloth', hood, thick=.022)
def eyes(bm):
    for s in (1, -1): blob(bm, (s * .029, 1.782, .09), .013, (1, .75, .6), 1)
hard('head__light', eyes)

# ---- neck: three vertebrae on a thin column ----------------------------------------------------------------------------
def neck(bm):
    stube(bm, [(0, 1.6, -.04), (0, 1.76, -.02)], [.016, .016], 6)
    for k in range(2): knob(bm, (0, 1.65 + k * .06, -.034), .025, (1.1, .5, 1))
hard('neck__bone', neck)

# ---- chest: the ribcage, bare under the open mantle --------------------------------------------------------------------
def ribcage(bm):
    stube(bm, [(0, 1.62, -.06), (0, 1.45, -.085), (0, 1.25, -.075), (0, 1.06, -.045)], [.02, .022, .022, .02], 5)   # the spine
    blob(bm, (0, 1.4, .122), .026, (1, 4.2, .45), 1)   # the sternum
    for k in range(4):
        yb = 1.53 - k * .085; rx = .115 + .05 * math.sin(math.pi * (k + 1) / 5); rz = .1 + .01 * k
        a_end = .32 if k < 3 else .85   # the lowest pair floats free
        for s in (1, -1):
            pts = []
            for j in range(4):
                a = math.pi - (math.pi - a_end) * j / 3
                pts.append((s * math.sin(a) * rx, yb - .09 * (1 - a / math.pi), .02 + math.cos(a) * rz))
            stube(bm, pts, [.012] * 3 + [.008], 4)
    for s in (1, -1):   # the collarbones, from the sternum's top to the shoulders
        stube(bm, [(s * .03, 1.55, .1), (s * .15, 1.58, .07), (s * .27, 1.575, .0)], [.012, .012, .014], 5)
hard('chest__bone', ribcage)

# ---- the mantle: a ragged capelet over the shoulders, open at the front, two torn front panels down to the waist -------
CAPE_ROWS = [(1.72, -.02, .1, .1), (1.665, -.02, .22, .16), (1.6, -.02, .365, .21), (1.5, -.03, .39, .232), (1.3, -.03, .395, .24)]
def ell(y):
    for r0, r1 in zip(CAPE_ROWS, CAPE_ROWS[1:]):
        if r1[0] <= y <= r0[0]:
            f = (y - r0[0]) / (r1[0] - r0[0]); return tuple(a + (b - a) * f for a, b in zip(r0[1:], r1[1:]))
    return CAPE_ROWS[-1][1:]
def mantle(bm):
    A0 = .55
    def at(u, v):
        a = A0 + u * (math.tau - 2 * A0); y = 1.72 - .42 * v; cz, rx, rz = ell(y)
        r = 1 + .06 * v * v * math.sin(a * 7)   # folds opening toward the hem
        return (math.sin(a) * rx * r, y, cz + math.cos(a) * rz * r)
    sheet(bm, 14, 3, at, ragged=.13, seed=21)
    for s in (1, -1):   # the front panels hang from under the capelet's front edge, torn at the waist
        def panel(u, v, s=s):
            x = s * (.085 + .13 * u + .05 * v * u + .02 * v); y = 1.47 - .52 * v   # opening and spreading as they fall
            fold = .016 * math.sin(u * math.pi * 2.2 + s) * (.3 + v)
            return (x, y, .02 + .205 * math.sqrt(max(0.0, 1 - (x / .4) ** 2)) + .014 * v + fold)
        sheet(bm, 3, 3, panel, ragged=.16, seed=30 + s)
hard('chest__cloth', mantle, thick=.014, outward=lambda c: (0, c.y, -.02))

# ---- the quiver, slung across the back over the mantle, its mouth over the right shoulder; its arrows of light ---------
QB, QT = Vector((.12, 1.0, -.325)), Vector((-.15, 1.64, -.35))
def quiver(bm):
    stube(bm, [tuple(QB), tuple(QB.lerp(QT, .5)), tuple(QT)], [.05, .062, .068], 8)
    for f in (.12, .86):   # two bands round it
        stube(bm, [tuple(QB.lerp(QT, f - .025)), tuple(QB.lerp(QT, f + .025))], [.06 + .012 * f, .062 + .012 * f], 8)
hard('chest__wood', quiver)
def quiver_arrows(bm):
    d = (QT - QB).normalized(); side = d.cross(Vector((0, 0, 1))).normalized(); back = d.cross(side).normalized()
    for k, (o1, o2, ln) in enumerate(((-.03, .0, .3), (.0, .028, .34), (.03, .0, .28), (.0, -.028, .26))):
        base = QT - d * .08 + side * o1 + back * o2; tip = base + d * ln + side * o1 * .6
        stube(bm, [tuple(base), tuple(tip)], [.0065, .0065], 4)
        tip_d = (tip - base).normalized()
        for t in (side, back):   # the fletching: two crossed flat vanes, a thin diamond each
            c = tip - tip_d * .05
            q = [c - tip_d * .05, c + t * .02, c + tip_d * .04, c - t * .02]
            n = t.cross(tip_d).normalized() * .002
            f = [bm.verts.new(G(*(p + n))) for p in q]; b = [bm.verts.new(G(*(p - n))) for p in q]
            bm.faces.new(f); bm.faces.new(list(reversed(b)))
            for i in range(4):
                j = (i + 1) % 4; bm.faces.new((b[i], b[j], f[j], f[i]))
hard('chest__light', quiver_arrows)

# ---- spin: the lumbar spine and the pelvis ----------------------------------------------------------------------------
def pelvis(bm):
    stube(bm, [(0, 1.1, -.045), (0, .96, -.04)], [.02, .022], 6)
    for s in (1, -1):
        blob(bm, (s * .085, .97, -.015), .06, (1.0, .9, .38), 1)                    # the iliac wings, splayed
        stube(bm, [(s * .1, .93, .0), (s * .06, .88, .06), (0, .87, .07)], [.016, .014, .014], 5)   # round to the front
    knob(bm, (0, .9, -.05), .03, (1.0, 1.2, .6))   # the sacrum
hard('spin__bone', pelvis)

# ---- the strips of the mantle's skirt: front and sides on loinF, back sides on loinB ----------------------------------
def strips(z, sign, spec, seed):
    def build(bm):
        for k, (x0, x1, ln) in enumerate(spec):
            def at(u, v, x0=x0, x1=x1, ln=ln):
                x = (x0 + (x1 - x0) * u) * (1 + .12 * v)
                zz = z * math.sqrt(max(.2, 1 - (x / .3) ** 2)) + sign * .04 * v
                return (x, 1.0 - ln * v, zz)
            sheet(bm, 2, 3, at, ragged=.12, seed=seed + k)
    return build
hard('loinF__cloth', strips(.15, 1, [(-.23, -.13, .55), (-.12, -.02, .47), (.02, .12, .5), (.13, .23, .57)], 41), thick=.012,
     outward=lambda c: (0, c.y, 0))
hard('loinB__cloth', strips(-.16, -1, [(-.25, -.12, .56), (.12, .25, .53)], 51), thick=.012, outward=lambda c: (0, c.y, 0))

# ---- the back of the mantle: the upper half on capeA, the hem torn into tails on capeB --------------------------------
def cape_top(bm):   # from under the capelet's hem, widening as it falls, folded
    def at(u, v):
        return ((u - .5) * .48 * (1 + .3 * v), 1.47 - .34 * v, -.21 - .05 * math.sin(u * math.pi) - .04 * v - .02 * math.sin(u * math.pi * 5) * v)
    sheet(bm, 6, 3, at)
hard('capeA__cloth', cape_top, thick=.012, outward=(0, 1.35, 0))
def cape_hem(bm):
    for k, (u0, u1, ln) in enumerate(((0, .27, .62), (.25, .52, .73), (.5, .77, .58), (.75, 1, .68))):
        def at(u, v, u0=u0, u1=u1, ln=ln):
            w = u0 + (u1 - u0) * u
            return ((w - .5) * .616 * (1 + .14 * v), 1.16 - ln * v, -.25 - .05 * math.sin(w * math.pi) - .05 * v)
        sheet(bm, 2, 3, at, ragged=.14, seed=61 + k)
hard('capeB__cloth', cape_hem, thick=.012, outward=lambda c: (0, c.y, 0))

# ---- arms: long bare humeri, forearms of two thin bones, long finger bones ---------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    def humerus(bm, x=x):
        stube(bm, [(x, 1.56, -.005), (x, 1.41, 0), (x, 1.27, 0)], [.021, .015, .019], 6)
        knob(bm, (x, 1.555, -.008), .03)
        knob(bm, (x, 1.265, 0), .025, (1.25, .8, 1))
    hard(f'arm{n}__bone', humerus)
    def forearm(bm, x=x, s=s):
        stube(bm, [(x + .012, 1.245, -.005), (x + .01, 1.1, .0), (x + .012, .975, .0)], [.012, .009, .012], 5)
        stube(bm, [(x - .012, 1.25, -.012), (x - .01, 1.1, -.004), (x - .01, .975, .0)], [.013, .009, .011], 5)
        knob(bm, (x, .955, 0), .022, (1.2, .7, 1))   # the wrist
        if s > 0: curl(bm, GX, GY, 0, 1)
        else: curl(bm, AX, AY, AZ, -1)
        if s > 0:   # the bow's horn tips, bone
            for e in (1, -1):
                t = tuple(bow_pt(1.0, e))
                bent_spike(bm, t, (GX, t[1] + e * .075, t[2] + .085), .016, (0, e * .02, -.01), sides=5)
    hard(f'elbow{n}__bone', forearm)

# ---- legs: femurs, shins of two bones, long bony feet ------------------------------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * HX
    def femur(bm, hx=hx, s=s):
        stube(bm, [(hx - s * .03, .92, -.005), (hx, .9, 0), (hx, .7, .012), (hx, .49, .008)], [.022, .024, .018, .022], 6)
        knob(bm, (hx - s * .045, .925, -.005), .028)       # the head in its socket
        knob(bm, (hx, .475, .01), .03, (1.3, .75, 1))     # the knee's end
    hard(f'leg{n}__bone', femur)
    def shin(bm, hx=hx, s=s):
        knob(bm, (hx, .465, .045), .02, (1, 1.1, .7))     # the kneecap
        stube(bm, [(hx, .445, .008), (hx, .27, .004), (hx, .09, 0)], [.022, .015, .018], 6)
        stube(bm, [(hx + s * .024, .42, -.012), (hx + s * .022, .12, -.01)], [.009, .008], 4)
        knob(bm, (hx, .06, -.015), .028, (1.0, .85, 1.35))   # the ankle and heel
        for k, d in enumerate((-.024, 0, .024)):          # long bones of the foot, splayed a little
            stube(bm, [(hx + d * .5, .05, .0), (hx + d, .022, .1), (hx + d * 1.25, .012, .165 - abs(d) * .8)], [.01, .008, .006], 4)
    hard(f'knee{n}__bone', shin)

# ---- the great bow, on the left forearm: dark wood, a thick grip, limbs bowing forward, recurved tips ----------------
def bow(bm):
    stations = [(-1, 1 - k / 10) for k in range(10)] + [(1, k / 10) for k in range(11)]   # bottom tip to top tip
    rings = []
    for e, t in stations:
        p = bow_pt(t, e); q = bow_pt(min(1, t + .02), e) - bow_pt(max(0, t - .02), e) if t > 0 else Vector((0, e, 0))
        tan = (q * e).normalized(); nrm = Vector((0, -tan.z, tan.y)) if tan.length else Vector((0, 0, 1))   # in the yz plane
        grip = max(0.0, 1 - t / .1)
        wx = .022 * grip + (1 - grip) * (.028 - .016 * t); wt = .03 * grip + (1 - grip) * (.02 - .011 * t)
        rings.append([bm.verts.new(G(*(p + Vector((math.sin(a) * wx, 0, 0)) + nrm * math.cos(a) * wt)))
                      for a in (k * math.tau / 6 for k in range(6))])
    bridge(bm, rings, True, True)
hard('elbowL__wood', bow)
def string(bm):
    top, bot = bow_pt(.95, 1), bow_pt(.95, -1)
    stube(bm, [tuple(bot), tuple(top)], [.0045, .0045], 4)
hard('elbowL__light', string)

# ---- the held arrow, along the right forearm, its head down and forward ----------------------------------------------
def held_arrow(bm):
    nock, tip = Vector((AX, 1.3, -.06)), Vector((AX, .44, .2)); d = (tip - nock).normalized()
    head = tip - d * .075
    stube(bm, [tuple(nock), tuple(head)], [.0065, .0065], 4)
    side = Vector((1, 0, 0)); flat = d.cross(side).normalized()
    stube(bm, [tuple(head - d * .01), tuple(head + d * .03), tuple(tip)], [.004, .02, .001], 4, ovals=[(1, .3)] * 3)   # the head
    for t in (side, flat):   # the fletching
        c = nock + d * .06
        q = [c - d * .05, c + t * .02, c + d * .045, c - t * .02]; nn = t.cross(d).normalized() * .002
        f = [bm.verts.new(G(*(p + nn))) for p in q]; b = [bm.verts.new(G(*(p - nn))) for p in q]
        bm.faces.new(f); bm.faces.new(list(reversed(b)))
        for i in range(4):
            j = (i + 1) % 4; bm.faces.new((b[i], b[j], f[j], f[i]))
hard('elbowR__light', held_arrow)

result = tally()
