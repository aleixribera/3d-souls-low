# The King's Blade (STORY.md 10j): the hunger in the last body it kept, the champion's burned-out memory. Level 14's boss,
# the story's last. One rigid mesh per game bone (js/rig.js skeleton at scale 1), named kingsBlade:<bone>__<piece>[.n]. The
# game scales it 1.45x. Rest pose: upright, arms hanging. Game axes (x = the figure's left, y up, z forward), through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.34, y 1.55, elbows
# y 1.25, wrists .95; hips x +-.15, y .90, knees .45. The King's sword is baked on the `weapon` bone (origin the right
# wrist, its blade along +z through the fist, the edges up and down). Model bones: loinF (0, .93, .2), loinB (0, .93, -.2),
# the cape's chain capeA (0, 1.56, -.24), capeB (0, 1.14, -.27), capeC (0, .72, -.3), and the scarf's two tails scarfA
# (.06, 1.6, -.14), scarfB (.07, 1.27, -.33).
# The look: the champion's statue in the castle chapel (STORY.md 3, 8), come down off its plinth in ash. Everything the
# player wears, whole and fine, as it was before the cells: a deep hood and its shoulder mantle, a mail hauberk under a
# surcoat with the seven-pointed crown of Ashmere on its breast, a great layered pauldron on the shield side, vambraces and
# gauntlets, a mail skirt, tall boots under steel greaves, and a long cape, whole to the hem. All of it charred black,
# grey ash on its edges; only the scarf keeps its red, wound twice round the throat, its two tails long behind. Under the
# hood there is no face: as on the statue, it has been struck off, a flat chiselled plane with two embers in its cracks.
# A big round shield on the left fist, held by its centre grip (its face points along the forearm, away from the elbow),
# planked, rimmed and bossed in iron, the crown on it too. The King's sword: a long, broad, bright blade, a straight
# guard, a pommel of seven points. When the Ember shows through (`burn`, drawn only while it burns): cracks of fire across
# the struck face, down the breast, over the shield's face and along the blade's fuller.
# Boss budget: about 14,000.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector, Matrix

begin({'ash': (0.16, 0.15, 0.14), 'hood': (0.12, 0.115, 0.11), 'cloth': (0.14, 0.135, 0.13), 'cape': (0.11, 0.105, 0.1),
       'mail': (0.2, 0.2, 0.21), 'iron': (0.3, 0.29, 0.29), 'leather': (0.13, 0.12, 0.11), 'strap': (0.09, 0.085, 0.08),
       'wood': (0.17, 0.16, 0.15), 'scarf': (0.62, 0.08, 0.06), 'blade': (0.82, 0.82, 0.84), 'burn': (1.0, 0.42, 0.12)},
      prefix='kingsBlade:')

SX, EL, WR = .34, 1.25, .95
rnd = random.Random(14)

def arcpts(c, r, a0, a1, n, plane):
    """Points on an arc round c: plane 'xz' (round the body, a = 0 forward), 'xy' (side to side), 'zy' (front to back)."""
    out = []
    for k in range(n + 1):
        t = a0 + (a1 - a0) * k / n
        if plane == 'xz': out.append((c[0] + math.sin(t) * r[0], c[1], c[2] + math.cos(t) * r[1]))
        elif plane == 'xy': out.append((c[0] + math.sin(t) * r[0], c[1] + math.cos(t) * r[1], c[2]))
        else: out.append((c[0], c[1] + math.cos(t) * r[1], c[2] + math.sin(t) * r[0]))
    return out

def crown(bm, c, along, up, r, h, band=.01, w=.008):
    """The seven-pointed crown of Ashmere in relief: a band and seven points, on a plane through c (along: its width
    direction, up: its height, both game Vectors); it stands proud of the plane by `w`."""
    along, up = Vector(along).normalized(), Vector(up).normalized(); out = along.cross(up).normalized()
    base = [Vector(c) + along * (r * (k / 6 - .5) * 2) for k in range(7)]
    tube(bm, [tuple(base[0] - along * .006), tuple(base[3]), tuple(base[6] + along * .006)], [band, band, band], 6)
    for k, p in enumerate(base):
        tall = h * (1.0 if k == 3 else .8 if k in (2, 4) else .65)
        tube(bm, [tuple(p + out * w * .5), tuple(p + up * tall + out * w * .5)], [band * .9, band * .25], 5)

# ==== HEAD: the struck-off face, the deep hood =================================================================================
FACE_Z = .062   # the chisel plane: everything of the face in front of it was struck off
HEAD = [(1.915, -.012, .026, .028), (1.9, -.01, .06, .068), (1.875, -.006, .079, .088), (1.84, -.002, .088, .1), (1.8, 0, .087, .103),
        (1.765, .002, .08, .098), (1.735, .006, .068, .088), (1.71, .01, .052, .072), (1.695, .012, .03, .046)]
def face(bm):
    rings = []
    for y, cz, rx, rz in HEAD:
        def push(a, yy, cz=cz, rz=rz):
            c = math.cos(a)
            if c <= .05: return 0
            lim = (FACE_Z - cz) / (c * rz) - 1
            if lim >= 0: return 0
            # struck flat, the chisel's bites in rows across it
            bite = .045 * max(0, math.sin(yy * 260 + a * 3.0)) ** 3 + .02 * max(0, math.sin(a * 23 + yy * 40)) ** 4
            return lim - bite
        rings.append(ring(bm, y, 0, cz, rx, rz, 26, push=push))
    bridge(bm, rings, True, True)
    tube(bm, [(0, 1.71, -.012), (0, 1.64, -.008), (0, 1.57, -.004)], [.05, .052, .058], 10)   # the throat, under the scarf
hard('head__ash', face)
def face_cracks(bm):   # where the Ember shows through the struck face: through both eyes, down to the jaw
    for pts in ([(-.05, 1.865, .055), (-.034, 1.84, .063), (-.03, 1.815, .064), (-.012, 1.79, .064), (-.016, 1.76, .064), (-.004, 1.73, .062)],
                [(.046, 1.86, .056), (.034, 1.835, .063), (.033, 1.812, .064), (.05, 1.79, .062), (.042, 1.755, .062)],
                [(-.012, 1.79, .064), (.012, 1.8, .064), (.033, 1.812, .064)], [(.0, 1.76, .064), (.022, 1.735, .062), (.018, 1.71, .058)]):
        tube(bm, pts, [.0032] * len(pts), 4)
hard('head__burn', face_cracks)
def hood(bm):   # a deep cowl reaching past the struck face, a soft point at the back
    def warp(p, a, e):
        p = Vector(p); back = max(0, -math.cos(a)); front = max(0, math.cos(a))
        if e > .5: p.z -= .05 * back * (e - .5) ** 1.5; p.y += .014 * back * (e - .5)
        if e < -.2: s = 1 + .5 * (-.2 - e); p.x *= s; p.z = (p.z - .0) * s - .02
        p.z += .02 * front * max(0, e + .2)   # the cowl's rim drawn forward over the brow
        return p
    c = (0, 1.8, -.008)
    shell(bm, c, .138, .162, .148, -.8, 1.57, .88, math.tau - .88, nu=15, nv=8, warp=warp)    # sides and back
    shell(bm, c, .138, .162, .148, .55, 1.57, -.88, .88, nu=5, nv=3, warp=warp)                 # over the brow
hard('head__hood', hood, thick=.018)

# ==== NECK: the scarf wound twice, its knot ====================================================================================
def scarf(bm):   # wound twice, full and high: the lower fold drooping over the breast
    tube(bm, [(math.sin(a) * .104, 1.66 + .014 * math.sin(a * 2), math.cos(a) * .092 - .012) for a in [k / 16 * math.tau for k in range(17)]], [.042] * 17, 8)
    tube(bm, [(math.sin(a) * .13, 1.6 - .035 * max(0, math.cos(a)) ** 2 + .01 * math.cos(a * 3), math.cos(a) * .12 - .014) for a in [k / 16 * math.tau for k in range(17)]], [.044] * 17, 8)
    blob(bm, (.07, 1.6, -.12), .055, (1.1, .9, .9), 2)    # the knot, at the back on the left
soft('neck__scarf', scarf, 520, voxel=.008)
def tail(bm, y0, y1, z0, z1, w0, w1, x, rag, seed, phase):
    sheet(bm, 2, 6, lambda u, v: (x + (u - .5) * (w0 + (w1 - w0) * v) + .02 * math.sin(v * 3 + phase), y0 + (y1 - y0) * v,
                                  z0 + (z1 - z0) * v - .025 * math.sin(math.pi * v) + .012 * math.sin(u * 3)), ragged=rag, seed=seed)
def scarf_tails_a(bm):   # two tails out of the knot, over the mantle and the cape: the long one and the short one
    tail(bm, 1.6, 1.26, -.15, -.33, .11, .1, .08, 0, 3, 0)
    tail(bm, 1.6, 1.34, -.15, -.31, .09, .08, .015, .03, 5, 1.3)
hard('scarfA__scarf', scarf_tails_a, thick=.009, outward=(.05, 1.45, .1))
hard('scarfB__scarf', lambda bm: tail(bm, 1.27, .82, -.33, -.4, .1, .085, .08, .06, 7, .4), thick=.009, outward=(.05, 1.05, -.1))

# ==== CHEST: the hauberk, the surcoat and its crown, the hood's mantle, the guige =============================================
def torso(bm):
    loft(bm, [(1.0, 0, 0, .19, .135), (1.12, 0, .006, .195, .138), (1.3, 0, .012, .222, .152), (1.45, 0, .006, .238, .152),
              (1.56, 0, -.006, .222, .136), (1.63, 0, -.01, .13, .105)], 18)
    for s in (-1, 1): blob(bm, (s * .29, 1.55, -.005), .09, (1.1, .8, 1), 2)       # the shoulder caps the arms sit under
rings_mail = lambda g: .0025 * math.sin(g.y * 160) ** 2
soft('chest__mail', torso, 700, after=rings_mail)
SUR = [(1.585, -.004, .17, .125), (1.5, .004, .248, .164), (1.4, .012, .246, .166), (1.28, .016, .234, .164), (1.14, .01, .212, .152), (1.0, .004, .206, .15)]
def surcoat(bm):   # front and back panels over the hauberk, open under the arms
    for a0, a1 in ((-1.12, 1.12), (math.pi - 1.25, math.pi + 1.25)):
        loft(bm, [(y, 0, cz, rx, rz) for y, cz, rx, rz in SUR], 18, cap=False, a0=a0, a1=a1)
hard('chest__cloth', surcoat, thick=.01, outward=(0, 1.3, .01))
def sur_at(a, y, out=0.0):
    for (y0, cz0, rx0, rz0), (y1, cz1, rx1, rz1) in zip(SUR, SUR[1:]):
        if y1 <= y <= y0:
            f = (y - y0) / (y1 - y0); cz, rx, rz = cz0 + (cz1 - cz0) * f, rx0 + (rx1 - rx0) * f, rz0 + (rz1 - rz0) * f
            return Vector((math.sin(a) * (rx + out), y, cz + math.cos(a) * (rz + out)))
    return Vector((0, y, .2))
def device(bm):   # the seven-pointed crown on the breast; a plain plate belt of the surcoat at the waist
    c = sur_at(0, 1.33, .012)
    crown(bm, tuple(c), (1, 0, 0), (0, 1, 0), .1, .1, band=.011, w=.008)
    loft(bm, [(1.065, 0, .006, .214, .155), (1.025, 0, .005, .212, .154)], 22, cap=False)   # the belt
    blob(bm, (0, 1.045, .162), .024, (1.3, 1.0, .5), 2)                                       # its buckle
hard('chest__iron', device)
def mantle(bm):   # the cowl's shoulder mantle over the pauldrons' tops, a little frayed at the hem
    hem = random.Random(8); cuts = [hem.uniform(0, .04) for _ in range(25)]
    rows = [(1.67, 0, -.022, .13, .112), (1.62, 0, -.022, .23, .165), (1.55, 0, -.022, .32, .198), (1.47, 0, -.026, .35, .214)]
    rings = [ring(bm, y, cx, cz, rx, rz, 24) for (y, cx, cz, rx, rz) in rows]
    for k, v in enumerate(rings[-1]):
        co = v.co; v.co = (co.x, co.y, co.z + (cuts[k] if k % 2 else cuts[k] * .3))
    bridge(bm, rings)
hard('chest__hood', mantle, thick=.014)
def guige(bm):   # the shield's guige strap, right shoulder to left hip, front and back
    for sign in (1, -1):
        pts = []
        for i in range(8):
            t = i / 7; y = 1.57 - .5 * t; x = -.17 + .36 * t
            p = sur_at(math.atan2(x, sign * .15) if sign > 0 else math.pi - math.atan2(x, .15), y, .012)
            pts.append((x, y, p.z))
        sheet(bm, 1, 7, lambda u, v, p=pts: (p[round(v * 7)][0] + (u - .5) * .05, p[round(v * 7)][1] + (u - .5) * .03, p[round(v * 7)][2]))
hard('chest__strap', guige, thick=.008)
def chest_cracks(bm):   # the Ember through the breast: from the crown down and out
    for pts in ([(0, 1.25), (.04, 1.2), (.02, 1.13), (.07, 1.07)], [(-.02, 1.27), (-.09, 1.22), (-.12, 1.15)], [(.05, 1.42), (.1, 1.36), (.16, 1.3)],
                [(-.05, 1.42), (-.12, 1.46), (-.17, 1.4)]):
        tube(bm, [tuple(sur_at(math.asin(max(-.95, min(.95, x / .23))), y, .006)) for x, y in pts], [.0045] * len(pts), 4)
hard('chest__burn', chest_cracks)

# ==== SPIN: the mail skirt, the belt's hang ===================================================================================
def mail_skirt(bm):
    loft(bm, [(1.02, 0, 0, .205, .148), (.86, 0, -.005, .228, .165), (.68, 0, -.01, .25, .185)], 24, cap=False,
         push=lambda a, y: .012 * math.sin(y * 140) ** 2)
hard('spin__mail', mail_skirt, thick=.008)
def hips(bm):
    loft(bm, [(1.08, 0, 0, .18, .13), (.98, 0, 0, .195, .14), (.88, 0, -.005, .2, .14), (.8, 0, 0, .18, .13)], 14)
    for s in (-1, 1): blob(bm, (s * .1, .84, -.02), .1, (1, .9, 1), 2)
soft('spin__leather', hips, 320)

# ---- the surcoat's skirts to the knee, front and back, open at the sides --------------------------------------------------
def skirt_at(s, w, u, v):
    x = (u - .5) * w * (1 + .45 * v)
    return (x, 1.0 - .55 * v, s * (.17 + .075 * v - .4 * x * x) + .018 * math.sin(u * 14 + v * 3) * v ** .6)
for bone, s, w in (('loinF', 1, .32), ('loinB', -1, .38)):
    hard(f'{bone}__cloth', lambda bm, s=s, w=w: sheet(bm, 10, 6, lambda u, v: skirt_at(s, w, u, v), ragged=.03, seed=4 + s), thick=.01, outward=(0, .7, -s * .3))

# ==== the cape: whole to the hem, on three cloth springs =====================================================================
def cape_band(y0, y1, w0, w1, d0, d1, ragged=0.0, seed=1):
    def at(u, v):
        y = y0 + (y1 - y0) * v; w = w0 + (w1 - w0) * v; d = d0 + (d1 - d0) * v
        k = (1.6 - y) / 1.4
        a = math.pi + (u - .5) * w
        fold = 1 + .08 * k * math.sin(u * math.pi * 7) ** 2
        return (math.sin(a) * (.26 + .14 * k) * fold, y, -.035 + math.cos(a) * d * fold)
    return lambda bm: sheet(bm, 16, 4, at, ragged, seed)
hard('capeA__cape', cape_band(1.56, 1.12, 1.95, 2.1, .21, .26), thick=.012)
hard('capeB__cape', cape_band(1.15, .7, 2.1, 2.25, .26, .3), thick=.012)
hard('capeC__cape', cape_band(.73, .2, 2.25, 2.4, .3, .34, ragged=.05, seed=4), thick=.012)

# ==== ARMS: mail sleeves; the great pauldron on the shield side, a smaller one on the sword arm; vambraces, gauntlets ==========
def pauldron(bm, x, s, scale, lames):
    c = (x + s * .012, 1.56, 0)
    shell(bm, c, .105 * scale, .078 * scale, .11 * scale, -.6, 1.5, math.pi / 2 * s - 1.75, math.pi / 2 * s + 1.75, nu=12, nv=6,
          warp=lambda p, a, e: (p[0] + s * .012 * max(0, e), p[1], p[2]))
    for i in range(lames):
        y = 1.485 - i * .045 * scale; r = (.095 - i * .004) * scale
        shell(bm, (x + s * .006, y, 0), r, .05 * scale, r * 1.02, -.7, .35, math.pi / 2 * s - 1.65, math.pi / 2 * s + 1.65, nu=10, nv=2)
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    def upper(bm, x=x, s=s):
        loft(bm, [(1.63, x - s * .02, -.005, .074, .074), (1.5, x, 0, .074, .072), (1.36, x, 0, .066, .066), (1.22, x, 0, .06, .06)], 12)
        blob(bm, (x - s * .01, 1.56, 0), .082, (1, 1, 1), 2)
        blob(bm, (x, 1.24, 0), .062, (1, 1, 1), 2)
    soft(f'arm{n}__mail', upper, 340, after=lambda g: .001 * math.sin(g.y * 160) ** 2)
    def vambrace(bm, x=x):
        loft(bm, [(1.29, x, 0, .066, .066), (1.24, x, .002, .072, .072), (1.19, x, .004, .066, .068)], 12, cap=False)   # the couter
        loft(bm, [(1.18, x, .005, .066, .068), (1.08, x, .009, .061, .063), (.99, x, .01, .053, .055)], 12, cap=False)
    hard(f'elbow{n}__iron', vambrace, thick=.008)
    def fist(bm, x=x, s=s):   # a gauntleted fist: the right closes on the sword's grip, the left on the shield's
        blob(bm, (x, .92, .02), .048, (.85, 1.1, 1.1), 2)
        blob(bm, (x, .87, .035), .043, (.95, .75, 1.1), 2)
        blob(bm, (x - s * .036, .91, .05), .021, (1, 1.5, 1), 1)
        tube(bm, [(x, .995, .008), (x, .955, .012)], [.058, .056], 10)   # the cuff
    soft(f'elbow{n}__leather', fist, 220, voxel=.007)
hard('armL__iron', lambda bm: (pauldron(bm, SX, 1, 1.28, 3), shell(bm, (SX - .045, 1.6, 0), .02, .07, .1, -.2, 1.0, -1.2, 1.2, nu=8, nv=3)), thick=.011)   # with a raised haute-piece
def rivets(bm):
    for i in range(3):
        y = 1.485 - i * .045 * 1.28 + .016; r = (.095 - i * .004) * 1.28 + .004
        for a in (-1.0, 0, 1.0): stud(bm, (SX + .007 + math.sin(math.pi / 2 + a) * r, y, math.cos(math.pi / 2 + a) * r * 1.02), .008)
hard('armL__iron.2', rivets)
hard('armR__iron', lambda bm: pauldron(bm, -SX, -1, .98, 1), thick=.01)

# ==== THE SHIELD (on the left fist, elbowL): a big round shield held by its centre grip, its face along the forearm =========
# Shield space: a disk in u/v, +w out of its face. On the fist: w is the forearm's way down (-y at rest), u across (x),
# v forward (z). The fist sits in the boss's hollow.
SC, SR = Vector((SX + .015, .875, .01)), .3
def shield_xf(u, v, w): return (SC.x + u, SC.y - w, SC.z + v)
def dish(r): return .05 * (r / SR) ** 2   # dished: the rim curls back toward the arm
def boards(bm):
    rows = []
    for k in range(9):   # rings out from the boss to the rim
        r = .055 + (SR - .055) * k / 8
        rows.append([bm.verts.new(G(*shield_xf(math.cos(t) * r, math.sin(t) * r, -dish(r) + .004 * math.sin(math.cos(t) * r * 70) ** 2)))
                     for t in [j / 40 * math.tau for j in range(40)]])
    bridge(bm, rows, True)
hard('elbowL__wood', boards, thick=.018, outward=(SC.x, SC.y + .3, SC.z))
def shield_iron(bm):
    rim = [shield_xf(math.cos(t) * (SR + .004), math.sin(t) * (SR + .004), -dish(SR) - .004) for t in [j / 40 * math.tau for j in range(41)]]
    tube(bm, rim, [.016] * len(rim), 6)
    # the boss: a dome over the grip
    rows = [[bm.verts.new(G(*shield_xf(math.cos(t) * r, math.sin(t) * r, h))) for t in [j / 20 * math.tau for j in range(20)]]
            for r, h in ((.07, .004), (.068, .022), (.058, .04), (.04, .054), (.016, .06))]
    bridge(bm, rows, True)
    bm.faces.new([rows[-1][j] for j in range(20)])
    for j in range(8):   # rivets round the boss and the rim
        t = j / 8 * math.tau
        stud(bm, shield_xf(math.cos(t) * .085, math.sin(t) * .085, .012), .009)
        stud(bm, shield_xf(math.cos(t + .2) * (SR - .025), math.sin(t + .2) * (SR - .025), -dish(SR - .025) + .012), .009)
    # the crown of Ashmere above the boss (toward the shield's top when it is raised: +v, the way the fist faces)
    c = Vector(shield_xf(0, .16, -dish(.16) + .016))
    crown(bm, tuple(c), (1, 0, 0), (0, 0, 1), .085, .075, band=.009, w=.004)
    # two iron bands across the boards, either side of the boss
    for uu in (-.12, .12):
        pts = [shield_xf(uu, vv, -dish(math.hypot(uu, vv)) + .01) for vv in [k / 10 * 2 * math.sqrt(SR * SR - uu * uu) * .96 - math.sqrt(SR * SR - uu * uu) * .96 for k in range(11)]]
        tube(bm, pts, [.01] * len(pts), 5)
hard('elbowL__iron.2', shield_iron)
def shield_back(bm):   # its back: the grip bar across the boss's hollow, and the guige's rings
    tube(bm, [shield_xf(-.065, 0, .02), shield_xf(0, 0, .03), shield_xf(.065, 0, .02)], [.014, .016, .014], 8)
    for uu in (-.2, .2): tube(bm, [shield_xf(uu, .0, .025), shield_xf(uu, .0, .045)], [.012, .012], 6)
hard('elbowL__strap', shield_back)
def shield_cracks(bm):   # the Ember through the shield's face when it burns
    for pts in ([(.06, .02), (.12, .06), (.17, .03), (.24, .1)], [(-.05, -.04), (-.11, -.1), (-.18, -.08), (-.25, -.14)], [(.02, -.07), (.05, -.15), (.02, -.24)],
                [(-.04, .07), (-.1, .13), (-.09, .21)]):
        tube(bm, [shield_xf(u, v, -dish(math.hypot(u, v)) + .012) for u, v in pts], [.005] * len(pts), 4)
hard('elbowL__burn', shield_cracks)

# ==== LEGS: mail over the thighs, steel greaves over tall boots ===============================================================
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    def thigh(bm, hx=hx):
        loft(bm, [(1.0, hx * .8, -.01, .1, .1), (.85, hx, .0, .094, .096), (.62, hx, .01, .079, .082), (.45, hx, .01, .07, .072)], 12)
        blob(bm, (hx, .45, .015), .072, (1, 1, 1), 2)
    soft(f'leg{n}__mail', thigh, 300, after=rings_mail)
    def boot(bm, hx=hx):
        loft(bm, [(.5, hx, .01, .08, .082), (.45, hx, .008, .076, .078), (.3, hx, -.005, .068, .072), (.14, hx, -.01, .058, .064),
                  (.06, hx, .0, .062, .072)], 12)
        loft(bm, [(.13, hx, .03, .057, .1), (.08, hx, .07, .057, .135), (.025, hx, .075, .06, .145)], 12)
        blob(bm, (hx, .045, .195), .052, (1.05, .85, 1.1), 2)
        blob(bm, (hx, .05, -.045), .052, (1, .9, 1), 2)
    soft(f'knee{n}__leather', boot, 400, voxel=.009)
    def greave(bm, hx=hx, s=s):   # a steel greave over the shin, a knee cop with a fan on its outer side
        loft(bm, [(.5, hx, .02, .07, .07), (.4, hx, .022, .068, .068), (.26, hx, .012, .064, .064), (.16, hx, .002, .058, .06)], 12, cap=False, a0=-1.9, a1=1.9)
        shell(bm, (hx, .47, .035), .066, .068, .058, -.9, .9, -1.4, 1.4, nu=9, nv=4)
        shell(bm, (hx + s * .06, .47, .0), .012, .06, .05, -1.2, 1.2, math.pi / 2 * s - .9, math.pi / 2 * s + .9, nu=6, nv=4)
    hard(f'knee{n}__iron', greave, thick=.007)
    def sole(bm, hx=hx):
        loft(bm, [(.018, hx, .07, .064, .155), (.0, hx, .07, .064, .155)], 14)
        for y in (.36, .22): loft(bm, [(y + .01, hx, -.002, .074, .077), (y - .01, hx, -.002, .072, .075)], 12, cap=False)
    hard(f'knee{n}__strap', sole)

# ==== THE KING'S SWORD (on the weapon bone): a long broad blade, a straight guard, a pommel of seven points ===================
BX, BY = -SX, WR - .045
def blade(bm):   # a broad lenticular blade with a fuller's hollow, the edges up and down, tapering to the point
    rows = [(.15, .07, .013), (.3, .068, .012), (.55, .064, .011), (.78, .056, .01), (.92, .042, .008), (1.0, .02, .005), (1.04, .002, .002)]
    rings = []
    for z, w, t in rows:   # six points round: the two edges, and each flat dished in toward the fuller
        pts = [(0, w / 2), (t, w * .22), (t * .55, 0), (t, -w * .22), (0, -w / 2), (-t, -w * .22), (-t * .55, 0), (-t, w * .22)]
        rings.append([bm.verts.new(G(BX + a, BY + b, z)) for a, b in pts])
    figure_lib.bridge(bm, rings, True, True)
hard('weapon__blade', blade, smooth=False)
def fittings(bm):   # the guard, its langet, the ferrules and the pommel of seven points
    tube(bm, [(BX, BY + .17, .2), (BX, BY + .13, .165), (BX, BY, .15), (BX, BY - .13, .165), (BX, BY - .17, .2)], [.013, .016, .02, .016, .013], 8)
    for s in (-1, 1): blob(bm, (BX, BY + s * .172, .205), .018, (1, 1, 1.2), 1)
    tube(bm, [(BX, BY, .14), (BX, BY, .125)], [.03, .03], 10); tube(bm, [(BX, BY, -.115), (BX, BY, -.13)], [.026, .026], 10)
    blob(bm, (BX, BY, -.16), .036, (1.0, 1.0, .75), 2)
    for k in range(7):
        t = k / 7 * math.tau
        tube(bm, [(BX + math.sin(t) * .03, BY + math.cos(t) * .03, -.175), (BX + math.sin(t) * .024, BY + math.cos(t) * .024, -.215)], [.008, .002], 4)
hard('weapon__iron', fittings)
hard('weapon__strap', lambda bm: tube(bm, [(BX, BY, -.115), (BX, BY, .0), (BX, BY, .12)], [.021, .023, .021], 8))   # the grip, wound in leather
def fuller(bm):   # the line of fire down both flats when the blade burns
    for s in (-1, 1):
        tube(bm, [(BX + s * .0085, BY, .22), (BX + s * .009, BY, .6), (BX + s * .007, BY, .88)], [.006, .005, .003], 4)
hard('weapon__burn', fuller)

result = tally()
