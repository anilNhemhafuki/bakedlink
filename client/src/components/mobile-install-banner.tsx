
import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Download, Smartphone } from 'lucide-react';

export function MobileInstallBanner() {
  const { isInstallable, isInstalled, installApp, canPromptInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if user is on mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
      return mobileKeywords.some(keyword => userAgent.includes(keyword));
    };

    setIsMobile(checkMobile());

    // Check if banner was previously dismissed
    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (dismissed) {
      const dismissTime = parseInt(dismissed);
      const daysPassed = (Date.now() - dismissTime) / (1000 * 60 * 60 * 24);
      // Show banner again after 7 days
      if (daysPassed < 7) {
        setIsDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  const handleInstall = async () => {
    if (canPromptInstall) {
      const success = await installApp();
      if (success) {
        setIsDismissed(true);
      }
    }
  };

  // Don't show if not mobile, already installed, or dismissed
  if (!isMobile || isInstalled || isDismissed || !isInstallable) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <div className="flex items-center gap-3 p-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Install BakerSoft</h3>
          <p className="text-xs text-muted-foreground">
            Get the full app experience with offline access
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canPromptInstall && (
            <Button size="sm" onClick={handleInstall} className="text-xs px-3">
              <Download className="h-3 w-3 mr-1" />
              Install
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-muted-foreground p-1 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
