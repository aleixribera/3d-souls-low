import bpy,math,os
from mathutils import Vector
O=os.path.abspath('assets/enemies/hollow');bpy.ops.wm.open_mainfile(filepath=O+'/hollow.blend');r=bpy.data.objects['Skeleton'];body=bpy.data.objects['Hollow Soldier'];S=bpy.context.scene
for tr in r.animation_data.nla_tracks:tr.mute=True
D={'idle':3.,'walk':1.,'chase':.8,'attack_swing':1.6,'attack_overhead':2.45,'hurt':.24,'stagger':1.1,'parried':1.7,'death':1.2,'dormant':2.,'rise':1.5}
def setact(name):r.animation_data.action=bpy.data.actions[name];r.animation_data.action_slot=r.animation_data.action.slots[0]
def frame(t):
 f=1+30*t;S.frame_set(math.floor(f),subframe=f-math.floor(f));bpy.context.view_layer.update()
def put(b,path,t):r.pose.bones[b].keyframe_insert(data_path=path,frame=1+t*30,group=b)
# Raise the sword in idle and at matching guard endpoints.
for name,d in D.items():
 if name=='dormant':continue
 setact(name); ts=[0,d] if name not in ('death','rise','idle') else ([0] if name=='death' else [d] if name=='rise' else [0,1,1.55,1.75,d])
 for t in ts:
  frame(t);w=r.pose.bones['weapon'];w.rotation_euler.x=-.30;put('weapon','rotation_euler',t)
  h=r.pose.bones['hips'];h.location.y=.007;put('hips','location',t)
# Paint bright amber highlights directly into the existing atlas, still one material.
im=bpy.data.images['Painted atlas'];pixels=list(im.pixels[:])
for y in range(1024):
 for x in range(6*128,7*128):
  k=(y*1024+x)*4; pixels[k]=1.;pixels[k+1]=.57;pixels[k+2]=.12
im.pixels.foreach_set(pixels);im.pack()
# Left hand tracks the animated grip throughout the overhead wind-up and strike.
setact('attack_overhead'); times=sorted(set([i/30 for i in range(39)]+[.85,1.15,1.29,1.55]))
base=[]
for t in times:
 frame(t);base.append(({n:r.pose.bones[n].rotation_euler.copy() for n in ['upperArm.L','forearm.L','hand.L']},r.pose.bones['hand.L'].location.copy()))
maxgap=0
for t,(rot,loc) in zip(times,base):
 frame(t)
 for n,v in rot.items():r.pose.bones[n].rotation_euler=v
 r.pose.bones['hand.L'].location=loc;bpy.context.view_layer.update();target=r.pose.bones['weapon'].head.copy()
 def goal():return (r.pose.bones['hand.L'].tail-target).length_squared
 best=goal()
 for step in [.6,.3,.15,.075,.0375]:
  for sweep in range(2):
   for n in ['upperArm.L','forearm.L']:
    p=r.pose.bones[n]
    for axis in range(3):
     old=p.rotation_euler[axis];win=old
     for delta in [-step,step]:
      p.rotation_euler[axis]=old+delta;bpy.context.view_layer.update();v=goal()
      if v<best:best=v;win=old+delta
     p.rotation_euler[axis]=win;bpy.context.view_layer.update()
 # A small hand-bone translation closes any remaining gap.
 hand=r.pose.bones['hand.L'];M=hand.matrix.copy();M.translation+=target-hand.tail;hand.matrix=M;bpy.context.view_layer.update()
 for n in ['upperArm.L','forearm.L','hand.L']:put(n,'rotation_euler',t)
 put('hand.L','location',t);maxgap=max(maxgap,math.sqrt(goal()))
for t in [1.8,2.45]:
 frame(t);r.pose.bones['hand.L'].location=(0,0,0);put('hand.L','location',t)
print('LEFT GRIP MAX GAP',maxgap,flush=True)
# Per-frame pose correction for floor contact. Each displaced bone is keyed, keeping root fixed.
indices={}
for vg in body.vertex_groups:
 ids=[v.index for v in body.data.vertices if any(g.group==vg.index and g.weight>0 for g in v.groups)]
 if ids:indices[vg.name]=ids
order=['hips','spine','chest','neck','head','upperArm.L','forearm.L','hand.L','upperArm.R','forearm.R','hand.R','thigh.L','shin.L','foot.L','thigh.R','shin.R','foot.R','weapon']
def minima():
 bpy.context.view_layer.update();ob=body.evaluated_get(bpy.context.evaluated_depsgraph_get());m=ob.to_mesh();z={n:min((ob.matrix_world@m.vertices[i].co).z for i in ids) for n,ids in indices.items()};ob.to_mesh_clear();return z
for name,d in [('death',1.2),('rise',1.5)]:
 setact(name);a=r.animation_data.action;bag=a.layers[0].strips[0].channelbag(a.slots[0]);paths={c.data_path for c in bag.fcurves}; animated={n for n in order if 'pose.bones["%s"].location'%n in paths};samples=[i/60 for i in range(round(d*60)+1)];baseline=[]
 for t in samples:
  for n in order:
   if n not in animated:r.pose.bones[n].location=(0,0,0)
  frame(t);baseline.append({n:r.pose.bones[n].location.copy() for n in order})
 worst=0
 for t,basepose in zip(samples,baseline):
  frame(t)
  for n,v in basepose.items():r.pose.bones[n].location=v
  bpy.context.view_layer.update()
  for n in order:
   z=minima().get(n,1)
   if z<.002:
    pb=r.pose.bones[n];M=pb.matrix.copy();M.translation.z+=.002-z;pb.matrix=M;bpy.context.view_layer.update()
   put(n,'location',t)
  worst=min(worst,min(minima().values()))
 print('GROUND',name,'worst',worst,'samples',len(samples),flush=True)
 # Ensure the dense correction keys interpolate linearly.
 for c in bag.fcurves:
  if c.data_path.endswith('.location'):
   for k in c.keyframe_points:k.interpolation='LINEAR'
r.animation_data.action=None
for tr in r.animation_data.nla_tracks:tr.mute=False
bpy.ops.wm.save_as_mainfile(filepath=O+'/hollow.blend')
