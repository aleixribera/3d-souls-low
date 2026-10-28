import bpy,os,math
O=os.path.abspath('assets/enemies/hollow');bpy.ops.wm.open_mainfile(filepath=O+'/hollow.blend');r=bpy.data.objects['Skeleton'];body=bpy.data.objects['Hollow Soldier'];S=bpy.context.scene
for tr in r.animation_data.nla_tracks:tr.mute=True
r.animation_data.action=bpy.data.actions['rise'];S.frame_set(14,subframe=.5);bpy.context.view_layer.update();w=r.pose.bones['weapon'];saved=w.matrix.copy();target=w.head.copy()
def objective():return (r.pose.bones['hand.R'].tail-target).length_squared
best=objective()
for step in [.5,.25,.125,.0625,.03125]:
 for sweep in range(2):
  for name in ['spine','chest','upperArm.R','forearm.R']:
   p=r.pose.bones[name]
   for i in range(3):
    old=p.rotation_euler[i];win=old
    for d in [-step,step]:
     p.rotation_euler[i]=old+d;bpy.context.view_layer.update();score=objective()
     if score<best:best=score;win=old+d
    p.rotation_euler[i]=win;bpy.context.view_layer.update()
for n in ['spine','chest','upperArm.R','forearm.R']:r.pose.bones[n].keyframe_insert(data_path='rotation_euler',frame=14.5,group=n)
p=r.pose.bones['hips'];M=p.matrix.copy();M.translation+=target-r.pose.bones['hand.R'].tail;p.matrix=M;bpy.context.view_layer.update();p.keyframe_insert(data_path='location',frame=14.5,group='hips');w.matrix=saved;bpy.context.view_layer.update();w.keyframe_insert(data_path='location',frame=14.5,group='weapon');w.keyframe_insert(data_path='rotation_euler',frame=14.5,group='weapon');print('PICKUP GAP',math.sqrt(objective()),flush=True)
o=body.evaluated_get(bpy.context.evaluated_depsgraph_get());m=o.to_mesh();print('MIN HEIGHT',min((o.matrix_world@v.co).z for v in m.vertices),flush=True);o.to_mesh_clear();r.animation_data.action=None
for tr in r.animation_data.nla_tracks:tr.mute=False
bpy.ops.wm.save_as_mainfile(filepath=O+'/hollow.blend')
