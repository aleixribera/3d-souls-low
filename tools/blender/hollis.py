# The Regent Hollis (STORY.md 10f): the steward the hunger left to keep Aurel fed until it came home. Level 10's boss.
# One rigid mesh per game bone (js/rig.js skeleton at scale 1), named hollis:<bone>__<piece>[.n]. The game scales him
# 1.9x. Rest pose: upright, arms hanging. Game axes (x = the figure's left, y up, z forward), through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.38, y 1.55, elbows
# y 1.25, wrists .95; hips x +-.15, y .90, knees .45. The Sword of State is baked on the `weapon` bone (origin the right
# wrist, its blade along +z through the fist, the edges up and down). Model bones: loinF (0, .93, .2), loinB (0, .93, -.2),
# and the mantle's chain capeA (0, 1.58, -.26), capeB (0, 1.14, -.3), capeC (0, .70, -.33).
# The look: a courtier, tall and narrow, who has worn the crown's colours so long they have grown into him. His face is
# laid in gold leaf like every face in Aurel, smooth as a mask, smiling a thin smile; silver hair swept back from a high
# brow under a regent's fillet (not a crown: the crown is the king's). A stiff standing collar of crimson velvet fans up
# behind his head, edged in gold, over a roll of pale fur; a gilt cuirass engraved like plate for a feast day, the
# steward's chain of office across it with the city's sun on his breast; small layered pauldrons; crimson sleeves, gilt
# vambraces and gauntlets, the left hand open (it bows, it offers, it beckons). A crimson robe to the ankles, open at the
# sides, its hem banded in gold; a long crimson mantle to the floor. Gilt greaves and long pointed sabatons. The Sword of
# State, which is the king's and not his to draw: a long two-handed blade of bright steel, its guard's quillons curled
# toward the blade, a crowned pommel, the grip bound in crimson. When the hunger shows (`burn`, drawn only while he
# burns) the gilt cracks: seams of fire across the mask, down the cuirass, and along the blade's fuller.
# Boss budget: about 14,000.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'gilt': (0.62, 0.48, 0.24), 'gold': (0.78, 0.6, 0.26), 'robe': (0.42, 0.06, 0.07), 'trim': (0.7, 0.52, 0.2),
       'fur': (0.82, 0.78, 0.7), 'hair': (0.7, 0.7, 0.68), 'dark': (0.12, 0.1, 0.09), 'blade': (0.82, 0.8, 0.76),
       'burn': (1.0, 0.42, 0.12)}, prefix='hollis:')

SX, EL, WR = .38, 1.25, .95

def arcpts(c, r, a0, a1, n, plane):
    """Points on an arc round c: plane 'xz' (round the body, a = 0 forward), 'xy' (side to side), 'zy' (front to back)."""
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
            f = (y - r0[0]) / (r1[0] - r0[0]); return tuple(a + (b - a) * f for a, b in zip(r0[1:], r1[1:]))
    return rows[-1][1:]

# ==== HEAD ==================================================================================================================
# ---- the gilded face: long, smooth as a mask, high-boned, a thin smile ------------------------------------------------------
def face(bm):
    blob(bm, (0, 1.85, -.014), .09, (.88, 1.12, 1.08), 3)          # the skull, long
    blob(bm, (0, 1.745, .03), .058, (.86, .9, .98), 3)             # the jaw, narrow
    blob(bm, (0, 1.7, .068), .021, (1.1, .85, .9), 2)              # the chin, pointed
    for s in (-1, 1):
        blob(bm, (s * .05, 1.8, .062), .024, (1.05, .7, .72), 2)       # high cheekbones
        blob(bm, (s * .03, 1.842, .08), .019, (1.6, .45, .55), 2)      # the brows, arched
        blob(bm, (s * .088, 1.8, -.012), .02, (.4, 1.2, .8), 1)        # the ears
        blob(bm, (s * .032, 1.812, .084), .011, (1.3, .55, .5), 1)     # the lids, half shut
        blob(bm, (s * .02, 1.738, .083), .008, (1.5, .6, .7), 1)       # the smile's corners, lifted
    blob(bm, (0, 1.795, .093), .014, (.7, 2.0, 1.25), 2)           # the nose, long and straight
    tube(bm, [(-.026, 1.739, .084), (-.012, 1.733, .09), (0, 1.732, .091), (.012, 1.733, .09), (.026, 1.739, .084)],
         [.0045, .005, .005, .005, .0045], 6)                       # the upper lip, a thin curve up at the ends
    tube(bm, [(0, 1.74, -.016), (0, 1.66, -.012), (0, 1.58, -.008)], [.048, .046, .054], 10)   # the neck, long
soft('head__gilt', face, 1300, voxel=.005)
# ---- silver hair swept straight back from the brow, gathered at the nape in a gold ring, the tail down the collar ---------
def hair(bm):
    shell(bm, (0, 1.855, -.02), .097, .105, .108, -.15, 1.45, -1.75, 1.75, nu=14, nv=8,
          warp=lambda p, a, e: (p[0], p[1] + .006 * math.sin(a * 20), p[2] - .012 * max(0, math.cos(a))))
    for s in (-1, 1):
        blob(bm, (s * .07, 1.84, -.07), .03, (.8, 1.0, 1.1), 2)
    blob(bm, (0, 1.79, -.11), .032, (1.0, 1.1, .9), 2)
    tube(bm, [(0, 1.76, -.118), (0, 1.66, -.13), (0, 1.56, -.14)], [.024, .02, .012], 8)
soft('head__hair', hair, 650, voxel=.006)
def fillet(bm):   # the regent's fillet: a plain gold band round the brow, a small sun at the front
    p = arcpts((0, 1.9, -.016), (.088, .104), 0, math.tau, 26, 'xz'); tube(bm, p, [.005] * len(p), 6)
    loft(bm, [(1.93, 0, .088, .004, .003), (1.915, 0, .09, .014, .006), (1.895, 0, .088, .012, .005)], 10, cap=True)
    p = arcpts((0, 1.775, -.13), (.026, .026), 0, math.tau, 12, 'xz'); tube(bm, p, [.007] * len(p), 6)   # the hair's ring
hard('head__gold', fillet)
def mask_cracks(bm):   # where the gilt splits when the hunger shows: brow to cheek, under the eye, down the jaw
    for pts in ([(.012, 1.9, .072), (.02, 1.86, .086), (.04, 1.83, .084), (.05, 1.8, .078), (.064, 1.77, .06), (.06, 1.73, .04)],
                [(-.03, 1.88, .08), (-.045, 1.85, .082), (-.042, 1.81, .084), (-.058, 1.78, .07)],
                [(-.02, 1.755, .085), (-.04, 1.74, .07), (-.05, 1.71, .045)]):
        tube(bm, pts, [.003] * len(pts), 4)
hard('head__burn', mask_cracks)

# ==== CHEST: the gilt cuirass, the chain of office, the robe over the shoulders, the standing collar ===========================
CUI = [(1.6, -.012, .07, .066), (1.565, -.01, .16, .11), (1.515, 0, .255, .148), (1.44, .012, .245, .162), (1.33, .016, .215, .158),
       (1.2, .006, .178, .13), (1.07, 0, .186, .135)]
def ridge(a, y):   # a low ridge down the breastplate's middle
    return .05 * math.exp(-(a / .25) ** 2) * max(0.0, min(1.0, (1.52 - y) / .1))
hard('chest__gilt', lambda bm: loft(bm, [(y, 0, cz, rx, rz) for y, cz, rx, rz in CUI], 28, cap=True, push=ridge))
def cui_at(a, y, out=0.0):
    cz, rx, rz = lerp_rows(CUI, y)
    r = 1 + ridge(a, y)
    return Vector((math.sin(a) * (rx * r + out), y, cz + math.cos(a) * (rz * r + out)))
def cui_cracks(bm):   # seams of fire across the breastplate when the gilt cracks
    for pts in ([(1.47, .3), (1.4, .42), (1.33, .3), (1.25, .5), (1.16, .38)], [(1.45, -.5), (1.37, -.36), (1.3, -.62), (1.22, -.5)],
                [(1.2, -.1), (1.14, .05), (1.09, -.08)]):
        tube(bm, [tuple(cui_at(a, y, .004)) for y, a in pts], [.0035] * len(pts), 4)
hard('chest__burn', cui_cracks)
def chain_of_office(bm):   # gold plaques in a deep U from shoulder to shoulder, the city's sun on the breast
    for s in (-1, 1):
        for k in range(10):
            f = k / 9; a = s * (1.05 - .95 * f); y = 1.545 - .25 * f ** 1.3
            p = cui_at(a, y, .012)
            blob(bm, tuple(p), .014 if k % 2 else .01, (1.2, 1.0, .5) if k % 2 else (1.0, 1.0, 1.0), 1)
    c = cui_at(0, 1.27, .006)
    tube(bm, [(0, 1.27, c.z - .004), (0, 1.27, c.z + .016)], [.046, .046], 18)          # the medal
    for k in range(12):                                                                # the sun's rays
        t = k / 12 * math.tau; r0, r1 = .05, .074 if k % 2 == 0 else .062
        tube(bm, [(math.sin(t) * r0, 1.27 + math.cos(t) * r0, c.z + .006), (math.sin(t) * r1, 1.27 + math.cos(t) * r1, c.z + .004)], [.008, .002], 4)
    blob(bm, (0, 1.27, c.z + .02), .02, (1, 1, .6), 2)                                 # the boss at its heart
hard('chest__gold', chain_of_office)
ROBE = [(1.585, -.02, .13, .1), (1.54, -.012, .28, .17), (1.45, .006, .27, .185), (1.33, .01, .24, .18), (1.2, 0, .205, .155), (1.06, 0, .215, .16)]
def robe_top(bm):   # crimson velvet over the shoulders and down the back, open in front over the cuirass
    loft(bm, [(y, 0, cz, rx, rz) for y, cz, rx, rz in ROBE], 22, cap=False, a0=.62, a1=math.tau - .62)
hard('chest__robe', robe_top, thick=.012, outward=(0, 1.3, .02))
def collar(bm):   # the standing collar: stiff velvet fanning up and out behind the head
    def at(u, v):
        a = math.pi + (u - .5) * 2.5; r = (.115 + .07 * v) * (1 + .05 * math.sin(u * 22) * v)   # pleated as it rises
        return (math.sin(a) * r * 1.15, 1.56 + .32 * v, math.cos(a) * r - .035 + .02 * v)
    sheet(bm, 22, 4, at)
hard('chest__robe.1', collar, thick=.012, outward=(0, 1.75, .1))
def trims(bm):   # gold bands: the collar's edge, the robe's front edges
    p = [(math.sin(math.pi + (u - .5) * 2.5) * .185 * (1 + .05 * math.sin(u * 22)) * 1.15, 1.88, math.cos(math.pi + (u - .5) * 2.5) * .185 * (1 + .05 * math.sin(u * 22)) - .015) for u in [k / 44 for k in range(45)]]
    tube(bm, p, [.008] * len(p), 6)
    for s in (-1, 1):
        a = s * .62; pts = []
        for y in (1.58, 1.54, 1.45, 1.33, 1.2, 1.06):
            cz, rx, rz = lerp_rows(ROBE, y); pts.append((math.sin(a) * (rx + .006), y, cz + math.cos(a) * (rz + .006)))
        tube(bm, pts, [.01] * len(pts), 6)
hard('chest__trim', trims)
def fur(bm):   # a roll of pale fur round the shoulders, under the collar
    p = arcpts((0, 1.565, -.02), (.2, .14), -2.3, 2.3, 22, 'xz')
    tube(bm, p, [.034] * len(p), 8)
    for s in (-1, 1): blob(bm, (s * .2 * math.sin(2.3), 1.555, -.02 + .14 * math.cos(2.3) + .02), .03, (1, 1, 1), 2)
soft('chest__fur', fur, 500, voxel=.009)

# ==== SPIN: a gilt belt of plaques, the faulds, the robe over the hips ========================================================
hard('spin__robe', lambda bm: loft(bm, [(1.07, 0, 0, .21, .158), (.9, 0, .004, .235, .175), (.74, 0, 0, .25, .185)], 18, cap=False,
     a0=.9, a1=math.tau - .9), thick=.01, outward=(0, .9, .05))
def faulds(bm):   # three gilt lames over the belly and hips
    for k in range(3):
        y = 1.04 - .055 * k; r = .2 + .012 * k
        loft(bm, [(y, 0, .006, r, r * .76), (y - .055, 0, .008, r + .012, (r + .012) * .76)], 20, cap=False, a0=-1.25, a1=1.25)
hard('spin__gilt', faulds, thick=.006, outward=(0, .98, -.1))
def belt(bm):
    p = arcpts((0, 1.075, .004), (.196, .148), 0, math.tau, 24, 'xz'); tube(bm, p, [.014] * len(p), 6)
    for k in range(8):
        t = k / 8 * math.tau; blob(bm, (math.sin(t) * .2, 1.075, .004 + math.cos(t) * .152), .016, (1.0, .9, .45), 1)
    blob(bm, (0, 1.075, .16), .026, (1.2, 1.0, .5), 2)   # the buckle
hard('spin__gold', belt)

# ---- the robe's skirts, front and back, to the ankles; open at the sides; banded in gold at the hem -----------------------
def skirt_at(s, w, u, v):
    x = (u - .5) * w * (1 + .5 * v)
    return (x, .9 - .82 * v, s * (.19 + .07 * v - .5 * x * x) + .022 * math.sin(u * 16 + v * 3) * v ** .6)
for bone, s, w in (('loinF', 1, .3), ('loinB', -1, .36)):
    hard(f'{bone}__robe', lambda bm, s=s, w=w: sheet(bm, 12, 7, lambda u, v: skirt_at(s, w, u, v * .96)), outward=(0, .5, -s * .3))
    hard(f'{bone}__trim', lambda bm, s=s, w=w: sheet(bm, 12, 1, lambda u, v: Vector(skirt_at(s, w, u, .9 + .06 * v)) + Vector((0, 0, s * .004))),
         outward=(0, .5, -s * .3))

# ==== the mantle: crimson velvet to the floor, from under the fur, banded in gold at the hem ===================================
TOP, HEM = 1.56, .05
def mantle_at(u, v):   # u across (0 the figure's right), v = 0 the shoulders .. 1 the hem
    y = TOP + (HEM - TOP) * v; w = .5 + .4 * v ** .8
    x = (u - .5) * w
    bow = (.17 - .02 * v) * (1 - math.cos((u - .5) * math.pi))
    z = -.25 - .14 * v ** 1.1 + bow + .04 * math.sin(u * 13 + v * 2) * v ** .7
    return (x, y, z)
SEGS = [('capeA', 1.58), ('capeB', 1.14), ('capeC', .70)]
def v_of(y): return (TOP - y) / (TOP - HEM)
for i, (bone, y0) in enumerate(SEGS):
    v0 = 0 if i == 0 else v_of(y0); v1 = v_of(SEGS[i + 1][1]) if i < 2 else .97
    hard(f'{bone}__robe', lambda bm, v0=v0, v1=v1: sheet(bm, 14, 3, lambda u, v: mantle_at(u, v0 + (v1 - v0) * v)), outward=(0, .9, .2))
hard('capeC__trim', lambda bm: sheet(bm, 14, 1, lambda u, v: Vector(mantle_at(u, .97 + .03 * v)) - Vector((0, 0, .002))), outward=(0, .9, .2))

# ==== ARMS: crimson sleeves puffed at the shoulder, small layered gilt pauldrons, gilt vambraces and gauntlets ===================
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    def sleeve(bm, x=x, s=s):
        blob(bm, (x - s * .006, 1.47, 0), .078, (1.0, 1.05, 1.05), 2)             # the puff
        tube(bm, [(x - s * .01, 1.52, 0), (x, 1.4, .004), (x, EL + .02, 0)], [.068, .06, .052], 10)
        for k in range(4):                                                        # slashes in the puff
            t = k / 4 * math.tau; blob(bm, (x + math.sin(t) * .072, 1.44, math.cos(t) * .074), .018, (.6, 1.7, .6), 1)
    soft(f'arm{n}__robe', sleeve, 600, voxel=.007)
    def pauldron(bm, x=x, s=s):
        a0, a1 = (-.4, math.pi + .4) if s > 0 else (-math.pi - .4, .4)
        shell(bm, (x - s * .015, 1.52, 0), .122, .095, .134, -.25, 1.45, a0, a1, nu=12, nv=6)
        for k in range(2):   # lames sloping down over the sleeve, each overlapping the one above
            y = 1.49 - .04 * k
            shell(bm, (x + s * .006 * k, y, 0), .126 + .006 * k, .06, .138 + .006 * k, -.9, -.1, a0 + .3, a1 - .3, nu=10, nv=2)
    hard(f'arm{n}__gilt', pauldron, thick=.008, outward=(x - s * .02, 1.4, 0))
    def vambrace(bm, x=x):
        loft(bm, [(EL + .01, x, 0, .06, .06), (EL - .1, x, .004, .058, .058), (WR + .07, x, .002, .048, .048), (WR + .02, x, 0, .052, .052)], 12, cap=False)
        loft(bm, [(EL + .05, x, 0, .064, .064), (EL - .015, x, 0, .066, .066)], 12, cap=False)   # the couter
    hard(f'elbow{n}__gilt', vambrace, thick=.006, outward=(x, 1.1, 0))
    def hand(bm, x=x, s=s):
        if s < 0:   # the right: a closed fist round the grip, gauntlet plates over the knuckles
            blob(bm, (x + s * .028, WR - .03, 0), .058, (.62, 1.0, 1.15), 2)
            for zf in (-.04, -.013, .014, .041):
                tube(bm, [(x + s * .04, WR - .035, zf), (x + s * .03, WR - .09, zf * 1.1), (x - s * .03, WR - .096, zf * 1.1), (x - s * .05, WR - .045, zf)],
                     [.018, .017, .016, .015], 6)
            tube(bm, [(x + s * .022, WR - .008, .058), (x - s * .016, WR - .002, .07), (x - s * .048, WR - .016, .062)], [.017, .016, .014], 6)
        else:       # the left: open, the fingers long and a little curled: it bows, it offers, it beckons
            blob(bm, (x, WR - .045, .004), .05, (.5, 1.1, 1.0), 2)
            for k, zf in enumerate((-.032, -.011, .011, .032)):
                ln = (.085, .095, .09, .075)[k]
                tube(bm, [(x, WR - .08, zf), (x + .004, WR - .08 - ln * .6, zf * 1.1 + .006), (x + .012, WR - .08 - ln, zf * 1.15 + .02)], [.013, .012, .01], 6)
            tube(bm, [(x - .006, WR - .04, .045), (x + .002, WR - .085, .07), (x + .01, WR - .11, .078)], [.014, .012, .01], 6)
        tube(bm, [(x, WR + .03, 0), (x, WR - .02, 0)], [.05, .048], 10)   # the cuff
    soft(f'elbow{n}__gold', hand, 750, voxel=.0055)

# ==== LEGS: dark hose under the robe; gilt greaves and knee cops; long pointed sabatons ========================================
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .14
    soft(f'leg{n}__dark', lambda bm, hx=hx: tube(bm, [(hx, .97, -.01), (hx * 1.03, .72, 0), (hx, .47, .01)], [.095, .075, .056], 8), 180, voxel=.01)
    def greave(bm, hx=hx, s=s):
        loft(bm, [(.5, hx, .006, .062, .06), (.42, hx, .01, .058, .056), (.3, hx, 0, .055, .052), (.16, hx, -.006, .044, .044), (.1, hx, -.008, .046, .046)], 12, cap=False)
        shell(bm, (hx, .46, .03), .056, .06, .05, -.9, .9, -1.3, 1.3, nu=8, nv=4)   # the knee cop
    hard(f'knee{n}__gilt', greave, thick=.006, outward=(hx, .3, 0))
    def sabaton(bm, hx=hx, s=s):   # lames over the foot, drawn out to a long point
        rows = [(-.06, .045, .04), (-.02, .052, .05), (.04, .05, .052), (.1, .04, .042), (.16, .024, .026), (.22, .008, .01)]
        rings = []
        for z, rx, ry in rows:
            rings.append([bm.verts.new(G(hx + math.sin(t) * rx, .045 + max(0, math.cos(t)) * ry - .02 * (1 - math.cos(t)) * .5, z)) for t in [k / 12 * math.tau for k in range(12)]])
        figure_lib.bridge(bm, rings, True, True)
    hard(f'knee{n}__gold', sabaton)

# ==== THE SWORD OF STATE (on the weapon bone): bright steel, the guard's quillons curled to the blade, a crowned pommel ===========
BX, BY = -SX, WR - .045
def blade(bm):   # a long diamond-section blade, the edges up and down, tapering to the point
    rows = [(.17, .068, .014), (.3, .066, .013), (.6, .06, .012), (.9, .052, .011), (1.12, .038, .009), (1.22, .016, .006), (1.27, .002, .002)]
    rings = [[bm.verts.new(G(BX + t * math.sin(a), BY + w / 2 * math.cos(a), z)) for a in (0, math.pi / 2, math.pi, 3 * math.pi / 2)] for z, w, t in rows]
    figure_lib.bridge(bm, rings, True, True)
hard('weapon__blade', blade, smooth=False)
def fittings(bm):   # the guard, its langets, the pommel and the grip's ferrules
    tube(bm, [(BX, BY + .2, .24), (BX, BY + .19, .19), (BX, BY + .1, .155), (BX, BY, .15), (BX, BY - .1, .155), (BX, BY - .19, .19), (BX, BY - .2, .24)],
         [.012, .014, .016, .02, .016, .014, .012], 8)
    for s in (-1, 1): blob(bm, (BX, BY + s * .2, .25), .018, (1, 1, 1.2), 1)                      # the quillons' finials
    tube(bm, [(BX, BY, .14), (BX, BY, .24)], [.026, .02], 8)                                       # the langet over the blade
    tube(bm, [(BX, BY, .14), (BX, BY, .125)], [.03, .03], 10); tube(bm, [(BX, BY, -.12), (BX, BY, -.135)], [.027, .027], 10)
    blob(bm, (BX, BY, -.175), .042, (1.0, 1.0, .8), 2)                                              # the pommel, a gold orb
    for k in range(5):                                                                              # crowned with five points
        t = k / 5 * math.tau
        tube(bm, [(BX + math.sin(t) * .03, BY + math.cos(t) * .03, -.2), (BX + math.sin(t) * .022, BY + math.cos(t) * .022, -.235)], [.008, .002], 4)
hard('weapon__gold', fittings)
hard('weapon__robe', lambda bm: tube(bm, [(BX, BY, -.125), (BX, BY, .0), (BX, BY, .125)], [.022, .024, .022], 8))   # the crimson grip
def fuller(bm):   # the line of fire down both flats when the blade burns
    for s in (-1, 1):
        tube(bm, [(BX + s * .0085, BY, .26), (BX + s * .009, BY, .7), (BX + s * .007, BY, 1.0)], [.006, .005, .003], 4)
hard('weapon__burn', fuller)

result = tally()
