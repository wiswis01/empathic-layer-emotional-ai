#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Generate placeholder sound files for the Empathic-01 system.
Uses scipy and numpy to create simple synthesized sounds.
"""

import numpy as np
from scipy.io import wavfile
from pathlib import Path

SAMPLE_RATE = 44100
SOUNDS_DIR = Path(__file__).parent / "assets" / "sounds"


def generate_tone(frequency: float, duration: float, volume: float = 0.5) -> np.ndarray:
    """Generate a simple sine wave tone."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    tone = np.sin(2 * np.pi * frequency * t) * volume
    # Apply fade in/out to avoid clicks
    fade_samples = int(SAMPLE_RATE * 0.02)
    tone[:fade_samples] *= np.linspace(0, 1, fade_samples)
    tone[-fade_samples:] *= np.linspace(1, 0, fade_samples)
    return tone


def generate_chime(base_freq: float, duration: float = 1.0) -> np.ndarray:
    """Generate a chime-like sound with harmonics."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    # Multiple harmonics with decay
    harmonics = [1, 2, 3, 4]
    amplitudes = [0.5, 0.3, 0.15, 0.05]

    sound = np.zeros_like(t)
    for h, a in zip(harmonics, amplitudes):
        decay = np.exp(-t * (2 + h))  # Higher harmonics decay faster
        sound += np.sin(2 * np.pi * base_freq * h * t) * a * decay

    # Normalize
    sound = sound / np.max(np.abs(sound)) * 0.7
    return sound


def generate_ping(frequency: float = 1200, duration: float = 0.5) -> np.ndarray:
    """Generate a short ping sound."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    decay = np.exp(-t * 8)
    sound = np.sin(2 * np.pi * frequency * t) * decay * 0.6
    # Add slight harmonics
    sound += np.sin(2 * np.pi * frequency * 2 * t) * decay * 0.2
    return sound


def generate_wave(duration: float = 2.0) -> np.ndarray:
    """Generate a gentle wave-like sound."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    # Low frequency modulation
    mod = np.sin(2 * np.pi * 0.5 * t) * 0.5 + 0.5
    # Pink-ish noise filtered
    noise = np.random.randn(len(t))
    # Simple low-pass filter
    filtered = np.convolve(noise, np.ones(500)/500, mode='same')
    sound = filtered * mod * 0.4
    # Fade
    fade_samples = int(SAMPLE_RATE * 0.2)
    sound[:fade_samples] *= np.linspace(0, 1, fade_samples)
    sound[-fade_samples:] *= np.linspace(1, 0, fade_samples)
    return sound


def generate_click(duration: float = 0.3) -> np.ndarray:
    """Generate a focus click sound."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    # Sharp attack, quick decay
    envelope = np.exp(-t * 30)
    sound = np.sin(2 * np.pi * 800 * t) * envelope * 0.7
    sound += np.sin(2 * np.pi * 1600 * t) * envelope * 0.3
    return sound


def generate_sparkle(duration: float = 1.5) -> np.ndarray:
    """Generate a sparkly magical sound."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    sound = np.zeros_like(t)

    # Multiple quick tones at different times
    for i, freq in enumerate([1500, 1800, 2200, 1600, 2000]):
        start = int(i * SAMPLE_RATE * 0.15)
        note_duration = 0.3
        note_samples = int(SAMPLE_RATE * note_duration)
        if start + note_samples <= len(t):
            note_t = np.linspace(0, note_duration, note_samples, False)
            note = np.sin(2 * np.pi * freq * note_t) * np.exp(-note_t * 5) * 0.4
            sound[start:start + note_samples] += note

    return sound


def generate_ding(frequency: float = 880, duration: float = 0.8) -> np.ndarray:
    """Generate a simple ding/bell sound."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    decay = np.exp(-t * 4)
    sound = np.sin(2 * np.pi * frequency * t) * decay * 0.6
    sound += np.sin(2 * np.pi * frequency * 2.5 * t) * decay * 0.25
    return sound


def generate_ambient(duration: float = 30.0, base_freq: float = 100) -> np.ndarray:
    """Generate ambient background sound."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)

    # Low drone
    drone = np.sin(2 * np.pi * base_freq * t) * 0.15
    drone += np.sin(2 * np.pi * base_freq * 1.5 * t) * 0.08

    # Subtle modulation
    mod = np.sin(2 * np.pi * 0.1 * t) * 0.3 + 0.7
    drone *= mod

    # Add filtered noise for texture
    noise = np.random.randn(len(t)) * 0.05
    filtered = np.convolve(noise, np.ones(1000)/1000, mode='same')

    sound = drone + filtered

    # Fade in/out for looping
    fade_samples = int(SAMPLE_RATE * 2)
    sound[:fade_samples] *= np.linspace(0, 1, fade_samples)
    sound[-fade_samples:] *= np.linspace(1, 0, fade_samples)

    return sound


def generate_rain(duration: float = 30.0) -> np.ndarray:
    """Generate rain-like ambient sound."""
    samples = int(SAMPLE_RATE * duration)
    # White noise filtered
    noise = np.random.randn(samples)
    # Multiple band-pass filters for rain character
    kernel_sizes = [100, 300, 500]
    sound = np.zeros(samples)
    for ks in kernel_sizes:
        filtered = np.convolve(noise, np.ones(ks)/ks, mode='same')
        sound += filtered * 0.2

    # Add occasional "droplet" sounds
    for _ in range(int(duration * 3)):
        pos = np.random.randint(0, samples - 1000)
        droplet_t = np.linspace(0, 0.02, 1000, False)
        droplet = np.sin(2 * np.pi * np.random.randint(1000, 2000) * droplet_t)
        droplet *= np.exp(-droplet_t * 200)
        sound[pos:pos+1000] += droplet * 0.3

    # Fade
    fade_samples = int(SAMPLE_RATE * 2)
    sound[:fade_samples] *= np.linspace(0, 1, fade_samples)
    sound[-fade_samples:] *= np.linspace(1, 0, fade_samples)

    return sound * 0.5


def generate_piano(duration: float = 30.0) -> np.ndarray:
    """Generate simple piano-like ambient."""
    samples = int(SAMPLE_RATE * duration)
    sound = np.zeros(samples)

    # Simple melody notes
    notes = [261.63, 293.66, 329.63, 349.23, 392.00, 349.23, 329.63, 293.66]  # C major scale
    note_duration = 2.0

    for i, freq in enumerate(notes * 4):  # Repeat
        start = int(i * SAMPLE_RATE * note_duration * 0.8)
        if start >= samples:
            break
        note_samples = int(SAMPLE_RATE * note_duration)
        if start + note_samples > samples:
            note_samples = samples - start

        t = np.linspace(0, note_duration, note_samples, False)
        # Piano-like envelope
        envelope = np.exp(-t * 1.5) * (1 - np.exp(-t * 30))
        note = np.sin(2 * np.pi * freq * t) * envelope * 0.3
        note += np.sin(2 * np.pi * freq * 2 * t) * envelope * 0.1
        sound[start:start + len(note)] += note

    # Fade
    fade_samples = int(SAMPLE_RATE * 2)
    sound[:fade_samples] *= np.linspace(0, 1, fade_samples)
    sound[-fade_samples:] *= np.linspace(1, 0, fade_samples)

    return sound


def generate_binaural(duration: float = 30.0) -> np.ndarray:
    """Generate binaural-like tones for focus."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)

    # Base carrier and slightly different frequency for binaural effect
    freq_left = 200
    freq_right = 210  # 10Hz difference creates alpha wave

    left = np.sin(2 * np.pi * freq_left * t) * 0.2
    right = np.sin(2 * np.pi * freq_right * t) * 0.2

    # Mix to mono for simplicity (real binaural needs stereo)
    sound = (left + right) / 2

    # Fade
    fade_samples = int(SAMPLE_RATE * 2)
    sound[:fade_samples] *= np.linspace(0, 1, fade_samples)
    sound[-fade_samples:] *= np.linspace(1, 0, fade_samples)

    return sound


def generate_ocean(duration: float = 30.0) -> np.ndarray:
    """Generate ocean wave sounds."""
    samples = int(SAMPLE_RATE * duration)
    t = np.linspace(0, duration, samples, False)

    # Multiple wave cycles
    wave_period = 8  # seconds per wave
    wave_mod = np.sin(2 * np.pi * t / wave_period) * 0.5 + 0.5

    # Filtered noise
    noise = np.random.randn(samples)
    kernel = np.ones(2000) / 2000
    filtered = np.convolve(noise, kernel, mode='same')

    sound = filtered * wave_mod * 0.5

    # Fade
    fade_samples = int(SAMPLE_RATE * 2)
    sound[:fade_samples] *= np.linspace(0, 1, fade_samples)
    sound[-fade_samples:] *= np.linspace(1, 0, fade_samples)

    return sound


def save_sound(sound: np.ndarray, filename: str) -> None:
    """Save sound as 16-bit WAV file."""
    # Convert to stereo
    stereo = np.column_stack([sound, sound])
    # Normalize and convert to int16
    stereo = stereo / np.max(np.abs(stereo)) * 0.9
    stereo_int = (stereo * 32767).astype(np.int16)

    filepath = SOUNDS_DIR / filename
    wavfile.write(str(filepath), SAMPLE_RATE, stereo_int)
    print(f"  Created: {filename}")


def main():
    """Generate all placeholder sound files."""
    print("Generating placeholder sounds for Empathic-01...")
    print(f"Output directory: {SOUNDS_DIR}")
    print()

    # Ensure directory exists
    SOUNDS_DIR.mkdir(parents=True, exist_ok=True)

    # SFX Files
    print("Generating SFX files...")
    save_sound(generate_chime(523.25), "compassionate_chime.wav")  # C5
    save_sound(generate_ping(1200), "excited_ping.wav")
    save_sound(generate_wave(2.0), "gentle_wave.wav")
    save_sound(generate_click(0.3), "focus_click.wav")
    save_sound(generate_sparkle(1.5), "love_sparkle.wav")
    save_sound(generate_chime(659.25), "discovery_chime.wav")  # E5
    save_sound(generate_ding(880), "approval_ding.wav")

    print()
    print("Generating Ambience files...")
    save_sound(generate_ambient(30.0, 100), "calm_ambient.wav")
    save_sound(generate_ambient(30.0, 150), "happy_lofi.wav")
    save_sound(generate_piano(30.0), "gentle_piano.wav")
    save_sound(generate_rain(30.0), "gentle_rain.wav")
    save_sound(generate_binaural(30.0), "focus_binaural.wav")
    save_sound(generate_ambient(30.0, 80), "warm_embrace.wav")
    save_sound(generate_ambient(30.0, 200), "celebration_loop.wav")
    save_sound(generate_ambient(30.0, 60), "soft_hum.wav")
    save_sound(generate_sparkle(30.0), "curious_sparkle.wav")
    save_sound(generate_ocean(30.0), "calming_waves.wav")
    save_sound(generate_ambient(30.0, 70), "safe_embrace.wav")
    save_sound(generate_ambient(30.0, 120), "fresh_breeze.wav")

    print()
    print("Done! All placeholder sounds have been generated.")
    print("Note: These are simple synthesized placeholders.")
    print("For better quality, replace with real audio files from:")
    print("  - https://freesound.org")
    print("  - https://pixabay.com/sound-effects/")
    print("  - https://www.zapsplat.com")


if __name__ == "__main__":
    main()
