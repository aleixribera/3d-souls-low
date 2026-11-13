# Run a Level 6 generator headless: blender -b -P tools/blender/run_asset.py -- <script stem> [--export]
# Builds tools/blender/<stem>.py, writes a preview sheet, and with --export the .blend and .glb in tools/blender/out/.
import sys, json, importlib, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))).replace("\\", "/")   # this checkout (a worktree too)
sys.path.insert(0, r"C:/Users/Aleix/.claude/skills/blender/scripts"); sys.path.insert(0, ROOT + "/tools/blender")
import bkit, bpy
argv = sys.argv[sys.argv.index('--') + 1:]
stem, export = argv[0], '--export' in argv
views = next((a[8:].split(',') for a in argv if a.startswith('--views=')), ["front", "side", "three_quarter", "back"])
bkit.reset()
r = bkit.run(f"{ROOT}/tools/blender/{stem}.py")
bkit.preview(f"{ROOT}/tools/blender/out/previews/{stem}.png", None, views, size=640)
if export:
    bkit.export_glb(f"{ROOT}/tools/blender/out/{stem}.glb", None)
    bkit.save_blend(f"{ROOT}/tools/blender/out/{stem}.blend")
print('RESULT', json.dumps(r, default=str))
