# Sound Assets for Empathic-01

Place your audio files in this directory. The system expects `.wav` files.

## Required Sound Effects (SFX)

These are triggered by emotion+gesture combinations:

| Filename | Trigger | Description |
|----------|---------|-------------|
| `compassionate_chime.wav` | Sad + Heart Hand | Gentle, supportive chime |
| `excited_ping.wav` | Happy + Thumb Up | Celebratory ping sound |
| `gentle_wave.wav` | Sad + Open Palm | Soft, calming wave |
| `focus_click.wav` | Neutral + Index Pointing | Sharp, attention sound |
| `love_sparkle.wav` | Happy + Heart Hand | Warm, sparkly tone |
| `discovery_chime.wav` | Surprise + Open Palm | Curious, wonder sound |
| `approval_ding.wav` | Neutral + Thumb Up | Simple approval sound |

## Background Ambience

These loop continuously based on mood:

| Filename | Mood/Emotion | Description |
|----------|--------------|-------------|
| `calm_ambient.wav` | Neutral/Calm | Soft background hum |
| `happy_lofi.wav` | Happy/Joyful | Upbeat lo-fi music |
| `gentle_piano.wav` | Empathetic | Soft piano melody |
| `gentle_rain.wav` | Sad | Rain sounds |
| `focus_binaural.wav` | Focused | Binaural focus tones |
| `warm_embrace.wav` | Supportive | Warm, enveloping sound |
| `celebration_loop.wav` | Celebratory | Party/celebration music |
| `soft_hum.wav` | Neutral | Very subtle hum |
| `curious_sparkle.wav` | Surprise | Wonder/discovery ambience |
| `calming_waves.wav` | Angry | Ocean waves for calming |
| `safe_embrace.wav` | Fear | Safe, protective sounds |
| `fresh_breeze.wav` | Disgust | Clean, fresh sounds |

## Audio Specifications

For best results:
- **Format**: WAV (16-bit PCM)
- **Sample Rate**: 44100 Hz
- **Channels**: Stereo (2 channels)
- **SFX Duration**: 0.5 - 2 seconds
- **Ambience Duration**: 30+ seconds (for looping)

## Free Sound Resources

You can find royalty-free sounds at:
- [Freesound.org](https://freesound.org)
- [Pixabay](https://pixabay.com/sound-effects/)
- [Zapsplat](https://www.zapsplat.com)

## Notes

- If a sound file is missing, the system will log a warning but continue running
- You can add custom sounds by placing them here and updating `core/config.py`
