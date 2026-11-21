# The Night Owl, a summon (the ability of the same name, js/data/abilities.js; design/abilities/night-owl.md): a large
# pale owl that circles the fight and marks the boss. Not a rig figure: one rigid mesh per joint of its own, named
# owl:<part>__<material slot>[.n], each built at its absolute rest place; js/summon-birds.js hangs each on a pivot
# (BIRD_JOINTS.owl there, the same numbers as JOINT below), flaps the wings by rolling them about z at their joints,
# sweeps them back by turning them about y, and turns the head and tail itself.
# Game axes (x = the owl's left, y up, z forward: its face looks +z), written to Blender through G(). Built gliding:
# body level, wings spread flat and straight out along +-x, tail fanned a little; the centre of mass at the origin.
# Joints at rest (x, y, z), parent:
#   body   (0, 0, 0)          root
#   head   (0, .06, .17)      body
#   wingLu (.08, .03, .02)    body     wingLl (.42, .03, 0)    wingLu
#   wingRu (-.08, .03, .02)   body     wingRl (-.42, .03, 0)   wingRu
#   tail   (0, -.01, -.16)    body
# The look: a big round head with a flat round facial disc facing forward, a stout body, soft broad wings with five
# fingered tips, a short fanned tail, short ink talons tucked under the body. Pale plumage (`plume`, the bulk) with ink
# barring painted on as separate thin raised strips (`bar`: dashes across the wings and fingers, chevrons on the breast
# and belly, bands on the tail; also the ink rims round the eyes, the beak and the talons), and two big round eye discs
# in the facial disc (`eye`, the game makes them glow). It reads as a pale cross against the dark sky.
# Size: 1.6 m wingspan, the body about .45 m long. About 1,400 triangles.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from snow_lib import tube as stube
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

JOINT = {
    'body': (0, 0, 0), 'head': (0, .06, .17), 'tail': (0, -.01, -.16),
    'wingLu': (.08, .03, .02), 'wingLl': (.42, .03, 0), 'wingRu': (-.08, .03, .02), 'wingRl': (-.42, .03, 0),
}
Y = .03   # the wings' plane

begin({'plume': (0.81, 0.84, 0.86), 'bar': (0.043, 0.051, 0.071), 'eye': (0.56, 0.72, 0.86)}, prefix='owl:')

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

def disc(bm, c, r, z0, z1, sides, dish=None, r0=None):
    """A round prism facing +z, between depths z0 (back, radius r0 if given) and z1 (front, radius r); `dish` (inner
    radius, inner front depth) gives its face a shallow dish with a raised rim."""
    cx, cy = c; ang = [k / sides * math.tau for k in range(sides)]
    def rim(rr, z): return [bm.verts.new(G(cx + math.sin(a) * rr, cy + math.cos(a) * rr, z)) for a in ang]
    back, front = rim(r0 or r, z0), rim(r, z1)
    bm.faces.new(list(reversed(back)))
    for k in range(sides):
        j = (k + 1) % sides; bm.faces.new((back[k], back[j], front[j], front[k]))
    if dish:
        inner = rim(dish[0], dish[1])
        for k in range(sides):
            j = (k + 1) % sides; bm.faces.new((front[k], front[j], inner[j], inner[k]))
        mid = bm.verts.new(G(cx, cy, dish[1] - .003))
        for k in range(sides): bm.faces.new((inner[k], inner[(k + 1) % sides], mid))
    else: bm.faces.new(front)

def lerp_tab(tab, x):
    for (x0, z0), (x1, z1) in zip(tab, tab[1:]):
        if x <= x1: f = (x - x0) / (x1 - x0); return z0 + (z1 - z0) * f
    return tab[-1][1]

def surface(ob, p, d):
    """Where a ray from game point p along game direction d first meets ob: (point, outward normal), game space."""
    bpy.context.view_layer.update()
    hit, loc, nrm, _ = ob.ray_cast(G(*p), G(*d).normalized())
    assert hit, (ob.name, p, d)
    return Vector((loc.x, loc.z, -loc.y)), Vector((nrm.x, nrm.z, -nrm.y)).normalized()

def bar(bm, ob, pts, d, w, out=.006, sink=.006):
    """An ink bar painted on ob: the polyline pts (game points off the surface) dropped onto it along direction d, a
    raised three-sided ridge w wide standing `out` proud of the surface and sunk `sink` into it."""
    hits = [surface(ob, p, d) for p in pts]; loops = []; n = len(hits)
    for i, (h, nrm) in enumerate(hits):
        t = (hits[min(i + 1, n - 1)][0] - hits[max(i - 1, 0)][0]).normalized()
        side = nrm.cross(t).normalized()
        loops.append([bm.verts.new(G(*(h + nrm * out))), bm.verts.new(G(*(h + side * w / 2 - nrm * sink))),
                      bm.verts.new(G(*(h - side * w / 2 - nrm * sink)))])
    for r0, r1 in zip(loops, loops[1:]):
        for k in range(3):
            j = (k + 1) % 3; bm.faces.new((r0[k], r0[j], r1[j], r1[k]))
    bm.faces.new(list(reversed(loops[0]))); bm.faces.new(loops[-1])

def obj(name): return bpy.data.objects['owl:' + name]

def mirror_xz(p, s): return (p[0] * s, p[1])

# ---- body: stout and round-chested, feathered legs tucked under -------------------------------------------------------
def body(bm):
    blob(bm, (0, -.01, -.01), .1, (1.0, .92, 1.55), 2)     # the torso
    blob(bm, (0, -.015, .07), .092, (1.0, 1.0, 1.0), 2)    # the round chest
    blob(bm, (0, .04, .13), .082, (1.1, 1.0, .9), 2)       # the neck, as broad as the head nearly: no waist under it
    blob(bm, (0, -.01, -.13), .06, (1.0, .65, 1.2), 1)     # the rump
    for s in (-1, 1): blob(bm, (s * .04, -.085, -.06), .036, (.85, .7, 1.4), 1)   # the feathered legs, drawn up
soft('body__plume', body, 160, voxel=.009)
def body_bars(bm):
    B = obj('body__plume')
    # chevrons down the breast and across the belly, the side players see from below
    for (y, z, x) in ((-.0, .17, 0), (-.05, .15, -.04), (-.05, .15, .04), (-.1, .05, 0), (-.1, -.02, -.045),
                      (-.1, -.02, .045), (-.09, -.09, 0)):
        breast = z > .1
        d = (0, .15, -1) if breast else (0, 1, 0)   # the breast is dropped onto from the front, the belly from below
        o = Vector(d) * -.3
        pts = [(x - .025, y + .01, z), (x, y - .006, z), (x + .025, y + .01, z)] if breast else \
              [(x - .03, y, z - .012), (x, y, z + .006), (x + .03, y, z - .012)]
        bar(bm, B, [tuple(Vector(q) + o) for q in pts], d, .014)
    # the talons: short hooked ink claws under the feathered feet, pointing back
    for s in (-1, 1):
        for k in (-1, 1):
            x = s * .04 + k * .009
            stube(bm, [(x, -.105, -.055), (x + k * .004, -.122, -.075), (x + k * .006, -.114, -.095)], [.008, .006, .001], 3)
hard('body__bar', body_bars)

# ---- head: big and round, a flat facial disc, two big eyes in ink rims, a small hooked beak ---------------------------
def head(bm):
    blob(bm, (0, .075, .19), .1, (1.0, .9, .85), 2)
    blob(bm, (0, .072, .235), .092, (1.0, .92, .42), 2)   # the broad flat front the facial disc sits in
soft('head__plume', head, 120, voxel=.007)
DISC_C = (0, .072)
hard('head__plume.1', lambda bm: disc(bm, DISC_C, .082, .25, .284, 12, dish=(.05, .275), r0=.06))
EYES = [(s * .036, .085) for s in (1, -1)]
hard('head__eye', lambda bm: [disc(bm, e, .025, .272, .288, 10) for e in EYES])
def head_bars(bm):
    for e in EYES: disc(bm, e, .034, .266, .284, 9)   # the ink rims, behind the eye discs
    stube(bm, [(0, .066, .282), (0, .058, .296), (0, .041, .298)], [.011, .007, .001], 4, ovals=[(.8, 1)] * 3)   # the beak
hard('head__bar', head_bars)

# ---- wings: broad rounded arms, a hand, five fingered tips; ink dashes across them ------------------------------------
ARM_LEAD = [(.08, .1), (.16, .122), (.26, .128), (.34, .122), (.42, .11)]
ARM_TRAIL = [(.08, -.11), (.16, -.165), (.26, -.185), (.34, -.185), (.42, -.172)]
HAND_LEAD = [(.42, .11), (.52, .1), (.6, .078)]
HAND_TRAIL = [(.42, -.172), (.52, -.16), (.585, -.14)]
ARM_TH, HAND_TH, FING_TH = .03, .02, .012
FINGERS = [(13, .17), (3, .195), (-7, .2), (-18, .185), (-29, .16)]   # (angle from straight out, + forward; length)

def finger(i):
    """Feather i: its root (inside the hand), direction and forward side, length, width at the root."""
    e0, e1 = Vector(HAND_LEAD[-1]), Vector(HAND_TRAIL[-1]); base = e0.lerp(e1, .08 + .84 * i / 4)
    a = math.radians(FINGERS[i][0]); d = Vector((math.cos(a), math.sin(a))); p = Vector((-d.y, d.x))
    return base - d * .025, d, p, FINGERS[i][1] + .025, .052

def wing_upper(s):
    def build(bm):
        foil(bm, [((x * s, lerp_tab(ARM_LEAD, x)), (x * s, lerp_tab(ARM_TRAIL, x))) for x in (.08, .16, .26, .34, .42)], Y, ARM_TH)
    return build
def wing_lower(s):
    def build(bm):
        rows = [((x * s, lerp_tab(HAND_LEAD, x)), (x * s, lerp_tab(HAND_TRAIL, min(x, .585)))) for x in (.42, .52)]
        rows.append(((HAND_LEAD[-1][0] * s, HAND_LEAD[-1][1]), (HAND_TRAIL[-1][0] * s, HAND_TRAIL[-1][1])))
        foil(bm, rows, Y, HAND_TH)
        for i in range(5):
            root, d, p, L, w = finger(i); rows = []
            for f, wf in ((0, 1), (.78, .92), (1, .38)):   # broad, with a blunt rounded tip
                c = root + d * L * f
                rows.append((mirror_xz(c + p * w * wf / 2, s), mirror_xz(c - p * w * wf / 2, s)))
            foil(bm, rows, Y, FING_TH, sec=4)
    return build
def dashes(part, s, spots, both_sides=False):
    """Ink dashes across a wing piece at (x, chord fraction, length); `both_sides` paints the underside too."""
    def build(bm):
        W = obj(part)
        for x, f, L in spots:
            z = lambda xx: lerp_tab(ARM_LEAD if x < .42 else HAND_LEAD, xx) * (1 - f) + lerp_tab(ARM_TRAIL if x < .42 else HAND_TRAIL, min(xx, .585)) * f
            pts = [((x - L / 2) * s, z(x - L / 2) + .006), (x * s, z(x) - .008), ((x + L / 2) * s, z(x + L / 2) + .002)]   # a shallow chevron
            for side in ((1, -1) if both_sides else (1,)):
                bar(bm, W, [(px, Y + side * .2, pz) for px, pz in pts], (0, -side, 0), .021)
        if part.endswith('l__plume'):   # a band across each finger, top and bottom, near its tip
            for i in range(5):
                root, d, p, L, w = finger(i); c = root + d * L * .62
                pts = [mirror_xz(c + p * w * .4, s), mirror_xz(c - p * w * .4, s)]
                for side in (1, -1): bar(bm, W, [(px, Y + side * .2, pz) for px, pz in pts], (0, -side, 0), .016)
    return build
for s, side in ((1, 'L'), (-1, 'R')):
    hard(f'wing{side}u__plume', wing_upper(s))
    hard(f'wing{side}l__plume', wing_lower(s))
    hard(f'wing{side}u__bar', dashes(f'wing{side}u__plume', s, [(.15, .36, .07), (.255, .42, .08), (.36, .37, .065),
                                                                 (.2, .7, .075), (.31, .66, .08)]))
    hard(f'wing{side}l__bar', dashes(f'wing{side}l__plume', s, [(.475, .42, .06), (.535, .68, .05)]))

# ---- tail: short and fanned, two ink bands across it, top and bottom --------------------------------------------------
TAIL_Y, TAIL_TH = -.01, .016
TAIL = [(-.05, -.13), (.05, -.13), (.078, -.225), (.05, -.243), (0, -.25), (-.05, -.243), (-.078, -.225)]
hard('tail__plume', lambda bm: plate(bm, TAIL, TAIL_Y, TAIL_TH))
def tail_bars(bm):
    T = obj('tail__plume')
    for z, half in ((-.185, .05), (-.222, .062)):
        for side in (1, -1):
            bar(bm, T, [(-half, TAIL_Y + side * .2, z), (0, TAIL_Y + side * .2, z + .01), (half, TAIL_Y + side * .2, z)], (0, -side, 0), .015)
hard('tail__bar', tail_bars)

result = tally()
