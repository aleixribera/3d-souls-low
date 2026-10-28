import bpy,os,math
from mathutils import Vector
O=os.path.abspath('assets/enemies/hollow'); bpy.ops.wm.open_mainfile(filepath=O+'/hollow.blend'); rig=bpy.data.objects['Skeleton']; body=bpy.data.objects['Hollow Soldier']; S=bpy.context.scene
for tr in rig.animation_data.nla_tracks:tr.mute=True
def act(name,t):
 rig.animation_data.action=bpy.data.actions[name]; f=1+t*30; S.frame_set(int(f),subframe=f%1); bpy.context.view_layer.update()
def ins(b,path,t):rig.pose.bones[b].keyframe_insert(data_path=path,frame=1+t*30,group=b)
act('death',1.2)
for side in ['L','R']:
 name='foot.'+side; gi=body.vertex_groups[name].index; ids=[v.index for v in body.data.vertices if any(g.group==gi for g in v.groups)]; pb=rig.pose.bones[name]
 def cost():
  bpy.context.view_layer.update(); o=body.evaluated_get(bpy.context.evaluated_depsgraph_get()); m=o.to_mesh(); z=min((o.matrix_world@m.vertices[i].co).z for i in ids); o.to_mesh_clear(); return abs(z-.002)
 best=cost()
 for step in [.6,.3,.15,.075,.0375]:
  for i in range(3):
   old=pb.rotation_euler[i]; win=old
   for delta in [-step,step]:
    pb.rotation_euler[i]=old+delta; c=cost()
    if c<best:best=c;win=old+delta
   pb.rotation_euler[i]=win
 ins(name,'rotation_euler',1.2); print('FOOT',side,best,flush=True)
for name,times in [('death',[1.2]),('dormant',[0,1,2]),('rise',[0,.45])]:
 for t in times:
  act(name,t); pb=rig.pose.bones['weapon']; M=pb.matrix.copy(); M.translation.z-=.06; pb.matrix=M; bpy.context.view_layer.update(); ins('weapon','location',t); ins('weapon','rotation_euler',t)
rig.animation_data.action=None
for tr in rig.animation_data.nla_tracks:tr.mute=False
bpy.ops.wm.save_as_mainfile(filepath=O+'/hollow.blend')
for tr in rig.animation_data.nla_tracks:tr.mute=True
world=bpy.data.worlds.new('Preview studio'); S.world=world; world.color=(.16,.16,.16); S.render.engine='CYCLES'; S.cycles.samples=8; S.render.resolution_x=640; S.render.resolution_y=640
def light(loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc); o=bpy.context.object; o.data.energy=power; o.data.size=size; o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
light((3,-4,5),550,4);light((-3,-1,3),350,3);light((0,3,4),500,3)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,0)); bpy.context.object.data.materials.append(bpy.data.materials.new('Preview matte'))
bpy.ops.object.camera_add(); cam=bpy.context.object; S.camera=cam; cam.data.type='ORTHO'; cam.data.ortho_scale=3.4; cam.location=(4,-5,2.8); cam.rotation_euler=(Vector((0,-.3,.83))-cam.location).to_track_quat('-Z','Y').to_euler()
for name,t,filename in [('attack_overhead',1.29,'_attack_overhead_2.png'),('attack_overhead',1.55,'_attack_overhead_3.png'),('death',1.2,'_other_6.png'),('dormant',1,'_other_7.png'),('rise',.45,'_other_8.png')]:
 act(name,t); S.render.filepath=O+'/previews/'+filename; bpy.ops.render.render(write_still=True)
