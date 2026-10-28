import bpy,os,math
bpy.ops.wm.open_mainfile(filepath='assets/enemies/hollow/hollow.blend');r=bpy.data.objects['Skeleton'];body=bpy.data.objects['Hollow Soldier'];S=bpy.context.scene
for tr in r.animation_data.nla_tracks:tr.mute=True
for name,d in [('idle',3),('walk',1),('chase',.8),('attack_swing',1.6),('attack_overhead',2.45),('hurt',.24),('stagger',1.1),('parried',1.7),('death',1.2),('dormant',2),('rise',1.5)]:
 r.animation_data.action=bpy.data.actions[name];worst=(100,0)
 for i in range(13):
  t=d*i/12;f=1+t*30;S.frame_set(math.floor(f),subframe=f-math.floor(f));o=body.evaluated_get(bpy.context.evaluated_depsgraph_get());m=o.to_mesh();z=min((o.matrix_world@v.co).z for v in m.vertices);o.to_mesh_clear();worst=min(worst,(z,t))
 print(name,'lowest',tuple(round(x,3) for x in worst),flush=True)
