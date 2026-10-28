import bpy,math,os
from mathutils import Vector,Matrix
O=os.path.abspath('assets/enemies/hollow'); bpy.ops.wm.open_mainfile(filepath=O+'/hollow.blend'); rig=bpy.data.objects['Skeleton']; body=bpy.data.objects['Hollow Soldier']; S=bpy.context.scene
for tr in rig.animation_data.nla_tracks: tr.mute=True
def act(n,t):
 rig.animation_data.action=bpy.data.actions[n]; f=1+t*30; S.frame_set(int(f),subframe=f%1); bpy.context.view_layer.update()
def insert(b,path,t):rig.pose.bones[b].keyframe_insert(data_path=path,frame=1+30*t,group=b)
act('death',1.2)
for side in ['L','R']:
 for name in ['thigh.'+side,'shin.'+side,'foot.'+side]: rig.pose.bones[name].rotation_euler=(0,0,0); insert(name,'rotation_euler',1.2)
p=rig.pose.bones['hips']; M=p.matrix.copy(); M.translation.z+=.045; p.matrix=M; bpy.context.view_layer.update(); insert('hips','location',1.2)
rest=rig.data.bones['weapon'].matrix_local.copy(); head=rig.data.bones['weapon'].head_local.copy(); w=rig.pose.bones['weapon']; w.matrix=Matrix.Translation(Vector((-.56,-.30,.09))) @ Matrix.Rotation(-.56,4,'X') @ Matrix.Translation(-head) @ rest; bpy.context.view_layer.update(); insert('weapon','location',1.2); insert('weapon','rotation_euler',1.2)
# Fit knees and feet to the ground without changing the torso or blade target.
indices={}
for side in ['L','R']:
 for part in ['thigh','shin','foot']:
  name=part+'.'+side; gi=body.vertex_groups[name].index; indices[name]=[v.index for v in body.data.vertices if any(g.group==gi for g in v.groups)]
def measure(side):
 bpy.context.view_layer.update(); ob=body.evaluated_get(bpy.context.evaluated_depsgraph_get()); m=ob.to_mesh(); out=[]
 for part in ['thigh','shin','foot']:
  out.append(min((ob.matrix_world @ m.vertices[i].co).z for i in indices[part+'.'+side]))
 ob.to_mesh_clear(); return out
def objective(side):
 thigh,shin,foot=measure(side); return max(0,-thigh)**2*5+max(0,-shin)**2*8+foot**2*8
for t in [1.29,1.55]:
 act('attack_overhead',t)
 for side in ['L','R']:
  names=['thigh.'+side,'shin.'+side,'foot.'+side]; best=objective(side)
  for step in [.6,.3,.15,.075,.0375]:
   for _ in range(2):
    for n in names:
     pb=rig.pose.bones[n]; old=pb.rotation_euler.x; win=old
     for delta in [-step,step]:
      pb.rotation_euler.x=old+delta; score=objective(side)
      if score<best:best=score;win=old+delta
     pb.rotation_euler.x=win
  for n in names:insert(n,'rotation_euler',t)
  print('GROUND',t,side,measure(side),flush=True)
rig.animation_data.action=None
for tr in rig.animation_data.nla_tracks:tr.mute=False
bpy.ops.wm.save_as_mainfile(filepath=O+'/hollow.blend')
