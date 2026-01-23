#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Vision Face Module for Empathic-01 System

Face emotion detection using DeepFace or similar models.
Detects: Happy, Sad, Surprise, Neutral, Angry, Fear, Disgust.
"""

from dataclasses import dataclass
from typing import Optional, List, Tuple, Dict, Any
import numpy as np
import cv2 as cv
from collections import deque
import time

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import EmotionLabel, VisionConfig, DEFAULT_CONFIG


@dataclass
class FaceDetectionResult:
    """Result of face detection."""
    bounding_box: Tuple[int, int, int, int]  # x, y, w, h
    confidence: float


@dataclass
class EmotionResult:
    """Result of emotion detection."""
    emotion: EmotionLabel
    confidence: float
    all_scores: Dict[str, float]
    face_box: Tuple[int, int, int, int]
    timestamp: float
    inference_time_ms: float


class FaceEmotionDetector:
    """
    Real-time face emotion detector.

    Uses OpenCV's DNN module with a pre-trained model for face detection,
    and can integrate with DeepFace for emotion classification.

    Detects emotions:
    - HAPPY: Joy, smile
    - SAD: Sadness, frown
    - SURPRISE: Shock, wide eyes
    - NEUTRAL: No strong emotion
    - ANGRY: Anger, frustration
    - FEAR: Fear, anxiety
    - DISGUST: Disgust
    """

    EMOTION_MAP = {
        "happy": EmotionLabel.HAPPY,
        "sad": EmotionLabel.SAD,
        "surprise": EmotionLabel.SURPRISE,
        "neutral": EmotionLabel.NEUTRAL,
        "angry": EmotionLabel.ANGRY,
        "fear": EmotionLabel.FEAR,
        "disgust": EmotionLabel.DISGUST,
    }

    def __init__(self, config: Optional[VisionConfig] = None, use_deepface: bool = True):
        """
        Initialize the face emotion detector.

        Args:
            config: Vision configuration
            use_deepface: Whether to use DeepFace (requires deepface package)
        """
        self.config = config or DEFAULT_CONFIG.vision
        self.use_deepface = use_deepface
        self._deepface_available = False

        # Initialize face detector (Haar Cascade as fallback)
        cascade_path = cv.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv.CascadeClassifier(cascade_path)

        # Try to load DeepFace
        if use_deepface:
            try:
                from deepface import DeepFace
                self.DeepFace = DeepFace
                self._deepface_available = True
                print("[FaceEmotionDetector] DeepFace loaded successfully")
            except ImportError:
                print("[FaceEmotionDetector] DeepFace not available, using simplified detection")
                self._deepface_available = False

        # Smoothing and stability
        self._last_face_box: Optional[Tuple[int, int, int, int]] = None
        self._emotion_history: deque = deque(maxlen=5)
        self._last_stable_emotion: EmotionLabel = EmotionLabel.NEUTRAL
        self._smoothed_scores: Optional[Dict[str, float]] = None
        self._smoothing_alpha = 0.3

        # Timing
        self._last_inference_time = 0.0
        self._no_face_count = 0
        self._no_face_threshold = 5

    def _detect_face_haar(self, gray: np.ndarray) -> Optional[FaceDetectionResult]:
        """Detect face using Haar Cascade."""
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(60, 60)
        )

        if len(faces) == 0:
            return None

        # Get largest face
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        return FaceDetectionResult(
            bounding_box=(x, y, w, h),
            confidence=0.8
        )

    def _smooth_face_box(
        self,
        new_box: Tuple[int, int, int, int]
    ) -> Tuple[int, int, int, int]:
        """Apply smoothing to face bounding box."""
        if self._last_face_box is None:
            self._last_face_box = new_box
            return new_box

        alpha = 0.3
        smoothed = tuple(
            int(alpha * new + (1 - alpha) * old)
            for new, old in zip(new_box, self._last_face_box)
        )
        self._last_face_box = smoothed
        return smoothed

    def _smooth_emotion_scores(self, scores: Dict[str, float]) -> Dict[str, float]:
        """Apply exponential moving average to emotion scores."""
        if self._smoothed_scores is None:
            self._smoothed_scores = scores
            return scores

        alpha = self._smoothing_alpha
        smoothed = {}
        for emotion, score in scores.items():
            prev_score = self._smoothed_scores.get(emotion, score)
            smoothed[emotion] = alpha * score + (1 - alpha) * prev_score

        self._smoothed_scores = smoothed
        return smoothed

    def _stabilize_emotion(self, emotion: EmotionLabel) -> EmotionLabel:
        """Apply stability filtering to prevent rapid emotion changes."""
        self._emotion_history.append(emotion)

        if len(self._emotion_history) < 3:
            return emotion

        from collections import Counter
        counts = Counter(self._emotion_history)
        most_common = counts.most_common(1)[0]

        if most_common[1] >= 3:
            self._last_stable_emotion = most_common[0]

        return self._last_stable_emotion

    def _analyze_with_deepface(
        self,
        image: np.ndarray,
        face_box: Tuple[int, int, int, int]
    ) -> Tuple[EmotionLabel, float, Dict[str, float]]:
        """Analyze emotion using DeepFace."""
        try:
            # Crop face region with padding
            x, y, w, h = face_box
            pad = int(max(w, h) * 0.2)
            x1 = max(0, x - pad)
            y1 = max(0, y - pad)
            x2 = min(image.shape[1], x + w + pad)
            y2 = min(image.shape[0], y + h + pad)
            face_img = image[y1:y2, x1:x2]

            # Analyze with DeepFace
            result = self.DeepFace.analyze(
                face_img,
                actions=['emotion'],
                enforce_detection=False,
                silent=True
            )

            if isinstance(result, list):
                result = result[0]

            emotion_scores = result.get('emotion', {})
            dominant = result.get('dominant_emotion', 'neutral')

            # Convert to our format
            normalized_scores = {
                k.lower(): v / 100.0 for k, v in emotion_scores.items()
            }

            emotion_label = self.EMOTION_MAP.get(dominant.lower(), EmotionLabel.NEUTRAL)
            confidence = normalized_scores.get(dominant.lower(), 0.5)

            return emotion_label, confidence, normalized_scores

        except Exception as e:
            print(f"[FaceEmotionDetector] DeepFace error: {e}")
            return EmotionLabel.NEUTRAL, 0.5, {"neutral": 0.5}

    def _simple_emotion_analysis(
        self,
        gray: np.ndarray,
        face_box: Tuple[int, int, int, int]
    ) -> Tuple[EmotionLabel, float, Dict[str, float]]:
        """
        Simple emotion analysis when DeepFace is not available.
        Uses basic image features (placeholder - always returns neutral).
        """
        # This is a simplified placeholder
        # In production, you'd want a lightweight model here
        return EmotionLabel.NEUTRAL, 0.6, {
            "happy": 0.1,
            "sad": 0.1,
            "surprise": 0.1,
            "neutral": 0.6,
            "angry": 0.05,
            "fear": 0.025,
            "disgust": 0.025,
        }

    def detect(self, image: np.ndarray) -> Optional[EmotionResult]:
        """
        Detect face and emotion in an image.

        Args:
            image: BGR image from OpenCV (numpy array)

        Returns:
            EmotionResult if face detected, None otherwise
        """
        start_time = time.time()

        # Convert to grayscale for face detection
        gray = cv.cvtColor(image, cv.COLOR_BGR2GRAY)

        # Detect face
        face_result = self._detect_face_haar(gray)

        if face_result is None:
            self._no_face_count += 1
            if self._no_face_count >= self._no_face_threshold:
                self._last_face_box = None
                self._no_face_count = 0
            return None

        self._no_face_count = 0

        # Smooth face box
        face_box = self._smooth_face_box(face_result.bounding_box)

        # Analyze emotion
        if self._deepface_available:
            emotion, confidence, scores = self._analyze_with_deepface(image, face_box)
        else:
            emotion, confidence, scores = self._simple_emotion_analysis(gray, face_box)

        # Smooth scores
        smoothed_scores = self._smooth_emotion_scores(scores)

        # Find dominant emotion from smoothed scores
        dominant = max(smoothed_scores, key=smoothed_scores.get)
        emotion = self.EMOTION_MAP.get(dominant, EmotionLabel.NEUTRAL)
        confidence = smoothed_scores[dominant]

        # Stabilize
        stable_emotion = self._stabilize_emotion(emotion)

        inference_time = (time.time() - start_time) * 1000

        return EmotionResult(
            emotion=stable_emotion,
            confidence=confidence,
            all_scores={k: float(v) for k, v in smoothed_scores.items()},
            face_box=face_box,
            timestamp=time.time(),
            inference_time_ms=inference_time,
        )

    def draw_result(
        self,
        image: np.ndarray,
        result: EmotionResult,
        draw_scores: bool = False
    ) -> np.ndarray:
        """
        Draw detection result on image.

        Args:
            image: BGR image to draw on
            result: Detection result
            draw_scores: Whether to draw all emotion scores

        Returns:
            Image with drawings
        """
        x, y, w, h = result.face_box

        # Draw face bounding box
        cv.rectangle(image, (x, y), (x + w, y + h), (142, 85, 114), 2)

        # Draw emotion label
        label = f"{result.emotion.value} ({result.confidence:.0%})"
        label_y = max(y - 10, 30)

        (text_w, text_h), _ = cv.getTextSize(label, cv.FONT_HERSHEY_SIMPLEX, 0.8, 2)
        cv.rectangle(image, (x, label_y - text_h - 5), (x + text_w + 10, label_y + 5), (142, 85, 114), -1)
        cv.putText(image, label, (x + 5, label_y), cv.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

        # Optionally draw all scores
        if draw_scores:
            bar_x = x + w + 10
            bar_y = y
            bar_width = 100
            bar_height = 15

            for emotion_name, score in result.all_scores.items():
                # Background bar
                cv.rectangle(image, (bar_x, bar_y), (bar_x + bar_width, bar_y + bar_height), (50, 50, 50), -1)
                # Score bar
                score_width = int(bar_width * score)
                cv.rectangle(image, (bar_x, bar_y), (bar_x + score_width, bar_y + bar_height), (142, 85, 114), -1)
                # Label
                cv.putText(image, f"{emotion_name[:3]}", (bar_x + bar_width + 5, bar_y + 12),
                          cv.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
                bar_y += bar_height + 5

        return image

    def reset(self) -> None:
        """Reset detector state."""
        self._last_face_box = None
        self._emotion_history.clear()
        self._last_stable_emotion = EmotionLabel.NEUTRAL
        self._smoothed_scores = None
        self._no_face_count = 0


# Convenience function
def detect_emotion(image: np.ndarray) -> Optional[EmotionResult]:
    """Quick emotion detection without managing detector instance."""
    detector = FaceEmotionDetector()
    return detector.detect(image)
