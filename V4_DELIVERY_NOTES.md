# SUPER INTELLIGENT — AGI Bottleneck V4

## Final delivery

- **File:** `render/Super_Intelligent_AGI_Bottleneck_V4_1080p.mp4`
- **Picture:** 1920×1080, 16:9, H.264 / yuv420p, 24 fps
- **Audio:** Existing English narration and electronic score, AAC stereo / 44.1 kHz
- **Duration:** 210.0 seconds (03:30)
- **Production method:** Deterministic Three.js/WebGL and FFmpeg; no new AI image or video generations were used for V4.

## V4 visual changes

1. Replaced the flat/UI-like canvas language with a dark cinematic 3D particle space: Z-depth dust, foreground and background particle layers, and restrained camera parallax.
2. Rebuilt the reasoning section so loose particles form a spatial decision tree, visible signal packets follow branches, a fault branch turns red, and verified paths pass through rings.
3. Reworked the world-model segment into literal Text / Images / Video icons, pattern clustering, then two distinct causes converging on one observed effect.
4. Replaced overlapping transitions with clear exit → negative space → next-concept entrances.
5. Made autonomous learning an explicit HYPOTHESIS → EXPERIMENT → OBSERVATION → REVISION loop with a moving signal, failure moment, accumulated memory rings, and an unfamiliar-task node.
6. Rebuilt the compute section as COMPUTE / ENERGY / DATA / TIME inputs feeding one AI model, followed by a readable scale-versus-guarantee message.
7. Replaced the ambiguous door treatment with four interdependent capability nodes around an AGI question; modules and links fully clear before the uncertainty title holds.
8. Preserved a clean title-safe region for the final question and rebuilt the ending around the user-supplied circular logo with a larger technical wordmark.

## Re-rendering

From this project directory:

```bash
node render_v4.js                 # full 210s silent visual master
MODE=samples node render_v4.js    # key-frame audit only
```

`render_v4.js` uses a local Chromium through Puppeteer and passes frames to FFmpeg. The final audio mux used `/home/ubuntu/agi_bottleneck_video/audio/final_mix.wav`.

## Final layout QC corrections

- Moved the `RELIABLE OUTPUT` and `RESOURCE COST` bars and labels upward so both stay fully inside the 1080p frame.
- Reduced and repositioned the circular brand composition, increased the gap above `SUPER INTELLIGENT`, and moved the tagline into the safe area.
- Final MP4 was re-rendered after these corrections, then decoded end-to-end and checked at the compute and brand timestamps.
