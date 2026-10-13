# Audio assets

All audio assets used to create the V4 soundtrack are kept here. The interactive player loads only `final_mix.mp3`; the source files are preserved for review and future editing.

| Path | Contents | Format | Approx. duration |
|---|---|---|---:|
| `final_mix.mp3` | Final English narration + music mix used by the preview player | MP3, stereo, 44.1 kHz, 192 kb/s | 03:30 |
| `narration/narration_01.wav` … `narration_07.wav` | Seven original narration segments | PCM WAV, mono, 24 kHz | source segments |
| `music/bgm_part01.mp3` | First supplied score segment | MP3, stereo, 44.1 kHz | 02:57 |
| `music/bgm_part02.mp3` | Closing score segment | MP3, stereo, 44.1 kHz | 00:57 |

`final_mix.mp3` is a playback-friendly transcode of the production mix `final_mix.wav`; the source mix WAV is not duplicated in this repository because it is 37 MB and adds no listening benefit over the included 192 kb/s MP3. The BGM source files were named `.wav` in the production workspace but their actual encoded format is MP3; they are stored here with the correct `.mp3` extension. Narration WAVs are retained losslessly.
