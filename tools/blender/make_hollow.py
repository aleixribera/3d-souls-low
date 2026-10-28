import bpy, math, random, os
from mathutils import Vector
random.seed(12)
O=os.path.abspath('assets/enemies/hollow'); os.makedirs(O+'/previews',exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
S=bpy.context.scene; S.render.fps=30
colors=[(.55,.51,.44),(.63,.54,.31),(.48,.40,.31),(.60,.29,.19),(.30,.29,.26),(.64,.62,.56),(.85,.60,.31),(.36,.26,.19)]
img=bpy.data.images.new('Painted atlas',width=1024,height=1024,alpha=True); px=[0.]*(1024*1024*4)
for y in range(1024):
 for x in range(1024):
  k=x//128; c=colors[k]; f=.90+.16*random.random()
  if k==1 and (x%23<2 or y%34<2): f*=.76
  if k in (2,3,4,7) and (x*7+y*13)%149<3: f*=.72
  i=(y*1024+x)*4; px[i:i+4]=[c[0]*f,c[1]*f,c[2]*f,1]
img.pixels.foreach_set(px); img.pack()
m=bpy.data.materials.new('Painted earth and iron'); m.use_nodes=True
n=m.node_tree.nodes.new('ShaderNodeTexImage'); n.image=img; m.node_tree.links.new(n.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
a=bpy.data.armatures.new('Skeleton'); rig=bpy.data.objects.new('Skeleton',a); bpy.context.collection.objects.link(rig); bpy.context.view_layer.objects.active=rig; rig.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
def bone(n,h,t,p=None):
 b=a.edit_bones.new(n); b.head=h; b.tail=t
 if p: b.parent=a.edit_bones[p]
bone('root',(0,0,0),(0,0,.12)); bone('hips',(0,0,.88),(0,0,1.02),'root'); bone('spine',(0,0,1.02),(0,-.025,1.22),'hips'); bone('chest',(0,-.025,1.22),(0,-.05,1.43),'spine'); bone('neck',(0,-.05,1.43),(0,-.07,1.52),'chest'); bone('head',(0,-.07,1.52),(0,-.07,1.75),'neck')
for s,g in [('R',-1),('L',1)]:
 bone('upperArm.'+s,(g*.22,-.03,1.38),(g*.36,-.025,1.12),'chest'); bone('forearm.'+s,(g*.36,-.025,1.12),(g*.40,-.10,.90),'upperArm.'+s); bone('hand.'+s,(g*.40,-.10,.90),(g*.40,-.16,.82),'forearm.'+s)
 bone('thigh.'+s,(g*.13,0,.89),(g*.14,-.02,.52),'hips'); bone('shin.'+s,(g*.14,-.02,.52),(g*.14,.015,.16),'thigh.'+s); bone('foot.'+s,(g*.14,.015,.16),(g*.14,-.17,.08),'shin.'+s)
bone('weapon',(-.40,-.16,.82),(-.40,-.40,.67),'hand.R'); bpy.ops.object.mode_set(mode='OBJECT')
parts=[]
def finish(o,name,b,c):
 o.name=name; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(m)
 uv=o.data.uv_layers.active or o.data.uv_layers.new(name='Atlas')
 for l in uv.data:
  u,v=l.uv; l.uv=((c*128+8+u*110)/1024,.04+v*.9)
 v=o.vertex_groups.new(name=b); v.add(list(range(len(o.data.vertices))),1,'REPLACE'); mod=o.modifiers.new('Skin','ARMATURE'); mod.object=rig; o.parent=rig; parts.append(o)
def ell(n,loc,sc,b,c,seg=10,rings=6):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=loc); o=bpy.context.object; o.scale=sc; finish(o,n,b,c)
def cube(n,loc,sc,b,c,rot=(0,0,0)):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc,rotation=rot); o=bpy.context.object; o.scale=sc; finish(o,n,b,c)
def bar(n,p,q,r,t,b,c):
 d=Vector(q)-Vector(p); bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=r,radius2=t,depth=d.length,location=(Vector(p)+Vector(q))/2); o=bpy.context.object; o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); finish(o,n,b,c)
ell('Gambeson',(0,-.015,1.20),(.27,.15,.31),'chest',1); ell('Pelvis',(0,0,.91),(.24,.14,.16),'hips',3)
for i in range(9):
 x=-.23+i*.057; h=.17+random.random()*.08; cube('Frayed hem',(x,-.055,.90-h/2),(.063,.22,h),'hips',1)
for g in [-1,1]: cube('Cross strap',(0,-.162,1.25),(.052,.025,.53),'chest',2,(0,g*.68,0))
cube('Exposed mail',(-.21,-.075,1.35),(.11,.14,.12),'chest',4); ell('Satchel',(.25,.005,.84),(.115,.09,.14),'hips',7)
ell('Gaunt head',(0,-.085,1.61),(.125,.115,.155),'head',0); ell('Slack jaw',(0,-.125,1.535),(.095,.075,.057),'head',0)
for s,g in [('R',-1),('L',1)]:
 ell('Amber eye '+s,(g*.048,-.191,1.635),(.023,.012,.015),'head',6,8,4)
 bar('Sleeve '+s,(g*.23,-.03,1.37),(g*.35,-.025,1.12),.115,.082,'upperArm.'+s,1); bar('Forearm '+s,(g*.35,-.025,1.12),(g*.40,-.10,.90),.068,.048,'forearm.'+s,0); bar('Wrist wrap '+s,(g*.393,-.085,.96),(g*.40,-.10,.90),.057,.053,'forearm.'+s,2); ell('Hand '+s,(g*.40,-.135,.85),(.055,.055,.075),'hand.'+s,0)
 bar('Trouser thigh '+s,(g*.13,0,.91),(g*.14,-.02,.52),.13,.095,'thigh.'+s,3); ell('Knee cop '+s,(g*.14,-.09,.52),(.10,.055,.09),'shin.'+s,4); bar('Shin '+s,(g*.14,-.015,.52),(g*.14,.015,.15),.09,.075,'shin.'+s,3); bar('Boot '+s,(g*.14,.015,.29),(g*.14,.015,.08),.083,.085,'shin.'+s,7); ell('Boot foot '+s,(g*.14,-.085,.075),(.09,.16,.075),'foot.'+s,7)
 for z in [.17,.22,.27]: bar('Boot rope '+s,(g*.14,.015,z),(g*.14,.015,z+.018),.088,.088,'shin.'+s,2)
ell('Morion brim',(0,-.06,1.71),(.245,.185,.035),'head',4,12,4); ell('Morion crown',(0,-.045,1.755),(.145,.13,.10),'head',4,10,5); cube('Morion comb',(0,-.05,1.845),(.045,.205,.15),'head',4,(0,.12,0))
bar('Grip',(-.40,-.13,.87),(-.40,-.28,.77),.028,.026,'weapon',7); ell('Pommel',(-.40,-.11,.89),(.044,.04,.04),'weapon',4,8,4); bar('Crossguard',(-.52,-.29,.76),(-.28,-.29,.76),.023,.023,'weapon',4)
verts=[(-.455,-.30,.76),(-.345,-.30,.76),(-.35,-.62,.54),(-.37,-.65,.52),(-.35,-.69,.50),(-.365,-.96,.31),(-.40,-1.12,.21),(-.435,-.96,.31),(-.45,-.72,.47),(-.43,-.69,.49),(-.45,-.65,.52)]; verts += [(x,y,z+.027) for x,y,z in verts]; N=len(verts)//2
faces=[tuple(range(N-1,-1,-1)),tuple(range(N,2*N))]+[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)]
mesh=bpy.data.meshes.new('Blade'); mesh.from_pydata(verts,[],faces); mesh.update(); o=bpy.data.objects.new('Notched blade',mesh); bpy.context.collection.objects.link(o); finish(o,'Notched blade','weapon',5)
bar('Rust at guard',(-.40,-.30,.76),(-.40,-.42,.68),.049,.045,'weapon',4)
for name,b,loc in [('socket_bladeBase','weapon',(-.40,-.30,.76)),('socket_bladeTip','weapon',(-.40,-1.12,.21)),('socket_eyes','head',(0,-.20,1.635)),('socket_chest','chest',(0,-.16,1.25))]:
 o=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(o); o.parent=rig; o.parent_type='BONE'; o.parent_bone=b; o.matrix_world.translation=Vector(loc)
G={'spine':(.10,0,0),'chest':(.10,0,0),'neck':(-.10,0,0),'head':(-.06,0,0),'upperArm.R':(0,.12,-.10),'upperArm.L':(0,-.08,.08),'thigh.R':(-.08,0,0),'thigh.L':(-.08,0,0),'shin.R':(.12,0,0),'shin.L':(.12,0,0)}
def P(**changes): d=dict(G); d.update(changes); return d
clips={
'idle':(3,[(0,P()),(1,P(spine=(.13,.02,.02),head=(-.06,0,.06))),(1.55,P(head=(-.06,0,-.10))),(1.75,P()),(3,P())]),
'walk':(1.2,[(0,P(**{'thigh.R':(.35,0,0),'thigh.L':(-.30,0,0)})),(.3,P(**{'shin.L':(.35,0,0)})),(.6,P(**{'thigh.R':(-.30,0,0),'thigh.L':(.35,0,0)})),(.9,P(**{'shin.R':(.35,0,0)})),(1.2,P(**{'thigh.R':(.35,0,0),'thigh.L':(-.30,0,0)}))]),
'chase':(.8,[(0,P(spine=(.25,0,0),**{'thigh.R':(.65,0,0),'thigh.L':(-.48,0,0),'upperArm.R':(-.4,0,-.35)})),(.4,P(spine=(.25,0,0),**{'thigh.R':(-.48,0,0),'thigh.L':(.65,0,0),'upperArm.R':(-.4,0,-.35)})),(.8,P(spine=(.25,0,0),**{'thigh.R':(.65,0,0),'thigh.L':(-.48,0,0),'upperArm.R':(-.4,0,-.35)}))]),
'attack_swing':(1.6,[(0,P()),(.5,P(chest=(.1,0,-.7),hips=(0,0,-.35),**{'upperArm.R':(0,-.5,-.9),'thigh.R':(-.35,0,0),'upperArm.L':(0,0,.65)})),(.75,P(chest=(.1,0,-.7),hips=(0,0,-.35),**{'upperArm.R':(0,-.5,-.9),'thigh.R':(-.35,0,0),'upperArm.L':(0,0,.65)})),(.87,P(chest=(.15,0,.55),hips=(0,0,.35),**{'upperArm.R':(-.7,.1,.85),'thigh.L':(.4,0,0)})),(1.05,P(chest=(.22,0,.8),**{'upperArm.R':(-.8,0,1.1),'thigh.L':(.45,0,0)})),(1.6,P())]),
'attack_overhead':(2.45,[(0,P()),(.85,P(spine=(-.35,0,0),chest=(-.35,0,0),**{'upperArm.R':(-2.3,0,-.35),'upperArm.L':(-2.15,0,.35),'forearm.R':(-.65,0,0),'forearm.L':(-.65,0,0)})),(1.15,P(spine=(-.35,0,0),chest=(-.35,0,0),**{'upperArm.R':(-2.3,0,-.35),'upperArm.L':(-2.15,0,.35),'forearm.R':(-.65,0,0),'forearm.L':(-.65,0,0)})),(1.29,P(spine=(.7,0,0),chest=(.45,0,0),**{'upperArm.R':(-.8,0,-.15),'upperArm.L':(-.8,0,.15),'thigh.L':(.5,0,0)})),(1.55,P(spine=(.7,0,0),chest=(.45,0,0),**{'upperArm.R':(-.8,0,-.15),'upperArm.L':(-.8,0,.15),'thigh.L':(.5,0,0)})),(1.8,P(spine=(.38,0,0),**{'upperArm.R':(-.5,0,-.2)})),(2.05,P(spine=(.25,0,0),**{'upperArm.R':(-.3,0,-.1)})),(2.45,P())]),
'hurt':(.24,[(0,P()),(.09,P(chest=(-.3,0,0),head=(-.35,0,0),**{'upperArm.R':(0,0,-.45)})),(.24,P())]),
'stagger':(1.1,[(0,P()),(.25,P(spine=(-.4,0,0),head=(.3,0,.3),**{'thigh.R':(-.5,0,0)})),(.55,P(spine=(-.25,0,0),head=(.2,0,-.25),**{'thigh.L':(-.45,0,0)})),(1.1,P())]),
'parried':(1.7,[(0,P()),(.25,P(spine=(-.35,0,0),chest=(-.35,0,-.25),**{'upperArm.R':(-1.5,0,-1.0),'thigh.R':(-.5,0,0)})),(1.25,P(spine=(-.35,0,0),chest=(-.35,0,-.25),**{'upperArm.R':(-1.5,0,-1.0),'thigh.R':(-.5,0,0)})),(1.7,P())]),
'death':(1.2,[(0,P()),(.4,P(**{'thigh.R':(-1.2,0,0),'thigh.L':(-1.2,0,0),'shin.R':(2,0,0),'shin.L':(2,0,0)})),(1.2,P(spine=(1.2,0,0),chest=(.5,0,0),**{'thigh.R':(-1.2,0,0),'thigh.L':(-1.2,0,0),'shin.R':(2,0,0),'shin.L':(2,0,0)}))]),
'dormant':(2,[(0,P(hips=(-1.5,0,0),**{'upperArm.R':(0,0,-.5)})),(1,P(hips=(-1.5,0,0),**{'upperArm.R':(0,0,-.5),'hand.L':(0,0,.12)})),(2,P(hips=(-1.5,0,0),**{'upperArm.R':(0,0,-.5)}))]),
'rise':(1.5,[(0,P(hips=(-1.5,0,0),**{'upperArm.R':(0,0,-.5)})),(.45,P(hips=(-.9,0,.4),**{'thigh.L':(-1.1,0,0),'shin.L':(1.7,0,0)})),(.9,P(spine=(.5,0,0),**{'thigh.L':(-.8,0,0),'shin.L':(1.2,0,0)})),(1.5,P())])}
rig.animation_data_create()
for name,(duration,keys) in clips.items():
 action=bpy.data.actions.new(name); rig.animation_data.action=action
 for t,state in keys:
  for pb in rig.pose.bones:
   pb.rotation_mode='XYZ'; pb.rotation_euler=state.get(pb.name,(0,0,0)); pb.location=(0,0,0); pb.keyframe_insert(data_path='rotation_euler',frame=1+t*30,group=pb.name)
   if pb.name=='root': pb.keyframe_insert(data_path='location',frame=1+t*30,group=pb.name)
 track=rig.animation_data.nla_tracks.new(); track.name=name; strip=track.strips.new(name,1,action); strip.action_frame_start=1; strip.action_frame_end=1+duration*30
rig.animation_data.action=None
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0]; bpy.ops.object.join(); body=bpy.context.object; body.name='Hollow Soldier'
bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True); body.select_set(True)
for o in bpy.data.objects:
 if o.name.startswith('socket_'): o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=O+'/hollow.blend')
bpy.ops.export_scene.gltf(filepath=O+'/hollow.glb',export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_yup=True)
print('TRIANGLES',sum(len(p.vertices)-2 for p in body.data.polygons),'BONES',len(rig.data.bones),flush=True)
for tr in rig.animation_data.nla_tracks: tr.mute=True
world=bpy.data.worlds.new('Studio'); S.world=world; world.color=(.16,.16,.16)
S.render.engine='CYCLES'; S.cycles.samples=8; S.render.resolution_x=512; S.render.resolution_y=512; S.render.resolution_percentage=100
def light(loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc); o=bpy.context.object; o.data.energy=power; o.data.size=size; o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
light((3,-4,5),550,4); light((-3,-1,3),350,3); light((0,3,4),500,3)
bpy.ops.object.camera_add(); cam=bpy.context.object; S.camera=cam; cam.data.type='ORTHO'; cam.data.ortho_scale=2.55
def render(name,action,t,loc):
 rig.animation_data.action=bpy.data.actions[action]; S.frame_set(1+int(t*30),subframe=t*30-int(t*30)); cam.location=loc; cam.rotation_euler=(Vector((0,-.05,.95))-cam.location).to_track_quat('-Z','Y').to_euler(); S.render.filepath=O+'/previews/'+name; bpy.ops.render.render(write_still=True)
for name,loc in [('front',(0,-5,2)),('side',(5,0,2)),('back',(0,5,2)),('three-quarter',(3,-4,2.5)),('top',(0,-.1,6))]: render(name+'.png','idle',0,loc)
for name,times in [('attack_swing',[0,.75,.87,1.05,1.6]),('attack_overhead',[0,1.15,1.29,1.55,2.45])]:
 for i,t in enumerate(times): render('_%s_%d.png'%(name,i),name,t,(3,-4,2.5))
for i,name in enumerate(['idle','walk','chase','hurt','stagger','parried','death','dormant','rise']): render('_other_%d.png'%i,name,clips[name][0]*.5,(3,-4,2.5))


