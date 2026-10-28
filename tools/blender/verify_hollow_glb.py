import struct,json,math
p='assets/enemies/hollow/hollow.glb';raw=open(p,'rb').read();_,_,_,n,_=struct.unpack_from('<4sIIII',raw);j=json.loads(raw[20:20+n]);bp=20+n+8
parents={c:i for i,node in enumerate(j['nodes']) for c in node.get('children',[])}
for i,node in enumerate(j['nodes']):
 if node.get('name','').startswith('socket_'):print('SOCKET',node['name'],'parent',j['nodes'][parents[i]].get('name'),'translation',node.get('translation'))
def read(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];off=bp+v.get('byteOffset',0)+a.get('byteOffset',0);size={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']];return list(struct.unpack_from('<%df'%(a['count']*size),raw,off)),size
for a in j['animations']:
 times,_=read(a['samplers'][0]['input']); print('ANIM',a['name'],'len',times[-1],'strict',all(x<y for x,y in zip(times,times[1:])),'special',[x for x in times if any(abs(x-t)<1e-5 for t in ([.75,.87,1.05] if a['name']=='attack_swing' else [1.15,1.29,1.55] if a['name']=='attack_overhead' else []))])
 if a['name'] in ['idle','walk','chase','dormant']:
  diff=0
  for s in a['samplers']:
   v,k=read(s['output']);diff=max(diff,max(abs(x-y) for x,y in zip(v[:k],v[-k:])))
  print('LOOP max start/end diff',diff)
print('images',j['images'],'materials',len(j['materials']),'skins',len(j['skins']),'joints',len(j['skins'][0]['joints']))
