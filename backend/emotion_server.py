"""
Minimal DeepFace Emotion Server
Run: pip install deepface flask flask-cors opencv-python
Then: python emotion_server.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from deepface import DeepFace
import base64
import numpy as np
import cv2

app = Flask(__name__)
CORS(app)

# Map DeepFace emotions to our 4 target emotions
EMOTION_MAP = {
    'happy': 'happy',
    'sad': 'sad',
    'surprise': 'surprise',
    'neutral': 'neutral',
    'angry': 'sad',      # Map to negative
    'disgust': 'sad',    # Map to negative
    'fear': 'surprise',  # Map to high arousal
}

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        image_b64 = data.get('image', '')

        # Decode base64 image
        image_data = base64.b64decode(image_b64.split(',')[1] if ',' in image_b64 else image_b64)
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({'error': 'Invalid image'}), 400

        # Analyze with DeepFace (enforce_detection=False for speed)
        result = DeepFace.analyze(
            frame,
            actions=['emotion'],
            enforce_detection=False,
            detector_backend='opencv',  # Fastest detector
            silent=True
        )

        # Handle list result
        if isinstance(result, list):
            result = result[0]

        emotions = result.get('emotion', {})
        dominant = result.get('dominant_emotion', 'neutral')

        # Map to our 4 emotions
        mapped_scores = {'happy': 0, 'sad': 0, 'surprise': 0, 'neutral': 0}
        for emotion, score in emotions.items():
            mapped = EMOTION_MAP.get(emotion, 'neutral')
            mapped_scores[mapped] += score

        # Normalize
        total = sum(mapped_scores.values())
        if total > 0:
            mapped_scores = {k: v/total for k, v in mapped_scores.items()}

        mapped_dominant = EMOTION_MAP.get(dominant, 'neutral')

        return jsonify({
            'emotion': mapped_dominant,
            'confidence': mapped_scores[mapped_dominant],
            'scores': mapped_scores
        })

    except Exception as e:
        return jsonify({'error': str(e), 'emotion': 'neutral', 'confidence': 0.5, 'scores': {'neutral': 1}}), 200

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    print("Starting DeepFace Emotion Server on http://localhost:5001")
    print("Warming up model...")
    # Warm up with dummy image
    try:
        dummy = np.zeros((48, 48, 3), dtype=np.uint8)
        DeepFace.analyze(dummy, actions=['emotion'], enforce_detection=False, silent=True)
        print("Model ready!")
    except:
        pass
    app.run(host='0.0.0.0', port=5001, threaded=True)
