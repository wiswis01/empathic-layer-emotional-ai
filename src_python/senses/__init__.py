"""
Senses Module - Vision and Audio Processing

This module contains the sensory input/output systems:
- vision_face: Face emotion detection
- vision_hands: Hand gesture detection
- audio_output: Mood-based audio playback
"""

from .vision_face import FaceEmotionDetector, EmotionResult, detect_emotion
from .vision_hands import HandGestureDetector, HandGestureResult, detect_gesture
from .audio_output import MoodAudioEngine, MockAudioEngine, create_audio_engine

__all__ = [
    # Face emotion
    "FaceEmotionDetector",
    "EmotionResult",
    "detect_emotion",
    # Hand gesture
    "HandGestureDetector",
    "HandGestureResult",
    "detect_gesture",
    # Audio
    "MoodAudioEngine",
    "MockAudioEngine",
    "create_audio_engine",
]
