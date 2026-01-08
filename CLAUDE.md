# Empathy Layer - Real-time Emotion-Aware AI System

## Overview

Empathy Layer is a privacy-first, real-time emotion detection system that dynamically injects emotional context into LLM prompts. It runs entirely client-side using TensorFlow.js with WebGPU acceleration, ensuring video data never leaves the user's device.

## System Architecture

```
+-------------------+     +--------------------+     +------------------+
|                   |     |                    |     |                  |
|   Webcam Feed     +---->+  Emotion Detector  +---->+  Emotion Context |
|   (useWebcam)     |     |  (TensorFlow.js)   |     |  (Analysis)      |
|                   |     |                    |     |                  |
+-------------------+     +--------------------+     +--------+---------+
                                                              |
                                                              v
+-------------------+     +--------------------+     +------------------+
|                   |     |                    |     |                  |
|   Chat Interface  +<----+  Groq LLM API      +<----+  Prompt Injection|
|   (React)         |     |  (Streaming)       |     |  (System Prompt) |
|                   |     |                    |     |                  |
+-------------------+     +--------------------+     +------------------+
```

## Data Flow

1. **Video Capture**: Webcam feed captured via `useWebcam` hook
2. **Frame Processing**: Each frame is preprocessed (grayscale, resize to 48x48)
3. **Inference**: TensorFlow.js model predicts 7 emotion classes
4. **Smoothing**: Results are smoothed over a 5-frame history window
5. **Context Generation**: Emotional state is converted to prompt context
6. **LLM Injection**: Context is injected into the system prompt
7. **Response Generation**: Groq streams back empathetic responses

## Key Performance Considerations

### Latency Targets

| Stage | Target | Notes |
|-------|--------|-------|
| Frame capture | <10ms | Native browser API |
| Preprocessing | <20ms | tf.tidy() memory management |
| Model inference | <100ms | WebGPU/WebGL accelerated |
| Context generation | <5ms | Pure JavaScript |
| LLM first token | <200ms | Groq's speed advantage |
| **Total E2E** | **<300ms** | From emotion to response |

### Memory Management

All TensorFlow.js operations use proper memory management patterns:

```typescript
// Always wrap in tf.tidy() to prevent leaks
const result = tf.tidy(() => {
  const tensor = tf.browser.fromPixels(videoElement);
  const processed = preprocessTensor(tensor);
  return model.predict(processed);
});

// Extract data and dispose
const data = await result.data();
result.dispose();
```

### Inference Throttling

Emotion detection runs at a configurable interval (default: 150ms) to balance:
- Responsiveness (faster = more responsive)
- CPU/GPU usage (slower = less resource intensive)
- Battery life on mobile devices

## Model Specifications

### Emotion Classification Model

- **Architecture**: CNN with 3 convolutional blocks
- **Input**: 48x48 grayscale images
- **Output**: 7-class softmax (angry, disgusted, fearful, happy, sad, surprised, neutral)
- **Size**: ~2MB (can be loaded from `/public/models/emotion_model/model.json`)

### Loading a Pre-trained Model

To use a pre-trained FER (Facial Expression Recognition) model:

1. Convert your model to TensorFlow.js format:
```bash
tensorflowjs_converter --input_format keras \
  path/to/model.h5 \
  public/models/emotion_model/
```

2. Place files in `public/models/emotion_model/`:
   - `model.json` - Model architecture
   - `group1-shard1of1.bin` - Model weights

## Project Structure

```
empath-layer/
├── public/
│   └── models/               # Pre-trained model files
│       └── emotion_model/
├── src/
│   ├── components/
│   │   ├── ChatInterface.tsx # Main chat UI with Groq integration
│   │   ├── DebugPanel.tsx    # Performance monitoring panel
│   │   ├── EmpatheticChat.tsx # Main application component
│   │   ├── WebcamFeed.tsx    # Video display with overlay
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useEmotionDetector.ts # TensorFlow.js inference hook
│   │   ├── useWebcam.ts          # Webcam management hook
│   │   └── index.ts
│   ├── services/
│   │   ├── groqService.ts    # Groq API integration
│   │   └── index.ts
│   ├── types/
│   │   ├── emotion.ts        # Type definitions
│   │   └── index.ts
│   ├── utils/
│   │   ├── cn.ts             # Tailwind class merger
│   │   ├── emotionAnalysis.ts # Emotion processing utilities
│   │   └── index.ts
│   ├── App.tsx
│   └── index.css
├── .env.example              # Environment variables template
├── CLAUDE.md                 # This file
├── package.json
├── tailwind.config.js
├── tsconfig.app.json
└── vite.config.ts
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- A Groq API key (get one at https://console.groq.com/keys)
- A modern browser with WebGPU support (Chrome 113+, Edge 113+)

### Installation

1. Clone or copy the project files

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env and add your VITE_GROQ_API_KEY
```

4. Start development server:
```bash
npm run dev
```

5. Open http://localhost:5173 in your browser

### Building for Production

```bash
npm run build
npm run preview
```

## API Integration

### Groq Service

The Groq service (`src/services/groqService.ts`) handles LLM communication:

```typescript
import { streamChatCompletion, GROQ_MODELS } from '@/services/groqService';

// Stream a response with emotion context
const stream = streamChatCompletion(
  messages,
  emotionContext,
  { model: GROQ_MODELS.LLAMA3_1_8B }
);

for await (const chunk of stream) {
  // Handle streaming chunks
}
```

### Emotion Context Injection

Emotion context is automatically formatted and injected into the system prompt:

```typescript
[EMOTIONAL CONTEXT - REAL-TIME]
The user appears moderately happy. This appears to be a sustained state.
The user seems energized and positive.

Response Guidance: Match the positive energy. Feel free to use a warm,
enthusiastic tone. Celebrate their mood when appropriate.
---
```

## Debugging

### Debug Panel Features

- Real-time FPS counter
- Average and P95 inference latency
- Memory usage monitoring
- TensorFlow.js backend status (WebGPU/WebGL/CPU)
- Emotion confidence visualization
- Detection history

### Console Logging

Enable debug mode in the emotion detector:

```typescript
const detector = useEmotionDetector({
  debug: true, // Enables console logging
});
```

## Browser Support

| Browser | WebGPU | WebGL | Notes |
|---------|--------|-------|-------|
| Chrome 113+ | Yes | Yes | Best performance |
| Edge 113+ | Yes | Yes | Same as Chrome |
| Firefox | No | Yes | WebGL fallback |
| Safari 17+ | No | Yes | WebGL fallback |

## Future Enhancement Roadmap

### Phase 1: Core Improvements
- [ ] Add face detection for better emotion accuracy
- [ ] Implement multi-face tracking
- [ ] Add emotion trend visualization
- [ ] Optimize model for mobile devices

### Phase 2: Advanced Features
- [ ] Voice emotion detection (complementary to face)
- [ ] Sentiment analysis from chat text
- [ ] Emotion-adaptive UI themes
- [ ] Session emotion analytics

### Phase 3: Enterprise Features
- [ ] Custom emotion model training
- [ ] Privacy-enhanced federated learning
- [ ] API for third-party integrations
- [ ] Multi-language support

## Security Considerations

### Privacy

- **No data transmission**: Video data is processed entirely client-side
- **No storage**: Frames are not saved to disk or memory beyond inference
- **Derived signals only**: Only emotion labels (not video) are sent to LLM

### API Security

- **Environment variables**: API keys are stored in `.env` (not committed)
- **Browser exposure**: Note that VITE_* variables are exposed to client
- **Production**: Consider a backend proxy for API key protection

## Troubleshooting

### Common Issues

**WebGPU not available**
- Ensure you're using Chrome/Edge 113+
- Enable WebGPU flags if needed: `chrome://flags/#enable-webgpu`
- Falls back to WebGL automatically

**Camera permission denied**
- Check browser permissions
- Ensure HTTPS in production (required for camera access)
- Try incognito mode to reset permissions

**Groq API errors**
- Verify VITE_GROQ_API_KEY is set correctly
- Check for rate limiting
- Ensure model name is valid

**High latency**
- Reduce inference interval (increase time between detections)
- Use a smaller model
- Close other GPU-intensive applications

## License

MIT License - See LICENSE file for details.
