# Town house pieces (pass 169, the Story levels redone in cel): the Burning Town's half-timbered streets repeated one
# house down every street (docs/story/audit.md). js/town.js builds each house's mass, framing and roof from its data;
# these are the pieces it hangs on some of them, so a row of houses breaks into different fronts and roofs: a bay
# window jutting from an upper storey on carved brackets, and a gabled dormer on the roof. Flat facets for the cel bands,
# every lip a clean silhouette for the ink. Built in a piece's own space, round where js/town.js places it:
#   oriel: x along the wall, y up from the bay's foot, z out from the wall face (z = 0 is the wall);
#   dormer: x along the roof's ridge, y up from where its front stands on the slope, z out and down the slope (the body
#   runs 2.6 m back into the roof, so it meets a slope of any pitch the houses use).
# Slots (js/town.js gives each house's palette): plaster, timber, roof, glass (lit, dark or on fire per house).
#   town-bits:oriel__plaster  oriel__timber  oriel__roof  oriel__glass
#   town-bits:dormer__plaster dormer__timber dormer__roof dormer__glass
# Budget: under 400 triangles for all eight.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib; importlib.reload(snow_lib)
from snow_lib import G, new_obj, tinted, box
import bmesh

def poly(bm, pts):
    bm.faces.new([bm.verts.new(G(*p)) for p in pts])

def prism(bm, outline, y0, y1):
    """A solid standing on a closed outline of (x, z) points, from y0 to y1, its sides facing out."""
    lo = [bm.verts.new(G(x, y0, z)) for (x, z) in outline]; hi = [bm.verts.new(G(x, y1, z)) for (x, z) in outline]
    n = len(outline)
    for k in range(n):
        m = (k + 1) % n; bm.faces.new((lo[k], lo[m], hi[m], hi[k]))
    bm.faces.new(list(reversed(lo))); bm.faces.new(hi)

def loft(bm, a, ya, b, yb):
    """A solid between two closed outlines of the same count at two heights (the bay's tapering brackets)."""
    la = [bm.verts.new(G(x, ya, z)) for (x, z) in a]; lb = [bm.verts.new(G(x, yb, z)) for (x, z) in b]
    n = len(a)
    for k in range(n):
        m = (k + 1) % n; bm.faces.new((la[k], la[m], lb[m], lb[k]))
    bm.faces.new(list(reversed(la))); bm.faces.new(lb)

def finish(name, bm, slot, rgb, solid=True):
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    if solid: bmesh.ops.recalc_face_normals(bm, faces=bm.faces)   # loose panes keep the way they were wound (out)
    ob = new_obj(name, bm); tinted(ob, slot, rgb)
    for p in ob.data.polygons: p.use_smooth = False
    return ob

def grow(outline, d):
    """The bay's outline pushed out by d on its three open sides (the wall side stays on the wall)."""
    (x0, z0), (x1, z1), (x2, z2), (x3, z3) = outline
    return [(x0 - d, z0), (x1 - d * 0.6, z1 + d), (x2 + d * 0.6, z2 + d), (x3 + d, z3)]

def face_quad(p0, p1, y0, y1, inset, off):
    """A quad on the bay face from p0 to p1 (x, z), between y0 and y1, `inset` in from its ends, `off` out from it."""
    (ax, az), (bx, bz) = p0, p1
    L = math.hypot(bx - ax, bz - az); ux, uz = (bx - ax) / L, (bz - az) / L; nx, nz = -uz, ux   # out of the bay
    s, e = (ax + ux * inset + nx * off, az + uz * inset + nz * off), (bx - ux * inset + nx * off, bz - uz * inset + nz * off)
    return [(s[0], y0, s[1]), (e[0], y0, e[1]), (e[0], y1, e[1]), (s[0], y1, s[1])]

# ---- the oriel: a three-sided bay on an upper storey ---------------------------------------------------------------
# Its outline at the floor runs from the wall at x -0.95 out to the front (z 0.7) and back to the wall at x 0.95.
BAY = [(-0.95, 0.0), (-0.62, 0.7), (0.62, 0.7), (0.95, 0.0)]
FACES = [(BAY[0], BAY[1]), (BAY[1], BAY[2]), (BAY[2], BAY[3])]

bm = bmesh.new()   # the plaster body between the floor and the cornice
prism(bm, [(x, z) for (x, z) in BAY], 0.56, 2.26)
finish('town-bits:oriel__plaster', bm, 'plaster', (0.78, 0.7, 0.56))

bm = bmesh.new()   # timber: the tapering brackets under it, the floor plate, the cornice, the corner posts, sills and heads
loft(bm, [(-0.32, 0.0), (-0.18, 0.14), (0.18, 0.14), (0.32, 0.0)], -0.55, [(x, z) for (x, z) in grow(BAY, 0.02)], 0.44)
prism(bm, grow(BAY, 0.06), 0.44, 0.56)
prism(bm, grow(BAY, 0.08), 2.26, 2.4)
for (px, pz) in (BAY[1], BAY[2]):
    box(bm, px - 0.07, px + 0.07, 0.56, 2.26, pz - 0.07, pz + 0.07)
for (p0, p1) in FACES:   # a sill under each window and a head over it, standing proud of the plaster
    for (y0, y1) in ((0.98, 1.08), (1.98, 2.06)):
        poly(bm, face_quad(p0, p1, y0, y1, 0.08, 0.035))
finish('town-bits:oriel__timber', bm, 'timber', (0.23, 0.16, 0.11), solid=False)

bm = bmesh.new()   # the roof: a half hip from the cornice up to the wall
R = grow(BAY, 0.16); ridge = [(-0.6, 0.0), (0.6, 0.0)]
v = [bm.verts.new(G(x, 2.4, z)) for (x, z) in R]
r0, r1 = bm.verts.new(G(-0.6, 3.05, 0.0)), bm.verts.new(G(0.6, 3.05, 0.0))
bm.faces.new((v[0], v[1], r0)); bm.faces.new((v[1], v[2], r1, r0)); bm.faces.new((v[2], v[3], r1))
bm.faces.new((v[3], r1, r0, v[0])); bm.faces.new((v[3], v[2], v[1], v[0]))
finish('town-bits:oriel__roof', bm, 'roof', (0.42, 0.22, 0.16))

bm = bmesh.new()   # the leaded glass: one pane on each face, a hair out from the plaster
for (p0, p1) in FACES:
    poly(bm, face_quad(p0, p1, 1.08, 1.98, 0.14 if p0 == BAY[1] else 0.1, 0.02))
finish('town-bits:oriel__glass', bm, 'glass', (0.1, 0.08, 0.07), solid=False)

# ---- the dormer: a gabled window on the roof ----------------------------------------------------------------------
bm = bmesh.new()   # the front with its gable, and the cheeks running back into the roof
D = -2.6
prism(bm, [(-0.72, 0.0), (-0.72, D), (0.72, D), (0.72, 0.0)], -0.3, 1.25)
v = [bm.verts.new(G(-0.72, 1.25, 0.0)), bm.verts.new(G(0.72, 1.25, 0.0)), bm.verts.new(G(0.0, 1.9, 0.0)),
     bm.verts.new(G(-0.72, 1.25, D)), bm.verts.new(G(0.72, 1.25, D)), bm.verts.new(G(0.0, 1.9, D))]
bm.faces.new((v[0], v[1], v[2])); bm.faces.new((v[4], v[3], v[5]))
finish('town-bits:dormer__plaster', bm, 'plaster', (0.78, 0.7, 0.56))

bm = bmesh.new()   # timber: the window's frame and sill, the ridge beam
box(bm, -0.5, 0.5, 0.12, 0.22, 0.0, 0.12)        # sill
box(bm, -0.5, 0.5, 1.02, 1.1, 0.0, 0.06)         # head
for s in (-1, 1):
    box(bm, s * 0.5 - 0.05, s * 0.5 + 0.05, 0.22, 1.02, 0.0, 0.06)   # jambs
box(bm, -0.06, 0.06, 1.94, 2.06, D, 0.3)          # ridge beam
finish('town-bits:dormer__timber', bm, 'timber', (0.23, 0.16, 0.11))

bm = bmesh.new()   # the little gable roof, overhanging the front
for s in (-1, 1):
    a = [bm.verts.new(G(0.0, 1.98, 0.3)), bm.verts.new(G(s * 0.95, 1.12, 0.3)), bm.verts.new(G(s * 0.95, 1.12, D)), bm.verts.new(G(0.0, 1.98, D))]
    b = [bm.verts.new(G(0.0, 2.06, 0.3)), bm.verts.new(G(s * 0.98, 1.2, 0.3)), bm.verts.new(G(s * 0.98, 1.2, D)), bm.verts.new(G(0.0, 2.06, D))]
    bm.faces.new(a[::-1] if s > 0 else a); bm.faces.new(b if s > 0 else b[::-1])
    for k in range(4):
        m = (k + 1) % 4; bm.faces.new((a[k], a[m], b[m], b[k]) if s < 0 else (a[m], a[k], b[k], b[m]))
finish('town-bits:dormer__roof', bm, 'roof', (0.42, 0.22, 0.16))

bm = bmesh.new()   # the glass
poly(bm, [(-0.45, 0.22, 0.03), (0.45, 0.22, 0.03), (0.45, 1.02, 0.03), (-0.45, 1.02, 0.03)])
finish('town-bits:dormer__glass', bm, 'glass', (0.1, 0.08, 0.07), solid=False)

import bpy
obs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('town-bits:')]
by = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs}
result = {'pieces': len(obs), 'tris': sum(by.values()), 'by': by}
