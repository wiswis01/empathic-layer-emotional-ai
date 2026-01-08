/**
 * useWebcam Hook
 *
 * A React hook for managing webcam access with proper cleanup.
 * Handles permissions, stream management, and device changes.
 */

import { useRef, useState, useCallback, useEffect } from 'react';

export interface WebcamConfig {
  /** Preferred width (default: 640) */
  width?: number;
  /** Preferred height (default: 480) */
  height?: number;
  /** Preferred frame rate (default: 30) */
  frameRate?: number;
  /** Preferred facing mode for mobile (default: 'user') */
  facingMode?: 'user' | 'environment';
  /** Whether to mirror the video (default: true for user-facing) */
  mirrored?: boolean;
}

export interface UseWebcamReturn {
  /** Reference to attach to video element */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Whether the webcam is active */
  isActive: boolean;
  /** Whether we're waiting for user permission */
  isLoading: boolean;
  /** Whether permission was denied */
  isPermissionDenied: boolean;
  /** Error message if any */
  error: string | null;
  /** Start the webcam */
  start: () => Promise<void>;
  /** Stop the webcam */
  stop: () => void;
  /** Current stream dimensions */
  dimensions: { width: number; height: number } | null;
}

const DEFAULT_CONFIG: Required<WebcamConfig> = {
  width: 640,
  height: 480,
  frameRate: 30,
  facingMode: 'user',
  mirrored: true,
};

/**
 * Custom hook for webcam access and management
 */
export function useWebcam(config: WebcamConfig = {}): UseWebcamReturn {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  /**
   * Start the webcam stream
   */
  const start = useCallback(async () => {
    if (streamRef.current) {
      console.log('[Webcam] Stream already active');
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsPermissionDenied(false);

    try {
      // Request camera access
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: fullConfig.width },
          height: { ideal: fullConfig.height },
          frameRate: { ideal: fullConfig.frameRate },
          facingMode: fullConfig.facingMode,
        },
        audio: false,
      };

      console.log('[Webcam] Requesting access with constraints:', constraints);

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Get actual dimensions
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      setDimensions({
        width: settings.width || fullConfig.width,
        height: settings.height || fullConfig.height,
      });

      // Attach to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not found'));
            return;
          }

          const video = videoRef.current;

          const handleLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
            video.play().then(resolve).catch(reject);
          };

          const handleError = (_e: Event) => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
            reject(new Error('Video failed to load'));
          };

          video.addEventListener('loadedmetadata', handleLoadedMetadata);
          video.addEventListener('error', handleError);
        });
      }

      setIsActive(true);
      setIsLoading(false);
      console.log('[Webcam] Stream started successfully');
    } catch (e) {
      console.error('[Webcam] Error accessing camera:', e);
      setIsLoading(false);

      if (e instanceof Error) {
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
          setIsPermissionDenied(true);
          setError('Camera access was denied. Please allow camera access and try again.');
        } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
          setError('No camera found. Please connect a camera and try again.');
        } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
          setError('Camera is in use by another application. Please close other apps using the camera.');
        } else if (e.name === 'OverconstrainedError') {
          setError('Camera does not support the requested settings. Try different resolution.');
        } else {
          setError(`Camera error: ${e.message}`);
        }
      } else {
        setError('Unknown camera error occurred');
      }
    }
  }, [fullConfig.width, fullConfig.height, fullConfig.frameRate, fullConfig.facingMode]);

  /**
   * Stop the webcam stream
   */
  const stop = useCallback(() => {
    if (streamRef.current) {
      // Stop all tracks
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;

      // Clear video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setIsActive(false);
      setDimensions(null);
      console.log('[Webcam] Stream stopped');
    }
  }, []);

  /**
   * Handle device changes (e.g., camera disconnected)
   */
  useEffect(() => {
    const handleDeviceChange = async () => {
      if (!isActive) return;

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');

        if (videoDevices.length === 0) {
          stop();
          setError('Camera disconnected');
        }
      } catch (e) {
        console.error('[Webcam] Error checking devices:', e);
      }
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [isActive, stop]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  return {
    videoRef,
    isActive,
    isLoading,
    isPermissionDenied,
    error,
    start,
    stop,
    dimensions,
  };
}

export default useWebcam;
