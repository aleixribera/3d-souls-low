import bpy,os,math
O=os.path.abspath('assets/enemies/hollow');bpy.ops.wm.open_mainfile(filepath=O+'/hollow.blend');r=bpy.data.objects['Skeleton'];body=bpy.data.objects['Hollow Soldier'];S=bpy.context.scene
for tr in r.animation_data.nla_tracks:tr.mute=True
def frame(t):
 f=1+30*t;S.frame_set(math.floor(f),subframe=f-math.floor(f));bpy.context.view_layer.update()
for name,d in [('idle',3),('death',1.2),('rise',1.5)]:
 r.animation_data.action=bpy.data.actions[name];worst=(100,0)
 for i in range(round(d*60)+1):
  t=i/60;frame(t);o=body.evaluated_get(bpy.context.evaluated_depsgraph_get());m=o.to_mesh();z=min((o.matrix_world@v.co).z for v in m.vertices);o.to_mesh_clear();worst=min(worst,(z,t))
 print('MIN',name,worst,flush=True)
r.animation_data.action=bpy.data.actions['attack_overhead'];mx=(0,0)
for i in range(78):
 t=min(i/60,1.29);frame(t);gap=(r.pose.bones['hand.L'].tail-r.pose.bones['weapon'].head).length;mx=max(mx,(gap,t))
frame(1.29);mx=max(mx,((r.pose.bones['hand.L'].tail-r.pose.bones['weapon'].head).length,1.29));print('GRIP WORST',mx,flush=True)
