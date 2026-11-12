# The wanderer (the player). One rigid mesh per game bone (js/rig.js skeleton at scale 1, MODEL_DEFS.wanderer's bones),
# named <bone>__<material slot>[.n], so every key pose and the cape's cloth springs drive it. Rest pose: upright, arms
# hanging straight. Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.30, y 1.55,
# elbows y 1.25, wrists y .95; hips x +-.15, y .90, knees y .45, soles y 0; capeA (0, 1.55, -.235), capeB y 1.15, capeC
# y .75; scarfTail (.04, 1.62, -.09).
# The look (kept from v6.0's brief): a worn wanderer, not a hero. A deep hood and shoulder mantle, a faded-red scarf, a
# quilted gambeson under a leather cuirass, a short mail skirt under a split coat, one iron pauldron on the shield side,
# vambraces, tall boots, a long tattered cape, and a planked round shield slung on the back.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib; importlib.reload(snow_lib)
from snow_lib import G, new_obj, blob, organic, tinted
import bpy, bmesh
from mathutils import Vector, Matrix

rnd = random.Random(11)
COL = {'cloth': (0.40, 0.37, 0.30), 'hood': (0.28, 0.30, 0.23), 'cape': (0.33, 0.31, 0.25), 'capeHem': (0.31, 0.29, 0.23),
       'coat': (0.35, 0.33, 0.27), 'leather': (0.30, 0.25, 0.19), 'strap': (0.20, 0.16, 0.12), 'mail': (0.42, 0.43, 0.46),
       'iron': (0.55, 0.56, 0.58), 'wood': (0.40, 0.31, 0.22), 'scarf': (0.55, 0.16, 0.12), 'skin': (0.55, 0.47, 0.40)}
pieces = []

def finish(name, ob, smooth=True):
    slot = name.split('__')[1].split('.')[0]
    tinted(ob, slot, COL[slot]); ob.name = name; pieces.append(ob)
    for p in ob.data.polygons: p.use_smooth = smooth
    return ob

def solid(ob, t, offset=-1):
    m = ob.modifiers.new('so', 'SOLIDIFY'); m.thickness = t; m.offset = offset; m.use_even_offset = True
    bpy.context.view_layer.objects.active = ob
    dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    ob.modifiers.clear(); old = ob.data; ob.data = me; bpy.data.meshes.remove(old)
    return ob

def soft(name, build, keep, voxel=0.012, noise=0.0, after=None):
    """Fused, smoothed volume (cloth over a body, a boot): voxel remesh, decimated to `keep` triangles."""
    bm = bmesh.new(); build(bm); ob = new_obj(name, bm)
    organic(ob, voxel, keep * 4, noise, sum(map(ord, name)) & 255)
    if after:
        for v in ob.data.vertices:
            g = Vector((v.co.x, v.co.z, -v.co.y)); d = after(g)
            if d: v.co += v.normal * d
    keep_tris(ob, keep)
    return finish(name, ob)

def keep_tris(ob, keep):
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    if tris > keep:
        d = ob.modifiers.new('d', 'DECIMATE'); d.ratio = keep / tris
        bpy.context.view_layer.objects.active = ob
        dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
        ob.modifiers.clear(); old = ob.data; ob.data = me; bpy.data.meshes.remove(old)

def hard(name, build, thick=0.0, smooth=True):
    """Exact geometry (plates, sheets, straps). `thick` solidifies a sheet."""
    bm = bmesh.new(); build(bm); bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); ob = new_obj(name, bm)
    if thick: solid(ob, thick)
    return finish(name, ob, smooth)

# ---- shape helpers (game space) ---------------------------------------------------------------------------------------
def ring(bm, y, cx, cz, rx, rz, sides, a0=0.0, a1=math.tau, closed=True, push=None):
    """Points of an ellipse at height y; angle 0 faces forward (+z), pi/2 the figure's left (+x)."""
    n = sides if closed else sides + 1; out = []
    for k in range(n):
        a = a0 + (a1 - a0) * k / sides; r = 1 + (push(a, y) if push else 0)
        out.append(bm.verts.new(G(cx + math.sin(a) * rx * r, y, cz + math.cos(a) * rz * r)))
    return out

def bridge(bm, rings, closed=True, cap=False):
    for r0, r1 in zip(rings, rings[1:]):
        n = len(r0) if closed else len(r0) - 1
        for k in range(n):
            j = (k + 1) % len(r0); bm.faces.new((r0[k], r0[j], r1[j], r1[k]))
    if cap and closed:
        bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])

def loft(bm, rows, sides=12, cap=True, a0=0.0, a1=math.tau, push=None):
    """rows: (y, cx, cz, rx, rz) top to bottom or bottom to top."""
    closed = (a1 - a0) >= math.tau - 1e-6
    rings = [ring(bm, y, cx, cz, rx, rz, sides, a0, a1, closed, push) for (y, cx, cz, rx, rz) in rows]
    bridge(bm, rings, closed, cap)
    return rings

def tube(bm, pts, radii, sides=8):
    """A round tube through game points (any direction)."""
    pts = [Vector(p) for p in pts]; rings = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        a = t.cross(Vector((0, 1, 0)) if abs(t.y) < 0.9 else Vector((1, 0, 0))).normalized(); b = t.cross(a).normalized()
        rings.append([bm.verts.new(G(*(p + (a * math.cos(k / sides * math.tau) + b * math.sin(k / sides * math.tau)) * radii[i]))) for k in range(sides)])
    bridge(bm, rings, True, True)

def sheet(bm, cols, rows, at, ragged=0.0, seed=1):
    """A grid sheet: at(u, v) -> game point for u, v in 0..1 (v = 0 the top). `ragged` tears the bottom edge."""
    r = random.Random(seed); grid = []
    for j in range(rows + 1):
        v = j / rows; line = []
        for i in range(cols + 1):
            u = i / cols; p = Vector(at(u, v))
            if j == rows and ragged:
                p.y += r.uniform(0, ragged) if i % 2 else r.uniform(0, ragged * 0.25)
            elif j == rows - 1 and ragged:
                p.y += r.uniform(0, ragged * 0.3)
            line.append(bm.verts.new(G(*p)))
        grid.append(line)
    for j in range(rows):
        for i in range(cols):
            bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))

def shell(bm, c, rx, ry, rz, e0, e1, a0, a1, nu=14, nv=7, warp=None):
    """Part of an ellipsoid (elevation e0..e1, angle a0..a1 around y, 0 = forward) as an open surface."""
    grid = []
    for j in range(nv + 1):
        e = e0 + (e1 - e0) * j / nv; line = []
        for i in range(nu + 1):
            a = a0 + (a1 - a0) * i / nu
            p = Vector((c[0] + math.sin(a) * math.cos(e) * rx, c[1] + math.sin(e) * ry, c[2] + math.cos(a) * math.cos(e) * rz))
            if warp: p = Vector(warp(p, a, e))
            line.append(bm.verts.new(G(*p)))
        grid.append(line)
    for j in range(nv):
        for i in range(nu):
            bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))

def stud(bm, p, r=0.009):
    blob(bm, p, r, (1, 1, 1), 1)

# ---- body: the pelvis, the coat and the mail skirt (spin) ------------------------------------------------------------
def hips(bm):
    loft(bm, [(1.10, 0, 0, .17, .12), (1.0, 0, 0, .185, .13), (.9, 0, -.005, .19, .13), (.82, 0, 0, .17, .12)], 14)
    for s in (-1, 1): blob(bm, (s * .1, .86, -.02), .1, (1, .9, 1), 2)
soft('spin__cloth', hips, 340)

def mail(bm):   # a short hauberk skirt, flared, with rows of rings
    loft(bm, [(1.0, 0, 0, .196, .14), (.86, 0, -.005, .215, .155), (.72, 0, -.01, .235, .175)], 22, cap=False,
         push=lambda a, y: .012 * math.sin(y * 140) ** 2)
hard('spin__mail', mail, thick=.008)

def coat_back(bm):   # the coat's back panel: hip to below the knee, flaring, split from the tassets at the sides
    sheet(bm, 9, 6, lambda u, v: (math.sin(math.pi * (.62 + .76 * u)) * (.205 + .1 * v), 1.02 - .62 * v,
                                   -.02 + math.cos(math.pi * (.62 + .76 * u)) * (.15 + .1 * v)), ragged=.05, seed=3)
hard('spin__coat', coat_back, thick=.012)

def belt(bm):
    loft(bm, [(1.03, 0, 0, .2, .145), (.98, 0, 0, .2, .145)], 20, cap=False)
hard('spin__strap', belt, thick=.012)

def belt_gear(bm):   # a pouch on the left hip, the flask on the right
    blob(bm, (.19, .93, .09), .055, (.8, 1, .7), 2)
    loft(bm, [(.98, .19, .09, .05, .035), (.96, .19, .09, .055, .04)], 8)
soft('spin__leather', belt_gear, 160, voxel=.008)

def belt_iron(bm):
    loft(bm, [(1.04, 0, .147, .028, .008), (.97, 0, .147, .028, .008)], 8)            # buckle
    loft(bm, [(.96, -.2, .07, .03, .03), (.9, -.2, .07, .042, .042), (.82, -.2, .07, .04, .04), (.8, -.2, .07, .02, .02)], 8)   # flask
    loft(bm, [(1.0, -.2, .07, .012, .012), (.96, -.2, .07, .012, .012)], 6)
hard('spin__iron', belt_iron)

# ---- the chest: gambeson, cuirass, mantle, bandolier, the shield on the back -----------------------------------------
def torso(bm):
    loft(bm, [(1.0, 0, 0, .175, .125), (1.12, 0, .006, .178, .128), (1.3, 0, .012, .2, .14), (1.45, 0, .006, .215, .14),
              (1.56, 0, -.005, .2, .125), (1.63, 0, -.01, .12, .1)], 16)
    for s in (-1, 1): blob(bm, (s * .26, 1.55, -.005), .085, (1.1, .8, 1), 2)       # the shoulder caps the arms sit under
quilt = lambda g: .003 * math.sin(g.y * 95) + .002 * math.sin(math.atan2(g.x, g.z) * 18)
soft('chest__cloth', torso, 640, after=quilt)

def cuirass(bm):   # boiled leather, cut short and a little open at the sides
    loft(bm, [(1.12, 0, .008, .19, .14), (1.25, 0, .013, .205, .152), (1.4, 0, .009, .222, .152), (1.5, 0, .004, .218, .14)], 20,
         cap=False)
hard('chest__leather', cuirass, thick=.012)

def mantle(bm):   # the cowl's shoulder mantle: falls over the shoulders, ragged at the hem
    hem = random.Random(8)
    cuts = [hem.uniform(0, .06) for _ in range(23)]
    rows = [(1.665, 0, -.02, .13, .115), (1.61, 0, -.02, .22, .16), (1.54, 0, -.02, .3, .19), (1.46, 0, -.025, .33, .205)]
    rings = [ring(bm, y, cx, cz, rx, rz, 22) for (y, cx, cz, rx, rz) in rows]
    for k, v in enumerate(rings[-1]):
        c = cuts[k] if k % 2 else cuts[k] * .3
        co = v.co; v.co = (co.x, co.y, co.z + c)
    bridge(bm, rings)
hard('chest__hood', mantle, thick=.014)

def bandolier(bm):   # right shoulder to left hip, front and back
    def path(sign):
        pts = []
        for i in range(7):
            t = i / 6; y = 1.56 - .5 * t; x = -.16 + .34 * t
            rz = .14 + .012 if y > 1.12 else .135
            rx = .222 if y > 1.12 else .2
            z = sign * (rz * math.sqrt(max(0.02, 1 - (x / rx) ** 2)) + .016)
            pts.append((x, y, z))
        return pts
    for sign in (1, -1):
        p = path(sign)
        sheet(bm, 1, 6, lambda u, v, p=p: (p[round(v * 6)][0] + (u - .5) * .05, p[round(v * 6)][1] + (u - .5) * .03, p[round(v * 6)][2]))
hard('chest__strap', bandolier, thick=.008)

SH_C, SH_R = Vector((0.0, 1.3, -0.33)), 0.27
def shield_xf(p):   # shield space (disk in x/y, +z out of the back) -> game: tilted, slung a little off-centre
    m = Matrix.Rotation(-.12, 3, 'X') @ Matrix.Rotation(.2, 3, 'Z')
    q = m @ Vector((p[0], p[1], -p[2]))
    return SH_C + q

def shield_wood(bm):
    planks, r = 6, SH_R
    for i in range(planks):
        x0, x1 = -r + 2 * r * i / planks + .002, -r + 2 * r * (i + 1) / planks - .002
        xs = [x0 + (x1 - x0) * k / 3 for k in range(4)]
        top = [(x, math.sqrt(max(0, r * r - x * x))) for x in xs]
        front, back = [], []
        for z in (.0, .026 - .004 * (i % 2)):
            col = [bm.verts.new(G(*shield_xf((x, -h + .003, z)))) for x, h in top] + [bm.verts.new(G(*shield_xf((x, h - .003, z)))) for x, h in reversed(top)]
            (front if z == .0 else back).append(col)
        f, b = front[0], back[0]; n = len(f)
        bm.faces.new(f); bm.faces.new(list(reversed(b)))
        for k in range(n): bm.faces.new((f[k], b[k], b[(k + 1) % n], f[(k + 1) % n]))
hard('chest__wood', shield_wood, smooth=False)

def shield_iron(bm):
    n = 22
    for (r0, r1, z0, z1) in [(SH_R - .012, SH_R + .01, -.004, .03)]:
        rows = []
        for (r, z) in [(r0, z1 + .004), (r1, z1 + .004), (r1, z0), (r0, z0)]:
            rows.append([bm.verts.new(G(*shield_xf((math.cos(k / n * math.tau) * r, math.sin(k / n * math.tau) * r, z))) ) for k in range(n)])
        for j in range(4):
            a, b = rows[j], rows[(j + 1) % 4]
            for k in range(n): bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]))
    # the boss: a low dome
    rows = []
    for j, (r, z) in enumerate([(.075, .028), (.07, .045), (.05, .07), (.025, .082), (.004, .085)]):
        rows.append([bm.verts.new(G(*shield_xf((math.cos(k / 16 * math.tau) * r, math.sin(k / 16 * math.tau) * r, z)))) for k in range(16)])
    bridge(bm, rows); bm.faces.new(list(reversed(rows[0]))); bm.faces.new(rows[-1])
    for k in range(8):
        a = k / 8 * math.tau; stud(bm, shield_xf((math.cos(a) * (SH_R - .035), math.sin(a) * (SH_R - .035), .032)), .011)
hard('chest__iron', shield_iron)

def shield_strap(bm):   # the sling: over the left shoulder and back under the right arm
    for (x0, y0, x1, y1) in [(.2, 1.56, -.17, 1.12)]:
        sheet(bm, 1, 5, lambda u, v: (x0 + (x1 - x0) * v + (u - .5) * .045, y0 + (y1 - y0) * v, -.155 - .03 * math.sin(math.pi * v)))
hard('chest__strap.2', shield_strap, thick=.008)

# ---- neck: the wound scarf; head: the face, its wrap, the hood ---------------------------------------------------------
def scarf(bm):
    tube(bm, [(math.sin(a) * .115, 1.64 + .015 * math.sin(a * 2), math.cos(a) * .1 - .01) for a in [k / 14 * math.tau for k in range(15)]], [.035] * 15, 8)
    tube(bm, [(math.sin(a) * .13, 1.6 + .01 * math.cos(a * 3), math.cos(a) * .115 - .01) for a in [k / 14 * math.tau for k in range(15)]], [.032] * 15, 8)
    blob(bm, (.06, 1.6, .1), .04, (1.2, .9, .8), 2)    # the knot
soft('neck__scarf', scarf, 280, voxel=.009)

def head(bm):
    blob(bm, (0, 1.8, .01), .1, (.86, 1.12, .98), 3)
    blob(bm, (0, 1.79, .1), .018, (.8, 1.6, 1.2), 1)    # nose
    for s in (-1, 1): blob(bm, (s * .035, 1.815, .085), .022, (1.3, .6, .6), 1)   # brow
soft('head__skin', head, 300, voxel=.007)

def wrap(bm):   # the scarf drawn up over the mouth and nose
    loft(bm, [(1.795, 0, .012, .098, .105), (1.75, 0, .015, .1, .11), (1.7, 0, .006, .095, .1)], 16, cap=False, a0=-1.9, a1=1.9)
hard('head__scarf', wrap, thick=.01)

def hood(bm):   # a deep cowl: open at the face, a soft point at the back
    def warp(p, a, e):
        p = Vector(p); back = max(0, -math.cos(a))
        if e > .5: p.z -= .045 * back * (e - .5) ** 1.5; p.y += .012 * back * (e - .5)
        if e < -.2: s = 1 + .5 * (-.2 - e); p.x *= s; p.z = .0 + (p.z - .0) * s - .02
        return p
    c = (0, 1.79, -.005)
    # the face opening: the front third is left out between the chin and the brow
    shell(bm, c, .132, .155, .14, -.75, 1.57, .95, math.tau - .95, nu=13, nv=7, warp=warp)    # sides and back
    shell(bm, c, .132, .155, .14, .62, 1.57, -.95, .95, nu=4, nv=3, warp=warp)                 # over the brow
hard('head__hood', hood, thick=.016)

# ---- arms --------------------------------------------------------------------------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * .3
    def upper(bm, x=x, s=s):
        loft(bm, [(1.63, x - s * .02, -.005, .07, .07), (1.5, x, 0, .07, .068), (1.36, x, 0, .062, .062), (1.22, x, 0, .056, .056)], 12)
        blob(bm, (x - s * .01, 1.56, 0), .078, (1, 1, 1), 2)
        blob(bm, (x, 1.24, 0), .058, (1, 1, 1), 2)
    soft(f'arm{n}__cloth', upper, 320, after=lambda g: .002 * math.sin(g.y * 80))
    def fore(bm, x=x):
        loft(bm, [(1.29, x, 0, .056, .056), (1.18, x, .005, .056, .058), (1.0, x, .01, .045, .045)], 10)
        blob(bm, (x, 1.25, 0), .056, (1, 1, 1), 2)
    soft(f'elbow{n}__cloth', fore, 200)
    def vambrace(bm, x=x):
        loft(bm, [(1.19, x, .005, .063, .066), (1.08, x, .009, .058, .06), (.98, x, .012, .05, .052)], 12, cap=False)
    hard(f'elbow{n}__leather', vambrace, thick=.008)
    def straps(bm, x=x):
        for y in (1.15, 1.03): loft(bm, [(y + .012, x, .007, .068, .07), (y - .012, x, .007, .066, .068)], 12, cap=False)
    hard(f'elbow{n}__strap', straps, thick=.006)
    def hand(bm, x=x, s=s):   # a gloved fist; the right one closes on the sword's grip
        blob(bm, (x, .92, .02), .045, (.85, 1.1, 1.1), 2)
        blob(bm, (x, .87, .035), .04, (.95, .75, 1.1), 2)
        blob(bm, (x - s * .035, .91, .05), .02, (1, 1.5, 1), 1)   # thumb
    soft(f'elbow{n}__leather.2', hand, 140, voxel=.007)

def pauldron(bm, x, s, scale, lames):
    # a domed cop over the shoulder ball, closing round the arm, then lames that hug the upper arm below it
    c = (x + s * .012, 1.56, 0)
    shell(bm, c, .105 * scale, .078 * scale, .11 * scale, -.6, 1.5, math.pi / 2 * s - 1.75, math.pi / 2 * s + 1.75, nu=11, nv=6,
          warp=lambda p, a, e: (p[0] + s * .012 * max(0, e), p[1], p[2]))
    for i in range(lames):
        y = 1.485 - i * .045 * scale; r = (.095 - i * .004) * scale
        shell(bm, (x + s * .006, y, 0), r, .05 * scale, r * 1.02, -.7, .35, math.pi / 2 * s - 1.65, math.pi / 2 * s + 1.65, nu=10, nv=2)
def pauldron_iron(bm):
    pauldron(bm, .3, 1, 1.12, 3)
hard('armL__iron', pauldron_iron, thick=.01)
def pauldron_rivets(bm):
    for i in range(3):
        y = 1.485 - i * .05 + .015; r = (.095 - i * .004) * 1.12 + .004
        for a in (-1.0, 0, 1.0):
            stud(bm, (.3 + .007 + math.sin(math.pi / 2 + a) * r, y, math.cos(math.pi / 2 + a) * r * 1.02), .007)
hard('armL__iron.2', pauldron_rivets)
def pauldron_leather(bm):
    pauldron(bm, -.3, -1, .9, 1)
hard('armR__leather', pauldron_leather, thick=.01)

# ---- legs --------------------------------------------------------------------------------------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    def thigh(bm, hx=hx):
        loft(bm, [(1.0, hx * .8, -.01, .095, .095), (.85, hx, .0, .09, .092), (.62, hx, .01, .075, .078), (.45, hx, .01, .066, .068)], 12)
        blob(bm, (hx, .45, .015), .068, (1, 1, 1), 2)
    soft(f'leg{n}__cloth', thigh, 300, after=lambda g: .002 * math.sin(g.y * 70 + g.x * 30))
    def tasset(bm, hx=hx, s=s):   # the coat's front tails, split at the side and the middle
        sheet(bm, 5, 5, lambda u, v: (hx + math.sin(s * (-.25 + 1.75 * u)) * (.12 + .05 * v), 1.0 - .48 * v,
                                       .0 + math.cos(-.25 + 1.75 * u) * (.12 + .05 * v)), ragged=.04, seed=5 + s)
    hard(f'leg{n}__coat', tasset, thick=.012)
    def shin(bm, hx=hx):
        loft(bm, [(.47, hx, .01, .062, .064), (.42, hx, .0, .06, .06)], 10)
    soft(f'knee{n}__cloth', shin, 80)
    def boot(bm, hx=hx):
        loft(bm, [(.5, hx, .01, .078, .08), (.45, hx, .008, .074, .076), (.3, hx, -.005, .066, .07), (.14, hx, -.01, .056, .062),
                  (.06, hx, .0, .06, .07)], 12)
        loft(bm, [(.13, hx, .03, .055, .1), (.08, hx, .07, .055, .13), (.025, hx, .075, .058, .14)], 12)   # the foot
        blob(bm, (hx, .045, .19), .05, (1.05, .85, 1.1), 2)                                          # toe
        blob(bm, (hx, .05, -.045), .05, (1, .9, 1), 2)                                               # heel
    soft(f'knee{n}__leather', boot, 400, voxel=.009)
    def boot_bits(bm, hx=hx):
        loft(bm, [(.018, hx, .07, .062, .15), (.0, hx, .07, .062, .15)], 14)                         # the sole
        for y in (.36, .22): loft(bm, [(y + .01, hx, -.002, .072, .075), (y - .01, hx, -.002, .07, .073)], 12, cap=False)
    hard(f'knee{n}__strap', boot_bits, thick=0)

# ---- the cape: three bands on the cloth springs, then the scarf's tail ------------------------------------------------
def cape_band(y0, y1, w0, w1, d0, d1, ragged=0.0, seed=1):
    def at(u, v):
        y = y0 + (y1 - y0) * v; w = w0 + (w1 - w0) * v; d = d0 + (d1 - d0) * v
        k = (1.6 - y) / 1.25                           # 0 at the shoulders, 1 at the hem
        a = math.pi + (u - .5) * w                    # the arc it covers, centred behind
        fold = 1 + .07 * k * math.sin(u * math.pi * 7) ** 2   # long folds that open towards the hem
        return (math.sin(a) * (.24 + .13 * k) * fold, y, -.03 + math.cos(a) * d * fold)
    return lambda bm: sheet(bm, 14, 4, at, ragged, seed)
hard('capeA__cape', cape_band(1.56, 1.12, 1.9, 2.05, .2, .255), thick=.012)
hard('capeB__cape', cape_band(1.15, .72, 2.05, 2.2, .255, .29), thick=.012)
hard('capeC__capeHem', cape_band(.75, .34, 2.2, 2.35, .29, .32, ragged=.13, seed=4), thick=.012)

def scarf_tail(bm):
    sheet(bm, 1, 5, lambda u, v: (.05 + (u - .5) * (.075 - .02 * v) + .02 * v, 1.63 - .38 * v, -.13 - .05 * v - .03 * math.sin(math.pi * v)), ragged=.03, seed=9)
hard('scarfTail__scarf', scarf_tail, thick=.008)

result = {'pieces': len(pieces), 'tris': sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in pieces),
          'by': {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in pieces}}
