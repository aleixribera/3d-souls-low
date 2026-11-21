# The Ink Crow, a summon (the Ink Crows ability, js/data/abilities.js; design/abilities/ink-crows.md): ONE crow of black
# brush ink; the game draws 24 of it as one InstancedMesh and flaps the wings in the vertex shader by the vertex's |x|
# (0 at the body, rising to the tips). Not a rig figure and no joints: exactly two meshes, named crow:<part>__<slot>.
# Game axes (x = the crow's left, y up, z forward: the beak points +z), written to Blender through G(). Built gliding:
# body level, wings spread flat along +-x with a slight dihedral, tail closed behind; the centre of mass at the origin.
# The look: a single ink stroke at a distance. A narrow body (|x| < .05) tapering to a wedge tail, a round head, a long
# sharp beak hooked a little down; broad ragged wings, each one continuous slab out to its tip (so the shader's bend
# never tears it) whose trailing edge breaks into dry-brush feather tips, the outer ones splayed like a crow's fingered
# primaries; the tail's end in three feather tips. Every sheet is a closed slab with outward normals (the game culls back
# faces and pushes vertices out along normals for the ink outline).
# Slots: `ink` (everything: body, head, beak, wings, tail; the summon shader draws it ink-dark with blue rims) and `eye`
# (two small bumps on the head; the game makes them glow white-blue).
# Size: .35 m beak to tail, .7 m wingspan. Budget: at most ~300 triangles, eyes included.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'ink': (0.05, 0.055, 0.07), 'eye': (0.95, 0.97, 0.98)}, prefix='crow:')

def strip(bm, lead, trail, half):
    """A closed slab between two polylines (game points, matched by index): top and bottom faces `half` above and below,
    rimmed all round. half: one half-thickness per station (its trailing vertex gets a third of it, so tips stay sharp)."""
    n = len(lead)
    def v(p, dy): return bm.verts.new(G(p[0], p[1] + dy, p[2]))
    Lt = [v(lead[i], half[i]) for i in range(n)]; Lb = [v(lead[i], -half[i]) for i in range(n)]
    Tt = [v(trail[i], half[i] / 3) for i in range(n)]; Tb = [v(trail[i], -half[i] / 3) for i in range(n)]
    for i in range(n - 1):
        bm.faces.new((Lt[i], Lt[i + 1], Tt[i + 1], Tt[i])); bm.faces.new((Lb[i], Tb[i], Tb[i + 1], Lb[i + 1]))
        bm.faces.new((Lb[i], Lb[i + 1], Lt[i + 1], Lt[i])); bm.faces.new((Tb[i], Tt[i], Tt[i + 1], Tb[i + 1]))
    bm.faces.new((Lb[0], Lt[0], Tt[0], Tb[0])); bm.faces.new((Lb[-1], Tb[-1], Tt[-1], Lt[-1]))

# ---- body, head and beak: one tapering six-sided tube from the tail's root to the beak's point -------------------------
BODY = [  # z, centre y, half-width, half-height
    (-.11, .004, .014, .011), (-.06, .0, .03, .03), (.0, .0, .04, .04), (.06, .006, .034, .036),
    (.095, .014, .025, .027), (.128, .022, .032, .031), (.158, .02, .021, .02)]
BEAK = (0, .008, .195)
def body(bm):
    rings = []
    for z, cy, rx, ry in BODY:
        rings.append([bm.verts.new(G(math.sin(a) * rx, cy + math.cos(a) * ry, z)) for a in (k * math.tau / 6 for k in range(6))])
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(6):
            j = (k + 1) % 6; bm.faces.new((r0[k], r0[j], r1[j], r1[k]))
    bm.faces.new(list(reversed(rings[0])))
    tip = bm.verts.new(G(*BEAK))
    for k in range(6):
        bm.faces.new((rings[-1][k], rings[-1][(k + 1) % 6], tip))

# ---- wings: one slab a side, leading edge bowed forward at the wrist, the trailing edge torn into feather tips ----------
N = 10   # stations from the root to the hand; the five odd ones end in feather tips
def wing(bm, s):
    """Broad at the arm, its hand swept back and narrowing, the trailing edge torn into five feather tips: two
    secondaries trailing back, three primaries splayed outward like a crow's fingers (the outermost is the wing's end)."""
    lead, trail, half = [], [], []
    for i in range(N):
        u = i / (N - 1); x = .022 + .255 * u
        y = .014 + .028 * u * u                                  # a slight dihedral, rising at the hand
        lz = .045 + .02 * math.sin(math.pi * u * .9) - .09 * u ** 3
        tz = lz - (.105 - .05 * u * u)                           # the base of the trailing edge
        tx = x; ang = 1.5 * u * u                                # the feathers turn outward toward the hand
        if i % 2:   # a feather tip, each its own length
            ln = (.032 + .04 * u) * (1.1, .85, 1.0, .88, 1.08)[i // 2]
            tx += math.sin(ang) * ln; tz -= math.cos(ang) * ln
        elif i:     # a notch between two tips, cut back toward the leading edge
            d = .012 + .022 * u; tx -= math.sin(ang) * d; tz += math.cos(ang) * d
        lead.append((s * x, y + .004, lz)); trail.append((s * tx, y, tz)); half.append(.0065 - .0045 * u)
    strip(bm, lead, trail, half)

# ---- tail: a closed wedge fan behind the body, its end in three feather tips -----------------------------------------
def tail(bm):
    lead, trail, half = [], [], []
    for i in range(5):
        u = i / 4 - .5   # -.5 .. .5 across
        lead.append((u * .045, .006, -.075))
        tip = i % 2 == 0
        trail.append((u * (.1 if tip else .08), .004, -.155 + .02 * abs(u) if tip else -.128))
        half.append(.006)
    strip(bm, lead, trail, half)

def crow(bm):
    body(bm); wing(bm, 1); wing(bm, -1); tail(bm)
hard('body__ink', crow, smooth=False)

# ---- eyes: two small eight-sided bumps proud of the head's sides ------------------------------------------------------
def eyes(bm):
    for s in (1, -1):
        c = Vector((s * .027, .03, .137)); r = .0075
        ax = [Vector(d) * r for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1))]
        vs = [bm.verts.new(G(*(c + d))) for d in ax]
        for a in (0, 1):
            for b in (2, 3):
                for e in (4, 5):
                    bm.faces.new((vs[a], vs[b], vs[e]))
hard('body__eye', eyes, smooth=False)

result = tally()
