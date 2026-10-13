# Audio assets

Audio assets include the V4 soundtrack sources and self-contained V5 preview cuts. The V4 interactive player loads only `final_mix.mp3`; the source files are preserved for review and future editing.

| Path | Contents | Format | Approx. duration |
|---|---|---|---:|
| `final_mix.mp3` | Playback-friendly transcode used by the preview player | MP3, stereo, 44.1 kHz, 192 kb/s | 03:30 |
| `v5_continuous_preview_01_22_00.mp3` | Single continuous V5 preview track from the lossless mix (00:00–01:22.00) | MP3, stereo, 48 kHz, 192 kb/s | 01:22.032 (encoder padding) |
| `final_mix_source.wav` | Original lossless production mix master | PCM WAV, stereo, 44.1 kHz | 03:30 |
| `narration/narration_01.wav` … `narration_07.wav` | Seven original narration segments | PCM WAV, mono, 24 kHz | source segments |
| `music/bgm_part01.mp3` | First supplied score segment | MP3, stereo, 44.1 kHz | 02:57 |
| `music/bgm_part02.mp3` | Closing score segment | MP3, stereo, 44.1 kHz | 00:57 |

The two BGM source files were named `.wav` in the production workspace but their actual encoded format is MP3; they are stored here with the correct `.mp3` extension. Narration and final-mix masters are retained losslessly. The V4 player uses the full MP3 mix; the V5 player uses only the smaller 82-second excerpt.
