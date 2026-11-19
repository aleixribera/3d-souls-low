# Vesper, the Pale Meridian (Boss Rush / Practice): watcher of the glass observatory who measured the sky long after the
# stars went out. One rigid mesh per game bone (js/rig.js skeleton at scale 1), named vesper:<bone>__<piece>[.n]. The
# game scales her 1.92x. Rest pose: upright, arms hanging. Game axes (x = figure's left, y up, z forward), through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.36, y 1.55,
# elbows y 1.25, wrists .95; hips x +-.15, y .90, knees .45. Weapon (the Meridian Glaive) on `weapon` (origin right wrist,
# haft along +z at y = WR - .045 for Rig.holdHaft). Extra bones: loinF (0, .93, .2), loinB (0, .93, -.2), capeA/B/C
# (0, 1.58, -.24 -> 1.14 -> .70), and haloA / haloB (0, 1.72, -.25): two counter-rotating silver astrolabe rings behind
# her shoulders and head. `eclipse` slots are hidden in Phase 1 and revealed in Phase 2 (Vesper, the Eclipsed).
# Boss budget: <= 14,000 tris.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob, bent_spike
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({
    'silver':  (0.76, 0.80, 0.86),
    'trim':    (0.90, 0.92, 0.96),
    'indigo':  (0.08, 0.11, 0.24),
    'silk':    (0.24, 0.28, 0.44),
    'dark':    (0.07, 0.08, 0.13),
    'blade':   (0.88, 0.93, 0.98),
    'crystal': (0.52, 0.88, 1.00),
    'eclipse': (0.72, 0.38, 1.00),
}, prefix='vesper:')

SX, EL, WR = .36, 1.25, .95
HALO_C = (0.0, 1.74, -0.25)

def arcpts(c, r, a0, a1, n, plane='xz'):
    out = []
    for k in range(n + 1):
        t = a0 + (a1 - a0) * k / n
        if plane == 'xz': out.append((c[0] + math.sin(t) * r[0], c[1], c[2] + math.cos(t) * r[1]))
        elif plane == 'xy': out.append((c[0] + math.sin(t) * r[0], c[1] + math.cos(t) * r[1], c[2]))
        else: out.append((c[0], c[1] + math.cos(t) * r[1], c[2] + math.sin(t) * r[0]))
    return out

def lerp_rows(rows, y):
    if y >= rows[0][0]: return rows[0][1:]
    for r0, r1 in zip(rows, rows[1:]):
        if r1[0] <= y <= r0[0]:
            f = (y - r0[0]) / (r1[0] - r0[0])
            return tuple(a + (b - a) * f for a, b in zip(r0[1:], r1[1:]))
    return rows[-1][1:]

def diamond(bm, center, rx, ry, rz):
    """A sharp 8-face crystal octahedron at center."""
    cx, cy, cz = center
    top = bm.verts.new(G(cx, cy + ry, cz))
    bot = bm.verts.new(G(cx, cy - ry, cz))
    mid = [
        bm.verts.new(G(cx + rx, cy, cz)),
        bm.verts.new(G(cx, cy, cz + rz)),
        bm.verts.new(G(cx - rx, cy, cz)),
        bm.verts.new(G(cx, cy, cz - rz)),
    ]
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((top, mid[i], mid[j]))
        bm.faces.new((bot, mid[j], mid[i]))

# ==== HEAD: noble porcelain-silver mask, crescent crown, sleek dark astronomer's hood ========================================
def mask_head(bm):
    # Proportional regal oval mask (no pinched nose; balanced jaw and cheeks)
    blob(bm, (0, 1.825, -.005), .092, (.90, 1.08, 1.04), 3)        # cranium
    blob(bm, (0, 1.745, .026), .066, (.86, .92, .96), 3)           # sculpted jaw & cheeks
    blob(bm, (0, 1.695, .058), .026, (1.05, .85, .90), 2)          # serene chin
    for s in (-1, 1):
        blob(bm, (s * .048, 1.788, .060), .026, (1.10, .72, .72), 2)   # cheekbones
        blob(bm, (s * .033, 1.826, .078), .020, (1.60, .42, .52), 2)   # arched brow ridge
    blob(bm, (0, 1.778, .086), .013, (.85, 1.65, 1.05), 2)         # subtle classical nose
    tube(bm, [(-.024, 1.726, .078), (0, 1.724, .084), (.024, 1.726, .078)], [.005, .006, .005], 6)  # calm mouth
    tube(bm, [(0, 1.71, -.01), (0, 1.64, -.008), (0, 1.57, -.005)], [.056, .054, .062], 10)   # sturdy neck
soft('head__silver', mask_head, 820, voxel=.006)

def crown_filigree(bm):
    # Sleek lunar-crescent diadem seated flush on the brow
    band = arcpts((0, 1.875, -.005), (.092, .100), -2.2, 2.2, 20, 'xz')
    tube(bm, band, [.007] * len(band), 6)
    for s in (-1, 1):
        pts = [
            (0, 1.895, .092), (s * .048, 1.922, .082), (s * .092, 1.978, .056),
            (s * .114, 2.055, .028), (s * .098, 2.135, .008), (s * .058, 2.185, .000)
        ]
        tube(bm, pts, [.013, .014, .012, .009, .006, .002], 5)
    tube(bm, [(0, 1.895, .092), (0, 2.01, .068), (0, 2.09, .048)], [.007, .005, .002], 5)
hard('head__trim', crown_filigree)

def crown_star(bm):
    diamond(bm, (0, 2.025, .046), .019, .034, .019)
hard('head__crystal', crown_star, smooth=False)

def veil_hood(bm):
    # Clean closed-manifold cowl hood wrapping the crown, temples, and back of head (leaving the entire silver mask clear!)
    shell(bm, (0, 1.825, -.012), .106, .118, .118, -.45, 1.48, 1.05, math.tau - 1.05, nu=16, nv=8,
          warp=lambda p, a, e: (p[0] * (1 + .05 * max(0, -math.cos(a))),
                                p[1] + .006 * math.sin(a * 12),
                                p[2] - .026 * max(0, -math.cos(a))))
hard('head__indigo', veil_hood, thick=.014, outward=(0, 1.80, .06))

def mask_eclipse(bm):
    tube(bm, [(0, 1.878, .086), (0, 1.820, .094), (0, 1.750, .090), (0, 1.695, .072)], [.0035, .0045, .0038, .0025], 4)
    for s in (-1, 1):
        tube(bm, [(s * .034, 1.795, .084), (s * .054, 1.765, .074), (s * .058, 1.720, .054)], [.0032, .0038, .0022], 4)
hard('head__eclipse', mask_eclipse)

# ==== CHEST: fitted silver cuirass, sculpted gorget, sternum astrolabe dial, winged high collar, indigo coat ================
CUI = [
    (1.63, -.008, .078, .072), (1.58, -.006, .165, .112), (1.50, .004, .240, .142),
    (1.42, .014, .225, .154), (1.30, .016, .190, .142), (1.18, .006, .158, .118), (1.06, 0, .172, .126)
]
def cui_ridge(a, y):
    return .058 * math.exp(-(a / .24) ** 2) * max(0.0, min(1.0, (1.52 - y) / .10))
def chest_plate(bm):
    loft(bm, [(y, 0, cz, rx, rz) for y, cz, rx, rz in CUI], 24, cap=True, push=cui_ridge)
    # Sculpted silver gorget collar covering the neck transition cleanly
    loft(bm, [(1.66, 0, -.004, .074, .070), (1.60, 0, -.002, .118, .096), (1.54, 0, .006, .175, .126)], 18, cap=True)
hard('chest__silver', chest_plate)

def cui_at(a, y, out=0.0):
    cz, rx, rz = lerp_rows(CUI, y)
    r = 1 + cui_ridge(a, y)
    return Vector((math.sin(a) * (rx * r + out), y, cz + math.cos(a) * (rz * r + out)))

def chest_dial(bm):
    c = cui_at(0, 1.36, .008)
    p = arcpts((0, 1.36, c.z + .004), (.064, .064), 0, math.tau, 18, 'xy')
    tube(bm, p, [.0075] * len(p), 5)
    p2 = arcpts((0, 1.36, c.z + .005), (.038, .038), 0, math.tau, 14, 'xy')
    tube(bm, p2, [.0045] * len(p2), 4)
    for k in range(8):
        t = k / 8 * math.tau
        r0, r1 = .040, .088 if k % 2 == 0 else .070
        tube(bm, [(math.sin(t) * r0, 1.36 + math.cos(t) * r0, c.z + .004),
                  (math.sin(t) * r1, 1.36 + math.cos(t) * r1, c.z + .002)], [.006, .002], 4)
    # Gorget rim & shoulder filigree ribs
    g = arcpts((0, 1.655, -.004), (.078, .074), 0, math.tau, 18, 'xz')
    tube(bm, g, [.007] * len(g), 5)
    for s in (-1, 1):
        pts = [tuple(cui_at(s * (.78 - .48 * k / 5), 1.53 - .40 * k / 5, .008)) for k in range(6)]
        tube(bm, pts, [.008, .007, .006, .006, .005, .005], 5)
hard('chest__trim', chest_dial)

def chest_gem(bm):
    c = cui_at(0, 1.36, .016)
    diamond(bm, (0, 1.36, c.z), .024, .036, .018)
hard('chest__crystal', chest_gem, smooth=False)

def chest_eclipse(bm):
    for s in (-1, 1):
        pts = [tuple(cui_at(s * (.20 + .42 * k / 4), 1.48 - .38 * k / 4, .012)) for k in range(5)]
        tube(bm, pts, [.009, .012, .012, .010, .005], 5)
        pts2 = [tuple(cui_at(s * (.52 - .22 * k / 3), 1.54 - .22 * k / 3, .012)) for k in range(4)]
        tube(bm, pts2, [.007, .010, .009, .005], 4)
    c = cui_at(0, 1.36, .026)
    diamond(bm, (0, 1.36, c.z), .038, .058, .024)
hard('chest__eclipse', chest_eclipse, smooth=False)

COAT = [
    (1.58, -.018, .125, .098), (1.53, -.01, .262, .162), (1.43, .005, .250, .174),
    (1.30, .008, .214, .162), (1.18, 0, .184, .140), (1.05, 0, .202, .150)
]
def coat_top(bm):
    loft(bm, [(y, 0, cz, rx, rz) for y, cz, rx, rz in COAT], 20, cap=False, a0=.62, a1=math.tau - .62)
hard('chest__indigo', coat_top, thick=.011, outward=(0, 1.3, .02))

def standing_collar(bm):
    # Swept-back crescent astronomer's cowl-mantle: dips low by the jaw, sweeps wide and curved behind the shoulders
    def at(u, v):
        a = math.pi + (u - .5) * 2.65
        edge = abs(u - .5) * 2.0
        flare = .125 + .115 * (v ** 1.1) + .035 * edge * v
        h = .06 + .16 * (1.0 - edge ** 1.5) * v + .05 * math.sin(edge * math.pi) * v
        return (math.sin(a) * flare * 1.32, 1.54 + h, math.cos(a) * flare - .038 - .045 * v)
    sheet(bm, 18, 4, at)
hard('chest__silk', standing_collar, thick=.011, outward=(0, 1.66, .16))

def collar_trim(bm):
    top = []
    for k in range(25):
        u = k / 24; a = math.pi + (u - .5) * 2.65
        edge = abs(u - .5) * 2.0
        flare = .240 + .035 * edge
        h = .06 + .16 * (1.0 - edge ** 1.5) + .05 * math.sin(edge * math.pi)
        top.append((math.sin(a) * flare * 1.32, 1.54 + h, math.cos(a) * flare - .083))
    tube(bm, top, [.0085] * len(top), 5)
    for s in (-1, 1):
        a = s * .62; pts = []
        for y in (1.57, 1.52, 1.43, 1.30, 1.18, 1.05):
            cz, rx, rz = lerp_rows(COAT, y)
            pts.append((math.sin(a) * (rx + .007), y, cz + math.cos(a) * (rz + .007)))
        tube(bm, pts, [.009] * len(pts), 5)
hard('chest__trim.1', collar_trim)

# ==== THE SHATTERED ASTROLABE HALO (haloA = outer rotating meridian ring; haloB = inner counter-rotating ring) ================
def outer_astrolabe(bm):
    cx, cy, cz = HALO_C
    p = arcpts((cx, cy, cz), (.56, .56), -2.75, 2.75, 36, 'xy')
    tube(bm, p, [.018] * len(p), 6)
    p2 = arcpts((cx, cy, cz - .024), (.60, .60), -2.55, 2.55, 32, 'xy')
    tube(bm, p2, [.009] * len(p2), 5)
    for k in range(8):
        a = k / 8 * math.tau
        if abs(a - math.pi) < 0.25: continue
        r0 = .54; r1 = .76 if k % 2 == 0 else .67
        tube(bm, [(cx + math.sin(a) * r0, cy + math.cos(a) * r0, cz),
                  (cx + math.sin(a) * r1, cy + math.cos(a) * r1, cz - .01)], [.015, .003], 4)
hard('haloA__silver', outer_astrolabe)

def outer_astrolabe_trim(bm):
    cx, cy, cz = HALO_C
    for k in range(14):
        a = -2.55 + k / 13 * 5.1
        tube(bm, [(cx + math.sin(a) * .53, cy + math.cos(a) * .53, cz + .005),
                  (cx + math.sin(a) * .62, cy + math.cos(a) * .62, cz - .015)], [.006, .004], 4)
    pts = arcpts((cx, cy + .64, cz), (.11, .11), 2.1, 4.18, 10, 'xy')
    tube(bm, pts, [.011] * len(pts), 5)
hard('haloA__trim', outer_astrolabe_trim)

def outer_astrolabe_eclipse(bm):
    cx, cy, cz = HALO_C
    p = arcpts((cx, cy, cz + .018), (.58, .58), -2.7, 2.7, 30, 'xy')
    tube(bm, p, [.010] * len(p), 4)
    for k in range(8):
        a = (k + 0.5) / 8 * math.tau
        if abs(a - math.pi) < 0.35: continue
        tube(bm, [(cx + math.sin(a) * .58, cy + math.cos(a) * .58, cz + .01),
                  (cx + math.sin(a) * .84, cy + math.cos(a) * .84, cz - .02)], [.014, .002], 4)
hard('haloA__eclipse', outer_astrolabe_eclipse)

def inner_astrolabe(bm):
    cx, cy, cz = HALO_C
    p = arcpts((cx, cy, cz + .012), (.39, .39), 0, math.tau, 30, 'xy')
    tube(bm, p, [.013] * len(p), 6)
    ang = 0.62
    for s in (-1, 1):
        tube(bm, [(cx + math.sin(ang) * .12 * s, cy + math.cos(ang) * .12 * s, cz + .012),
                  (cx + math.sin(ang) * .46 * s, cy + math.cos(ang) * .46 * s, cz + .012)], [.009, .003], 4)
hard('haloB__trim', inner_astrolabe)

def inner_astrolabe_gems(bm):
    cx, cy, cz = HALO_C
    for k in range(4):
        a = k / 4 * math.tau + 0.35
        diamond(bm, (cx + math.sin(a) * .39, cy + math.cos(a) * .39, cz + .022), .024, .042, .024)
hard('haloB__crystal', inner_astrolabe_gems, smooth=False)

def inner_astrolabe_eclipse(bm):
    cx, cy, cz = HALO_C
    p = arcpts((cx, cy, cz + .026), (.41, .41), 0, math.tau, 24, 'xy')
    tube(bm, p, [.008] * len(p), 4)
    for k in range(4):
        a = k / 4 * math.tau + 1.13
        diamond(bm, (cx + math.sin(a) * .43, cy + math.cos(a) * .43, cz + .028), .022, .055, .022)
hard('haloB__eclipse', inner_astrolabe_eclipse, smooth=False)

# ==== SPIN: pointed gothic V-chevron hip plate, diagonal meridian sash, flowing split observatory coat ========================
hard('spin__indigo', lambda bm: loft(bm, [(1.06, 0, 0, .202, .150), (.88, 0, .005, .248, .185), (.66, 0, .002, .278, .208), (.46, 0, -.005, .302, .224)], 18, cap=False,
     a0=.52, a1=math.tau - .52), thick=.011, outward=(0, .82, .05))
def faulds(bm):
    # Sculpted gothic V-chevron hip cuirass + smooth curved side tasset plates (no horizontal stacked hoops!)
    def chevron_at(u, v):
        a = (u - .5) * 2.15
        tip = (1.0 - abs(u - .5) * 2.0) ** 1.35
        y = 1.055 - (.12 + .145 * tip) * v
        r = .186 + .042 * v
        return (math.sin(a) * r, y, .008 + math.cos(a) * (r * .78))
    sheet(bm, 14, 4, chevron_at)
hard('spin__silver', faulds, thick=.009, outward=(0, .94, -.12))
def belt(bm):
    # Diagonal meridian sash + sculpted crescent waist clasp
    pts = []
    for k in range(25):
        t = k / 24 * math.tau
        y = 1.075 + .032 * math.sin(t - .5)
        pts.append((math.sin(t) * .194, y, .008 + math.cos(t) * .152))
    tube(bm, pts, [.013] * len(pts), 5)
    c = arcpts((0, 1.03, .165), (.042, .042), 1.85, 4.43, 12, 'xy')
    tube(bm, c, [.010] * len(c), 5)
hard('spin__trim', belt)

# ---- rich draped pleated front observatory coat-panel & long back skirt (grounds lower silhouette gracefully) ----------------
def front_tabard_at(u, v):
    # Sweeping pleated front coat-panel framing her armored greaves cleanly down to the ankles
    w = .33 + .11 * (v ** 1.1)
    x = (u - .5) * w
    point = (1.0 - abs(u - .5) * 2.0) * .11 * (v ** 1.4)
    y = .90 - .69 * v - point
    fold = .018 * math.sin(u * 15) * (v ** .75)
    z = .192 + .062 * v - .40 * x * x + fold
    return (x, y, z)
hard('loinF__indigo', lambda bm: sheet(bm, 12, 7, lambda u, v: front_tabard_at(u, v * .95)), outward=(0, .5, -.3))
hard('loinF__trim', lambda bm: sheet(bm, 12, 1, lambda u, v: Vector(front_tabard_at(u, .89 + .06 * v)) + Vector((0, 0, .007))), outward=(0, .5, -.3))

def back_skirt_at(u, v):
    x = (u - .5) * .38 * (1 + .50 * v)
    return (x, .90 - .82 * v, -(.185 + .08 * v - .40 * x * x) + .022 * math.sin(u * 14 + v * 3) * v ** .6)
hard('loinB__indigo', lambda bm: sheet(bm, 12, 7, lambda u, v: back_skirt_at(u, v * .96)), outward=(0, .5, .3))
hard('loinB__trim', lambda bm: sheet(bm, 12, 1, lambda u, v: Vector(back_skirt_at(u, .90 + .06 * v)) - Vector((0, 0, .006))), outward=(0, .5, .3))

# ==== THE MANTLE: deeply draped midnight-indigo astronomer's cloak with sculpted pipe folds & swallow-tail hem ================
TOP, HEM = 1.56, .06
def mantle_at(u, v):
    y = TOP + (HEM - TOP) * v
    w = .42 + .46 * v ** .85
    x = (u - .5) * w
    a = (u - .5) * math.pi
    bow = (.15 - .02 * v) * (1 - math.cos(a))
    grow = min(1.0, .25 + v * 1.2)
    pipes = .5 + .5 * math.sin(u * 15.5 + .6 + .8 * v) + .35 * math.sin(u * 31 + 1.6 + v * 3)
    fold = (.025 + .075 * v ** .85) * grow * pipes * (1 - .35 * abs(u - .5) * 2)
    z = -.22 - .15 * v ** 1.1 + bow - fold * math.cos(a)
    x += fold * math.sin(a) * .65
    if v > 0.84:
        notch = (1.0 - abs(u - 0.5) * 2.0) ** 1.6 * 0.14 * ((v - 0.84) / 0.16)
        y += notch
    return (x, y, z)
SEGS = [('capeA', 1.58), ('capeB', 1.14), ('capeC', .70)]
def v_of(y): return (TOP - y) / (TOP - HEM)
for i, (bone, y0) in enumerate(SEGS):
    v0 = 0 if i == 0 else v_of(y0)
    v1 = v_of(SEGS[i + 1][1]) if i < 2 else .96
    hard(f'{bone}__indigo', lambda bm, v0=v0, v1=v1: sheet(bm, 20, 4, lambda u, v: mantle_at(u, v0 + (v1 - v0) * v)), outward=(0, .9, .2))
hard('capeC__trim', lambda bm: sheet(bm, 20, 1, lambda u, v: Vector(mantle_at(u, .96 + .04 * v)) - Vector((0, 0, .003))), outward=(0, .9, .2))

# ==== ARMS: broad sculpted crescent-wing layered pauldron on left, sleek duelist shoulder on right, closed fists ==============
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    def sleeve(bm, x=x, s=s):
        blob(bm, (x - s * .01, 1.48, 0), .068, (1.0, 1.05, 1.05), 2)
        tube(bm, [(x - s * .01, 1.52, 0), (x, 1.39, .004), (x, EL + .01, 0)], [.060, .054, .046], 8)
    soft(f'arm{n}__indigo', sleeve, 300, voxel=.0085)

    def pauldron(bm, x=x, s=s):
        # Smooth, sweeping gothic-celestial crescent shoulder mantle (distinct from ribbed knight pauldrons!)
        a0, a1 = (-.30, math.pi + .30) if s > 0 else (-math.pi - .30, .30)
        # Single sculpted elongated dome sweeping gracefully down the upper arm with a sharp outer crescent ridge
        shell(bm, (x - s * .018, 1.515, 0), .128, .118, .132, -.55, 1.40, a0, a1, nu=14, nv=6,
              warp=lambda p, a, e: (p[0] + s * .038 * math.exp(-((e - .2) / .45) ** 2),
                                    p[1] - .035 * max(0, -math.sin(e)),
                                    p[2]))
        if s > 0:
            # Left shoulder: soaring swept-back lunar crescent wing crest
            shell(bm, (x + .078, 1.625, -.028), .118, .165, .096, -.25, 1.30, .35, 2.75, nu=12, nv=5,
                  warp=lambda p, a, e: (p[0] + .055 * max(0, math.sin(e)),
                                        p[1] + .048 * max(0, math.sin(e)),
                                        p[2] - .042 * max(0, math.sin(e))))
        else:
            # Right shoulder: sleek lower swept lunar wing fin (leaves full clearance for two-handed Meridian Glaive swings)
            shell(bm, (x - .055, 1.565, -.022), .088, .105, .082, -.15, 1.15, -2.65, -.45, nu=10, nv=4,
                  warp=lambda p, a, e: (p[0] - .032 * max(0, math.sin(e)),
                                        p[1] + .022 * max(0, math.sin(e)),
                                        p[2] - .028 * max(0, math.sin(e))))
    hard(f'arm{n}__silver', pauldron, thick=.008, outward=(x - s * .02, 1.42, 0))

    def vambrace(bm, x=x, s=s):
        loft(bm, [(EL + .02, x, 0, .056, .056), (EL - .10, x, .004, .054, .054), (WR + .07, x, .002, .044, .044), (WR + .015, x, 0, .048, .048)], 10, cap=False)
    hard(f'elbow{n}__silver', vambrace, thick=.006, outward=(x, 1.1, 0))
    hard(f'elbow{n}__silver.1', lambda bm, x=x, s=s: bent_spike(bm, (x + s * .02, EL + .01, -.04), (x + s * .065, EL + .055, -.10), .022, (0, .02, -.02), 5))

    def gauntlet(bm, x=x, s=s):
        blob(bm, (x + s * .024, WR - .030, 0), .052, (.60, 1.0, 1.14), 2)
        for zf in (-.036, -.012, .012, .036):
            tube(bm, [(x + s * .036, WR - .032, zf), (x + s * .028, WR - .086, zf * 1.1),
                      (x - s * .028, WR - .090, zf * 1.1), (x - s * .046, WR - .044, zf)], [.015, .014, .013, .012], 5)
        tube(bm, [(x + s * .020, WR - .008, .052), (x - s * .014, WR - .004, .064), (x - s * .044, WR - .018, .056)], [.014, .013, .011], 5)
        tube(bm, [(x, WR + .025, 0), (x, WR - .018, 0)], [.046, .045], 8)
    soft(f'elbow{n}__trim', gauntlet, 440, voxel=.006)

# ==== LEGS: sturdy armored thigh cuisses, sculpted fluted silver greaves, winged knee cops, grounded gothic sabaton boots =====
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .14
    soft(f'leg{n}__dark', lambda bm, hx=hx: tube(bm, [(hx, .98, -.01), (hx * 1.02, .72, .005), (hx, .47, .01)], [.102, .084, .064], 10), 160, voxel=.010)
    def greave(bm, hx=hx, s=s):
        loft(bm, [(.52, hx, .008, .068, .066), (.42, hx, .012, .065, .064), (.28, hx, .002, .058, .056), (.14, hx, -.004, .052, .052), (.08, hx, -.005, .055, .055)], 12, cap=False)
        shell(bm, (hx, .47, .034), .060, .068, .055, -.9, .95, -1.35, 1.35, nu=8, nv=4)
    hard(f'knee{n}__silver', greave, thick=.007, outward=(hx, .3, 0))
    hard(f'knee{n}__silver.1', lambda bm, hx=hx, s=s: bent_spike(bm, (hx + s * .040, .47, .01), (hx + s * .092, .52, -.03), .018, (0, .01, 0), 5))
    def sabaton(bm, hx=hx):
        # Grounded gothic armored boot with flat sole, structured ankle collar, sculpted instep & rounded armored toe-cap
        rows = [(-.085, .052, .058), (-.03, .058, .068), (.05, .060, .062), (.13, .054, .048), (.20, .040, .032), (.25, .018, .018)]
        rings = []
        for z, rx, ry in rows:
            ring = []
            for k in range(12):
                t = k / 12 * math.tau
                py = .008 + (math.cos(t) * ry if math.cos(t) > 0 else 0.0)
                ring.append(bm.verts.new(G(hx + math.sin(t) * rx, py, z)))
            rings.append(ring)
        figure_lib.bridge(bm, rings, True, True)
    hard(f'knee{n}__trim', sabaton)

# ==== THE MERIDIAN GLAIVE (on weapon bone): midnight haft + open silver astrolabe eye + bold sweeping lunar crescent =========
BX, BY = -SX, WR - .045
HEAD = 1.18
hard('weapon__dark', lambda bm: tube(bm, [(BX, BY, -.66), (BX, BY, .0), (BX, BY, .55), (BX, BY, HEAD - .06)], [.024, .026, .025, .024], 8))

BLADE_SPINE = [
    (.02, HEAD + .02), (.14, HEAD + .12), (.25, HEAD + .28), (.29, HEAD + .46),
    (.26, HEAD + .66), (.16, HEAD + .84), (.03, HEAD + .98), (-.07, HEAD + 1.07)
]
BLADE_W = [.062, .105, .142, .156, .142, .112, .062, .005]
def glaive_frames():
    out = []
    for i, (dy, z) in enumerate(BLADE_SPINE):
        a = BLADE_SPINE[max(0, i - 1)]; b = BLADE_SPINE[min(len(BLADE_SPINE) - 1, i + 1)]
        t = Vector((0, b[0] - a[0], b[1] - a[1])).normalized()
        n = Vector((0, t.z, -t.y))
        if n.y < 0 and i < len(BLADE_SPINE) - 2: n = -n
        out.append((Vector((BX, BY + dy, z)), n, BLADE_W[i]))
    return out

def glaive_blade(bm):
    rings = []
    for p, n, w in glaive_frames():
        th = .016 if w > .02 else .004
        rings.append([bm.verts.new(G(*(p + Vector(o)))) for o in (
            (0, 0, 0),
            tuple(n * w * .42 + Vector((th, 0, 0)))[:3],
            tuple(n * w),
            tuple(n * w * .42 - Vector((th, 0, 0)))[:3],
        )])
    figure_lib.bridge(bm, rings, True, True)
    back_pts = [(-.02, HEAD + .02), (-.11, HEAD + .10), (-.16, HEAD + .24), (-.12, HEAD + .38), (-.04, HEAD + .44)]
    back_w = [.032, .055, .062, .042, .004]
    rings2 = []
    for i, (dy, z) in enumerate(back_pts):
        p = Vector((BX, BY + dy, z)); w = back_w[i]; n = Vector((0, -1, .2)).normalized(); th = .011 if w > .01 else .003
        rings2.append([bm.verts.new(G(*(p + Vector(o)))) for o in (
            (0, 0, 0), tuple(n * w * .45 + Vector((th, 0, 0)))[:3], tuple(n * w), tuple(n * w * .45 - Vector((th, 0, 0)))[:3]
        )])
    figure_lib.bridge(bm, rings2, True, True)
    tube(bm, [(BX, BY, -.66), (BX, BY, -.76), (BX, BY, -.90)], [.022, .016, .003], 6)
hard('weapon__blade', glaive_blade, smooth=False)

def glaive_fittings(bm):
    eye = arcpts((BX, BY + .02, HEAD + .05), (.085, .085), 0, math.tau, 18, 'zy')
    tube(bm, eye, [.013] * len(eye), 5)
    tube(bm, [(BX, BY, HEAD - .14), (BX, BY, HEAD - .03)], [.028, .034], 8)
    for s in (-1, 1):
        tube(bm, [(BX + s * .022, BY, HEAD - .12), (BX + s * .022, BY, HEAD - .36)], [.007, .0035], 4)
    for z in (-.62, -.28, .22, .68):
        tube(bm, [(BX, BY, z - .015), (BX, BY, z + .015)], [.025, .025], 8)
hard('weapon__trim', glaive_fittings)

def glaive_crystal(bm):
    diamond(bm, (BX, BY + .02, HEAD + .05), .022, .034, .034)
hard('weapon__crystal', glaive_crystal, smooth=False)

def glaive_eclipse(bm):
    pts = [tuple(p + n * w * .88) for p, n, w in glaive_frames()[1:-1]]
    tube(bm, pts, [.0075] * len(pts), 4)
    eye = arcpts((BX, BY + .02, HEAD + .05), (.102, .102), 0, math.tau, 16, 'zy')
    tube(bm, eye, [.006] * len(eye), 4)
hard('weapon__eclipse', glaive_eclipse)

result = tally()
