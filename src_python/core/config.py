#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Configuration Module for Empathic-01 System

Centralized configuration for detection thresholds, audio settings,
and state machine parameters. All magic numbers live here.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List
from pathlib import Path


class EmotionLabel(Enum):
    """Detected emotion categories."""
    HAPPY = "happy"
    SAD = "sad"
    SURPRISE = "surprise"
    NEUTRAL = "neutral"
    ANGRY = "angry"
    FEAR = "fear"
    DISGUST = "disgust"


class GestureLabel(Enum):
    """Detected hand gesture categories."""
    OPEN_PALM = "open_palm"       # Listening/Stop gesture
    THUMB_UP = "thumb_up"         # Approval gesture
    HEART_HAND = "heart_hand"     # Affection/Support gesture
    INDEX_POINTING = "index_pointing"  # Focus gesture
    CLOSED_FIST = "closed_fist"   # None/Neutral
    OK_SIGN = "ok_sign"           # OK gesture
    PEACE_SIGN = "peace_sign"     # Peace/Victory gesture
    NONE = "none"                 # No gesture detected


class MoodState(Enum):
    """Overall mood states for the system."""
    CALM = "calm"
    JOYFUL = "joyful"
    EMPATHETIC = "empathetic"
    FOCUSED = "focused"
    SUPPORTIVE = "supportive"
    CELEBRATORY = "celebratory"
    NEUTRAL = "neutral"


@dataclass
class VisionConfig:
    """Configuration for vision processing (face + hands)."""
    # Camera settings
    camera_device: int = 0
    frame_width: int = 960
    frame_height: int = 540
    frame_rate: int = 30

    # MediaPipe Hands settings
    max_num_hands: int = 2
    min_detection_confidence: float = 0.7
    min_tracking_confidence: float = 0.5
    static_image_mode: bool = False

    # Face detection settings
    face_detection_confidence: float = 0.5

    # Inference throttling
    inference_interval_ms: int = 50  # ~20 FPS for detection

    # Smoothing
    landmark_smoothing_alpha: float = 0.4  # EMA smoothing factor
    emotion_stability_frames: int = 3  # Frames before emotion change
    gesture_stability_frames: int = 2  # Frames before gesture change


@dataclass
class AudioConfig:
    """Configuration for audio output system."""
    # Sound file paths (relative to assets/sounds)
    sounds_directory: str = "assets/sounds"

    # Volume levels (0.0 to 1.0)
    ambience_volume: float = 0.3
    sfx_volume: float = 0.7
    master_volume: float = 0.8

    # Fade durations (seconds)
    ambience_fade_duration: float = 2.0
    sfx_fade_duration: float = 0.3

    # Audio processing
    sample_rate: int = 44100
    buffer_size: int = 2048

    # Ambience settings
    ambience_loop: bool = True
    ambience_crossfade: bool = True


@dataclass
class StateMachineConfig:
    """Configuration for the emotion-gesture state machine."""
    # Timing
    state_transition_cooldown_ms: int = 500  # Min time between state changes
    gesture_hold_duration_ms: int = 300  # How long gesture must be held

    # Confidence thresholds
    min_emotion_confidence: float = 0.5
    min_gesture_confidence: float = 0.6

    # Priority weights for mood calculation
    emotion_weight: float = 0.6
    gesture_weight: float = 0.4


# Emotion-Gesture Reaction Mappings
EMOTION_GESTURE_REACTIONS: Dict[tuple, Dict] = {
    # (Emotion, Gesture) -> Reaction configuration
    (EmotionLabel.SAD, GestureLabel.HEART_HAND): {
        "sfx": "compassionate_chime.wav",
        "mood": MoodState.EMPATHETIC,
        "message": "I sense you need support. I'm here for you.",
    },
    (EmotionLabel.HAPPY, GestureLabel.THUMB_UP): {
        "sfx": "excited_ping.wav",
        "mood": MoodState.CELEBRATORY,
        "message": "That's wonderful! Let's celebrate together!",
    },
    (EmotionLabel.SAD, GestureLabel.OPEN_PALM): {
        "sfx": "gentle_wave.wav",
        "mood": MoodState.SUPPORTIVE,
        "message": "I see you. Take your time.",
    },
    (EmotionLabel.NEUTRAL, GestureLabel.INDEX_POINTING): {
        "sfx": "focus_click.wav",
        "mood": MoodState.FOCUSED,
        "message": "I'm listening. Tell me more.",
    },
    (EmotionLabel.HAPPY, GestureLabel.HEART_HAND): {
        "sfx": "love_sparkle.wav",
        "mood": MoodState.JOYFUL,
        "message": "Spreading joy together!",
    },
    (EmotionLabel.SURPRISE, GestureLabel.OPEN_PALM): {
        "sfx": "discovery_chime.wav",
        "mood": MoodState.JOYFUL,
        "message": "What an exciting discovery!",
    },
    (EmotionLabel.NEUTRAL, GestureLabel.THUMB_UP): {
        "sfx": "approval_ding.wav",
        "mood": MoodState.CALM,
        "message": "Got it! Moving forward.",
    },
}

# Background Ambience Mappings
EMOTION_AMBIENCE: Dict[EmotionLabel, str] = {
    EmotionLabel.HAPPY: "happy_lofi.wav",
    EmotionLabel.SAD: "gentle_rain.wav",
    EmotionLabel.NEUTRAL: "calm_ambient.wav",
    EmotionLabel.SURPRISE: "curious_sparkle.wav",
    EmotionLabel.ANGRY: "calming_waves.wav",
    EmotionLabel.FEAR: "safe_embrace.wav",
    EmotionLabel.DISGUST: "fresh_breeze.wav",
}

# Mood to Ambience Mappings (higher priority than emotion)
MOOD_AMBIENCE: Dict[MoodState, str] = {
    MoodState.CALM: "calm_ambient.wav",
    MoodState.JOYFUL: "happy_lofi.wav",
    MoodState.EMPATHETIC: "gentle_piano.wav",
    MoodState.FOCUSED: "focus_binaural.wav",
    MoodState.SUPPORTIVE: "warm_embrace.wav",
    MoodState.CELEBRATORY: "celebration_loop.wav",
    MoodState.NEUTRAL: "soft_hum.wav",
}


@dataclass
class EmpathicConfig:
    """Master configuration for the entire Empathic-01 system."""
    vision: VisionConfig = field(default_factory=VisionConfig)
    audio: AudioConfig = field(default_factory=AudioConfig)
    state_machine: StateMachineConfig = field(default_factory=StateMachineConfig)

    # Debug settings
    debug_mode: bool = False
    show_fps: bool = True
    show_landmarks: bool = True
    log_detections: bool = False

    @classmethod
    def from_env(cls) -> "EmpathicConfig":
        """Create config from environment variables."""
        import os
        config = cls()

        # Override with environment variables if present
        if os.getenv("EMPATHIC_DEBUG"):
            config.debug_mode = os.getenv("EMPATHIC_DEBUG", "").lower() == "true"

        if os.getenv("EMPATHIC_CAMERA_DEVICE"):
            config.vision.camera_device = int(os.getenv("EMPATHIC_CAMERA_DEVICE", "0"))

        return config


# Default configuration instance
DEFAULT_CONFIG = EmpathicConfig()


def get_asset_path(filename: str, asset_type: str = "sounds") -> Path:
    """Get the full path to an asset file."""
    base_path = Path(__file__).parent.parent / "assets" / asset_type
    return base_path / filename


def validate_config(config: EmpathicConfig) -> List[str]:
    """Validate configuration and return list of warnings."""
    warnings = []

    if config.vision.min_detection_confidence < 0.5:
        warnings.append("Low detection confidence may cause false positives")

    if config.audio.master_volume > 0.9:
        warnings.append("High master volume may be uncomfortable")

    if config.state_machine.state_transition_cooldown_ms < 200:
        warnings.append("Very short cooldown may cause rapid state changes")

    return warnings
