#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Vision Hands Module for Empathic-01 System

Hand gesture detection using MediaPipe Hands with custom gesture classification.
Detects: Open Palm, Thumb Up, Heart Hand, Index Pointing, and more.
"""

from dataclasses import dataclass
from typing import Optional, List, Tuple, Dict, Any
import numpy as np
import cv2 as cv
import mediapipe as mp
from collections import deque
import math

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import GestureLabel, VisionConfig, DEFAULT_CONFIG


@dataclass
class HandLandmark:
    """A single hand landmark point."""
    x: float
    y: float
    z: float = 0.0


@dataclass
class HandGestureResult:
    """Result of hand gesture detection."""
    gesture: GestureLabel
    confidence: float
    landmarks: List[HandLandmark]
    bounding_box: Tuple[int, int, int, int]  # x, y, w, h
    handedness: str  # "Left" or "Right"
    finger_states: Dict[str, bool]  # Which fingers are extended
    is_detected: bool = True


class HandGestureDetector:
    """
    Real-time hand gesture detector using MediaPipe Hands.

    Detects these gestures:
    - OPEN_PALM: All fingers extended, palm facing camera (Listening/Stop)
    - THUMB_UP: Only thumb extended upward (Approval)
    - HEART_HAND: Thumb and index forming heart shape (Affection)
    - INDEX_POINTING: Only index finger extended (Focus)
    - CLOSED_FIST: All fingers curled (Neutral)
    - OK_SIGN: Thumb and index tips touching, others extended
    - PEACE_SIGN: Index and middle extended, others curled
    """

    # MediaPipe Hand Landmark Indices
    WRIST = 0
    THUMB_CMC, THUMB_MCP, THUMB_IP, THUMB_TIP = 1, 2, 3, 4
    INDEX_MCP, INDEX_PIP, INDEX_DIP, INDEX_TIP = 5, 6, 7, 8
    MIDDLE_MCP, MIDDLE_PIP, MIDDLE_DIP, MIDDLE_TIP = 9, 10, 11, 12
    RING_MCP, RING_PIP, RING_DIP, RING_TIP = 13, 14, 15, 16
    PINKY_MCP, PINKY_PIP, PINKY_DIP, PINKY_TIP = 17, 18, 19, 20

    def __init__(self, config: Optional[VisionConfig] = None):
        """Initialize the hand gesture detector."""
        self.config = config or DEFAULT_CONFIG.vision

        # Initialize MediaPipe Hands
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=self.config.static_image_mode,
            max_num_hands=self.config.max_num_hands,
            min_detection_confidence=self.config.min_detection_confidence,
            min_tracking_confidence=self.config.min_tracking_confidence,
        )
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles

        # Smoothing for landmarks
        self._last_landmarks: Optional[List[HandLandmark]] = None
        self._smoothing_alpha = self.config.landmark_smoothing_alpha

        # Gesture stability
        self._gesture_history: deque = deque(maxlen=5)
        self._last_stable_gesture: GestureLabel = GestureLabel.NONE

        # Point history for motion tracking
        self._point_history: deque = deque(maxlen=16)

    def _distance(self, p1: HandLandmark, p2: HandLandmark) -> float:
        """Calculate Euclidean distance between two landmarks."""
        return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2)

    def _distance_3d(self, p1: HandLandmark, p2: HandLandmark) -> float:
        """Calculate 3D Euclidean distance between two landmarks."""
        return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + (p1.z - p2.z)**2)

    def _angle(self, a: HandLandmark, b: HandLandmark, c: HandLandmark) -> float:
        """Calculate angle at point b formed by points a-b-c (in degrees)."""
        ab = np.array([a.x - b.x, a.y - b.y])
        cb = np.array([c.x - b.x, c.y - b.y])

        dot = np.dot(ab, cb)
        cross = ab[0] * cb[1] - ab[1] * cb[0]

        return abs(math.atan2(cross, dot) * (180 / math.pi))

    def _is_finger_extended(
        self,
        landmarks: List[HandLandmark],
        mcp: int,
        pip: int,
        dip: int,
        tip: int
    ) -> bool:
        """
        Check if a finger is extended using angle-based detection.
        A finger is extended if both joints are relatively straight.
        """
        pip_angle = self._angle(landmarks[mcp], landmarks[pip], landmarks[dip])
        dip_angle = self._angle(landmarks[pip], landmarks[dip], landmarks[tip])

        # Extended = both joints are straight (angle > 150 degrees)
        return pip_angle > 150 and dip_angle > 150

    def _is_finger_curled(
        self,
        landmarks: List[HandLandmark],
        mcp: int,
        pip: int,
        dip: int,
        tip: int
    ) -> bool:
        """Check if a finger is curled (bent inward)."""
        pip_angle = self._angle(landmarks[mcp], landmarks[pip], landmarks[dip])
        dip_angle = self._angle(landmarks[pip], landmarks[dip], landmarks[tip])

        # Curled = at least one joint is bent (angle < 130 degrees)
        return pip_angle < 130 or dip_angle < 130

    def _is_thumb_extended(self, landmarks: List[HandLandmark]) -> bool:
        """Check if thumb is extended using angle and position."""
        thumb_tip = landmarks[self.THUMB_TIP]
        thumb_ip = landmarks[self.THUMB_IP]
        thumb_mcp = landmarks[self.THUMB_MCP]
        index_mcp = landmarks[self.INDEX_MCP]

        # Check thumb angle
        thumb_angle = self._angle(
            landmarks[self.THUMB_CMC],
            thumb_mcp,
            thumb_ip
        )

        # Check if thumb tip is far from palm
        thumb_to_index = self._distance(thumb_tip, index_mcp)
        palm_width = self._distance(landmarks[self.INDEX_MCP], landmarks[self.PINKY_MCP])

        return thumb_angle > 120 and thumb_to_index > palm_width * 0.6

    def _is_thumb_up_gesture(self, landmarks: List[HandLandmark]) -> bool:
        """
        Detect thumb up gesture.
        Thumb extended upward, all other fingers curled.
        """
        # Check thumb is extended and pointing up
        thumb_tip = landmarks[self.THUMB_TIP]
        thumb_mcp = landmarks[self.THUMB_MCP]
        wrist = landmarks[self.WRIST]

        # Thumb should be above the MCP (pointing up)
        thumb_pointing_up = thumb_tip.y < thumb_mcp.y - 0.05

        # All other fingers should be curled
        index_curled = self._is_finger_curled(landmarks, self.INDEX_MCP, self.INDEX_PIP, self.INDEX_DIP, self.INDEX_TIP)
        middle_curled = self._is_finger_curled(landmarks, self.MIDDLE_MCP, self.MIDDLE_PIP, self.MIDDLE_DIP, self.MIDDLE_TIP)
        ring_curled = self._is_finger_curled(landmarks, self.RING_MCP, self.RING_PIP, self.RING_DIP, self.RING_TIP)
        pinky_curled = self._is_finger_curled(landmarks, self.PINKY_MCP, self.PINKY_PIP, self.PINKY_DIP, self.PINKY_TIP)

        return thumb_pointing_up and index_curled and middle_curled and ring_curled and pinky_curled

    def _is_heart_hand_gesture(self, landmarks: List[HandLandmark]) -> bool:
        """
        Detect heart hand gesture.
        Thumb and index fingers form a heart shape (tips close together, curved).
        This is the single-hand heart where thumb and index curve toward each other.
        """
        thumb_tip = landmarks[self.THUMB_TIP]
        index_tip = landmarks[self.INDEX_TIP]
        thumb_mcp = landmarks[self.THUMB_MCP]
        index_mcp = landmarks[self.INDEX_MCP]

        # Thumb and index tips should be close
        tip_distance = self._distance(thumb_tip, index_tip)
        palm_size = self._distance(landmarks[self.WRIST], landmarks[self.MIDDLE_MCP])

        tips_close = tip_distance < palm_size * 0.3

        # Both thumb and index should be curved (not fully extended)
        thumb_ip = landmarks[self.THUMB_IP]
        index_pip = landmarks[self.INDEX_PIP]
        index_dip = landmarks[self.INDEX_DIP]

        index_angle = self._angle(index_mcp, index_pip, index_dip)
        index_curved = 90 < index_angle < 160

        # Other fingers should be curled or semi-curled
        middle_not_extended = not self._is_finger_extended(landmarks, self.MIDDLE_MCP, self.MIDDLE_PIP, self.MIDDLE_DIP, self.MIDDLE_TIP)
        ring_not_extended = not self._is_finger_extended(landmarks, self.RING_MCP, self.RING_PIP, self.RING_DIP, self.RING_TIP)
        pinky_not_extended = not self._is_finger_extended(landmarks, self.PINKY_MCP, self.PINKY_PIP, self.PINKY_DIP, self.PINKY_TIP)

        return tips_close and index_curved and (middle_not_extended or ring_not_extended)

    def _get_finger_states(self, landmarks: List[HandLandmark]) -> Dict[str, bool]:
        """Get the extension state of each finger."""
        return {
            "thumb": self._is_thumb_extended(landmarks),
            "index": self._is_finger_extended(landmarks, self.INDEX_MCP, self.INDEX_PIP, self.INDEX_DIP, self.INDEX_TIP),
            "middle": self._is_finger_extended(landmarks, self.MIDDLE_MCP, self.MIDDLE_PIP, self.MIDDLE_DIP, self.MIDDLE_TIP),
            "ring": self._is_finger_extended(landmarks, self.RING_MCP, self.RING_PIP, self.RING_DIP, self.RING_TIP),
            "pinky": self._is_finger_extended(landmarks, self.PINKY_MCP, self.PINKY_PIP, self.PINKY_DIP, self.PINKY_TIP),
        }

    def _classify_gesture(self, landmarks: List[HandLandmark]) -> Tuple[GestureLabel, float]:
        """
        Classify hand gesture from landmarks.

        Returns:
            Tuple of (gesture label, confidence score)
        """
        if len(landmarks) != 21:
            return GestureLabel.NONE, 0.0

        finger_states = self._get_finger_states(landmarks)
        extended_count = sum(finger_states.values())

        # Check specific gestures first (higher priority)

        # 1. Thumb Up - thumb extended up, others curled
        if self._is_thumb_up_gesture(landmarks):
            return GestureLabel.THUMB_UP, 0.92

        # 2. Heart Hand - thumb and index forming heart
        if self._is_heart_hand_gesture(landmarks):
            return GestureLabel.HEART_HAND, 0.88

        # 3. OK Sign - thumb and index tips touching, others extended
        thumb_tip = landmarks[self.THUMB_TIP]
        index_tip = landmarks[self.INDEX_TIP]
        thumb_index_dist = self._distance(thumb_tip, index_tip)
        palm_size = self._distance(landmarks[self.WRIST], landmarks[self.MIDDLE_MCP])

        if (thumb_index_dist < palm_size * 0.2 and
            finger_states["middle"] and
            finger_states["ring"] and
            finger_states["pinky"]):
            return GestureLabel.OK_SIGN, 0.90

        # 4. Index Pointing - only index extended
        if (finger_states["index"] and
            not finger_states["middle"] and
            not finger_states["ring"] and
            not finger_states["pinky"]):
            return GestureLabel.INDEX_POINTING, 0.88

        # 5. Peace Sign - index and middle extended, others curled
        if (finger_states["index"] and
            finger_states["middle"] and
            not finger_states["ring"] and
            not finger_states["pinky"]):
            return GestureLabel.PEACE_SIGN, 0.85

        # 6. Open Palm - most fingers extended (4-5)
        if extended_count >= 4:
            return GestureLabel.OPEN_PALM, 0.80 + (extended_count - 4) * 0.05

        # 7. Closed Fist - most fingers curled
        if extended_count <= 1:
            return GestureLabel.CLOSED_FIST, 0.82

        # Default - partial gesture
        if extended_count >= 3:
            return GestureLabel.OPEN_PALM, 0.60
        else:
            return GestureLabel.CLOSED_FIST, 0.55

    def _smooth_landmarks(
        self,
        current: List[HandLandmark]
    ) -> List[HandLandmark]:
        """Apply exponential moving average smoothing to landmarks."""
        if self._last_landmarks is None or len(self._last_landmarks) != len(current):
            self._last_landmarks = current
            return current

        alpha = self._smoothing_alpha
        smoothed = []
        for curr, prev in zip(current, self._last_landmarks):
            smoothed.append(HandLandmark(
                x=alpha * curr.x + (1 - alpha) * prev.x,
                y=alpha * curr.y + (1 - alpha) * prev.y,
                z=alpha * curr.z + (1 - alpha) * prev.z,
            ))

        self._last_landmarks = smoothed
        return smoothed

    def _stabilize_gesture(self, gesture: GestureLabel) -> GestureLabel:
        """Apply stability filtering to gesture detection."""
        self._gesture_history.append(gesture)

        # Count occurrences of each gesture in history
        if len(self._gesture_history) < 3:
            return gesture

        from collections import Counter
        gesture_counts = Counter(self._gesture_history)
        most_common = gesture_counts.most_common(1)[0]

        # Require majority for stability
        if most_common[1] >= len(self._gesture_history) // 2 + 1:
            self._last_stable_gesture = most_common[0]

        return self._last_stable_gesture

    def _calc_bounding_box(
        self,
        landmarks: List[HandLandmark],
        image_width: int,
        image_height: int
    ) -> Tuple[int, int, int, int]:
        """Calculate bounding box around hand landmarks."""
        x_coords = [int(lm.x * image_width) for lm in landmarks]
        y_coords = [int(lm.y * image_height) for lm in landmarks]

        x_min, x_max = min(x_coords), max(x_coords)
        y_min, y_max = min(y_coords), max(y_coords)

        # Add padding
        padding = 20
        x_min = max(0, x_min - padding)
        y_min = max(0, y_min - padding)
        x_max = min(image_width, x_max + padding)
        y_max = min(image_height, y_max + padding)

        return (x_min, y_min, x_max - x_min, y_max - y_min)

    def detect(self, image: np.ndarray) -> Optional[HandGestureResult]:
        """
        Detect hand gesture in an image.

        Args:
            image: BGR image from OpenCV (numpy array)

        Returns:
            HandGestureResult if hand detected, None otherwise
        """
        # Convert BGR to RGB for MediaPipe
        image_rgb = cv.cvtColor(image, cv.COLOR_BGR2RGB)
        image_rgb.flags.writeable = False

        # Process with MediaPipe
        results = self.hands.process(image_rgb)

        if not results.multi_hand_landmarks:
            # No hand detected
            self._point_history.append((0, 0))
            return None

        # Get first hand (TODO: support multiple hands)
        hand_landmarks = results.multi_hand_landmarks[0]
        handedness = results.multi_handedness[0].classification[0].label

        # Convert to our landmark format
        h, w = image.shape[:2]
        landmarks = [
            HandLandmark(x=lm.x, y=lm.y, z=lm.z)
            for lm in hand_landmarks.landmark
        ]

        # Smooth landmarks
        landmarks = self._smooth_landmarks(landmarks)

        # Classify gesture
        gesture, confidence = self._classify_gesture(landmarks)

        # Apply stability
        stable_gesture = self._stabilize_gesture(gesture)

        # Calculate bounding box
        bbox = self._calc_bounding_box(landmarks, w, h)

        # Get finger states
        finger_states = self._get_finger_states(landmarks)

        # Track index finger tip for motion detection
        if stable_gesture == GestureLabel.INDEX_POINTING:
            index_tip = landmarks[self.INDEX_TIP]
            self._point_history.append((int(index_tip.x * w), int(index_tip.y * h)))
        else:
            self._point_history.append((0, 0))

        return HandGestureResult(
            gesture=stable_gesture,
            confidence=confidence,
            landmarks=landmarks,
            bounding_box=bbox,
            handedness=handedness,
            finger_states=finger_states,
        )

    def draw_landmarks(
        self,
        image: np.ndarray,
        result: HandGestureResult,
        draw_gesture_label: bool = True
    ) -> np.ndarray:
        """
        Draw hand landmarks and gesture label on image.

        Args:
            image: BGR image to draw on
            result: Detection result
            draw_gesture_label: Whether to draw gesture label

        Returns:
            Image with drawings
        """
        if not result.is_detected:
            return image

        h, w = image.shape[:2]
        landmarks = result.landmarks

        # Draw connections (simplified)
        connections = [
            # Thumb
            (0, 1), (1, 2), (2, 3), (3, 4),
            # Index
            (0, 5), (5, 6), (6, 7), (7, 8),
            # Middle
            (0, 9), (9, 10), (10, 11), (11, 12),
            # Ring
            (0, 13), (13, 14), (14, 15), (15, 16),
            # Pinky
            (0, 17), (17, 18), (18, 19), (19, 20),
            # Palm
            (5, 9), (9, 13), (13, 17),
        ]

        for start, end in connections:
            pt1 = (int(landmarks[start].x * w), int(landmarks[start].y * h))
            pt2 = (int(landmarks[end].x * w), int(landmarks[end].y * h))
            cv.line(image, pt1, pt2, (255, 255, 255), 2)
            cv.line(image, pt1, pt2, (142, 85, 114), 1)  # Purple overlay

        # Draw landmark points
        for i, lm in enumerate(landmarks):
            cx, cy = int(lm.x * w), int(lm.y * h)
            # Fingertips larger
            size = 8 if i in [4, 8, 12, 16, 20] else 5
            cv.circle(image, (cx, cy), size, (255, 255, 255), -1)
            cv.circle(image, (cx, cy), size, (142, 85, 114), 2)

        # Draw bounding box
        x, y, bw, bh = result.bounding_box
        cv.rectangle(image, (x, y), (x + bw, y + bh), (142, 85, 114), 2)

        # Draw gesture label
        if draw_gesture_label:
            label = f"{result.gesture.value} ({result.confidence:.0%})"
            label_bg_y = max(y - 30, 30)

            # Background for text
            (text_w, text_h), _ = cv.getTextSize(label, cv.FONT_HERSHEY_SIMPLEX, 0.7, 2)
            cv.rectangle(image, (x, label_bg_y - text_h - 5), (x + text_w + 10, label_bg_y + 5), (142, 85, 114), -1)
            cv.putText(image, label, (x + 5, label_bg_y), cv.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        # Draw point history (motion trail)
        for i, point in enumerate(self._point_history):
            if point[0] != 0 or point[1] != 0:
                thickness = 1 + i // 4
                cv.circle(image, point, thickness, (152, 251, 152), -1)

        return image

    def close(self) -> None:
        """Release resources."""
        self.hands.close()


# Convenience function for quick detection
def detect_gesture(image: np.ndarray) -> Optional[HandGestureResult]:
    """Quick gesture detection without managing detector instance."""
    detector = HandGestureDetector()
    result = detector.detect(image)
    detector.close()
    return result
