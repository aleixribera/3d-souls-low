import json,struct
p='assets/enemies/hollow/hollow.glb'; data=open(p,'rb').read(); magic,ver,total,n,typ=struct.unpack_from('<4sIIII',data); j=json.loads(data[20:20+n]); pos=20+n; bn,bt=struct.unpack_from('<II',data,pos); binary=bytearray(data[pos+8:pos+8+bn]); durations={'idle':3,'walk':1.2,'chase':.8,'attack_swing':1.6,'attack_overhead':2.45,'hurt':.24,'stagger':1.1,'parried':1.7,'death':1.2,'dormant':2,'rise':1.5}
seen={}
for anim in j['animations']:
 duration=durations[anim['name']]
 for samp in anim['samplers']:
  idx=samp['input']; acc=j['accessors'][idx]; oldmax=acc['max'][0]; oldmin=acc['min'][0]
  if idx in seen:
   assert seen[idx]==duration; continue
  seen[idx]=duration; view=j['bufferViews'][acc['bufferView']]; off=view.get('byteOffset',0)+acc.get('byteOffset',0); count=acc['count']; vals=list(struct.unpack_from('<%df'%count,binary,off)); vals=[(v-oldmin)*duration/(oldmax-oldmin) for v in vals]; vals[0]=0; vals[-1]=duration; struct.pack_into('<%df'%count,binary,off,*vals); acc['min']=[0]; acc['max']=[duration]
jb=json.dumps(j,separators=(',',':')).encode(); jb+=b' '*((-len(jb))%4); binary+=b'\0'*((-len(binary))%4); out=struct.pack('<4sII',b'glTF',2,12+8+len(jb)+8+len(binary))+struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(binary),0x004e4942)+binary; open(p,'wb').write(out)
print('normalized durations',durations)
