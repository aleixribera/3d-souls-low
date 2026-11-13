# The Bell Warden, the king's guard over the Bell of Waking (LORE.md: a bellkeeper chained in bronze, set at the top of
# the Seven's watchtower). One rigid mesh per game bone (js/rig.js skeleton at scale 1, MODEL_DEFS.bellWarden), named
# bell:<bone>__<material slot>[.n], so every key pose, the walk, the cloth swing and the death drive it. The game scales
# him 1.9x (bulk 1.25). Rest pose: upright, arms hanging (the model's posture leans him and bends the elbows in the game).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.37, y 1.55,
# elbows y 1.25, wrists y .95 (the bell maul's haft runs along z through the right fist; the kit builds it); hips x +-.15,
# y .90, knees .45. Cloth bones: loinF (0, .93, .2), loinB (0, .93, -.2).
# The look (the MODEL_DEFS brief): a verdigris bronze colossus cast like the bell he keeps. A bell for a helm, its crown
# loop and casting ribs on top, an inscription band, a heavy sound-bow lip over the shoulders and a barred gaol window
# where a face would be, dark inside, two cold lights behind the bars. A fluted cuirass cast in the same bronze, two iron
# chains crossed over it and locked at the breast. Small bells for pauldrons, mouths down over the arms. A bell for a
# skirt, ribbed and flaring to a lip at the knee, linen strips hanging over it front and back, a handbell at the belt.
# Bronze vambraces and greaves; iron gauntlets closed in fists, shackles at the wrists and ankles with broken chain
# hanging from them. Boss budget: 14,000 triangles with the kit's bell maul.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'bronze': (0.3, 0.42, 0.36), 'trim': (0.62, 0.52, 0.28), 'iron': (0.22, 0.23, 0.25), 'mail': (0.3, 0.32, 0.31),
       'leather': (0.22, 0.24, 0.22), 'cloth': (0.62, 0.6, 0.52), 'void': (0.02, 0.02, 0.02)}, prefix='bell:')

SX, EL, WR = .37, 1.25, .95

def lerp_rows(rows, y):
    """rows: (y, *values) top to bottom; the values linearly interpolated at height y."""
    if y >= rows[0][0]: return rows[0][1:]
    for r0, r1 in zip(rows, rows[1:]):
        if r1[0] <= y <= r0[0]:
            f = (y - r0[0]) / (r1[0] - r0[0]); return tuple(a + (b - a) * f for a, b in zip(r0[1:], r1[1:]))
    return rows[-1][1:]

def loop(bm, pts, wire, sides=4):
    """A closed tube through game points (a chain link, a ring)."""
    pts = [Vector(p) for p in pts]; n = len(pts); rings = []
    for i, p in enumerate(pts):
        t = (pts[(i + 1) % n] - pts[i - 1]).normalized()
        a = t.cross(Vector((0, 1, 0)) if abs(t.y) < .9 else Vector((1, 0, 0))).normalized(); b = t.cross(a)
        rings.append([bm.verts.new(G(*(p + (a * math.cos(k / sides * math.tau) + b * math.sin(k / sides * math.tau)) * wire))) for k in range(sides)])
    for i in range(n):
        r0, r1 = rings[i], rings[(i + 1) % n]
        for k in range(sides): bm.faces.new((r0[k], r0[(k + 1) % sides], r1[(k + 1) % sides], r1[k]))

def link(bm, c, t, nrm, L=.046, W=.028, wire=.008, seg=8):
    """One oval chain link centred at c, long along t, lying in the plane normal to nrm."""
    c, t = Vector(c), Vector(t).normalized(); b = t.cross(Vector(nrm)).normalized()
    loop(bm, [c + t * math.cos(k / seg * math.tau) * L / 2 + b * math.sin(k / seg * math.tau) * W / 2 for k in range(seg)], wire)

def chain(bm, at, n, normal, **kw):
    """n links along at(t), t 0..1; each link turned a quarter from the last, as a real chain hangs."""
    for i in range(n):
        t = (i + .5) / n; p = Vector(at(t)); d = Vector(at(min(1, t + .01))) - Vector(at(max(0, t - .01)))
        nr = Vector(normal(p)).normalized()
        if i % 2: nr = d.normalized().cross(nr)
        link(bm, p, d, nr, **kw)

def hanging(bm, top, n, sway=(0, 0, 0), **kw):
    """A broken length of n links hanging straight down from `top`, drifting by `sway` at its end."""
    top, sway = Vector(top), Vector(sway); step = kw.get('L', .046) * .78
    chain(bm, lambda t: top + Vector((0, -step * n * t, 0)) + sway * t * t, n, lambda p: (0, 0, 1), **kw)

def lathe(bm, top, axis, prof, sides=16, cap_top=True):
    """A turned shape (a bell) from `top` along `axis`: prof is (distance, radius) from the crown to the mouth."""
    top, ax = Vector(top), Vector(axis).normalized()
    a = ax.cross(Vector((0, 0, 1)) if abs(ax.z) < .9 else Vector((1, 0, 0))).normalized(); b = ax.cross(a)
    rings = [[bm.verts.new(G(*(top + ax * h + (a * math.cos(k / sides * math.tau) + b * math.sin(k / sides * math.tau)) * r)))
              for k in range(sides)] for h, r in prof]
    bridge(bm, rings, True, False)
    if cap_top: bm.faces.new(list(reversed(rings[0])))
    return rings

# ---- head: a cast bell, its crown loop and ribs, a band, the sound-bow lip, a barred window with lights inside ---------------
HELM = [(2.13, .02), (2.12, .07), (2.1, .112), (2.065, .142), (2.02, .158), (1.96, .164), (1.89, .168), (1.82, .178),
        (1.76, .196), (1.71, .222), (1.67, .258), (1.645, .288), (1.63, .298)]
HZ = -.01
def hr(y): return lerp_rows(HELM, y)[0]
WTOP, WBOT, WA = 1.81, 1.7, 2 * math.tau / 20     # the window: between these heights, two of twenty sides each way
def helm(bm):
    rows = lambda ys: [(y, 0, HZ, hr(y), hr(y) * 1.02) for y in ys]
    loft(bm, rows([y for y, _ in HELM if y > WTOP] + [WTOP]), 20, cap=False)
    loft(bm, rows([WTOP, 1.755, WBOT]), 16, cap=False, a0=WA, a1=math.tau - WA)
    loft(bm, rows([WBOT] + [y for y, _ in HELM if y < WBOT]), 20, cap=False)
hard('head__bronze', helm, thick=.018, outward=(0, 1.86, HZ))
def recess(bm):   # the dark inside, set back behind the window
    loft(bm, [(y, 0, HZ, hr(y) - .05, (hr(y) - .05) * 1.02) for y in (WTOP + .025, 1.755, WBOT - .02)], 8, cap=False, a0=-WA - .25, a1=WA + .25)
hard('head__void', recess, outward=(0, 1.755, HZ - .3))
def helm_at(a, y, lift=.0):
    r = hr(y) + lift; return (math.sin(a) * r, y, HZ + math.cos(a) * r * 1.02)
def fittings(bm):
    for a in (-.42, -.21, 0, .21, .42):   # the window's bars, and one across them
        tube(bm, [helm_at(a, WTOP + .006, .004), helm_at(a, 1.755, .006), helm_at(a, WBOT - .006, .004)], [.011, .011, .011], 5)
    tube(bm, [helm_at(a, 1.76, .012) for a in (-.66, -.33, 0, .33, .66)], [.009] * 5, 4)
    for y0, y1, lift in ((1.662, 1.627, .012), (1.965, 1.935, .008)):   # the sound-bow's lip, the inscription band
        loft(bm, [(y0, 0, HZ, hr(y0) + lift, (hr(y0) + lift) * 1.02), (y1, 0, HZ, hr(y1) + lift + .004, (hr(y1) + lift + .004) * 1.02)], 20, cap=False)
    for k in range(4):   # casting ribs over the crown
        a = math.pi / 4 + k * math.pi / 2
        tube(bm, [helm_at(a, y, .003) for y in (2.09, 2.05, 2.0, 1.965)], [.008, .01, .011, .011], 4)
    loop(bm, [(0, 2.168 + .042 * math.cos(k / 10 * math.tau), HZ + .042 * math.sin(k / 10 * math.tau)) for k in range(10)], .014, 5)
    blob(bm, (0, 2.122, HZ), .032, (1.1, .55, 1.1), 1)
hard('head__trim', fittings, outward=(0, 1.86, HZ))

# ---- neck: an iron collar under the bell's lip --------------------------------------------------------------------------------
hard('neck__iron', lambda bm: loft(bm, [(1.7, 0, -.01, .125, .12), (1.62, 0, -.005, .14, .13), (1.57, 0, 0, .16, .14)], 10, cap=False),
     outward=(0, 1.64, 0))

# ---- chest: a fluted cuirass in bell bronze, a neck ring, raised borders and rivets; two chains crossed and locked ---------------
CUIRASS = [(1.67, -.02, .15, .12), (1.63, -.01, .27, .19), (1.56, 0, .315, .215), (1.46, .01, .325, .225),
           (1.34, .015, .295, .215), (1.22, .01, .25, .19), (1.1, 0, .225, .172)]
def flute(a, y): return .022 * math.cos(a * 12) * max(0, min(1, (1.64 - y) / .06))
hard('chest__bronze', lambda bm: loft(bm, [(y, 0, cz, rx, rz) for y, cz, rx, rz in CUIRASS], 48, cap=True, push=flute))
def chest_at(x, y, lift=.0):   # a point on the cuirass at (x, y), lifted off its surface
    cz, rx, rz = lerp_rows(CUIRASS, y); f = max(0.0, 1 - (x / rx) ** 2)
    return Vector((x, y, cz + rz * math.sqrt(f) * 1.0 + .022 + lift))
def chest_normal(p):
    cz, rx, rz = lerp_rows(CUIRASS, p.y); return Vector((p.x / rx ** 2, 0, (p.z - cz) / rz ** 2))
def borders(bm):
    for y0, y1, r in ((1.66, 1.635, .006), (1.12, 1.095, .008)):   # rims at the neck and the waist
        loft(bm, [(y, 0, cz, rx * (1.05 + r), rz * (1.06 + r)) for y in (y0, y1) for cz, rx, rz in [lerp_rows(CUIRASS, y)]], 24, cap=False)
    for s in (-1, 1):   # raised V borders down the breast, rivets inside them
        tube(bm, [chest_at(s * x, y, .004) for x, y in ((.25, 1.58), (.2, 1.47), (.11, 1.37), (0, 1.33))], [.009] * 4, 4)
        for y in (1.49, 1.41): stud(bm, chest_at(s * .13, y, .006), .011)
hard('chest__trim', borders, outward=(0, 1.38, .0))
def chains(bm):
    for s in (1, -1):   # from each shoulder down across the breast to the far side of the waist
        p0, p1 = (s * .26, 1.58), (-s * .22, 1.13)
        def at(t, p0=p0, p1=p1):
            x = p0[0] + (p1[0] - p0[0]) * t; y = p0[1] + (p1[1] - p0[1]) * t - .035 * math.sin(math.pi * t)
            return chest_at(x, y, .016)
        chain(bm, at, 13, chest_normal)
    c = chest_at(0, 1.32, .045)   # the lock where they cross: a heavy iron padlock, its shackle through both
    blob(bm, c - Vector((0, .045, 0)), .05, (1.0, .9, .45), 1)
    tube(bm, [c + Vector((x, y, 0)) for x, y in ((-.03, -.02), (-.032, .03), (0, .05), (.032, .03), (.03, -.02))], [.011] * 5, 5)
hard('chest__iron', chains)

# ---- spin: a belt, and a bell for a skirt, ribbed and flaring to a heavy lip at the knee; a handbell at the belt ------------------
SKIRT = [(1.08, .228, .178), (1.0, .236, .184), (.9, .25, .195), (.8, .275, .214), (.7, .315, .245), (.62, .36, .28),
         (.56, .405, .315), (.52, .43, .335), (.5, .438, .34)]
def rib(a, y): return .016 * math.cos(a * 12)
hard('spin__bronze', lambda bm: loft(bm, [(y, 0, 0, rx, rz) for y, rx, rz in SKIRT], 48, cap=False, push=rib), thick=.02, outward=(0, .8, 0))
def skirt_trim(bm):
    for y0, y1, lift in ((1.09, 1.06, .02), (.64, .61, .022), (.545, .495, .03)):
        loft(bm, [(y, 0, 0, rx + lift, rz + lift) for y in (y0, y1) for rx, rz in [lerp_rows(SKIRT, y)]], 32, cap=False)
hard('spin__trim', skirt_trim, outward=(0, .8, 0))
hard('spin__leather', lambda bm: loft(bm, [(1.14, 0, .0, .235, .184), (1.085, 0, .0, .24, .19)], 16, cap=False), outward=(0, 1.1, 0))
def belt_iron(bm):
    blob(bm, (0, 1.112, .2), .036, (1.15, .95, .35), 1)    # the buckle
    blob(bm, (.085, 1.112, .19), .015, (1, 1, .6), 1)
    # the handbell at the right hip, hung from the belt on a short strap ring
    loop(bm, [(-.235 + .02 * math.cos(k / 8 * math.tau), 1.075 + .02 * math.sin(k / 8 * math.tau), .1) for k in range(8)], .006, 4)
hard('spin__iron', belt_iron)
def handbell(bm):
    rings = lathe(bm, (-.24, 1.05, .1), (0, -1, -.1), [(0, .012), (.02, .036), (.05, .044), (.085, .052), (.1, .066), (.108, .068)], 12)
    blob(bm, (-.24, 1.055, .1), .016, (1, 1.2, 1), 1)
hard('spin__bronze.1', handbell, thick=.008)

# ---- linen strips over the skirt, front and back -----------------------------------------------------------------------------
def strip(name, sz, w, top, hem, seed):
    def at(u, v):
        x = (u - .5) * w; y = top + (hem - top) * v
        rx, rz = lerp_rows(SKIRT, max(.5, y)); f = max(0.0, 1 - (x / (rx + .03)) ** 2)
        z = (rz + .045) * math.sqrt(f) + (.02 * (v - .85) / .15 if v > .85 else 0)   # below the lip it hangs in, not out
        return (x, y, sz * z)
    hard(name, lambda bm: sheet(bm, 4, 7, at, ragged=.08, seed=seed))
strip('loinF__cloth', 1, .19, 1.06, .38, 3)
strip('loinB__cloth', -1, .23, 1.06, .36, 8)

# ---- arms: mail sleeves under bell pauldrons, mouths down over the upper arm ----------------------------------------------------
PAUL = [(0, .035), (.025, .085), (.06, .125), (.11, .145), (.17, .158), (.22, .18), (.255, .214), (.27, .226)]
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    hard(f'arm{n}__mail', lambda bm, x=x: loft(bm, [(1.62, x, 0, .092, .092), (1.42, x, 0, .086, .086), (EL + .03, x, 0, .078, .078)], 8, cap=True))
    top, ax = (s * .33, 1.79, -.01), (s * .5, -1, 0)
    def axis_point(c, top=top, ax=ax):   # the nearest point on the bell's axis: its faces turn away from it
        t, a = Vector(top), Vector(ax).normalized(); return tuple(t + a * max(0.0, (c - t).dot(a)))
    hard(f'arm{n}__bronze', lambda bm, top=top, ax=ax: lathe(bm, top, ax, PAUL, 18), thick=.016, outward=axis_point)
    def paul_trim(bm, top=top, ax=ax, s=s):
        t, a = Vector(top), Vector(ax).normalized()
        b1 = a.cross(Vector((0, 0, 1))).normalized(); b2 = a.cross(b1)
        for h, r in ((.262, .232), (.165, .162)):   # the lip, and a cast band above it
            c = t + a * h
            loop(bm, [c + (b1 * math.cos(k / 18 * math.tau) + b2 * math.sin(k / 18 * math.tau)) * r for k in range(18)], .011, 4)
        blob(bm, t - a * .01, .03, (1, 1, 1), 1)   # the crown's knob
    hard(f'arm{n}__trim', paul_trim)

# ---- forearms: a bronze couter cup, banded vambraces, shackles with broken chain, iron fists ----------------------------------------
HS = 1.15   # the Warden's hands against the Captain's, which this fist was drawn from
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    def forearm(bm, x=x):
        shell(bm, (x, EL, -.02), .09, .09, .085, -1.0, 1.1, math.pi - 1.4, math.pi + 1.4, nu=6, nv=3)
        loft(bm, [(EL - .05, x, 0, .078, .08), (EL - .14, x, 0, .08, .082), (WR + .16, x, 0, .07, .072), (WR + .11, x, 0, .072, .074)], 12, cap=True)
    hard(f'elbow{n}__bronze', forearm, outward=lambda c, x=x: (x, c.y, -.01))
    def bands(bm, x=x):
        for y in (EL - .1, WR + .2):
            loft(bm, [(y + .018, x, 0, .086, .088), (y - .018, x, 0, .09, .092)], 12, cap=False)
    hard(f'elbow{n}__trim', bands, outward=lambda c, x=x: (x, c.y, 0))
    def shackle(bm, x=x, s=s):
        loft(bm, [(WR + .11, x, 0, .088, .09), (WR + .06, x, 0, .094, .096), (WR + .02, x, 0, .088, .09)], 12, cap=True)
        blob(bm, (x + s * .09, WR + .065, 0), .022, (.7, 1.2, 1), 1)   # the hinge's block
        hanging(bm, (x + s * .1, WR + .03, .0), 4 if s > 0 else 2, sway=(s * .03, 0, -.05))
    hard(f'elbow{n}__iron', shackle)
    def gauntlet(bm, x=x, s=s):   # the fist closed round the grip (along z through the wrist): back of the hand outside
        blob(bm, (x + s * .028 * HS, WR - .02 * HS, 0), .06 * HS, (.62, 1.0, 1.15), 1)
        for zf in (-.04, -.013, .013, .04):
            tube(bm, [(x + s * .04 * HS, WR - .026 * HS, zf * HS), (x + s * .029 * HS, WR - .081 * HS, zf * 1.1 * HS),
                      (x - s * .026 * HS, WR - .087 * HS, zf * 1.1 * HS), (x - s * .047 * HS, WR - .04 * HS, zf * HS)],
                 [.02 * HS, .019 * HS, .017 * HS, .015 * HS], 5)
        tube(bm, [(x + s * .02 * HS, WR - .007 * HS, .06 * HS), (x - s * .015 * HS, WR, .073 * HS), (x - s * .047 * HS, WR - .011 * HS, .065 * HS)],
             [.019 * HS, .017 * HS, .014 * HS], 5)   # the thumb
        if s > 0: blob(bm, (x - s * .006 * HS, WR - .055 * HS, 0), .036 * HS, (1.0, .9, 1.45), 1)   # the empty left fist
    soft(f'elbow{n}__iron.1', gauntlet, 120, voxel=.006)

# ---- legs: mail thighs; bronze knee cops and greaves, iron sabatons, shackled ankles trailing chain ---------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    hard(f'leg{n}__mail', lambda bm, hx=hx: loft(bm, [(.97, hx, -.01, .14, .14), (.72, hx * 1.04, .0, .122, .122), (.47, hx, .01, .1, .1)], 8, cap=True))
    def shin(a, y): return .12 * max(0.0, math.cos(a)) ** 6 * max(0, min(1, (y - .14) / .2))
    def greave(bm, hx=hx, shin=shin):
        loft(bm, [(.43, hx, .004, .094, .096), (.33, hx, -.008, .104, .112), (.22, hx, .0, .088, .09), (.15, hx, .004, .084, .086)], 12, cap=True, push=shin)
        def point(p, a, e): return (p.x, p.y, p.z + .028 * max(0, math.cos(a)) * max(0, 1 - abs(e)))
        shell(bm, (hx, .46, .05), .095, .09, .072, -1.1, 1.25, -1.5, 1.5, nu=6, nv=3, warp=point)   # the knee cop
    hard(f'knee{n}__bronze', greave)
    def foot(bm, hx=hx, s=s):
        loft(bm, [(.165, hx, 0, .1, .1), (.12, hx, 0, .106, .106), (.08, hx, 0, .1, .1)], 12, cap=True)   # the ankle's shackle
        blob(bm, (hx + s * .1, .125, -.02), .022, (.7, 1.2, 1), 1)
        hanging(bm, (hx + s * .108, .1, -.03), 2, sway=(s * .02, 0, -.06))
    hard(f'knee{n}__iron', foot)
    def sabaton(bm, hx=hx):
        blob(bm, (hx, .088, -.005), .08, (1.0, .95, 1.1), 1)
        for k in range(3): blob(bm, (hx, .07 - k * .008, .07 + k * .055), .072 - k * .007, (1.0, .8, .9), 1)
        blob(bm, (hx, .045, .225), .046, (1.0, .75, 1.25), 1)
        blob(bm, (hx, .048, -.06), .055, (1.0, .9, .8), 1)
    soft(f'knee{n}__iron.1', sabaton, 100, voxel=.008)

result = tally()
