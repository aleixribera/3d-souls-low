import bpy,os
from mathutils import Vector,Matrix
O=os.path.abspath('assets/enemies/hollow');bpy.ops.wm.open_mainfile(filepath=O+'/hollow.blend');rig=bpy.data.objects['Skeleton'];rig.data.pose_position='REST';bpy.context.view_layer.update()
for name,b,loc in [('socket_bladeBase','weapon',(-.40,-.30,.76)),('socket_bladeTip','weapon',(-.40,-1.12,.21)),('socket_eyes','head',(0,-.20,1.635)),('socket_chest','chest',(0,-.16,1.25))]:
 o=bpy.data.objects[name];o.parent=rig;o.parent_type='BONE';o.parent_bone=b;bpy.context.view_layer.update();o.matrix_world=Matrix.Translation(Vector(loc));bpy.context.view_layer.update();print(name,tuple(o.matrix_world.translation),tuple(o.location),flush=True)
rig.data.pose_position='POSE';bpy.ops.wm.save_as_mainfile(filepath=O+'/hollow.blend')
