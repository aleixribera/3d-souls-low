import bpy, math, os, random
from mathutils import Vector, Matrix
from math import pi
O=os.path.abspath('assets/enemies/hollow'); bpy.ops.wm.open_mainfile(filepath=O+'/hollow.blend'); S=bpy.context.scene; S.render.fps=30
rig=bpy.data.objects['Skeleton']; body=bpy.data.objects['Hollow Soldier']; mat=body.data.materials[0]
for tr in rig.animation_data.nla_tracks: tr.mute=True
rig.animation_data.action=None; bpy.context.view_layer.update()
# Reposition bone-parented sockets in bind pose, before posing or animating.
for name,b,loc in [('socket_bladeBase','weapon',(-.40,-.30,.76)),('socket_bladeTip','weapon',(-.40,-1.12,.21)),('socket_eyes','head',(0,-.20,1.635)),('socket_chest','chest',(0,-.16,1.25))]:
 o=bpy.data.objects[name]; o.parent=rig; o.parent_type='BONE'; o.parent_bone=b; bpy.context.view_layer.update(); o.matrix_world=Matrix.Translation(Vector(loc)); bpy.context.view_layer.update()
# Extra worn details are weighted into the existing skin and use the existing atlas.
new=[]
def finish(o,n,b,c):
 o.name=n; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(mat); uv=o.data.uv_layers.active or o.data.uv_layers.new(name='Atlas')
 for l in uv.data:
  u,v=l.uv; l.uv=((c*128+8+u*110)/1024,.04+v*.9)
 vg=o.vertex_groups.new(name=b); vg.add(list(range(len(o.data.vertices))),1,'REPLACE'); md=o.modifiers.new('Skin','ARMATURE'); md.object=rig; o.parent=rig; new.append(o)
def ell(n,loc,sc,b,c):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,location=loc); o=bpy.context.object; o.scale=sc; finish(o,n,b,c)
def cube(n,loc,sc,b,c,rot=(0,0,0)):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc,rotation=rot); o=bpy.context.object; o.scale=sc; finish(o,n,b,c)
# Sunken cheek hollows and ragged exposed patches, plus diagonal rust marks.
for g in [-1,1]:
 ell('Hollowed cheek',(g*.078,-.175,1.57),(.039,.008,.024),'head',2)
 cube('Torn sleeve edge',(g*.335,-.089,1.16),(.075,.018,.04),'upperArm.'+('L' if g>0 else 'R'),2,(0,g*.17,0))
cube('Mail side tear',(.238,-.075,1.11),(.034,.11,.16),'chest',4,(0,.12,0))
for i in range(4): cube('Helmet rust streak',( -.10+i*.06,-.149,1.76),(.018,.009,.065-i*.006),'head',3,(0,.1+i*.08,0))
cube('Loose knee strap',(.14,-.148,.49),(.16,.015,.023),'shin.L',2,(0,.18,0)); cube('Loose hanging strap',(.21,-.12,.44),(.026,.015,.12),'shin.L',2,(0,-.30,0))
# Join added details onto the existing skinned mesh.
bpy.ops.object.select_all(action='DESELECT'); body.select_set(True)
for o in new:o.select_set(True)
bpy.context.view_layer.objects.active=body; bpy.ops.object.join()
# Add subtle irregular grime to the already packed atlas.
image=bpy.data.images['Painted atlas']; pixels=list(image.pixels[:]); random.seed(812)
for i in range(6500):
 x=random.randrange(1024); y=random.randrange(1024); band=x//128
 if band==6: continue
 radius=random.randrange(1,5)
 for yy in range(max(0,y-radius),min(1024,y+radius)):
  for xx in range(max(0,x-radius),min(1024,x+radius)):
   if (xx-x)**2+(yy-y)**2>radius*radius: continue
   k=(yy*1024+xx)*4
   for c in range(3):pixels[k+c]*=.72
image.pixels.foreach_set(pixels); image.pack()
# Increase the forward shoulder roll consistently, keeping guard frames identical.
for act in bpy.data.actions:
 bag=act.layers[0].strips[0].channelbag(act.slots[0])
 for fc in bag.fcurves:
  if fc.array_index!=0: continue
  if fc.data_path=='pose.bones["spine"].rotation_euler': delta=.10
  elif fc.data_path=='pose.bones["chest"].rotation_euler': delta=.09
  elif fc.data_path in ('pose.bones["shin.R"].rotation_euler','pose.bones["shin.L"].rotation_euler'): delta=.12
  else: continue
  for k in fc.keyframe_points:
   k.co.y+=delta; k.handle_left.y+=delta; k.handle_right.y+=delta
# Slow walk is one second; adjust source keys, not export times.
a=bpy.data.actions['walk']; bag=a.layers[0].strips[0].channelbag(a.slots[0])
for fc in bag.fcurves:
 for k in fc.keyframe_points:
  for pt in (k.co,k.handle_left,k.handle_right): pt.x=1+(pt.x-1)/1.2
for tr in rig.animation_data.nla_tracks:
 if tr.name=='walk':
  st=tr.strips[0]; st.action_frame_end=31; st.frame_end=31
# Author keyed pelvis translations without touching the root.
def action(name): rig.animation_data.action=bpy.data.actions[name]; rig.animation_data.action_slot=rig.animation_data.action.slots[0]
def setframe(t): S.frame_set(int(1+t*30),subframe=(1+t*30)%1); bpy.context.view_layer.update()
def key(name,t,loc=None,rot=None):
 setframe(t); pb=rig.pose.bones[name]
 if loc is not None: pb.location=loc; pb.keyframe_insert(data_path='location',frame=1+t*30,group=name)
 if rot is not None: pb.rotation_euler=rot; pb.keyframe_insert(data_path='rotation_euler',frame=1+t*30,group=name)
action('death')
for t,loc,rot in [(0,(0,0,0),(0,0,0)),(.4,(0,-.34,0),(0,0,0)),(.75,(0,-.58,0),(.7,0,0)),(1.2,(0,-.68,0),(1.5,0,0))]: key('hips',t,loc,rot)
for t in [.75,1.2]:
 for b in ['spine','chest']: key(b,t,rot=(.08,0,0))
# On its back at ground height; rise starts from the same pose.
for nm in ['dormant','rise']:
 action(nm)
 times=[0,1,2] if nm=='dormant' else [0,.45,.9,1.5]
 for t in times:
  if nm=='dormant' or t==0: loc=(0,-.68,0); rot=(-1.5,0,0)
  elif t==.45: loc=(0,-.52,0); rot=(-.9,0,.35)
  elif t==.9: loc=(0,-.25,0); rot=(-.35,0,.1)
  else: loc=(0,0,0); rot=(0,0,0)
  key('hips',t,loc,rot)
  if nm=='dormant' or t==0:
   for b in ['spine','chest']: key(b,t,rot=(0,0,0))
# Sword floor pose: animate its local transform while retaining its weapon-bone skin.
rest=rig.data.bones['weapon'].matrix_local.copy(); head=rig.data.bones['weapon'].head_local.copy()
def floor_sword(t,where=(-.56,-.30,.09)):
 setframe(t); pb=rig.pose.bones['weapon']; desired=Matrix.Translation(Vector(where)) @ Matrix.Rotation(-.56,4,'X') @ Matrix.Translation(-head) @ rest; pb.matrix=desired; bpy.context.view_layer.update(); pb.keyframe_insert(data_path='location',frame=1+t*30,group='weapon'); pb.keyframe_insert(data_path='rotation_euler',frame=1+t*30,group='weapon')
for nm,ts in [('death',[1.2]),('dormant',[0,1,2]),('rise',[0,.45])]:
 action(nm)
 for t in ts: floor_sword(t)
 if nm=='death': key('weapon',0,loc=(0,0,0),rot=(0,0,0)); key('weapon',.55,loc=(0,0,0),rot=(0,0,0))
 if nm=='rise': key('weapon',.9,loc=(0,0,0),rot=(0,0,0)); key('weapon',1.5,loc=(0,0,0),rot=(0,0,0))
# Aim both hands toward the buried sword at the exact strike and follow keys.
action('attack_overhead')
def point(b,restpoint): return rig.pose.bones[b].matrix @ (rig.data.bones[b].matrix_local.inverted() @ Vector(restpoint))
def solve(channels,objective,passes=5):
 best=objective()
 for step in [.55,.28,.14,.07,.035][:passes]:
  for sweep in range(2):
   for bn,axis in channels:
    pb=rig.pose.bones[bn]; old=pb.rotation_euler[axis]; winner=old
    for d in [-step,step]:
     pb.rotation_euler[axis]=old+d; bpy.context.view_layer.update(); score=objective()
     if score<best: best=score; winner=old+d
    pb.rotation_euler[axis]=winner; bpy.context.view_layer.update()
 return best
for t in [1.29,1.55]:
 setframe(t); hip=rig.pose.bones['hips']; hip.location=(0,-.08,.20); bpy.context.view_layer.update()
 def goal():
  tip=point('weapon',(-.40,-1.12,.21)); grip=rig.pose.bones['weapon'].head
  return (tip-Vector((-.20,-1.8,.03))).length_squared+0.2*(grip-Vector((-.20,-.85,.48))).length_squared
 score=solve([(b,i) for b in ['chest','upperArm.R','forearm.R','hand.R'] for i in range(3)],goal)
 for b in ['chest','upperArm.R','forearm.R','hand.R']:
  rig.pose.bones[b].keyframe_insert(data_path='rotation_euler',frame=1+t*30,group=b)
 hip.keyframe_insert(data_path='location',frame=1+t*30,group='hips')
 print('OVERHEAD',t,'tip',tuple(point('weapon',(-.40,-1.12,.21))),'error',score,flush=True)
# Zero pelvis translation at start and return-to-guard.
for t in [0,1.15,2.45]: key('hips',t,loc=(0,0,0))
for t in [.85,1.15,1.29,1.55]:
 setframe(t); target=rig.pose.bones['weapon'].head.copy()
 def leftgoal(): return (rig.pose.bones['hand.L'].head-target).length_squared
 solve([(b,i) for b in ['upperArm.L','forearm.L'] for i in range(3)],leftgoal)
 for b in ['upperArm.L','forearm.L']: rig.pose.bones[b].keyframe_insert(data_path='rotation_euler',frame=1+t*30,group=b)
 print('LEFT GRIP',t,math.sqrt(leftgoal()),flush=True)
rig.animation_data.action=None
for tr in rig.animation_data.nla_tracks: tr.mute=False
# Save source and export only the existing character and sockets.
bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True); body.select_set(True)
for o in bpy.data.objects:
 if o.name.startswith('socket_'): o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=O+'/hollow.blend')
bpy.ops.export_scene.gltf(filepath=O+'/hollow.glb',export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_yup=True)
print('TRIANGLES',sum(len(p.vertices)-2 for p in body.data.polygons),flush=True)
# Render presentation-only scene, keeping all rendering helpers out of the GLB.
for tr in rig.animation_data.nla_tracks: tr.mute=True
world=bpy.data.worlds.new('Studio'); S.world=world; world.color=(.16,.16,.16); S.render.engine='CYCLES'; S.cycles.samples=8; S.render.resolution_x=640; S.render.resolution_y=640; S.render.resolution_percentage=100
def light(loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc); o=bpy.context.object; o.data.energy=power; o.data.size=size; o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
light((3,-4,5),550,4); light((-3,-1,3),350,3); light((0,3,4),500,3)
# Floor is a visual reference in previews only.
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,0)); floor=bpy.context.object; floor.name='Preview floor'; floor.data.materials.append(bpy.data.materials.new('Preview matte'))
bpy.ops.object.camera_add(); cam=bpy.context.object; S.camera=cam; cam.data.type='ORTHO'; cam.data.ortho_scale=3.4
def render(name,act,t,loc):
 action(act); setframe(t); cam.location=loc; cam.rotation_euler=(Vector((0,-.30,.83))-cam.location).to_track_quat('-Z','Y').to_euler(); S.render.filepath=O+'/previews/'+name; bpy.ops.render.render(write_still=True)
for name,loc in [('front',(0,-6,2)),('side',(6,0,2)),('back',(0,6,2)),('three-quarter',(4,-5,2.5)),('top',(0,-.1,7))]: render(name+'.png','idle',0,loc)
for name,times in [('attack_swing',[0,.75,.87,1.05,1.6]),('attack_overhead',[0,1.15,1.29,1.55,2.45])]:
 for i,t in enumerate(times): render('_%s_%d.png'%(name,i),name,t,(4,-5,2.8))
for i,(name,t) in enumerate([('idle',1.55),('walk',.25),('chase',.2),('hurt',.09),('stagger',.55),('parried',.75),('death',1.2),('dormant',1),('rise',.45)]): render('_other_%d.png'%i,name,t,(4,-5,2.8))
