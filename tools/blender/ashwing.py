# Veyra, the Ashwing — Boss v2 flagship non-humanoid Cinder Wyvern (26-bone skinned armature + 10 Blender Actions).
# Built in GAME coordinates (x east, y up, z forward) and converted via G(x,y,z) -> Blender (x,-z,y).
# Run: blender -b --factory-startup -P tools/blender/ashwing.py
import math, os, sys
import bpy, bmesh
from mathutils import Vector, Euler

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))).replace("\\", "/")
sys.path.insert(0, ROOT + "/tools/blender")
from snow_lib import G, tube, bent_spike

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def make_mat(name, col, rough=0.65, metal=0.1, emit=0.0):
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

# ---- 1. 26-bone Wyvern Skeleton (game coordinates: x, y_up, z_fwd) --------------------------------------------------
# Each entry: name -> (parent_name, head_game_xyz, tail_game_xyz)
BONE_DEFS = [
    ("pelvis",  None,     (0.00, 1.15, -0.35), (0.00, 1.25,  0.00)),
    ("spine1",  "pelvis", (0.00, 1.25,  0.00), (0.00, 1.48,  0.48)),
    ("spine2",  "spine1", (0.00, 1.48,  0.48), (0.00, 1.72,  0.92)),
    ("chest",   "spine2", (0.00, 1.72,  0.92), (0.00, 1.92,  1.25)),
    ("neck1",   "chest",  (0.00, 1.92,  1.25), (0.00, 2.28,  1.58)),
    ("neck2",   "neck1",  (0.00, 2.28,  1.58), (0.00, 2.52,  1.95)),
    ("head",    "neck2",  (0.00, 2.52,  1.95), (0.00, 2.50,  2.55)),
    ("jaw",     "head",   (0.00, 2.40,  2.02), (0.00, 2.34,  2.50)),

    ("tail1",   "pelvis", (0.00, 1.15, -0.35), (0.00, 0.96, -1.05)),
    ("tail2",   "tail1",  (0.00, 0.96, -1.05), (0.00, 0.78, -1.78)),
    ("tail3",   "tail2",  (0.00, 0.78, -1.78), (0.00, 0.68, -2.50)),
    ("tail4",   "tail3",  (0.00, 0.68, -2.50), (0.00, 0.74, -3.25)),

    ("wingL1",  "chest",  (0.45, 1.88,  0.86), (1.35, 2.45,  0.55)),
    ("wingL2",  "wingL1", (1.35, 2.45,  0.55), (2.45, 2.65,  0.82)),
    ("wingL3",  "wingL2", (2.45, 2.65,  0.82), (3.55, 2.25,  0.22)),

    ("wingR1",  "chest",  (-0.45, 1.88, 0.86), (-1.35, 2.45, 0.55)),
    ("wingR2",  "wingR1", (-1.35, 2.45, 0.55), (-2.45, 2.65, 0.82)),
    ("wingR3",  "wingR2", (-2.45, 2.65, 0.82), (-3.55, 2.25, 0.22)),

    ("foreL1",  "chest",  (0.42, 1.56,  0.98), (0.62, 0.92,  1.15)),
    ("foreL2",  "foreL1", (0.62, 0.92,  1.15), (0.58, 0.14,  1.32)),
    ("foreR1",  "chest",  (-0.42, 1.56, 0.98), (-0.62, 0.92, 1.15)),
    ("foreR2",  "foreR1", (-0.62, 0.92, 1.15), (-0.58, 0.14, 1.32)),

    ("hindL1",  "pelvis", (0.38, 1.12, -0.25), (0.52, 0.62, -0.52)),
    ("hindL2",  "hindL1", (0.52, 0.62, -0.52), (0.48, 0.08, -0.18)),
    ("hindR1",  "pelvis", (-0.38, 1.12, -0.25), (-0.52, 0.62, -0.52)),
    ("hindR2",  "hindR1", (-0.52, 0.62, -0.52), (-0.48, 0.08, -0.18)),
]

BONE_MAP = {name: (par, Vector(h), Vector(t)) for name, par, h, t in BONE_DEFS}

def add_quad_strip(bm, pts_a, pts_b):
    va = [bm.verts.new(G(*p)) for p in pts_a]
    vb = [bm.verts.new(G(*p)) for p in pts_b]
    for i in range(len(va) - 1):
        bm.faces.new((va[i], va[i + 1], vb[i + 1], vb[i]))

def add_ellipsoid(bm, center, radii, segs=12, rings=8):
    cx, cy, cz = center
    rx, ry, rz = radii
    top = bm.verts.new(G(cx, cy + ry, cz))
    bot = bm.verts.new(G(cx, cy - ry, cz))
    grid = []
    for r in range(1, rings):
        phi = math.pi * r / rings
        sp, cp = math.sin(phi), math.cos(phi)
        row = []
        for s in range(segs):
            th = math.tau * s / segs
            row.append(bm.verts.new(G(cx + math.cos(th) * sp * rx, cy + cp * ry, cz + math.sin(th) * sp * rz)))
        grid.append(row)
    for s in range(segs):
        n = (s + 1) % segs
        bm.faces.new((top, grid[0][n], grid[0][s]))
        bm.faces.new((bot, grid[-1][s], grid[-1][n]))
    for r in range(len(grid) - 1):
        for s in range(segs):
            n = (s + 1) % segs
            bm.faces.new((grid[r][s], grid[r][n], grid[r + 1][n], grid[r + 1][s]))

def build_slot_mesh(slot_name, mat, build_fn):
    bm = bmesh.new()
    build_fn(bm)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(f"ashwing_{slot_name}")
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(mat)
    ob = bpy.data.objects.new(f"ashwing_{slot_name}", me)
    bpy.context.scene.collection.objects.link(ob)
    return ob

# ---- 2. Sculpted Multi-Material Wyvern Geometry ---------------------------------------------------------------------
def add_armor_plate(bm, pos, rx, ry, rz, pitch=0.0):
    """Angular faceted dragon-scale ridge plate."""
    cx, cy, cz = pos
    cp, sp = math.cos(pitch), math.sin(pitch)
    def xf(lx, ly, lz):
        ny = ly * cp - lz * sp
        nz = ly * sp + lz * cp
        return bm.verts.new(G(cx + lx, cy + ny, cz + nz))
    top = xf(0, ry, -rz * 0.25)
    bot = xf(0, -ry * 0.4, 0)
    f   = xf(0, 0, rz)
    b   = xf(0, ry * 0.25, -rz)
    l   = xf(-rx, -ry * 0.1, -rz * 0.15)
    r   = xf( rx, -ry * 0.1, -rz * 0.15)
    for tri in [(top, f, r), (top, r, b), (top, b, l), (top, l, f),
                (bot, r, f), (bot, b, r), (bot, l, b), (bot, f, l)]:
        bm.faces.new(tri)

def build_scales(bm):
    # Main serpentine spine + muscular ribcage + neck (tapered, sculpted ovals)
    spine_pts = [
        (0.0, 1.12, -0.40), (0.0, 1.24, 0.02), (0.0, 1.48, 0.48),
        (0.0, 1.72, 0.92), (0.0, 1.92, 1.26), (0.0, 2.28, 1.60), (0.0, 2.52, 1.96)
    ]
    spine_r = [0.30, 0.34, 0.42, 0.48, 0.34, 0.23, 0.19]
    spine_ov = [(1.05, 0.88), (1.10, 0.92), (1.08, 1.05), (1.15, 1.08), (0.92, 1.02), (0.82, 0.95), (0.88, 0.88)]
    tube(bm, spine_pts, spine_r, sides=12, ovals=spine_ov)

    # Armored layered breastplate & shoulder blades (no round balls!)
    for i, (py, pz, w, h, d, pt) in enumerate([
        (1.62, 1.18, 0.38, 0.22, 0.36, 0.35),
        (1.80, 1.02, 0.48, 0.24, 0.40, 0.25),
        (1.56, 0.65, 0.44, 0.20, 0.38, 0.10),
    ]):
        add_armor_plate(bm, (0.0, py, pz), w, h, d, pt)
    for sx in (-1, 1):
        # Sculpted angular shoulder pauldrons & muscular haunches
        add_armor_plate(bm, (sx * 0.46, 1.84, 0.90), 0.24, 0.22, 0.34, 0.2)
        add_armor_plate(bm, (sx * 0.38, 1.16, -0.26), 0.22, 0.24, 0.34, -0.25)

    # Sculpted angular dragon skull: brow crest, cheekbones, tapered snout, hinged lower jaw
    tube(bm, [(0.0, 2.54, 1.86), (0.0, 2.58, 2.12), (0.0, 2.52, 2.40), (0.0, 2.46, 2.66)],
         [0.22, 0.20, 0.14, 0.08], sides=8, ovals=[(1.05, 0.85), (1.0, 0.78), (0.85, 0.65), (0.78, 0.50)])
    add_armor_plate(bm, (0.0, 2.66, 2.08), 0.20, 0.10, 0.28, -0.15)   # brow ridge
    for sx in (-1, 1):
        bent_spike(bm, (sx * 0.16, 2.54, 2.05), (sx * 0.24, 2.62, 1.82), 0.045, (sx * 0.03, 0.02, -0.02), sides=4)
    tube(bm, [(0.0, 2.38, 1.98), (0.0, 2.33, 2.28), (0.0, 2.32, 2.56)],
         [0.14, 0.11, 0.055], sides=6, ovals=[(1.0, 0.55), (0.88, 0.48), (0.75, 0.42)])

    # 4-segment whip tail with armored chevron ridges
    tail_pts = [(0.0, 1.12, -0.38), (0.0, 0.96, -1.05), (0.0, 0.78, -1.78), (0.0, 0.68, -2.50), (0.0, 0.74, -3.22)]
    tube(bm, tail_pts, [0.26, 0.20, 0.14, 0.095, 0.055], sides=10)

    # Dorsal jagged blade-crests along neck, back, and tail
    for p, h in [
        ((0.0, 1.56, 0.26), 0.30), ((0.0, 1.80, 0.64), 0.38), ((0.0, 2.04, 1.02), 0.40),
        ((0.0, 2.30, 1.38), 0.28), ((0.0, 2.52, 1.72), 0.22),
        ((0.0, 1.18, -0.72), 0.24), ((0.0, 0.96, -1.42), 0.22), ((0.0, 0.82, -2.14), 0.18),
    ]:
        bent_spike(bm, p, (p[0], p[1] + h, p[2] - h * 0.85), 0.065, (0, 0.06, -0.05), sides=4)

    # Wing arms, shoulder struts, and tapered finger spars
    for sx in (-1, 1):
        w_pts = [(sx * 0.45, 1.88, 0.86), (sx * 1.35, 2.45, 0.55), (sx * 2.45, 2.65, 0.82), (sx * 3.55, 2.25, 0.22)]
        tube(bm, w_pts, [0.15, 0.115, 0.09, 0.038], sides=8)
        wrist = Vector((sx * 2.45, 2.65, 0.82))
        for tip in [(sx * 3.25, 1.75, -0.35), (sx * 2.45, 1.48, -0.58), (sx * 1.55, 1.42, -0.45)]:
            tube(bm, [wrist, Vector(tip)], [0.050, 0.018], sides=6)

        # Muscular tapered forelimbs with elbow spurs
        tube(bm, [(sx * 0.42, 1.62, 0.96), (sx * 0.54, 1.24, 1.08), (sx * 0.62, 0.92, 1.15),
                  (sx * 0.60, 0.52, 1.24), (sx * 0.58, 0.16, 1.32)],
             [0.20, 0.15, 0.13, 0.11, 0.11], sides=8, ovals=[(1.1, 1.2), (1.0, 1.1), (0.95, 1.0), (0.9, 1.0), (1.1, 1.2)])
        bent_spike(bm, (sx * 0.62, 0.94, 1.08), (sx * 0.72, 1.06, 0.84), 0.05, (sx * 0.02, 0.04, -0.04), sides=4)
        # Muscular digitigrade hindlegs
        tube(bm, [(sx * 0.38, 1.16, -0.25), (sx * 0.48, 0.88, -0.42), (sx * 0.52, 0.62, -0.52),
                  (sx * 0.50, 0.34, -0.35), (sx * 0.48, 0.10, -0.18)],
             [0.22, 0.17, 0.13, 0.10, 0.10], sides=8, ovals=[(1.0, 1.25), (0.95, 1.15), (0.9, 1.0), (0.9, 1.0), (1.1, 1.2)])

def build_membranes(bm):
    # Sweeping double-sided bat-seraph wing sails (inner, mid, outer panels)
    for sx in (-1, 1):
        # Leading edge: shoulder -> elbow -> wrist -> wingtip
        p0 = Vector((sx * 0.48, 1.84, 0.84))
        p1 = Vector((sx * 1.35, 2.42, 0.55))
        p2 = Vector((sx * 2.45, 2.62, 0.82))
        p3 = Vector((sx * 3.55, 2.24, 0.22))
        # Trailing edge (scalloped!)
        t0 = Vector((sx * 0.40, 1.32, -0.18))
        t1 = Vector((sx * 1.55, 1.42, -0.45))
        t2 = Vector((sx * 2.45, 1.48, -0.58))
        t3 = Vector((sx * 3.25, 1.75, -0.35))
        # Subdivide panels for smooth skinning deformation
        lead = [p0, p0.lerp(p1, 0.5), p1, p1.lerp(p2, 0.5), p2, p2.lerp(p3, 0.5), p3]
        trail = [t0, t0.lerp(t1, 0.5) + Vector((0, 0.08, 0.08)), t1, t1.lerp(t2, 0.5) + Vector((0, 0.08, 0.08)), t2, t2.lerp(t3, 0.5) + Vector((0, 0.06, 0.06)), t3]
        mid = [a.lerp(b, 0.5) + Vector((0, 0.06, 0.02)) for a, b in zip(lead, trail)]
        if sx > 0:
            add_quad_strip(bm, lead, mid)
            add_quad_strip(bm, mid, trail)
        else:
            add_quad_strip(bm, mid, lead)
            add_quad_strip(bm, trail, mid)

def build_bone_parts(bm):
    # Swept crown horns on skull
    for sx in (-1, 1):
        tube(bm, [(sx * 0.14, 2.60, 2.02), (sx * 0.26, 2.86, 1.74), (sx * 0.34, 3.04, 1.38)], [0.065, 0.042, 0.012], sides=6)
        tube(bm, [(sx * 0.15, 2.52, 1.94), (sx * 0.30, 2.62, 1.68), (sx * 0.36, 2.66, 1.44)], [0.042, 0.028, 0.010], sides=5)
        # Jaw fangs
        bent_spike(bm, (sx * 0.07, 2.45, 2.44), (sx * 0.07, 2.34, 2.46), 0.018, (0, 0, 0.01), sides=4)
        # Wing-wrist scythe spurs (used for wingCross slashes!)
        bent_spike(bm, (sx * 2.45, 2.66, 0.84), (sx * 2.75, 2.88, 1.24), 0.065, (sx * 0.08, 0.12, 0.10), sides=5)
        # Foreclaw talons (3 per paw)
        for k, ox in enumerate((-0.09, 0.0, 0.09)):
            base = (sx * 0.58 + ox, 0.16, 1.34)
            tip = (sx * 0.58 + ox * 1.4, 0.02, 1.66 + (0.06 if k == 1 else 0.0))
            bent_spike(bm, base, tip, 0.036, (0, 0.07, 0.05), sides=5)
        # Hindclaw talons
        for ox in (-0.07, 0.0, 0.07):
            base = (sx * 0.48 + ox, 0.10, -0.14)
            tip = (sx * 0.48 + ox * 1.2, 0.01, 0.14)
            bent_spike(bm, base, tip, 0.030, (0, 0.05, 0.04), sides=4)

    # Tail scythe-blade at tail4
    bent_spike(bm, (0.0, 0.72, -2.95), (0.0, 0.92, -3.65), 0.09, (0, 0.14, -0.05), sides=5)
    bent_spike(bm, (0.0, 0.68, -2.85), (0.0, 0.48, -3.45), 0.055, (0, -0.08, -0.04), sides=4)

def build_ember_parts(bm):
    # Glowing ember core vents visible along chest ribs, throat seams, and fierce slit eyes
    for py, pz, r in [(1.55, 1.24, 0.22), (1.72, 1.28, 0.20), (1.42, 1.05, 0.18)]:
        add_ellipsoid(bm, (0.0, py, pz), (r * 1.25, r * 0.55, r * 0.85), 10, 6)
    tube(bm, [(0.0, 1.88, 1.34), (0.0, 2.20, 1.66), (0.0, 2.38, 1.98)], [0.12, 0.09, 0.07], sides=6)
    for sx in (-1, 1):
        add_ellipsoid(bm, (sx * 0.14, 2.55, 2.26), (0.032, 0.022, 0.055), 8, 6)

def build_cinder_parts(bm):
    # Phase-2 blazing cinder veins along wing blades & dorsal flame crests
    for sx in (-1, 1):
        tube(bm, [(sx * 1.38, 2.48, 0.56), (sx * 2.48, 2.69, 0.84), (sx * 3.55, 2.28, 0.24)], [0.055, 0.065, 0.03], sides=6)
        bent_spike(bm, (sx * 2.45, 2.68, 0.88), (sx * 2.82, 2.95, 1.34), 0.042, (sx * 0.08, 0.14, 0.12), sides=4)
    bent_spike(bm, (0.0, 0.75, -3.00), (0.0, 0.98, -3.75), 0.05, (0, 0.16, -0.06), sides=4)

# ---- 3. Build Armature & Smooth 4-Bone Capsule Weights --------------------------------------------------------------
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
    # Precompute bone capsules in Blender world space
    caps = [(name, G(*h), G(*t)) for name, _, h, t in BONE_DEFS]
    vgroups = {name: mesh_obj.vertex_groups.new(name=name) for name, _, _ in caps}
    for v in mesh_obj.data.vertices:
        p = v.co
        # Find up to 4 nearest bones and compute smooth inverse-distance weights
        dists = []
        for name, a, b in caps:
            d = pt_seg_dist(p, a, b)
            # Bias wing bones for wide lateral vertices so wingtips never grab torso
            if abs(p.x) > 1.05 and not name.startswith("wing"):
                d += 1.5
            dists.append((d, name))
        dists.sort(key=lambda x: x[0])
        top = dists[:4]
        d0 = top[0][0]
        raw = []
        for d, name in top:
            # Smooth Gaussian falloff around closest bone
            w = math.exp(-((d - d0) / 0.24) ** 2)
            if w > 0.02:
                raw.append((name, w))
        total = sum(w for _, w in raw) or 1.0
        for name, w in raw:
            vgroups[name].add([v.index], w / total, "REPLACE")
    mod = mesh_obj.modifiers.new("Armature", "ARMATURE")
    mod.object = arm_obj
    mesh_obj.parent = arm_obj

# ---- 4. Author 10 Expressive Blender Animation Clips (NLA Strips) ---------------------------------------------------
# Note: in pose mode, bone local Euler XYZ rotations are relative to rest pose.
# For our G(x,-z,y) bones: local X pitches forward/back, Z twists/sweeps, Y rolls.
def pose_key(arm_obj, frame, poses):
    pb = arm_obj.pose.bones
    for b in pb:
        b.rotation_mode = "XYZ"
        b.rotation_euler = Euler((0.0, 0.0, 0.0), "XYZ")
        b.location = Vector((0.0, 0.0, 0.0))
    for name, vals in poses.items():
        if name not in pb:
            continue
        b = pb[name]
        if "r" in vals:
            b.rotation_euler = Euler(vals["r"], "XYZ")
        if "p" in vals:
            b.location = Vector(vals["p"])
    for b in pb:
        b.keyframe_insert(data_path="rotation_euler", frame=frame)
        if b.name == "pelvis":
            b.keyframe_insert(data_path="location", frame=frame)

def make_clip(arm_obj, clip_name, keyframes, fps=30):
    act = bpy.data.actions.new(name=clip_name)
    arm_obj.animation_data_create()
    arm_obj.animation_data.action = act
    for f, poses in keyframes:
        pose_key(arm_obj, f, poses)
    # Push onto NLA track so glTF exports EVERY action as its own clip
    track = arm_obj.animation_data.nla_tracks.new()
    track.name = clip_name
    strip = track.strips.new(clip_name, 0, act)
    strip.name = clip_name
    arm_obj.animation_data.action = None

def mirror_lr(d):
    out = {}
    for k, v in d.items():
        if "L" in k: nk = k.replace("L", "R")
        elif "R" in k: nk = k.replace("R", "L")
        else: nk = k
        nv = {}
        if "r" in v: nv["r"] = (v["r"][0], -v["r"][1], -v["r"][2])
        if "p" in v: nv["p"] = (-v["p"][0], v["p"][1], v["p"][2])
        out[nk] = nv
    return out

def author_animations(arm_obj):
    bpy.context.scene.render.fps = 30
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="POSE")

    # 1. idle (60f = 2.0s loop): menacing breathing, wing flex, tail sway
    make_clip(arm_obj, "idle", [
        (0,  {"pelvis": {"p": (0, 0, 0)}, "chest": {"r": (0.04, 0, 0)}, "neck1": {"r": (-0.06, 0, 0)}, "jaw": {"r": (0.08, 0, 0)},
              "wingL1": {"r": (0, 0, -0.18)}, "wingL2": {"r": (0, 0, -0.15)}, "wingR1": {"r": (0, 0, 0.18)}, "wingR2": {"r": (0, 0, 0.15)},
              "tail1": {"r": (0, 0.14, 0)}, "tail2": {"r": (0, 0.18, 0)}, "tail3": {"r": (0, 0.15, 0)}}),
        (30, {"pelvis": {"p": (0, -0.06, 0)}, "chest": {"r": (-0.06, 0, 0)}, "neck1": {"r": (0.08, 0.05, 0)}, "jaw": {"r": (0.22, 0, 0)},
              "wingL1": {"r": (0.08, 0, -0.05)}, "wingL2": {"r": (0, 0, -0.06)}, "wingR1": {"r": (0.08, 0, 0.05)}, "wingR2": {"r": (0, 0, 0.06)},
              "tail1": {"r": (0, -0.14, 0)}, "tail2": {"r": (0, -0.18, 0)}, "tail3": {"r": (0, -0.15, 0)}}),
        (60, {"pelvis": {"p": (0, 0, 0)}, "chest": {"r": (0.04, 0, 0)}, "neck1": {"r": (-0.06, 0, 0)}, "jaw": {"r": (0.08, 0, 0)},
              "wingL1": {"r": (0, 0, -0.18)}, "wingL2": {"r": (0, 0, -0.15)}, "wingR1": {"r": (0, 0, 0.18)}, "wingR2": {"r": (0, 0, 0.15)},
              "tail1": {"r": (0, 0.14, 0)}, "tail2": {"r": (0, 0.18, 0)}, "tail3": {"r": (0, 0.15, 0)}}),
    ])

    # 2. prowl (30f = 1.0s loop): quadruped predatory stalk
    make_clip(arm_obj, "prowl", [
        (0,  {"pelvis": {"p": (0, -0.08, 0), "r": (0.08, 0.10, 0)}, "chest": {"r": (0.12, -0.12, 0)},
              "foreL1": {"r": (-0.45, 0, 0)}, "foreL2": {"r": (0.30, 0, 0)}, "foreR1": {"r": (0.35, 0, 0)}, "foreR2": {"r": (-0.15, 0, 0)},
              "hindL1": {"r": (0.35, 0, 0)}, "hindR1": {"r": (-0.42, 0, 0)},
              "wingL1": {"r": (0.15, 0, -0.35)}, "wingR1": {"r": (0.15, 0, 0.35)},
              "tail1": {"r": (0, -0.25, 0)}, "tail2": {"r": (0, -0.22, 0)}}),
        (15, {"pelvis": {"p": (0, -0.02, 0), "r": (0.08, -0.10, 0)}, "chest": {"r": (0.12, 0.12, 0)},
              "foreL1": {"r": (0.35, 0, 0)}, "foreL2": {"r": (-0.15, 0, 0)}, "foreR1": {"r": (-0.45, 0, 0)}, "foreR2": {"r": (0.30, 0, 0)},
              "hindL1": {"r": (-0.42, 0, 0)}, "hindR1": {"r": (0.35, 0, 0)},
              "wingL1": {"r": (0.22, 0, -0.28)}, "wingR1": {"r": (0.22, 0, 0.28)},
              "tail1": {"r": (0, 0.25, 0)}, "tail2": {"r": (0, 0.22, 0)}}),
        (30, {"pelvis": {"p": (0, -0.08, 0), "r": (0.08, 0.10, 0)}, "chest": {"r": (0.12, -0.12, 0)},
              "foreL1": {"r": (-0.45, 0, 0)}, "foreL2": {"r": (0.30, 0, 0)}, "foreR1": {"r": (0.35, 0, 0)}, "foreR2": {"r": (-0.15, 0, 0)},
              "hindL1": {"r": (0.35, 0, 0)}, "hindR1": {"r": (-0.42, 0, 0)},
              "wingL1": {"r": (0.15, 0, -0.35)}, "wingR1": {"r": (0.15, 0, 0.35)},
              "tail1": {"r": (0, -0.25, 0)}, "tail2": {"r": (0, -0.22, 0)}}),
    ])

    # 3. hover (28f = 0.93s loop): airborne beating wings, tucked talons
    make_clip(arm_obj, "hover", [
        (0,  {"pelvis": {"p": (0, 0.18, 0), "r": (-0.28, 0, 0)}, "chest": {"r": (-0.18, 0, 0)}, "neck1": {"r": (0.35, 0, 0)},
              "wingL1": {"r": (-0.20, 0.25, 0.65)}, "wingL2": {"r": (0, 0, 0.35)}, "wingL3": {"r": (0, 0, 0.25)},
              "wingR1": {"r": (-0.20, -0.25, -0.65)}, "wingR2": {"r": (0, 0, -0.35)}, "wingR3": {"r": (0, 0, -0.25)},
              "foreL1": {"r": (0.45, 0, 0)}, "foreL2": {"r": (-0.65, 0, 0)}, "foreR1": {"r": (0.45, 0, 0)}, "foreR2": {"r": (-0.65, 0, 0)},
              "hindL1": {"r": (0.55, 0, 0)}, "hindL2": {"r": (-0.65, 0, 0)}, "hindR1": {"r": (0.55, 0, 0)}, "hindR2": {"r": (-0.65, 0, 0)},
              "tail1": {"r": (-0.35, 0, 0)}, "tail2": {"r": (-0.25, 0, 0)}}),
        (14, {"pelvis": {"p": (0, -0.18, 0), "r": (-0.15, 0, 0)}, "chest": {"r": (-0.08, 0, 0)}, "neck1": {"r": (0.25, 0, 0)},
              "wingL1": {"r": (0.25, -0.35, -0.75)}, "wingL2": {"r": (0, 0, -0.40)}, "wingL3": {"r": (0, 0, -0.30)},
              "wingR1": {"r": (0.25, 0.35, 0.75)}, "wingR2": {"r": (0, 0, 0.40)}, "wingR3": {"r": (0, 0, 0.30)},
              "foreL1": {"r": (0.55, 0, 0)}, "foreL2": {"r": (-0.75, 0, 0)}, "foreR1": {"r": (0.55, 0, 0)}, "foreR2": {"r": (-0.75, 0, 0)},
              "hindL1": {"r": (0.65, 0, 0)}, "hindL2": {"r": (-0.75, 0, 0)}, "hindR1": {"r": (0.65, 0, 0)}, "hindR2": {"r": (-0.75, 0, 0)},
              "tail1": {"r": (-0.15, 0, 0)}, "tail2": {"r": (-0.10, 0, 0)}}),
        (28, {"pelvis": {"p": (0, 0.18, 0), "r": (-0.28, 0, 0)}, "chest": {"r": (-0.18, 0, 0)}, "neck1": {"r": (0.35, 0, 0)},
              "wingL1": {"r": (-0.20, 0.25, 0.65)}, "wingL2": {"r": (0, 0, 0.35)}, "wingL3": {"r": (0, 0, 0.25)},
              "wingR1": {"r": (-0.20, -0.25, -0.65)}, "wingR2": {"r": (0, 0, -0.35)}, "wingR3": {"r": (0, 0, -0.25)},
              "foreL1": {"r": (0.45, 0, 0)}, "foreL2": {"r": (-0.65, 0, 0)}, "foreR1": {"r": (0.45, 0, 0)}, "foreR2": {"r": (-0.65, 0, 0)},
              "hindL1": {"r": (0.55, 0, 0)}, "hindL2": {"r": (-0.65, 0, 0)}, "hindR1": {"r": (0.55, 0, 0)}, "hindR2": {"r": (-0.65, 0, 0)},
              "tail1": {"r": (-0.35, 0, 0)}, "tail2": {"r": (-0.25, 0, 0)}}),
    ])

    # 4. clawRake (40f): windup rear-back (0..18) -> fierce foreR slash (18..24) -> follow (24..32) -> recover (40)
    make_clip(arm_obj, "clawRake", [
        (0,  {}),
        (16, {"pelvis": {"p": (0, -0.15, -0.18), "r": (-0.22, -0.38, 0)}, "chest": {"r": (-0.25, -0.35, 0)}, "jaw": {"r": (0.45, 0, 0)},
              "foreR1": {"r": (-1.55, 0, -0.65)}, "foreR2": {"r": (-0.65, 0, 0)},
              "wingL1": {"r": (0, 0, 0.35)}, "wingR1": {"r": (0, 0, -0.45)}}),
        (24, {"pelvis": {"p": (0, -0.10, 0.25), "r": (0.20, 0.45, 0)}, "chest": {"r": (0.30, 0.55, 0)}, "jaw": {"r": (0.20, 0, 0)},
              "foreR1": {"r": (-0.25, 0, 0.95)}, "foreR2": {"r": (0.10, 0, 0)},
              "wingL1": {"r": (0, 0, -0.15)}, "wingR1": {"r": (0, 0, 0.35)}}),
        (32, {"pelvis": {"p": (0, -0.14, 0.28), "r": (0.24, 0.55, 0)}, "chest": {"r": (0.34, 0.62, 0)},
              "foreR1": {"r": (0.05, 0, 1.15)}, "foreR2": {"r": (0.15, 0, 0)}}),
        (40, {}),
    ])

    # 5. tailWhip (44f): coil right -> massive 220-deg scythe tail sweep!
    make_clip(arm_obj, "tailWhip", [
        (0,  {}),
        (18, {"pelvis": {"p": (0, -0.18, 0), "r": (0.12, -0.75, 0)}, "chest": {"r": (0.10, 0.45, 0)}, "neck1": {"r": (0, 0.45, 0)},
              "tail1": {"r": (0.10, -0.65, 0)}, "tail2": {"r": (0.10, -0.75, 0)}, "tail3": {"r": (0.05, -0.65, 0)}, "tail4": {"r": (0, -0.45, 0)}}),
        (27, {"pelvis": {"p": (0, -0.12, 0), "r": (0.08, 1.05, 0)}, "chest": {"r": (0.12, -0.35, 0)},
              "tail1": {"r": (0.05, 0.85, 0)}, "tail2": {"r": (0.05, 0.95, 0)}, "tail3": {"r": (0.05, 0.85, 0)}, "tail4": {"r": (0, 0.65, 0)},
              "wingL1": {"r": (0, 0, 0.55)}, "wingR1": {"r": (0, 0, -0.55)}}),
        (35, {"pelvis": {"p": (0, -0.15, 0), "r": (0.10, 1.25, 0)},
              "tail1": {"r": (0.05, 1.05, 0)}, "tail2": {"r": (0.05, 1.10, 0)}, "tail3": {"r": (0.05, 0.95, 0)}}),
        (44, {}),
    ])

    # 6. wingCross (44f): spread massive wings wide (unmistakable tell) -> slam forward in X-cleave!
    make_clip(arm_obj, "wingCross", [
        (0,  {}),
        (20, {"pelvis": {"p": (0, 0.10, -0.15), "r": (-0.28, 0, 0)}, "chest": {"r": (-0.30, 0, 0)}, "jaw": {"r": (0.55, 0, 0)},
              "wingL1": {"r": (-0.35, -0.65, 0.55)}, "wingL2": {"r": (0, -0.35, 0.25)},
              "wingR1": {"r": (-0.35, 0.65, -0.55)}, "wingR2": {"r": (0, 0.35, -0.25)}}),
        (28, {"pelvis": {"p": (0, -0.22, 0.35), "r": (0.32, 0, 0)}, "chest": {"r": (0.38, 0, 0)}, "jaw": {"r": (0.15, 0, 0)},
              "wingL1": {"r": (0.45, 0.95, -0.45)}, "wingL2": {"r": (0, 0.55, -0.35)},
              "wingR1": {"r": (0.45, -0.95, 0.45)}, "wingR2": {"r": (0, -0.55, 0.35)}}),
        (36, {"pelvis": {"p": (0, -0.25, 0.38), "r": (0.35, 0, 0)}, "chest": {"r": (0.42, 0, 0)},
              "wingL1": {"r": (0.50, 1.05, -0.55)}, "wingR1": {"r": (0.50, -1.05, 0.55)}}),
        (44, {}),
    ])

    # 7. emberBreath (50f): rear neck back with glowing jaw -> sweep beam left-to-right!
    make_clip(arm_obj, "emberBreath", [
        (0,  {}),
        (16, {"pelvis": {"p": (0, -0.10, -0.10), "r": (-0.20, 0, 0)}, "chest": {"r": (-0.28, 0, 0)},
              "neck1": {"r": (-0.42, -0.55, 0)}, "neck2": {"r": (-0.30, -0.35, 0)}, "jaw": {"r": (0.72, 0, 0)},
              "wingL1": {"r": (0, -0.30, 0.45)}, "wingR1": {"r": (0, 0.30, -0.45)}}),
        (34, {"pelvis": {"p": (0, -0.12, 0.08), "r": (0.10, 0, 0)}, "chest": {"r": (0.14, 0, 0)},
              "neck1": {"r": (0.28, 0.65, 0)}, "neck2": {"r": (0.20, 0.45, 0)}, "jaw": {"r": (0.78, 0, 0)},
              "wingL1": {"r": (0, -0.45, 0.65)}, "wingR1": {"r": (0, 0.45, -0.65)}}),
        (50, {}),
    ])

    # 8. skyDive (46f): tuck wings tight & dive nose-first -> explosive landing flare!
    make_clip(arm_obj, "skyDive", [
        (0,  {"pelvis": {"r": (-0.25, 0, 0)}, "wingL1": {"r": (0, 0, 0.65)}, "wingR1": {"r": (0, 0, -0.65)}}),
        (18, {"pelvis": {"p": (0, 0.25, -0.10), "r": (0.62, 0, 0)}, "chest": {"r": (0.32, 0, 0)}, "neck1": {"r": (-0.45, 0, 0)},
              "wingL1": {"r": (0.25, -0.75, -0.35)}, "wingL2": {"r": (0, -0.45, -0.35)},
              "wingR1": {"r": (0.25, 0.75, 0.35)}, "wingR2": {"r": (0, 0.45, 0.35)},
              "foreL1": {"r": (-1.15, 0, 0)}, "foreR1": {"r": (-1.15, 0, 0)}}),
        (28, {"pelvis": {"p": (0, -0.38, 0.25), "r": (0.25, 0, 0)}, "chest": {"r": (0.28, 0, 0)}, "jaw": {"r": (0.65, 0, 0)},
              "wingL1": {"r": (-0.25, -0.45, 0.78)}, "wingL2": {"r": (0, 0, 0.35)},
              "wingR1": {"r": (-0.25, 0.45, -0.78)}, "wingR2": {"r": (0, 0, -0.35)},
              "foreL1": {"r": (-0.35, 0, 0.35)}, "foreR1": {"r": (-0.35, 0, -0.35)}}),
        (46, {}),
    ])

    # 9. stagger (24f): recoil back, wings flung wide, core exposed
    make_clip(arm_obj, "stagger", [
        (0,  {}),
        (8,  {"pelvis": {"p": (0, -0.15, -0.25), "r": (-0.35, 0, 0)}, "chest": {"r": (-0.35, 0, 0)}, "neck1": {"r": (-0.45, 0, 0)}, "jaw": {"r": (0.65, 0, 0)},
              "wingL1": {"r": (-0.20, -0.55, 0.65)}, "wingR1": {"r": (-0.20, 0.55, -0.65)}}),
        (24, {}),
    ])

    # 10. death (40f): collapse to the ground
    make_clip(arm_obj, "death", [
        (0,  {}),
        (20, {"pelvis": {"p": (0, -0.55, 0.15), "r": (0.25, 0, 0.25)}, "chest": {"r": (0.35, 0, 0.15)}, "neck1": {"r": (0.45, 0.20, 0)},
              "wingL1": {"r": (0.30, 0, -0.65)}, "wingR1": {"r": (0.30, 0, 0.65)}}),
        (40, {"pelvis": {"p": (0, -0.92, 0.25), "r": (0.15, 0, 0.45)}, "chest": {"r": (0.42, 0, 0.20)}, "neck1": {"r": (0.65, 0.35, 0)}, "jaw": {"r": (0.40, 0, 0)},
              "wingL1": {"r": (0.45, 0, -0.95)}, "wingL2": {"r": (0, 0, -0.45)},
              "wingR1": {"r": (0.45, 0, 0.95)}, "wingR2": {"r": (0, 0, 0.45)},
              "tail1": {"r": (-0.25, 0.35, 0)}, "tail2": {"r": (-0.15, 0.30, 0)}}),
    ])

    bpy.ops.object.mode_set(mode="OBJECT")

def render_preview(out_png):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 960
    scene.render.resolution_y = 640
    scene.render.filepath = out_png
    world = bpy.data.worlds.new("PreviewWorld")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.04, 0.04, 0.06, 1.0)
    scene.world = world

    cam_d = bpy.data.cameras.new("Cam")
    cam = bpy.data.objects.new("Cam", cam_d)
    scene.collection.objects.link(cam)
    cam.location = G(6.8, 3.8, 6.2)
    direction = G(0.0, 1.4, 0.0) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam

    for loc, energy, col in [
        (G(5, 6, 5), 1400, (1.0, 0.92, 0.85)),
        (G(-5, 3, -4), 700, (0.55, 0.72, 1.0)),
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
        "scale":    make_mat("scale",    (0.14, 0.13, 0.15), rough=0.52, metal=0.25),
        "membrane": make_mat("membrane", (0.24, 0.11, 0.10), rough=0.72, metal=0.05),
        "bone":     make_mat("bone",     (0.72, 0.66, 0.54), rough=0.45, metal=0.05),
        "ember":    make_mat("ember",    (1.00, 0.38, 0.08), rough=0.30, metal=0.0, emit=3.5),
        "cinder":   make_mat("cinder",   (1.00, 0.58, 0.14), rough=0.25, metal=0.0, emit=5.0),
    }
    objs = [
        build_slot_mesh("scale",    mats["scale"],    build_scales),
        build_slot_mesh("membrane", mats["membrane"], build_membranes),
        build_slot_mesh("bone",     mats["bone"],     build_bone_parts),
        build_slot_mesh("ember",    mats["ember"],    build_ember_parts),
        build_slot_mesh("cinder",   mats["cinder"],   build_cinder_parts),
    ]
    # Join into one multi-material skinned mesh
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    body = bpy.context.view_layer.objects.active
    body.name = "ashwing_body"

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
    print(f"ASHWING EXPORTED: {len(body.data.vertices)} verts, {len(body.data.polygons)} polys, {len(BONE_DEFS)} bones -> {glb_path}")

if __name__ == "__main__":
    main()
