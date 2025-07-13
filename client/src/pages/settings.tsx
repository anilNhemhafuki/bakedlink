import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings2,
  Building,
  Bell,
  Shield,
  Database,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Function to convert hex to HSL
function hexToHsl(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        h = 0;
    }
    h /= 6;
  }

  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

// Function to apply theme color
function applyThemeColor(color: string) {
  const hslColor = hexToHsl(color);
  document.documentElement.style.setProperty("--theme-color", hslColor);
}

const THEME_COLORS = [
  {
    name: "Blue Steel",
    value: "#507e96",
    description: "Professional blue-gray",
  },
  {
    name: "Golden Yellow",
    value: "#ffca44",
    description: "Warm sunshine yellow",
  },
  { name: "Forest Green", value: "#0f6863", description: "Rich forest green" },
  { name: "Cherry Red", value: "#e40126", description: "Bold cherry red" },
  { name: "Warm Bronze", value: "#c1853b", description: "Elegant bronze tone" },
  { name: "Coffee Brown", value: "#7B4019", description: "Rich coffee brown" },
  {
    name: "Orange Sunset",
    value: "#FF7D29",
    description: "Vibrant sunset orange",
  },
];

function ThemeColorSelector({
  settings,
  onUpdate,
}: {
  settings: any;
  onUpdate: (data: any) => void;
}) {
  const currentTheme = settings?.themeColor || "#507e96";
  const [selectedColor, setSelectedColor] = useState(currentTheme);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    applyThemeColor(color);
    onUpdate({ themeColor: color });
  };

  // Apply theme color on component mount if settings exist
  React.useEffect(() => {
    if (settings?.themeColor) {
      applyThemeColor(settings.themeColor);
      setSelectedColor(settings.themeColor);
    }
  }, [settings]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {THEME_COLORS.map((color) => (
          <div
            key={color.value}
            className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
              selectedColor === color.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => handleColorSelect(color.value)}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: color.value }}
              />
              <div className="flex-1">
                <h4 className="font-medium text-sm">{color.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {color.description}
                </p>
              </div>
            </div>
            {selectedColor === color.value && (
              <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
            )}
          </div>
        ))}
      </div>
      <div className="pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          Current theme color will be applied to buttons, links, and accent
          elements throughout the application.
        </p>
      </div>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");

  const { data: settingsResponse = {}, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/settings"],
  });

  // Extract settings from response structure
  const settings = settingsResponse?.settings || {};

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Success", description: "Settings updated successfully" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const data = {
      companyName: formData.get("companyName"),
      companyAddress: formData.get("companyAddress"),
      companyPhone: formData.get("companyPhone"),
      companyEmail: formData.get("companyEmail"),
      companyRegNo: formData.get("companyRegNo"),
      companyDtqocNo: formData.get("companyDtqocNo"),
      timezone: formData.get("timezone"),
      currency: formData.get("currency"),
    };

    updateSettingsMutation.mutate(data);
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const data = {
      emailNotifications: formData.get("emailNotifications") === "on",
      lowStockAlerts: formData.get("lowStockAlerts") === "on",
      orderNotifications: formData.get("orderNotifications") === "on",
      productionReminders: formData.get("productionReminders") === "on",
    };

    updateSettingsMutation.mutate(data);
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const data = {
      twoFactorAuth: formData.get("twoFactorAuth") === "on",
      sessionTimeout: parseInt(formData.get("sessionTimeout") as string),
      passwordPolicy: formData.get("passwordPolicy"),
    };

    updateSettingsMutation.mutate(data);
  };

  const handleSavePrinting = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const data = {
      defaultPrinter: formData.get("defaultPrinter"),
      labelSize: formData.get("labelSize"),
      labelOrientation: formData.get("labelOrientation"),
      labelMargin: formData.get("labelMargin"),
    };

    updateSettingsMutation.mutate(data);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Settings2 className="h-8 w-8 text-primary" />
        <div>
          <p className="text-gray-600">Manage your system preferences</p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="printing">Printing</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>
                Configure your company information and system preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveGeneral} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      defaultValue={
                        settings.companyName || "Sweet Treats Bakery"
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyPhone">Phone Number</Label>
                    <Input
                      id="companyPhone"
                      name="companyPhone"
                      defaultValue={settings.companyPhone || ""}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="companyAddress">Address</Label>
                  <Textarea
                    id="companyAddress"
                    name="companyAddress"
                    defaultValue={settings.companyAddress || ""}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyRegNo">Registration Number</Label>
                    <Input
                      id="companyRegNo"
                      name="companyRegNo"
                      defaultValue={settings.companyRegNo || ""}
                      placeholder="Company registration number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyDtqocNo">DTQOC Number</Label>
                    <Input
                      id="companyDtqocNo"
                      name="companyDtqocNo"
                      defaultValue={settings.companyDtqocNo || ""}
                      placeholder="DTQOC certification number"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyEmail">Email</Label>
                    <Input
                      id="companyEmail"
                      name="companyEmail"
                      type="email"
                      defaultValue={
                        settings.companyEmail || "info@sweettreatsbakery.com"
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      name="timezone"
                      defaultValue={settings.timezone || "UTC"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">
                          Eastern Time
                        </SelectItem>
                        <SelectItem value="America/Chicago">
                          Central Time
                        </SelectItem>
                        <SelectItem value="America/Denver">
                          Mountain Time
                        </SelectItem>
                        <SelectItem value="America/Los_Angeles">
                          Pacific Time
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      name="currency"
                      defaultValue={settings.currency || "USD"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="NPR">NPR (₨)</SelectItem>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="CAD">CAD (C$)</SelectItem>
                        <SelectItem value="AUD">AUD (A$)</SelectItem>
                        <SelectItem value="JPY">JPY (¥)</SelectItem>
                        <SelectItem value="CNY">CNY (¥)</SelectItem>
                        <SelectItem value="KRW">KRW (₩)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={updateSettingsMutation.isPending}
                >
                  Save General Settings
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveNotifications} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailNotifications">
                      Email Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    name="emailNotifications"
                    defaultChecked={settings.emailNotifications !== false}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="lowStockAlerts">Low Stock Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when inventory is running low
                    </p>
                  </div>
                  <Switch
                    id="lowStockAlerts"
                    name="lowStockAlerts"
                    defaultChecked={settings.lowStockAlerts !== false}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="orderNotifications">
                      Order Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive alerts for new orders
                    </p>
                  </div>
                  <Switch
                    id="orderNotifications"
                    name="orderNotifications"
                    defaultChecked={settings.orderNotifications !== false}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="productionReminders">
                      Production Reminders
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Get reminders for scheduled production
                    </p>
                  </div>
                  <Switch
                    id="productionReminders"
                    name="productionReminders"
                    defaultChecked={settings.productionReminders !== false}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={updateSettingsMutation.isPending}
                >
                  Save Notification Settings
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage security preferences and access controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSecurity} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="twoFactorAuth">
                      Two-Factor Authentication
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Switch
                    id="twoFactorAuth"
                    name="twoFactorAuth"
                    defaultChecked={settings.twoFactorAuth === true}
                  />
                </div>
                <div>
                  <Label htmlFor="sessionTimeout">
                    Session Timeout (minutes)
                  </Label>
                  <Input
                    id="sessionTimeout"
                    name="sessionTimeout"
                    type="number"
                    defaultValue={settings.sessionTimeout || 60}
                    min="15"
                    max="480"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Users will be logged out after this period of inactivity
                  </p>
                </div>
                <div>
                  <Label htmlFor="passwordPolicy">Password Policy</Label>
                  <Select
                    name="passwordPolicy"
                    defaultValue={settings.passwordPolicy || "medium"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - 6+ characters</SelectItem>
                      <SelectItem value="medium">
                        Medium - 8+ characters with mixed case
                      </SelectItem>
                      <SelectItem value="high">
                        High - 12+ characters with symbols
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  disabled={updateSettingsMutation.isPending}
                >
                  Save Security Settings
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="printing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="fas fa-print text-lg"></i>
                Printing Settings
              </CardTitle>
              <CardDescription>
                Configure your label printing preferences and printer settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSavePrinting} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="defaultPrinter">Default Printer</Label>
                    <Input
                      id="defaultPrinter"
                      name="defaultPrinter"
                      defaultValue={settings.defaultPrinter || ""}
                      placeholder="Enter printer name"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Name of your default label printer
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="labelSize">Label Size</Label>
                    <Select
                      name="labelSize"
                      defaultValue={settings.labelSize || "small"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (50x30mm)</SelectItem>
                        <SelectItem value="medium">Medium (75x50mm)</SelectItem>
                        <SelectItem value="large">Large (100x75mm)</SelectItem>
                        <SelectItem value="custom">Custom Size</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="labelOrientation">Label Orientation</Label>
                    <Select
                      name="labelOrientation"
                      defaultValue={settings.labelOrientation || "portrait"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="labelMargin">Label Margin (mm)</Label>
                    <Input
                      id="labelMargin"
                      name="labelMargin"
                      type="number"
                      step="0.5"
                      defaultValue={settings.labelMargin || "2"}
                      placeholder="2"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={updateSettingsMutation.isPending}
                >
                  Save Printing Settings
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
