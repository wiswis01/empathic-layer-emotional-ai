/**
 * Empathy Layer - Main Application
 *
 * A real-time emotion-aware AI chat system that:
 * - Detects emotions from webcam feed using TensorFlow.js
 * - Dynamically injects emotional context into LLM prompts
 * - Uses Groq for ultra-fast LLM responses
 * - Processes everything client-side for privacy
 */

import { useState, useCallback } from 'react';


import { EmpatheticChat } from '@/components';
import LandingPage from '@/components/LandingPage';
import './index.css';

function App() {
  const [showChat, setShowChat] = useState(false);

  // Memoize callback to prevent LandingPage re-renders
  const handleEnter = useCallback(() => {
    setShowChat(true);
  }, []);

  if (showChat) {
    return <EmpatheticChat />;
  }

  return <LandingPage onEnter={handleEnter} />;
}

export default App;
