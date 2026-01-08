#!/usr/bin/env python3
"""
Convert Keras .h5 model to TensorFlow.js format
"""
import tensorflow as tf
import tensorflowjs as tfjs
import sys
import os

def convert_model(h5_path, output_dir):
    print(f"Loading model from {h5_path}...")
    try:
        # Load the Keras model
        model = tf.keras.models.load_model(h5_path)
        print("Model loaded successfully!")

        # Print model summary
        print("\nModel Summary:")
        model.summary()

        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)

        # Convert to TensorFlow.js format
        print(f"\nConverting to TensorFlow.js format...")
        print(f"Output directory: {output_dir}")

        tfjs.converters.save_keras_model(model, output_dir)

        print("\n✓ Conversion successful!")
        print(f"Model saved to: {output_dir}")
        print("\nFiles created:")
        for file in os.listdir(output_dir):
            file_path = os.path.join(output_dir, file)
            size = os.path.getsize(file_path) / 1024  # KB
            print(f"  - {file} ({size:.2f} KB)")

        return True

    except Exception as e:
        print(f"\n✗ Error during conversion: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    h5_model_path = "/Users/mac/Downloads/emotion_model.h5"
    output_directory = "/Users/mac/Library/Mobile Documents/com~apple~CloudDocs/empath-layer/public/models/emotion_model/"

    print("=" * 60)
    print("TensorFlow.js Model Converter")
    print("=" * 60)

    success = convert_model(h5_model_path, output_directory)

    sys.exit(0 if success else 1)
