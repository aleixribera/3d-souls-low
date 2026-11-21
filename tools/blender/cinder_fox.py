# The Cinder Fox, a summon (the ability of the same name, js/data/abilities.js; design/abilities/cinder-fox.md): a small
# sleek fox of blue fire that runs rings round the boss. Not a rig figure: one rigid mesh per joint of its own, named
# fox:<part>__<material slot>[.n], each built at its rest place; js/summon-beasts.js hangs each on a pivot (BEAST_JOINTS.fox
# there, the same numbers as JOINT below) and runs its bounding gait, its passing slash, its yip and its tail itself.
# Game axes (x = the fox's left, y up, z forward: its nose points +z), written to Blender through G().
# Joints at rest: body (0, .42, 0); neck (0, .5, .2) on the body; head (0, .6, .33) on the neck; jaw (0, .565, .38) on
# the head; the tail in three segments, tail (0, .47, -.26) on the body, tail2 (0, .43, -.52) on it, tail3 (0, .42, -.78)
# on that; the front legs' shoulders (+-.07, .46, .16) and elbows (+-.07, .26, .15), the hind legs' hips (+-.075, .45, -.2)
# and hocks (+-.08, .17, -.28).
# The look: long-legged and narrow, big pointed ears, a long sweeping tail longer than its body that breaks into flame
# tongues at its tip. An ink-dark core (`core`) under a shell of hard-edged flame shapes like cut paper (`flame`: the cheek
# ruffs, the ear tips, a crest of tongues down the spine, the tail's flames). The game draws it in the summon shader:
# the core dark with blue rims, the flame bright. Size: .55 m at the shoulder, 1.5 m nose to tail tip. About 1,800 triangles.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob, bent_spike
from figure_lib import *
from snow_lib import tube as stube
import bpy, bmesh
from mathutils import Vector

begin({'core': (0.05, 0.06, 0.08), 'flame': (0.56, 0.72, 0.86)}, prefix='fox:')
rnd = random.Random(141)

def tongue(bm, base, tip, w, bend=(0, 0, 0)):
    """A flat, hard-edged flame tongue: a thin blade from base to tip, `w` wide at the base, bent toward `bend`."""
    base, tip, bend = Vector(base), Vector(tip), Vector(bend)
    d = (tip - base); L = d.length; d.normalize()
    side = d.cross(Vector((0, 1, 0)))
    if side.length < 1e-3: side = Vector((1, 0, 0))
    side.normalize()
    mid = base + d * L * .5 + bend * L * .4
    pts = [base - side * w, mid - side * w * .55, tip, mid + side * w * .55, base + side * w]
    thick = d.cross(side).normalized() * w * .18
    front = [bm.verts.new(G(*(p + thick))) for p in pts]
    back = [bm.verts.new(G(*(p - thick))) for p in pts]
    bm.faces.new(front); bm.faces.new(list(reversed(back)))
    for k in range(len(pts)):
        j = (k + 1) % len(pts); bm.faces.new((back[k], back[j], front[j], front[k]))

# ---- body: a narrow deep chest, a tucked waist, small haunches ----------------------------------------------------------
def body(bm):
    blob(bm, (0, .44, .1), .1, (.72, 1.0, 1.25), 2)       # the chest
    blob(bm, (0, .46, -.06), .075, (.78, .82, 1.4), 2)    # the waist
    blob(bm, (0, .45, -.2), .085, (.9, .95, 1.0), 2)      # the haunch
    for s in (-1, 1): blob(bm, (s * .05, .43, -.22), .06, (.8, 1.1, 1.0), 1)
soft('body__core', body, 420, voxel=.008)
def crest(bm):   # flame tongues raking back down the spine
    for k in range(6):
        z = .16 - k * .07; y = .53 - abs(z + .02) * .1
        tongue(bm, (0, y - .02, z), (0, y + .09 - k * .004, z - .08), .03, (0, .3, -.4))
hard('body__flame', crest)

# ---- neck: long, held high, a ruff of tongues at the throat -------------------------------------------------------------
def neck(bm):
    tube(bm, [(0, .46, .14), (0, .52, .23), (0, .57, .3)], [.06, .05, .042], 8)
soft('neck__core', neck, 160, voxel=.007)
def ruff(bm):
    for s in (-1, 1):
        for k in range(3):
            tongue(bm, (s * .035, .5 - k * .03, .24 - k * .02), (s * .1, .47 - k * .04, .16 - k * .03), .02, (0, -.2, -.3))
hard('neck__flame', ruff)

# ---- head: a narrow wedge skull, a long fine muzzle, big pointed ears ---------------------------------------------------
def skull(bm):
    blob(bm, (0, .61, .34), .055, (1.0, .85, 1.05), 2)
    tube(bm, [(0, .6, .37), (0, .585, .44), (0, .57, .5)], [.036, .025, .012], 8)
    for s in (-1, 1): blob(bm, (s * .035, .585, .35), .03, (.9, .8, 1.2), 1)   # the cheeks
soft('head__core', skull, 260, voxel=.006)
def ears(bm):   # tall, pointed, swept back a little; each tipped by a flame tongue
    for s in (-1, 1):
        stube(bm, [(s * .03, .64, .32), (s * .05, .7, .3), (s * .062, .755, .28)], [.024, .016, .003], 4, ovals=[(1.6, .5)] * 3)
hard('head__core.1', ears)
def cheeks(bm):   # the ruff of flame on the cheeks, swept back
    for s in (-1, 1):
        tongue(bm, (s * .045, .59, .35), (s * .1, .6, .27), .022, (0, .2, -.3))
        tongue(bm, (s * .062, .755, .28), (s * .07, .8, .25), .012, (0, .1, -.4))   # the ear's tip burning
hard('head__flame', cheeks)
def jaw(bm):
    tube(bm, [(0, .565, .38), (0, .56, .44), (0, .562, .48)], [.022, .016, .008], 6)
hard('jaw__core', jaw)

# ---- legs: long and thin, small neat paws -----------------------------------------------------------------------------
for s, side in ((1, 'L'), (-1, 'R')):
    x = s * .07
    hard(f'f{side}u__core', lambda bm, x=x: stube(bm, [(x, .48, .17), (x, .37, .17), (x, .26, .15)], [.03, .024, .02], 6))
    hard(f'f{side}l__core', lambda bm, x=x: (stube(bm, [(x, .27, .15), (x, .14, .16), (x, .04, .17)], [.018, .014, .016], 6),
                                             blob(bm, (x, .022, .19), .024, (.8, .55, 1.3), 1)))
    hard(f'h{side}u__core', lambda bm, s=s: (stube(bm, [(s * .075, .46, -.2), (s * .08, .36, -.14), (s * .08, .26, -.2), (s * .08, .17, -.28)],
                                                   [.045, .035, .022, .018], 6)))
    hard(f'h{side}l__core', lambda bm, s=s: (stube(bm, [(s * .08, .175, -.285), (s * .08, .09, -.25), (s * .08, .035, -.22)], [.016, .013, .015], 6),
                                             blob(bm, (s * .08, .022, -.2), .024, (.8, .55, 1.3), 1)))

# ---- the tail: longer than the body, in three segments, its tip a fan of flame ----------------------------------------
TAIL = [(0, .47, -.26), (0, .43, -.52), (0, .42, -.78), (0, .44, -1.02)]
def tail_seg(i, r0, r1):
    a, b = Vector(TAIL[i]), Vector(TAIL[i + 1])
    def build(bm):
        m = (a + b) / 2 + Vector((0, .015, 0))
        tube(bm, [tuple(a), tuple(m), tuple(b)], [r0, (r0 + r1) / 2 + .01, r1], 8)
    return build
soft('tail__core', tail_seg(0, .035, .075), 180, voxel=.008)
soft('tail2__core', tail_seg(1, .075, .085), 180, voxel=.008)
def tip(bm):   # the last third: thin core under a fan of flame tongues streaming back
    tube(bm, [TAIL[2], (0, .43, -.9), TAIL[3]], [.08, .055, .012], 8)
hard('tail3__core', tip)
def tip_flames(bm):
    for k in range(7):
        a = (k - 3) * .35
        base = Vector((0, .43, -.84 - abs(k - 3) * .02))
        tongue(bm, tuple(base), (math.sin(a) * .16, .44 + math.cos(a) * .12, -1.2 + abs(k - 3) * .05), .045, (0, .2, -.3))
hard('tail3__flame', tip_flames)
hard('tail__flame', lambda bm: [tongue(bm, (0, .49 - k * .01, -.32 - k * .09), (0, .56 - k * .01, -.4 - k * .09), .018, (0, .2, -.4)) for k in range(2)])
def tail2_flames(bm):   # tongues off its top and both sides, streaming back
    for k in range(3):
        z = -.5 - k * .1
        tongue(bm, (0, .5, z), (0, .6, z - .12), .03, (0, .2, -.4))
        for s in (-1, 1): tongue(bm, (s * .07, .44, z), (s * .15, .47, z - .13), .028, (0, .1, -.4))
hard('tail2__flame', tail2_flames)

result = tally()
