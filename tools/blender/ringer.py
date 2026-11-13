# The Ringer of Thrale (STORY.md 10e): the bellwright's daughter who rang Thrale's bell without leave and was shut in the
# great ring of the Night Gaol for it. Level 9's boss. One rigid mesh per game bone (js/rig.js skeleton at scale 1), named
# ringer:<bone>__<piece>[.n]. The game scales her 1.85x. Rest pose: upright, arms hanging. Game axes (x = the figure's
# left, y up, z forward), through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.38, y 1.55, elbows
# y 1.25, wrists .95; hips x +-.15, y .90, knees .45. The clapper is baked on the `weapon` bone (origin the right wrist,
# its shaft along +z through the fist). Model bones: loinF (0, .93, .2), loinB (0, .93, -.2); chainL (.45, 1.03, 0), the
# broken chain that hangs plumb from her left fetter (anim.hang).
# The look: a prisoner, gaunt and tall, her head shaved, in a long sackcloth shift slit at the sides, over it the scorched
# leather apron of a bell foundry; bare sinewy arms and big bellwright's hands; iron fetters at wrists and ankles, broken
# chains hanging from them; rag-wrapped shins and bare feet. Her head is shut in a scold's bridle (the iron cage they put
# on those who spoke out of turn: hoops round the skull, a plate over the mouth) with a small bell on its crown, so that
# she rings when she moves. For a belt, a length of bell rope with its striped woollen sally hanging at her hip. Her
# weapon is the clapper of Thrale's bell: a long iron shaft with a heavy ball worn bright where it struck, its eye still
# on a chain round her wrist. Boss budget: about 14,000.
import sys, math, random
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'skin': (0.56, 0.52, 0.5), 'iron': (0.22, 0.2, 0.19), 'bronze': (0.55, 0.42, 0.22), 'struck': (0.62, 0.6, 0.56),
       'shift': (0.5, 0.48, 0.42), 'apron': (0.26, 0.18, 0.12), 'wrap': (0.42, 0.38, 0.32), 'rope': (0.6, 0.55, 0.42),
       'sally': (0.5, 0.12, 0.1)}, prefix='ringer:')

SX, EL, WR = .38, 1.25, .95

def link(bm, c, axis, r=.024, w=.012, along=(0, -1, 0), sides=5, segs=8):
    """One oval chain link centred at c, long along `along`, its loop's plane holding `along` and `axis`."""
    c, a, b = Vector(c), Vector(along).normalized(), Vector(axis).normalized()
    pts = [c + a * math.cos(t) * r * 1.5 + b * math.sin(t) * r for t in [k / segs * math.tau for k in range(segs)]]
    pts.append(pts[0])
    tube(bm, [tuple(p) for p in pts], [w] * len(pts), sides)

def chain(bm, p0, p1, n, r=.024, w=.011, broken=False):
    """n links from p0 to p1, each turned a quarter from the last; the last one open if broken."""
    p0, p1 = Vector(p0), Vector(p1); d = p1 - p0; a = d.normalized()
    side = a.cross(Vector((0, 0, 1)) if abs(a.z) < .9 else Vector((1, 0, 0))).normalized(); up = a.cross(side).normalized()
    for k in range(n):
        c = p0 + d * ((k + .5) / n); ax = side if k % 2 == 0 else up
        if broken and k == n - 1:   # the end link, sprung open: a hook
            pts = [c + a * math.cos(t) * r * 1.5 + ax * math.sin(t) * r for t in [j / 8 * math.tau * .72 for j in range(7)]]
            tube(bm, [tuple(p) for p in pts], [w] * len(pts), 5)
        else:
            link(bm, c, ax, r, w, a)

# ==== HEAD ==================================================================================================================
# ---- a gaunt face under the cage, the head shaved --------------------------------------------------------------------------
def face(bm):
    blob(bm, (0, 1.84, -.012), .092, (.9, 1.1, 1.08), 3)          # the skull
    blob(bm, (0, 1.735, .028), .06, (.92, .86, .98), 3)           # the jaw, narrow
    blob(bm, (0, 1.692, .066), .023, (1.05, .9, .9), 2)           # the chin
    for s in (-1, 1):
        blob(bm, (s * .052, 1.792, .06), .026, (1.0, .72, .75), 2)    # high cheekbones
        blob(bm, (s * .03, 1.83, .08), .02, (1.5, .5, .55), 2)        # the brows
        blob(bm, (s * .088, 1.79, -.01), .022, (.42, 1.15, .82), 1)   # the ears
        blob(bm, (s * .038, 1.645, .022), .016, (.7, 2.2, .7), 1)     # the neck's cords
    blob(bm, (0, 1.788, .09), .015, (.75, 1.8, 1.3), 2)           # the nose, long
    tube(bm, [(0, 1.73, -.014), (0, 1.66, -.012), (0, 1.58, -.008)], [.05, .048, .056], 10)   # the neck, thin
soft('head__skin', face, 1100, voxel=.0055)
# ---- the scold's bridle: an iron cage shut round the head, a plate over the mouth, a bell on the crown ----------------------------
def arc(c, r, a0, a1, n, plane):
    """Points on an arc round c: plane 'xy' (side to side over the crown), 'zy' (front to back), 'xz' (round the head)."""
    out = []
    for k in range(n + 1):
        t = a0 + (a1 - a0) * k / n
        if plane == 'xy': out.append((c[0] + math.sin(t) * r[0], c[1] + math.cos(t) * r[1], c[2]))
        elif plane == 'zy': out.append((c[0], c[1] + math.cos(t) * r[1], c[2] + math.sin(t) * r[0]))
        else: out.append((c[0] + math.sin(t) * r[0], c[1], c[2] + math.cos(t) * r[1]))
    return out
def bridle(bm):
    B = .007
    for y, rx, rz in ((1.838, .103, .118), (1.745, .088, .102)):   # the brow hoop and the jaw hoop
        p = arc((0, y, -.008), (rx, rz), 0, math.tau, 24, 'xz'); tube(bm, p, [B * 1.3] * len(p), 6)
    p = arc((0, 1.838, -.012), (.12, .112), -1.45, 1.45, 14, 'zy'); tube(bm, p, [B] * len(p), 6)   # brow to nape over the crown
    p = arc((0, 1.838, -.012), (.104, .112), -1.45, 1.45, 14, 'xy'); tube(bm, p, [B] * len(p), 6)  # ear to ear over the crown
    for s in (-1, 1):                                                # straps down the cheeks, and down the back of the head
        tube(bm, [(s * .101, 1.838, .0), (s * .095, 1.79, .004), (s * .087, 1.745, .006)], [B] * 3, 6)
        tube(bm, [(s * .05, 1.83, -.115), (s * .055, 1.78, -.11), (s * .05, 1.745, -.098)], [B] * 3, 6)
    tube(bm, [(0, 1.838, .11), (0, 1.79, .1), (0, 1.765, .1)], [B] * 3, 6)   # the nose bar, down to the plate
    p = arc((0, 1.655, -.01), (.068, .07), 0, math.tau, 18, 'xz'); tube(bm, p, [B * 1.6] * len(p), 6)  # the collar
    for s in (-1, 1): tube(bm, [(s * .062, 1.66, .02), (s * .078, 1.7, .02), (s * .085, 1.745, .012)], [B] * 3, 6)
    blob(bm, (0, 1.65, -.08), .016, (1.2, 1.4, .8), 1)               # the lock at the nape
    # the mouth plate (the bit): a curved iron plate over the mouth and chin
    shell(bm, (0, 1.735, .01), .078, .034, .092, -.9, .9, -.85, .85, nu=8, nv=3)
    # the bell's bracket on the crown
    tube(bm, [(-.03, 1.935, -.01), (-.02, 2.03, -.01), (.02, 2.03, -.01), (.03, 1.935, -.01)], [.007] * 4, 5)
hard('head__iron', bridle, outward=(0, 1.79, -.01))
def crown_bell(bm):   # a small bell hung under the bracket's arch, its clapper showing
    loft(bm, [(2.04, 0, -.01, .01, .01), (2.034, 0, -.01, .026, .026), (2.018, 0, -.01, .034, .034), (1.99, 0, -.01, .036, .036),
              (1.966, 0, -.01, .043, .043), (1.952, 0, -.01, .056, .056), (1.946, 0, -.01, .062, .062), (1.943, 0, -.01, .06, .06)], 16, cap=True)
hard('head__bronze', crown_bell)

# ==== CHEST: the sackcloth shift, sleeveless, and the foundry apron's bib =========================================================
SHIFT = [(1.625, -.012, .068, .062), (1.6, -.012, .13, .1), (1.565, -.005, .23, .14), (1.52, 0, .285, .158), (1.45, .008, .255, .165),
         (1.33, .01, .21, .15), (1.2, 0, .165, .122), (1.08, 0, .18, .13), (1.0, 0, .2, .142)]
def drape(a, y):   # loose weave hanging in shallow folds below the bust
    return .012 * math.sin(a * 9 + y * 20) * max(0.0, min(1.0, (1.45 - y) / .2))
hard('chest__shift', lambda bm: loft(bm, [(y, 0, cz, rx, rz) for y, cz, rx, rz in SHIFT], 26, cap=True, push=drape))
def shift_at(a, y, out=0.0):
    cz, rx, rz = lerp_rows(SHIFT, y)
    return Vector((math.sin(a) * (rx + out), y, cz + math.cos(a) * (rz + out)))
def lerp_rows(rows, y):
    if y >= rows[0][0]: return rows[0][1:]
    for r0, r1 in zip(rows, rows[1:]):
        if r1[0] <= y <= r0[0]:
            f = (y - r0[0]) / (r1[0] - r0[0]); return tuple(a + (b - a) * f for a, b in zip(r0[1:], r1[1:]))
    return rows[-1][1:]
def bib(bm):   # the apron's bib, curved over the chest; its neck strap round the back of the neck
    def at(u, v):
        y = 1.5 - .5 * v; a = (u - .5) * (1.15 - .2 * v); p = shift_at(a, y, .018)
        return tuple(p)
    sheet(bm, 6, 6, at)
hard('chest__apron', bib, thick=.01, outward=(0, 1.25, -.2))
def bib_strap(bm):
    for s in (-1, 1):
        a = s * .55; p0 = shift_at(a, 1.5, .024)
        tube(bm, [tuple(p0), (s * .1, 1.6, .05), (s * .08, 1.64, -.03), (s * .02, 1.63, -.08)], [.009] * 4, 5)
    for s in (-1, 1):   # rivets at the strap's ends
        stud(bm, tuple(shift_at(s * .55, 1.49, .03)), .009)
hard('chest__iron', bib_strap)
hard('chest__apron.1', lambda bm: [tube(bm, [(s * .1, 1.6, .05), (s * .08, 1.645, -.03), (0, 1.635, -.085)], [.011] * 3, 5) for s in (-1, 1)])

# ==== SPIN: the shift over the hips, the bell-rope belt =====================================================================
hard('spin__shift', lambda bm: loft(bm, [(1.06, 0, 0, .195, .14), (.9, 0, .005, .225, .165), (.7, 0, 0, .24, .175)], 16, cap=False), thick=.008)
def belt(bm):   # a length of bell rope wound twice round the waist, knotted at her left front
    for k, y in enumerate((1.03, 1.0)):
        p = arc((0, y, .003), (.212 + .004 * k, .158 + .004 * k), 0, math.tau, 22, 'xz'); tube(bm, p, [.014] * len(p), 6)
    blob(bm, (.13, 1.0, .14), .03, (1.2, 1.0, .8), 2)   # the knot
soft('spin__rope', belt, 600, voxel=.006)

# ---- the shift's skirt, front and back, slit at the sides, to mid-calf, torn; the apron over the front ----------------------------
for bone, s, w, seed in (('loinF', 1, .4, 3), ('loinB', -1, .44, 6)):
    hard(f'{bone}__shift', lambda bm, s=s, w=w, seed=seed: sheet(bm, 6, 7, lambda u, v: (
        (u - .5) * w * (1 + .3 * v), .78 - .58 * v, s * (.17 + .05 * v - .25 * ((u - .5) * w) ** 2) + .012 * math.sin(u * 14)), ragged=.12, seed=seed),
        outward=(0, .5, -s * .3))
def apron(bm):   # the foundry apron: heavy leather to below the knee, burned at the hem
    sheet(bm, 5, 6, lambda u, v: ((u - .5) * (.34 + .06 * v), .99 - .6 * v, .195 + .045 * v - .3 * ((u - .5) * .36) ** 2), ragged=.03, seed=11)
hard('loinF__apron', apron, thick=.012, outward=(0, .7, -.3))
def ties(bm):   # the apron's ties, knotted at the small of her back, the ends hanging
    blob(bm, (0, 1.04, -.165), .026, (1.4, .9, .7), 1)
    for s_ in (-1, 1):
        tube(bm, [(s_ * .01, 1.035, -.17), (s_ * .05, .95, -.185), (s_ * .065, .82, -.19), (s_ * .06, .74, -.188)], [.011, .01, .009, .007], 5)
hard('loinB__apron', ties)
def sally(bm):   # the rope's end hangs at her left hip with its striped woollen sally: the red bands here
    for k in range(3):
        y = .93 - .06 * k
        loft(bm, [(y, .19, .12, .03, .03), (y - .028, .19, .12, .03, .03)], 10, cap=True)
hard('loinF__sally', sally)
def sally_rope(bm):   # the rope through it, the pale bands between, and the frayed tail
    tube(bm, [(.15, 1.0, .14), (.18, .97, .13), (.19, .93, .12), (.19, .74, .12), (.192, .66, .118)], [.012] * 5, 6)
    for k in range(3):
        y = .93 - .06 * k - .028
        loft(bm, [(y, .19, .12, .029, .029), (y - .032, .19, .12, .029, .029)], 10, cap=True)
    for j in range(5):
        a = j / 5 * math.tau
        tube(bm, [(.19, .66, .12), (.19 + .012 * math.sin(a), .6, .12 + .012 * math.cos(a))], [.005, .002], 4)
hard('loinF__rope', sally_rope)

def box_(bm, c, h):
    c = Vector(c); vs = []
    for dx, dy, dz in ((-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1), (-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)):
        vs.append(bm.verts.new(G(*(c + Vector((dx * h[0], dy * h[1], dz * h[2]))))))
    for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (2, 3, 7, 6), (1, 2, 6, 5), (0, 4, 7, 3)):
        bm.faces.new([vs[i] for i in f])

# ==== ARMS: bare, sinewy; the hands big; iron fetters at the wrists ===============================================================
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    def upper(bm, x=x, s=s):
        blob(bm, (x - s * .012, 1.515, -.004), .058, (1.05, .95, 1.0), 2)        # the shoulder
        tube(bm, [(x - s * .01, 1.53, 0), (x, 1.42, .004), (x, EL + .02, 0)], [.05, .048, .042], 8)
        blob(bm, (x, 1.41, .02), .03, (.8, 1.7, .75), 2)                        # the biceps
        blob(bm, (x + s * .006, 1.42, -.02), .032, (.85, 1.8, .8), 2)            # the triceps
    soft(f'arm{n}__skin', upper, 520, voxel=.0058)
    def cap_sleeve(bm, x=x, s=s):   # the shift's short sleeve over the shoulder, its hem torn
        rows = [(1.585, x - s * .13, -.006, .03, .09), (1.565, x - s * .06, -.004, .06, .1), (1.53, x - s * .01, -.002, .064, .072), (1.48, x + s * .002, 0, .062, .064), (1.43, x + s * .004, .002, .066, .066)]
        loft(bm, rows, 12, cap=False, push=lambda a, y: (.05 * math.sin(a * 5 + s) if y < 1.45 else 0))
    hard(f'arm{n}__shift', cap_sleeve, thick=.006)
    def fore(bm, x=x, s=s):
        tube(bm, [(x, EL + .02, 0), (x, EL - .1, .006), (x, WR + .08, .002), (x, WR + .02, 0)], [.044, .043, .034, .032], 8)
        blob(bm, (x, EL - .1, .014), .034, (.9, 1.8, .8), 2)                      # the forearm's swell
        # a big closed fist, the bellwright's hand: knuckles, four fingers rolled under, the thumb across
        blob(bm, (x + s * .028, WR - .03, 0), .06, (.62, 1.0, 1.15), 2)
        for zf in (-.042, -.014, .014, .042):
            tube(bm, [(x + s * .04, WR - .035, zf), (x + s * .03, WR - .092, zf * 1.1), (x - s * .03, WR - .098, zf * 1.1), (x - s * .052, WR - .045, zf)],
                 [.019, .018, .017, .016], 6)
        tube(bm, [(x + s * .022, WR - .008, .06), (x - s * .016, WR - .002, .072), (x - s * .05, WR - .016, .064)], [.018, .017, .015], 6)
    soft(f'elbow{n}__skin', fore, 700, voxel=.0052)
    hard(f'elbow{n}__wrap', lambda bm, x=x: loft(bm, [(WR + .16, x, .002, .042, .042), (WR + .1, x, .002, .046, .046), (WR + .04, x, 0, .044, .044), (WR + .01, x, 0, .04, .04)], 10, cap=False,
         push=lambda a, y: .06 * abs(math.sin(a * 2 + y * 60)) ** 6), thick=.006)
    def fetter(bm, x=x, s=s):   # a thick iron cuff, its hinge and lock
        loft(bm, [(WR + .115, x, .002, .062, .062), (WR + .1, x, .002, .068, .068), (WR + .055, x, .002, .068, .068), (WR + .04, x, .002, .062, .062)], 12, cap=False)
        loft(bm, [(WR + .1, x, .002, .052, .052), (WR + .055, x, .002, .052, .052)], 12, cap=False)
        tube(bm, [(x - s * .07, WR + .095, 0), (x - s * .07, WR + .06, 0)], [.014, .014], 6)   # the hinge
        box_(bm, (x, WR + .078, .072), (.02, .022, .008))                                    # the lock plate
        if s < 0:   # the right cuff: two links left, and the run of chain to the clapper's eye (on the clapper)
            chain(bm, (x + .06, WR + .08, -.02), (x + .1, WR + .0, -.05), 2, broken=True)
    hard(f'elbow{n}__iron', fetter)

# ---- the broken chain that hangs from her left fetter (its own bone, chainL at (.45, 1.03, 0)) ------------------------------------
hard('chainL__iron', lambda bm: chain(bm, (.45, 1.03, 0), (.45, .46, 0), 10, r=.026, w=.012, broken=True))

# ==== LEGS: thin under the shift; shins wrapped in rags; bare feet; fetters at the ankles ==========================================
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .14
    soft(f'leg{n}__skin', lambda bm, hx=hx: tube(bm, [(hx, .97, -.01), (hx * 1.03, .72, 0), (hx, .47, .01)], [.1, .078, .056], 8), 160, voxel=.01)
    def shin(bm, hx=hx, s=s):
        tube(bm, [(hx, .49, .008), (hx, .36, .0), (hx, .2, -.006), (hx, .09, -.01)], [.055, .052, .04, .034], 8)
        blob(bm, (hx, .45, .045), .03, (1.1, 1.0, .7), 2)                               # the knee
        blob(bm, (hx, .045, .045), .044, (.85, .5, 1.75), 2)                             # the foot
        blob(bm, (hx, .05, -.035), .038, (.8, .9, .9), 2)                                # the heel
        for k in range(5):                                                               # the toes
            tz = .118 - .004 * abs(k - 1); tx = hx - s * (-.026 + .013 * k)
            blob(bm, (tx, .025, tz), .011 - .001 * k, (1.0, .8, 1.3), 1)
    soft(f'knee{n}__skin', shin, 700, voxel=.0055)
    def rags(bm, hx=hx, s=s):   # strips wound round the shin, crossing, and once under the arch
        for k in range(4):
            y0 = .4 - .07 * k; tilt = .035 * (1 if k % 2 else -1); r = .058 - .004 * k
            rows = [(y0 + .026, hx, 0, r, r), (y0 - .026, hx, -.002, r - .001, r - .001)]
            rs = [figure_lib.ring(bm, y, cx, cz, rx, rz, 10, push=lambda a, yy, k=k: .04 * math.sin(a * 2 + k)) for (y, cx, cz, rx, rz) in rows]
            for ring_ in rs:
                for v in ring_:
                    g = Vector((v.co.x, v.co.z, -v.co.y)); v.co.z += tilt * (g.z / max(r, 1e-3))
            figure_lib.bridge(bm, rs, True, False)
        loft(bm, [(.075, hx, .03, .05, .05), (.045, hx, .035, .05, .052)], 9, cap=False)
    hard(f'knee{n}__wrap', rags, thick=.006)
    def anklet(bm, hx=hx, s=s):
        loft(bm, [(.15, hx, -.008, .05, .05), (.135, hx, -.008, .056, .056), (.11, hx, -.008, .056, .056), (.095, hx, -.008, .05, .05)], 12, cap=False)
        loft(bm, [(.135, hx, -.008, .044, .044), (.11, hx, -.008, .044, .044)], 12, cap=False)
        chain(bm, (hx + s * .05, .1, -.01), (hx + s * .09, .03, -.06), 2, r=.02, w=.009, broken=True)
    hard(f'knee{n}__iron', anklet)

# ==== THE CLAPPER (on the weapon bone): the long iron shaft, the heavy ball worn bright, the flight, the eye on its chain ==========
BX, BY = -SX, WR - .045
def shaft(bm):
    tube(bm, [(BX, BY, -.14), (BX, BY, .2), (BX, BY, .6), (BX, BY, .86)], [.026, .028, .033, .04], 8)
    p = arc((BX, BY, -.2), (.055, .045), 0, math.tau, 14, 'zy'); tube(bm, p, [.014] * len(p), 6)   # the eye, where it hung
    # the ball: heavy and pear-shaped, then the flight below it
    rows = [(.86, .042), (.92, .08), (.99, .118), (1.03, .128)]
    rings = [[bm.verts.new(G(BX + math.sin(k / 14 * math.tau) * r, BY + math.cos(k / 14 * math.tau) * r, z)) for k in range(14)] for z, r in rows]
    figure_lib.bridge(bm, rings, True, False)
    rows2 = [(1.12, .128), (1.18, .108), (1.24, .07), (1.3, .048), (1.4, .04), (1.44, .052), (1.47, .03)]
    rings2 = [[bm.verts.new(G(BX + math.sin(k / 14 * math.tau) * r, BY + math.cos(k / 14 * math.tau) * r, z)) for k in range(14)] for z, r in rows2]
    figure_lib.bridge(bm, rings2, True, False)
    bm.faces.new(rings[0]); bm.faces.new(list(reversed(rings2[-1])))
    for z in (.34, .7):   # forged collars down the shaft
        tube(bm, [(BX, BY, z - .014), (BX, BY, z + .014)], [.04, .04], 8)
hard('weapon__iron', shaft)
def struck(bm):   # the ball's widest band, rubbed bright where it struck the bell for a hundred years
    rows = [(1.03, .13), (1.07, .138), (1.12, .13)]
    rings = [[bm.verts.new(G(BX + math.sin(k / 14 * math.tau) * r, BY + math.cos(k / 14 * math.tau) * r, z)) for k in range(14)] for z, r in rows]
    figure_lib.bridge(bm, rings, True, False)
hard('weapon__struck', struck)
def eye_chain(bm):   # from the eye a short sagging run of chain back to her right fetter
    chain(bm, (BX, BY - .03, -.24), (BX - .02, BY - .1, -.12), 2)
    chain(bm, (BX - .02, BY - .1, -.12), (BX - .03, BY + .02, -.04), 2)
hard('weapon__iron.1', eye_chain)
def grip(bm):   # rag binding where her hands go
    tube(bm, [(BX, BY, -.1), (BX, BY, .3)], [.034, .034], 8)
hard('weapon__wrap', grip)

result = tally()
