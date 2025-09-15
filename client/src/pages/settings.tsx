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
  Printer,
  Settings,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCompanyBranding } from "@/hooks/use-company-branding";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Separator } from "@/components/ui/separator";

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

    // Immediately save the theme color to ensure it persists
    console.log("🎨 Applying theme color:", color);
    onUpdate({ themeColor: color });

    // Also store in localStorage as backup
    localStorage.setItem('themeColor', color);
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
  const [customSizes, setCustomSizes] = useState<Array<{name: string, width: string, height: string}>>([]);
  const [showCustomSize, setShowCustomSize] = useState(false);
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");

  const { data: settingsResponse = {}, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/settings"],
  });

  // Extract settings from response structure
  const settings = settingsResponse?.settings || {};

  // Load custom sizes from localStorage on mount
  React.useEffect(() => {
    const savedSizes = localStorage.getItem('customLabelSizes');
    if (savedSizes) {
      try {
        setCustomSizes(JSON.parse(savedSizes));
      } catch (e) {
        console.warn('Failed to parse custom sizes:', e);
      }
    }
  }, []);

  // Check if current label size is custom to show inputs
  React.useEffect(() => {
    setShowCustomSize(settings.labelSize === 'custom');
  }, [settings.labelSize]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => {
      console.log("🚀 Sending settings update:", data);
      return apiRequest("PUT", "/api/settings", data);
    },
    onSuccess: (response) => {
      console.log("✅ Settings update successful:", response);
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Success",
        description: response?.message || "Settings updated successfully"
      });
    },
    onError: (error: any) => {
      console.error("❌ Settings update failed:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to update settings";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const data = {
      companyName: formData.get("companyName")?.toString() || "",
      companyAddress: formData.get("companyAddress")?.toString() || "",
      companyPhone: formData.get("companyPhone")?.toString() || "",
      companyEmail: formData.get("companyEmail")?.toString() || "",
      companyRegNo: formData.get("companyRegNo")?.toString() || "",
      companyDtqocNo: formData.get("companyDtqocNo")?.toString() || "",
      timezone: formData.get("timezone")?.toString() || "UTC",
      currency: formData.get("currency")?.toString() || "USD",
    };

    console.log("📝 Saving general settings:", data);
    updateSettingsMutation.mutate(data);
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const data = {
      emailNotifications: formData.get("emailNotifications") === "on" ? "true" : "false",
      lowStockAlerts: formData.get("lowStockAlerts") === "on" ? "true" : "false",
      orderNotifications: formData.get("orderNotifications") === "on" ? "true" : "false",
      productionReminders: formData.get("productionReminders") === "on" ? "true" : "false",
    };

    console.log("📝 Saving notification settings:", data);
    updateSettingsMutation.mutate(data);
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const data = {
      twoFactorAuth: formData.get("twoFactorAuth") === "on" ? "true" : "false",
      sessionTimeout: formData.get("sessionTimeout")?.toString() || "60",
      passwordPolicy: formData.get("passwordPolicy")?.toString() || "medium",
    };

    console.log("📝 Saving security settings:", data);
    updateSettingsMutation.mutate(data);
  };

  const handleTestPrint = () => {
    const printSettings = {
      labelSize: settings.labelSize || "small",
      orientation: settings.labelOrientation || "portrait",
      margins: {
        top: settings.labelMarginTop || "2",
        bottom: settings.labelMarginBottom || "2",
        left: settings.labelMarginLeft || "2",
        right: settings.labelMarginRight || "2"
      },
      customWidth: customWidth || settings.customLabelWidth,
      customHeight: customHeight || settings.customLabelHeight
    };

    generateTestPrintLabel(printSettings);
  };

  const generateTestPrintLabel = (printSettings: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Please allow pop-ups for test printing",
        variant: "destructive",
      });
      return;
    }

    // Get paper dimensions
    let paperWidth = "50mm";
    let paperHeight = "30mm";

    switch (printSettings.labelSize) {
      case "A4":
        paperWidth = "210mm";
        paperHeight = "297mm";
        break;
      case "A5":
        paperWidth = "148mm";
        paperHeight = "210mm";
        break;
      case "A6":
        paperWidth = "105mm";
        paperHeight = "148mm";
        break;
      case "medium":
        paperWidth = "75mm";
        paperHeight = "50mm";
        break;
      case "large":
        paperWidth = "100mm";
        paperHeight = "75mm";
        break;
      case "custom_40x30":
        paperWidth = "40mm";
        paperHeight = "30mm";
        break;
      default:
        if (printSettings.customWidth && printSettings.customHeight) {
          paperWidth = `${printSettings.customWidth}mm`;
          paperHeight = `${printSettings.customHeight}mm`;
        }
    }

    // Swap dimensions for landscape
    if (printSettings.orientation === "landscape") {
      [paperWidth, paperHeight] = [paperHeight, paperWidth];
    }

    const testLabelHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Print Label</title>
        <style>
          @page {
            size: ${paperWidth} ${paperHeight};
            margin: ${printSettings.margins.top} ${printSettings.margins.right} ${printSettings.margins.bottom} ${printSettings.margins.left};
          }

          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            margin: 0;
            padding: 10px;
            width: 100%;
            height: 100%;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .header {
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 10px;
          }

          .content {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
          }

          .product-name {
            font-size: 16px;
            font-weight: bold;
            margin: 10px 0;
          }

          .qr-placeholder {
            width: 60px;
            height: 60px;
            border: 2px solid #333;
            margin: 10px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
          }

          .footer {
            text-align: center;
            font-size: 10px;
            margin-top: 10px;
          }

          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${settings.companyName || "Mero BakeSoft"}
        </div>

        <div class="content">
          <div class="product-name">Sample Product</div>
          <div class="qr-placeholder">QR CODE</div>
          <div>Weight: 500g</div>
          <div>SKU: TEST001</div>
        </div>

        <div class="footer">
          ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(testLabelHTML);
    printWindow.document.close();

    // Auto-trigger print dialog after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 500);

    toast({
      title: "Test Print",
      description: "Print preview opened. Check the layout before printing.",
    });
  };

  const handleSavePrinting = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    let labelSize = formData.get("labelSize")?.toString() || "small";
    let customSizeName = "";

    // Handle custom size
    if (labelSize === "custom" && customWidth && customHeight) {
      customSizeName = `Custom (${customWidth}x${customHeight}mm)`;

      // Add to custom sizes list if not already exists
      const newCustomSize = {
        name: customSizeName,
        width: customWidth,
        height: customHeight
      };

      const existingIndex = customSizes.findIndex(
        size => size.width === customWidth && size.height === customHeight
      );

      if (existingIndex === -1) {
        const updatedSizes = [...customSizes, newCustomSize];
        setCustomSizes(updatedSizes);
        localStorage.setItem('customLabelSizes', JSON.stringify(updatedSizes));
      }

      labelSize = customSizeName;
    }

    const data = {
      defaultPrinter: formData.get("defaultPrinter")?.toString() || "",
      labelSize: labelSize,
      labelOrientation: formData.get("labelOrientation")?.toString() || "portrait",
      labelMarginTop: formData.get("labelMarginTop")?.toString() || "2",
      labelMarginBottom: formData.get("labelMarginBottom")?.toString() || "2",
      labelMarginLeft: formData.get("labelMarginLeft")?.toString() || "2",
      labelMarginRight: formData.get("labelMarginRight")?.toString() || "2",
      customLabelWidth: customWidth || "",
      customLabelHeight: customHeight || "",
    };

    console.log("📝 Saving printing settings:", data);
    updateSettingsMutation.mutate(data);
  };

  // Cache reset functionality
  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/cache/clear', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to clear cache');
      return response.json();
    },
    onSuccess: () => {
      // Clear React Query cache
      queryClient.clear();

      // Clear localStorage cache
      localStorage.clear();

      // Clear sessionStorage cache
      sessionStorage.clear();

      toast({
        title: "Cache Cleared",
        description: "Application cache has been cleared successfully. Please refresh the page.",
        variant: "default",
      });

      // Optionally reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to clear cache. Please try again.",
        variant: "destructive",
      });
    },
  });

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
                        settings.companyName || "Bake Sewa"
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
                    defaultChecked={settings.emailNotifications === true || settings.emailNotifications === "true"}
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
                    defaultChecked={settings.lowStockAlerts === true || settings.lowStockAlerts === "true"}
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
                    defaultChecked={settings.orderNotifications === true || settings.orderNotifications === "true"}
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
                    defaultChecked={settings.productionReminders === true || settings.productionReminders === "true"}
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
                    defaultChecked={settings.twoFactorAuth === true || settings.twoFactorAuth === "true"}
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
                      onValueChange={(value) => setShowCustomSize(value === "custom")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A4">A4 (210x297mm)</SelectItem>
                        <SelectItem value="A5">A5 (148x210mm)</SelectItem>
                        <SelectItem value="A6">A6 (105x148mm)</SelectItem>
                        <SelectItem value="small">Small (50x30mm)</SelectItem>
                        <SelectItem value="medium">Medium (75x50mm)</SelectItem>
                        <SelectItem value="large">Large (100x75mm)</SelectItem>
                        <SelectItem value="custom_40x30">40x30mm</SelectItem>
                        {customSizes.map((size, index) => (
                          <SelectItem key={index} value={size.name}>
                            {size.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Custom Size</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {showCustomSize && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50">
                    <div>
                      <Label htmlFor="customWidth">Width (mm)</Label>
                      <Input
                        id="customWidth"
                        value={customWidth}
                        onChange={(e) => setCustomWidth(e.target.value)}
                        type="number"
                        placeholder="40"
                        min="10"
                        max="300"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customHeight">Height (mm)</Label>
                      <Input
                        id="customHeight"
                        value={customHeight}
                        onChange={(e) => setCustomHeight(e.target.value)}
                        type="number"
                        placeholder="30"
                        min="10"
                        max="400"
                      />
                    </div>
                  </div>
                )}

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
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="labelMarginTop">Top Margin (mm)</Label>
                    <Input
                      id="labelMarginTop"
                      name="labelMarginTop"
                      type="number"
                      step="0.5"
                      defaultValue={settings.labelMarginTop || "2"}
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="labelMarginBottom">Bottom Margin (mm)</Label>
                    <Input
                      id="labelMarginBottom"
                      name="labelMarginBottom"
                      type="number"
                      step="0.5"
                      defaultValue={settings.labelMarginBottom || "2"}
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="labelMarginLeft">Left Margin (mm)</Label>
                    <Input
                      id="labelMarginLeft"
                      name="labelMarginLeft"
                      type="number"
                      step="0.5"
                      defaultValue={settings.labelMarginLeft || "2"}
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="labelMarginRight">Right Margin (mm)</Label>
                    <Input
                      id="labelMarginRight"
                      name="labelMarginRight"
                      type="number"
                      step="0.5"
                      defaultValue={settings.labelMarginRight || "2"}
                      placeholder="2"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={updateSettingsMutation.isPending}
                  >
                    Save Printing Settings
                  </Button>
                  {/* Test Print Button */}
                    <div className="flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestPrint}
                        disabled={!settings}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Test Print
                      </Button>
                    </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* System Maintenance Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Maintenance
              </CardTitle>
              <CardDescription>
                System maintenance and troubleshooting tools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Cache Management</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Clear application cache to resolve performance issues or display problems.
                    This will clear all cached data and you may need to refresh the page.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => clearCacheMutation.mutate()}
                    disabled={clearCacheMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {clearCacheMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                        Clearing Cache...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Clear Application Cache
                      </>
                    )}
                  </Button>
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-semibold">System Information</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Application Version:</span>
                        <span className="text-sm">1.0.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Last Cache Clear:</span>
                        <span className="text-sm">{localStorage.getItem('lastCacheClear') || 'Never'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Browser:</span>
                        <span className="text-sm">{navigator.userAgent.split(' ')[0]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Platform:</span>
                        <span className="text-sm">{navigator.platform}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}