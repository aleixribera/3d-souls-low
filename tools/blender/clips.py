# The player's motion clips, authored in Blender (PLAN.md item 3c; pass 101). The wanderer's baked parts
# (tools/blender/out/wanderer.glb) are hung on an armature with the game's bones (js/bodykit.js boneSpec, the wanderer's
# proportions), the root travels exactly as the game moves the body, the feet are placed on the floor by IK (planted,
# skidding or swinging), and the rest is keyed in the game's own terms (each bone's local Euler, three.js 'XYZ' order;
# x is the figure's left, y up, z forward). Blender's Bezier curves carry it between keys. Each frame's pose is read
# back from the solved armature and written to js/baked/clips.js as every bone's local quaternion plus the hips'
# offset, which js/player-pose.js plays.
#   blender -b --factory-startup -P tools/blender/clips.py -- [clip ...] [--render=<dir>] [--no-write]
# --render: a frame every 2 (30 fps) from the sword side, a little behind, following the body (as tools/anim-strip.cjs).
#
# The dash (0.36 s; reference: a perfect dodge in a stylish action game, its feel only): one line from the driving
# foot to the head as the body launches nearly flat, the back leg flung out behind in line with the back, the front
# foot reaching for the floor, both arms and the blade trailing; the front foot lands and skids, the body sinks into a
# low crouch over it as the back foot comes down, then rises into a wide stance with the arms out for balance.
# Pass 101 (branch wip/p101-dash-clip): three blind judges scored this clip 4, 4, 3 against the hand-keyed dash's 3, 5, 5,
# so the game kept the hand-keyed one. Low hips read as a kneel, high hips as a leaning plank; see BACKLOG.md.
import bpy, sys, os, math, json
from mathutils import Vector, Quaternion, Euler, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
names = [a for a in argv if not a.startswith('--')] or ['dash']
render_dir = next((a[9:] for a in argv if a.startswith('--render=')), None)
write = '--no-write' not in argv

def glb_path():
    p = os.path.join(ROOT, 'tools', 'blender', 'out', 'wanderer.glb')
    if os.path.exists(p): return p
    main = ROOT.replace('\\', '/').split('/.claude/worktrees/')[0]   # a worktree reads the main checkout's exports
    return os.path.join(main, 'tools', 'blender', 'out', 'wanderer.glb')

def G(v): return Vector((v[0], -v[2], v[1]))              # game axes to Blender's
def Gq(q): return Quaternion((q.w, q.x, -q.z, q.y))      # a game-axes rotation in Blender's
def Bq(q): return Quaternion((q.w, q.x, q.z, -q.y))      # a Blender-axes rotation in the game's
def B(v): return (v[0], v[2], -v[1])

HIP, LEG = 0.95, 0.45
# name, parent, head, tail (game axes, rest). The limbs point along themselves so the legs' IK has real lengths.
BONES = [
    ('tip', None, (0, 0, 0), (0, 0.1, 0)),
    ('spin', 'tip', (0, HIP, 0), (0, 1.0, 0)),
    ('chest', 'spin', (0, 1.0, 0), (0, 1.62, 0)),
    ('neck', 'chest', (0, 1.62, 0), (0, 1.69, 0)),
    ('head', 'neck', (0, 1.69, 0), (0, 1.85, 0)),
    ('legL', 'spin', (0.15, 0.9, 0), (0.15, 0.45, 0)), ('kneeL', 'legL', (0.15, 0.45, 0), (0.15, 0.0, 0)),
    ('legR', 'spin', (-0.15, 0.9, 0), (-0.15, 0.45, 0)), ('kneeR', 'legR', (-0.15, 0.45, 0), (-0.15, 0.0, 0)),
    ('armL', 'chest', (0.3, 1.55, 0), (0.3, 1.25, 0)), ('elbowL', 'armL', (0.3, 1.25, 0), (0.3, 0.95, 0)),
    ('armR', 'chest', (-0.3, 1.55, 0), (-0.3, 1.25, 0)), ('elbowR', 'armR', (-0.3, 1.25, 0), (-0.3, 0.95, 0)),
    ('weapon', 'elbowR', (-0.3, 0.95, 0), (-0.3, 0.95, 0.3)),
    ('capeA', 'chest', (0, 1.55, -0.235), (0, 1.15, -0.235)), ('capeB', 'capeA', (0, 1.15, -0.235), (0, 0.75, -0.235)),
    ('capeC', 'capeB', (0, 0.75, -0.235), (0, 0.35, -0.235)), ('scarfTail', 'neck', (0.04, 1.62, -0.09), (0.04, 1.5, -0.09)),
]
EXPORT = ['spin', 'chest', 'neck', 'head', 'legL', 'kneeL', 'legR', 'kneeR', 'armL', 'elbowL', 'armR', 'elbowR', 'weapon']
# The game's resting posture (Rig.reset, then MODEL_DEFS.wanderer.posture): where every clip starts from.
REST = {'armL': (-0.1, 0, 0), 'armR': (-0.4, 0, 0), 'weapon': (0.5, 0, 0), 'chest': (0.14, 0, 0), 'neck': (0.1, 0, 0),
        'head': (0.04, 0, 0), 'elbowL': (-0.15, 0, 0), 'elbowR': (-0.28, 0, 0)}

STEP = 1 / 60
def dash_travel(f):   # metres the body has moved f frames into a dash (js/player.js: rollSpeed * (1 - rollSlow p^2))
    t = f * STEP; T = 0.36
    return 13.5 * (t - 0.62 * t ** 3 / (3 * T * T)) if t <= T else dash_travel(T / STEP)

# A clip: `frames` (60 fps, inclusive), `travel(f)` m forward, and keys by frame. A key sets bones (game local Euler),
# `hip` (the hips' offset from rest, game axes), and `footL` / `footR`: the sole's place on or over the floor, x and y
# in the body's frame, z as metres along the path from where the clip starts (`+` makes it relative to the body:
# ('+', x, y, dz) is dz ahead of the body at that frame). A foot unkeyed at a frame is eased between its keys.
CLIPS = {
    'dash': {
        'frames': 22, 'travel': dash_travel,
        'keys': {
            0: {'spin': (0.22, 0, 0), 'chest': (0.32, 0, 0), 'head': (-0.25, 0, 0), 'hip': (0, -0.08, 0.04),
                'armR': (0.3, 0.1, -0.2), 'elbowR': (-0.35, 0, 0), 'weapon': (0.9, 0, 0), 'armL': (0.25, 0, 0.25), 'elbowL': (-0.4, 0, 0),
                'footL': (0.15, 0, 0.12), 'footR': (-0.15, 0, -0.08)},
            2: {'footR': (-0.15, 0, -0.08)},   # the back foot drives until here
            4: {'spin': (0.55, 0, 0), 'chest': (0.3, -0.08, 0), 'head': (-0.65, 0.05, 0), 'hip': (0, -0.22, 0.1),
                'armR': (0.55, 0.15, -0.6), 'elbowR': (-0.15, 0, 0), 'weapon': (1.4, 0, 0), 'armL': (0.5, -0.1, 0.7), 'elbowL': (-0.2, 0, 0),
                'footL': ('+', 0.17, 0.1, 0.6), 'footR': ('+', -0.17, 0.1, -0.85)},   # the stride opens: lead foot reaching, back leg straight
            8: {'spin': (0.6, 0, 0), 'chest': (0.3, 0, 0), 'head': (-0.7, 0, 0), 'hip': (0, -0.24, 0.08),
                'armR': (0.55, 0.2, -0.9), 'elbowR': (-0.1, 0, 0), 'weapon': (1.5, 0, 0), 'armL': (0.5, -0.1, 1.0), 'elbowL': (-0.15, 0, 0),
                'footL': ('+', 0.18, 0.02, 0.68), 'footR': ('+', -0.18, 0.2, -0.9)},   # a long split skimming the floor
            11: {'footL': ('+', 0.2, 0, 0.6)},   # the front foot lands ...
            14: {'spin': (0.4, 0, 0), 'chest': (0.28, 0.06, 0), 'head': (-0.45, 0, 0), 'hip': (0, -0.24, -0.02),
                 'armR': (0.4, 0, -1.1), 'elbowR': (-0.25, 0, 0), 'weapon': (2.3, 0, 0), 'armL': (0.2, 0, 1.2), 'elbowL': (-0.45, 0, 0),
                 'footL': ('+', 0.26, 0, 0.52), 'footR': ('+', -0.28, 0.02, -0.66)},   # ... and skids; the back foot comes down wide
            18: {'spin': (0.3, 0, 0), 'chest': (0.24, 0, 0), 'head': (-0.3, 0, 0), 'hip': (0, -0.2, -0.03),
                 'armR': (0.3, 0, -1.0), 'elbowR': (-0.3, 0, 0), 'weapon': (2.0, 0, 0), 'armL': (0.1, 0, 1.1), 'elbowL': (-0.35, 0, 0),
                 'footL': ('+', 0.28, 0, 0.5), 'footR': ('+', -0.3, 0, -0.6)},   # held wide and low, arms out for balance
            22: {'spin': (0.2, 0, 0), 'chest': (0.2, 0, 0), 'head': (-0.15, 0, 0), 'hip': (0, -0.14, -0.03),
                 'armR': (0.0, 0, -0.8), 'elbowR': (-0.35, 0, 0), 'weapon': (1.5, 0, 0), 'armL': (0, 0, 0.9), 'elbowL': (-0.3, 0, 0),
                 'footL': ('+', 0.28, 0, 0.42), 'footR': ('+', -0.3, 0, -0.5)},
        },
    },
}

def game_quat(e): return Euler(e, 'ZYX').to_quaternion()   # three.js 'XYZ' (Rx Ry Rz) is Blender's 'ZYX'

def build_rig():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.import_scene.gltf(filepath=glb_path())
    parts = [o for o in bpy.data.objects if o.type == 'MESH']
    arm_data = bpy.data.armatures.new('rig'); rig = bpy.data.objects.new('rig', arm_data)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
    for name, parent, h, t in BONES:
        b = arm_data.edit_bones.new(name); b.head = G(h); b.tail = G(t); b.roll = 0
        if parent: b.parent = arm_data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    for o in parts:   # each baked part rides its bone, as in the game (rigid skinning)
        bone = o.name.split('__')[0]
        if bone not in arm_data.bones: continue
        mw = o.matrix_world.copy(); o.parent = rig; o.parent_type = 'BONE'; o.parent_bone = bone; o.matrix_world = mw
    # A stand-in blade on the weapon bone for the preview only (the game draws its own longsword).
    me = bpy.data.meshes.new('blade')   # flat, along the weapon bone's +z from the fist (kit-premium.js's longsword: 0.12 to 1.2 m)
    me.from_pydata([G(p) for p in [(-0.3, 0.91, 0.12), (-0.3, 0.99, 0.12), (-0.3, 0.98, 1.1), (-0.3, 0.95, 1.2), (-0.3, 0.92, 1.1)]], [], [(0, 1, 2, 3, 4)]); me.update()
    blade = bpy.data.objects.new('blade', me); bpy.context.scene.collection.objects.link(blade)
    mw = blade.matrix_world.copy(); blade.parent = rig; blade.parent_type = 'BONE'; blade.parent_bone = 'weapon'; blade.matrix_world = mw
    return rig

def set_local(pb, q_game):   # a game local rotation on a pose bone: R_b = Rrest^-1 Q Rrest (Q in Blender axes)
    r = pb.bone.matrix_local.to_quaternion()
    pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = r.inverted() @ Gq(q_game) @ r

def author(rig, C):
    sc = bpy.context.scene; sc.render.fps = 60; sc.frame_start = 0; sc.frame_end = C['frames'] + 6
    keys = C['keys']; frames = sorted(keys)
    # The root travels as the game moves the body (linear between frames: the game's own curve, sampled per frame).
    prefs = bpy.context.preferences.edit; prefs.keyframe_new_interpolation_type = 'LINEAR'
    for f in range(0, C['frames'] + 7):
        rig.location = G((0, 0, C['travel'](f))); rig.keyframe_insert('location', frame=f)
    prefs.keyframe_new_interpolation_type = 'BEZIER'
    # A target per sole (an empty keyed on Bezier curves); solve_legs reaches the legs to them.
    targets = {}
    for side in ('L', 'R'):
        tg = bpy.data.objects.new('foot' + side, None); sc.collection.objects.link(tg); targets[side] = tg
    # Bones and hips, keyed in the game's terms; every bone starts from the resting posture.
    pbs = rig.pose.bones
    for f in frames:
        k = keys[f]
        for name in EXPORT:
            if name in k or f == frames[0]:
                set_local(pbs[name], game_quat(k.get(name, REST.get(name, (0, 0, 0)))))
                pbs[name].keyframe_insert('rotation_quaternion', frame=f)
        if 'hip' in k or f == frames[0]:
            sp = pbs['spin']; r = sp.bone.matrix_local.to_quaternion()
            sp.location = r.inverted() @ G(k.get('hip', (0, 0, 0))); sp.keyframe_insert('location', frame=f)
        for side in ('L', 'R'):
            v = k.get('foot' + side)
            if v is None: continue
            if v[0] == '+': x, y, z = v[1], v[2], C['travel'](f) + v[3]
            else: x, y, z = v
            targets[side].location = G((x, y, z)); targets[side].keyframe_insert('location', frame=f)
    # Pose keys ease (Bezier, auto-clamped: no overshoot past a key); a foot holds still between equal keys.
    solve_legs(rig, C, targets)

# Two-bone IK, keyed every frame: thigh and shin (0.45 m each) reach from the hip to the sole's target, the knee bent
# toward the body's front and a little out (a straight chain gives Blender's own IK solver no side to bend to).
def solve_legs(rig, C, targets):
    sc = bpy.context.scene; pbs = rig.pose.bones
    frame = lambda d, f: Matrix((d, f, d.cross(f))).transposed()   # columns: along the bone, its front, its hinge
    down, fwd = Vector((0, 0, -1)), G((0, 0, 1))
    M0 = frame(down, fwd)
    for f in range(0, C['frames'] + 7):
        sc.frame_set(f)
        for side, sx in (('L', 1), ('R', -1)):
            leg, knee = pbs['leg' + side], pbs['knee' + side]
            leg.rotation_mode = knee.rotation_mode = 'QUATERNION'
            leg.rotation_quaternion = knee.rotation_quaternion = Quaternion()
        bpy.context.view_layer.update()
        for side, sx in (('L', 1), ('R', -1)):
            leg, knee = pbs['leg' + side], pbs['knee' + side]
            Dspin = pbs['spin'].matrix.to_quaternion() @ pbs['spin'].bone.matrix_local.to_quaternion().inverted()
            H = leg.head.copy(); T = targets[side].matrix_world.translation - rig.matrix_world.translation
            u = T - H; d = min(u.length, 2 * LEG * 0.999); u.normalize()
            hint = G((0.3 * sx, 0, 1)).normalized(); perp = (hint - u * hint.dot(u)).normalized()
            K = H + u * (d / 2) + perp * math.sqrt(max(0.0, LEG * LEG - (d / 2) ** 2))
            d1 = (K - H).normalized(); n = d1.cross(perp).normalized(); f1 = n.cross(d1)
            Dthigh = (frame(d1, f1) @ M0.inverted()).to_quaternion()
            d2 = (H + u * d - K).normalized(); f2 = n.cross(d2)
            Dshin = (frame(d2, f2) @ M0.inverted()).to_quaternion()
            for pb, Dp, Db in ((leg, Dspin, Dthigh), (knee, Dthigh, Dshin)):
                r = pb.bone.matrix_local.to_quaternion()
                pb.rotation_quaternion = r.inverted() @ (Dp.inverted() @ Db) @ r
                pb.keyframe_insert('rotation_quaternion', frame=f)
            bpy.context.view_layer.update()
    return targets

def sample(rig, C):
    sc = bpy.context.scene; out = {n: [] for n in EXPORT}; hip = []
    pbs = rig.pose.bones
    rest_spin = pbs['spin'].bone.head_local.copy()
    for f in range(0, C['frames'] + 1):
        sc.frame_set(f); bpy.context.view_layer.update()
        D = {}
        for name, parent, _, _ in BONES:
            pb = pbs[name]; D[name] = pb.matrix.to_quaternion() @ pb.bone.matrix_local.to_quaternion().inverted()
        for name in EXPORT:
            parent = pbs[name].parent.name
            q = Bq(D[parent].inverted() @ D[name]); q.normalize()
            if q.w < 0: q.negate()
            out[name].extend(round(c, 4) for c in (q.x, q.y, q.z, q.w))   # three.js order
        d = B(pbs['spin'].head - rest_spin)
        hip.extend(round(c, 4) for c in d)
    return {'fps': 60, 'frames': C['frames'] + 1, 'hip': hip, 'bones': out}

def feet_report(rig, C):   # where each sole is, frame by frame (height over the floor, and how far it slid)
    sc = bpy.context.scene; rows = []
    for f in range(0, C['frames'] + 1, 2):
        sc.frame_set(f); bpy.context.view_layer.update()
        row = [f]
        for side in ('L', 'R'):   # sole height, sole z from the body, knee ahead of the hip-to-sole line (+: bends forward)
            pb = rig.pose.bones['knee' + side]; g = B(pb.tail); h = B(rig.pose.bones['leg' + side].head); k = B(pb.head)
            mid = [(h[i] + g[i]) / 2 for i in range(3)]
            row.append((round(g[1], 2), round(g[2], 2), round(k[2] - mid[2], 2)))
        hip = B(rig.matrix_world @ rig.pose.bones['spin'].head); row.append(round(hip[1], 2))
        rows.append(row)
    return rows

def render(rig, C, outdir):
    sc = bpy.context.scene; os.makedirs(outdir, exist_ok=True)
    sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'MATERIAL'
    sc.render.resolution_x, sc.render.resolution_y = 640, 480
    if sc.world is None: sc.world = bpy.data.worlds.new('w')
    sc.world.color = (0.12, 0.11, 0.1)
    floor = bpy.data.meshes.new('floor'); floor.from_pydata([(-6, 8, 0), (6, 8, 0), (6, -14, 0), (-6, -14, 0)], [], [(0, 1, 2, 3)])
    fo = bpy.data.objects.new('floor', floor); sc.collection.objects.link(fo)
    cam_data = bpy.data.cameras.new('cam'); cam_data.lens = 26; cam = bpy.data.objects.new('cam', cam_data); sc.collection.objects.link(cam); sc.camera = cam
    for i, f in enumerate(range(0, C['frames'] + 6, 2)):
        sc.frame_set(f); z = C['travel'](f)
        # tools/anim-strip.cjs's camera, in the body's frame: 4 m to the sword side, 1.3 m behind, looking 0.4 m ahead.
        pos, look = G((-4.0, 1.5, z - 1.3)), G((0, 0.75, z + 0.4))
        cam.location = pos; cam.rotation_mode = 'QUATERNION'; cam.rotation_quaternion = (look - pos).to_track_quat('-Z', 'Y')
        sc.render.filepath = os.path.join(outdir, f'f{i:02d}.png'); bpy.ops.render.render(write_still=True)

results = {}
for name in names:
    C = CLIPS[name]
    rig = build_rig(); author(rig, C)
    results[name] = sample(rig, C)
    for row in feet_report(rig, C): print('FEET', name, row)
    if render_dir: render(rig, C, os.path.join(render_dir, name))
if write:
    path = os.path.join(ROOT, 'js', 'baked', 'clips.js')
    old = {}
    if os.path.exists(path):   # keep the clips this run didn't build
        src = open(path, encoding='utf8').read()
        for line in src.splitlines():
            if line.startswith('CLIPS.'): k, v = line[6:].split(' = ', 1); old[k] = v.rstrip(';')
    for k, v in results.items(): old[k] = json.dumps(v, separators=(',', ':'))
    with open(path, 'w', encoding='utf8', newline='\n') as fh:
        fh.write("'use strict';\n// Generated by tools/blender/clips.py (the player's motion clips, authored in Blender): do not edit.\n"
                 "// Per clip: fps, frames, `hip` (x, y, z per frame: the hips' offset from rest, m) and per bone x, y, z, w per frame\n"
                 "// (its local quaternion). Played by js/player-pose.js.\nvar CLIPS = CLIPS || {};\n")
        for k in sorted(old): fh.write(f'CLIPS.{k} = {old[k]};\n')
    print('WROTE', path)
