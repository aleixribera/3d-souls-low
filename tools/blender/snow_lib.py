# Shared helpers for the Level 6 models (tools/blender/*). Everything is built in GAME axes and written to Blender with
# G(x, y, z) -> Blender (x, -z, y): the glTF export turns that back into the game's x east, y up, z north.
import math, random
import bpy, bmesh
from mathutils import Vector

def G(x, y, z): return Vector((x, -z, y))

def new_obj(name, bm, col=None):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); (col or bpy.context.scene.collection).objects.link(ob)
    return ob

def tube(bm, pts, radii, sides=8, cap=True, ovals=None):
    """A tapering tube through game-space points; radii per point; ovals: (sx, sz) per point in the ring's plane."""
    pts = [Vector(p) for p in pts]; rings = []
    up = Vector((0.13, 0.97, 0.2)).normalized()
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        a = t.cross(up)
        if a.length < 1e-4: a = t.cross(Vector((1, 0, 0)))
        a.normalize(); b = t.cross(a).normalized()
        sx, sz = ovals[i] if ovals else (1, 1); ring = []
        for k in range(sides):
            ang = k / sides * math.tau
            q = p + a * math.cos(ang) * radii[i] * sx + b * math.sin(ang) * radii[i] * sz
            ring.append(bm.verts.new(G(*q)))
        rings.append(ring)
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(sides):
            n = (k + 1) % sides
            bm.faces.new((r0[k], r0[n], r1[n], r1[k]))
    if cap:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])

def bent_spike(bm, base, tip, r, bend=(0, 0, 0), sides=4):
    base, tip, bend = Vector(base), Vector(tip), Vector(bend)
    mid = (base + tip) / 2 + bend
    tube(bm, [base, mid, tip], [r, r * 0.55, r * 0.05], sides=sides)

def blob(bm, centre, radius, scale=(1, 1, 1), subdiv=2):
    m = bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    for v in m['verts']:
        q = Vector((v.co.x * radius * scale[0], v.co.y * radius * scale[1], v.co.z * radius * scale[2]))
        v.co = G(centre[0] + q.x, centre[1] + q.y, centre[2] + q.z)

def box(bm, x0, x1, y0, y1, z0, z1):
    """An axis-aligned box in game space."""
    vs = [bm.verts.new(G(x, y, z)) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]
    f = lambda *i: bm.faces.new([vs[n] for n in i])
    f(0, 1, 3, 2); f(4, 6, 7, 5); f(0, 4, 5, 1); f(2, 3, 7, 6); f(0, 2, 6, 4); f(1, 5, 7, 3)

def organic(ob, voxel, keep, noise=0.0, seed=1):
    """Fuse overlapping shapes: voxel remesh, smooth, optional gnarl, decimate to `keep` triangles."""
    bpy.context.view_layer.objects.active = ob
    r = ob.modifiers.new('r', 'REMESH'); r.mode = 'VOXEL'; r.voxel_size = voxel; r.use_smooth_shade = True
    s = ob.modifiers.new('s', 'SMOOTH'); s.iterations = 6; s.factor = 0.6
    dg = bpy.context.evaluated_depsgraph_get(); ev = ob.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev); ob.modifiers.clear(); old = ob.data; ob.data = me; bpy.data.meshes.remove(old)
    if noise:
        rnd = random.Random(seed); k = [(rnd.uniform(5, 15), rnd.uniform(0, 6), rnd.uniform(0.4, 1)) for _ in range(5)]
        for v in me.vertices:
            n = sum(a * math.sin(f * (v.co.x * 1.7 + v.co.z * 0.6) + p) * math.sin(f * 0.8 * (v.co.y - v.co.z) + p * 2) for f, p, a in k) / 3
            v.co += v.normal * n * noise
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    if tris > keep:
        d = ob.modifiers.new('d', 'DECIMATE'); d.ratio = keep / tris
        dg = bpy.context.evaluated_depsgraph_get(); ev = ob.evaluated_get(dg)
        m2 = bpy.data.meshes.new_from_object(ev); ob.modifiers.clear(); ob.data = m2; bpy.data.meshes.remove(me)
    for p in ob.data.polygons: p.use_smooth = True
    return ob

def tinted(ob, name, rgb):
    import bkit
    bkit.assign(ob, bkit.material(name, rgb, 0.85, 0.0, 0.0))
