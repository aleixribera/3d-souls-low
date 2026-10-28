import bpy
bpy.ops.wm.open_mainfile(filepath='assets/enemies/hollow/hollow.blend'); r=bpy.data.objects['Skeleton'];
for tr in r.animation_data.nla_tracks:tr.mute=True
for name,t in [('idle',0),('attack_overhead',1.29),('death',1.2),('attack_overhead',1.29)]:
 r.animation_data.action=bpy.data.actions[name]; f=1+t*30;bpy.context.scene.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update();print(name,'weapon loc',tuple(r.pose.bones['weapon'].location),'hips',tuple(r.pose.bones['hips'].location))
