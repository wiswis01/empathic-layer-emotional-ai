/**
 * Empathy Layer - Main Application
 *
 * A real-time emotion-aware AI chat system that:
 * - Detects emotions from webcam feed using TensorFlow.js
 * - Dynamically injects emotional context into LLM prompts
 * - Uses Groq for ultra-fast LLM responses
 * - Processes everything client-side for privacy
 */

import { EmpatheticChat } from '@/components';
import './index.css';

function App() {
  return <EmpatheticChat />;
}

export default App;
