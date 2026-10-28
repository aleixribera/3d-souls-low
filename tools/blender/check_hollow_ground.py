import bpy,os,math
bpy.ops.wm.open_mainfile(filepath='assets/enemies/hollow/hollow.blend'); rig=bpy.data.objects['Skeleton']; body=bpy.data.objects['Hollow Soldier'];
for tr in rig.animation_data.nla_tracks:tr.mute=True
for name,t in [('death',1.2),('dormant',0),('attack_overhead',1.29)]:
 rig.animation_data.action=bpy.data.actions[name]; f=1+t*30; bpy.context.scene.frame_set(int(f),subframe=f%1); deps=bpy.context.evaluated_depsgraph_get(); ob=body.evaluated_get(deps); mesh=ob.to_mesh(); mins={}
 for a,b in zip(body.data.vertices,mesh.vertices):
  z=(ob.matrix_world@b.co).z
  for g in a.groups:
   n=body.vertex_groups[g.group].name; mins[n]=min(mins.get(n,100),z)
 print(name,sorted((k,round(v,3)) for k,v in mins.items()),flush=True); ob.to_mesh_clear()
