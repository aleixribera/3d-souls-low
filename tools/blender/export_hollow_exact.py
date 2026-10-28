import bpy, os, math, json, struct
from mathutils import Vector
O=os.path.abspath('assets/enemies/hollow'); bpy.ops.wm.open_mainfile(filepath=O+'/hollow.blend'); S=bpy.context.scene; rig=bpy.data.objects['Skeleton']; body=bpy.data.objects['Hollow Soldier']
for tr in rig.animation_data.nla_tracks: tr.mute=True
rig.animation_data.action=bpy.data.actions['attack_overhead']; rig.animation_data.action_slot=rig.animation_data.action.slots[0]
def setframe(t):
 f=1+t*30; S.frame_set(math.floor(f),subframe=f-math.floor(f)); bpy.context.view_layer.update()
def tip():
 b=rig.data.bones['weapon']; return rig.pose.bones['weapon'].matrix @ (b.matrix_local.inverted() @ Vector((-.4,-1.12,.21)))
for t in [1.29,1.55]:
 setframe(t); p=rig.pose.bones['hips']; M=p.matrix.copy(); v=tip(); M.translation+=Vector((-.20-v.x,-1.80-v.y,.03-v.z)); p.matrix=M; bpy.context.view_layer.update(); p.keyframe_insert(data_path='location',frame=1+t*30,group='hips'); print('TIP EXACT',t,tuple(tip()),flush=True)
rig.animation_data.action=None
for tr in rig.animation_data.nla_tracks: tr.mute=False
bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True); body.select_set(True)
for o in bpy.data.objects:
 if o.name.startswith('socket_'):o.select_set(True)
bpy.context.view_layer.objects.active=rig; bpy.ops.wm.save_as_mainfile(filepath=O+'/hollow.blend'); bpy.ops.export_scene.gltf(filepath=O+'/hollow.glb',export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_yup=True)
# Construct animation channels directly from evaluated source poses at exact times.
# This avoids the exporter dropping the half-frame ends and off-frame attack markers.
for tr in rig.animation_data.nla_tracks: tr.mute=True
p=O+'/hollow.glb'; raw=open(p,'rb').read(); _,_,_,n,_=struct.unpack_from('<4sIIII',raw); doc=json.loads(raw[20:20+n]); off=20+n; bn,_=struct.unpack_from('<II',raw,off); binary=bytearray(raw[off+8:off+8+bn]); nodes={n.get('name'):i for i,n in enumerate(doc['nodes'])}
durations={'idle':3,'walk':1,'chase':.8,'attack_swing':1.6,'attack_overhead':2.45,'hurt':.24,'stagger':1.1,'parried':1.7,'death':1.2,'dormant':2,'rise':1.5}; boundaries={'attack_swing':[.75,.87,1.05],'attack_overhead':[1.15,1.29,1.55]}
def append(data,kind,num,lo=None,hi=None):
 while len(binary)%4:binary.append(0)
 start=len(binary); binary.extend(struct.pack('<%df'%len(data),*data)); vi=len(doc['bufferViews']); doc['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':len(data)*4}); ac={'bufferView':vi,'componentType':5126,'count':num,'type':kind}
 if lo is not None:ac['min']=[lo]; ac['max']=[hi]
 ix=len(doc['accessors']); doc['accessors'].append(ac); return ix
new=[]
for name,duration in durations.items():
 a=bpy.data.actions[name]; rig.animation_data.action=a; rig.animation_data.action_slot=a.slots[0]; bag=a.layers[0].strips[0].channelbag(a.slots[0]); paths={c.data_path for c in bag.fcurves}
 for bone in rig.pose.bones:
  if 'pose.bones["%s"].location' % bone.name not in paths: bone.location=(0,0,0)
 times={0.,duration}; times.update(i/30 for i in range(math.floor(duration*30)+1)); times.update(boundaries.get(name,[]))
 for curve in bag.fcurves:
  for k in curve.keyframe_points:
   t=(k.co.x-1)/30
   if -.00001<=t<=duration+.00001: times.add(round(max(0,min(duration,t)),6))
 times=sorted(times); dedup=[]
 for value in times:
  if dedup and value-dedup[-1]<.00001: dedup[-1]=value
  else: dedup.append(value)
 times=dedup; times[0]=0.; times[-1]=duration; bones=[b.name for b in rig.data.bones if b.name!='root']; values={b:[[],[]] for b in bones}; prev={}
 for t in times:
  setframe(t)
  for b in bones:
   pb=rig.pose.bones[b]; M=pb.parent.matrix.inverted() @ pb.matrix if pb.parent else pb.matrix; v=M.to_translation(); q=M.to_quaternion();
   if b in prev and q.dot(prev[b])<0:q.negate()
   prev[b]=q.copy(); values[b][0].extend(v); values[b][1].extend((q.x,q.y,q.z,q.w))
 inputidx=append(times,'SCALAR',len(times),times[0],times[-1]); animation={'name':name,'samplers':[],'channels':[]}
 for b in bones:
  for i,path in enumerate(['translation','rotation']):
   out=append(values[b][i],'VEC3' if i==0 else 'VEC4',len(times)); si=len(animation['samplers']); animation['samplers'].append({'input':inputidx,'output':out,'interpolation':'LINEAR'}); animation['channels'].append({'sampler':si,'target':{'node':nodes[b],'path':path}})
 new.append(animation); print('CLIP',name,'duration',duration,'samples',len(times),flush=True)
doc['animations']=new; doc['buffers'][0]['byteLength']=len(binary); jb=json.dumps(doc,separators=(',',':')).encode(); jb+=b' '*((-len(jb))%4); binary+=b'\0'*((-len(binary))%4); data=struct.pack('<4sII',b'glTF',2,12+8+len(jb)+8+len(binary))+struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(binary),0x004e4942)+binary; open(p,'wb').write(data)
# Check evaluated positions at the end of the ground poses.
for name,t in [('death',1.2),('dormant',0),('rise',0),('attack_overhead',1.29)]:
 rig.animation_data.action=bpy.data.actions[name]; rig.animation_data.action_slot=rig.animation_data.action.slots[0]; setframe(t); deps=bpy.context.evaluated_depsgraph_get(); obj=body.evaluated_get(deps); mesh=obj.to_mesh(); zs=[(obj.matrix_world @ v.co).z for v in mesh.vertices]; print('POSE',name,t,'mesh z range',round(min(zs),3),round(max(zs),3),flush=True); obj.to_mesh_clear()
