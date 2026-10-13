# Audio assets

All audio assets used to create the V4 soundtrack are kept here. The interactive player loads only `final_mix.mp3`; the source files are preserved for review and future editing.

| Path | Contents | Format | Approx. duration |
|---|---|---|---:|
| `final_mix.mp3` | Playback-friendly transcode used by the preview player | MP3, stereo, 44.1 kHz, 192 kb/s | 03:30 |
| `final_mix_source.wav` | Original lossless production mix master | PCM WAV, stereo, 44.1 kHz | 03:30 |
| `narration/narration_01.wav` … `narration_07.wav` | Seven original narration segments | PCM WAV, mono, 24 kHz | source segments |
| `music/bgm_part01.mp3` | First supplied score segment | MP3, stereo, 44.1 kHz | 02:57 |
| `music/bgm_part02.mp3` | Closing score segment | MP3, stereo, 44.1 kHz | 00:57 |

The two BGM source files were named `.wav` in the production workspace but their actual encoded format is MP3; they are stored here with the correct `.mp3` extension. Narration and final-mix masters are retained losslessly. The player downloads only the smaller MP3 version of the final mix.
