
import { useQuery } from "@tanstack/react-query";

export interface PricingSettings {
  systemPrice: number;
  currency: string;
  description: string;
  displayEnabled: boolean;
}

export function usePricing() {
  const { data: pricingSettings, isLoading, error } = useQuery({
    queryKey: ["/api/pricing"],
    queryFn: async () => {
      const response = await fetch("/api/pricing");
      if (!response.ok) {
        throw new Error("Failed to fetch pricing");
      }
      return response.json() as Promise<PricingSettings>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  const formatPrice = (price?: number) => {
    const actualPrice = price || pricingSettings?.systemPrice || 299.99;
    const currency = pricingSettings?.currency || "USD";
    
    const currencySymbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      NPR: "₨",
      INR: "₹",
      AUD: "A$",
      CAD: "C$",
    };

    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${actualPrice.toFixed(2)}`;
  };

  const formatPriceWithCurrency = (price?: number) => {
    const actualPrice = price || pricingSettings?.systemPrice || 299.99;
    const currency = pricingSettings?.currency || "USD";
    return `${currency} ${actualPrice.toFixed(2)}`;
  };

  return {
    pricingSettings,
    isLoading,
    error,
    formatPrice,
    formatPriceWithCurrency,
    systemPrice: pricingSettings?.systemPrice || 299.99,
    currency: pricingSettings?.currency || "USD",
    description: pricingSettings?.description || "Complete Bakery Management System",
    displayEnabled: pricingSettings?.displayEnabled !== false,
  };
}

// Quick hook for getting just the system price
export function useSystemPrice() {
  const { data: priceData } = useQuery({
    queryKey: ["/api/system-price"],
    queryFn: async () => {
      const response = await fetch("/api/system-price");
      if (!response.ok) throw new Error("Failed to fetch system price");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  return priceData?.price || 299.99;
}
