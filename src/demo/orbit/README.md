# Orbit companions

`Orbit` replaces the old Sprout/Beacon/Sail drawings. Designs: **Orbit** (the original, internal variant `luna`; default and John Doe's companion), **Lira** (star, Lucía), **Flop** (ringed planet, Tomás), **Pip** (alien, Mei).

- Art is cut from the supplied JPEGs in `public/brand/` (`lira-orbit`, `flop-orbit`, `orbit-pip`, and `orbit/orbit-final.png` for the original). The designs are not redrawn: the body layer is the original with the face inpainted out, and the **rest face is the original pixels** (`face-eyes`, `face-mouth`).
- Other expressions (`happy` = greeting, `alert` = news, `attentive` = chat/drag) and the blink are vector faces in `OrbitFaces.tsx`, in the design's own ink and cheek colours.
- Limbs only where the design has them: Lira's side points, Pip's arms and antenna are separate layers (`PIECES` in `orbitData.ts`). Flop and the original Orbit move as a whole and by expression.
- Motion lives in `orbit.css`; with `prefers-reduced-motion` nothing moves, expressions still change.
- Rebuild assets: `orbit/tools/cutout.py` then `orbit/tools/build_orbit.py` (outside the repo, next to the originals).
- The original Orbit (`luna`) is assigned only to the John Doe capture profile; no crew profile uses it.
