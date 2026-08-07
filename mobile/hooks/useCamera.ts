import { useState, useRef, useCallback } from 'react';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';

interface UseCameraOptions {
  facing?: CameraType;
}

interface UseCameraReturn {
  hasPermission: boolean | null;
  requestPermission: () => Promise<boolean>;
  cameraRef: React.RefObject<CameraView | null>;
  takePicture: () => Promise<string | null>;
  isReady: boolean;
  setIsReady: (ready: boolean) => void;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const { facing = 'front' } = options;
  const [permission, requestCameraPermission] = useCameraPermissions();
  const [isReady, setIsReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const isCapturing = useRef(false);

  const hasPermission = permission?.granted ?? null;

  const requestPermission = async () => {
    const result = await requestCameraPermission();
    return result.granted;
  };

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return null;
    if (isCapturing.current) return null;

    isCapturing.current = true;

    try {
      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Retry up to 2 times to handle cold-start camera failures
      let lastError: any = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.8,
            skipProcessing: false,
          });

          if (!photo?.uri) {
            lastError = new Error('No photo URI returned');
            await new Promise(r => setTimeout(r, 300));
            continue;
          }

          // Process image through ImageManipulator to normalize EXIF orientation
          try {
            const transforms = facing === 'front'
              ? [{ flip: ImageManipulator.FlipType.Horizontal }]
              : []; // empty transforms still normalizes EXIF rotation
            const processed = await ImageManipulator.manipulateAsync(
              photo.uri,
              transforms,
              { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );
            return processed.uri;
          } catch {
            // If manipulation fails, return original
            return photo.uri;
          }
        } catch (err) {
          console.warn(`takePicture attempt ${attempt + 1} failed:`, err);
          lastError = err;
          if (attempt < 1) {
            await new Promise(r => setTimeout(r, 300));
          }
        }
      }

      console.error('All takePicture attempts failed:', lastError);
      return null;
    } catch (error) {
      console.error('Take picture error:', error);
      return null;
    } finally {
      isCapturing.current = false;
    }
  }, [facing]);

  return {
    hasPermission,
    requestPermission,
    cameraRef,
    takePicture,
    isReady,
    setIsReady
  };
}
