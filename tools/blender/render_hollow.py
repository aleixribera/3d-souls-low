import bpy,os,math
from mathutils import Vector
O=os.path.abspath('assets/enemies/hollow'); bpy.ops.wm.open_mainfile(filepath=O+'/hollow.blend'); rig=bpy.data.objects['Skeleton']; S=bpy.context.scene
for tr in rig.animation_data.nla_tracks:tr.mute=True
world=bpy.data.worlds.new('Preview studio'); S.world=world; world.color=(.16,.16,.16); S.render.engine='CYCLES'; S.cycles.samples=8; S.render.resolution_x=640; S.render.resolution_y=640
def light(loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
light((3,-4,5),550,4);light((-3,-1,3),350,3);light((0,3,4),500,3)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,0));bpy.context.object.data.materials.append(bpy.data.materials.new('Preview matte'))
bpy.ops.object.camera_add();cam=bpy.context.object;S.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=3.4
def render(filename,name,t,loc):
 rig.animation_data.action=bpy.data.actions[name];f=1+t*30;S.frame_set(int(f),subframe=f%1);bpy.context.view_layer.update();cam.location=loc;cam.rotation_euler=(Vector((0,-.30,.83))-cam.location).to_track_quat('-Z','Y').to_euler();S.render.filepath=O+'/previews/'+filename;bpy.ops.render.render(write_still=True)
for name,loc in [('front',(0,-6,2)),('side',(6,0,2)),('back',(0,6,2)),('three-quarter',(4,-5,2.5)),('top',(0,-.1,7))]:render(name+'.png','idle',0,loc)
for name,times in [('attack_swing',[0,.75,.87,1.05,1.6]),('attack_overhead',[0,1.15,1.29,1.55,2.45])]:
 for i,t in enumerate(times):render('_%s_%d.png'%(name,i),name,t,(4,-5,2.8))
for i,(name,t) in enumerate([('idle',1.55),('walk',.25),('chase',.2),('hurt',.09),('stagger',.55),('parried',.75),('death',1.2),('dormant',1),('rise',.45)]):render('_other_%d.png'%i,name,t,(4,-5,2.8))
