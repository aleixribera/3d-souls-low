# The Empty Sentinel, the Ironbound's giant: a suit of armour whose wearer was fed to the Ember whole, still standing its
# post (STORY.md). One rigid mesh per game bone (js/rig.js skeleton at scale 1, MODEL_DEFS.emptySentinel), named
# sentinel:<bone>__<material slot>[.n], so every key pose, the walk and the death drive it. The game scales it 1.65x.
# Rest pose: upright, arms hanging (the model's posture leans it a little in the game).
# Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.42, y 1.55,
# both 4% longer (elbow y 1.238, wrist .926; the halberd's shaft runs along z through the right fist); hips x +-.15,
# y .90, knees .45. Extra bones: sashF (.09, .93, .185) and sashB (.06, .93, -.185) on the spin, the surcoat's hanging
# panels.
# The look (the MODEL_DEFS brief): ornate golden-brass plate with arabesque filigree over bronze mail. A tall narrow
# ovoid close-helm with a sharp keel down its face, a crest tuft on the crown, a dark eye slit and two columns of
# breathing holes (nothing inside but the dark); a wide ringed gorget; great horizontally flared pauldrons with upturned
# outer lips and a filigree crest; a heavy breastplate with a filigree plackart, crossed by a pale surcoat sash from the
# right shoulder to the left hip with dark border stripes, hanging front and back in panels with tattered hems; barrelled
# filigree vambraces with projecting couters and flared cuffs; filigree tassets and domed knee cops; keeled greaves and
# laminar sabatons. Enemy budget: 3,000 triangles with the halberd, which the kit still builds.
import sys, math
sys.path.insert(0, r"C:/Users/Aleix/Documents/CLAUDE/3d-souls-low/tools/blender")
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'plate': (0.62, 0.48, 0.22), 'filigree': (0.66, 0.5, 0.24), 'mail': (0.4, 0.28, 0.14), 'plume': (0.3, 0.22, 0.13),
       'cloth': (0.78, 0.77, 0.74), 'trim': (0.15, 0.14, 0.13), 'rags': (0.7, 0.69, 0.66), 'void': (0.02, 0.02, 0.02)},
      prefix='sentinel:')

SX, EL, WR = .42, 1.238, .926
SLIT = 1.885   # the eye slit: MODEL_DEFS.emptySentinel.eyes sit in it

# ---- head: a tall narrow ovoid close-helm, a sharp keel down the face, a filigree brow band, a crest tuft ---------------
def keel(a, y): return .2 * max(0.0, math.cos(a)) ** 12 + .06 * max(0.0, -math.cos(a)) ** 12
HELM = [(1.70, 0, -.005, .124, .13), (1.745, 0, -.005, .114, .124), (1.81, 0, -.005, .12, .132), (1.88, 0, -.008, .122, .134),
        (1.95, 0, -.012, .114, .126), (2.01, 0, -.016, .094, .104), (2.055, 0, -.02, .062, .07), (2.08, 0, -.022, .026, .03)]
hard('head__plate', lambda bm: loft(bm, HELM, 12, cap=True, push=keel))

def ray_points(ob, pts, lift=.003):
    """Project game points onto the helm along rays toward its centre line, lifted a little off the surface."""
    mw = ob.matrix_world.inverted(); out = []
    for p in pts:
        o = G(p[0] * 3, p[1], p[2] * 3 + .02); t = G(0, p[1], -.01)
        lo, ld = mw @ o, (mw @ t - mw @ o).normalized()
        ok, loc, nor, _ = ob.ray_cast(lo, ld)
        out.append(Vector((loc.x, loc.z, -loc.y)) + Vector((nor.x, nor.z, -nor.y)) * lift if ok else Vector(p))
    return out

def holes(bm):   # nothing inside: a dark eye slit across the visor and two columns of breathing holes below it
    ob = bpy.data.objects['sentinel:head__plate']; cols = 8; half = .85
    top = ray_points(ob, [(math.sin(-half + 2 * half * i / cols) * .14, SLIT + .008, math.cos(-half + 2 * half * i / cols) * .14) for i in range(cols + 1)])
    bot = ray_points(ob, [(math.sin(-half + 2 * half * i / cols) * .14, SLIT - .008, math.cos(-half + 2 * half * i / cols) * .14) for i in range(cols + 1)])
    a = [bm.verts.new(G(*p)) for p in top]; b = [bm.verts.new(G(*p)) for p in bot]
    for i in range(cols): bm.faces.new((a[i], a[i + 1], b[i + 1], b[i]))
    for s in (-1, 1):
        for k in range(4):
            y = 1.845 - k * .03
            c = ray_points(ob, [(s * .04, y, .13)])[0]
            q = [bm.verts.new(G(c.x + dx, c.y + dy, c.z)) for dx, dy in ((-.008, -.007), (.008, -.007), (.008, .007), (-.008, .007))]
            bm.faces.new(q)
hard('head__void', holes, outward=(0, 1.82, 0))

def brow(bm):   # an ornate band round the helm over the slit, following the keel
    loft(bm, [(1.93, 0, -.011, .121, .133), (1.905, 0, -.009, .126, .139)], 14, cap=False, push=keel)
hard('head__filigree', brow, outward=lambda c: (0, c.y, -.01))

def crest(bm):   # a short stiff tuft of horsehair fanning back from the crown
    for k, (dx, dz) in enumerate(((0, .0), (-.022, -.012), (.022, -.012), (-.012, -.03), (.012, -.03))):
        tube(bm, [(dx * .5, 2.07, .01 + dz), (dx, 2.13 - k * .006, -.04 + dz), (dx * 1.4, 2.12 - k * .008, -.12 + dz)], [.022, .016, .005], 3)
hard('head__plume', crest)

# ---- neck: mail under the gorget --------------------------------------------------------------------------------------
hard('neck__mail', lambda bm: loft(bm, [(1.74, 0, -.01, .088, .088), (1.6, 0, -.005, .1, .1)], 7, cap=False), outward=(0, 1.67, 0))

# ---- chest: the breastplate, a wide ringed gorget, a filigree plackart, the surcoat sash --------------------------------
CUIRASS = [(1.64, 0, -.01, .2, .14), (1.58, 0, .0, .29, .18), (1.46, 0, .02, .3, .2), (1.33, 0, .03, .265, .2),
           (1.2, 0, .02, .215, .17), (1.1, 0, .005, .195, .155)]
def ridge(a, y): return .07 * max(0.0, math.cos(a)) ** 8 * max(0, min(1, (1.6 - y) / .15))
def cuirass(bm):
    loft(bm, CUIRASS, 14, cap=True, push=ridge)
    for (y0, r0, y1, r1) in ((1.59, .255, 1.65, .205), (1.64, .21, 1.69, .16), (1.68, .165, 1.725, .132)):   # the gorget's rings
        loft(bm, [(y0, 0, -.01, r0, r0 * .76), (y1, 0, -.012, r1, r1 * .8)], 14, cap=False)
hard('chest__plate', cuirass)

def plackart(bm):   # an ornate plate over the upper breast, open at the back
    loft(bm, [(1.585, 0, .004, .292, .186), (1.5, 0, .022, .307, .206), (1.42, 0, .028, .292, .207), (1.37, 0, .03, .27, .205)], 8,
         cap=False, a0=-1.25, a1=1.25, push=ridge)
hard('chest__filigree', plackart, outward=lambda c: (0, c.y, -.05))

def torso(y):   # the cuirass's ellipse at height y (the belt and the fauld below it): centre z, rx, rz
    rows = [(1.0, 0, .01, .236, .186), (1.075, 0, .006, .21, .17)] + CUIRASS[::-1]
    if y <= rows[0][0]: return rows[0][2], rows[0][3], rows[0][4]
    for r0, r1 in zip(rows, rows[1:]):
        if y <= r1[0]:
            f = (y - r0[0]) / (r1[0] - r0[0])
            return tuple(r0[k] + (r1[k] - r0[k]) * f for k in (2, 3, 4))
    return rows[-1][2], rows[-1][3], rows[-1][4]
def band(a, off, lift):
    """A point of the sash: angle a round the torso, `off` up or down across it, `lift` off the plate. The sash runs
    from high on the right (a = -pi/2) to low on the left hip (a = pi/2)."""
    y = 1.38 - .23 * math.sin(a) + off
    cz, rx, rz = torso(y); r = 1 + ridge(a, y) + lift
    return (math.sin(a) * rx * r, y, cz + math.cos(a) * rz * r)
N = 16
def strip(bm, offs, lift):
    rows = [[bm.verts.new(G(*band(math.tau * i / N, o, lift))) for i in range(N)] for o in offs]
    bridge(bm, rows, True, False)
hard('chest__cloth', lambda bm: strip(bm, (.065, 0, -.065), .11), outward=lambda c: (0, c.y, -.01))
def borders(bm):
    for o in ((.05, .036), (-.036, -.05)): strip(bm, o, .12)
hard('chest__trim', borders, outward=lambda c: (0, c.y, -.01))

# ---- spin: a molded belt, two fauld lames, the mail skirt ------------------------------------------------------------------
hard('spin__plate', lambda bm: loft(bm, [(1.12, 0, .005, .2, .16), (1.075, 0, .006, .205, .164)], 10, cap=False), outward=(0, 1.1, 0))
def fauld(bm):
    loft(bm, [(1.08, 0, .006, .205, .164), (1.0, 0, .01, .232, .182)], 10, cap=False)
    loft(bm, [(1.015, 0, .01, .226, .178), (.93, 0, .014, .258, .198)], 10, cap=False)
hard('spin__filigree', fauld, outward=lambda c: (0, c.y + .05, 0))
hard('spin__mail', lambda bm: loft(bm, [(.95, 0, .0, .228, .172), (.84, 0, .0, .24, .18), (.76, 0, -.005, .246, .186)], 10, cap=False),
     outward=lambda c: (0, c.y, 0))

# ---- the surcoat's panels: pale cloth with dark border stripes, hems torn to rags at the knee -----------------------------
def panel(name, bone, w, top, rag, hem, back, seed):
    bx, by, bz = bone; sz = -1 if back else 1
    def at(u, v, y0, y1):   # across the thigh, bowed out over it
        x = bx + (u - .5) * w; y = y0 + (y1 - y0) * v
        return (x, y, bz + sz * (.012 * math.cos((u - .5) * math.pi) + .012 * (top - y) / (top - hem)))
    def cloth(bm): sheet(bm, 4, 3, lambda u, v: at(u, v, top, rag))
    hard(f'{name}__cloth', cloth, outward=(bx, (top + rag) / 2, bz - sz * .3))
    def stripes(bm):
        for u0, u1 in ((.06, .14), (.86, .94)):
            sheet(bm, 1, 3, lambda u, v, u0=u0, u1=u1: Vector(at(u0 + (u1 - u0) * u, v, top - .01, rag)) + Vector((0, 0, sz * .004)))
    hard(f'{name}__trim', stripes, outward=(bx, (top + rag) / 2, bz - sz * .3))
    hard(f'{name}__rags', lambda bm: sheet(bm, 6, 2, lambda u, v: at(u, v, rag + .005, hem), ragged=.12, seed=seed),
         outward=(bx, (rag + hem) / 2, bz - sz * .3))
panel('sashF', (.09, .93, .2), .25, 1.04, .62, .42, False, 5)
panel('sashB', (.06, .93, -.198), .27, 1.04, .6, .38, True, 9)

# ---- arms: mail sleeves under great flared pauldrons with a filigree crest and one rerebrace lame ---------------------------
PR, PY, PH = .2, 1.585, .13
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX; cx = s * .38
    hard(f'arm{n}__mail', lambda bm, x=x: loft(bm, [(1.6, x, 0, .078, .078), (1.42, x, 0, .074, .074), (EL + .03, x, 0, .068, .068)], 7, cap=True))
    def flare(p, a, e, cx=cx, s=s):   # flat and wide: low over the arm, the outer lip turned up, high against the neck
        d = (p.x - cx) * s; rim = (1 - e / (math.pi / 2)) ** 3
        return (p.x, p.y - .1 * max(0, d) + .5 * max(0, d - .12) * rim * 1.2 + .06 * max(0, -d), p.z)
    def pauldron(bm, x=x, s=s, cx=cx, flare=flare):
        shell(bm, (cx, PY, -.005), PR, PH, PR * .96, 0, math.pi / 2, 0, math.tau, nu=12, nv=3, warp=flare)
        side = s * math.pi / 2
        for (y0, y1, r) in ((1.55, 1.48, .108), (1.49, 1.42, .114)):   # two rerebrace lames stepping down over the arm
            loft(bm, [(y0, x + s * .012, -.005, r, r * 1.05), (y1, x + s * .02, -.005, r + .012, (r + .012) * 1.05)], 6, cap=False, a0=side - 1.9, a1=side + 1.9)
    hard(f'arm{n}__plate', pauldron, thick=.014)
    def dome(d, z, cx=cx, s=s, flare=flare):   # a point on the pauldron's top, d out from its centre and z forward
        r = min(math.hypot(d, z / .96), PR * .995); e = math.acos(r / PR); a = math.atan2(d * s, z / .96)
        p = Vector((cx + math.sin(a) * math.cos(e) * PR, PY + math.sin(e) * PH, -.005 + math.cos(a) * math.cos(e) * PR * .96))
        return Vector(flare(p, a, e)) + Vector((0, .006, 0))
    # an ornate inlay laid over the crown of the pauldron, front to back
    hard(f'arm{n}__filigree', lambda bm, s=s, dome=dome: sheet(bm, 1, 6, lambda u, v: dome(s * (.015 + .075 * u), .17 - .34 * v)),
         outward=(cx, PY - .1, -.005))

# ---- forearms: barrelled filigree vambraces with projecting couters and flared cuffs; gauntlets closed in a fist -------------
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    def couter(a, y): return .45 * max(0.0, -math.cos(a)) ** 3 * math.exp(-((y - (EL - .01)) / .035) ** 2)
    hard(f'elbow{n}__filigree', lambda bm, x=x, couter=couter: loft(bm, [
        (EL + .045, x, -.005, .064, .064), (EL + .01, x, -.01, .076, .08), (EL - .04, x, -.005, .072, .072), (EL - .12, x, 0, .068, .068),
        (WR + .12, x, 0, .06, .062), (WR + .06, x, 0, .064, .066), (WR + .03, x, 0, .08, .082), (WR + .012, x, 0, .074, .076)], 8, cap=True, push=couter))
    def gauntlet(bm, x=x, s=s):   # the fist closed round the grip (along z through the wrist): back of the hand outside
        blob(bm, (x + s * .028, WR - .02, 0), .059, (.62, 1.0, 1.15), 1)
        for zf in (-.04, -.013, .013, .04):
            tube(bm, [(x + s * .04, WR - .026, zf), (x + s * .029, WR - .081, zf * 1.1), (x - s * .026, WR - .087, zf * 1.1), (x - s * .047, WR - .04, zf)],
                 [.019, .018, .016, .014], 5)
        tube(bm, [(x + s * .02, WR - .007, .059), (x - s * .015, WR, .072), (x - s * .047, WR - .011, .064)], [.018, .016, .013], 5)   # the thumb
        if s > 0: blob(bm, (x - s * .006, WR - .055, 0), .036, (1.0, .9, 1.45), 1)   # the empty left fist: no hole through it
    soft(f'elbow{n}__plate', gauntlet, 90, voxel=.006)

# ---- legs: mail thighs under filigree tassets and domed knee cops; keeled greaves and laminar sabatons ------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * .15
    hard(f'leg{n}__mail', lambda bm, hx=hx: loft(bm, [(.97, hx, -.01, .126, .126), (.72, hx * 1.04, .0, .11, .11), (.47, hx, .01, .09, .09)], 8, cap=True))
    def tassets(bm, hx=hx, s=s):
        c = s * .5   # over the front and the outside of the thigh
        loft(bm, [(.95, hx + s * .005, .0, .13, .132), (.83, hx + s * .018, .006, .14, .142)], 6, cap=False, a0=c - 1.3, a1=c + 1.3)
        loft(bm, [(.855, hx + s * .014, .004, .13, .132), (.73, hx + s * .024, .01, .136, .138)], 6, cap=False, a0=c - 1.15, a1=c + 1.15)
        def point(p, a, e): return (p.x, p.y, p.z + .02 * max(0, math.cos(a)) * max(0, 1 - abs(e)))
        shell(bm, (hx, .455, .045), .08, .08, .064, -1.1, 1.25, -1.45, 1.45, nu=5, nv=3, warp=point)   # the knee cop
    hard(f'leg{n}__filigree', tassets, outward=lambda c, hx=hx: (hx, c.y, -.02))
    def shin(a, y): return .16 * max(0.0, math.cos(a)) ** 6 * max(0, min(1, (y - .12) / .2))   # the keel down the shin
    hard(f'knee{n}__plate', lambda bm, hx=hx, shin=shin: loft(bm, [(.43, hx, .004, .08, .082), (.33, hx, -.008, .09, .098),
                                                                 (.2, hx, .0, .074, .076), (.115, hx, .004, .07, .072)], 10, cap=True, push=shin))
    def sabaton(bm, hx=hx):
        blob(bm, (hx, .088, -.005), .068, (1.0, .95, 1.1), 1)           # the ankle
        for k in range(3): blob(bm, (hx, .07 - k * .008, .06 + k * .05), .062 - k * .006, (1.0, .8, .9), 1)   # the lames over the foot
        blob(bm, (hx, .045, .2), .04, (1.0, .75, 1.2), 1)               # the toe
        blob(bm, (hx, .048, -.055), .048, (1.0, .9, .8), 1)             # the heel
    soft(f'knee{n}__plate.1', sabaton, 80, voxel=.008)

result = tally()
