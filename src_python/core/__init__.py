"""
Core Module - Configuration and State Management

This module contains the core logic:
- config: All configuration and constants
- state_machine: Emotion-gesture bridge and mood management
"""

from .config import (
    EmotionLabel,
    GestureLabel,
    MoodState,
    VisionConfig,
    AudioConfig,
    StateMachineConfig,
    EmpathicConfig,
    DEFAULT_CONFIG,
    EMOTION_GESTURE_REACTIONS,
    EMOTION_AMBIENCE,
    MOOD_AMBIENCE,
    get_asset_path,
    validate_config,
)

from .state_machine import (
    SensoryInput,
    Reaction,
    MoodHistory,
    EmpatheticStateMachine,
    EmpatheticOrchestrator,
)

__all__ = [
    # Config
    "EmotionLabel",
    "GestureLabel",
    "MoodState",
    "VisionConfig",
    "AudioConfig",
    "StateMachineConfig",
    "EmpathicConfig",
    "DEFAULT_CONFIG",
    "EMOTION_GESTURE_REACTIONS",
    "EMOTION_AMBIENCE",
    "MOOD_AMBIENCE",
    "get_asset_path",
    "validate_config",
    # State Machine
    "SensoryInput",
    "Reaction",
    "MoodHistory",
    "EmpatheticStateMachine",
    "EmpatheticOrchestrator",
]
