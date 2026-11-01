# The church of Level 6, inside and out, in level coordinates (x east, y up, z north). Objects are named church__<slot>.
# Collision comes from js/levels/the-church.js, so these numbers must agree with its rooms:
#   porch [118, 124, -3, 3], nave [124, 166, -13, 13], sanctuary [166, 170, -3, 3], floor y 6, nave height 13,
#   pillar blocks 3 m square at x 133 / 153, z +-7.5. The pews stand in the 1.6 m margin outside the nave's collision.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib; importlib.reload(snow_lib)
from snow_lib import *
import bpy, bmesh
rnd = random.Random(11)
Y = 6.0
COL = {'logs': (.30, .20, .13), 'shingle': (.17, .13, .11), 'oak': (.14, .09, .06), 'plank': (.20, .13, .09), 'icons': (.6, .4, .2),
       'gilt': (.72, .52, .2), 'iron': (.08, .08, .09), 'daylight': (1, 1, 1), 'snow': (.92, .94, .97), 'stone': (.4, .4, .42)}
bms = {k: bmesh.new() for k in COL}
uvs = {}   # the painted quads: face vertices -> atlas uv, written after the mesh exists

def quad(bm, a, b, c, d, out=None):
    vs = [bm.verts.new(G(*p)) for p in (a, b, c, d)]
    f = bm.faces.new(vs)
    if out is not None: facing(f, out)
    return f
def facing(f, out):
    """Turn a face toward the game-space direction `out`."""
    f.normal_update()
    if f.normal.dot(G(*out)) < 0: f.normal_flip()
def painted(a, b, c, d, cell):
    """A quad a-b-c-d (bottom left, bottom right, top right, top left, seen from inside) showing atlas cell (u0, v0, u1, v1)."""
    f = quad(bms['icons'], a, b, c, d); f.smooth = False
    u0, v0, u1, v1 = cell
    uvs.setdefault(len(bms['icons'].faces) - 1, ((u0, v0), (u1, v0), (u1, v1), (u0, v1)))
# Atlas (js/baked/snow-church's icons, tools/icons-atlas.html): 6 x 2 cells of 256 x 512; the last two of row 2 are the
# carpet and the ceiling.
ATLAS = lambda col, row: (col / 6, 1 - (row + 1) / 2, (col + 1) / 6, 1 - row / 2)
SAINTS = [ATLAS(c, r) for r in (0, 1) for c in range(6) if not (r == 1 and c >= 4)]

def logs(a, b, y0, y1, out, pitch=.46, bulge=.11):
    """A wall of stacked logs from a to b (x, z); `out`: the unit (x, z) direction it faces."""
    bm = bms['logs']; y = y0; n = 0
    while y < y1 - 1e-3:
        h = min(pitch, y1 - y); ox, oz = out[0] * bulge, out[1] * bulge
        A, B = (a[0], a[1]), (b[0], b[1])
        ring = [(0, 0), (.3, 1), (.7, 1), (1, 0)]
        for (t0, k0), (t1, k1) in zip(ring, ring[1:]):
            quad(bm, (A[0] + ox * k0, y + h * t0, A[1] + oz * k0), (B[0] + ox * k0, y + h * t0, B[1] + oz * k0),
                 (B[0] + ox * k1, y + h * t1, B[1] + oz * k1), (A[0] + ox * k1, y + h * t1, A[1] + oz * k1), (out[0], 0, out[1]))
        y += h; n += 1

def shingled(p0, p1, p2, p3, rows, slot='shingle', lift=.09):
    """A roof slope p0-p1 (eave) to p3-p2 (ridge), in overlapping rows; each row's lower lip stands proud."""
    bm = bms[slot]; p0, p1, p2, p3 = map(Vector, (p0, p1, p2, p3))
    n = (p1 - p0).cross(p3 - p0).normalized()
    if n.y < 0: n = -n
    for i in range(rows):
        t0, t1 = i / rows, (i + 1) / rows
        a, b, c, d = p0.lerp(p3, t0), p1.lerp(p2, t0), p1.lerp(p2, t1), p0.lerp(p3, t1)
        quad(bm, a + n * lift, b + n * lift, c, d, tuple(n))
        quad(bm, a, b, b + n * lift, a + n * lift, tuple(p0 - p3))

def snowcap(p0, p1, p2, p3, start=.25, thick=.2, teeth=26):
    """Snow lying on a slope from `start` up to the ridge, its lower edge broken into tongues."""
    bm = bms['snow']; p0, p1, p2, p3 = map(Vector, (p0, p1, p2, p3))
    n = (p1 - p0).cross(p3 - p0).normalized()
    if n.y < 0: n = -n
    low = []; top = []
    for i in range(teeth + 1):
        s = i / teeth; e0, e1 = p0.lerp(p1, s), p3.lerp(p2, s)
        low.append(bm.verts.new(G(*(e0.lerp(e1, start + rnd.uniform(-.14, .14)) + n * .1))))
        top.append(bm.verts.new(G(*(e0.lerp(e1, .985) + n * thick))))
    mid = [bm.verts.new(G(*(p0.lerp(p1, i / teeth).lerp(p3.lerp(p2, i / teeth), start + .22 + rnd.uniform(-.05, .05)) + n * thick))) for i in range(teeth + 1)]
    for i in range(teeth):
        facing(bm.faces.new((low[i], low[i + 1], mid[i + 1], mid[i])), tuple(n)); facing(bm.faces.new((mid[i], mid[i + 1], top[i + 1], top[i])), tuple(n))

def ring_tube(bm, c, r, thick, sides=6, seg=20, flatY=True):
    pts = [(c[0] + math.cos(i / seg * math.tau) * r, c[1], c[2] + math.sin(i / seg * math.tau) * r) for i in range(seg + 1)]
    tube(bm, pts, [thick] * (seg + 1), sides, cap=False)

def onion(cx, cz, y, s):
    """A shingled onion dome and an iron cross."""
    prof = [(.34, 0), (.34, .5), (.62, .72), (.72, 1.05), (.5, 1.5), (.2, 1.85), (.06, 2.25), (.04, 2.5)]
    tube(bms['shingle'], [(cx, y + h * s, cz) for r, h in prof], [r * s for r, h in prof], 10)
    tube(bms['snow'], [(cx, y + h * s + .06, cz) for r, h in prof[2:5]], [(r + .06) * s for r, h in prof[2:5]], 10, cap=False)
    cross(cx, y + 2.5 * s, cz, s)

def cross(x, y, z, s):
    b = bms['iron']
    box(b, x - .05 * s, x + .05 * s, y, y + 1.5 * s, z - .05 * s, z + .05 * s)
    box(b, x - .05 * s, x + .05 * s, y + .85 * s, y + .97 * s, z - .42 * s, z + .42 * s)
    box(b, x - .05 * s, x + .05 * s, y + 1.2 * s, y + 1.28 * s, z - .25 * s, z + .25 * s)

# ---- outside ---------------------------------------------------------------------------------------------------------
NW = 15.6      # the nave's outer half width
EAVE, RIDGE = Y + 13.6, Y + 22.5
logs((172, NW), (128, NW), 4, EAVE, (0, 1)); logs((128, -NW), (172, -NW), 4, EAVE, (0, -1))
logs((172, -NW), (172, NW), 4, EAVE, (1, 0))
logs((128, NW), (128, 6.2), 4, EAVE, (-1, 0)); logs((128, -6.2), (128, -NW), 4, EAVE, (-1, 0))
for s in (-1, 1):       # the nave's two slopes
    a, b = (172 + 1.4, EAVE - .5, s * (NW + 1.5)), (120.6, EAVE - .5, s * (NW + 1.5))
    c, d = (120.6, RIDGE, 0), (173.4, RIDGE, 0)
    if s > 0: shingled(b, a, d, c, 24); snowcap(b, a, d, c)
    else: shingled(a, b, c, d, 24); snowcap(a, b, c, d)
for xw in (173.4, 120.6):   # the gable ends, in vertical boards
    w = bms['logs']; bx = xw - (.2 if xw > 150 else -.2)
    vs = [bm for bm in ()]
    for i in range(18):
        z0, z1 = -NW + i * 2 * NW / 18, -NW + (i + 1) * 2 * NW / 18
        h0, h1 = EAVE - .5 + (1 - abs(z0) / NW) * (RIDGE - EAVE), EAVE - .5 + (1 - abs(z1) / NW) * (RIDGE - EAVE)
        quad(w, (bx, EAVE - .5, z0), (bx, EAVE - .5, z1), (bx, h1, z1), (bx, h0, z0), (1 if xw > 150 else -1, 0, 0))
    if xw > 150: pass
# The apse at the east end, lower and narrower, with its own little tower.
logs((184, 9), (172, 9), 4, Y + 8, (0, 1)); logs((172, -9), (184, -9), 4, Y + 8, (0, -1)); logs((184, -9), (184, 9), 4, Y + 8, (1, 0))
for s in (-1, 1):
    a, b = (185, Y + 7.6, s * 10), (171, Y + 7.6, s * 10); c, d = (171, Y + 13.5, 0), (185, Y + 13.5, 0)
    if s > 0: shingled(b, a, d, c, 14); snowcap(b, a, d, c, teeth=14)
    else: shingled(a, b, c, d, 14); snowcap(a, b, c, d, teeth=14)
onion(180, 0, Y + 13.2, 1.5); onion(166, 0, RIDGE - .6, 1.7); onion(146, 0, RIDGE - .6, 1.3)
# The bell tower over the door: log walls, a skirt roof, an open belfry, a steep spire.
TX0, TX1, TZ = 118, 128, 6.2
logs((TX0, -TZ), (TX0, -3.2), Y - 2, Y + 20, (-1, 0)); logs((TX0, 3.2), (TX0, TZ), Y - 2, Y + 20, (-1, 0))
logs((TX0, -3.2), (TX0, 3.2), Y + 5.2, Y + 20, (-1, 0))
logs((TX1, TZ), (TX0, TZ), Y - 2, Y + 20, (0, 1)); logs((TX0, -TZ), (TX1, -TZ), Y - 2, Y + 20, (0, -1))
def pyramid(x0, x1, z0, z1, y0, x0b, x1b, z0b, z1b, y1, rows, cap=True):
    corners = [((x0, y0, z1), (x0, y0, z0), (x0b, y1, z0b), (x0b, y1, z1b)), ((x0, y0, z0), (x1, y0, z0), (x1b, y1, z0b), (x0b, y1, z0b)),
               ((x1, y0, z0), (x1, y0, z1), (x1b, y1, z1b), (x1b, y1, z0b)), ((x1, y0, z1), (x0, y0, z1), (x0b, y1, z1b), (x1b, y1, z1b))]
    for p in corners:
        shingled(*p, rows)
        if cap: snowcap(*p, start=.1, teeth=10)
pyramid(TX0 - 2.6, TX1 + 2.6, -TZ - 2.6, TZ + 2.6, Y + 11.2, TX0 - .1, TX1 + .1, -TZ - .1, TZ + .1, Y + 14.6, 10)   # the skirt
pyramid(TX0 - 1.6, TX1 + 1.6, -TZ - 1.6, TZ + 1.6, Y + 19.4, TX0 + 1.4, TX1 - 1.4, -TZ + 1.4, TZ - 1.4, Y + 21.4, 7)
BX0, BX1, BZ = TX0 + 1.5, TX1 - 1.5, TZ - 1.5
for (x, z) in [(BX0, -BZ), (BX0, BZ), (BX1, -BZ), (BX1, BZ), (BX0, 0), (BX1, 0), (123, -BZ), (123, BZ)]:
    box(bms['oak'], x - .24, x + .24, Y + 21, Y + 25.4, z - .24, z + .24)   # the open belfry's posts
box(bms['oak'], BX0, BX1, Y + 20.6, Y + 21, -BZ, BZ); box(bms['oak'], BX0 - .2, BX1 + .2, Y + 25.3, Y + 25.6, -BZ - .2, BZ + .2)
pyramid(BX0 - 1.0, BX1 + 1.0, -BZ - 1.0, BZ + 1.0, Y + 25.2, 122.85, 123.15, -.15, .15, Y + 36, 26)
cross(123, Y + 35.8, 0, 2.0)
# The doorway: a heavy timber frame, a lintel carved with gilt, dark inside.
box(bms['oak'], 117.5, 118.6, Y, Y + 5.2, -3.7, -3); box(bms['oak'], 117.5, 118.6, Y, Y + 5.2, 3, 3.7)
box(bms['oak'], 117.3, 118.6, Y + 5.0, Y + 5.8, -4.1, 4.1); box(bms['gilt'], 117.2, 117.32, Y + 5.2, Y + 5.6, -2.6, 2.6)
# Porch walls and ceiling (seen on the way in).
for s in (-1, 1): logs((124, s * 3), (118, s * 3), Y, Y + 5.4, (0, -s), bulge=.06)
box(bms['oak'], 118, 124, Y + 5.3, Y + 5.6, -3.2, 3.2)
box(bms['plank'], 118, 124, Y - .3, Y + .01, -3.2, 3.2)

# ---- inside: the nave ------------------------------------------------------------------------------------------------
IW, TOP = 14.6, Y + 13     # the inner face of the side walls; the ceiling
box(bms['plank'], 123.8, 166.2, Y - .3, Y + .012, -IW, IW)
for i in range(29):        # floorboards' seams
    z = -IW + i * 2 * IW / 28
    box(bms['oak'], 123.8, 166.2, Y + .012, Y + .02, z - .018, z + .018)
# The runner up the aisle.
RW = 2.0
n = 7
for i in range(n):
    x0, x1 = 124 + i * 40 / n, 124 + (i + 1) * 40 / n
    painted((x0, Y + .03, -RW), (x0, Y + .03, RW), (x1, Y + .03, RW), (x1, Y + .03, -RW), ATLAS(4, 1))
# Long walls: a dark wainscot, then painted saints and slit windows between studs, then a frieze.
step = 3.5
for s in (-1, 1):
    z = s * IW
    box(bms['oak'], 123.8, 166.2, Y, Y + 2.9, z - (.14 if s > 0 else -.14) * 0 - .14, z + .14)
    box(bms['oak'], 123.8, 166.2, Y + 10.2, TOP, z - .14, z + .14)
    box(bms['gilt'], 123.8, 166.2, Y + 2.86, Y + 2.96, z - .18, z + .18)
    box(bms['gilt'], 123.8, 166.2, Y + 10.14, Y + 10.24, z - .18, z + .18)
    for i in range(12):
        x0, x1 = 124 + i * step, 124 + (i + 1) * step
        if i % 3 == 1:     # a slit of daylight, set in dark boards
            box(bms['oak'], x0, x1, Y + 2.9, Y + 10.2, z + s * .02, z + s * .16)
            box(bms['daylight'], (x0 + x1) / 2 - .34, (x0 + x1) / 2 + .34, Y + 5.2, Y + 9.6, z - s * .03 - .02, z - s * .03 + .02)
            box(bms['gilt'], (x0 + x1) / 2 - .46, (x0 + x1) / 2 + .46, Y + 5.08, Y + 5.2, z - s * .1, z + s * .06) if False else None
        else:
            cell = rnd.choice(SAINTS); zz = z - s * .02
            if s > 0: painted((x1, Y + 2.9, zz), (x0, Y + 2.9, zz), (x0, Y + 10.2, zz), (x1, Y + 10.2, zz), cell)
            else: painted((x0, Y + 2.9, zz), (x1, Y + 2.9, zz), (x1, Y + 10.2, zz), (x0, Y + 10.2, zz), cell)
        box(bms['oak'], x0 - .17, x0 + .17, Y + 2.9, Y + 10.2, z - s * .2 - .1, z - s * .2 + .1)   # the studs
# West wall (behind the door), the ceiling and its beams.
for z0, z1 in ((-IW, -3.2), (3.2, IW)):
    box(bms['oak'], 123.7, 124, Y, TOP, z0, z1)
box(bms['oak'], 123.7, 124, Y + 5.4, TOP, -3.2, 3.2)
for i in range(12):
    x0, x1 = 124 + i * step, 124 + (i + 1) * step
    painted((x0, TOP, IW), (x0, TOP, -IW), (x1, TOP, -IW), (x1, TOP, IW), ATLAS(5, 1))
    box(bms['oak'], x0 - .22, x0 + .22, TOP - .6, TOP, -IW, IW)
for z in (-7.5, 7.5): box(bms['oak'], 123.8, 166.2, TOP - .5, TOP, z - .25, z + .25)
# The four great pillars: plinth, carved shaft with gilt inlay, capital. (x, z) +- 1.5 is their collision.
for px in (133, 153):
    for pz in (-7.5, 7.5):
        o = bms['oak']
        box(o, px - 1.5, px + 1.5, Y, Y + 1.2, pz - 1.5, pz + 1.5); box(o, px - 1.3, px + 1.3, Y + 1.2, Y + 1.6, pz - 1.3, pz + 1.3)
        box(o, px - 1.05, px + 1.05, Y + 1.6, TOP - 1.6, pz - 1.05, pz + 1.05)
        box(o, px - 1.3, px + 1.3, TOP - 1.6, TOP - 1.2, pz - 1.3, pz + 1.3); box(o, px - 1.5, px + 1.5, TOP - 1.2, TOP, pz - 1.5, pz + 1.5)
        for k in range(5):     # carved bands
            y = Y + 2.4 + k * 1.7
            box(o, px - 1.14, px + 1.14, y, y + .28, pz - 1.14, pz + 1.14)
            box(bms['gilt'], px - 1.17, px + 1.17, y + .1, y + .18, pz - 1.17, pz + 1.17)
        for (dx, dz) in ((-1.07, 0), (1.07, 0), (0, -1.07), (0, 1.07)):   # a long gilt fillet down each face
            box(bms['gilt'], px + dx - (.03 if dx else .22), px + dx + (.03 if dx else .22), Y + 1.7, TOP - 1.7, pz + dz - (.03 if dz else .22), pz + dz + (.03 if dz else .22))
# Pews against the walls, in the margin behind the nave's collision.
for s in (-1, 1):
    for x in range(127, 164, 5):
        o = bms['oak']
        box(o, x, x + 4.3, Y, Y + .55, s * 13.15 - .5, s * 13.15 + .5) if False else None
        z0, z1 = sorted((s * 13.1, s * 14.1))
        box(o, x, x + 4.3, Y + .5, Y + .62, z0, z1); box(o, x, x + 4.3, Y, Y + .5, z0 + .1, z1 - .1)
        bz0, bz1 = sorted((s * 14.1, s * 14.3))
        box(o, x, x + 4.3, Y, Y + 2.05, bz0, bz1)
        for ex in (x - .06, x + 4.3 - .06):
            box(o, ex, ex + .12, Y, Y + 2.3, z0, bz1 if s > 0 else z1)
            box(bms['gilt'], ex + .02, ex + .1, Y + 2.3, Y + 2.46, min(z0, bz0) + .4, min(z0, bz0) + .6)

# ---- the icon wall (x 166): three tiers of saints round the royal door --------------------------------------------------
IX = 165.95
o = bms['oak']; g = bms['gilt']
for z0, z1 in ((-IW, -3.2), (3.2, IW)):
    box(o, IX, IX + .3, Y, TOP, z0, z1)
box(o, IX, IX + .3, Y + 5.2, TOP, -3.2, 3.2)
box(g, IX - .16, IX + .05, Y, Y + 5.6, -3.6, -3.1); box(g, IX - .16, IX + .05, Y, Y + 5.6, 3.1, 3.6); box(g, IX - .16, IX + .05, Y + 5.2, Y + 5.6, -3.6, 3.6)
tiers = [(Y + 1.3, Y + 5.0, 2.45), (Y + 5.5, Y + 8.1, 1.75), (Y + 8.6, Y + 11.0, 1.75)]
for y0, y1, w in tiers:
    count = int((IW * 2) // (w + .16)); start = -count * (w + .16) / 2
    for i in range(count):
        z0 = start + i * (w + .16); z1 = z0 + w
        if y0 < Y + 5 and z1 > -3.7 and z0 < 3.7: continue
        painted((IX - .02, y0, z0), (IX - .02, y0, z1), (IX - .02, y1, z1), (IX - .02, y1, z0), rnd.choice(SAINTS))
        box(g, IX - .1, IX, y0 - .08, y0, z0 - .06, z1 + .06); box(g, IX - .1, IX, y1, y1 + .08, z0 - .06, z1 + .06)
        box(g, IX - .1, IX, y0, y1, z0 - .08, z0); box(g, IX - .1, IX, y0, y1, z1, z1 + .08)
        # a little gilt arch over each panel
        tube(g, [(IX - .06, y1 + .02, z0 + .05), (IX - .06, y1 + .34, (z0 + z1) / 2), (IX - .06, y1 + .02, z1 - .05)], [.05, .06, .05], 5)
    box(o, IX - .08, IX, y0 - .38, y0 - .08, -IW, -3.7 if y0 < Y + 5 else IW)
    if y0 < Y + 5: box(o, IX - .08, IX, y0 - .38, y0 - .08, 3.7, IW)
box(g, IX - .14, IX, Y + 11.5, Y + 11.75, -IW, IW); box(o, IX - .08, IX, Y, Y + .9, -IW, -3.7); box(o, IX - .08, IX, Y, Y + .9, 3.7, IW)
box(g, IX - .1, IX, Y + .9, Y + 1.0, -IW, -3.7); box(g, IX - .1, IX, Y + .9, Y + 1.0, 3.7, IW)
cross(IX - .1, Y + 11.6, 0, .85)
# The sanctuary behind: its floor and back wall.
box(bms['plank'], 166, 172, Y - .3, Y + .012, -3.6, 3.6)
for s in (-1, 1): box(o, 166.2, 171, Y, Y + 5.6, s * 3.2 - .15, s * 3.2 + .15)
box(o, 170.2, 170.5, Y, Y + 5.6, -3.4, 3.4); box(o, 166.2, 170.5, Y + 5.2, Y + 5.5, -3.4, 3.4)
painted((170.15, Y + .6, -2.6), (170.15, Y + .6, 2.6), (170.15, Y + 5, 2.6), (170.15, Y + 5, -2.6), ATLAS(0, 0))

# ---- candle stands, the chandelier -------------------------------------------------------------------------------------
STANDS = [(129, -11.9), (129, 11.9), (143, -11.9), (143, 11.9), (158, -11.9), (158, 11.9), (163.4, -6), (163.4, 6)]   # the nave's `lamps`
for (x, z) in STANDS:
    i, gg = bms['iron'], bms['gilt']
    tube(gg, [(x, Y, z), (x, Y + .1, z), (x, Y + .9, z), (x, Y + 1.32, z)], [.34, .12, .05, .05], 8)
    ring_tube(gg, (x, Y + 1.34, z), .34, .04, 5, 14)
    tube(gg, [(x, Y + 1.3, z), (x, Y + 1.34, z), (x, Y + 1.36, z)], [.05, .36, .36], 12)
    for k in range(6):
        a = k / 6 * math.tau
        box(bms['snow'], x + math.cos(a) * .25 - .025, x + math.cos(a) * .25 + .025, Y + 1.36, Y + 1.36 + .16 + k * .012, z + math.sin(a) * .25 - .025, z + math.sin(a) * .25 + .025)
CH = (143, Y + 8.8, 0)
for r, y, t in ((2.3, CH[1], .08), (1.4, CH[1] + 1.0, .06), (.7, CH[1] + 1.8, .05)):
    ring_tube(bms['gilt'], (CH[0], y, CH[2]), r, t, 6, 22)
tube(bms['iron'], [(CH[0], CH[1] - .4, 0), (CH[0], CH[1] + 2, 0), (CH[0], TOP, 0)], [.1, .05, .03], 6)
for k in range(10):
    a = k / 10 * math.tau; px, pz = CH[0] + math.cos(a) * 2.3, math.sin(a) * 2.3
    box(bms['snow'], px - .035, px + .035, CH[1], CH[1] + .28, pz - .035, pz + .035)
    tube(bms['iron'], [(CH[0], CH[1] + 2, 0), (px, CH[1] + .05, pz)], [.015, .015], 4)

# ---- write the meshes ---------------------------------------------------------------------------------------------------
objs = []
for slot, bm in bms.items():
    if not bm.faces: bm.free(); continue
    keep = uvs if slot == 'icons' else None
    me = bpy.data.meshes.new('church__' + slot); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new('church__' + slot, me); bpy.context.scene.collection.objects.link(ob)
    if keep is not None:
        uv = me.uv_layers.new(name='UVMap')
        for fi, poly in enumerate(me.polygons):
            cell = keep.get(fi)
            if cell is None: continue
            for k, li in enumerate(poly.loop_indices): uv.data[li].uv = cell[k]
    tinted(ob, slot, COL[slot]); objs.append(ob)
result = {'tris': {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs}}
