import bpy,os
O=os.path.abspath('assets/enemies/hollow');bpy.ops.wm.open_mainfile(filepath=O+'/hollow.blend');r=bpy.data.objects['Skeleton'];body=bpy.data.objects['Hollow Soldier'];
for tr in r.animation_data.nla_tracks:tr.mute=True
r.animation_data.action=bpy.data.actions['rise'];bpy.context.scene.frame_set(14,subframe=.5);bpy.context.view_layer.update()
indices={}
for part in ['thigh','shin','foot']:
 n=part+'.R';gi=body.vertex_groups[n].index;indices[n]=[v.index for v in body.data.vertices if any(g.group==gi for g in v.groups)]
def measure():
 bpy.context.view_layer.update();o=body.evaluated_get(bpy.context.evaluated_depsgraph_get());m=o.to_mesh();z=[min((o.matrix_world@m.vertices[i].co).z for i in indices[p+'.R']) for p in ['thigh','shin','foot']];o.to_mesh_clear();return z
def cost():
 a,b,c=measure();return max(0,-a)**2*5+max(0,-b)**2*12+c*c*8
best=cost()
for step in [.7,.35,.175,.09,.045]:
 for sweep in range(2):
  for n in indices:
   p=r.pose.bones[n]
   for i in range(3):
    old=p.rotation_euler[i];win=old
    for d in [-step,step]:
     p.rotation_euler[i]=old+d;s=cost()
     if s<best:best=s;win=old+d
    p.rotation_euler[i]=win
for n in indices:r.pose.bones[n].keyframe_insert(data_path='rotation_euler',frame=14.5,group=n)
print('GROUND',measure());r.animation_data.action=None
for tr in r.animation_data.nla_tracks:tr.mute=False
bpy.ops.wm.save_as_mainfile(filepath=O+'/hollow.blend')
