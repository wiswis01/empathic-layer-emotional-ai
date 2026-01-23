import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Enable HTTPS for webcam access in development
    // Uncomment below for HTTPS (requires cert setup)
    // https: true,
    headers: {
      // Required for SharedArrayBuffer (used by some TensorFlow.js backends)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    // Pre-bundle TensorFlow.js to avoid slow cold starts
    include: ['@tensorflow/tfjs', '@tensorflow/tfjs-backend-webgpu'],
    // Exclude tfjs-tflite from optimization to avoid module resolution issues
    exclude: ['@tensorflow/tfjs-tflite'],
  },
  build: {
    // Increase chunk size warning limit for ML models
    chunkSizeWarningLimit: 2000,
    commonjsOptions: {
      // Allow importing from CommonJS modules
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate TensorFlow.js into its own chunk
          tensorflow: ['@tensorflow/tfjs', '@tensorflow/tfjs-backend-webgpu'],
        },
      },
    },
  },
})
