#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Empathic-01 Main Orchestrator

The async orchestrator that coordinates:
- Face emotion detection
- Hand gesture detection
- State machine mood management
- Audio output based on emotional reactions

This is the entry point for the Python Empathic AI system.
"""

import asyncio
import argparse
import signal
import sys
import time
from typing import Optional, Dict, Any
from dataclasses import dataclass
from pathlib import Path

import cv2 as cv
import numpy as np

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from core.config import (
    EmpathicConfig,
    EmotionLabel,
    GestureLabel,
    MoodState,
    DEFAULT_CONFIG,
)
from core.state_machine import (
    EmpatheticStateMachine,
    EmpatheticOrchestrator,
    SensoryInput,
    Reaction,
)
from senses.vision_face import FaceEmotionDetector, EmotionResult
from senses.vision_hands import HandGestureDetector, HandGestureResult
from senses.audio_output import MoodAudioEngine, create_audio_engine


@dataclass
class FrameData:
    """Container for a single frame's processing results."""
    frame: np.ndarray
    emotion_result: Optional[EmotionResult] = None
    gesture_result: Optional[HandGestureResult] = None
    reaction: Optional[Reaction] = None
    fps: float = 0.0
    timestamp: float = 0.0


class EmpathicSystem:
    """
    The complete Empathic-01 system.

    Coordinates all subsystems:
    - Vision (face + hands)
    - State machine (emotion-gesture bridge)
    - Audio (mood-based soundscape)
    """

    def __init__(self, config: Optional[EmpathicConfig] = None):
        """Initialize the Empathic system."""
        self.config = config or DEFAULT_CONFIG

        # Initialize components
        self.face_detector = FaceEmotionDetector(self.config.vision)
        self.hand_detector = HandGestureDetector(self.config.vision)
        self.state_machine = EmpatheticStateMachine(
            config=self.config.state_machine,
            on_reaction=self._handle_reaction,
            on_mood_change=self._handle_mood_change,
        )
        self.audio_engine = create_audio_engine(use_mock=False)

        # Camera
        self.camera: Optional[cv.VideoCapture] = None

        # State
        self._running = False
        self._paused = False
        self._last_frame_time = 0.0
        self._frame_count = 0
        self._fps = 0.0
        self._fps_update_time = 0.0

        # Callbacks
        self._on_frame_processed: Optional[callable] = None

    def _handle_reaction(self, reaction: Reaction) -> None:
        """Handle reaction from state machine."""
        if self.config.debug_mode:
            print(f"[Empathic] Reaction: {reaction.mood.value}")
            if reaction.message:
                print(f"[Empathic] Message: {reaction.message}")

        # Trigger audio
        if reaction.sfx_to_play:
            self.audio_engine.trigger_reaction_sfx(reaction.sfx_to_play)

        if reaction.should_change_ambience and reaction.ambience_to_play:
            self.audio_engine.play_ambience(reaction.ambience_to_play)

    def _handle_mood_change(self, old_mood: MoodState, new_mood: MoodState) -> None:
        """Handle mood state change."""
        print(f"[Empathic] Mood: {old_mood.value} -> {new_mood.value}")
        self.audio_engine.set_mood_ambience(new_mood)

    def _init_camera(self) -> bool:
        """Initialize camera capture."""
        self.camera = cv.VideoCapture(self.config.vision.camera_device)
        if not self.camera.isOpened():
            print("[Empathic] ERROR: Could not open camera")
            return False

        self.camera.set(cv.CAP_PROP_FRAME_WIDTH, self.config.vision.frame_width)
        self.camera.set(cv.CAP_PROP_FRAME_HEIGHT, self.config.vision.frame_height)
        self.camera.set(cv.CAP_PROP_FPS, self.config.vision.frame_rate)

        print(f"[Empathic] Camera initialized: {self.config.vision.frame_width}x{self.config.vision.frame_height}")
        return True

    def _update_fps(self) -> None:
        """Update FPS counter."""
        self._frame_count += 1
        now = time.time()

        if now - self._fps_update_time >= 1.0:
            self._fps = self._frame_count / (now - self._fps_update_time)
            self._frame_count = 0
            self._fps_update_time = now

    def _process_frame(self, frame: np.ndarray) -> FrameData:
        """Process a single camera frame."""
        self._update_fps()

        # Mirror the frame
        frame = cv.flip(frame, 1)

        # Detect emotion
        emotion_result = self.face_detector.detect(frame)

        # Detect gesture
        gesture_result = self.hand_detector.detect(frame)

        # Extract values for state machine
        emotion = emotion_result.emotion if emotion_result else None
        emotion_confidence = emotion_result.confidence if emotion_result else 0.0
        gesture = gesture_result.gesture if gesture_result else None
        gesture_confidence = gesture_result.confidence if gesture_result else 0.0

        # Create sensory input
        sensory_input = SensoryInput(
            emotion=emotion,
            emotion_confidence=emotion_confidence,
            gesture=gesture,
            gesture_confidence=gesture_confidence,
        )

        # Process through state machine
        reaction = self.state_machine.process_input(sensory_input)

        return FrameData(
            frame=frame,
            emotion_result=emotion_result,
            gesture_result=gesture_result,
            reaction=reaction,
            fps=self._fps,
            timestamp=time.time(),
        )

    def _draw_ui(self, frame_data: FrameData) -> np.ndarray:
        """Draw UI overlay on frame."""
        frame = frame_data.frame.copy()
        h, w = frame.shape[:2]

        # Draw face emotion
        if frame_data.emotion_result:
            frame = self.face_detector.draw_result(frame, frame_data.emotion_result)

        # Draw hand gesture
        if frame_data.gesture_result:
            frame = self.hand_detector.draw_landmarks(frame, frame_data.gesture_result)

        # Draw info panel
        self._draw_info_panel(frame, frame_data)

        return frame

    def _draw_info_panel(self, frame: np.ndarray, frame_data: FrameData) -> None:
        """Draw information panel overlay."""
        h, w = frame.shape[:2]

        # Background panel
        panel_width = 280
        panel_height = 180
        panel_x = 10
        panel_y = 10

        overlay = frame.copy()
        cv.rectangle(overlay, (panel_x, panel_y),
                    (panel_x + panel_width, panel_y + panel_height),
                    (0, 0, 0), -1)
        cv.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)

        # Title
        cv.putText(frame, "EMPATHIC-01", (panel_x + 10, panel_y + 25),
                  cv.FONT_HERSHEY_SIMPLEX, 0.7, (142, 85, 114), 2)

        # FPS
        cv.putText(frame, f"FPS: {frame_data.fps:.1f}", (panel_x + 10, panel_y + 55),
                  cv.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        # Current mood
        mood = self.state_machine.current_mood
        cv.putText(frame, f"Mood: {mood.value}", (panel_x + 10, panel_y + 80),
                  cv.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        # Current emotion
        emotion = frame_data.emotion_result
        emotion_text = f"Emotion: {emotion.emotion.value}" if emotion else "Emotion: --"
        cv.putText(frame, emotion_text, (panel_x + 10, panel_y + 105),
                  cv.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        # Current gesture
        gesture = frame_data.gesture_result
        gesture_text = f"Gesture: {gesture.gesture.value}" if gesture else "Gesture: --"
        cv.putText(frame, gesture_text, (panel_x + 10, panel_y + 130),
                  cv.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        # Reaction message
        if frame_data.reaction and frame_data.reaction.message:
            cv.putText(frame, frame_data.reaction.message[:30], (panel_x + 10, panel_y + 160),
                      cv.FONT_HERSHEY_SIMPLEX, 0.4, (152, 251, 152), 1)

        # Controls hint
        cv.putText(frame, "ESC: Quit | SPACE: Pause | D: Debug",
                  (10, h - 10), cv.FONT_HERSHEY_SIMPLEX, 0.4, (150, 150, 150), 1)

    def run(self) -> None:
        """
        Run the main detection loop (synchronous).

        Press ESC to quit, SPACE to pause.
        """
        if not self._init_camera():
            return

        # Start audio engine
        self.audio_engine.start()

        # Set initial ambience
        self.audio_engine.set_mood_ambience(MoodState.NEUTRAL)

        self._running = True
        self._fps_update_time = time.time()
        print("[Empathic] Starting main loop. Press ESC to quit.")

        try:
            while self._running:
                # Handle keyboard input
                key = cv.waitKey(1) & 0xFF
                if key == 27:  # ESC
                    break
                elif key == 32:  # SPACE
                    self._paused = not self._paused
                    print(f"[Empathic] {'Paused' if self._paused else 'Resumed'}")
                elif key == ord('d'):
                    self.config.debug_mode = not self.config.debug_mode
                    print(f"[Empathic] Debug mode: {self.config.debug_mode}")

                if self._paused:
                    continue

                # Capture frame
                ret, frame = self.camera.read()
                if not ret:
                    print("[Empathic] WARNING: Frame capture failed")
                    continue

                # Process frame
                frame_data = self._process_frame(frame)

                # Draw UI
                display_frame = self._draw_ui(frame_data)

                # Show frame
                cv.imshow("Empathic-01", display_frame)

                # Callback if set
                if self._on_frame_processed:
                    self._on_frame_processed(frame_data)

        except KeyboardInterrupt:
            print("\n[Empathic] Interrupted by user")

        finally:
            self.cleanup()

    async def run_async(self) -> None:
        """
        Run the main detection loop (asynchronous).

        Allows for integration with other async systems.
        """
        if not self._init_camera():
            return

        self.audio_engine.start()
        self.audio_engine.set_mood_ambience(MoodState.NEUTRAL)

        self._running = True
        self._fps_update_time = time.time()
        print("[Empathic] Starting async main loop")

        try:
            while self._running:
                # Check for keyboard input (non-blocking)
                key = cv.waitKey(1) & 0xFF
                if key == 27:
                    break
                elif key == 32:
                    self._paused = not self._paused

                if self._paused:
                    await asyncio.sleep(0.1)
                    continue

                # Capture frame
                ret, frame = self.camera.read()
                if not ret:
                    await asyncio.sleep(0.01)
                    continue

                # Process frame (could be made fully async with threadpool)
                frame_data = self._process_frame(frame)

                # Draw and show
                display_frame = self._draw_ui(frame_data)
                cv.imshow("Empathic-01", display_frame)

                # Yield to event loop
                await asyncio.sleep(0.001)

        except asyncio.CancelledError:
            print("[Empathic] Async loop cancelled")

        finally:
            self.cleanup()

    def cleanup(self) -> None:
        """Clean up resources."""
        print("[Empathic] Cleaning up...")

        self._running = False

        if self.camera:
            self.camera.release()
            self.camera = None

        self.audio_engine.stop()
        self.hand_detector.close()

        cv.destroyAllWindows()
        print("[Empathic] Cleanup complete")

    def on_frame_processed(self, callback: callable) -> None:
        """Set callback for frame processing completion."""
        self._on_frame_processed = callback

    def get_status(self) -> Dict[str, Any]:
        """Get current system status."""
        return {
            "running": self._running,
            "paused": self._paused,
            "fps": self._fps,
            "mood": self.state_machine.current_mood.value,
            "emotion": self.state_machine.current_emotion.value if self.state_machine.current_emotion else None,
            "gesture": self.state_machine.current_gesture.value if self.state_machine.current_gesture else None,
            "audio": self.audio_engine.get_status(),
        }


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Empathic-01: Multimodal Emotion AI System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py                    # Run with defaults
  python main.py --debug            # Enable debug mode
  python main.py --camera 1         # Use camera device 1
  python main.py --no-audio         # Disable audio
        """
    )

    parser.add_argument(
        "--camera", "-c",
        type=int,
        default=0,
        help="Camera device index (default: 0)"
    )

    parser.add_argument(
        "--width",
        type=int,
        default=960,
        help="Camera frame width (default: 960)"
    )

    parser.add_argument(
        "--height",
        type=int,
        default=540,
        help="Camera frame height (default: 540)"
    )

    parser.add_argument(
        "--debug", "-d",
        action="store_true",
        help="Enable debug mode"
    )

    parser.add_argument(
        "--no-audio",
        action="store_true",
        help="Disable audio output"
    )

    parser.add_argument(
        "--async",
        action="store_true",
        dest="use_async",
        help="Run in async mode"
    )

    return parser.parse_args()


def main():
    """Main entry point."""
    args = parse_args()

    # Create configuration
    config = EmpathicConfig()
    config.vision.camera_device = args.camera
    config.vision.frame_width = args.width
    config.vision.frame_height = args.height
    config.debug_mode = args.debug

    print("=" * 50)
    print("  EMPATHIC-01: Multimodal Emotion AI System")
    print("=" * 50)
    print(f"  Camera: Device {args.camera} ({args.width}x{args.height})")
    print(f"  Debug: {'Enabled' if args.debug else 'Disabled'}")
    print(f"  Audio: {'Disabled' if args.no_audio else 'Enabled'}")
    print("=" * 50)

    # Create and run system
    system = EmpathicSystem(config)

    # Handle shutdown signals
    def signal_handler(sig, frame):
        print("\n[Empathic] Shutdown signal received")
        system._running = False

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Run
    if args.use_async:
        asyncio.run(system.run_async())
    else:
        system.run()


if __name__ == "__main__":
    main()
