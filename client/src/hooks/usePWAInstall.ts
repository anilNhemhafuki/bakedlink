
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = (window.navigator as any).standalone;
    
    setIsInstalled(isStandalone || (isIOS && isInStandaloneMode));

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error installing app:', error);
      return false;
    }
  };

  const getInstallInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      return {
        browser: 'Chrome',
        steps: [
          'Tap the menu button (three dots) in the top right',
          'Select "Add to Home screen" or "Install app"',
          'Follow the prompts to install'
        ]
      };
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      return {
        browser: 'Safari',
        steps: [
          'Tap the share button at the bottom of the screen',
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" to install the app'
        ]
      };
    } else if (userAgent.includes('firefox')) {
      return {
        browser: 'Firefox',
        steps: [
          'Tap the menu button (three lines)',
          'Select "Install" or "Add to Home screen"',
          'Follow the prompts to install'
        ]
      };
    } else if (userAgent.includes('edg')) {
      return {
        browser: 'Edge',
        steps: [
          'Tap the menu button (three dots)',
          'Select "Add to phone" or "Install app"',
          'Follow the prompts to install'
        ]
      };
    }
    
    return {
      browser: 'Your browser',
      steps: [
        'Look for an "Install" or "Add to Home Screen" option in your browser menu',
        'Follow the prompts to install the app'
      ]
    };
  };

  return {
    isInstallable,
    isInstalled,
    installApp,
    getInstallInstructions,
    canPromptInstall: !!deferredPrompt
  };
}
