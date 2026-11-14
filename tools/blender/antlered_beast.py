# The Antlered Hunger (Level 6's boss). One rigid mesh per game bone (js/rig.js skeleton at scale 1), named
# <bone>__<material slot>[.n], so every key pose in the game drives it. Rest pose is upright; the hunch comes from the
# model's `posture` in js/data/bosses/antlered-hunger.js. Shoulders x +-0.40; arms 1.35 long (elbow y 1.145, wrist y 0.74).
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib; importlib.reload(snow_lib)
from snow_lib import *
import bpy, bmesh
rnd = random.Random(7)
SX, HIPY, CHEST, NECK, HEAD = 0.40, 0.95, 1.0, 1.62, 1.69
SH_Y, EL_Y, WR_Y = 1.55, 1.145, 0.74
COL = {'hide': (0.27, 0.19, 0.13), 'quill': (0.08, 0.07, 0.07), 'bone': (0.78, 0.72, 0.60)}
pieces = []
def done(name, ob):
    tinted(ob, name.split('__')[1].split('.')[0], COL[name.split('__')[1].split('.')[0]]); ob.name = name; pieces.append(ob); return ob
def piece(name, build, keep, voxel=0.018, noise=0.016):
    bm = bmesh.new(); build(bm); ob = new_obj(name, bm)
    return done(name, organic(ob, voxel, keep, noise, sum(map(ord, name)) & 255))
def hard(name, build):
    bm = bmesh.new(); build(bm); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); ob = new_obj(name, bm)
    for p in ob.data.polygons: p.use_smooth = True
    return done(name, ob)
def quills(bm, spots, length, r=0.03):
    for (p, d) in spots:
        d = Vector(d).normalized(); L = length * rnd.uniform(0.65, 1.25)
        tip = Vector(p) + d * L + Vector((rnd.uniform(-.06, .06), rnd.uniform(-.04, .04), rnd.uniform(-.06, .06))) * L
        bent_spike(bm, p, tip, r * rnd.uniform(0.8, 1.3), (0, -0.12 * L, -0.1 * L))

def sinews(bm, a, b, n, r, r1=None, oval=1.0):
    """Root-like strands half sunk into a limb from a to b, keeping to its taper (r at a, r1 at b): they read as gnarled
    wood, not muscle. Anything standing clear of the surface comes out of the voxel fuse as a ragged flap."""
    a, b = Vector(a), Vector(b); r1 = r if r1 is None else r1
    for i in range(n):
        ang = i / n * math.tau + rnd.uniform(-.2, .2); pts = []
        for t in (0, .33, .66, 1):
            k = r + (r1 - r) * t; g = ang + t * .5 + rnd.uniform(-.06, .06)
            pts.append(a.lerp(b, t) + Vector((math.cos(g) * k * oval, 0, math.sin(g) * k)))
        tube(bm, pts, [.03, .04, .038, .026], 6)

# ---- body ------------------------------------------------------------------------------------------------------------
def pelvis(bm):
    blob(bm, (0, HIPY + .04, -.02), .26, (1.15, .85, .95), 3)
    sinews(bm, (0, HIPY + .24, -.02), (0, HIPY - .14, -.02), 8, .2, .17, 1.2)
    tube(bm, [(0, HIPY + .1, -.16), (0, HIPY - .02, -.34), (0, HIPY - .3, -.5), (.03, HIPY - .58, -.62)], [.13, .1, .06, .012], 8)   # a stub of tail
piece('spin__hide', pelvis, 900)
def chest(bm):
    blob(bm, (0, CHEST + .28, 0), .36, (1.15, 1.0, .95), 3)              # the rib barrel
    blob(bm, (0, CHEST + .52, -.05), .38, (1.42, .72, .95), 3)           # the shoulder yoke
    blob(bm, (0, CHEST + .55, -.2), .26, (1.0, .9, 1.0), 2)              # the hump
    for s in (-1, 1):
        blob(bm, (s * SX * .92, SH_Y + .02, 0), .2, (1, 1, 1), 2)        # deltoids
        blob(bm, (s * .17, CHEST + .42, .24), .15, (1.2, 1, .6), 2)      # pectoral slabs
    sinews(bm, (0, CHEST + .06, 0), (0, CHEST + .7, 0), 10, .3, .36, 1.25)
piece('chest__hide', chest, 2000, voxel=.02)
def chest_q(bm):
    spots = []
    for i in range(70):
        a, t = rnd.uniform(-1.25, 1.25), rnd.uniform(0, 1)
        x, y, z = math.sin(a) * .44, CHEST + .14 + t * .62, -math.cos(a) * .3 - .06
        spots.append(((x, y, z), (x * 1.2, .55 + t * .7, -.9)))
    quills(bm, spots, .62, .036)
hard('chest__quill', chest_q)
def neck(bm):
    tube(bm, [(0, NECK - .16, -.04), (0, NECK + .02, .01), (0, NECK + .12, .05)], [.2, .16, .12], 10)
    sinews(bm, (0, NECK - .16, -.02), (0, NECK + .12, .05), 6, .17, .1)
piece('neck__hide', neck, 350)
def neck_q(bm):
    spots = []
    for i in range(24):
        a, y = rnd.uniform(-1.5, 1.5), rnd.uniform(-.12, .1)
        spots.append(((math.sin(a) * .16, NECK + y, -math.cos(a) * .15), (math.sin(a), .8, -1.05)))
    quills(bm, spots, .5, .026)
hard('neck__quill', neck_q)

# ---- the skull -------------------------------------------------------------------------------------------------------
# A stag's skull, not a snout: a broad flat face under a heavy brow, two sockets and the nose cut through it by booleans
# (dark fills behind them, the ember eyes inside), cheekbones and their arches, a wide flat muzzle.
Hy, Hz = HEAD + .07, .08
def ellipsoid(bm, c, rr, roll=0.0, sub=2):
    """An ellipsoid (radii rr) turned by `roll` about the forward axis (seen from the front, + lifts its +x end)."""
    m = bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0); cr, sr = math.cos(roll), math.sin(roll)
    for v in m['verts']:
        x, y, z = v.co.x * rr[0], v.co.y * rr[1], v.co.z * rr[2]
        v.co = G(c[0] + x * cr - y * sr, c[1] + x * sr + y * cr, c[2] + z)
def carve(ob, cutters):
    """Boolean-subtract ellipsoids (centre, radii, roll) from a finished piece: real holes (the sockets, the nose)."""
    for c, rr, roll in cutters:
        bm = bmesh.new(); ellipsoid(bm, c, rr, roll); cut = new_obj('cut', bm)
        m = ob.modifiers.new('b', 'BOOLEAN'); m.operation = 'DIFFERENCE'; m.object = cut; m.solver = 'EXACT'
        bpy.context.view_layer.objects.active = ob
        dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
        ob.modifiers.clear(); old = ob.data; ob.data = me; bpy.data.meshes.remove(old)
        bpy.data.objects.remove(cut)
    for p in ob.data.polygons: p.use_smooth = True
    return ob
SOCK = [((s * .075, Hy + .02, Hz + .175), (.046, .036, .055), s * .3) for s in (-1, 1)]   # inner corners down: a scowl
NOSE = ((0, Hy - .08, Hz + .435), (.034, .03, .05), 0.0)
def skull(bm):
    blob(bm, (0, Hy + .03, Hz - .01), .13, (1.12, .9, 1.05), 3)          # cranium
    blob(bm, (0, Hy + .01, Hz + .11), .1, (1.2, .75, .9), 3)             # the broad flat face
    tube(bm, [(0, Hy - .01, Hz + .12), (0, Hy - .04, Hz + .24), (0, Hy - .07, Hz + .34), (0, Hy - .095, Hz + .43)],
         [.085, .072, .056, .046], 10, ovals=[(1.3, .72)] * 4)            # the muzzle, wide and flat-topped
    for s in (-1, 1):
        tube(bm, [(s * .135, Hy + .055, Hz + .06), (s * .085, Hy + .07, Hz + .16), (0, Hy + .055, Hz + .185)], [.026, .03, .026], 8)   # the brow
        blob(bm, (s * .1, Hy - .045, Hz + .12), .036, (1, .75, 1.3), 2)                                    # the cheekbone
        tube(bm, [(s * .1, Hy - .045, Hz + .1), (s * .13, Hy - .035, Hz + .0), (s * .12, Hy - .04, Hz - .07)], [.022, .019, .017], 6)   # its arch
        tube(bm, [(s * .07, Hy - .08, Hz + .02), (s * .06, Hy - .13, Hz + .14), (s * .036, Hy - .15, Hz + .3)], [.022, .018, .012], 6)   # the lower jaw
carve(piece('head__bone', skull, 1300, voxel=.009, noise=.003), SOCK + [NOSE])
def sockets(bm):
    for s in (-1, 1): blob(bm, (s * .075, Hy + .02, Hz + .125), .038, (1, .85, .4), 2)   # the dark at the bottom of each socket
    blob(bm, (0, Hy - .08, Hz + .385), .03, (1.1, 1, .5), 2)                            # and of the nose
    blob(bm, (0, Hy - .1, Hz + .2), .05, (.9, .35, 3), 2)   # the dark of the mouth
hard('head__quill', sockets)
BEAM_R = [.062, .054, .046, .036, .026, .011]
def beam_of(s):
    B = lambda x, y, z: (s * x, Hy + y, Hz + z)
    return [B(.075, .1, .04), B(.2, .22, .0), B(.38, .33, -.1), B(.6, .4, -.08), B(.82, .52, .04), B(1.0, .72, .14)]
def teeth_antlers(bm):
    for s in (-1, 1):
        for i in range(4):
            z = Hz + .16 + i * .07
            bent_spike(bm, (s * .05 * (1 - i * .15), Hy - .1 - i * .012, z), (s * .05 * (1 - i * .15), Hy - .16 - i * .012, z + .012), .012)
    for s in (-1, 1):
        beam = beam_of(s)
        tube(bm, beam, BEAM_R, 7)
        tines = [(1, (.3, .03, .4)), (2, (.22, .36, .22)), (2, (.1, -.02, .34)), (3, (.2, .44, -.04)), (3, (.06, .03, .3)), (4, (.26, .34, .14)), (4, (.34, .06, .2))]
        for i, (dx, dy, dz) in tines:
            b = Vector(beam[i]); t = b + Vector((s * dx, dy, dz)); m = (b + t) / 2 + Vector((s * .03, .05, -.02))
            tube(bm, [b, m, t], [.032, .02, .005], 5)
hard('head__bone.2', teeth_antlers)
# The marks (pass 77): an ember collar round each antler's beam, one lit for each move the Hunger has learned, from the
# skull out to the tips (the def's `marks`, js/finale.js). Each is its own glow slot, hidden until lit.
MARK_AT = [(0, .75), (1, .55), (2, .45), (3, .35), (3, .85), (4, .55)]   # (beam segment, how far along it)
for i, (seg, f) in enumerate(MARK_AT, 1):
    COL[f'mark{i}'] = (1.0, 0.45, 0.12)
    def collar(bm, seg=seg, f=f):
        for s in (-1, 1):
            beam = [Vector(p) for p in beam_of(s)]
            a, b = beam[seg], beam[seg + 1]; p = a.lerp(b, f); t = (b - a).normalized()
            r = (BEAM_R[seg] + (BEAM_R[seg + 1] - BEAM_R[seg]) * f) * 1.15 + .02
            u = t.cross(Vector((0, 1, 0))).normalized(); v = t.cross(u)
            ring = [p + (u * math.cos(k / 10 * math.tau) + v * math.sin(k / 10 * math.tau)) * r for k in range(11)]
            tube(bm, ring, [.024] * 11, 5, cap=False)
    hard(f'head__mark{i}', collar)

# ---- arms (bones hang straight; the meshes keep to them) ---------------------------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    def upper(bm):
        tube(bm, [(x, SH_Y + .02, 0), (x + s * .03, SH_Y - .16, 0), (x + s * .02, EL_Y + .04, 0)], [.17, .14, .095], 10)
        blob(bm, (x + s * .03, SH_Y - .14, .04), .12, (1, 1.5, .9), 2)
        sinews(bm, (x, SH_Y - .02, 0), (x + s * .02, EL_Y + .04, 0), 5, .13, .08)
    piece(f'arm{n}__hide', upper, 420)
    def upper_q(bm):
        quills(bm, [((x + s * rnd.uniform(.05, .13), SH_Y - rnd.uniform(0, .3), -rnd.uniform(0, .1)), (s * .9, .5, -.8)) for _ in range(14)], .46, .026)
    hard(f'arm{n}__quill', upper_q)
    def fore(bm):
        tube(bm, [(x, EL_Y + .03, 0), (x, EL_Y - .13, .02), (x, WR_Y + .1, .03), (x, WR_Y, .03)], [.1, .115, .075, .07], 10)
        blob(bm, (x, WR_Y - .08, .05), .09, (1.25, .8, 1.35), 2)     # the broad palm
        sinews(bm, (x, EL_Y - .02, .02), (x, WR_Y + .02, .03), 5, .09, .06)
        for i in range(4):
            fx = x + (i - 1.5) * .05
            tube(bm, [(fx, WR_Y - .1, .08), (fx, WR_Y - .22, .1), (fx + (i - 1.5) * .02, WR_Y - .3, .13)], [.032, .026, .024], 6)
    piece(f'elbow{n}__hide', fore, 620, voxel=.016)
    def claws(bm):
        for i in range(4):
            fx = x + (i - 1.5) * .05 + (i - 1.5) * .02
            bent_spike(bm, (fx, WR_Y - .29, .125), (fx + (i - 1.5) * .05, WR_Y - .54, .2), .03, (0, 0, .05), 5)
        bent_spike(bm, (x - s * .1, WR_Y - .12, .09), (x - s * .24, WR_Y - .3, .19), .026, (0, 0, .04), 5)
    hard(f'elbow{n}__bone', claws)
    # ---- legs: a thick thigh forward, a hock behind, the long clawed foot ----------------------------------------------
    hx = s * .15
    def thigh(bm):
        tube(bm, [(hx, HIPY + .0, 0), (hx + s * .03, .72, .1), (hx + s * .03, .5, .14)], [.2, .19, .11], 10)
        sinews(bm, (hx, HIPY - .04, .01), (hx + s * .03, .54, .13), 6, .17, .1)
    piece(f'leg{n}__hide', thigh, 380)
    def shin(bm):
        tube(bm, [(hx + s * .03, .5, .13), (hx + s * .03, .36, -.1), (hx + s * .03, .2, -.15), (hx + s * .03, .1, .02), (hx + s * .03, .05, .22)], [.1, .085, .06, .06, .05], 8)
        blob(bm, (hx + s * .03, .06, .2), .085, (1.3, .55, 1.5), 2)
    piece(f'knee{n}__hide', shin, 420, voxel=.016)
    def toes(bm):
        for i in range(3):
            fx = hx + s * .03 + (i - 1) * .075
            bent_spike(bm, (fx, .05, .28), (fx + (i - 1) * .05, .0, .52), .036, (0, .04, 0), 5)
    hard(f'knee{n}__bone', toes)
# The skull is the focal point: larger than life, about the crown of the neck.
for o in pieces:
    if o.name.startswith('head__'):
        c = G(0, Hy - .02, Hz - .06)
        for v in o.data.vertices: v.co = c + (v.co - c) * 1.32
result = {'pieces': len(pieces), 'tris': sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in pieces)}
