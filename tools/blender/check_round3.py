import bpy,math
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath='assets/enemies/hollow/hollow.blend');r=bpy.data.objects['Skeleton'];body=bpy.data.objects['Hollow Soldier'];S=bpy.context.scene
for tr in r.animation_data.nla_tracks:tr.mute=True
r.animation_data.action=bpy.data.actions['idle']; S.frame_set(1);bpy.context.view_layer.update()
p=r.pose.bones['weapon'];gi=body.vertex_groups['weapon'].index;ids=[v.index for v in body.data.vertices if any(g.group==gi for g in v.groups)]
def low():
 bpy.context.view_layer.update();o=body.evaluated_get(bpy.context.evaluated_depsgraph_get());m=o.to_mesh();v=min((o.matrix_world@m.vertices[i].co).z for i in ids);o.to_mesh_clear();return v
print('START',tuple(p.rotation_euler),low())
for i in range(3):
 for x in [-.8,-.4,.4,.8]:
  p.rotation_euler=(0,0,0);p.rotation_euler[i]=x;print(i,x,low())
