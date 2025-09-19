
import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Settings, Eye, Save, RefreshCw } from "lucide-react";

export function PricingSettings() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch current pricing settings
  const { data: pricingSettings, isLoading, refetch } = useQuery({
    queryKey: ["/api/pricing"],
    queryFn: async () => {
      const response = await fetch("/api/pricing");
      if (!response.ok) throw new Error("Failed to fetch pricing");
      return response.json();
    },
  });

  // Update pricing mutation
  const updatePricingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update pricing");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system-price"] });
      toast({
        title: "Success",
        description: "Pricing settings updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update pricing settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    
    const data = {
      systemPrice: parseFloat(formData.get("systemPrice") as string),
      currency: formData.get("currency") as string,
      description: formData.get("description") as string,
      displayEnabled: formData.get("displayEnabled") === "on",
    };

    // Validate price
    if (isNaN(data.systemPrice) || data.systemPrice <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0",
        variant: "destructive",
      });
      return;
    }

    updatePricingMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading pricing settings...
          </div>
        </CardContent>
      </Card>
    );
  }

  const settings = pricingSettings || {
    systemPrice: 299.99,
    currency: "USD",
    description: "Complete Bakery Management System",
    displayEnabled: true,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          System Pricing Settings
        </CardTitle>
        <CardDescription>
          Configure the pricing for your bakery management system
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isEditing ? (
          <div className="space-y-4">
            {/* Current Settings Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">
                  System Price
                </Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-lg font-bold">
                    {settings.currency} {settings.systemPrice.toFixed(2)}
                  </Badge>
                  {settings.displayEnabled && (
                    <Badge variant="secondary">
                      <Eye className="h-3 w-3 mr-1" />
                      Visible
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">
                  Currency
                </Label>
                <div className="text-sm">{settings.currency}</div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium text-gray-500">
                  Description
                </Label>
                <div className="text-sm">{settings.description}</div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  This price will be displayed across all system components
                </p>
              </div>
              <Button onClick={() => setIsEditing(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Edit Pricing
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="systemPrice">System Price *</Label>
                <Input
                  id="systemPrice"
                  name="systemPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={settings.systemPrice}
                  required
                  placeholder="299.99"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select name="currency" defaultValue={settings.currency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="NPR">NPR (₨)</SelectItem>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="AUD">AUD (A$)</SelectItem>
                    <SelectItem value="CAD">CAD (C$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={settings.description}
                  placeholder="Complete Bakery Management System"
                  rows={2}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="displayEnabled"
                    name="displayEnabled"
                    defaultChecked={settings.displayEnabled}
                  />
                  <Label htmlFor="displayEnabled">
                    Display pricing across the system
                  </Label>
                </div>
                <p className="text-xs text-gray-500">
                  When enabled, the system price will be visible in components and pages
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={updatePricingMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatePricingMutation.isPending}
              >
                {updatePricingMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Pricing
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
