# Preview player synchronization

The animation is deterministic and exposes `window.renderFrame(frame)`. The player uses the `<audio id="audio-track">` element as its master clock:

1. The page waits at frame zero until the visitor presses **Play** (required by browser autoplay policy).
2. Each animation tick reads `audio.currentTime` and renders the matching 24 fps scene frame.
3. Pause freezes audio and the scene at the same media time.
4. Timeline seeks set both the audio position and the rendered frame.
5. Playback-speed changes apply to the audio element; the animation continues to follow its media clock, avoiding timer drift.
6. When audio buffers, the scene remains on the audio media time instead of advancing independently.

The same `renderFrame(frame)` export remains available to `render_v4.js` for deterministic offline rendering. Offline renders do not autoplay the soundtrack; final muxing remains an explicit FFmpeg step.
