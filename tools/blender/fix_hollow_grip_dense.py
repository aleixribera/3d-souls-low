import bpy,os,math
O=os.path.abspath('assets/enemies/hollow');bpy.ops.wm.open_mainfile(filepath=O+'/hollow.blend');r=bpy.data.objects['Skeleton'];S=bpy.context.scene
for tr in r.animation_data.nla_tracks:tr.mute=True
r.animation_data.action=bpy.data.actions['attack_overhead'];a=r.animation_data.action;bag=a.layers[0].strips[0].channelbag(a.slots[0])
for c in bag.fcurves:
 if c.data_path=='pose.bones["hand.L"].location':
  for k in c.keyframe_points:k.interpolation='LINEAR'
def frame(t):
 f=1+t*30;S.frame_set(math.floor(f),subframe=f-math.floor(f));bpy.context.view_layer.update()
for t in sorted(set([i/120 for i in range(155)]+[1.15,1.29])):
 frame(t);p=r.pose.bones['hand.L'];target=r.pose.bones['weapon'].head.copy();M=p.matrix.copy();M.translation+=target-p.tail;p.matrix=M;bpy.context.view_layer.update();p.keyframe_insert(data_path='location',frame=1+t*30,group='hand.L')
for c in bag.fcurves:
 if c.data_path=='pose.bones["hand.L"].location':
  for k in c.keyframe_points:k.interpolation='LINEAR'
worst=(0,0)
for i in range(310):
 t=min(i/240,1.29);frame(t);worst=max(worst,((r.pose.bones['hand.L'].tail-r.pose.bones['weapon'].head).length,t))
print('GRIP VALIDATION',worst,flush=True);r.animation_data.action=None
for tr in r.animation_data.nla_tracks:tr.mute=False
bpy.ops.wm.save_as_mainfile(filepath=O+'/hollow.blend')
