# The Puppet Knight, the summon of the Puppet Knight ability (design/abilities/puppet-knight.md): a life-size marionette
# of a knight carved in dark wood that drops from above on strings of light and fights the boss in jerky, snapping blows.
# One rigid mesh per game bone (js/rig.js skeleton at scale 1, MODEL_DEFS.puppetKnight), named puppet:<bone>__<slot>[.n],
# each built at its bone's absolute rest place, so its key poses (puppetChop, puppetSpin, its slack guard and its cry)
# drive it (js/summon-figures.js). A marionette is rigid parts already: each limb is one carved block between two balls.
# Rest pose: upright, arms hanging. Game axes (x = the figure's left, y up, z forward), written to Blender through G().
# Bones at rest: spin (0, .95, 0), chest (0, 1.0, 0), neck (0, 1.62, 0), head (0, 1.69, 0); arms at x +-.32, y 1.55,
# elbows y 1.25, wrists y .95; hips x +-.13, y .90, knees .45; loinF (0, .93, .14), loinB (0, .93, -.14) for the
# surcoat's carved skirt.
# The look: a cracked great helm with a narrow visor slit, a barrel chest carved like a breastplate under a surcoat with
# chipped paint, ball joints showing at the shoulders, elbows, hips and knees, blocky carved hands and feet, a wooden sword
# with a nicked edge in the right fist and a small round wooden buckler on the left. Brass screw-eyes at the top of the
# helm, the backs of the wrists and the fronts of the knees, where the strings tie on. No crest or emblem.
# Slots, drawn by the figures' summon shader (lit, in cel bands): `wood` (dark-stained, near ink), `paint` (the surcoat's
# faded paint), `joint` (the ball joints and screw-eyes: the game makes them glow blue), `crack` (the helm's crack and
# visor slit: white-hot).
# Budget: about 3,200 triangles. Height 2.0 m in the game (MODEL_DEFS scale).
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib, snow_lib, figure_lib; importlib.reload(snow_lib); importlib.reload(figure_lib)
from snow_lib import G, blob, box
from snow_lib import tube as stube
from figure_lib import *
import bpy, bmesh
from mathutils import Vector

begin({'wood': (0.16, 0.13, 0.09), 'paint': (0.36, 0.2, 0.17), 'joint': (0.56, 0.72, 0.86), 'crack': (0.95, 0.97, 0.98)},
      prefix='puppet:')

SX, HX = .32, .13

def ball(bm, c, r): blob(bm, c, r, (1, 1, 1), 1)
def eye(bm, c, axis='z', r=.022):
    """A screw-eye: a small ring of brass standing off the wood, its hole along `axis`."""
    pts = []
    for k in range(9):
        a = k / 8 * math.tau
        if axis == 'z': pts.append((c[0] + math.sin(a) * r, c[1] + math.cos(a) * r, c[2]))
        elif axis == 'x': pts.append((c[0], c[1] + math.cos(a) * r, c[2] + math.sin(a) * r))
        else: pts.append((c[0] + math.sin(a) * r, c[1], c[2] + math.cos(a) * r))
    stube(bm, pts, [.006] * 9, 4, cap=False)

# ---- head: the great helm, flat-topped, a visor slit and a crack ------------------------------------------------------
def helm(bm):
    loft(bm, [(1.6, 0, .0, .1, .1), (1.64, 0, .01, .125, .13), (1.8, 0, .012, .13, .14), (1.9, 0, .005, .125, .13), (1.93, 0, 0, .1, .105)],
         sides=10)
    loft(bm, [(1.79, 0, .03, .135, .125), (1.83, 0, .03, .135, .125)], sides=10)   # a riveted band at the brow
hard('head__wood', helm, smooth=False)
def slit(bm):
    box(bm, -.085, .085, 1.785, 1.8, .135, .152)                  # the visor slit
    pts = [(.03, 1.93, .1), (.045, 1.88, .125), (.03, 1.85, .14), (.055, 1.81, .15), (.04, 1.74, .148), (.065, 1.68, .14)]
    stube(bm, pts, [.006, .007, .006, .007, .006, .004], 3)      # the crack, from the crown down past the slit
hard('head__crack', slit, smooth=False)
hard('head__joint', lambda bm: eye(bm, (0, 1.955, 0), 'x'))
def neck(bm):
    ball(bm, (0, 1.6, 0), .06)
hard('neck__joint', neck)

# ---- chest: a barrel carved like a breastplate, the shoulder balls ----------------------------------------------------
def chest(bm):
    loft(bm, [(1.02, 0, 0, .15, .11), (1.2, 0, .02, .18, .14), (1.4, 0, .03, .22, .15), (1.52, 0, .01, .24, .13), (1.57, 0, 0, .14, .1)], sides=10)
hard('chest__wood', chest, smooth=False)
def surcoat(bm):
    def front(u, v):
        x = (u - .5) * .34; y = 1.48 - .5 * v
        return (x, y, .03 + .165 * math.sqrt(max(0, 1 - (x / .26) ** 2)) * (1 - .15 * v) + .012)
    sheet(bm, 4, 3, front)
    def back(u, v):
        x = (u - .5) * .34; y = 1.48 - .5 * v
        return (x, y, -.15 * math.sqrt(max(0, 1 - (x / .26) ** 2)) - .015)
    sheet(bm, 4, 3, back)
hard('chest__paint', surcoat, thick=.01, outward=(0, 1.25, 0))
def shoulders(bm):
    for s in (1, -1): ball(bm, (s * SX, 1.55, 0), .062)
hard('chest__joint', shoulders)

# ---- spin: a carved pelvis block, the hip balls --------------------------------------------------------------------
def pelvis(bm):
    loft(bm, [(.86, 0, 0, .16, .11), (.95, 0, 0, .17, .115), (1.03, 0, 0, .15, .1)], sides=8)
hard('spin__wood', pelvis, smooth=False)
def hip_balls(bm):
    for s in (1, -1): ball(bm, (s * HX, .9, 0), .058)
hard('spin__joint', hip_balls)
def tasset(z, sign, seed):
    def build(bm):
        r = random.Random(seed)
        for k in range(3):   # three carved plates, chipped at the hem
            x0 = -.16 + k * .11
            def at(u, v, x0=x0):
                x = x0 + .1 * u
                return (x, .92 - .25 * v, z * math.sqrt(max(.3, 1 - (x / .26) ** 2)) + sign * .04 * v)
            sheet(bm, 1, 2, at, ragged=.04, seed=seed + k)
    return build
hard('loinF__paint', tasset(.125, 1, 3), thick=.012, outward=lambda c: (0, c.y, 0))
hard('loinB__paint', tasset(-.125, -1, 9), thick=.012, outward=lambda c: (0, c.y, 0))

# ---- arms: carved blocks between balls, blocky hands; the sword in the right, the buckler on the left ------------------
for s, n in ((1, 'L'), (-1, 'R')):
    x = s * SX
    def upper(bm, x=x):
        loft(bm, [(1.5, x, 0, .05, .05), (1.4, x, 0, .058, .056), (1.3, x, 0, .05, .05)], sides=6)
    hard(f'arm{n}__wood', upper, smooth=False)
    def lower(bm, x=x):
        loft(bm, [(1.2, x, 0, .045, .045), (1.1, x, .005, .05, .05), (1.0, x, .01, .042, .042)], sides=6)
        box(bm, x - .035, x + .035, .86, .95, -.03, .055)            # the hand, a carved block
    hard(f'elbow{n}__wood', lower, smooth=False)
    def joints(bm, x=x, s=s):
        ball(bm, (x, 1.25, 0), .05)
        eye(bm, (x, .97, -.05), 'x')                                  # the wrist's screw-eye, on its back
    hard(f'elbow{n}__joint', joints)

def sword(bm):
    FX, FY = -SX, .9
    stube(bm, [(FX, FY, -.12), (FX, FY, .08)], [.02, .02], 6)                     # the grip
    box(bm, FX - .02, FX + .02, FY - .1, FY + .1, .08, .12)                        # the cross-guard, upright
    # a broad flat wooden blade, its edge nicked in three places
    nicks = {.35: .012, .55: .016, .72: .01}
    rows = []
    for k in range(11):
        t = k / 10; z = .12 + t * .95; w = .05 * (1 - .4 * t)
        cut = next((d for a, d in nicks.items() if abs(t - a) < .05), 0)
        rows.append([bm.verts.new(G(FX, FY + w, z)), bm.verts.new(G(FX + .014, FY, z)), bm.verts.new(G(FX, FY - w + cut, z)), bm.verts.new(G(FX - .014, FY, z))])
    tip = bm.verts.new(G(FX, FY, 1.13))
    for a, b in zip(rows, rows[1:]):
        for i in range(4):
            j = (i + 1) % 4; bm.faces.new((a[i], a[j], b[j], b[i]))
    for i in range(4): bm.faces.new((rows[-1][i], rows[-1][(i + 1) % 4], tip))
    bm.faces.new(list(reversed(rows[0])))
hard('elbowR__wood.1', sword, smooth=False)
def buckler(bm):
    # round, a low dome, held on the outside of the left forearm, facing out
    c = Vector((SX + .07, 1.07, .02)); rings = []
    for r, dx in ((.0, .05), (.09, .04), (.16, .02), (.17, 0), (.16, -.01)):
        rings.append([bm.verts.new(G(c.x + dx, c.y + math.cos(k / 12 * math.tau) * max(r, .001), c.z + math.sin(k / 12 * math.tau) * max(r, .001))) for k in range(12)])
    bridge(bm, rings, True, True)
hard('elbowL__wood.1', buckler, smooth=False)

# ---- legs: carved thighs and shins, the knee balls and their screw-eyes, blocky feet ----------------------------------
for s, n in ((1, 'L'), (-1, 'R')):
    hx = s * HX
    def thigh(bm, hx=hx):
        loft(bm, [(.84, hx, 0, .065, .065), (.68, hx, .005, .075, .072), (.51, hx, 0, .06, .06)], sides=6)
    hard(f'leg{n}__wood', thigh, smooth=False)
    def shin(bm, hx=hx):
        loft(bm, [(.4, hx, 0, .055, .055), (.25, hx, .01, .06, .06), (.05, hx, 0, .05, .05)], sides=6)
        box(bm, hx - .05, hx + .05, .0, .07, -.06, .16)                            # the foot
    hard(f'knee{n}__wood', shin, smooth=False)
    def knee(bm, hx=hx):
        ball(bm, (hx, .45, 0), .055)
        eye(bm, (hx, .46, .07), 'x')
    hard(f'knee{n}__joint', knee)

result = tally()
