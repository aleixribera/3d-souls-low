import bpy,math,os
from mathutils import Vector
O=os.path.abspath('assets/enemies/hollow'); bpy.ops.wm.open_mainfile(filepath=O+'/hollow.blend'); rig=bpy.data.objects['Skeleton']; body=bpy.data.objects['Hollow Soldier']; S=bpy.context.scene
for tr in rig.animation_data.nla_tracks:tr.mute=True
durations={'idle':3,'walk':1,'chase':.8,'attack_swing':1.6,'attack_overhead':2.45,'hurt':.24,'stagger':1.1,'parried':1.7,'death':1.2,'dormant':2,'rise':1.5}
# Every action supplies baseline locations; no value can leak from the preceding clip.
for name,d in durations.items():
 a=bpy.data.actions[name]; rig.animation_data.action=a; rig.animation_data.action_slot=a.slots[0]; bag=a.layers[0].strips[0].channelbag(a.slots[0]); paths={f.data_path for f in bag.fcurves}
 for bone in ['hips','weapon']:
  if 'pose.bones["%s"].location'%bone not in paths:
   pb=rig.pose.bones[bone]; pb.location=(0,0,0); pb.keyframe_insert(data_path='location',frame=1,group=bone); pb.keyframe_insert(data_path='location',frame=1+d*30,group=bone)
def act(n,t):
 rig.animation_data.action=bpy.data.actions[n]; f=1+t*30; S.frame_set(int(f),subframe=f%1); bpy.context.view_layer.update()
def key(b,path,t):rig.pose.bones[b].keyframe_insert(data_path=path,frame=1+t*30,group=b)
def point(b,p):return rig.pose.bones[b].matrix @ (rig.data.bones[b].matrix_local.inverted() @ Vector(p))
def solve(channels,goal):
 best=goal()
 for step in [.6,.3,.15,.075,.0375]:
  for sweep in range(2):
   for b,i in channels:
    pb=rig.pose.bones[b]; old=pb.rotation_euler[i]; win=old
    for d in [-step,step]:
     pb.rotation_euler[i]=old+d; bpy.context.view_layer.update(); score=goal()
     if score<best:best=score;win=old+d
    pb.rotation_euler[i]=win; bpy.context.view_layer.update()
 return best
# Solve strike with the sword attached; translate pelvis for the last few centimetres.
for t in [1.29,1.55]:
 act('attack_overhead',t)
 def target():
  tip=point('weapon',(-.4,-1.12,.21)); grip=rig.pose.bones['weapon'].head
  return (tip-Vector((-.2,-1.8,.03))).length_squared+.1*(grip-Vector((-.2,-.85,.48))).length_squared
 solve([(b,i) for b in ['chest','upperArm.R','forearm.R','hand.R'] for i in range(3)],target)
 for b in ['chest','upperArm.R','forearm.R','hand.R']:key(b,'rotation_euler',t)
 hip=rig.pose.bones['hips']; m=hip.matrix.copy(); v=point('weapon',(-.4,-1.12,.21)); m.translation+=Vector((-.2-v.x,-1.8-v.y,.03-v.z)); hip.matrix=m; bpy.context.view_layer.update(); key('hips','location',t)
 print('TIP',t,tuple(point('weapon',(-.4,-1.12,.21))),'weapon loc',tuple(rig.pose.bones['weapon'].location),flush=True)
# Left hand reaches the weapon at the four held phases.
for t in [.85,1.15,1.29,1.55]:
 act('attack_overhead',t); target=rig.pose.bones['weapon'].head.copy()
 def leftgoal():return (rig.pose.bones['hand.L'].head-target).length_squared
 solve([(b,i) for b in ['upperArm.L','forearm.L'] for i in range(3)],leftgoal)
 for b in ['upperArm.L','forearm.L']:key(b,'rotation_euler',t)
 print('LEFT DIST',t,math.sqrt(leftgoal()),flush=True)
# Fit feet while keeping sword and hips fixed.
indices={}
for side in ['L','R']:
 for part in ['thigh','shin','foot']:
  name=part+'.'+side; gi=body.vertex_groups[name].index; indices[name]=[v.index for v in body.data.vertices if any(g.group==gi for g in v.groups)]
def measure(side):
 bpy.context.view_layer.update(); ob=body.evaluated_get(bpy.context.evaluated_depsgraph_get()); m=ob.to_mesh(); vals=[min((ob.matrix_world@m.vertices[i].co).z for i in indices[part+'.'+side]) for part in ['thigh','shin','foot']]; ob.to_mesh_clear(); return vals
def objective(side):
 a,b,c=measure(side);return max(0,-a)**2*5+max(0,-b)**2*12+c*c*8
for t in [1.29,1.55]:
 act('attack_overhead',t)
 for side in ['L','R']:
  names=['thigh.'+side,'shin.'+side,'foot.'+side]; best=objective(side)
  for step in [.6,.3,.15,.075,.0375]:
   for _ in range(2):
    for n in names:
     p=rig.pose.bones[n]; old=p.rotation_euler.x; win=old
     for d in [-step,step]:
      p.rotation_euler.x=old+d; score=objective(side)
      if score<best:best=score;win=old+d
     p.rotation_euler.x=win
  for n in names:key(n,'rotation_euler',t)
  print('FLOOR',t,side,measure(side),flush=True)
rig.animation_data.action=None
for tr in rig.animation_data.nla_tracks:tr.mute=False
bpy.ops.wm.save_as_mainfile(filepath=O+'/hollow.blend')
