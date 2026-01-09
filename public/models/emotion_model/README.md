# Emotion Detection Model

This directory is for pre-trained emotion detection models in TensorFlow.js format.

## Expected Files

- `model.json` - Model architecture and configuration
- `group1-shard1of1.bin` - Model weights (or multiple shards)

## Converting a Keras Model

If you have a Keras (.h5) or SavedModel format:

```bash
pip install tensorflowjs
tensorflowjs_converter --input_format keras \
  path/to/model.h5 \
  public/models/emotion_model/
```

## Recommended Models

For best results, use a model trained on emotion detection datasets.

The model should:
- Accept 48x48 grayscale images as input
- Output 4-class softmax predictions (happy, sad, surprise, neutral)
- Be optimized for inference speed

## Default Behavior

If no model files are present, the application will create a simple CNN model
at runtime. This model is not pre-trained and will produce random predictions.
For production use, please add a trained model.

## Model Specifications

Required input shape: `[batch_size, 48, 48, 1]` (grayscale)
Required output shape: `[batch_size, 4]` (softmax probabilities)

Output class order (IMPORTANT - must match this exact order):
0. happy
1. neutral
2. sad
3. surprise
