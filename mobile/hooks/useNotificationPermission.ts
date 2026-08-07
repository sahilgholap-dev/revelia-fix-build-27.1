import { useState, useEffect } from 'react';
import * as SecureStore from '@/lib/secureStorage';
import { areNotificationsEnabled, requestNotificationPermission } from '../lib/onesignal';

export function useNotificationPermission() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  
  useEffect(() => {
    checkPermissionStatus();
  }, []);
  
  const checkPermissionStatus = async () => {
    try {
      const hasAsked = await SecureStore.getItemAsync('notification_prompt_shown');
      const granted = await areNotificationsEnabled();
      
      setPermissionGranted(granted);
      
      // Show custom prompt if not asked yet and permission not granted
      if (!hasAsked && !granted) {
        // Wait a bit before showing (don't interrupt flow)
        setTimeout(() => setShowPrompt(true), 2000);
      }
    } catch (error) {
      console.error('Permission check error:', error);
    }
  };
  
  const handleAccept = async () => {
    setShowPrompt(false);
    await SecureStore.setItemAsync('notification_prompt_shown', 'true');
    
    // Request OS permission
    const granted = await requestNotificationPermission();
    setPermissionGranted(granted);
  };
  
  const handleDecline = async () => {
    setShowPrompt(false);
    await SecureStore.setItemAsync('notification_prompt_shown', 'true');
  };
  
  return {
    showPrompt,
    permissionGranted,
    handleAccept,
    handleDecline
  };
}
