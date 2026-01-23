# Empathic-01: Python Backend

A modular, clean-architecture Python system for real-time multimodal emotion AI.

## Architecture

```
src_python/
├── core/                    # Core business logic
│   ├── config.py           # All configuration, thresholds, mappings
│   └── state_machine.py    # Emotion-Gesture bridge, mood management
├── senses/                  # Sensory input/output
│   ├── vision_face.py      # Face emotion detection (DeepFace)
│   ├── vision_hands.py     # Hand gesture detection (MediaPipe)
│   └── audio_output.py     # Mood-based audio (Pygame)
├── assets/
│   └── sounds/             # Audio files (.wav)
├── main.py                 # Async orchestrator
└── requirements.txt        # Python dependencies
```

## Features

### Vision: Face Emotion Detection
- Detects: Happy, Sad, Surprise, Neutral, Angry, Fear, Disgust
- Uses DeepFace with OpenCV for face detection
- Smoothing and stability filters for consistent readings

### Vision: Hand Gesture Detection
- Detects: Open Palm, Thumb Up, Heart Hand, Index Pointing, OK Sign, Peace Sign
- Uses MediaPipe Hands with custom rule-based classification
- Real-time landmark smoothing for buttery tracking

### State Machine: Emotion-Gesture Bridge
- Combines emotion + gesture for mood determination
- Triggers specific reactions for combinations (e.g., Sad + Heart = Compassion)
- Cooldown and stability filters prevent rapid state changes

### Audio: Mood Soundscape
- Two-layer system: Background Ambience + Reaction SFX
- Smooth crossfading between ambiences
- Non-blocking threaded playback

## Installation

```bash
cd src_python
pip install -r requirements.txt
```

### Dependencies
- **opencv-python**: Camera and image processing
- **mediapipe**: Hand landmark detection
- **pygame**: Audio playback
- **deepface**: Face emotion analysis (optional but recommended)

## Usage

### Basic Run
```bash
python main.py
```

### With Options
```bash
# Different camera
python main.py --camera 1

# Custom resolution
python main.py --width 1280 --height 720

# Debug mode
python main.py --debug

# Async mode (for integration)
python main.py --async
```

### Controls
- **ESC**: Quit
- **SPACE**: Pause/Resume
- **D**: Toggle debug mode

## Emotion-Gesture Reactions

| Emotion | Gesture | Reaction |
|---------|---------|----------|
| Sad | Heart Hand | Compassionate chime, empathetic mood |
| Happy | Thumb Up | Excited ping, celebratory mood |
| Sad | Open Palm | Gentle wave, supportive mood |
| Neutral | Index Point | Focus click, focused mood |
| Happy | Heart Hand | Love sparkle, joyful mood |

## API Usage

```python
from src_python.core import EmpatheticOrchestrator, MoodState
from src_python.senses import FaceEmotionDetector, HandGestureDetector

# Initialize detectors
face_detector = FaceEmotionDetector()
hand_detector = HandGestureDetector()

# Process a frame
emotion_result = face_detector.detect(frame)
gesture_result = hand_detector.detect(frame)

# Use orchestrator for full integration
orchestrator = EmpatheticOrchestrator()
reaction = orchestrator.process_frame(
    emotion=emotion_result.emotion,
    emotion_confidence=emotion_result.confidence,
    gesture=gesture_result.gesture,
    gesture_confidence=gesture_result.confidence,
)
```

## Configuration

All configuration is in `core/config.py`:

```python
from core.config import EmpathicConfig

config = EmpathicConfig()
config.vision.min_detection_confidence = 0.8
config.audio.master_volume = 0.5
config.state_machine.state_transition_cooldown_ms = 300
```

## Integration with Frontend

This Python backend can work alongside the existing React/TypeScript frontend:

1. **WebSocket Bridge**: Run as a server providing emotion/gesture data
2. **Subprocess**: Frontend spawns Python process for detection
3. **Shared State**: Use Redis/IPC for real-time state sharing

## Adding Custom Gestures

1. Add gesture to `GestureLabel` enum in `config.py`
2. Implement detection logic in `vision_hands.py._classify_gesture()`
3. Add reaction mapping in `EMOTION_GESTURE_REACTIONS`
4. Place sound file in `assets/sounds/`

## License

MIT License - See main project LICENSE file.
