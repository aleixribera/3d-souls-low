# The Thunder Hawk, a summon (the ability of the same name, js/data/abilities.js; design/abilities/thunder-hawk.md): a
# large hawk drawn in lightning that circles over the fight and stoops on the boss. Not a rig figure: one rigid mesh per
# joint of its own, named hawk:<part>__<material slot>[.n], each built at its absolute rest place; js/summon-birds.js hangs
# each on a pivot (BIRD_JOINTS.hawk there, the same numbers as JOINT below), flaps the wings by rolling them about z at
# their joints, sweeps them back by turning them about y, and fans the tail itself.
# Game axes (x = the hawk's left, y up, z forward: its beak points +z), written to Blender through G(). Built gliding:
# body level, wings spread flat and straight out along +-x, tail fanned a little; the centre of mass at the origin.
# Joints at rest (x, y, z), parent:
#   body   (0, 0, 0)          root
#   head   (0, .04, .2)       body
#   wingLu (.07, .03, .03)    body     wingLl (.45, .03, 0)    wingLu
#   wingRu (-.07, .03, .03)   body     wingRl (-.45, .03, 0)   wingRu
#   tail   (0, 0, -.17)       body
# The eyes are not modelled: the game puts glowing spheres at (+-.035, .07, .27), on the head's surface, under a brow.
# The look: a big hawk with long fingered primaries (five separate feathers per wing tip) and a hooked beak, its body an
# ink-dark silhouette (`ink`) and its feathers drawn as branching jagged lightning lines (`bolt`: solid flat strips at
# least 1.5 cm wide) along every wing edge, down each primary's leading edge and down the tail, on the top and the
# underside alike, since players see it from below. Size: .6 m beak to tail, 1.8 m wingspan. About 1,500 triangles.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from snow_lib import tube as stube
from figure_lib import *
import bmesh
from mathutils import Vector

JOINT = {
    'body': (0, 0, 0), 'head': (0, .04, .2), 'tail': (0, 0, -.17),
    'wingLu': (.07, .03, .03), 'wingLl': (.45, .03, 0), 'wingRu': (-.07, .03, .03), 'wingRl': (-.45, .03, 0),
}
Y = .03   # the wings' plane

begin({'ink': (0.043, 0.051, 0.071), 'bolt': (0.56, 0.72, 0.86)}, prefix='hawk:')

# ---- shape helpers (game space; 2D points are (x, z) in a horizontal plane) -------------------------------------------
def foil(bm, rows, y, th, sec=6):
    """A closed wing panel through rows of (lead (x, z), trail (x, z)): a faceted section, flat on top and below."""
    loops = []
    for (lx, lz), (tx, tz) in rows:
        def at(f, dy): return bm.verts.new(G(lx + (tx - lx) * f, y + dy, lz + (tz - lz) * f))
        if sec == 6: loops.append([at(0, 0), at(.2, th / 2), at(.75, th / 2), at(1, 0), at(.75, -th / 2), at(.2, -th / 2)])
        else: loops.append([at(0, 0), at(.4, th / 2), at(1, 0), at(.4, -th / 2)])
    for a, b in zip(loops, loops[1:]):
        for k in range(len(a)):
            j = (k + 1) % len(a); bm.faces.new((a[k], a[j], b[j], b[k]))
    bm.faces.new(loops[0]); bm.faces.new(list(reversed(loops[-1])))

def plate(bm, outline, y, th):
    """A flat prism: a polygon outline of (x, z) points, `th` thick about height y."""
    top = [bm.verts.new(G(x, y + th / 2, z)) for x, z in outline]
    bot = [bm.verts.new(G(x, y - th / 2, z)) for x, z in outline]
    bm.faces.new(top); bm.faces.new(list(reversed(bot)))
    for k in range(len(top)):
        j = (k + 1) % len(top); bm.faces.new((top[k], top[j], bot[j], bot[k]))

def strip(bm, pts, w, y0, y1, ridge=False):
    """A solid flat strip through (x, z) points, w wide (one width or one per point), between heights y0 and y1;
    `ridge` makes it a three-sided ridge instead (its flat side down at y0, or up when y0 > y1), half the triangles."""
    P = [Vector(p) for p in pts]; n = len(P); ws = w if isinstance(w, (list, tuple)) else [w] * n; loops = []
    for i, p in enumerate(P):
        t2 = (P[min(i + 1, n - 1)] - P[max(i, 0) if i < n - 1 else i - 1]).normalized()
        t1 = (P[i] - P[i - 1]).normalized() if i else t2
        t = (t1 + t2); t = t.normalized() if t.length > 1e-4 else t2
        nrm = Vector((-t.y, t.x)); s = min(1 / max(nrm.dot(Vector((-t2.y, t2.x))), .4), 1.7)
        a, b = p + nrm * ws[i] / 2 * s, p - nrm * ws[i] / 2 * s
        if ridge:
            loops.append([bm.verts.new(G(p.x, y1, p.y)), bm.verts.new(G(b.x, y0, b.y)), bm.verts.new(G(a.x, y0, a.y))])
        else:
            loops.append([bm.verts.new(G(a.x, y1, a.y)), bm.verts.new(G(b.x, y1, b.y)),
                          bm.verts.new(G(b.x, y0, b.y)), bm.verts.new(G(a.x, y0, a.y))])
    for r0, r1 in zip(loops, loops[1:]):
        for k in range(len(r0)):
            j = (k + 1) % len(r0); bm.faces.new((r0[k], r0[j], r1[j], r1[k]))
    bm.faces.new(list(reversed(loops[0]))); bm.faces.new(loops[-1])

def jag(rnd, a, b, n, amp):
    """A lightning zigzag from a to b in n segments, kinking amp to either side."""
    a, b = Vector(a), Vector(b); d = b - a; nrm = Vector((-d.y, d.x)).normalized(); out = [tuple(a)]
    for k in range(1, n):
        q = a + d * (k / n) + nrm * amp * (1 if k % 2 else -1) * rnd.uniform(.55, 1.0); out.append((q.x, q.y))
    return out + [tuple(b)]

def lerp_tab(tab, x):
    for (x0, z0), (x1, z1) in zip(tab, tab[1:]):
        if x <= x1: f = (x - x0) / (x1 - x0); return z0 + (z1 - z0) * f
    return tab[-1][1]

def mirror(pts, s): return [(x * s, z) for x, z in pts]

def both(bm, pts, w, top, h=.007):
    """A lightning line drawn on a panel's top (at height top) and its underside alike."""
    strip(bm, pts, w, Y + top - .002, Y + top + h - .002, ridge=True)
    strip(bm, pts, w, Y - top + .002, Y - top - h + .002, ridge=True)

# ---- body: a deep keeled chest tapering to the tail, a thick neck -----------------------------------------------------
def body(bm):
    blob(bm, (0, 0, 0), .08, (1.0, .78, 1.85), 2)          # the torso
    blob(bm, (0, -.012, .07), .066, (1.0, 1.0, 1.3), 2)   # the chest
    blob(bm, (0, .035, .16), .054, (1.0, .95, 1.1), 1)      # the neck, short and thick
    blob(bm, (0, -.002, -.13), .045, (1.0, .55, 1.4), 1)  # the rump
    for s in (-1, 1): blob(bm, (s * .03, -.035, -.06), .026, (.9, .7, 1.4), 1)   # the tucked thighs
soft('body__ink', body, 170, voxel=.008)

# ---- head: a flat brow over the eyes, a short hooked beak -------------------------------------------------------------
def head(bm):
    blob(bm, (0, .05, .245), .042, (1.12, 1.0, 1.45), 2)
    for s in (-1, 1): blob(bm, (s * .025, .087, .266), .017, (1.0, .5, 1.5), 1)   # the brows, a frown over the eye sockets
soft('head__ink', head, 110, voxel=.005)
def beak(bm):
    stube(bm, [(0, .046, .283), (0, .048, .312), (0, .037, .338), (0, .012, .346)], [.021, .015, .009, .002], 5,
          ovals=[(.75, 1.0)] * 4)
hard('head__ink.1', beak)

# ---- wings: a broad arm, a hand, five long fingered primaries ---------------------------------------------------------
ARM_LEAD = [(.07, .085), (.14, .095), (.2, .1), (.33, .095), (.45, .08)]
ARM_TRAIL = [(.07, -.115), (.14, -.165), (.2, -.19), (.33, -.192), (.45, -.172)]
HAND_LEAD = [(.45, .08), (.56, .07), (.655, .05)]
HAND_TRAIL = [(.45, -.172), (.56, -.15), (.625, -.13)]
ARM_TH, HAND_TH, FING_TH = .022, .016, .01
FINGERS = [(15, .23), (3, .255), (-9, .25), (-21, .225), (-34, .195)]   # (angle from straight out, + forward; length)

def finger(i):
    """Primary i: its root (inside the hand), direction and forward side, length, width at the root."""
    e0, e1 = Vector(HAND_LEAD[-1]), Vector(HAND_TRAIL[-1]); base = e0.lerp(e1, .06 + .88 * i / 4)
    a = math.radians(FINGERS[i][0]); d = Vector((math.cos(a), math.sin(a))); p = Vector((-d.y, d.x))
    return base - d * .025, d, p, FINGERS[i][1] + .025, .04

def wing_upper(s):
    def build(bm):
        rows = [((x * s, lerp_tab(ARM_LEAD, x)), (x * s, lerp_tab(ARM_TRAIL, x))) for x in (.07, .14, .2, .33, .45)]
        foil(bm, rows, Y, ARM_TH)
    return build
def wing_upper_bolt(s):
    def build(bm):
        rnd = random.Random(7); h = ARM_TH / 2 + .005
        lead = jag(rnd, (.1, lerp_tab(ARM_LEAD, .1) - .008), (.45, lerp_tab(ARM_LEAD, .45) - .008), 4, .018)
        strip(bm, mirror(lead, s), .02, Y - h, Y + h)
        trail = jag(rnd, (.1, lerp_tab(ARM_TRAIL, .1) + .01), (.45, lerp_tab(ARM_TRAIL, .45) + .01), 4, .02)
        strip(bm, mirror(trail, s), .02, Y - h, Y + h)
        # forks off the leading line, raking out and back across the panel to the trailing edge, each splitting once
        for x0, (x1, z1), fork in ((.13, (.27, -.165), (.19, -.18)), (.3, (.43, -.15), (.37, -.16))):
            b = jag(rnd, (x0, lerp_tab(ARM_LEAD, x0) - .022), (x1, z1), 3, .016)
            both(bm, mirror(b, s), [.019, .018, .017, .016], ARM_TH / 2)
            both(bm, mirror([b[1], fork], s), .016, ARM_TH / 2)
    return build
def wing_lower(s):
    def build(bm):
        rows = [((x * s, lerp_tab(HAND_LEAD, x)), (x * s, lerp_tab(HAND_TRAIL, min(x, .625)))) for x in (.45, .56)]
        rows.append(((HAND_LEAD[-1][0] * s, HAND_LEAD[-1][1]), (HAND_TRAIL[-1][0] * s, HAND_TRAIL[-1][1])))
        foil(bm, rows, Y, HAND_TH)
        for i in range(5):
            root, d, p, L, w = finger(i); rows = []
            for f, wf in ((0, 1), (.8, .8), (1, .2)):
                c = root + d * L * f
                rows.append((tuple(mirror([tuple(c + p * w * wf / 2)], s)[0]), tuple(mirror([tuple(c - p * w * wf / 2)], s)[0])))
            foil(bm, rows, Y, FING_TH, sec=4)
    return build
def wing_lower_bolt(s):
    def build(bm):
        rnd = random.Random(11); h = HAND_TH / 2 + .005
        lead = jag(rnd, (.45, lerp_tab(HAND_LEAD, .45) - .008), (.65, lerp_tab(HAND_LEAD, .65) - .008), 3, .015)
        strip(bm, mirror(lead, s), .02, Y - h, Y + h)
        trail = jag(rnd, (.45, lerp_tab(HAND_TRAIL, .45) + .01), (.62, HAND_TRAIL[-1][1] + .008), 3, .016)
        strip(bm, mirror(trail, s), .02, Y - h, Y + h)
        for i in range(5):   # down each primary's leading edge, wrapping it top and bottom
            root, d, p, L, w = finger(i); hf = FING_TH / 2 + .005
            a = root + d * (L * .12 + .025) + p * w * .42; b = root + d * L * .88 + p * w * .8 * .42
            strip(bm, mirror(jag(rnd, a, b, 2, .006), s), [.017, .016, .015], Y - hf, Y + hf)
    return build
for s, side in ((1, 'L'), (-1, 'R')):
    hard(f'wing{side}u__ink', wing_upper(s))
    hard(f'wing{side}u__bolt', wing_upper_bolt(s))
    hard(f'wing{side}l__ink', wing_lower(s))
    hard(f'wing{side}l__bolt', wing_lower_bolt(s))

# ---- tail: a fan of feathers with pointed tips, a lightning edge and two lines down it --------------------------------
TAIL_TH = .014
TAIL = [(-.035, -.15), (.035, -.15), (.085, -.255), (.098, -.272), (.066, -.286), (.033, -.28), (0, -.294), (-.033, -.28),
        (-.066, -.286), (-.098, -.272), (-.085, -.255)]
hard('tail__ink', lambda bm: plate(bm, TAIL, 0, TAIL_TH))
def tail_bolt(bm):
    rnd = random.Random(5); h = TAIL_TH / 2 + .005
    edge = [(.09, -.263), (.066, -.28), (.033, -.273), (0, -.288), (-.033, -.273), (-.066, -.28), (-.09, -.263)]
    strip(bm, edge, .02, -h, h)
    for sx in (-1, 1):
        line = jag(rnd, (sx * .016, -.172), (sx * .05, -.255), 3, .011)
        strip(bm, line, .017, TAIL_TH / 2 - .002, TAIL_TH / 2 + .006, ridge=True)
        strip(bm, line, .017, -TAIL_TH / 2 + .002, -TAIL_TH / 2 - .006, ridge=True)
hard('tail__bolt', tail_bolt)

result = tally()
