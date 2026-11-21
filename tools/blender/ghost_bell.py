# The Bell of Waking's ghost bell (design/abilities/bell-of-waking.md): a great cracked bronze bell, 8 m from the lip to
# the top of its crown and 7 m across the lip, the old tall shape: a heavy waist, a thick sound bow near the lip, a crown
# of six loops. Metres, +y up, origin at the centre of the lip circle (the mouth on y = 0), the crack on the +z side.
# The bell is a shell: an outer and an inner surface, both facing out of the wall, joined at the lip, open below.
#   bell:body__gold        the shell turned from one profile (sound bow, waist, shoulder, the flat crown), with plain
#                          raised bands round the lip and the shoulder, and the crown's six loops.
#   bell:marks__bronze     a band of sixteen raised abstract marks (blocks, diamonds, triangles) between the bands.
#   bell:crack__glow       the crack: a thin jagged strip just proud of the wall from the shoulder down past the waist,
#                          with chips off its edges.
#   bell:shard0__gold ..   the same bell pre-broken into 16 walled pieces, IN THE BELL'S FRAME (the game finds each
#   bell:shard15__gold     centre from its bounds): 0 the crown with its loops, 1-3 the shoulder ring in three, 4-15
#                          three rows of four down to the lip; the split lines step jaggedly across the turning grid.
# Slots: `gold` the ghost's translucent gold, `bronze` the dark bronze of the marks, `glow` the white-hot crack.
# Budget: at most 3,200 triangles for body + marks + crack, at most 2,400 for the sixteen shards.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib; importlib.reload(snow_lib)
from snow_lib import G, new_obj, tinted
import bpy, bmesh

COL = {'gold': (0.91, 0.77, 0.42), 'bronze': (0.23, 0.16, 0.07), 'glow': (1.0, 0.95, 0.86)}

def finish(name, slot, bm):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = new_obj(name, bm); tinted(ob, slot, COL[slot])
    for p in ob.data.polygons: p.use_smooth = False
    return ob

def add_hulls(bm, groups):
    for pts in groups:
        g = bmesh.new()
        vs = [g.verts.new(G(*p)) for p in pts]
        bmesh.ops.convex_hull(g, input=vs)
        loose = [v for v in g.verts if not v.link_faces]
        if loose: bmesh.ops.delete(g, geom=loose, context='VERTS')
        me = bpy.data.meshes.new('tmp'); g.to_mesh(me); g.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)

def lerp_tab(tab, y):
    if y <= tab[0][0]: return tab[0][1]
    for (y0, a), (y1, b) in zip(tab, tab[1:]):
        if y <= y1: return a + (b - a) * (y - y0) / (y1 - y0)
    return tab[-1][1]

# ---- the profile: outer radius by height, the wall's thickness by height ---------------------------------------------
TOP = 7.13   # the crown's flat top, on the axis
OUTER = [(0.0, 3.5), (0.2, 3.52), (0.55, 3.44), (1.0, 3.2), (1.6, 2.9), (2.4, 2.6), (3.3, 2.4), (4.3, 2.27), (5.3, 2.2),
         (6.1, 2.16), (6.45, 2.05), (6.8, 1.75), (7.0, 1.2), (7.1, 0.55), (TOP, 0.0)]
THICK = [(0.0, 0.2), (0.2, 0.42), (0.55, 0.48), (1.0, 0.36), (2.0, 0.26), (4.0, 0.22), (6.0, 0.24), (TOP, 0.3)]
BANDS = [(1.0, 1.3), (5.75, 6.05)]   # the raised bands round the lip and the shoulder: (from, to), 0.1 proud
BAND = 0.1

def row(y, off=0.0):
    """(outer y, outer r, inner y, inner r) at height y: the inner surface offset along the base profile's normal."""
    r = lerp_tab(OUTER, y); t = lerp_tab(THICK, y)
    if y >= TOP: return (TOP, 0.0, TOP - t, 0.0)
    e = 0.01; dr = (lerp_tab(OUTER, y + e) - lerp_tab(OUTER, max(y - e, 0.0))) / (y + e - max(y - e, 0.0))
    l = math.hypot(1.0, dr); nr, ny = 1.0 / l, -dr / l
    return (y, r + off, 0.0 if y == 0 else y - t * ny, max(r - t * nr, 0.0))

def rows_for(ys):
    out = []
    for y in ys:
        b = next(((a, z) for a, z in BANDS if a <= y <= z), None)
        if b and abs(y - b[0]) < 1e-6: out += [row(y), row(y + 0.02, BAND)]          # the band's lower step
        elif b and abs(y - b[1]) < 1e-6: out += [row(y - 0.02, BAND), row(y)]        # its upper step
        else: out.append(row(y))
    return out

def surface_r(y):
    """The outer wall's radius at y, bands included (for things laid on it)."""
    return lerp_tab(OUTER, y) + (BAND if any(a <= y <= b for a, b in BANDS) else 0.0)

def shell(bm, rows, n, cells):
    """The wall over the given (row, column) cells of the turned grid: outer and inner faces, and a wall face on every
    edge whose neighbour is not in the set (the lip, a split line). The top row sits on the axis."""
    cache = {}
    def V(side, k, j):
        yo, ro, yi, ri = rows[k]; y, r = (yo, ro) if side == 'o' else (yi, ri)
        if r < 1e-6: j = 0
        j %= n; key = (side, k, j)
        if key not in cache:
            a = j / n * math.pi * 2
            cache[key] = bm.verts.new(G(r * math.sin(a), y, r * math.cos(a)))
        return cache[key]
    def face(vs):
        out = []
        for v in vs:
            if not out or out[-1] is not v: out.append(v)
        if len(out) > 1 and out[0] is out[-1]: out.pop()
        if len(out) >= 3 and len(set(out)) == len(out):
            try: bm.faces.new(out)
            except ValueError: pass
    R = len(rows) - 1
    for (k, j) in cells:
        o = [V('o', k, j), V('o', k, j + 1), V('o', k + 1, j + 1), V('o', k + 1, j)]
        i = [V('i', k, j), V('i', k, j + 1), V('i', k + 1, j + 1), V('i', k + 1, j)]
        face(o); face(i[::-1])
        if k == 0 or (k - 1, j) not in cells: face([o[0], i[0], i[1], o[1]])
        if k + 1 < R and (k + 1, j) not in cells: face([o[3], o[2], i[2], i[3]])
        if (k, (j - 1) % n) not in cells: face([o[0], o[3], i[3], i[0]])
        if (k, (j + 1) % n) not in cells: face([o[1], i[1], i[2], o[2]])

def loop_tube(bm, phi, cr=0.6, cy=7.5, ar=0.24, ay=0.42, ha=0.08, hb=0.1, m=6):
    """One crown loop: a closed square-section ring standing in the radial plane at angle phi."""
    rho = (math.sin(phi), 0.0, math.cos(phi)); e = (math.cos(phi), 0.0, -math.sin(phi))
    rings = []
    for i in range(m):
        a = i / m * math.pi * 2 + math.pi / 2
        c = (rho[0] * (cr + ar * math.cos(a)), cy + ay * math.sin(a), rho[2] * (cr + ar * math.cos(a)))
        nx, ny = math.cos(a), math.sin(a)   # the ring's outward direction in its plane
        nv = (rho[0] * nx, ny, rho[2] * nx)
        rings.append([bm.verts.new(G(c[0] + nv[0] * sa * ha + e[0] * sb * hb, c[1] + nv[1] * sa * ha, c[2] + nv[2] * sa * ha + e[2] * sb * hb))
                      for sa, sb in ((1, 1), (1, -1), (-1, -1), (-1, 1))])
    for i in range(m):
        A, B = rings[i], rings[(i + 1) % m]
        for q in range(4): bm.faces.new([A[q], A[(q + 1) % 4], B[(q + 1) % 4], B[q]])

PHIS = [k / 6 * math.pi * 2 + math.pi / 6 for k in range(6)]
CROWN_PLATE = [(math.sin(a) * 0.95, y, math.cos(a) * 0.95) for a in [i / 12 * math.pi * 2 for i in range(12)] for y in (6.98, 7.2)]

# ---- the body -------------------------------------------------------------------------------------------------------
N = 24
YS = [0.0, 0.2, 0.55, 0.9, 1.0, 1.3, 1.8, 2.6, 3.4, 4.2, 5.0, 5.75, 6.05, 6.3, 6.6, 6.85, 7.02, 7.1, TOP]
ROWS = rows_for(YS)
bm = bmesh.new()
shell(bm, ROWS, N, {(k, j) for k in range(len(ROWS) - 1) for j in range(N)})
for phi in PHIS: loop_tube(bm, phi)
add_hulls(bm, [CROWN_PLATE])
finish('bell:body__gold', 'gold', bm)

# ---- the marks: sixteen raised shapes round the bell between the bands, clear of the crack --------------------------
def on_wall(theta, u, y, w):
    """A point on the outer wall at angle theta, u along the wall's turn, height y, w out of the surface."""
    r = surface_r(y) + w
    return (math.sin(theta) * r + math.cos(theta) * u, y, math.cos(theta) * r - math.sin(theta) * u)

MY = 5.12   # the marks' middle
SHAPES = [[(-0.16, -0.2), (0.16, -0.2), (0.16, 0.2), (-0.16, 0.2)],      # a block
          [(0, -0.26), (0.18, 0), (0, 0.26), (-0.18, 0)],                 # a diamond
          [(-0.2, -0.2), (0.2, -0.2), (0, 0.24)],                         # a triangle up
          [(-0.2, 0.2), (0.2, 0.2), (0, -0.24)]]                          # a triangle down
marks = []
for i in range(16):
    th = (i + 0.5) / 16 * math.pi * 2
    marks.append([on_wall(th, u, MY + v, w) for u, v in SHAPES[i % 4] for w in (-0.06, 0.07)])
bm = bmesh.new(); add_hulls(bm, marks); finish('bell:marks__bronze', 'bronze', bm)

# ---- the crack: a zigzag down the +z side from above the shoulder band to below the waist ----------------------------
CRACK = [(6.32, 0.0), (6.1, 0.05), (5.7, -0.03), (5.2, 0.06), (4.7, -0.04), (4.15, 0.05), (3.6, -0.05), (3.1, 0.03), (2.75, -0.01)]
crack = []
for s, ((ya, ta), (yb, tb)) in enumerate(zip(CRACK, CRACK[1:])):
    wa = 0.09 - s * 0.007; wb = 0.09 - (s + 1) * 0.007
    lift = BAND if any(a - 0.05 <= y <= b + 0.05 for y in (ya, yb) for a, b in BANDS) else 0.0   # over the band
    pts = []
    for y, t, w in ((ya, ta, wa), (yb, tb, wb)):
        r0 = lerp_tab(OUTER, y) + lift
        for d in (-0.05, 0.045):
            for u in (-w, w):
                rr = r0 + d
                pts.append((math.sin(t) * rr + math.cos(t) * u, y, math.cos(t) * rr - math.sin(t) * u))
    crack.append(pts)
    if 0 < s < 7:   # a chip off one edge at the joint
        side = 1 if s % 2 else -1; y, t = ya, ta; r0 = lerp_tab(OUTER, y) + lift
        crack.append([(math.sin(t) * (r0 + d) + math.cos(t) * u, y + dy, math.cos(t) * (r0 + d) - math.sin(t) * u)
                      for d in (-0.05, 0.04) for u, dy in ((side * wa * 0.5, 0.08), (side * wa * 0.5, -0.08), (side * (wa + 0.13), -0.02))])
bm = bmesh.new(); add_hulls(bm, crack); finish('bell:crack__glow', 'glow', bm)

# ---- the shards: the same wall on a coarser turn, cut into 16 along jagged lines ------------------------------------
NS = 18
SROWS = rows_for([0.0, 0.55, 1.0, 1.3, 2.0, 2.8, 3.6, 4.4, 5.2, 5.75, 6.05, 6.45, 6.85, 7.05, TOP])
def ybound(y):
    return min(range(len(SROWS)), key=lambda k: abs(SROWS[k][0] - y))
# The row splits (lip / lower / middle / shoulder ring / crown), each stepping up a row at some columns: a split never
# meets the next, so every piece keeps at least one row at every column and stays one connected piece.
SPLITS = [ybound(2.0), ybound(3.6), ybound(5.2), ybound(6.45)]
STEP = [[1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0],
        [0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0],
        [1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0],
        [0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1]]
pieces = {}
for k in range(len(SROWS) - 1):
    for j in range(NS):
        band = sum(k >= SPLITS[b] + STEP[b][j] for b in range(4))   # 0 the lip row .. 4 the crown
        if band == 4: pid = 0
        elif band == 3: pid = 1 + ((j + k % 2) * 3 // NS) % 3                   # the shoulder ring, in three
        else: pid = 4 + band * 4 + ((j + 2 + (k % 3 == 1)) * 4 // NS) % 4       # three rows of four
        pieces.setdefault(pid, set()).add((k, j))
assert len(pieces) == 16, sorted(pieces)
for pid in range(16):
    bm = bmesh.new()
    shell(bm, SROWS, NS, pieces[pid])
    if pid == 0:
        for phi in PHIS: loop_tube(bm, phi, m=4)
        add_hulls(bm, [CROWN_PLATE])
    finish(f'bell:shard{pid}__gold', 'gold', bm)

obs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('bell:')]
by = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs}
whole = sum(v for k, v in by.items() if 'shard' not in k)
result = {'pieces': len(obs), 'whole': whole, 'shards': sum(by.values()) - whole, 'by': by}
