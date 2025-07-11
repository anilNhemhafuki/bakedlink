import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, BellOff, TestTube } from 'lucide-react';

export default function NotificationSettings() {
  const { toast } = useToast();
  const {
    isSupported: notificationsSupported,
    permission,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe,
    rules,
    updateRule,
    sendTestNotification,
  } = useNotifications();

  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePermissionRequest = async () => {
    setIsLoading(true);
    const granted = await requestPermission();
    if (granted) {
      toast({
        title: "Permission Granted",
        description: "You can now receive push notifications.",
      });
    } else {
      toast({
        title: "Permission Denied",
        description: "Please enable notifications in your browser settings.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleTestNotification = async () => {
    setIsTestingNotification(true);
    try {
      await sendTestNotification();
      toast({
        title: "Test Notification Sent",
        description: "Check your notifications to see if it was received.",
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Failed to send test notification. Please try again.",
        variant: "destructive",
      });
    }
    setIsTestingNotification(false);
  };

  const handleRuleUpdate = async (ruleId: string, enabled: boolean) => {
    try {
      await updateRule(ruleId, { enabled });
      toast({
        title: "Rule Updated",
        description: "Notification rule has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update notification rule. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!notificationsSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser does not support push notifications.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Configure how you want to receive notifications from the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Notification Permission</Label>
              <p className="text-sm text-muted-foreground">
                Status: {permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Denied' : 'Not requested'}
              </p>
            </div>
            {permission !== 'granted' && (
              <Button
                onClick={handlePermissionRequest}
                disabled={isLoading}
                variant="outline"
              >
                {isLoading ? 'Requesting...' : 'Enable Notifications'}
              </Button>
            )}
          </div>

          {permission === 'granted' && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Subscription Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {subscription ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <Button
                  onClick={subscription ? unsubscribe : subscribe}
                  variant="outline"
                >
                  {subscription ? 'Unsubscribe' : 'Subscribe'}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Test Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send a test notification to verify everything is working
                  </p>
                </div>
                <Button
                  onClick={handleTestNotification}
                  disabled={isTestingNotification || !subscription}
                  variant="outline"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {isTestingNotification ? 'Sending...' : 'Send Test'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {permission === 'granted' && subscription && rules && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Rules</CardTitle>
            <CardDescription>
              Configure which types of notifications you want to receive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{rule.name}</Label>
                  <p className="text-sm text-muted-foreground">
                    {rule.description}
                  </p>
                </div>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(enabled) => handleRuleUpdate(rule.id, enabled)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}