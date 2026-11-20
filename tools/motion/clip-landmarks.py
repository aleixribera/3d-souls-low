"""Video to motion, step 1 of 2 (docs/bosses/system.md, "Animation"): a person's 3D pose in every frame of a clip.

  python tools/motion/clip-landmarks.py <clip.mp4> <start s> <end s> <out.json> [--fps 30] [--model <pose_landmarker.task>]

MediaPipe's pose landmarker (free, runs on this PC's CPU; `pip install --user mediapipe opencv-python`) finds 33 body
points per frame, in metres around the hips. The model file is Google's `pose_landmarker_full.task`
(storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/), kept in
.scratch/motion/ and never committed, like the clips. Writes:
  <out.json>         { clip, start, end, fps, frames: [{ t, world: [[x, y, z, visibility] * 33], image: [[u, v] * 33] }] }
                     world is MediaPipe's: x to the image's right, y down, z away from the camera, origin between the hips.
  <out>-overlay.jpg  every 3rd frame with the points drawn, to check the capture before fitting it.
Step 2 fits the poses onto a model's rig: node tools/motion/fit-poses.cjs.
"""
import argparse, json, os, sys
import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

ap = argparse.ArgumentParser()
ap.add_argument('clip'); ap.add_argument('start', type=float); ap.add_argument('end', type=float); ap.add_argument('out')
ap.add_argument('--fps', type=float, default=30)
ap.add_argument('--model', default=os.path.join(os.path.dirname(__file__), '..', '..', '.scratch', 'motion', 'pose_landmarker_full.task'))
A = ap.parse_args()
if not os.path.exists(A.model):
    sys.exit(f'No pose model at {A.model}: download pose_landmarker_full.task there (see this file\'s header).')

opts = vision.PoseLandmarkerOptions(base_options=mp_python.BaseOptions(model_asset_path=A.model),
                                    running_mode=vision.RunningMode.VIDEO, num_poses=1)
cap = cv2.VideoCapture(A.clip)
src_fps = cap.get(cv2.CAP_PROP_FPS) or 30
frames, shots = [], []
BONES = [(11, 12), (11, 13), (13, 15), (12, 14), (14, 16), (11, 23), (12, 24), (23, 24), (23, 25), (25, 27), (24, 26), (26, 28)]
with vision.PoseLandmarker.create_from_options(opts) as lm:
    t = A.start
    while t <= A.end + 1e-6:
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ok, img = cap.read()
        if not ok: break
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        res = lm.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), int(round(t * 1000)))
        if res.pose_world_landmarks:
            W = res.pose_world_landmarks[0]; I = res.pose_landmarks[0]
            frames.append({ 't': round(t - A.start, 4),
                'world': [[round(p.x, 4), round(p.y, 4), round(p.z, 4), round(p.visibility or 0, 3)] for p in W],
                'image': [[round(p.x, 4), round(p.y, 4)] for p in I] })
            if len(frames) % 3 == 1:
                h, w = img.shape[:2]
                for a, b in BONES:
                    cv2.line(img, (int(I[a].x * w), int(I[a].y * h)), (int(I[b].x * w), int(I[b].y * h)), (0, 255, 255), 2)
                cv2.putText(img, f'{t - A.start:.2f}s', (6, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                shots.append(cv2.resize(img, (320, int(320 * h / w))))
        t += 1 / A.fps
json.dump({ 'clip': os.path.basename(A.clip), 'start': A.start, 'end': A.end, 'fps': A.fps, 'frames': frames }, open(A.out, 'w'))
if shots:
    cols = min(6, len(shots)); rows = (len(shots) + cols - 1) // cols
    blank = shots[0] * 0
    grid = [cv2.hconcat([shots[r * cols + c] if r * cols + c < len(shots) else blank for c in range(cols)]) for r in range(rows)]
    cv2.imwrite(os.path.splitext(A.out)[0] + '-overlay.jpg', cv2.vconcat(grid), [cv2.IMWRITE_JPEG_QUALITY, 82])
print(f'{len(frames)} frames with a pose of {int((A.end - A.start) * A.fps) + 1} sampled ({src_fps:.0f} fps source) -> {A.out}')
