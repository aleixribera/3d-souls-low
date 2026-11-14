# Aldric, the Gaoler King (STORY.md section 2): the last king to swear the Oath of the Open Hand, who broke the Seven's seal
# and took the Ember. Level 5's boss (the Field of Answer, then the throne room), the end of Act I. One rigid mesh per game
# bone (js/rig.js skeleton at scale 1, MODEL_DEFS.varn), named aldric:<bone>__<material slot>[.n], so every key pose, the
# walk, the cloth swing and the death drive it. The game scales him 1.75x (bulk 1.25). Rest pose: upright, arms hanging
# (the model's posture leans him a little and bends the elbows in the game).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.38, y 1.55,
# elbows y 1.25, wrists y .95 (his greatsword runs along z through the right fist: the weapon bone, below); hips x +-.15,
# y .90, knees .45. Cloth bones (they swing): loinF (0, .93, .19), loinB (0, .93, -.19), and the cloak's chain capeA
# (0, 1.58, -.25), capeB (0, 1.16, -.25), capeC (0, .74, -.25), capeD (0, .38, -.25).
# The look (the MODEL_DEFS brief): a soldier-king in ironbound plate gone dark bronze. A closed great helm with a dark eye
# slit and breaths on one cheek, a crown of shackles on it (a gilt circlet, seven tines, an iron shackle hung from each);
# a gorget of lames; a cast cuirass with gilt borders, and at the breast the Oath's lock: a dark plate with the Open Hand
# raised on it in gilt and a keyhole beneath, a chain of office of iron links hung to it from both shoulders. Layered
# pauldrons, the left one heavier; couters, vambraces with gilt straps, manacles at both wrists (a broken chain off the
# left); gauntlets closed in fists. A belt, fauld lames, a mail skirt; a slate tabard with a tarnished gold stripe front and
# back; cuisses, gilt knee cops, keeled greaves, sabatons; a long ash-grey cloak from the shoulders, torn below the knee.
# His second phase (the Ember-Crowned, `ignite`): the `burn` slot, cracks over the helm, the cuirass and the pauldrons
# with the Ember's light in them, is drawn only while he burns (js/finale.js). Boss budget: 14,000 with the greatsword.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'plate': (0.24, 0.2, 0.15), 'gilt': (0.62, 0.5, 0.26), 'dark': (0.16, 0.15, 0.15), 'iron': (0.3, 0.26, 0.23),
       'mail': (0.3, 0.31, 0.33), 'leather': (0.2, 0.18, 0.16), 'tabard': (0.2, 0.26, 0.36), 'stripe': (0.56, 0.45, 0.22),
       'cloak': (0.5, 0.49, 0.48), 'cloakHem': (0.3, 0.28, 0.27), 'void': (0.02, 0.02, 0.02), 'burn': (1.0, 0.45, 0.12),
       'blade': (0.55, 0.55, 0.57)},
      prefix='aldric:')

SX, EL, WR = .38, 1.25, .95

def lerp_rows(rows, y):
    """rows: (y, *values) top to bottom; the values linearly interpolated at height y."""
    if y >= rows[0][0]: return rows[0][1:]
    for r0, r1 in zip(rows, rows[1:]):
        if r1[0] <= y <= r0[0]:
            f = (y - r0[0]) / (r1[0] - r0[0]); return tuple(a + (b - a) * f for a, b in zip(r0[1:], r1[1:]))
    return rows[-1][1:]

def loop(bm, pts, wire, sides=4):
    """A closed tube through game points (a chain link, a ring)."""
    pts = [Vector(p) for p in pts]; n = len(pts); rings = []
    for i, p in enumerate(pts):
        t = (pts[(i + 1) % n] - pts[i - 1]).normalized()
        a = t.cross(Vector((0, 1, 0)) if abs(t.y) < .9 else Vector((1, 0, 0))).normalized(); b = t.cross(a)
        rings.append([bm.verts.new(G(*(p + (a * math.cos(k / sides * math.tau) + b * math.sin(k / sides * math.tau)) * wire))) for k in range(sides)])
    for i in range(n):
        r0, r1 = rings[i], rings[(i + 1) % n]
        for k in range(sides): bm.faces.new((r0[k], r0[(k + 1) % sides], r1[(k + 1) % sides], r1[k]))

def link(bm, c, t, nrm, L=.05, W=.03, wire=.008, seg=6):
    """One oval chain link centred at c, long along t, lying in the plane normal to nrm."""
    c, t = Vector(c), Vector(t).normalized(); b = t.cross(Vector(nrm)).normalized()
    loop(bm, [c + t * math.cos(k / seg * math.tau) * L / 2 + b * math.sin(k / seg * math.tau) * W / 2 for k in range(seg)], wire)

def chain(bm, at, n, normal, **kw):
    """n links along at(t), t 0..1; each link turned a quarter from the last, as a real chain hangs."""
    for i in range(n):
        t = (i + .5) / n; p = Vector(at(t)); d = Vector(at(min(1, t + .01))) - Vector(at(max(0, t - .01)))
        nr = Vector(normal(p)).normalized()
        if i % 2: nr = d.normalized().cross(nr)
        link(bm, p, d, nr, **kw)

def ribbon(bm, line, normals, width):
    """A thin strip along game points, one shared pair of vertices per point (no gaps at the bends), tapering to its end."""
    n = len(line); L, R = [], []
    for i, p in enumerate(line):
        t = (line[min(i + 1, n - 1)] - line[max(i - 1, 0)]).normalized(); side = t.cross(normals[i]).normalized()
        w = width * (1 - .75 * i / (n - 1))
        L.append(bm.verts.new(G(*(p + side * w)))); R.append(bm.verts.new(G(*(p - side * w))))
    for i in range(n - 1): bm.faces.new((L[i], L[i + 1], R[i + 1], R[i]))

def crack(bm, surf, start, heading, steps, seed, width=.01, step=.024, branch=True):
    """A jagged crack walked over a surface: surf(u, y, lift) -> game point, u an angle (surf.du radians a metre) and y a
    height. The strip's faces are turned out by hard(outward=...). One branch splits off halfway."""
    r = random.Random(seed); u, y = start; h = heading; pts = []
    for i in range(steps + 1):
        pts.append((u, y))
        h += r.uniform(-.7, .7); u += math.cos(h) * step * surf.du; y += math.sin(h) * step
    line = [Vector(surf(u, y, .02)) for u, y in pts]
    ribbon(bm, line, [Vector(surf(u, y, .2)) - p for (u, y), p in zip(pts, line)], width)
    if branch and steps >= 6:
        k = steps // 2
        crack(bm, surf, pts[k], heading + r.choice((-1, 1)) * 1.0, steps // 2, seed + 50, width * .6, step, False)

# ---- head: a closed great helm, an eye slit with the lights behind it, breaths on the right cheek; the crown of shackles -------
HELM = [(2.005, -.012, .03, .034), (1.995, -.012, .088, .098), (1.97, -.012, .126, .14), (1.935, -.012, .146, .161),
        (1.89, -.014, .152, .168), (1.84, -.016, .154, .171), (1.79, -.02, .157, .174), (1.75, -.024, .161, .178),
        (1.715, -.03, .168, .184)]
def keel(a, y): return .045 * max(0.0, math.cos(a)) ** 16 * max(0, min(1, (1.985 - y) / .05))
STOP, SBOT, WA = 1.848, 1.824, 3 * math.tau / 20      # the eye slit: between these heights, three of twenty sides each way
def helm_at(a, y, lift=.0):
    cz, rx, rz = lerp_rows(HELM, y); r = 1 + keel(a, y) + lift
    return (math.sin(a) * rx * r, y, cz + math.cos(a) * rz * r)
helm_at.du = 1 / .16
def helm(bm):
    rows = lambda ys: [(y, 0, *lerp_rows(HELM, y)) for y in ys]
    loft(bm, rows([y for y, *_ in HELM if y > STOP] + [STOP]), 20, cap=False, push=keel)
    loft(bm, rows([STOP, SBOT]), 14, cap=False, a0=WA, a1=math.tau - WA, push=keel)
    loft(bm, rows([SBOT] + [y for y, *_ in HELM if y < SBOT]), 20, cap=False, push=keel)
hard('head__plate', helm, thick=.014, outward=(0, 1.86, -.02))
def recess(bm):   # the dark inside, set back behind the slit
    loft(bm, [(y, 0, cz, rx - .045, rz - .045) for y in (STOP + .02, 1.836, SBOT - .02) for cz, rx, rz in [lerp_rows(HELM, y)]], 8,
         cap=False, a0=-WA - .25, a1=WA + .25)
    for a in (-.8, -.66, -.52):   # the breaths: short dark slots on the right cheek
        for k in range(4):
            y = 1.79 - k * .022
            q = [bm.verts.new(G(*helm_at(a + da, y + dy, .02))) for da, dy in ((-.035, .006), (.035, .006), (.035, -.006), (-.035, -.006))]
            bm.faces.new(q)
hard('head__void', recess, outward=(0, 1.836, -.4))
def bands(bm):   # a darker cross of reinforcing steel: a brow band over the slit and a strip down from the crown
    for y0, y1 in ((STOP + .028, STOP + .006),):
        loft(bm, [(y, 0, cz, rx * 1.022, rz * 1.022) for y in (y0, y1) for cz, rx, rz in [lerp_rows(HELM, y)]], 20, cap=False,
             a0=-1.9, a1=1.9, push=keel)
    for (y0, y1) in ((1.985, STOP + .03), (SBOT - .004, 1.72)):
        rows = [(y, 0, cz, rx * 1.02, rz * 1.02) for y in (y0, (y0 + y1) / 2, y1) for cz, rx, rz in [lerp_rows(HELM, y)]]
        loft(bm, rows, 2, cap=False, a0=-.17, a1=.17, push=keel)
hard('head__dark', bands, outward=(0, 1.86, -.02))
CROWN = 1.93
def circlet(bm):
    for y0, y1, lift in ((CROWN + .03, CROWN, .05),):
        loft(bm, [(y, 0, cz, rx * (1 + lift), rz * (1 + lift)) for y in (y0, y1) for cz, rx, rz in [lerp_rows(HELM, y)]], 21, cap=False, push=keel)
    for i in range(7):   # seven tines, the front one and every other one tall, leaning out a little
        a = i * math.tau / 7; h = .15 if i % 2 == 0 else .1
        b = Vector(helm_at(a, CROWN + .028, .055)); o = Vector((math.sin(a), 0, math.cos(a)))
        side = Vector((math.cos(a), 0, -math.sin(a)))
        def at(u, v, b=b, o=o, side=side, h=h):
            w = .028 * (1 - v) ** .8 + .002
            return b + side * (u - .5) * 2 * w + Vector((0, h * v, 0)) + o * (.035 * v * v)
        sheet(bm, 2, 3, at)
hard('head__gilt', circlet, thick=.009, outward=(0, 1.9, -.012))
def shackles(bm):   # an open iron shackle hung from the circlet under each tine
    for i in range(7):
        a = i * math.tau / 7; c = Vector(helm_at(a, CROWN - .022, .085)); o = Vector((math.sin(a), 0, math.cos(a)))
        side = Vector((math.cos(a), 0, -math.sin(a)))
        loop(bm, [c + side * math.cos(k / 8 * math.tau) * .024 + Vector((0, math.sin(k / 8 * math.tau) * .028, 0)) for k in range(8)], .006, 4)
hard('head__iron', shackles)
def helm_cracks(bm):   # the Ember-Crowned: cracks up from the slit's ends and down the cheek
    crack(bm, helm_at, (.55, 1.86), 1.3, 7, 3, width=.009, step=.02)
    crack(bm, helm_at, (-.6, 1.86), 1.75, 6, 8, width=.009, step=.02)
    crack(bm, helm_at, (.35, 1.815), -1.6, 6, 13, width=.008, step=.02)
hard('head__burn', helm_cracks, outward=(0, 1.86, -.02))

# ---- neck: a gorget of three dark lames over mail ----------------------------------------------------------------------------
hard('neck__mail', lambda bm: loft(bm, [(1.74, 0, -.02, .11, .11), (1.6, 0, -.01, .12, .12)], 8, cap=False), outward=(0, 1.68, -.01))
def gorget(bm):
    for (y0, r0, y1, r1) in ((1.62, .27, 1.665, .215), (1.655, .22, 1.7, .18), (1.69, .185, 1.735, .158)):
        loft(bm, [(y0, 0, -.015, r0, r0 * .76), (y1, 0, -.018, r1, r1 * .82)], 16, cap=False)
hard('neck__dark', gorget, outward=(0, 1.6, -.02))

# ---- chest: a cast cuirass with gilt borders; the Oath's lock and a chain of office ---------------------------------------------
CUIRASS = [(1.66, -.02, .17, .125), (1.6, -.008, .285, .19), (1.5, .012, .315, .212), (1.38, .022, .295, .212),
           (1.25, .018, .25, .182), (1.12, .005, .218, .166)]
def ckeel(a, y): return .05 * max(0.0, math.cos(a)) ** 10 * max(0, min(1, (1.58 - y) / .12))
def flute(a, y): return .012 * math.cos(a * 11) * max(0, min(1, (1.4 - y) / .12)) * max(0.0, -math.cos(a) + .3)   # flutes round the back
def cpush(a, y): return ckeel(a, y) + flute(a, y)
hard('chest__plate', lambda bm: loft(bm, [(y, 0, cz, rx, rz) for y, cz, rx, rz in CUIRASS], 32, cap=True, push=cpush))
def chest_at(a, y, lift=.0):
    cz, rx, rz = lerp_rows(CUIRASS, y); r = 1 + cpush(a, y) + lift
    return (math.sin(a) * rx * r, y, cz + math.cos(a) * rz * r)
chest_at.du = 1 / .29
def chest_x(x, y, lift=.0):   # a point on the front of the cuirass at (x, y)
    cz, rx, rz = lerp_rows(CUIRASS, y); return chest_at(math.asin(max(-1, min(1, x / rx))), y, lift)
def chest_normal(p):
    cz, rx, rz = lerp_rows(CUIRASS, p.y); return Vector((p.x / rx ** 2, 0, (p.z - cz) / rz ** 2))
def borders(bm):
    for y0, y1, r in ((1.66, 1.63, .03), (1.14, 1.11, .05)):   # rims at the neck and the waist
        loft(bm, [(y, 0, cz, rx * (1 + r), rz * (1 + r)) for y in (y0, y1) for cz, rx, rz in [lerp_rows(CUIRASS, y)]], 24, cap=False,
             push=lambda a, y: ckeel(a, y))
    for s in (-1, 1):   # raised borders from the armpits down and in to the plackart's point, rivets inside them
        tube(bm, [chest_x(s * x, y, .03) for x, y in ((.27, 1.5), (.22, 1.38), (.13, 1.27), (.04, 1.2))], [.008] * 4, 4)
        for y, x in ((1.44, .19), (1.33, .14)): stud(bm, chest_x(s * x, y, .035), .01)
hard('chest__gilt', borders, outward=(0, 1.38, .0))
LOCK = 1.4
def lock_outline():   # the lock's plate, a heater shape: (x, y) round its rim
    return [(-.07, LOCK + .07), (.07, LOCK + .07), (.076, LOCK - .005), (.045, LOCK - .068), (0, LOCK - .095), (-.045, LOCK - .068), (-.076, LOCK - .005)]
def lock_plate(bm):
    outline = lock_outline()
    front = [bm.verts.new(G(*chest_x(x, y, .2))) for x, y in outline]
    back = [bm.verts.new(G(*chest_x(x, y, .03))) for x, y in outline]
    bm.faces.new(front)
    for k in range(len(outline)):
        j = (k + 1) % len(outline); bm.faces.new((back[k], back[j], front[j], front[k]))
hard('chest__dark', lock_plate, outward=(0, LOCK, -.1))
def hand(bm):   # the Open Hand, raised in gilt on the lock: a palm, four fingers up, the thumb out to the side
    c = Vector(chest_x(0, LOCK - .005, .23)); k = 1.3
    blob(bm, c, .03 * k, (1.0, 1.1, .32), 1)
    for j, dx in enumerate((-.022, -.008, .008, .022)):
        ln = (.032, .04, .041, .034)[j]
        tube(bm, [c + Vector((dx * k, .022 * k, .002)), c + Vector((dx * 1.25 * k, (.022 + ln) * k, .0))], [.0075 * k, .0065 * k], 5)
    tube(bm, [c + Vector((.024 * k, -.004 * k, .002)), c + Vector((.052 * k, .02 * k, .0))], [.008 * k, .0065 * k], 5)
    for s in (-1, 1): stud(bm, chest_x(s * .058, LOCK + .055, .2), .009)   # the plate's rivets
hard('chest__gilt.1', hand)
def keyhole(bm):
    c = Vector(chest_x(0, LOCK - .062, .205)) + Vector((0, 0, .002))
    blob(bm, c + Vector((0, .006, 0)), .009, (1, 1, .2), 1)
    q = [bm.verts.new(G(*(c + Vector(d)))) for d in ((-.0045, 0, 0), (.0045, 0, 0), (.0065, -.02, 0), (-.0065, -.02, 0))]
    bm.faces.new(q)
hard('chest__void', keyhole, outward=(0, LOCK, -.1))
def office(bm):   # a chain of office: from each shoulder's top over the breast down to the lock's shoulders
    for s in (1, -1):
        def at(t, s=s):
            x = s * (.22 - .158 * t); y = 1.61 - (1.61 - LOCK - .07) * t - .03 * math.sin(math.pi * t)
            return chest_x(x, y, .07)
        chain(bm, at, 9, chest_normal)
hard('chest__iron', office)
def chest_cracks(bm):   # the Ember-Crowned: cracks out from the lock across the cuirass
    for k, (a, y, h, n) in enumerate(((.26, LOCK + .03, .35, 9), (-.26, LOCK + .03, 2.8, 9), (.18, LOCK - .07, -.6, 8),
                                      (-.16, LOCK - .08, -2.5, 8), (.05, 1.25, -1.5, 5))):
        crack(bm, chest_at, (a, y), h, n, 21 + k)
hard('chest__burn', chest_cracks, outward=(0, 1.38, -.02))

# ---- spin: a belt with a gilt buckle, three fauld lames, the mail skirt ---------------------------------------------------------
hard('spin__leather', lambda bm: loft(bm, [(1.14, 0, .005, .215, .168), (1.08, 0, .006, .22, .172)], 12, cap=False), outward=(0, 1.11, 0))
def buckle(bm):
    loop(bm, [(math.cos(k / 8 * math.tau) * .04, 1.11 + math.sin(k / 8 * math.tau) * .032, .18) for k in range(8)], .009, 4)
    blob(bm, (0, 1.11, .176), .012, (1, 2.4, .6), 1)
hard('spin__gilt', buckle)
def fauld(bm):
    for i in range(3):
        y0 = 1.085 - i * .065
        loft(bm, [(y0, 0, .006, .222 + .018 * i, .174 + .012 * i), (y0 - .085, 0, .01, .245 + .018 * i, .188 + .012 * i)], 14, cap=False,
             a0=-2.3, a1=2.3)
hard('spin__plate', fauld, outward=lambda c: (0, c.y + .05, 0))
hard('spin__mail', lambda bm: loft(bm, [(1.0, 0, .0, .226, .175), (.86, 0, .0, .256, .194), (.7, 0, -.005, .27, .205)], 12, cap=False),
     outward=lambda c: (0, c.y, 0))

# ---- the tabard: slate cloth front and back, a tarnished gold stripe down the front -------------------------------------------
def tabard(name, z, w, top, hem, seed, rag, cols=5):
    sz = 1 if z > 0 else -1
    def at(u, v, w=w):
        x = (u - .5) * (w + .04 * v); y = top + (hem - top) * v
        return (x, y, z + sz * (.02 * math.cos((u - .5) * math.pi) + .035 * v))
    hard(name, lambda bm: sheet(bm, cols, 5, at, ragged=rag, seed=seed))
T_Z = .2
tabard('loinF__tabard', T_Z, .32, 1.08, .3, 3, .05)
tabard('loinB__tabard', -T_Z, .34, 1.08, .24, 6, .07)
def stripe(bm):
    def at(u, v):
        x = (u - .5) * .062; y = 1.075 + (.33 - 1.075) * v
        return (x, y, T_Z + .02 + .035 * v + .005)
    sheet(bm, 1, 5, at)
hard('loinF__stripe', stripe, outward=(0, .7, 0))

# ---- the cloak: ash-grey, long, from the shoulders behind the pauldrons, torn into strips below the knee -----------------------
TOP, HEM = 1.62, .04
def cloak_at(u, v):   # u across (0 the figure's right), v = 0 the shoulders .. 1 the hem
    y = TOP + (HEM - TOP) * v; w = .62 + .4 * v ** .8
    x = (u - .5) * w
    bow = (.13 - .04 * v) * (1 - math.cos((u - .5) * math.pi))          # the edges wrap forward round the body
    z = -.245 - .09 * v ** 1.2 - .04 * math.sin(v * math.pi) + bow
    if v < .08: z += .07 * (1 - v / .08) ** 2                               # it turns over the shoulders' top
    return (x, y, z)
SEGS = [('capeA', 1.58), ('capeB', 1.16), ('capeC', .74), ('capeD', .38)]
def v_of(y): return (TOP - y) / (TOP - HEM)
for i, (bone, y0) in enumerate(SEGS[:3]):
    v0, v1 = (0 if i == 0 else v_of(y0)), v_of(SEGS[i + 1][1])
    rows = 3 if i == 0 else 2
    hard(f'{bone}__cloak', lambda bm, v0=v0, v1=v1, rows=rows: sheet(bm, 10, rows, lambda u, v: cloak_at(u, v0 + (v1 - v0) * v)))
def strips(bm):
    r = random.Random(9); n = 8; v0 = v_of(.38)
    for k in range(n):
        u0, u1 = k / n + .005, (k + 1) / n - .005; ln = r.uniform(.7, 1.0)
        sheet(bm, 2, 3, lambda u, v, u0=u0, u1=u1, ln=ln: cloak_at(u0 + (u1 - u0) * u, v0 + (1 - v0) * ln * v), ragged=.06, seed=k + 30)
hard('capeD__cloakHem', strips)

# ---- arms: mail sleeves under layered pauldrons, the left one heavier; gilt rivets and a gilt edge -------------------------------
PY = 1.6
PAUL = {1: (.225, .37), -1: (.18, .37)}   # by side: the cap's radius, its centre's distance out
def paul_at_for(s):
    PR, cxo = PAUL[s]; cx = s * cxo
    def at(a, e, lift=.0):   # a point on the cap: a the angle round y, e the elevation
        rx, ry, rz = PR * (1 + lift), .13 * PR / .19 * (1 + lift), PR * .95 * (1 + lift)
        p = Vector((cx + math.sin(a) * math.cos(e) * rx, PY + math.sin(e) * ry, -.01 + math.cos(a) * math.cos(e) * rz))
        return (p.x, p.y - .06 * max(0, (p.x - cx) * s) / PR, p.z)
    return at
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX; PR, cxo = PAUL[s]; cx = s * cxo; k_ = PR / .19
    hard(f'arm{n}__mail', lambda bm, x=x: loft(bm, [(1.62, x, 0, .088, .088), (1.42, x, 0, .083, .083), (EL + .03, x, 0, .075, .075)], 8, cap=True))
    def pauldron(bm, x=x, s=s, cx=cx, PR=PR, k_=k_):
        shell(bm, (cx, PY, -.01), PR, .13 * k_, PR * .95, 0, math.pi / 2, 0, math.tau, nu=16, nv=4,
              warp=lambda p, a, e, cx=cx, s=s: (p.x, p.y - .06 * max(0, (p.x - cx) * s) / PR, p.z))
        side = s * math.pi / 2
        for j, (y0, y1, r) in enumerate(((1.57, 1.49, .19), (1.5, 1.42, .17), (1.43, 1.36, .15))):   # three lames stepping down
            y0, y1 = PY - (PY - y0) * k_, PY - (PY - y1) * k_
            loft(bm, [(y0, x + s * .02, -.01, r * .82 * k_, r * .86 * k_), (y1, x + s * .03, -.01, r * .9 * k_, r * .94 * k_)], 10, cap=False,
                 a0=side - 1.95, a1=side + 1.95)
    hard(f'arm{n}__plate', pauldron, thick=.016)
    def paul_gilt(bm, x=x, s=s, cx=cx, PR=PR, k_=k_):
        for j in range(7):   # rivets round the cap's rim
            a = s * (math.pi / 2) - 1.6 + 3.2 * j / 6
            stud(bm, (cx + math.sin(a) * PR * 1.03, PY - .012, -.01 + math.cos(a) * PR * .98), .012)
        y1, r = PY - (PY - 1.36) * k_, .15 * k_   # a gilt edge along the lowest lame
        side = s * math.pi / 2
        tube(bm, [(x + s * .03 + math.sin(side + t) * r * .9, y1, -.01 + math.cos(side + t) * r * .94) for t in [(-1.95 + 3.9 * i / 10) for i in range(11)]],
             [.008] * 11, 4)
    hard(f'arm{n}__gilt', paul_gilt)
    def paul_cracks(bm, s=s):
        at = paul_at_for(s)
        # walk in (angle, elevation): the crack's "y" is the elevation, scaled so a step is about the same length
        def walk(a0, e0, h, n_, seed):
            r = random.Random(seed); a, e = a0, e0; pts = []
            for i in range(n_ + 1):
                pts.append((a, e)); h += r.uniform(-.6, .6); a += math.cos(h) * .14; e += math.sin(h) * .14
                e = max(.08, min(1.35, e))
            line = [Vector(at(a, e, .03)) for a, e in pts]
            ribbon(bm, line, [Vector(at(a, e, .2)) - p for (a, e), p in zip(pts, line)], .01)
        walk(s * 1.2, .25, 1.2, 6, 40 + s)
        walk(s * 2.0, .3, 2.0, 5, 44 + s)
    hard(f'arm{n}__burn', paul_cracks, outward=(cx, PY - .08, -.01))

# ---- forearms: couters, vambraces with gilt straps, manacles at the wrists (a broken chain off the left); gauntlets -------------
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    def couter(bm, x=x, s=s):   # a cup over the back of the elbow and a fan wing on the outside
        shell(bm, (x, EL, -.02), .088, .088, .082, -1.0, 1.1, math.pi - 1.4, math.pi + 1.4, nu=6, nv=3)
        def fan(u, v):
            a = -1.0 + 2.0 * u; r = .072 + .075 * v
            return (x + s * (.062 + .03 * v), EL + math.sin(a) * r * .9, -.01 + math.cos(a) * r * .5 - .02)
        sheet(bm, 5, 1, fan)
    hard(f'elbow{n}__plate', couter, thick=.012)
    hard(f'elbow{n}__plate.1', lambda bm, x=x: loft(bm, [
        (EL - .05, x, 0, .072, .074), (EL - .14, x, 0, .073, .075), (WR + .12, x, 0, .064, .066), (WR + .07, x, 0, .066, .068),
        (WR + .045, x, 0, .086, .088), (WR + .025, x, 0, .082, .084)], 10, cap=True))
    def straps(bm, x=x):   # two gilt straps round the vambrace
        for y in (1.18, 1.09):
            loft(bm, [(y + .014, x, 0, .08, .082), (y - .014, x, 0, .08, .082)], 10, cap=False)
    hard(f'elbow{n}__gilt', straps, outward=lambda c, x=x: (x, c.y, 0))
    def manacle(bm, x=x, s=s):   # a dark iron cuff at the wrist, a hinge knuckle on the outside, a ring for the chain
        loft(bm, [(WR + .105, x, 0, .088, .09), (WR + .095, x, 0, .094, .096), (WR + .06, x, 0, .094, .096), (WR + .05, x, 0, .088, .09)], 12, cap=False)
        blob(bm, (x + s * .095, WR + .078, 0), .018, (.8, 1.3, .8), 1)
        loop(bm, [(x + math.sin(k / 8 * math.tau) * .03, WR + .05 + math.cos(k / 8 * math.tau) * .022 - .022, .092) for k in range(8)], .006, 4)
        if s > 0:   # a broken length of chain off the left one
            p = Vector((x, WR + .02, .095))
            chain(bm, lambda t, p=p: p + Vector((.01 * t, -.17 * t, .02 * t * t)), 4, lambda q: (0, 0, 1), L=.046, W=.028, wire=.007)
    hard(f'elbow{n}__iron', manacle, outward=lambda c, x=x: (x, c.y, 0))
    def gauntlet(bm, x=x, s=s):   # the fist closed round the grip (along z through the wrist): back of the hand outside
        blob(bm, (x + s * .028, WR - .02, 0), .062, (.62, 1.0, 1.15), 1)
        for zf in (-.041, -.013, .014, .041):
            tube(bm, [(x + s * .041, WR - .026, zf), (x + s * .03, WR - .083, zf * 1.1), (x - s * .027, WR - .089, zf * 1.1), (x - s * .048, WR - .04, zf)],
                 [.021, .02, .018, .016], 5)
        tube(bm, [(x + s * .02, WR - .007, .062), (x - s * .015, WR, .075), (x - s * .048, WR - .011, .067)], [.02, .018, .015], 5)
        if s > 0: blob(bm, (x - s * .006, WR - .056, 0), .037, (1.0, .9, 1.45), 1)   # the empty left fist: no hole through it
    soft(f'elbow{n}__plate.2', gauntlet, 110, voxel=.006)

# ---- legs: mail thighs under cuisses, gilt knee cops; keeled greaves, sabatons -------------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    hard(f'leg{n}__mail', lambda bm, hx=hx: loft(bm, [(.97, hx, -.01, .135, .135), (.72, hx * 1.04, .0, .116, .116), (.47, hx, .01, .094, .094)], 8, cap=True))
    def cuisse(bm, hx=hx, s=s):
        c = s * .35   # over the front and the outside of the thigh
        loft(bm, [(.86, hx + s * .01, .0, .13, .134), (.7, hx + s * .01, .01, .122, .126), (.55, hx, .016, .104, .108)], 8, cap=False,
             a0=c - 1.4, a1=c + 1.4)
    hard(f'leg{n}__plate', cuisse, outward=lambda c, hx=hx: (hx, c.y, -.02))
    def cop(bm, hx=hx, s=s):
        def point(p, a, e): return (p.x, p.y, p.z + .028 * max(0, math.cos(a)) * max(0, 1 - abs(e)))
        shell(bm, (hx, .455, .045), .088, .088, .068, -1.1, 1.25, -1.5, 1.5, nu=6, nv=3, warp=point)
        def wing(u, v):   # its fan on the outside of the knee
            a = -1.1 + 2.2 * u; r = .052 + .046 * v
            return (hx + s * (.078 + .02 * v), .455 + math.sin(a) * r, .03 + math.cos(a) * r * .4)
        sheet(bm, 4, 1, wing)
    hard(f'leg{n}__gilt', cop, thick=.01)
    def shin(a, y): return .14 * max(0.0, math.cos(a)) ** 6 * max(0, min(1, (y - .12) / .2))
    hard(f'knee{n}__plate', lambda bm, hx=hx, shin=shin: loft(bm, [(.42, hx, .004, .086, .088), (.33, hx, -.008, .094, .102),
                                                                 (.2, hx, .0, .078, .08), (.115, hx, .004, .074, .076)], 10, cap=True, push=shin))
    def sabaton(bm, hx=hx):
        blob(bm, (hx, .088, -.005), .072, (1.0, .95, 1.1), 1)
        for k in range(3): blob(bm, (hx, .07 - k * .008, .062 + k * .05), .066 - k * .006, (1.0, .8, .9), 1)
        blob(bm, (hx, .045, .21), .043, (1.0, .75, 1.25), 1)
        blob(bm, (hx, .048, -.057), .052, (1.0, .9, .8), 1)
    soft(f'knee{n}__plate.1', sabaton, 90, voxel=.008)

# ==== THE GAOLER'S BLADE (pass 75, on the weapon bone; it replaces the kit's greatsword) ===================================
# His own: a broad, plain soldier's greatsword, the blade he carried as a just king, with the gaol forged onto its hilt. The
# blade runs along +z through the right fist (x -SX, y WR - .05: the gauntlet's grip line), its flat facing x and its edges
# up and down in y (an edge leads every cut). A dark fuller down each face; a squared iron ricasso; a heavy iron cross
# whose two ends are manacle cuffs, a shackle forged onto each side of the guard; a long leather grip for both hands (the
# left closes on it below the right, `grip.span`); and for a pommel the Oath's lock, a gilt padlock whose shackle is locked
# round the grip's end, a keyhole in each face. The game's 1.75x makes it 3.0 m long, 2.4 of it blade.
BX, BY = -SX, WR - .05
def blade_rows(bm, rows, sides_fn):
    """A lofted blade: rows (z, half-width w, half-thickness t), each a ring of points from sides_fn; a point at the end."""
    rings = [[bm.verts.new(G(*p)) for p in sides_fn(z, w, t)] for z, w, t in rows[:-1]]
    bridge(bm, rings, True, False)
    bm.faces.new(list(reversed(rings[0])))
    tip = bm.verts.new(G(BX, BY, rows[-1][0])); r = rings[-1]
    for k in range(len(r)): bm.faces.new((r[k], r[(k + 1) % len(r)], tip))
def hexa(z, w, t):   # a flat face with a bevel to each edge: the edge, the bevel, the flat, the bevel, the other edge
    return [(BX, BY + w, z), (BX + t * .9, BY + w * .45, z), (BX + t * .9, BY - w * .45, z), (BX, BY - w, z),
            (BX - t * .9, BY - w * .45, z), (BX - t * .9, BY + w * .45, z)]
BLADE = [(.16, .06, .017), (.4, .058, .016), (.8, .054, .015), (1.1, .048, .013), (1.25, .036, .011), (1.33, .018, .008), (1.38, 0, 0)]
hard('weapon__blade', lambda bm: blade_rows(bm, BLADE, hexa))
def fuller(bm):   # a dark groove down each face, from the ricasso to two thirds of the way up
    for s in (1, -1):
        rows = [(.18, .013), (.6, .012), (.95, .009), (1.05, .0)]
        L = [bm.verts.new(G(BX + s * .0165, BY + w, z)) for z, w in rows]; R = [bm.verts.new(G(BX + s * .0165, BY - w, z)) for z, w in rows]
        for i in range(len(rows) - 1):
            if rows[i + 1][1] > 0: bm.faces.new((L[i], L[i + 1], R[i + 1], R[i]))
            else: bm.faces.new((L[i], L[i + 1], R[i]))
hard('weapon__dark', fuller, outward=lambda c: (BX, BY, c.z))
def hilt_iron(bm):
    tube(bm, [(BX, BY, .06), (BX, BY, .16)], [.028, .026], 4)   # the squared ricasso
    tube(bm, [(BX, BY - .19, .062), (BX, BY - .09, .066), (BX, BY, .068), (BX, BY + .09, .066), (BX, BY + .19, .062)],
         [.019, .022, .025, .022, .019], 6)                          # the cross
    for s in (1, -1):                                                # a manacle cuff at each end, its hinge knuckle outside
        loop(bm, [(BX + math.sin(k / 10 * math.tau) * .042, BY + s * (.235 + math.cos(k / 10 * math.tau) * .042), .06) for k in range(10)], .011, 5)
        blob(bm, (BX, BY + s * .283, .06), .014, (1.2, .9, 1.2), 1)
    for z in (.02, -.29): tube(bm, [(BX, BY, z - .012), (BX, BY, z + .012)], [.027, .027], 8)   # the grip's ferrules
hard('weapon__iron', hilt_iron)
hard('weapon__leather', lambda bm: tube(bm, [(BX, BY, .03 - k * .032) for k in range(11)],
                                        [.024 if k % 2 else .021 for k in range(11)], 7))   # bound in ridged leather
def oath_lock(bm):   # the pommel: a gilt padlock, its shackle locked round the grip's end
    blob(bm, (BX, BY, -.36), .048, (.62, 1.15, .95), 1)
    arc = [(BX, BY + math.cos(k / 6 * math.pi) * .03, -.31 + math.sin(k / 6 * math.pi) * .028) for k in range(7)]
    tube(bm, [(BX, BY + .03, -.33)] + arc + [(BX, BY - .03, -.33)], [.008] * 9, 5)
hard('weapon__gilt', oath_lock)
hard('weapon__void', lambda bm: [blob(bm, (BX + s * .029, BY, -.365), .011, (.3, 1.0, 1.6), 1) for s in (1, -1)])   # a keyhole in each face

result = tally()
