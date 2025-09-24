
import React, { useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Download,
  Smartphone,
  X,
  CheckCircle2,
  Info,
  ExternalLink,
} from 'lucide-react';

export function InstallPrompt() {
  const { isInstallable, isInstalled, installApp, getInstallInstructions, canPromptInstall } = usePWAInstall();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const { toast } = useToast();

  const handleInstall = async () => {
    if (canPromptInstall) {
      const success = await installApp();
      if (success) {
        toast({
          title: 'App Installed!',
          description: 'BakerSoft has been added to your home screen.',
        });
        setIsDialogOpen(false);
      } else {
        toast({
          title: 'Installation Cancelled',
          description: 'You can install the app later from your browser menu.',
          variant: 'destructive',
        });
      }
    } else {
      setShowInstructions(true);
    }
  };

  if (isInstalled) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex items-center gap-3 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800">App Installed</p>
            <p className="text-sm text-green-600">BakerSoft is installed on your device</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isInstallable && !canPromptInstall) {
    return null;
  }

  const instructions = getInstallInstructions();

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Install App
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Install BakerSoft
          </DialogTitle>
          <DialogDescription>
            Install BakerSoft on your device for the best experience
          </DialogDescription>
        </DialogHeader>

        {!showInstructions ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <h4 className="font-medium">Quick Install</h4>
                    <p className="text-sm text-muted-foreground">
                      Add BakerSoft to your home screen for offline access
                    </p>
                  </div>
                  <Badge variant="secondary">PWA</Badge>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Offline Access</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Fast Loading</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Native Feel</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Push Notifications</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Install Instructions for {instructions.browser}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <ol className="space-y-2 text-sm">
                  {instructions.steps.map((step, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-col gap-2">
          {!showInstructions ? (
            <div className="flex gap-2 w-full">
              <Button onClick={handleInstall} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                {canPromptInstall ? 'Install Now' : 'Show Instructions'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowInstructions(true)}
                className="flex-1"
              >
                <Info className="h-4 w-4 mr-2" />
                Manual Steps
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => setShowInstructions(false)}
                className="flex-1"
              >
                Back
              </Button>
              <Button onClick={() => setIsDialogOpen(false)} className="flex-1">
                Close
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
