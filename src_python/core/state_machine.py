#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
State Machine Module for Empathic-01 System

Manages the "Mood" state by bridging Face Emotion and Hand Gesture signals.
Implements the core logic for emotional reactions and audio triggers.
"""

from dataclasses import dataclass, field
from typing import Optional, Callable, List, Dict, Any
from enum import Enum
import time
import asyncio
from collections import deque

from .config import (
    EmotionLabel,
    GestureLabel,
    MoodState,
    StateMachineConfig,
    EMOTION_GESTURE_REACTIONS,
    EMOTION_AMBIENCE,
    MOOD_AMBIENCE,
    DEFAULT_CONFIG,
)


@dataclass
class SensoryInput:
    """Input data from vision sensors."""
    emotion: Optional[EmotionLabel] = None
    emotion_confidence: float = 0.0
    gesture: Optional[GestureLabel] = None
    gesture_confidence: float = 0.0
    timestamp: float = field(default_factory=time.time)


@dataclass
class Reaction:
    """Output reaction from the state machine."""
    mood: MoodState
    sfx_to_play: Optional[str] = None
    ambience_to_play: Optional[str] = None
    message: Optional[str] = None
    should_change_ambience: bool = False
    timestamp: float = field(default_factory=time.time)


@dataclass
class MoodHistory:
    """Track mood history for analysis."""
    mood: MoodState
    emotion: Optional[EmotionLabel]
    gesture: Optional[GestureLabel]
    timestamp: float
    duration_ms: float = 0.0


class EmpatheticStateMachine:
    """
    The brain of the Empathic-01 system.

    Observes emotion and gesture inputs, maintains mood state,
    and triggers appropriate audio reactions.

    State Transition Rules:
    1. Emotion alone sets base mood ambience
    2. Gesture alone can modify mood temporarily
    3. Emotion + Gesture combination triggers specific reactions
    4. Cooldown prevents rapid state thrashing
    """

    def __init__(
        self,
        config: Optional[StateMachineConfig] = None,
        on_reaction: Optional[Callable[[Reaction], None]] = None,
        on_mood_change: Optional[Callable[[MoodState, MoodState], None]] = None,
    ):
        self.config = config or DEFAULT_CONFIG.state_machine
        self.on_reaction = on_reaction
        self.on_mood_change = on_mood_change

        # Current state
        self._current_mood: MoodState = MoodState.NEUTRAL
        self._current_emotion: Optional[EmotionLabel] = None
        self._current_gesture: Optional[GestureLabel] = None
        self._current_ambience: Optional[str] = None

        # Timing
        self._last_state_change: float = 0.0
        self._last_sfx_trigger: float = 0.0
        self._gesture_start_time: float = 0.0

        # History for analysis
        self._mood_history: deque[MoodHistory] = deque(maxlen=100)
        self._input_buffer: deque[SensoryInput] = deque(maxlen=10)

        # Stability tracking
        self._emotion_stable_count: int = 0
        self._gesture_stable_count: int = 0
        self._last_stable_emotion: Optional[EmotionLabel] = None
        self._last_stable_gesture: Optional[GestureLabel] = None

        # Async event loop reference
        self._reaction_queue: asyncio.Queue[Reaction] = asyncio.Queue()

    @property
    def current_mood(self) -> MoodState:
        """Get current mood state."""
        return self._current_mood

    @property
    def current_emotion(self) -> Optional[EmotionLabel]:
        """Get current detected emotion."""
        return self._current_emotion

    @property
    def current_gesture(self) -> Optional[GestureLabel]:
        """Get current detected gesture."""
        return self._current_gesture

    @property
    def mood_history(self) -> List[MoodHistory]:
        """Get mood history for analysis."""
        return list(self._mood_history)

    def _can_transition(self) -> bool:
        """Check if enough time has passed for a state transition."""
        now = time.time() * 1000  # Convert to ms
        cooldown = self.config.state_transition_cooldown_ms
        return (now - self._last_state_change) >= cooldown

    def _is_gesture_held(self) -> bool:
        """Check if gesture has been held long enough."""
        if self._gesture_start_time == 0:
            return False
        now = time.time() * 1000
        hold_duration = self.config.gesture_hold_duration_ms
        return (now - self._gesture_start_time) >= hold_duration

    def _stabilize_emotion(self, emotion: Optional[EmotionLabel]) -> Optional[EmotionLabel]:
        """Apply stability filtering to emotion detection."""
        if emotion == self._last_stable_emotion:
            self._emotion_stable_count += 1
        else:
            self._emotion_stable_count = 1

        # Require stability before accepting new emotion
        if self._emotion_stable_count >= 3:  # Configurable stability threshold
            self._last_stable_emotion = emotion
            return emotion

        return self._last_stable_emotion

    def _stabilize_gesture(self, gesture: Optional[GestureLabel]) -> Optional[GestureLabel]:
        """Apply stability filtering to gesture detection."""
        if gesture == self._last_stable_gesture:
            self._gesture_stable_count += 1
        else:
            self._gesture_stable_count = 1
            self._gesture_start_time = time.time() * 1000 if gesture else 0

        if self._gesture_stable_count >= 2:
            self._last_stable_gesture = gesture
            return gesture

        return self._last_stable_gesture

    def _calculate_mood(
        self,
        emotion: Optional[EmotionLabel],
        gesture: Optional[GestureLabel]
    ) -> MoodState:
        """
        Calculate mood based on emotion and gesture combination.

        Priority:
        1. Specific emotion+gesture combinations from EMOTION_GESTURE_REACTIONS
        2. Gesture-influenced mood modifications
        3. Emotion-based baseline mood
        """
        # Check for specific combination first
        if emotion and gesture:
            combo = (emotion, gesture)
            if combo in EMOTION_GESTURE_REACTIONS:
                return EMOTION_GESTURE_REACTIONS[combo]["mood"]

        # Gesture-based mood modifications
        if gesture == GestureLabel.HEART_HAND:
            return MoodState.SUPPORTIVE
        elif gesture == GestureLabel.THUMB_UP:
            if emotion == EmotionLabel.HAPPY:
                return MoodState.CELEBRATORY
            return MoodState.CALM
        elif gesture == GestureLabel.INDEX_POINTING:
            return MoodState.FOCUSED
        elif gesture == GestureLabel.OPEN_PALM:
            if emotion == EmotionLabel.SAD:
                return MoodState.EMPATHETIC
            return MoodState.CALM

        # Emotion-based baseline
        if emotion == EmotionLabel.HAPPY:
            return MoodState.JOYFUL
        elif emotion == EmotionLabel.SAD:
            return MoodState.EMPATHETIC
        elif emotion in (EmotionLabel.ANGRY, EmotionLabel.FEAR):
            return MoodState.SUPPORTIVE

        return MoodState.NEUTRAL

    def _get_reaction(
        self,
        emotion: Optional[EmotionLabel],
        gesture: Optional[GestureLabel],
        new_mood: MoodState,
        mood_changed: bool
    ) -> Reaction:
        """Generate reaction based on current state."""
        reaction = Reaction(mood=new_mood)

        # Check for specific combination SFX
        if emotion and gesture and self._is_gesture_held():
            combo = (emotion, gesture)
            if combo in EMOTION_GESTURE_REACTIONS:
                reaction_config = EMOTION_GESTURE_REACTIONS[combo]
                reaction.sfx_to_play = reaction_config.get("sfx")
                reaction.message = reaction_config.get("message")

        # Determine ambience change
        if mood_changed:
            reaction.should_change_ambience = True
            # Mood-based ambience takes priority
            if new_mood in MOOD_AMBIENCE:
                reaction.ambience_to_play = MOOD_AMBIENCE[new_mood]
            elif emotion and emotion in EMOTION_AMBIENCE:
                reaction.ambience_to_play = EMOTION_AMBIENCE[emotion]

        return reaction

    def process_input(self, sensory_input: SensoryInput) -> Optional[Reaction]:
        """
        Process a new sensory input and return any reaction.

        This is the main entry point for the state machine.
        Call this each frame with the latest detection results.

        Args:
            sensory_input: Latest emotion and gesture detections

        Returns:
            Reaction if state changed or SFX should play, None otherwise
        """
        # Buffer input for analysis
        self._input_buffer.append(sensory_input)

        # Apply confidence filtering
        emotion = None
        gesture = None

        if (sensory_input.emotion and
            sensory_input.emotion_confidence >= self.config.min_emotion_confidence):
            emotion = sensory_input.emotion

        if (sensory_input.gesture and
            sensory_input.gesture_confidence >= self.config.min_gesture_confidence):
            gesture = sensory_input.gesture

        # Apply stability filtering
        stable_emotion = self._stabilize_emotion(emotion)
        stable_gesture = self._stabilize_gesture(gesture)

        # Update current detections
        self._current_emotion = stable_emotion
        self._current_gesture = stable_gesture

        # Calculate new mood
        new_mood = self._calculate_mood(stable_emotion, stable_gesture)

        # Check if mood changed
        mood_changed = new_mood != self._current_mood and self._can_transition()

        if mood_changed:
            old_mood = self._current_mood
            self._current_mood = new_mood
            self._last_state_change = time.time() * 1000

            # Record history
            self._mood_history.append(MoodHistory(
                mood=new_mood,
                emotion=stable_emotion,
                gesture=stable_gesture,
                timestamp=time.time(),
            ))

            # Notify listener
            if self.on_mood_change:
                self.on_mood_change(old_mood, new_mood)

        # Generate reaction
        reaction = self._get_reaction(stable_emotion, stable_gesture, new_mood, mood_changed)

        # Only return reaction if something meaningful happened
        if mood_changed or reaction.sfx_to_play:
            if self.on_reaction:
                self.on_reaction(reaction)
            return reaction

        return None

    async def process_input_async(self, sensory_input: SensoryInput) -> Optional[Reaction]:
        """Async version of process_input for use in async contexts."""
        reaction = self.process_input(sensory_input)
        if reaction:
            await self._reaction_queue.put(reaction)
        return reaction

    async def get_next_reaction(self) -> Reaction:
        """Get the next reaction from the queue (async)."""
        return await self._reaction_queue.get()

    def reset(self) -> None:
        """Reset state machine to initial state."""
        self._current_mood = MoodState.NEUTRAL
        self._current_emotion = None
        self._current_gesture = None
        self._current_ambience = None
        self._last_state_change = 0.0
        self._last_sfx_trigger = 0.0
        self._gesture_start_time = 0.0
        self._emotion_stable_count = 0
        self._gesture_stable_count = 0
        self._last_stable_emotion = None
        self._last_stable_gesture = None
        self._mood_history.clear()
        self._input_buffer.clear()

    def get_status(self) -> Dict[str, Any]:
        """Get current status for debugging/UI."""
        return {
            "mood": self._current_mood.value,
            "emotion": self._current_emotion.value if self._current_emotion else None,
            "gesture": self._current_gesture.value if self._current_gesture else None,
            "ambience": self._current_ambience,
            "history_length": len(self._mood_history),
            "can_transition": self._can_transition(),
            "gesture_held": self._is_gesture_held(),
        }


class EmpatheticOrchestrator:
    """
    High-level orchestrator that coordinates the state machine
    with the vision and audio systems.
    """

    def __init__(self, config: Optional[StateMachineConfig] = None):
        self.state_machine = EmpatheticStateMachine(
            config=config,
            on_reaction=self._handle_reaction,
            on_mood_change=self._handle_mood_change,
        )
        self._audio_callback: Optional[Callable] = None
        self._ui_callback: Optional[Callable] = None
        self._running = False

    def set_audio_callback(self, callback: Callable[[Reaction], None]) -> None:
        """Set callback for audio system."""
        self._audio_callback = callback

    def set_ui_callback(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        """Set callback for UI updates."""
        self._ui_callback = callback

    def _handle_reaction(self, reaction: Reaction) -> None:
        """Handle reaction from state machine."""
        if self._audio_callback:
            self._audio_callback(reaction)

    def _handle_mood_change(self, old_mood: MoodState, new_mood: MoodState) -> None:
        """Handle mood change."""
        print(f"[StateMachine] Mood changed: {old_mood.value} -> {new_mood.value}")
        if self._ui_callback:
            self._ui_callback(self.state_machine.get_status())

    def process_frame(
        self,
        emotion: Optional[EmotionLabel],
        emotion_confidence: float,
        gesture: Optional[GestureLabel],
        gesture_confidence: float,
    ) -> Optional[Reaction]:
        """
        Process a single frame of sensory input.

        Call this from the main detection loop with the latest results.
        """
        sensory_input = SensoryInput(
            emotion=emotion,
            emotion_confidence=emotion_confidence,
            gesture=gesture,
            gesture_confidence=gesture_confidence,
        )
        return self.state_machine.process_input(sensory_input)

    def get_current_state(self) -> Dict[str, Any]:
        """Get current orchestrator state."""
        return self.state_machine.get_status()
