# Assets

Files the game loads at run time, served under `/assets/` by the dedicated server and copied into the container image
(`Dockerfile`). Models built in Blender don't live here: they are packed into `js/baked/` (see `AGENTS.md`).

Keep this file: the image build copies this folder, and git does not keep empty folders.
