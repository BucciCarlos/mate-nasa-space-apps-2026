# RobotExpressive sprite sheet — source and credits

Used only for the **Beacon** companion (profile Tomás Ibarra) in the FD30 preview.
Sprout and Sail keep their own original SVG characters.

## Source

| Field | Value |
|---|---|
| File | `spritesheet.webp` (copied unmodified) |
| Project | `KanadeK/robot-expressive-codex-pet` |
| Release | `v0.1.0` (published 2026-07-30), pet `robot-expressive`, sprite version 2 |
| Release page | https://github.com/KanadeK/robot-expressive-codex-pet/releases/tag/v0.1.0 |
| Download URL | https://github.com/KanadeK/robot-expressive-codex-pet/releases/download/v0.1.0/spritesheet.webp |
| Tag commit | `3e8c5cf7a1988e304e04b00da8dbdc4024059177` |
| SHA-256 | `140dd6e30bc34fdc8839526374c1a05bd69ab6150a01875f02a8a4c96cb933df` |
| Size | 345 524 bytes, WebP lossless RGBA, 1536 × 2288 px |
| Retrieved | 2026-11-14 |

The SHA-256 matches both the digest published by the GitHub release and the release `SHA256SUMS` and `release-manifest.json`.
The external installer and the rest of the release (`pet.json`, the `.codex-pet.zip`) were not used and are not included.

## License and credits

`ASSET_LICENSE.md` in this folder is the upstream file, copied unmodified from tag `v0.1.0`.
It declares the rendered `spritesheet.webp` as an adaptation of a CC0 model, offered under **CC0 1.0 Universal** (https://creativecommons.org/publicdomain/zero/1.0/).

Original credits kept as provenance (attribution is not a CC0 condition):

- 3D model **RobotExpressive**: author Tomás Laulhé, modifications Don McCurdy, CC0 1.0; from `mrdoob/three.js`, path `examples/models/gltf/RobotExpressive/RobotExpressive.glb`, pinned commit `eba30de865cfbf31ac736f792defd9a60ff28d57`.
- Rendered sprite sheet and atlas packaging: `KanadeK/robot-expressive-codex-pet`. Its repository **code** is MIT; that code is not part of this project.

No endorsement by the model's authors, the three.js maintainers, the upstream project or OpenAI is implied.
The Apache-2.0 license of M.A.T.E. does not relicense this asset: it keeps its own CC0 terms.

## How M.A.T.E. uses it

The atlas is a grid of 8 columns × 11 rows of 192 × 208 px cells. Only two rows are used:

| Row | Animation | Frames used | Shown when |
|---|---|---|---|
| 0 | idle | 6 (loop) | Beacon at rest |
| 3 | waving | 4 (played twice in a row, about 2 s) | When the user opens the chat through Beacon; idle then continues |

Every frame is shown through the same fixed 124 × 98 px window (source pixels `x 34–158`, `y 100–198` of each cell, centred on the cell). Idle and waving share the feet baseline (`y = 195`), so the figure does not shift between animations.
With reduced motion it shows one fixed frame: idle frame 0, or waving frame 2 while the chat is open.
The file is bundled with the app and served from the project; nothing is downloaded at runtime.
