import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

interface CompanyBranding {
  companyName: string;
  companyLogo: string;
  themeColor: string;
  currency: string;
}

export function useCompanyBranding() {
  const queryClient = useQueryClient();
  const {
    data: settingsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: () => apiRequest("GET", "/api/settings"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const settings = settingsResponse?.settings || {};

  const branding: CompanyBranding = {
    companyName: settings?.companyName || "Mero BakerSoft",
    companyLogo: settings?.companyLogo || "",
    themeColor: settings?.themeColor || "#efa14b",
    currency: settings?.currency || "NPR",
  };

  // Apply theme color to CSS variables
  useEffect(() => {
    if (branding.themeColor) {
      // Convert hex to HSL for CSS custom properties
      const hexToHsl = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;

        const max = Math.max(rNorm, gNorm, bNorm);
        const min = Math.min(rNorm, gNorm, bNorm);

        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

          switch (max) {
            case rNorm:
              h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
              break;
            case gNorm:
              h = (bNorm - rNorm) / d + 2;
              break;
            case bNorm:
              h = (rNorm - gNorm) / d + 4;
              break;
          }
          h /= 6;
        }

        return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
      };

      try {
        const [h, s, l] = hexToHsl(branding.themeColor);

        // Update CSS custom properties for comprehensive theme coverage
        const root = document.documentElement;

        // Primary color variations
        root.style.setProperty("--primary", `${h} ${s}% ${l}%`);
        root.style.setProperty(
          "--primary-foreground",
          l > 50 ? "0 0% 98%" : "0 0% 2%",
        );

        // Secondary color variations (lighter version of primary)
        root.style.setProperty(
          "--secondary",
          `${h} ${Math.max(s - 20, 10)}% ${Math.min(l + 40, 95)}%`,
        );
        root.style.setProperty(
          "--secondary-foreground",
          `${h} ${s}% ${Math.max(l - 40, 10)}%`,
        );

        // Accent color (slightly different hue)
        const accentHue = (h + 30) % 360;
        root.style.setProperty(
          "--accent",
          `${accentHue} ${Math.max(s - 10, 20)}% ${Math.min(l + 30, 90)}%`,
        );
        root.style.setProperty(
          "--accent-foreground",
          `${accentHue} ${s}% ${Math.max(l - 30, 15)}%`,
        );

        // Ring color for focus states
        root.style.setProperty(
          "--ring",
          `${h} ${Math.max(s - 10, 30)}% ${Math.min(l + 10, 70)}%`,
        );

        // Muted variants
        root.style.setProperty(
          "--muted",
          `${h} ${Math.max(s - 30, 8)}% ${Math.min(l + 50, 95)}%`,
        );
        root.style.setProperty(
          "--muted-foreground",
          `${h} ${Math.max(s - 20, 5)}% ${Math.max(l - 20, 45)}%`,
        );

        // Border color
        root.style.setProperty(
          "--border",
          `${h} ${Math.max(s - 20, 10)}% ${Math.min(l + 45, 90)}%`,
        );

        // Input color
        root.style.setProperty(
          "--input",
          `${h} ${Math.max(s - 20, 10)}% ${Math.min(l + 45, 90)}%`,
        );

        // Update meta theme color for mobile browsers
        const metaThemeColor = document.querySelector(
          'meta[name="theme-color"]',
        );
        if (metaThemeColor) {
          metaThemeColor.setAttribute("content", branding.themeColor);
        } else {
          const meta = document.createElement("meta");
          meta.name = "theme-color";
          meta.content = branding.themeColor;
          document.head.appendChild(meta);
        }
      } catch (error) {
        console.warn("Failed to apply theme color:", error);
      }
    }
  }, [branding.themeColor]);

  // Update document title
  useEffect(() => {
    if (branding.companyName) {
      document.title = `${branding.companyName} - Bakery Management System`;
    } else {
      document.title = "Mero BakeSoft - Bakery Management System";
    }
  }, [branding.companyName]);

  return {
    branding,
    isLoading,
    error,
    refreshBranding: () => {
      // Invalidate and refetch the settings
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  };
}

// Utility function to format currency
export function formatCurrency(
  amount: number,
  currency: string = "NPR",
): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback if currency is not supported
    return `${currency} ${amount.toFixed(2)}`;
  }
}
