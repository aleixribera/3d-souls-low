# Assets

Files the game loads at run time, served under `/assets/` by the dedicated server and copied into the container image (`Dockerfile`). Authored models go in `assets/enemies/<id>/` (see `docs/enemy-redesign/README.md`).

The Training Hall's quality previews (`assets/quality/`) were removed with the Training Hall in v7.19.0. Keep this file: the image build copies this folder, and git does not keep empty folders.
