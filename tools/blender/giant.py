# The Giant Skeleton, Level 1's boss at the end of the Long Hall (MODEL_DEFS.giantSkeleton: OLD BONES, a spectral giant).
# One rigid mesh per game bone (js/rig.js skeleton at scale 1, MODEL_DEFS.giantSkeleton), named giant:<bone>__<slot>[.n],
# so every key pose, the walk and the death drive it. The game scales him 2.3x (bulk 1.2). Rest pose: upright, arms
# hanging (the model's posture hunches the chest .55 rad, pitches the neck .75 more and tips the skull back .95, so the
# skull hangs low before the chest with its face to the player in the game).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.34, y 1.55;
# the left arm is 30% longer (elbow y 1.16, wrist .77) and hangs as a claw, the right is the club arm (elbow 1.25, wrist
# .95; the bone club's haft runs along z through the right fist, and the kit builds it); hips x +-.15, y .90, knees .45.
# The look (the MODEL_DEFS brief): a huge domed skull with deep sockets under a heavy brow, a crack across the crown, a
# long jaw hanging open on blunt teeth; a deep barrel of ribs, three of them snapped, on a spine that burns white from
# the skull's base down into the pelvis (`core`, a glow slot); heavy clavicles and shoulder blades; a broad pelvis;
# long bones with knuckled heads and condyles, radius and ulna, tibia and fibula; a long clawed left hand and a right
# fist of bone closed round the club; splayed bony feet. Boss budget: 14,000 triangles with the kit's bone club.
# Pass 72: the gaol on it (iron cuffs on both wrists and the left ankle, a broken chain off the ankle and the claw's wrist,
# `iron`), and the heat that fills its ribs in its second phase (`heat`, a glow slot hidden until then).
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob, new_obj
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'bone': (0.78, 0.76, 0.7), 'dark': (0.5, 0.5, 0.52), 'void': (0.02, 0.02, 0.03), 'core': (0.95, 0.97, 1.0),
       'iron': (0.3, 0.27, 0.25), 'heat': (1.0, 0.65, 0.35)}, prefix='giant:')

SX, ELL, WRL, ELR, WRR = .34, 1.16, .77, 1.25, .95

def V(*a): return Vector(a)

def bone_shaft(bm, a, b, r, flare=(1.55, 1.35), sides=8):
    """A long bone from joint a to joint b: a waisted shaft whose ends flare toward the joints."""
    a, b = V(*a), V(*b); fa, fb = flare
    ts = (0, .07, .22, .5, .78, .93, 1)
    prof = (r * fa, r * fa * .92, r * 1.05, r * .92, r * 1.0, r * fb * .9, r * fb)
    tube(bm, [a + (b - a) * t for t in ts], prof, sides)

def knob(bm, p, r, sc=(1, 1, 1), sub=1):
    blob(bm, p, r, sc, sub)

def cone(bm, base, tip, r, sides=4):
    tube(bm, [base, tip], [r, r * .15], sides)

def ellipsoid(bm, c, rr, roll=0.0, sub=2):
    """An ellipsoid (radii rr) turned by `roll` about the forward axis (seen from the front, + lifts its +x end)."""
    m = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0); cr, sr = math.cos(roll), math.sin(roll)
    for v in m['verts']:
        x, y, z = v.co.x * rr[0], v.co.y * rr[1], v.co.z * rr[2]
        v.co = G(c[0] + x * cr - y * sr, c[1] + x * sr + y * cr, c[2] + z)

def carve(ob, cutters):
    """Boolean-subtract ellipsoids (centre, radii, roll) from a finished piece: real holes (eye sockets, the nose)."""
    for c, rr, roll in cutters:
        bm = bmesh.new(); ellipsoid(bm, c, rr, roll); cut = new_obj('cut', bm)
        m = ob.modifiers.new('b', 'BOOLEAN'); m.operation = 'DIFFERENCE'; m.object = cut; m.solver = 'EXACT'
        bpy.context.view_layer.objects.active = ob
        dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
        ob.modifiers.clear(); old = ob.data; ob.data = me; bpy.data.meshes.remove(old)
        bpy.data.objects.remove(cut)
    for p in ob.data.polygons: p.use_smooth = True
    return ob

# ---- head: the domed skull, deep sockets, a nose hole, heavy brow and cheekbones; the jaw hanging open; teeth ------------------
SOCK = [((s * .105, 1.955, .235), (.08, .058, .09), s * .32) for s in (-1, 1)]   # tilted: inner corners down, a scowl
NOSE = ((0, 1.868, .262), (.032, .055, .06), 0.0)
def skull(bm):
    knob(bm, (0, 2.0, -.03), 1, (.25, .245, .28), 3)          # the dome
    knob(bm, (0, 1.93, -.15), 1, (.2, .16, .14), 2)           # the back of the skull
    knob(bm, (0, 1.9, .12), 1, (.19, .14, .16), 2)            # the face
    knob(bm, (0, 1.82, .14), 1, (.14, .06, .12), 2)           # the upper jaw
    for s in (-1, 1):
        tube(bm, [(s * .22, 2.04, .1), (s * .15, 2.03, .2), (s * .06, 1.995, .25), (0, 1.985, .255)], [.034, .042, .04, .036], 8)   # the brow ridge
        knob(bm, (s * .16, 1.885, .17), 1, (.055, .04, .06), 2)                                           # the cheekbone
        tube(bm, [(s * .17, 1.885, .15), (s * .215, 1.89, .05), (s * .21, 1.88, -.04)], [.026, .022, .02], 6)   # its arch
        knob(bm, (s * .2, 1.83, -.05), 1, (.035, .05, .03), 2)                                            # the jaw hinge's knob
sk = soft('head__bone', skull, 1850, voxel=.007, noise=.0025)   # pass 72: 2100 -> 1850, room for the irons
carve(sk, SOCK + [NOSE])
def mandible(bm):   # hanging open: the chin dropped and pushed forward
    for s in (-1, 1):
        for dy in (0, .035):   # two rods stacked and fused: the jaw is a tall plate, not a strap
            tube(bm, [(s * .195, 1.84, -.05), (s * .19, 1.76 + dy * .3, -.04), (s * .16, 1.69 + dy, .04), (s * .09, 1.67 + dy, .15), (0, 1.665 + dy, .2)],
                 [.026, .028, .026, .024, .026], 8)
        knob(bm, (s * .19, 1.845, -.05), 1, (.025, .032, .03), 2)
        knob(bm, (s * .165, 1.69, -.0), 1, (.03, .035, .035), 2)   # the angle of the jaw
    knob(bm, (0, 1.672, .205), 1, (.05, .04, .03), 2)
soft('head__bone.1', mandible, 700, voxel=.007, noise=.002)
def teeth(bm):
    for i in range(-4, 5):   # upper row: blunt, a few missing
        if i in (-3, 2): continue
        a = i * .2; x, z = math.sin(a) * .12, .085 + math.cos(a) * .135
        tube(bm, [(x, 1.8, z), (x * 1.02, 1.765, z + .006), (x * 1.03, 1.742 - abs(i) * .002, z + .004)], [.017, .015, .006], 4)
    for i in range(-4, 5):   # lower row on the dropped jaw
        if i in (0, -4): continue
        a = i * .19; x, z = math.sin(a) * .1, .07 + math.cos(a) * .118
        tube(bm, [(x, 1.68, z), (x, 1.71, z - .004), (x, 1.732, z - .01)], [.016, .014, .005], 4)
hard('head__bone.2', teeth)
def hollows(bm):   # dark backs to the sockets and the nose; a crack running back over the crown
    for (c, rr, roll) in SOCK: ellipsoid(bm, (c[0], c[1], c[2] - .07), (rr[0] * .9, rr[1] * .9, .04), roll)
    ellipsoid(bm, (0, 1.868, .205), (.03, .05, .04))
    def dome(x, z, sink=.004):   # a point on the dome's surface, a little sunk
        f = max(0.0, 1 - (x / .25) ** 2 - ((z + .03) / .28) ** 2); return (x, 2.0 + .245 * math.sqrt(f) - sink, z)
    tube(bm, [dome(x, z) for x, z in ((.045, .2), (.065, .15), (.05, .09), (.085, .03), (.065, -.05), (.1, -.12), (.13, -.17))],
         [.008, .01, .011, .01, .009, .007, .005], 4)
hard('head__void', hollows)
def neck_top(bm):   # the two top neck vertebrae, white-hot, entering the skull's base
    for y, z in ((1.7, -.1), (1.75, -.105)): knob(bm, (0, y, z), 1, (.04, .022, .036), 1)
hard('head__core', neck_top)
def vertebra_spines(bm, at):   # a vertebra's spine behind and its two side processes
    for y, z in at:
        cone(bm, (0, y, z - .025), (0, y - .02, z - .085), .016)
        for s in (-1, 1): cone(bm, (s * .02, y, z), (s * .07, y - .01, z - .01), .012, 3)
hard('head__dark', lambda bm: vertebra_spines(bm, ((1.7, -.1), (1.75, -.105))))   # on the head, with their bodies

# ---- neck: two vertebrae, their spines behind -----------------------------------------------------------------------------------
def neck_core(bm):
    for y, z in ((1.61, -.12), (1.655, -.11)): knob(bm, (0, y, z), 1, (.042, .022, .038), 1)
hard('neck__core', neck_core)
hard('neck__dark', lambda bm: vertebra_spines(bm, ((1.61, -.12), (1.655, -.11))))

# ---- chest: the white-hot spine; a deep barrel of ribs (three snapped), cartilage to the sternum; clavicles, shoulder blades -----
SPZ = -.13
CAGE = [(1.6, .12, .09), (1.5, .21, .145), (1.38, .265, .18), (1.26, .282, .19), (1.14, .265, .18), (1.06, .23, .16)]
def cage(y):
    rx, rz = lerp(CAGE, y); return rx, rz, SPZ + rz + .012
def lerp(rows, y):
    if y >= rows[0][0]: return rows[0][1:]
    for r0, r1 in zip(rows, rows[1:]):
        if r1[0] <= y <= r0[0]:
            f = (y - r0[0]) / (r1[0] - r0[0]); return tuple(a + (b - a) * f for a, b in zip(r0[1:], r1[1:]))
    return rows[-1][1:]
VERTS = [1.6 - k * .054 for k in range(10)]   # thoracic, 1.6 .. 1.114
def spine_core(bm):
    for y in VERTS + [1.06, 1.008]:
        w = .036 + (1.6 - y) * .03
        knob(bm, (0, y, SPZ), 1, (w, .02, w * .85), 1)
hard('chest__core', spine_core)
def spine_spines(bm):
    for y in VERTS + [1.06]:
        cone(bm, (0, y, SPZ - .03), (0, y - .045, SPZ - .1), .018)
        for s in (-1, 1): cone(bm, (s * .025, y + .005, SPZ - .01), (s * .07, y + .012, SPZ - .035), .013, 3)
    tube(bm, [(0, 1.62, SPZ), (0, 1.0, SPZ)], [.014, .014], 5)   # the cord through the column, dark between the glowing bodies
hard('chest__dark', spine_spines)
RIBS = [1.56 - k * .052 for k in range(9)]
BROKEN = {(-1, 3): 1.75, (-1, 5): 1.5, (1, 7): 1.9}   # (side, rib) -> where it snaps (the angle round from the front)
def rib_end(s, i):
    return BROKEN.get((s, i), .42 if i < 7 else (1.0 if i == 7 else 1.45))
def rib_point(s, i, th):
    y0 = RIBS[i]; rx, rz, cz = cage(y0 - .06); f = (math.pi - th) / math.pi
    y = y0 + .02 * math.sin(min(1, f * 3) * math.pi / 2) - .16 * f ** 1.6
    return (s * rx * math.sin(th), y, cz + rz * math.cos(th))
def ribs(bm):
    for i in range(len(RIBS)):
        for s in (-1, 1):
            e = rib_end(s, i); n = 9
            pts = [rib_point(s, i, math.pi - .12 - (math.pi - .12 - e) * k / n) for k in range(n + 1)]
            r = .017 + .004 * math.sin(i / 8 * math.pi)
            rad = [r * .8] + [r] * (n - 1) + [r * (.25 if (s, i) in BROKEN else .75)]
            tube(bm, pts, rad, 5)
hard('chest__bone', ribs)
STERN = [(1.57, .05), (1.5, .045), (1.42, .036), (1.3, .034), (1.2, .03), (1.15, .015)]
def stern_z(y):
    _, rz, cz = cage(y); return cz + rz + .01
def sternum(bm):
    loft(bm, [(y, 0, stern_z(y), w, .016) for y, w in STERN], 8, cap=True)
    for s in (-1, 1):   # the clavicles, sternum to shoulder
        tube(bm, [(s * .03, 1.585, stern_z(1.57) - .01), (s * .14, 1.6, stern_z(1.57) - .03), (s * .26, 1.62, .0), (s * .32, 1.615, -.05)],
             [.024, .022, .022, .028], 6)
hard('chest__bone.1', sternum)
def cartilage(bm):   # the true ribs' cartilage, running in to the sternum's edge; the false ribs' to the one above
    for i in range(7):
        for s in (-1, 1):
            if (s, i) in BROKEN: continue
            p = V(*rib_point(s, i, rib_end(s, i))); y = min(STERN[0][0] - .02, p.y + .05 + i * .012)
            q = V(s * .035, y, stern_z(y) - .005)
            tube(bm, [p, (p + q) / 2 + V(0, -.01, .01), q], [.013, .012, .011], 4)
hard('chest__dark.1', cartilage)
def scapulae(bm):
    for s in (-1, 1):   # a flat triangle of bone over the back ribs, a ridge across it to the shoulder
        def at(u, v, s=s):
            top = V(s * (.08 + .22 * u), 1.585 - .03 * u, -.2 + .06 * u); return tuple(top + (V(s * .13, 1.29, -.215) - top) * v * (1 - u * .85))
        sheet(bm, 3, 3, at)
        tube(bm, [(s * .1, 1.53, -.22), (s * .22, 1.56, -.2), (s * .31, 1.6, -.1)], [.012, .016, .02], 5)
hard('chest__bone.2', scapulae, thick=.016)

# ---- spin: the pelvis (two flaring wings, a crest, the sacrum behind, the pubic ring in front), a white-hot sacrum --------------
def loop(bm, pts, wire, sides=5):
    pts = [V(*p) for p in pts]; n = len(pts); rings = []
    for i, p in enumerate(pts):
        t = (pts[(i + 1) % n] - pts[i - 1]).normalized()
        a = t.cross(V(0, 1, 0) if abs(t.y) < .9 else V(1, 0, 0)).normalized(); b = t.cross(a)
        rings.append([bm.verts.new(G(*(p + (a * math.cos(k / sides * math.tau) + b * math.sin(k / sides * math.tau)) * wire))) for k in range(sides)])
    for i in range(n):
        r0, r1 = rings[i], rings[(i + 1) % n]
        for k in range(sides): bm.faces.new((r0[k], r0[(k + 1) % sides], r1[(k + 1) % sides], r1[k]))
PC = (0, .9, -.03)
def wings(bm):
    for s in (-1, 1):
        a0, a1 = (.55, 2.55) if s > 0 else (-2.55, -.55)
        shell(bm, PC, .21, .15, .14, .08, .92, a0, a1, nu=9, nv=4)
hard('spin__bone', wings, thick=.022)
def crest_and_ring(bm):
    for s in (-1, 1):
        a0, a1 = (.55, 2.55) if s > 0 else (-2.55, -.55)
        pts = [(PC[0] + math.sin(a) * .21 * math.cos(.92), PC[1] + math.sin(.92) * .15, PC[2] + math.cos(a) * .14 * math.cos(.92))
               for a in [a0 + (a1 - a0) * k / 6 for k in range(7)]]
        tube(bm, pts, [.02, .024, .024, .024, .024, .022, .02], 5)
        loop(bm, [(s * .17, .885, .03), (s * .14, .8, -.01), (s * .08, .775, .03), (s * .025, .81, .1), (s * .07, .86, .1), (s * .14, .89, .08)], .022)
        knob(bm, (s * .155, .885, .01), 1, (.05, .045, .05), 1)   # the hip socket's rim
    knob(bm, (0, .815, .105), 1, (.035, .04, .025), 1)               # the pubic joint
hard('spin__bone.1', crest_and_ring)
def sacrum(bm):   # a wedge of fused vertebrae narrowing down to the tail
    loft(bm, [(1.0, 0, -.13, .075, .03), (.93, 0, -.135, .06, .03), (.86, 0, -.13, .035, .025), (.8, 0, -.115, .016, .014), (.76, 0, -.095, .006, .006)], 8)
hard('spin__bone.2', sacrum)

# ---- arms: humerus with its round head and condyles; radius and ulna; a long claw on the left, a fist round the club on the right --
for s, n, el, wr in ((1, 'L', ELL, WRL), (-1, 'R', ELR, WRR)):
    x = s * SX
    def humerus(bm, x=x, el=el, s=s):
        bone_shaft(bm, (x, 1.55, -.012), (x, el + .03, .0), .045)
        knob(bm, (x - s * .012, 1.565, -.015), 1, (.066, .062, .066), 2)                 # the head in its socket
        for k in (-1, 1): knob(bm, (x + k * .036, el + .02, .004), 1, (.038, .034, .04), 2)   # the condyles
    hard(f'arm{n}__bone', humerus)
    def forearm(bm, x=x, el=el, wr=wr, s=s):
        bone_shaft(bm, (x - s * .022, el - .01, -.015), (x - s * .024, wr + .03, -.018), .026, (1.7, 1.15))   # the ulna
        bone_shaft(bm, (x + s * .026, el - .015, .014), (x + s * .01, wr + .03, .024), .027, (1.15, 1.8))  # the radius
        knob(bm, (x - s * .018, el + .005, -.05), 1, (.036, .044, .03), 2)                # the elbow's point
    hard(f'elbow{n}__bone', forearm)

def finger(bm, pts, r):
    n = len(pts); tube(bm, pts, [r * (1 - .45 * k / (n - 1)) for k in range(n)], 5)
    for p in pts[1:-1]: knob(bm, p, r * 1.15, (1, 1, 1), 1)
def claw(bm):   # the left hand, hanging open, palm in toward the hip, long fingers curling in
    x, w = SX, WRL; H = 1.5
    tube_ = globals()['tube']
    def tube(bm, pts, radii, sides=8):   # everything drawn about the wrist, H times larger
        tube_(bm, [V(x, w + .03, 0) + (V(*p) - V(x, w + .03, 0)) * H for p in pts], [r * H for r in radii], sides)
    def knob(bm, p, r, sc=(1, 1, 1), sub=1):
        blob(bm, V(x, w + .03, 0) + (V(*p) - V(x, w + .03, 0)) * H, r, tuple(c * H for c in sc), sub)
    def finger(bm, pts, r):
        n = len(pts); tube(bm, pts, [r * (1 - .45 * k / (n - 1)) for k in range(n)], 5)
        for p in pts[1:-1]: knob(bm, p, r * 1.15, (1, 1, 1), 1)
    knob(bm, (x, w, .005), 1, (.035, .04, .05), 1)                                   # the wrist's knot of bones
    for i, zf in enumerate((-.05, -.017, .016, .048)):
        k = V(x + .008, w - .16 - (abs(zf) - .03) * .5, zf * 1.25)
        tube(bm, [(x + .004, w - .025, zf * .5), k], [.013, .016], 5)                      # the metacarpal
        L = (.085, .065, .05) if i in (1, 2) else (.072, .055, .042)
        p1 = k + V(-.012, -L[0], .004); p2 = p1 + V(-.04, -L[1] * .8, .006); p3 = p2 + V(-.045, -L[2] * .35, .004)
        finger(bm, [k, p1, p2, p3], .014)
    t0 = V(x - .01, w - .06, .055)
    finger(bm, [t0, t0 + V(-.02, -.06, .035), t0 + V(-.05, -.1, .045), t0 + V(-.075, -.115, .04)], .014)   # the thumb
hard('elbowL__bone.1', claw)
def fist(bm):   # the right hand closed round the club's haft (along z through the wrist): back of the hand outside
    x, w, s, H = -SX, WRR, -1, 1.3
    knob(bm, (x + s * .02, w - .005, 0), 1, (.034, .045, .06), 1)
    for zf in (-.042, -.014, .014, .042):
        pts = [(x + s * .03 * H, w - .02 * H, zf * H), (x + s * .042 * H, w - .07 * H, zf * 1.08 * H), (x + s * .01 * H, w - .1 * H, zf * 1.1 * H),
               (x - s * .04 * H, w - .088 * H, zf * 1.1 * H), (x - s * .055 * H, w - .045 * H, zf * H)]
        finger(bm, pts, .013 * H)
    finger(bm, [(x + s * .015 * H, w - .01 * H, .055 * H), (x - s * .02 * H, w + .004 * H, .075 * H), (x - s * .05 * H, w - .01 * H, .068 * H)], .014 * H)
hard('elbowR__bone.1', fist)

# ---- legs: femur with its neck and head; tibia, fibula and kneecap; a splayed foot of long bones --------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    def femur(bm, hx=hx, s=s):
        bone_shaft(bm, (hx + s * .035, .875, .0), (hx, .485, .01), .046, (1.4, 1.5))
        tube(bm, [(hx + s * .03, .88, 0), (hx, .9, .005)], [.03, .028], 6)                 # the neck, in to the socket
        knob(bm, (hx - s * .005, .9, .008), 1, (.055, .055, .055), 2)                       # the head
        knob(bm, (hx + s * .065, .875, -.01), 1, (.04, .048, .04), 2)                       # the greater trochanter
        for k in (-1, 1): knob(bm, (hx + k * .036, .47, -.002), 1, (.042, .038, .05), 2)    # the condyles
    hard(f'leg{n}__bone', femur)
    def shin(bm, hx=hx, s=s):
        bone_shaft(bm, (hx, .43, .006), (hx - s * .005, .085, .0), .036, (1.9, 1.35))       # the tibia
        bone_shaft(bm, (hx + s * .05, .415, -.02), (hx + s * .048, .07, -.012), .015, (1.6, 1.8))   # the fibula
        knob(bm, (hx, .462, .066), 1, (.038, .044, .022), 2)                               # the kneecap
        knob(bm, (hx - s * .028, .075, .004), 1, (.016, .024, .02), 1)                      # the ankle's inner knob
    hard(f'knee{n}__bone', shin)
    def foot(bm, hx=hx, s=s):
        knob(bm, (hx, .055, -.005), 1, (.042, .032, .045), 1)                              # the talus
        knob(bm, (hx, .04, -.07), 1, (.04, .036, .05), 1)                                  # the heel
        for i in range(5):
            f = (i - 2) / 2; b = V(hx + s * f * .03, .045, .03); m = V(hx + s * f * .052, .022, .17)
            tube(bm, [b, m], [.012, .014], 5)
            finger(bm, [m, m + V(s * f * .008, -.005, .045), m + V(s * f * .01, -.012, .075)], .012 if i else .015)
    hard(f'knee{n}__bone.1', foot)

# ---- pass 72: the gaol's irons, and the heat in its ribs ---------------------------------------------------------------------------
def cuff(bm, c, r, h, sides=8):
    """An iron band round a limb at c (axis y): a rolled rim top and bottom, the band between, and the staple."""
    c = V(*c)
    loop(bm, [c + V(r * math.cos(a), h / 2, r * math.sin(a)) for a in [k / sides * math.tau for k in range(sides)]], .012, 4)
    loop(bm, [c + V(r * math.cos(a), -h / 2, r * math.sin(a)) for a in [k / sides * math.tau for k in range(sides)]], .012, 4)
    ring = lambda rr, y: [bm.verts.new(G(*(c + V(rr * math.cos(k / sides * math.tau), y, rr * math.sin(k / sides * math.tau))))) for k in range(sides)]
    ob_, ot, ib, it = ring(r * .98, -h / 2), ring(r * .98, h / 2), ring(r * .84, -h / 2), ring(r * .84, h / 2)
    for k in range(sides):   # the band: a closed ring of iron between the rims (outside, inside, top, bottom)
        j = (k + 1) % sides
        for q in ((ob_[k], ob_[j], ot[j], ot[k]), (ib[j], ib[k], it[k], it[j]), (ot[k], ot[j], it[j], it[k]), (ib[k], ib[j], ob_[j], ob_[k])): bm.faces.new(q)
    knob(bm, c + V(0, -h / 2 - .012, r * 1.02), .016, (1.2, 1.4, .8), 0)   # the staple the chain hung from
def link(bm, c, d, u, L=.032, W=.019, wire=.0075):
    c, d, u = V(*c), V(*d).normalized(), V(*u).normalized()
    loop(bm, [c + d * (L * math.cos(a)) + u * (W * math.sin(a)) for a in [k / 8 * math.tau for k in range(8)]], wire, 3)
def chain(bm, pts, wire=.0075):
    """Links along a polyline, each turned a quarter from the last; the last one broken open."""
    for i in range(len(pts) - 1):
        a, b = V(*pts[i]), V(*pts[i + 1]); d = b - a
        side = d.cross(V(0, 1, 0)) if abs(d.normalized().y) < .9 else d.cross(V(1, 0, 0))
        u = side if i % 2 else d.cross(side)
        link(bm, (a + b) / 2, d, u, d.length * .62, .018, wire)
def irons(where, c, r, h, links):
    def build(bm):
        cuff(bm, c, r, h)
        if links: chain(bm, links)
    hard(where, build)
# the claw's wrist: a cuff and three links hanging off its staple
irons('elbowL__iron', (SX, WRL + .085, -.004), .058, .055,
      [(SX, WRL + .045, .056), (SX + .01, WRL + .0, .07), (SX + .016, WRL - .05, .07), (SX + .02, WRL - .1, .062)])
irons('elbowR__iron', (-SX, WRR + .07, .004), .056, .05, None)   # the club arm's cuff, its chain long gone
# the left ankle: a cuff and a broken chain trailing back along the floor
irons('kneeL__iron', (.15 + .02, .15, -.004), .07, .06,
      [(.17, .1, .066), (.18, .04, .095), (.19, .016, .045), (.2, .015, -.02), (.21, .015, -.085)])
def heat(bm):   # a white-hot mass in the barrel of the ribs, round the spine: the pit's heat, gathered
    for c, sc in (((0, 1.3, .0), (.13, .16, .09)), ((.04, 1.42, -.01), (.09, .08, .07)), ((-.05, 1.2, .01), (.1, .09, .07)),
                  ((.07, 1.25, .03), (.06, .07, .06)), ((-.06, 1.37, .02), (.06, .06, .05))):
        knob(bm, c, 1, sc, 2)
soft('chest__heat', heat, 360, voxel=.014, noise=.01)

result = tally()
