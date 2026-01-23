#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Audio Output Module for Empathic-01 System

Mood-based audio system with two layers:
1. Background Ambience: Subtle sounds that change based on emotion
2. Reaction SFX: Immediate sounds triggered by gestures

Uses Pygame for audio playback with support for:
- Crossfading between ambiences
- Volume control per layer
- Async-friendly operation
"""

from dataclasses import dataclass
from typing import Optional, Dict, Callable, Any
from pathlib import Path
from enum import Enum
import threading
import time
import queue

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import (
    AudioConfig,
    MoodState,
    EmotionLabel,
    EMOTION_AMBIENCE,
    MOOD_AMBIENCE,
    DEFAULT_CONFIG,
    get_asset_path,
)


class AudioLayer(Enum):
    """Audio playback layers."""
    AMBIENCE = "ambience"
    SFX = "sfx"
    VOICE = "voice"


@dataclass
class AudioCommand:
    """Command for the audio thread."""
    action: str  # "play", "stop", "fade_to", "set_volume"
    layer: AudioLayer
    filename: Optional[str] = None
    volume: float = 1.0
    fade_duration: float = 0.0
    loop: bool = False


class MoodAudioEngine:
    """
    Audio engine for mood-based soundscapes.

    Features:
    - Dual-layer playback (ambience + SFX)
    - Smooth crossfading between ambiences
    - Non-blocking playback via threading
    - Volume control per layer
    """

    def __init__(self, config: Optional[AudioConfig] = None):
        """Initialize the audio engine."""
        self.config = config or DEFAULT_CONFIG.audio
        self._initialized = False
        self._pygame_available = False

        # Audio state
        self._current_ambience: Optional[str] = None
        self._ambience_volume = self.config.ambience_volume
        self._sfx_volume = self.config.sfx_volume
        self._master_volume = self.config.master_volume

        # Threading
        self._command_queue: queue.Queue = queue.Queue()
        self._audio_thread: Optional[threading.Thread] = None
        self._running = False

        # Callbacks
        self._on_sfx_complete: Optional[Callable[[str], None]] = None
        self._on_ambience_change: Optional[Callable[[str, str], None]] = None

        # Sound cache
        self._sound_cache: Dict[str, Any] = {}

        # Try to initialize pygame
        self._init_pygame()

    def _init_pygame(self) -> bool:
        """Initialize pygame mixer."""
        try:
            import pygame
            pygame.mixer.init(
                frequency=self.config.sample_rate,
                size=-16,
                channels=2,
                buffer=self.config.buffer_size
            )
            pygame.mixer.set_num_channels(8)  # Multiple simultaneous sounds
            self.pygame = pygame
            self._pygame_available = True
            self._initialized = True
            print("[AudioEngine] Pygame mixer initialized")
            return True
        except ImportError:
            print("[AudioEngine] Pygame not available - audio disabled")
            return False
        except Exception as e:
            print(f"[AudioEngine] Mixer init failed: {e}")
            return False

    def _get_sound_path(self, filename: str) -> Path:
        """Get full path to sound file."""
        return get_asset_path(filename, "sounds")

    def _load_sound(self, filename: str) -> Optional[Any]:
        """Load and cache a sound file."""
        if not self._pygame_available:
            return None

        if filename in self._sound_cache:
            return self._sound_cache[filename]

        path = self._get_sound_path(filename)
        if not path.exists():
            print(f"[AudioEngine] Sound file not found: {path}")
            return None

        try:
            sound = self.pygame.mixer.Sound(str(path))
            self._sound_cache[filename] = sound
            return sound
        except Exception as e:
            print(f"[AudioEngine] Failed to load {filename}: {e}")
            return None

    def _audio_worker(self) -> None:
        """Background thread for audio processing."""
        while self._running:
            try:
                cmd = self._command_queue.get(timeout=0.1)
                self._process_command(cmd)
            except queue.Empty:
                continue
            except Exception as e:
                print(f"[AudioEngine] Worker error: {e}")

    def _process_command(self, cmd: AudioCommand) -> None:
        """Process an audio command."""
        if not self._pygame_available:
            return

        if cmd.action == "play":
            self._handle_play(cmd)
        elif cmd.action == "stop":
            self._handle_stop(cmd)
        elif cmd.action == "fade_to":
            self._handle_fade_to(cmd)
        elif cmd.action == "set_volume":
            self._handle_set_volume(cmd)

    def _handle_play(self, cmd: AudioCommand) -> None:
        """Handle play command."""
        if not cmd.filename:
            return

        sound = self._load_sound(cmd.filename)
        if not sound:
            return

        volume = cmd.volume * self._master_volume
        sound.set_volume(volume)

        if cmd.layer == AudioLayer.AMBIENCE:
            # Ambience uses dedicated channel 0
            channel = self.pygame.mixer.Channel(0)
            if cmd.loop:
                channel.play(sound, loops=-1)
            else:
                channel.play(sound)
            self._current_ambience = cmd.filename

        elif cmd.layer == AudioLayer.SFX:
            # SFX uses any available channel
            channel = sound.play()
            if channel and self._on_sfx_complete:
                # Could set up end event callback here
                pass

    def _handle_stop(self, cmd: AudioCommand) -> None:
        """Handle stop command."""
        if cmd.layer == AudioLayer.AMBIENCE:
            channel = self.pygame.mixer.Channel(0)
            if cmd.fade_duration > 0:
                channel.fadeout(int(cmd.fade_duration * 1000))
            else:
                channel.stop()
            self._current_ambience = None

        elif cmd.layer == AudioLayer.SFX:
            # Stop all SFX
            for i in range(1, 8):
                self.pygame.mixer.Channel(i).stop()

    def _handle_fade_to(self, cmd: AudioCommand) -> None:
        """Handle crossfade to new ambience."""
        if not cmd.filename:
            return

        # Fade out current
        if self._current_ambience:
            channel = self.pygame.mixer.Channel(0)
            channel.fadeout(int(cmd.fade_duration * 1000 / 2))

        # Wait for fade out
        time.sleep(cmd.fade_duration / 2)

        # Play new with fade in
        sound = self._load_sound(cmd.filename)
        if sound:
            volume = self._ambience_volume * self._master_volume
            sound.set_volume(0)

            channel = self.pygame.mixer.Channel(0)
            if cmd.loop:
                channel.play(sound, loops=-1)
            else:
                channel.play(sound)

            # Fade in
            steps = 20
            step_time = cmd.fade_duration / 2 / steps
            for i in range(steps + 1):
                sound.set_volume(volume * (i / steps))
                time.sleep(step_time)

            self._current_ambience = cmd.filename

            if self._on_ambience_change:
                self._on_ambience_change(self._current_ambience, cmd.filename)

    def _handle_set_volume(self, cmd: AudioCommand) -> None:
        """Handle volume change."""
        if cmd.layer == AudioLayer.AMBIENCE:
            self._ambience_volume = cmd.volume
            channel = self.pygame.mixer.Channel(0)
            channel.set_volume(cmd.volume * self._master_volume)

        elif cmd.layer == AudioLayer.SFX:
            self._sfx_volume = cmd.volume

    def start(self) -> None:
        """Start the audio engine."""
        if not self._pygame_available:
            print("[AudioEngine] Cannot start - pygame not available")
            return

        if self._running:
            return

        self._running = True
        self._audio_thread = threading.Thread(target=self._audio_worker, daemon=True)
        self._audio_thread.start()
        print("[AudioEngine] Started")

    def stop(self) -> None:
        """Stop the audio engine."""
        self._running = False
        if self._audio_thread:
            self._audio_thread.join(timeout=1.0)
            self._audio_thread = None

        if self._pygame_available:
            self.pygame.mixer.stop()

        print("[AudioEngine] Stopped")

    def play_sfx(self, filename: str, volume: Optional[float] = None) -> None:
        """
        Play a sound effect immediately.

        Args:
            filename: Sound file name
            volume: Optional volume override (0.0 to 1.0)
        """
        cmd = AudioCommand(
            action="play",
            layer=AudioLayer.SFX,
            filename=filename,
            volume=volume or self._sfx_volume,
            loop=False,
        )
        self._command_queue.put(cmd)

    def play_ambience(self, filename: str, fade: bool = True) -> None:
        """
        Play or crossfade to a new ambience.

        Args:
            filename: Ambience file name
            fade: Whether to crossfade (default True)
        """
        if filename == self._current_ambience:
            return  # Already playing

        if fade and self._current_ambience:
            cmd = AudioCommand(
                action="fade_to",
                layer=AudioLayer.AMBIENCE,
                filename=filename,
                fade_duration=self.config.ambience_fade_duration,
                loop=self.config.ambience_loop,
            )
        else:
            cmd = AudioCommand(
                action="play",
                layer=AudioLayer.AMBIENCE,
                filename=filename,
                volume=self._ambience_volume,
                loop=self.config.ambience_loop,
            )
        self._command_queue.put(cmd)

    def stop_ambience(self, fade: bool = True) -> None:
        """Stop background ambience."""
        cmd = AudioCommand(
            action="stop",
            layer=AudioLayer.AMBIENCE,
            fade_duration=self.config.ambience_fade_duration if fade else 0,
        )
        self._command_queue.put(cmd)

    def set_ambience_volume(self, volume: float) -> None:
        """Set ambience layer volume (0.0 to 1.0)."""
        cmd = AudioCommand(
            action="set_volume",
            layer=AudioLayer.AMBIENCE,
            volume=max(0.0, min(1.0, volume)),
        )
        self._command_queue.put(cmd)

    def set_sfx_volume(self, volume: float) -> None:
        """Set SFX layer volume (0.0 to 1.0)."""
        self._sfx_volume = max(0.0, min(1.0, volume))

    def set_master_volume(self, volume: float) -> None:
        """Set master volume (0.0 to 1.0)."""
        self._master_volume = max(0.0, min(1.0, volume))

    # Mood-based convenience methods

    def set_mood_ambience(self, mood: MoodState) -> None:
        """Set ambience based on mood state."""
        if mood in MOOD_AMBIENCE:
            self.play_ambience(MOOD_AMBIENCE[mood])

    def set_emotion_ambience(self, emotion: EmotionLabel) -> None:
        """Set ambience based on emotion."""
        if emotion in EMOTION_AMBIENCE:
            self.play_ambience(EMOTION_AMBIENCE[emotion])

    def trigger_reaction_sfx(self, sfx_file: str) -> None:
        """Trigger an immediate reaction sound effect."""
        self.play_sfx(sfx_file)

    # Callbacks

    def on_sfx_complete(self, callback: Callable[[str], None]) -> None:
        """Set callback for SFX completion."""
        self._on_sfx_complete = callback

    def on_ambience_change(self, callback: Callable[[str, str], None]) -> None:
        """Set callback for ambience changes."""
        self._on_ambience_change = callback

    # Status

    def get_status(self) -> Dict[str, Any]:
        """Get current audio engine status."""
        return {
            "initialized": self._initialized,
            "pygame_available": self._pygame_available,
            "running": self._running,
            "current_ambience": self._current_ambience,
            "ambience_volume": self._ambience_volume,
            "sfx_volume": self._sfx_volume,
            "master_volume": self._master_volume,
            "cached_sounds": list(self._sound_cache.keys()),
        }

    @property
    def is_ready(self) -> bool:
        """Check if audio engine is ready."""
        return self._initialized and self._running


class MockAudioEngine:
    """
    Mock audio engine for testing without actual audio playback.
    Logs all audio operations for verification.
    """

    def __init__(self):
        self.log: list = []
        self._running = False

    def start(self) -> None:
        self._running = True
        self.log.append(("start", time.time()))

    def stop(self) -> None:
        self._running = False
        self.log.append(("stop", time.time()))

    def play_sfx(self, filename: str, volume: Optional[float] = None) -> None:
        self.log.append(("play_sfx", filename, volume, time.time()))

    def play_ambience(self, filename: str, fade: bool = True) -> None:
        self.log.append(("play_ambience", filename, fade, time.time()))

    def stop_ambience(self, fade: bool = True) -> None:
        self.log.append(("stop_ambience", fade, time.time()))

    def set_mood_ambience(self, mood: MoodState) -> None:
        self.log.append(("set_mood_ambience", mood.value, time.time()))

    def set_emotion_ambience(self, emotion: EmotionLabel) -> None:
        self.log.append(("set_emotion_ambience", emotion.value, time.time()))

    def trigger_reaction_sfx(self, sfx_file: str) -> None:
        self.log.append(("trigger_reaction_sfx", sfx_file, time.time()))

    @property
    def is_ready(self) -> bool:
        return self._running

    def get_status(self) -> Dict[str, Any]:
        return {"mock": True, "log_entries": len(self.log)}


def create_audio_engine(use_mock: bool = False) -> MoodAudioEngine:
    """Factory function to create appropriate audio engine."""
    if use_mock:
        return MockAudioEngine()
    return MoodAudioEngine()
