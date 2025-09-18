import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  BellRing,
  Package,
  ShoppingCart,
  Factory,
  Truck,
  AlertTriangle,
  CheckCheck,
  Clock,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: "order" | "production" | "inventory" | "shipping" | "system";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  priority: "low" | "medium" | "high" | "critical";
  actionUrl?: string;
  data?: any;
}

const notificationConfig = {
  order: {
    icon: ShoppingCart,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    label: "Orders",
    emoji: "🛒",
  },
  production: {
    icon: Factory,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    label: "Production",
    emoji: "🏭",
  },
  inventory: {
    icon: Package,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    label: "Inventory",
    emoji: "📦",
  },
  shipping: {
    icon: Truck,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    label: "Shipping",
    emoji: "🚚",
  },
  system: {
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    label: "System",
    emoji: "⚙️",
  },
};

const priorityConfig = {
  critical: {
    color: "bg-red-500",
    textColor: "text-red-700",
    label: "Critical",
  },
  high: {
    color: "bg-orange-500",
    textColor: "text-orange-700",
    label: "High",
  },
  medium: {
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    label: "Medium",
  },
  low: {
    color: "bg-green-500",
    textColor: "text-green-700",
    label: "Low",
  },
};

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notifications with auto-refresh
  const {
    data: notifications = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/notifications"],
    refetchInterval: 10000, // Refresh every 10 seconds
    refetchIntervalInBackground: true,
    retry: 3,
    retryDelay: 1000,
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(
        `/api/notifications/${notificationId}/read`,
        {
          method: "PUT",
          credentials: "include",
        },
      );
      if (!response.ok) throw new Error("Failed to mark as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "PUT",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to mark all as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    },
  });

  // Send test notification
  const sendTestNotificationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to send test notification");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Test Notification Sent",
        description: "Check your notifications to see the test message",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send test notification",
        variant: "destructive",
      });
    },
  });

  // Calculate unread count
  const notificationData = (notifications as Notification[]) || [];
  const unreadCount = notificationData.filter(
    (n: Notification) => !n.read,
  ).length;

  // Sort notifications by priority and timestamp
  const sortedNotifications = [...notificationData].sort(
    (a: Notification, b: Notification) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };

      // First sort by priority
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by read status (unread first)
      const readDiff = Number(a.read) - Number(b.read);
      if (readDiff !== 0) return readDiff;

      // Finally by timestamp (newest first)
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    },
  );

  // Group notifications by type
  const groupedNotifications = sortedNotifications.reduce(
    (groups: any, notification: Notification) => {
      const type = notification.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(notification);
      return groups;
    },
    {},
  );

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to action URL if provided
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }

    setIsOpen(false);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleSendTestNotification = () => {
    sendTestNotificationMutation.mutate();
  };

  const getNotificationIcon = (type: string) => {
    const config = notificationConfig[type as keyof typeof notificationConfig];
    const IconComponent = config?.icon || Bell;
    return <IconComponent className={`h-4 w-4 ${config?.color}`} />;
  };

  // Critical notifications count for extra highlighting
  const criticalCount = notificationData.filter(
    (n: Notification) => !n.read && n.priority === "critical",
  ).length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2">
          {criticalCount > 0 ? (
            <BellRing className="h-5 w-5 text-red-600 animate-pulse" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className={`absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center ${
                criticalCount > 0 ? "bg-red-600 animate-pulse" : ""
              }`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-96 max-h-[80vh]"
        sideOffset={5}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSendTestNotification}
              disabled={sendTestNotificationMutation.isPending}
              className="text-xs"
            >
              Test
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className="text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-4 text-center text-muted-foreground">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            Loading notifications...
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 text-center text-red-600">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
            Failed to load notifications
          </div>
        )}

        {/* Notifications List */}
        {!isLoading && !error && (
          <ScrollArea className="max-h-96">
            {sortedNotifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No notifications</p>
                <p className="text-xs mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="p-2">
                {Object.entries(groupedNotifications).map(
                  ([type, typeNotifications]: [string, any]) => {
                    const config =
                      notificationConfig[
                        type as keyof typeof notificationConfig
                      ];
                    const unreadInGroup = typeNotifications.filter(
                      (n: Notification) => !n.read,
                    ).length;

                    return (
                      <div key={type} className="mb-4">
                        {/* Group Header */}
                        <div className="flex items-center gap-2 px-2 py-1 mb-2">
                          <span className="text-lg">{config?.emoji}</span>
                          <span className="text-sm font-medium text-muted-foreground">
                            {config?.label}
                          </span>
                          {unreadInGroup > 0 && (
                            <Badge variant="outline" className="text-xs h-5">
                              {unreadInGroup}
                            </Badge>
                          )}
                        </div>

                        {/* Notifications in Group */}
                        {typeNotifications.map((notification: Notification) => {
                          const priorityStyle =
                            priorityConfig[notification.priority];

                          return (
                            <DropdownMenuItem
                              key={notification.id}
                              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 ${
                                !notification.read
                                  ? `${config?.bgColor} ${config?.borderColor} border-l-4`
                                  : ""
                              } ${notification.priority === "critical" ? "ring-1 ring-red-200" : ""}`}
                              onClick={() =>
                                handleNotificationClick(notification)
                              }
                            >
                              <div className="flex-shrink-0 mt-1">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${config?.bgColor}`}
                                >
                                  {getNotificationIcon(type)}
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4
                                        className={`text-sm font-medium truncate ${
                                          !notification.read
                                            ? "font-semibold"
                                            : ""
                                        }`}
                                      >
                                        {notification.title}
                                      </h4>
                                      {!notification.read && (
                                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                      {notification.description}
                                    </p>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3 text-muted-foreground" />
                                          <span className="text-xs text-muted-foreground">
                                            {formatTimeAgo(
                                              notification.timestamp,
                                            )}
                                          </span>
                                        </div>
                                        {notification.priority !== "low" && (
                                          <Badge
                                            variant="outline"
                                            className={`text-xs h-4 px-1 ${priorityStyle.textColor}`}
                                          >
                                            <div
                                              className={`w-2 h-2 rounded-full mr-1 ${priorityStyle.color}`}
                                            />
                                            {priorityStyle.label}
                                          </Badge>
                                        )}
                                      </div>
                                      {notification.actionUrl && (
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </DropdownMenuItem>
                          );
                        })}

                        {Object.keys(groupedNotifications).indexOf(type) <
                          Object.keys(groupedNotifications).length - 1 && (
                          <Separator className="my-2" />
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </ScrollArea>
        )}

        {/* Footer */}
        {sortedNotifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full text-sm justify-center"
                onClick={() => {
                  window.location.href = "/notifications";
                  setIsOpen(false);
                }}
              >
                View All Notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
