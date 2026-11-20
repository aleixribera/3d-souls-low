# Veyra, the Ashwing — Sculpted High-Detail Boss v2 Cinder Wyvern (26-bone skinned armature + 12 Blender Actions)
# Uses voxel-remesh organic sculpting (snow_lib.organic) + exact game-space rotation helper for clean bone deformation.
# Run: blender -b --factory-startup -P tools/blender/ashwing.py
import math, os, random, sys
import bpy, bmesh
from mathutils import Vector, Euler, Matrix

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))).replace("\\", "/")
sys.path.insert(0, ROOT + "/tools/blender")
from snow_lib import G, tube, bent_spike, blob, organic

rnd = random.Random(42)

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def make_mat(name, col, rough=0.6, metal=0.2, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*col, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emit > 0:
        bsdf.inputs["Emission Color"].default_value = (*col, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emit
    return m

# ---- 1. 26-bone Wyvern Skeleton (game space: x east, y up, z forward) -----------------------------------------------
BONE_DEFS = [
    ("pelvis",  None,     (0.00, 1.15, -0.45), (0.00, 1.24, -0.02)),
    ("spine1",  "pelvis", (0.00, 1.24, -0.02), (0.00, 1.46,  0.46)),
    ("spine2",  "spine1", (0.00, 1.46,  0.46), (0.00, 1.72,  0.90)),
    ("chest",   "spine2", (0.00, 1.72,  0.90), (0.00, 1.94,  1.26)),
    ("neck1",   "chest",  (0.00, 1.94,  1.26), (0.00, 2.28,  1.62)),
    ("neck2",   "neck1",  (0.00, 2.28,  1.62), (0.00, 2.50,  1.98)),
    ("head",    "neck2",  (0.00, 2.50,  1.98), (0.00, 2.46,  2.62)),
    ("jaw",     "head",   (0.00, 2.38,  2.02), (0.00, 2.30,  2.54)),

    ("tail1",   "pelvis", (0.00, 1.15, -0.45), (0.00, 0.98, -1.15)),
    ("tail2",   "tail1",  (0.00, 0.98, -1.15), (0.00, 0.80, -1.88)),
    ("tail3",   "tail2",  (0.00, 0.80, -1.88), (0.00, 0.70, -2.62)),
    ("tail4",   "tail3",  (0.00, 0.70, -2.62), (0.00, 0.76, -3.38)),

    ("wingL1",  "chest",  (0.46, 1.92,  0.86), (1.35, 2.46,  0.54)),
    ("wingL2",  "wingL1", (1.35, 2.46,  0.54), (2.48, 2.68,  0.82)),
    ("wingL3",  "wingL2", (2.48, 2.68,  0.82), (3.62, 2.24,  0.18)),

    ("wingR1",  "chest",  (-0.46, 1.92, 0.86), (-1.35, 2.46, 0.54)),
    ("wingR2",  "wingR1", (-1.35, 2.46, 0.54), (-2.48, 2.68, 0.82)),
    ("wingR3",  "wingR2", (-2.48, 2.68, 0.82), (-3.62, 2.24, 0.18)),

    ("foreL1",  "chest",  (0.44, 1.62,  0.96), (0.62, 0.94,  1.12)),
    ("foreL2",  "foreL1", (0.62, 0.94,  1.12), (0.58, 0.14,  1.34)),
    ("foreR1",  "chest",  (-0.44, 1.62, 0.96), (-0.62, 0.94, 1.12)),
    ("foreR2",  "foreR1", (-0.62, 0.94, 1.12), (-0.58, 0.14, 1.34)),

    ("hindL1",  "pelvis", (0.38, 1.14, -0.32), (0.52, 0.62, -0.60)),
    ("hindL2",  "hindL1", (0.52, 0.62, -0.60), (0.48, 0.08, -0.22)),
    ("hindR1",  "pelvis", (-0.38, 1.14, -0.32), (-0.52, 0.62, -0.60)),
    ("hindR2",  "hindR1", (-0.52, 0.62, -0.60), (-0.48, 0.08, -0.22)),
]

def add_quad_grid(bm, rows):
    vrows = [[bm.verts.new(G(*p)) for p in r] for r in rows]
    for i in range(len(vrows) - 1):
        for j in range(len(vrows[i]) - 1):
            bm.faces.new((vrows[i][j], vrows[i][j + 1], vrows[i + 1][j + 1], vrows[i + 1][j]))

def make_mesh_obj(name, mat, build_fn, do_organic=False, voxel=0.032, keep=4800, noise=0.015):
    bm = bmesh.new()
    build_fn(bm)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if do_organic:
        organic(ob, voxel=voxel, keep=keep, noise=noise, seed=sum(map(ord, name)) & 255)
    for p in ob.data.polygons:
        p.use_smooth = True
    ob.data.materials.append(mat)
    return ob

# ---- 2. Sculpted High-Detail Geometry -------------------------------------------------------------------------------
def build_scales(bm):
    # Muscular serpentine torso, ribcage, and arched neck
    spine_pts = [
        (0.0, 1.14, -0.45), (0.0, 1.24, -0.02), (0.0, 1.46, 0.46),
        (0.0, 1.72, 0.90), (0.0, 1.94, 1.26), (0.0, 2.28, 1.62), (0.0, 2.50, 1.98)
    ]
    spine_r = [0.30, 0.35, 0.44, 0.50, 0.35, 0.24, 0.21]
    spine_ov = [(1.05, 0.88), (1.10, 0.94), (1.12, 1.05), (1.18, 1.10), (0.95, 1.04), (0.85, 0.96), (0.90, 0.90)]
    tube(bm, spine_pts, spine_r, sides=12, ovals=spine_ov)

    # Carved rib-arches & sternal keel framing the chest
    for i, (py, pz, w, r) in enumerate([
        (1.62, 1.10, 0.46, 0.08), (1.50, 0.82, 0.48, 0.085), (1.38, 0.52, 0.44, 0.075), (1.28, 0.22, 0.38, 0.065)
    ]):
        for sx in (-1, 1):
            tube(bm, [
                (sx * 0.14, py + 0.24, pz - 0.06),
                (sx * w, py + 0.06, pz + 0.04),
                (sx * (w * 0.72), py - 0.22, pz + 0.12),
                (sx * 0.18, py - 0.30, pz + 0.14),
            ], [r * 0.7, r, r * 0.85, r * 0.6], sides=7)

    # Sculpted muscular shoulders & haunches fused into torso
    for sx in (-1, 1):
        blob(bm, (sx * 0.44, 1.76, 0.92), 0.26, (0.95, 1.05, 1.25), 2)
        blob(bm, (sx * 0.36, 1.14, -0.32), 0.25, (0.90, 1.10, 1.25), 2)
        # Neck muscle sinews
        tube(bm, [(sx * 0.22, 1.88, 1.06), (sx * 0.17, 2.22, 1.54), (sx * 0.13, 2.48, 1.94)], [0.11, 0.08, 0.06], sides=6)

    # Sculpted fierce dragon skull: cranium, brow ridges, cheekbones, tapered ridged snout
    tube(bm, [(0.0, 2.50, 1.92), (0.0, 2.55, 2.16), (0.0, 2.50, 2.44), (0.0, 2.44, 2.70)],
         [0.23, 0.21, 0.15, 0.085], sides=10, ovals=[(1.05, 0.86), (1.02, 0.80), (0.86, 0.66), (0.78, 0.52)])
    # Overhanging brow & nasal ridge
    for sx in (-1, 1):
        tube(bm, [(sx * 0.16, 2.64, 2.02), (sx * 0.17, 2.62, 2.24), (sx * 0.11, 2.56, 2.46)], [0.065, 0.055, 0.035], sides=6)
        bent_spike(bm, (sx * 0.18, 2.48, 2.02), (sx * 0.29, 2.54, 1.76), 0.055, (sx * 0.03, 0.02, -0.02), sides=5)
    # Articulated lower jaw
    tube(bm, [(0.0, 2.38, 1.98), (0.0, 2.32, 2.28), (0.0, 2.30, 2.58)],
         [0.145, 0.115, 0.06], sides=8, ovals=[(1.0, 0.54), (0.88, 0.48), (0.76, 0.42)])

    # 4-segment whip tail with muscular base
    tail_pts = [(0.0, 1.14, -0.45), (0.0, 0.98, -1.15), (0.0, 0.80, -1.88), (0.0, 0.70, -2.62), (0.0, 0.76, -3.35)]
    tube(bm, tail_pts, [0.28, 0.21, 0.15, 0.10, 0.06], sides=10)

    # Dorsal jagged blade-crests along neck, spine, and tail
    for p, h in [
        ((0.0, 1.48, 0.24), 0.30), ((0.0, 1.72, 0.62), 0.38), ((0.0, 1.98, 1.00), 0.42),
        ((0.0, 2.26, 1.38), 0.32), ((0.0, 2.52, 1.74), 0.24),
        ((0.0, 1.16, -0.78), 0.24), ((0.0, 0.96, -1.48), 0.22), ((0.0, 0.82, -2.22), 0.18),
    ]:
        bent_spike(bm, p, (p[0], p[1] + h, p[2] - h * 0.88), 0.068, (0, 0.06, -0.05), sides=5)

    # Wing arms, muscular biceps, and tapered finger spars
    for sx in (-1, 1):
        w_pts = [(sx * 0.46, 1.92, 0.86), (sx * 0.90, 2.22, 0.70), (sx * 1.35, 2.46, 0.54),
                 (sx * 1.92, 2.60, 0.68), (sx * 2.48, 2.68, 0.82), (sx * 3.05, 2.50, 0.52), (sx * 3.62, 2.24, 0.18)]
        tube(bm, w_pts, [0.16, 0.135, 0.12, 0.105, 0.095, 0.065, 0.032], sides=8)
        wrist = Vector((sx * 2.48, 2.68, 0.82))
        for tip in [(sx * 3.30, 1.72, -0.38), (sx * 2.48, 1.44, -0.62), (sx * 1.56, 1.38, -0.48)]:
            tube(bm, [wrist, wrist.lerp(Vector(tip), 0.5) + Vector((0, 0.08, 0.04)), Vector(tip)], [0.052, 0.034, 0.016], sides=6)

        # Muscular forelimbs with elbow spurs & sculpted paws
        tube(bm, [(sx * 0.44, 1.62, 0.96), (sx * 0.56, 1.26, 1.06), (sx * 0.62, 0.94, 1.12),
                  (sx * 0.60, 0.54, 1.24), (sx * 0.58, 0.16, 1.34)],
             [0.21, 0.16, 0.14, 0.115, 0.12], sides=8, ovals=[(1.1, 1.25), (1.0, 1.15), (0.95, 1.05), (0.9, 1.0), (1.15, 1.25)])
        bent_spike(bm, (sx * 0.62, 0.96, 1.06), (sx * 0.74, 1.10, 0.80), 0.055, (sx * 0.02, 0.04, -0.04), sides=5)
        # Muscular digitigrade hindlegs
        tube(bm, [(sx * 0.38, 1.14, -0.32), (sx * 0.48, 0.88, -0.48), (sx * 0.52, 0.62, -0.60),
                  (sx * 0.50, 0.34, -0.40), (sx * 0.48, 0.10, -0.22)],
             [0.23, 0.18, 0.135, 0.105, 0.11], sides=8, ovals=[(1.0, 1.28), (0.95, 1.15), (0.9, 1.0), (0.9, 1.0), (1.15, 1.2)])

def build_membranes(bm):
    # Smooth, subdivided double-sided bat-wyvern sails with scalloped trailing edge
    for sx in (-1, 1):
        p0 = Vector((sx * 0.48, 1.88, 0.84))
        p1 = Vector((sx * 1.35, 2.44, 0.54))
        p2 = Vector((sx * 2.48, 2.66, 0.82))
        p3 = Vector((sx * 3.62, 2.22, 0.18))
        t0 = Vector((sx * 0.42, 1.28, -0.26))
        t1 = Vector((sx * 1.56, 1.38, -0.48))
        t2 = Vector((sx * 2.48, 1.44, -0.62))
        t3 = Vector((sx * 3.30, 1.72, -0.38))

        lead = [p0, p0.lerp(p1, 0.5), p1, p1.lerp(p2, 0.5), p2, p2.lerp(p3, 0.5), p3]
        trail = [
            t0,
            t0.lerp(t1, 0.5) + Vector((0, 0.12, 0.10)),
            t1,
            t1.lerp(t2, 0.5) + Vector((0, 0.12, 0.10)),
            t2,
            t2.lerp(t3, 0.5) + Vector((0, 0.08, 0.08)),
            t3,
        ]
        r1 = [a.lerp(b, 0.33) + Vector((0, 0.06, 0.02)) for a, b in zip(lead, trail)]
        r2 = [a.lerp(b, 0.67) + Vector((0, 0.05, 0.01)) for a, b in zip(lead, trail)]
        rows = [lead, r1, r2, trail] if sx > 0 else [trail, r2, r1, lead]
        add_quad_grid(bm, rows)

def build_bone_parts(bm):
    for sx in (-1, 1):
        # Swept double crown horns
        tube(bm, [(sx * 0.14, 2.62, 2.02), (sx * 0.28, 2.90, 1.70), (sx * 0.38, 3.10, 1.30)], [0.068, 0.044, 0.012], sides=7)
        tube(bm, [(sx * 0.16, 2.52, 1.94), (sx * 0.32, 2.64, 1.66), (sx * 0.40, 2.70, 1.38)], [0.045, 0.030, 0.010], sides=6)
        # Upper & lower fangs
        for oz, l in [(2.54, 0.11), (2.40, 0.09), (2.26, 0.07)]:
            bent_spike(bm, (sx * 0.075, 2.44, oz), (sx * 0.075, 2.44 - l, oz + 0.01), 0.018, (0, 0, 0.01), sides=4)
        # Hooked wing-wrist scythe spurs
        bent_spike(bm, (sx * 2.48, 2.68, 0.84), (sx * 2.86, 2.94, 1.32), 0.070, (sx * 0.08, 0.14, 0.12), sides=6)
        # Long curved foreclaw talons
        for k, ox in enumerate((-0.095, 0.0, 0.095)):
            base = (sx * 0.58 + ox, 0.16, 1.36)
            tip = (sx * 0.58 + ox * 1.45, 0.02, 1.72 + (0.07 if k == 1 else 0.0))
            bent_spike(bm, base, tip, 0.038, (0, 0.08, 0.06), sides=5)
        # Hind talons
        for ox in (-0.075, 0.0, 0.075):
            base = (sx * 0.48 + ox, 0.10, -0.18)
            tip = (sx * 0.48 + ox * 1.25, 0.01, 0.12)
            bent_spike(bm, base, tip, 0.032, (0, 0.06, 0.04), sides=4)

    # Double-edged tail scythe blade
    bent_spike(bm, (0.0, 0.74, -3.02), (0.0, 0.98, -3.82), 0.095, (0, 0.16, -0.05), sides=5)
    bent_spike(bm, (0.0, 0.70, -2.92), (0.0, 0.46, -3.56), 0.058, (0, -0.10, -0.04), sides=4)

def build_ember_parts(bm):
    # Molten chest core & throat vents protruding cleanly between rib arches + fierce burning eyes
    for py, pz, r in [(1.56, 1.28, 0.20), (1.72, 1.34, 0.18), (1.42, 1.02, 0.16)]:
        blob(bm, (0.0, py, pz), r, (1.15, 0.50, 0.80), 2)
    tube(bm, [(0.0, 1.90, 1.38), (0.0, 2.22, 1.72), (0.0, 2.38, 2.02)], [0.11, 0.085, 0.065], sides=6)
    for sx in (-1, 1):
        blob(bm, (sx * 0.17, 2.55, 2.28), 0.038, (0.85, 0.65, 1.65), 2)

def build_cinder_parts(bm):
    # Phase-2 blazing cinder edge-veins along wing blades & tail scythe
    for sx in (-1, 1):
        tube(bm, [(sx * 1.38, 2.49, 0.55), (sx * 2.50, 2.72, 0.84), (sx * 3.60, 2.28, 0.20)], [0.052, 0.062, 0.028], sides=6)
        bent_spike(bm, (sx * 2.48, 2.70, 0.88), (sx * 2.92, 3.00, 1.40), 0.045, (sx * 0.08, 0.16, 0.14), sides=5)
    bent_spike(bm, (0.0, 0.78, -3.06), (0.0, 1.04, -3.90), 0.055, (0, 0.18, -0.06), sides=5)

# ---- 3. Armature & Smooth Capsule Weights ---------------------------------------------------------------------------
def create_armature():
    arm_data = bpy.data.armatures.new("AshwingArmature")
    arm_obj = bpy.data.objects.new("AshwingArmature", arm_data)
    bpy.context.scene.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="EDIT")
    ebones = {}
    for name, par, h, t in BONE_DEFS:
        eb = arm_data.edit_bones.new(name)
        eb.head = G(*h)
        eb.tail = G(*t)
        if par:
            eb.parent = ebones[par]
            eb.use_connect = (eb.head - eb.parent.tail).length < 0.02
        ebones[name] = eb
    bpy.ops.object.mode_set(mode="OBJECT")
    return arm_obj

def pt_seg_dist(p, a, b):
    ab = b - a
    l2 = ab.length_squared
    if l2 < 1e-8:
        return (p - a).length
    t = max(0.0, min(1.0, (p - a).dot(ab) / l2))
    return (p - (a + ab * t)).length

def assign_smooth_weights(mesh_obj, arm_obj):
    caps = [(name, G(*h), G(*t)) for name, _, h, t in BONE_DEFS]
    vgroups = {name: mesh_obj.vertex_groups.new(name=name) for name, _, _ in caps}
    # Identify vertices belonging to membrane material (slot index 1) so membranes ONLY bind to chest + same-side wing bones
    mem_verts = set()
    for poly in mesh_obj.data.polygons:
        if poly.material_index == 1:
            for vi in poly.vertices:
                mem_verts.add(vi)
    for v in mesh_obj.data.vertices:
        p = v.co
        is_mem = v.index in mem_verts
        side = "L" if p.x >= 0 else "R"
        dists = []
        for name, a, b in caps:
            if is_mem and name != "chest" and not name.startswith("wing" + side):
                continue
            d = pt_seg_dist(p, a, b)
            if not is_mem and abs(p.x) > 0.95 and not name.startswith("wing"):
                d += 2.0
            if not is_mem and p.z < 0.85 and name in ("chest", "spine2", "pelvis"):
                d += 0.35
            dists.append((d, name))
        dists.sort(key=lambda x: x[0])
        top = dists[:4]
        d0 = top[0][0]
        raw = []
        for d, name in top:
            w = math.exp(-((d - d0) / 0.22) ** 2)
            if w > 0.02:
                raw.append((name, w))
        total = sum(w for _, w in raw) or 1.0
        for name, w in raw:
            vgroups[name].add([v.index], w / total, "REPLACE")
    mod = mesh_obj.modifiers.new("Armature", "ARMATURE")
    mod.object = arm_obj
    mesh_obj.parent = arm_obj

# ---- 4. Exact Game-Space Animation Authoring (ZERO inside-out wing folding!) ----------------------------------------
# Converts a game-space rotation (pitch_x, yaw_y, roll_z) into a pose bone's local rotation quaternion.
# Game space -> Blender space: G(x, y, z) = (x, -z, y), so:
#   game +X pitch -> Blender +X
#   game +Y yaw   -> Blender +Z
#   game +Z roll  -> Blender -Y
def game_euler_to_blender_mat(rx, ry, rz):
    return (Euler((0, 0, ry), 'XYZ').to_matrix() @
            Euler((rx, 0, 0), 'XYZ').to_matrix() @
            Euler((0, -rz, 0), 'XYZ').to_matrix())

def pose_key_game(arm_obj, frame, poses):
    pb = arm_obj.pose.bones
    for b in pb:
        b.rotation_mode = "QUATERNION"
        b.rotation_quaternion = Matrix.Identity(3).to_quaternion()
        b.location = Vector((0.0, 0.0, 0.0))
    for name, vals in poses.items():
        if name not in pb:
            continue
        b = pb[name]
        rest_m = b.bone.matrix_local.to_3x3()
        if "r" in vals:
            rx, ry, rz = vals["r"]
            world_rot = game_euler_to_blender_mat(rx, ry, rz)
            local_rot = rest_m.inverted() @ world_rot @ rest_m
            b.rotation_quaternion = local_rot.to_quaternion()
        if "p" in vals:
            gx, gy, gz = vals["p"]
            b_vec = G(gx, gy, gz)
            b.location = rest_m.inverted() @ b_vec
    for b in pb:
        b.keyframe_insert(data_path="rotation_quaternion", frame=frame)
        if b.name == "pelvis":
            b.keyframe_insert(data_path="location", frame=frame)

def make_clip(arm_obj, clip_name, keyframes):
    act = bpy.data.actions.new(name=clip_name)
    arm_obj.animation_data_create()
    arm_obj.animation_data.action = act
    for f, poses in keyframes:
        pose_key_game(arm_obj, f, poses)
    track = arm_obj.animation_data.nla_tracks.new()
    track.name = clip_name
    strip = track.strips.new(clip_name, 0, act)
    strip.name = clip_name
    arm_obj.animation_data.action = None

def author_animations(arm_obj):
    bpy.context.scene.render.fps = 30
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="POSE")

    # 1. idle (60f): proud towering dragon stance, wings swept high & back over shoulders, tail swaying
    make_clip(arm_obj, "idle", [
        (0,  {"pelvis": {"p": (0, 0.0, 0)}, "chest": {"r": (-0.06, 0, 0)}, "neck1": {"r": (-0.08, 0, 0)}, "jaw": {"r": (0.06, 0, 0)},
              "wingL1": {"r": (0, -0.32,  0.22)}, "wingL2": {"r": (0, -0.15, -0.18)},
              "wingR1": {"r": (0,  0.32, -0.22)}, "wingR2": {"r": (0,  0.15,  0.18)},
              "tail1": {"r": (0, 0.14, 0)}, "tail2": {"r": (0, 0.16, 0)}, "tail3": {"r": (0, 0.14, 0)}}),
        (30, {"pelvis": {"p": (0, -0.05, 0)}, "chest": {"r": (-0.12, 0, 0)}, "neck1": {"r": (0.04, 0.06, 0)}, "jaw": {"r": (0.18, 0, 0)},
              "wingL1": {"r": (0, -0.26,  0.32)}, "wingL2": {"r": (0, -0.10, -0.12)},
              "wingR1": {"r": (0,  0.26, -0.32)}, "wingR2": {"r": (0,  0.10,  0.12)},
              "tail1": {"r": (0, -0.14, 0)}, "tail2": {"r": (0, -0.16, 0)}, "tail3": {"r": (0, -0.14, 0)}}),
        (60, {"pelvis": {"p": (0, 0.0, 0)}, "chest": {"r": (-0.06, 0, 0)}, "neck1": {"r": (-0.08, 0, 0)}, "jaw": {"r": (0.06, 0, 0)},
              "wingL1": {"r": (0, -0.32,  0.22)}, "wingL2": {"r": (0, -0.15, -0.18)},
              "wingR1": {"r": (0,  0.32, -0.22)}, "wingR2": {"r": (0,  0.15,  0.18)},
              "tail1": {"r": (0, 0.14, 0)}, "tail2": {"r": (0, 0.16, 0)}, "tail3": {"r": (0, 0.14, 0)}}),
    ])

    # 2. prowl (30f): stalking quadruped stride with wings swept proudly high & back (never scraping floor)
    make_clip(arm_obj, "prowl", [
        (0,  {"pelvis": {"p": (0, -0.04, 0), "r": (0.04, 0.08, 0)}, "chest": {"r": (0.04, -0.10, 0)},
              "foreL1": {"r": (-0.42, 0, 0)}, "foreL2": {"r": (0.28, 0, 0)}, "foreR1": {"r": (0.34, 0, 0)}, "foreR2": {"r": (-0.15, 0, 0)},
              "hindL1": {"r": (0.34, 0, 0)}, "hindR1": {"r": (-0.40, 0, 0)},
              "wingL1": {"r": (0, -0.38,  0.26)}, "wingR1": {"r": (0, 0.38, -0.26)},
              "tail1": {"r": (0, -0.22, 0)}, "tail2": {"r": (0, -0.20, 0)}}),
        (15, {"pelvis": {"p": (0, 0.0, 0), "r": (0.04, -0.08, 0)}, "chest": {"r": (0.04, 0.10, 0)},
              "foreL1": {"r": (0.34, 0, 0)}, "foreL2": {"r": (-0.15, 0, 0)}, "foreR1": {"r": (-0.42, 0, 0)}, "foreR2": {"r": (0.28, 0, 0)},
              "hindL1": {"r": (-0.40, 0, 0)}, "hindR1": {"r": (0.34, 0, 0)},
              "wingL1": {"r": (0, -0.32,  0.34)}, "wingR1": {"r": (0, 0.32, -0.34)},
              "tail1": {"r": (0, 0.22, 0)}, "tail2": {"r": (0, 0.20, 0)}}),
        (30, {"pelvis": {"p": (0, -0.04, 0), "r": (0.04, 0.08, 0)}, "chest": {"r": (0.04, -0.10, 0)},
              "foreL1": {"r": (-0.42, 0, 0)}, "foreL2": {"r": (0.28, 0, 0)}, "foreR1": {"r": (0.34, 0, 0)}, "foreR2": {"r": (-0.15, 0, 0)},
              "hindL1": {"r": (0.34, 0, 0)}, "hindR1": {"r": (-0.40, 0, 0)},
              "wingL1": {"r": (0, -0.38,  0.26)}, "wingR1": {"r": (0, 0.38, -0.26)},
              "tail1": {"r": (0, -0.22, 0)}, "tail2": {"r": (0, -0.20, 0)}}),
    ])

    # 3. hover (28f): powerful clean vertical wing-beats (game roll_z: +z lifts wingL up, -z lifts wingR up!)
    make_clip(arm_obj, "hover", [
        (0,  {"pelvis": {"p": (0, 0.16, 0), "r": (-0.22, 0, 0)}, "chest": {"r": (-0.12, 0, 0)}, "neck1": {"r": (0.24, 0, 0)},
              "wingL1": {"r": (0, -0.05,  0.52)}, "wingL2": {"r": (0, 0,  0.22)}, "wingL3": {"r": (0, 0,  0.14)},
              "wingR1": {"r": (0,  0.05, -0.52)}, "wingR2": {"r": (0, 0, -0.22)}, "wingR3": {"r": (0, 0, -0.14)},
              "foreL1": {"r": (0.35, 0, 0)}, "foreL2": {"r": (-0.50, 0, 0)}, "foreR1": {"r": (0.35, 0, 0)}, "foreR2": {"r": (-0.50, 0, 0)},
              "hindL1": {"r": (0.45, 0, 0)}, "hindL2": {"r": (-0.55, 0, 0)}, "hindR1": {"r": (0.45, 0, 0)}, "hindR2": {"r": (-0.55, 0, 0)},
              "tail1": {"r": (-0.25, 0, 0)}, "tail2": {"r": (-0.18, 0, 0)}}),
        (14, {"pelvis": {"p": (0, -0.16, 0), "r": (-0.12, 0, 0)}, "chest": {"r": (-0.04, 0, 0)}, "neck1": {"r": (0.18, 0, 0)},
              "wingL1": {"r": (0,  0.15, -0.48)}, "wingL2": {"r": (0, 0, -0.22)}, "wingL3": {"r": (0, 0, -0.14)},
              "wingR1": {"r": (0, -0.15,  0.48)}, "wingR2": {"r": (0, 0,  0.22)}, "wingR3": {"r": (0, 0,  0.14)},
              "foreL1": {"r": (0.45, 0, 0)}, "foreL2": {"r": (-0.60, 0, 0)}, "foreR1": {"r": (0.45, 0, 0)}, "foreR2": {"r": (-0.60, 0, 0)},
              "hindL1": {"r": (0.55, 0, 0)}, "hindL2": {"r": (-0.65, 0, 0)}, "hindR1": {"r": (0.55, 0, 0)}, "hindR2": {"r": (-0.65, 0, 0)},
              "tail1": {"r": (-0.10, 0, 0)}, "tail2": {"r": (-0.08, 0, 0)}}),
        (28, {"pelvis": {"p": (0, 0.16, 0), "r": (-0.22, 0, 0)}, "chest": {"r": (-0.12, 0, 0)}, "neck1": {"r": (0.24, 0, 0)},
              "wingL1": {"r": (0, -0.05,  0.52)}, "wingL2": {"r": (0, 0,  0.22)}, "wingL3": {"r": (0, 0,  0.14)},
              "wingR1": {"r": (0,  0.05, -0.52)}, "wingR2": {"r": (0, 0, -0.22)}, "wingR3": {"r": (0, 0, -0.14)},
              "foreL1": {"r": (0.35, 0, 0)}, "foreL2": {"r": (-0.50, 0, 0)}, "foreR1": {"r": (0.35, 0, 0)}, "foreR2": {"r": (-0.50, 0, 0)},
              "hindL1": {"r": (0.45, 0, 0)}, "hindL2": {"r": (-0.55, 0, 0)}, "hindR1": {"r": (0.45, 0, 0)}, "hindR2": {"r": (-0.55, 0, 0)},
              "tail1": {"r": (-0.25, 0, 0)}, "tail2": {"r": (-0.18, 0, 0)}}),
    ])

    # 4. clawR (40f): right foreclaw coiled high -> ferocious horizontal rake across front
    make_clip(arm_obj, "clawR", [
        (0,  {}),
        (18, {"pelvis": {"p": (0, -0.12, -0.15), "r": (-0.18, -0.35, 0)}, "chest": {"r": (-0.22, -0.32, 0)}, "jaw": {"r": (0.40, 0, 0)},
              "foreR1": {"r": (-1.35, -0.35, -0.45)}, "foreR2": {"r": (-0.55, 0, 0)},
              "wingL1": {"r": (0, -0.15, 0.25)}, "wingR1": {"r": (0, 0.25, -0.35)}}),
        (26, {"pelvis": {"p": (0, -0.10, 0.22), "r": (0.16, 0.42, 0)}, "chest": {"r": (0.24, 0.48, 0)}, "jaw": {"r": (0.18, 0, 0)},
              "foreR1": {"r": (-0.35, 0.55, 0.65)}, "foreR2": {"r": (0.15, 0, 0)},
              "wingL1": {"r": (0, -0.25, -0.10)}, "wingR1": {"r": (0, -0.10, 0.20)}}),
        (33, {"pelvis": {"p": (0, -0.12, 0.24), "r": (0.18, 0.48, 0)}, "chest": {"r": (0.26, 0.52, 0)},
              "foreR1": {"r": (-0.20, 0.65, 0.75)}}),
        (40, {}),
    ])

    # 5. clawL (40f): mirrored left foreclaw cross-slash
    make_clip(arm_obj, "clawL", [
        (0,  {}),
        (18, {"pelvis": {"p": (0, -0.12, -0.15), "r": (-0.18, 0.35, 0)}, "chest": {"r": (-0.22, 0.32, 0)}, "jaw": {"r": (0.40, 0, 0)},
              "foreL1": {"r": (-1.35, 0.35, 0.45)}, "foreL2": {"r": (-0.55, 0, 0)},
              "wingR1": {"r": (0, 0.15, -0.25)}, "wingL1": {"r": (0, -0.25, 0.35)}}),
        (26, {"pelvis": {"p": (0, -0.10, 0.22), "r": (0.16, -0.42, 0)}, "chest": {"r": (0.24, -0.48, 0)}, "jaw": {"r": (0.18, 0, 0)},
              "foreL1": {"r": (-0.35, -0.55, -0.65)}, "foreL2": {"r": (0.15, 0, 0)},
              "wingR1": {"r": (0, 0.25, 0.10)}, "wingL1": {"r": (0, 0.10, -0.20)}}),
        (33, {"pelvis": {"p": (0, -0.12, 0.24), "r": (0.18, -0.48, 0)}, "chest": {"r": (0.26, -0.52, 0)},
              "foreL1": {"r": (-0.20, -0.65, -0.75)}}),
        (40, {}),
    ])

    # 6. tailSweep (44f): coils right -> whips scythe-tail cleanly around
    make_clip(arm_obj, "tailSweep", [
        (0,  {}),
        (18, {"pelvis": {"p": (0, -0.14, 0), "r": (0.10, -0.68, 0)}, "chest": {"r": (0.08, 0.38, 0)}, "neck1": {"r": (0, 0.40, 0)},
              "tail1": {"r": (0, -0.55, 0)}, "tail2": {"r": (0, -0.65, 0)}, "tail3": {"r": (0, -0.55, 0)}, "tail4": {"r": (0, -0.40, 0)}}),
        (28, {"pelvis": {"p": (0, -0.10, 0), "r": (0.08, 0.95, 0)}, "chest": {"r": (0.10, -0.30, 0)},
              "tail1": {"r": (0, 0.72, 0)}, "tail2": {"r": (0, 0.80, 0)}, "tail3": {"r": (0, 0.72, 0)}, "tail4": {"r": (0, 0.55, 0)},
              "wingL1": {"r": (0, -0.10, 0.35)}, "wingR1": {"r": (0, 0.10, -0.35)}}),
        (36, {"pelvis": {"p": (0, -0.12, 0), "r": (0.10, 1.05, 0)},
              "tail1": {"r": (0, 0.85, 0)}, "tail2": {"r": (0, 0.90, 0)}, "tail3": {"r": (0, 0.80, 0)}}),
        (44, {}),
    ])

    # 7. wingCleave (44f): spreads wings tall and wide (clean vertical lift) -> sweeps both wings forward in an X-slam!
    make_clip(arm_obj, "wingCleave", [
        (0,  {}),
        (20, {"pelvis": {"p": (0, 0.08, -0.14), "r": (-0.22, 0, 0)}, "chest": {"r": (-0.24, 0, 0)}, "jaw": {"r": (0.48, 0, 0)},
              "wingL1": {"r": (0, -0.32,  0.48)}, "wingL2": {"r": (0, -0.15,  0.18)},
              "wingR1": {"r": (0,  0.32, -0.48)}, "wingR2": {"r": (0,  0.15, -0.18)}}),
        (29, {"pelvis": {"p": (0, -0.20, 0.30), "r": (0.24, 0, 0)}, "chest": {"r": (0.30, 0, 0)}, "jaw": {"r": (0.14, 0, 0)},
              "wingL1": {"r": (0,  0.65, -0.32)}, "wingL2": {"r": (0,  0.35, -0.18)},
              "wingR1": {"r": (0, -0.65,  0.32)}, "wingR2": {"r": (0, -0.35,  0.18)}}),
        (36, {"pelvis": {"p": (0, -0.22, 0.32), "r": (0.26, 0, 0)}, "chest": {"r": (0.32, 0, 0)},
              "wingL1": {"r": (0,  0.72, -0.38)}, "wingR1": {"r": (0, -0.72,  0.38)}}),
        (44, {}),
    ])

    # 8. biteLunge (38f): serpentine neck coil back -> snapping jaw lunge forward
    make_clip(arm_obj, "biteLunge", [
        (0,  {}),
        (16, {"pelvis": {"p": (0, -0.14, -0.22), "r": (-0.12, 0, 0)}, "chest": {"r": (-0.20, 0, 0)},
              "neck1": {"r": (-0.42, 0, 0)}, "neck2": {"r": (0.28, 0, 0)}, "jaw": {"r": (0.68, 0, 0)},
              "wingL1": {"r": (0, -0.22, 0.25)}, "wingR1": {"r": (0, 0.22, -0.25)}}),
        (24, {"pelvis": {"p": (0, -0.10, 0.36), "r": (0.18, 0, 0)}, "chest": {"r": (0.22, 0, 0)},
              "neck1": {"r": (0.36, 0, 0)}, "neck2": {"r": (0.18, 0, 0)}, "jaw": {"r": (0.04, 0, 0)}}),
        (31, {"pelvis": {"p": (0, -0.12, 0.32), "r": (0.16, 0, 0)}, "neck1": {"r": (0.30, 0, 0)}, "jaw": {"r": (0.10, 0, 0)}}),
        (38, {}),
    ])

    # 9. emberBreath (48f): rears chest high with wide-open glowing jaw -> breathes forward
    make_clip(arm_obj, "emberBreath", [
        (0,  {}),
        (18, {"pelvis": {"p": (0, -0.08, -0.12), "r": (-0.22, 0, 0)}, "chest": {"r": (-0.26, 0, 0)},
              "neck1": {"r": (-0.36, 0, 0)}, "neck2": {"r": (-0.20, 0, 0)}, "jaw": {"r": (0.72, 0, 0)},
              "wingL1": {"r": (0, -0.20, 0.38)}, "wingR1": {"r": (0, 0.20, -0.38)}}),
        (34, {"pelvis": {"p": (0, -0.12, 0.14), "r": (0.14, 0, 0)}, "chest": {"r": (0.16, 0, 0)},
              "neck1": {"r": (0.28, 0, 0)}, "neck2": {"r": (0.16, 0, 0)}, "jaw": {"r": (0.76, 0, 0)},
              "wingL1": {"r": (0, -0.30, 0.50)}, "wingR1": {"r": (0, 0.30, -0.50)}}),
        (48, {}),
    ])

    # 10. skyDive (48f): soaring wings swept high -> sleek falcon dive -> explosive landing flare!
    make_clip(arm_obj, "skyDive", [
        (0,  {"pelvis": {"r": (-0.22, 0, 0)}, "wingL1": {"r": (0, -0.10, 0.52)}, "wingR1": {"r": (0, 0.10, -0.52)}}),
        (18, {"pelvis": {"p": (0, 0.20, -0.10), "r": (0.48, 0, 0)}, "chest": {"r": (0.22, 0, 0)}, "neck1": {"r": (-0.36, 0, 0)},
              "wingL1": {"r": (0, -0.58, 0.15)}, "wingL2": {"r": (0, -0.35, 0)},
              "wingR1": {"r": (0,  0.58, -0.15)}, "wingR2": {"r": (0,  0.35, 0)},
              "foreL1": {"r": (-0.95, 0, 0)}, "foreR1": {"r": (-0.95, 0, 0)}}),
        (30, {"pelvis": {"p": (0, -0.32, 0.22), "r": (0.20, 0, 0)}, "chest": {"r": (0.22, 0, 0)}, "jaw": {"r": (0.58, 0, 0)},
              "wingL1": {"r": (0, -0.25, 0.58)}, "wingL2": {"r": (0, 0, 0.24)},
              "wingR1": {"r": (0,  0.25, -0.58)}, "wingR2": {"r": (0, 0, -0.24)},
              "foreL1": {"r": (-0.30, 0, 0.25)}, "foreR1": {"r": (-0.30, 0, -0.25)}}),
        (48, {}),
    ])

    # 11. stagger (24f)
    make_clip(arm_obj, "stagger", [
        (0,  {}),
        (8,  {"pelvis": {"p": (0, -0.14, -0.22), "r": (-0.28, 0, 0)}, "chest": {"r": (-0.28, 0, 0)}, "neck1": {"r": (-0.38, 0, 0)}, "jaw": {"r": (0.60, 0, 0)},
              "wingL1": {"r": (0, -0.35, 0.45)}, "wingR1": {"r": (0, 0.35, -0.45)}}),
        (24, {}),
    ])

    # 12. death (40f)
    make_clip(arm_obj, "death", [
        (0,  {}),
        (20, {"pelvis": {"p": (0, -0.48, 0.14), "r": (0.20, 0, 0.22)}, "chest": {"r": (0.28, 0, 0.14)}, "neck1": {"r": (0.38, 0.18, 0)},
              "wingL1": {"r": (0, -0.20, -0.48)}, "wingR1": {"r": (0, 0.20, 0.48)}}),
        (40, {"pelvis": {"p": (0, -0.84, 0.22), "r": (0.14, 0, 0.38)}, "chest": {"r": (0.35, 0, 0.18)}, "neck1": {"r": (0.55, 0.30, 0)}, "jaw": {"r": (0.35, 0, 0)},
              "wingL1": {"r": (0, -0.25, -0.72)}, "wingL2": {"r": (0, 0, -0.35)},
              "wingR1": {"r": (0,  0.25,  0.72)}, "wingR2": {"r": (0, 0,  0.35)},
              "tail1": {"r": (-0.20, 0.30, 0)}, "tail2": {"r": (-0.12, 0.25, 0)}}),
    ])

    bpy.ops.object.mode_set(mode="OBJECT")

def render_preview(out_png):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 640
    scene.render.filepath = out_png
    world = bpy.data.worlds.new("PreviewWorld")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.03, 0.03, 0.045, 1.0)
    scene.world = world

    cam_d = bpy.data.cameras.new("Cam")
    cam = bpy.data.objects.new("Cam", cam_d)
    scene.collection.objects.link(cam)
    cam.location = G(5.8, 3.3, 5.6)
    direction = G(0.0, 1.5, 0.2) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam

    for loc, energy, col in [
        (G(6, 7, 6), 1600, (1.0, 0.90, 0.80)),
        (G(-6, 4, -5), 900, (0.50, 0.68, 1.0)),
    ]:
        ld = bpy.data.lights.new("L", "POINT")
        ld.energy = energy
        ld.color = col
        lo = bpy.data.objects.new("L", ld)
        lo.location = loc
        scene.collection.objects.link(lo)

    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    bpy.ops.render.render(write_still=True)

def main():
    reset_scene()
    mats = {
        "scale":    make_mat("scale",    (0.09, 0.085, 0.10), rough=0.55, metal=0.28),
        "membrane": make_mat("membrane", (0.20, 0.07, 0.06),  rough=0.72, metal=0.05),
        "bone":     make_mat("bone",     (0.68, 0.62, 0.50),  rough=0.45, metal=0.05),
        "ember":    make_mat("ember",    (1.00, 0.36, 0.06),  rough=0.30, metal=0.0, emit=4.0),
        "cinder":   make_mat("cinder",   (1.00, 0.56, 0.12),  rough=0.25, metal=0.0, emit=5.5),
    }
    objs = [
        make_mesh_obj("ashwing_scale",    mats["scale"],    build_scales,       do_organic=True, voxel=0.036, keep=4600, noise=0.014),
        make_mesh_obj("ashwing_membrane", mats["membrane"], build_membranes,    do_organic=False),
        make_mesh_obj("ashwing_bone",     mats["bone"],     build_bone_parts,   do_organic=False),
        make_mesh_obj("ashwing_ember",    mats["ember"],    build_ember_parts,  do_organic=False),
        make_mesh_obj("ashwing_cinder",   mats["cinder"],   build_cinder_parts, do_organic=False),
    ]
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    body = bpy.context.view_layer.objects.active
    body.name = "ashwing_body"
    body.data.validate(verbose=False)

    arm = create_armature()
    assign_smooth_weights(body, arm)
    author_animations(arm)

    out_dir = ROOT + "/tools/blender/out"
    os.makedirs(out_dir + "/previews", exist_ok=True)
    glb_path = out_dir + "/ashwing.glb"
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    body.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_skins=True,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_apply=False,
    )
    render_preview(out_dir + "/previews/ashwing.png")
    print(f"ASHWING REBUILT: {len(body.data.vertices)} verts, {len(body.data.polygons)} polys, {len(BONE_DEFS)} bones -> {glb_path}")

if __name__ == "__main__":
    main()
