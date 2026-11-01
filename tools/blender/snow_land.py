# The land round the church: one ground mesh that lies exactly on the level's outdoor floors and rises into banks beyond
# them (so its edge never reads as a wall), the far mountains, the instanced props (spruce, fence, cross, rock, shrub)
# and their placements, written to tools/blender/out/snow_land.places.json for tools/pack-baked.cjs.
# WALK must agree with the outdoor rooms and the ramp of js/levels/the-church.js.
import sys, math, random, json
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib; importlib.reload(snow_lib)
from snow_lib import *
import bpy, bmesh
rnd = random.Random(23)
ROOT = r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low"
WALK = [(0, 44, -16, 16, lambda x: 0.0), (44, 74, -9, 9, lambda x: (x - 44) / 30 * 6), (74, 118, -24, 24, lambda x: 6.0)]
# The church's footprint lies flat, just under its floor; snow banks up against its walls from there.
WALK.append((118, 186, -17, 17, lambda x: 5.86))
CHURCH = (118, 186, -17, 17)
def noise(x, z, seed=0):
    s = 0; a = 1; f = .012
    for i in range(5):
        s += a * math.sin(x * f + seed + i * 1.7) * math.cos(z * f * 1.13 - seed * .7 + i * .9); a *= .5; f *= 2.03
    return s
def nearest(x, z):
    best, h = 1e9, 0
    for x0, x1, z0, z1, fl in WALK:
        qx, qz = min(max(x, x0), x1), min(max(z, z0), z1)
        d = math.hypot(x - qx, z - qz)
        if d < best: best, h = d, fl(qx)
    return best, h
def height(x, z):
    d, h = nearest(x, z)
    if d <= 0: return h - .06 + .03 * noise(x * 4.3, z * 4.3, 7)   # drifts: the feet sink a little, and decals on the floor stay above it
    k = min(1, d / 16)
    bank = (k * k * (3 - 2 * k)) * (3.4 + 1.8 * noise(x, z))
    far = min(1, max(0, d - 14) / 70)
    # the hill: the far land falls away west and rolls up in banks north and south
    roll = far * (10 * noise(x * .6, z * .6, 2.1) + (x - 90) * .03)
    return h + bank + roll + min(1, d / 2) * .35 * noise(x * 3, z * 3, 5)

# ---- the ground -----------------------------------------------------------------------------------------------------
xs = sorted(set([float(v) for v in range(-150, 330, 5)] + [v for w in WALK for v in (w[0], w[1])] + [float(v) for v in range(-6, 130, 2)]))
zs = sorted(set([float(v) for v in range(-240, 245, 5)] + [v for w in WALK for v in (w[2], w[3])] + [float(v) for v in range(-34, 36, 2)]))
bm = bmesh.new()
vs = [[bm.verts.new(G(x, height(x, z), z)) for z in zs] for x in xs]
for i in range(len(xs) - 1):
    for j in range(len(zs) - 1):
        bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
bmesh.ops.triangulate(bm, faces=bm.faces[:])
land = new_obj('land__snow', bm); tinted(land, 'snow', (.92, .94, .97))
for p in land.data.polygons: p.use_smooth = True

# ---- the far mountains: a ring of ridges, snow above the rock line ------------------------------------------------------
rock, snow = bmesh.new(), bmesh.new()
def ridge(a, r):
    b = 60 + 70 * (.5 + .5 * math.sin(a * 3 + 1)) + 62 * abs(math.sin(a * 7 + 2)) ** .7 + 26 * abs(math.sin(a * 19)) + 9 * math.sin(a * 53 + 4)
    return b * max(0, 1 - abs(r - 560) / 220) ** .8
N, M = 320, 16
h = lambda ii, jj: ridge(ii / N * math.tau, 340 + jj / M * 440) + 6 * noise(ii * .4, jj * .8, 3) - 12
for i in range(N):
    for j in range(M):
        pts = []
        for (ii, jj) in ((i, j), (i, j + 1), (i + 1, j + 1), (i + 1, j)):
            a = ii / N * math.tau; r = 340 + jj / M * 440
            pts.append((90 + math.cos(a) * r, h(ii, jj), math.sin(a) * r))
        line = lambda p: 44 + 9 * math.sin(math.atan2(p[2], p[0] - 90) * 11) + 5 * math.sin(math.atan2(p[2], p[0] - 90) * 37)
        low, high = [], []
        for k, p in enumerate(pts):      # clip each quad at the snow line
            q = pts[(k + 1) % 4]; dp, dq = p[1] - line(p), q[1] - line(q)
            (high if dp >= 0 else low).append(p)
            if (dp >= 0) != (dq >= 0):
                t = dp / (dp - dq); m = tuple(p[c] + (q[c] - p[c]) * t for c in range(3)); low.append(m); high.append(m)
        for b, poly in ((rock, low), (snow, high)):
            if len(poly) >= 3: b.faces.new([b.verts.new(G(*p)) for p in poly])
ob = new_obj('ridge__rock', rock); tinted(ob, 'rock', (.25, .26, .3))
ob = new_obj('ridge__peak', snow); tinted(ob, 'peak', (.86, .9, .95))

# ---- instanced props (origin at the base, 1 unit = 1 m) ----------------------------------------------------------------
offset = lambda o, dx: [setattr(v, 'co', v.co + Vector((dx, 0, 0))) for v in o.data.vertices]
def skirt(bm, snowy, y, r, drop, n, seed):
    """One whorl of spruce boughs: a jagged, drooping skirt; its upper faces lie in snow, its underside is needles."""
    R = random.Random(seed); ct = bm.verts.new(G(0, y + drop * .5, 0)); cs = snowy.verts.new(G(0, y + drop * .52, 0)); rim = []; rs = []
    for i in range(n * 2):
        a = i / (n * 2) * math.tau; k = r * (1 if i % 2 == 0 else .62) * R.uniform(.86, 1.1); dr = (-.1 if i % 2 == 0 else .05) * r * R.uniform(.6, 1.3)
        p = (math.cos(a) * k, y + dr, math.sin(a) * k); rim.append(bm.verts.new(G(*p)))
        q = (math.cos(a) * k * .86, y + dr + .1 + drop * .08, math.sin(a) * k * .86); rs.append(snowy.verts.new(G(*q)))
    for i in range(n * 2):
        j = (i + 1) % (n * 2)
        bm.faces.new((ct, rim[i], rim[j]))
        snowy.faces.new((cs, rs[j], rs[i])) if False else snowy.faces.new((cs, rs[i], rs[j]))
needle, white, bark = bmesh.new(), bmesh.new(), bmesh.new()
tube(bark, [(0, -.3, 0), (0, 6, 0), (0, 13, 0)], [.34, .16, .03], 7)
y = 1.6; r = 2.7; tier = 0
while y < 12.5:
    t = (y - 1.6) / 11; skirt(needle, white, y, r * (1 - t) ** .85 + .22, 1.3 - t * .6, 9 - tier // 3, 40 + tier)
    y += .95 - t * .3; tier += 1
for b, n, c, s in ((needle, 'spruce__needle', (.1, .2, .15), 'needle'), (white, 'spruce__snow', (.92, .94, .97), 'snow'), (bark, 'spruce__bark', (.2, .15, .11), 'bark')):
    o = new_obj(n, b); tinted(o, s, c)
# a split-rail fence, 4 m long, along +x from its origin
fw, fs = bmesh.new(), bmesh.new()
for x in (0, 4):
    tube(fw, [(x, -.3, 0), (x, 1.3, 0)], [.13, .11], 6)
    blob(fs, (x, 1.32, 0), .14, (1, .55, 1), 1)
for y_, z_ in ((.55, .0), (1.05, .02)):
    tube(fw, [(-.15, y_, z_), (1.5, y_ + .03, z_ + .02), (2.8, y_ - .02, z_ - .02), (4.15, y_, z_)], [.075, .08, .07, .075], 6)
    box(fs, -.1, 4.1, y_ + .06, y_ + .1, z_ - .05, z_ + .05)
o = new_obj('fence__wood', fw); tinted(o, 'bark', (.2, .15, .11))
o = new_obj('fence__snow', fs); tinted(o, 'snow', (.92, .94, .97))
# an iron grave cross, Orthodox: three bars, the lowest slanted
ic = bmesh.new()
box(ic, -.05, .05, -.2, 2.1, -.05, .05); box(ic, -.05, .05, 1.42, 1.54, -.5, .5); box(ic, -.05, .05, 1.78, 1.86, -.26, .26)
tube(ic, [(0, .86, -.3), (0, 1.02, .3)], [.05, .05], 4)
o = new_obj('cross__iron', ic); tinted(o, 'iron', (.08, .08, .09))
# a boulder under snow
br, bs = bmesh.new(), bmesh.new()
blob(br, (0, .25, 0), .75, (1.3, .72, 1), 2); blob(bs, (0.02, .54, .02), .62, (1.16, .34, .9), 2)
for b, name in ((br, 'rock__stone'), (bs, 'rock__snow')):
    for v in b.verts: v.co += v.normal * rnd.uniform(-.09, .09)
o = new_obj('rock__stone', br); tinted(o, 'stone', (.33, .34, .36))
o = new_obj('rock__snow', bs); tinted(o, 'snow', (.92, .94, .97))
# a dry winter shrub: bare stems, a few red-brown leaf clusters
sh, sl = bmesh.new(), bmesh.new()
for i in range(9):
    a = rnd.uniform(0, 6.28); k = rnd.uniform(.3, .75); h = rnd.uniform(.6, 1.1)
    tube(sh, [(0, 0, 0), (math.cos(a) * k * .5, h * .6, math.sin(a) * k * .5), (math.cos(a) * k, h, math.sin(a) * k)], [.03, .018, .004], 3)
    blob(sl, (math.cos(a) * k * .9, h * .9, math.sin(a) * k * .9), .13, (1, .6, 1), 1)
o = new_obj('shrub__stem', sh); tinted(o, 'bark', (.2, .15, .11))
o = new_obj('shrub__leaf', sl); tinted(o, 'leaf', (.45, .16, .08))

# ---- placements: [x, y, z, yaw, scale] ---------------------------------------------------------------------------------
places = {k: [] for k in ('spruce', 'fence', 'cross', 'rock', 'shrub')}
def at(kind, x, z, yaw=None, s=1.0, sink=0.0):
    places[kind].append([round(x, 2), round(height(x, z) - sink, 2), round(z, 2), round(rnd.uniform(0, 6.28) if yaw is None else yaw, 3), round(s, 2)])
incl = lambda x, z: CHURCH[0] - 3 < x < CHURCH[1] + 3 and CHURCH[2] - 3 < z < CHURCH[3] + 3
n = 0
while len(places['spruce']) < 240 and n < 8000:
    n += 1
    x, z = rnd.uniform(-130, 300), rnd.uniform(-215, 215)
    d, _ = nearest(x, z)
    if d < 3.2 or incl(x, z): continue
    # the woods crowd the walk, thin on the churchyard's hill so the church stands clear from the path
    if 76 < x < 118 and abs(z) < 40 and d < 10: continue
    if d > 40 and rnd.random() < .55: continue
    at('spruce', x, z, None, rnd.uniform(.9, 1.7))
# the fence round the yard (4 m rails), with its gate open where the path comes up
def run(x0, z0, x1, z1):
    L = math.hypot(x1 - x0, z1 - z0); c = int(L // 4); yaw = -math.atan2(z1 - z0, x1 - x0)
    for i in range(c):
        t = i / c
        px, pz = x0 + (x1 - x0) * t, z0 + (z1 - z0) * t
        places['fence'].append([round(px, 2), 6.0, round(pz, 2), round(yaw, 3), round(L / c / 4, 3)])
run(74.3, 9.5, 74.3, 23.7); run(74.3, -23.7, 74.3, -9.5)
run(74.3, 23.7, 117.7, 23.7); run(74.3, -23.7, 117.7, -23.7)
for (x, z) in [(78 + i * 3.2 + rnd.uniform(-.5, .5), s * (20.5 + rnd.uniform(-1.6, 1.2))) for i in range(11) for s in (-1, 1)]:
    places['cross'].append([round(x, 2), 6.0, round(z, 2), round(1.57 + rnd.uniform(-.16, .16), 3), round(rnd.uniform(.85, 1.1), 2)])
for _ in range(46):
    x, z = rnd.uniform(-40, 180), rnd.uniform(-60, 60); d, _h = nearest(x, z)
    if d > 1.0 and not incl(x, z): at('rock', x, z, None, rnd.uniform(.7, 2.1), .2)
for (x, z) in [(14, 11), (31, -12.5), (22, -14.5), (6, 13.5), (40, 13), (80, 16), (112, -18), (96, 19)]:
    at('rock', x, z, None, rnd.uniform(.7, 1.15), .1)
for _ in range(90):
    x, z = rnd.uniform(-10, 118), rnd.uniform(-28, 28); d, _h = nearest(x, z)
    if abs(z) > 5.5 or d > 0: at('shrub', x, z, None, rnd.uniform(.6, 1.1))
json.dump(places, open(ROOT + '/tools/blender/out/snow_land.places.json', 'w'))
result = {k: len(v) for k, v in places.items()}; result['tris'] = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects}
