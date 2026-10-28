import bpy,os,math
from mathutils import Vector
O=os.path.abspath('assets/enemies/hollow');bpy.ops.wm.open_mainfile(filepath=O+'/hollow.blend');rig=bpy.data.objects['Skeleton'];S=bpy.context.scene
for tr in rig.animation_data.nla_tracks:tr.mute=True
rig.animation_data.action=bpy.data.actions['rise'];S.frame_set(14,subframe=.5);bpy.context.view_layer.update();weapon=rig.pose.bones['weapon'];saved=weapon.matrix.copy();target=weapon.head.copy()
def objective():return (rig.pose.bones['hand.R'].tail-target).length_squared
best=objective()
for step in [.6,.3,.15,.075,.0375,.01875]:
 for sweep in range(3):
  for name in ['upperArm.R','forearm.R','hand.R']:
   pb=rig.pose.bones[name]
   for i in range(3):
    old=pb.rotation_euler[i];win=old
    for d in [-step,step]:
     pb.rotation_euler[i]=old+d;bpy.context.view_layer.update();score=objective()
     if score<best:best=score;win=old+d
    pb.rotation_euler[i]=win;bpy.context.view_layer.update()
for name in ['upperArm.R','forearm.R','hand.R']:rig.pose.bones[name].keyframe_insert(data_path='rotation_euler',frame=14.5,group=name)
weapon.matrix=saved;bpy.context.view_layer.update();weapon.keyframe_insert(data_path='location',frame=14.5,group='weapon');weapon.keyframe_insert(data_path='rotation_euler',frame=14.5,group='weapon');print('PICKUP GAP',math.sqrt(best),flush=True)
rig.animation_data.action=None
for tr in rig.animation_data.nla_tracks:tr.mute=False
bpy.ops.wm.save_as_mainfile(filepath=O+'/hollow.blend')
