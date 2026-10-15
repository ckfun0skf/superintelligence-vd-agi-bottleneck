# V5 Holographic Brain Asset

`v5_brain_surface_points.bin` is a deterministic 4,600-point surface sample baked from the embedded GLB in [`sample-3d/brain.html`](../../sample-3d/brain.html). The interactive preview consumes only this compact Float32 position buffer; it does not load the multi-megabyte GLB or any remote runtime dependencies.

## Attribution

- **Model:** Human Brain
- **Author:** agher08 — <https://sketchfab.com/agher08>
- **Source:** <https://sketchfab.com/3d-models/human-brain-c9c9d4d671b94345952d012cc2ea7a24>
- **License:** [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- **Adaptation:** the model surface is normalized, deterministically sampled into points, recolored as a cyan/violet hologram, and animated as a particle morph and rotation.

Regenerate the binary with:

```bash
python3 tools/extract_v5_brain_points.py
```
