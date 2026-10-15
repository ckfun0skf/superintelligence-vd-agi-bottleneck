# Audio assets

Audio assets include the V4 soundtrack sources and self-contained V5 preview cuts. The V4 interactive player loads only `final_mix.mp3`; the source files are preserved for review and future editing.

| Path | Contents | Format | Approx. duration |
|---|---|---|---:|
| `final_mix.mp3` | Playback-friendly transcode used by the V4 preview player | MP3, stereo, 44.1 kHz, 192 kb/s | 03:30 |
| `v5_continuous_preview_01_50_00.mp3` | Previous continuous V5 preview track (00:00–01:50.00), superseded by the 02:20 cut | MP3, stereo, 48 kHz, 192 kb/s | 01:50.040 (encoder padding) |
| `v5_continuous_preview_03_00_70.mp3` | Previous cut ending at the Task 8 opening, superseded by the complete Task 8 preview | MP3, stereo, 48 kHz, 192 kb/s | 03:00.744 (encoder padding) |
| `v5_continuous_preview_03_18_00.mp3` | Current continuous V5 preview, including the complete Task 8 field-rover sequence (00:00–03:18.00) | MP3, stereo, 48 kHz, 192 kb/s | 03:18.024 (encoder padding) |
| `v5_continuous_preview_03_00_00.mp3` | Previous cut ending at 03:00.00, before the next spoken line | MP3, stereo, 48 kHz, 192 kb/s | 03:00.024 (encoder padding) |
| `v5_continuous_preview_02_44_35.mp3` | Previous V5 continuous preview cut, ending after Task 6's final spoken sentence; now superseded by the 03:00 cut | MP3, stereo, 48 kHz, 192 kb/s | 02:44.376 (encoder padding) |
| `v5_continuous_preview_02_20_00.mp3` | Previous single continuous V5 preview track, including Task 5 (00:00–02:20.00), retained for older links | MP3, stereo, 48 kHz, 192 kb/s | 02:20.040 (encoder padding) |
| `v5_continuous_preview_01_22_00.mp3` | Previous V5 preview cut (00:00–01:22.00), retained for cached/older preview links | MP3, stereo, 48 kHz, 192 kb/s | 01:22.032 (encoder padding) |
| `final_mix_source.wav` | Original lossless production mix master | PCM WAV, stereo, 44.1 kHz | 03:30 |
| `narration/narration_01.wav` … `narration_07.wav` | Seven original narration segments | PCM WAV, mono, 24 kHz | source segments |
| `music/bgm_part01.mp3` | First supplied score segment | MP3, stereo, 44.1 kHz | 02:57 |
| `music/bgm_part02.mp3` | Closing score segment | MP3, stereo, 44.1 kHz | 00:57 |

The two BGM source files were named `.wav` in the production workspace but their actual encoded format is MP3; they are stored here with the correct `.mp3` extension. Narration and final-mix masters are retained losslessly. The V4 player uses the full MP3 mix; the current V5 player uses the 198-second excerpt. Task 7 starts at 02:44.35; BGM part 02 enters at 02:57.455; Task 8 begins with “AGI may not require a machine that knows everything” at 03:00.70 and ends at 03:18.00, just before “but every breakthrough.”
