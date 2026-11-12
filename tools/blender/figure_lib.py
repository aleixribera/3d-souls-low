# Shared helpers for the figures built one rigid piece per rig bone (wanderer.py, hollow.py). Game axes, written to Blender
# through snow_lib.G. A figure script sets COL (its material slots' preview colours), then builds pieces with soft() / hard();
# each piece is named <bone>__<material slot>[.n] and collected in `pieces`.
import math, random
import bpy, bmesh
from mathutils import Vector, Matrix
from snow_lib import G, new_obj, blob, organic, tinted

COL = {}
pieces = []
NAME = {'prefix': ''}

def begin(colours, prefix=''):
    """Start a figure: its slot colours, an empty piece list, and the prefix its mesh names carry ("hollow:"). All baked
    meshes share one table in the game, so a figure whose bone names another figure also uses needs its own prefix."""
    COL.clear(); COL.update(colours); pieces.clear(); NAME['prefix'] = prefix

def finish(name, ob, smooth=True):
    slot = name.split('__')[1].split('.')[0]
    tinted(ob, slot, COL[slot]); ob.name = NAME['prefix'] + name; pieces.append(ob)
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

def hard(name, build, thick=0.0, smooth=True, outward=None):
    """Exact geometry (plates, sheets, straps). `thick` solidifies a sheet. `outward` (a game point) turns a one-sided
    sheet's faces away from it, since the game culls back faces; a function of the face's centre (a game Vector) gives
    each face its own point (bands round a limb, each turned away from the limb's axis at its own height)."""
    bm = bmesh.new(); build(bm); bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    if outward is not None:
        bm.normal_update()
        def ref(c):
            return G(*outward(Vector((c.x, c.z, -c.y)))) if callable(outward) else G(*outward)
        flip = [f for f in bm.faces if f.normal.dot(f.calc_center_median() - ref(f.calc_center_median())) < 0]
        if flip: bmesh.ops.reverse_faces(bm, faces=flip)
    ob = new_obj(name, bm)
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


def tally():
    """The figure's result: piece count, triangles in all and per piece."""
    by = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in pieces}
    return {'pieces': len(pieces), 'tris': sum(by.values()), 'by': by}
