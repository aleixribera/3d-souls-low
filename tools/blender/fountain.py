# The town fountain (pass 167, the Story levels redone in cel): Aurel's fountain court and the Burning Town's square had
# a fountain of eight-sided cylinders (js/town.js). This is the fountain for both, cut for the cel bands and ink: an
# eight-sided basin with a stepped plinth and an overhanging coping, a turned pedestal carrying a broad bowl and a small
# one, a finial on top; flat facets that each take one band, every lip a clean silhouette the ink draws. Modelled in game
# space (x, y up, z), round the prop's own base centre; js/town.js PROP_LOOKS places it (drawing only: the collision is
# PROP_KINDS.fountain's boxes, a 4.4 m basin 0.85 m high and a 0.9 m column, which it fills).
#   fountain:basin__stone     the basin, its plinth step and coping, its floor under the water
#   fountain:column__stone    the pedestal, the two bowls and the shaft between them
#   fountain:trim__gilt       the finial and the bands at each bowl's lip and the shaft's knop (gilt in Aurel, bronze elsewhere)
#   fountain:water__water     the three still pools: the basin's, each bowl's
# Budget: under 1,600 triangles for the four (1,584).
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib; importlib.reload(snow_lib)
from snow_lib import G, new_obj, tinted
import bmesh

def lathe(bm, profile, sides, phase=0.0):
    """A solid of revolution round the y axis through a (radius, y) profile; a radius of 0 is a single point (a cap)."""
    rings = []
    for (r, y) in profile:
        if r <= 1e-6: rings.append([bm.verts.new(G(0, y, 0))])
        else: rings.append([bm.verts.new(G(r * math.cos(phase + k / sides * math.tau), y, r * math.sin(phase + k / sides * math.tau))) for k in range(sides)])
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1 and len(b) == 1: continue
        for k in range(sides):
            n = (k + 1) % sides
            if len(a) == 1: bm.faces.new((a[0], b[n], b[k]))
            elif len(b) == 1: bm.faces.new((a[k], a[n], b[0]))
            else: bm.faces.new((a[k], a[n], b[n], b[k]))

def finish(name, bm, slot, rgb):
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = new_obj(name, bm); tinted(ob, slot, rgb)
    for p in ob.data.polygons: p.use_smooth = False
    return ob

OCT = math.pi / 8   # the basin's flats face the four ways the level runs

bm = bmesh.new()   # the basin: plinth step, wall, coping (overhanging both ways), the floor under the water
lathe(bm, [(0, 0.0), (2.32, 0.0), (2.32, 0.12), (2.16, 0.14), (2.16, 0.72), (2.28, 0.74), (2.3, 0.88), (1.96, 0.88), (1.94, 0.8),
           (1.9, 0.56), (0, 0.56)], 8, OCT)
finish('fountain:basin__stone', bm, 'stone', (0.62, 0.58, 0.5))

bm = bmesh.new()   # the pedestal, the broad bowl, the shaft, the small bowl
lathe(bm, [(0, 0.56), (0.56, 0.56), (0.56, 0.8), (0.42, 0.88), (0.3, 0.96), (0.27, 1.56), (0.25, 1.66), (0.25, 1.82),
           (0.36, 1.86), (0.9, 1.98), (1.28, 2.1), (1.3, 2.2), (1.14, 2.2), (1.1, 2.12), (0.6, 2.06), (0.2, 2.06), (0.18, 2.12),
           (0.16, 2.58), (0.26, 2.64), (0.6, 2.74), (0.64, 2.84), (0.52, 2.84), (0.48, 2.78), (0.13, 2.76), (0.12, 3.05), (0, 3.05)], 16, OCT / 2)
finish('fountain:column__stone', bm, 'stone', (0.62, 0.58, 0.5))

bm = bmesh.new()   # gilt: the knop on the shaft, each bowl's lip band, the finial
lathe(bm, [(0, 1.6), (0.33, 1.6), (0.36, 1.66), (0.33, 1.74), (0, 1.74)], 16, OCT / 2)
lathe(bm, [(1.29, 2.1), (1.34, 2.12), (1.35, 2.2), (1.3, 2.22), (1.29, 2.1)], 16, OCT / 2)
lathe(bm, [(0.63, 2.78), (0.67, 2.79), (0.67, 2.85), (0.63, 2.86), (0.63, 2.78)], 16, OCT / 2)
lathe(bm, [(0, 3.05), (0.18, 3.05), (0.2, 3.12), (0.12, 3.2), (0.17, 3.34), (0.1, 3.48), (0.04, 3.62), (0, 3.7)], 8, OCT)
finish('fountain:trim__gilt', bm, 'gilt', (0.85, 0.66, 0.25))

bm = bmesh.new()   # the still water: the basin's pool and each bowl's
lathe(bm, [(0, 0.74), (1.93, 0.74), (1.93, 0.73), (0, 0.73)], 8, OCT)
lathe(bm, [(0.18, 2.14), (1.12, 2.14), (1.12, 2.13), (0.18, 2.13)], 16, OCT / 2)
lathe(bm, [(0.13, 2.8), (0.5, 2.8), (0.5, 2.79), (0.13, 2.79)], 16, OCT / 2)
finish('fountain:water__water', bm, 'water', (0.12, 0.2, 0.24))

import bpy
obs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('fountain:')]
by = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs}
result = {'pieces': len(obs), 'tris': sum(by.values()), 'by': by}
