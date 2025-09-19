
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePricing } from "@/hooks/usePricing";
import { DollarSign, Star, Award } from "lucide-react";

interface DynamicPriceDisplayProps {
  variant?: "badge" | "card" | "inline" | "large";
  showDescription?: boolean;
  showCurrency?: boolean;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function DynamicPriceDisplay({
  variant = "inline",
  showDescription = false,
  showCurrency = true,
  className = "",
  prefix = "",
  suffix = "",
}: DynamicPriceDisplayProps) {
  const { 
    pricingSettings, 
    isLoading, 
    formatPrice, 
    formatPriceWithCurrency, 
    displayEnabled 
  } = usePricing();

  // Don't render if pricing display is disabled
  if (!displayEnabled && !isLoading) {
    return null;
  }

  if (isLoading) {
    return <Skeleton className={`h-6 w-24 ${className}`} />;
  }

  const priceText = showCurrency 
    ? formatPriceWithCurrency() 
    : formatPrice();

  const fullText = `${prefix}${priceText}${suffix}`;

  switch (variant) {
    case "badge":
      return (
        <Badge variant="secondary" className={`font-semibold ${className}`}>
          <DollarSign className="h-3 w-3 mr-1" />
          {fullText}
        </Badge>
      );

    case "card":
      return (
        <Card className={className}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5 text-yellow-500" />
              Overall System Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary mb-2">
              {fullText}
            </div>
            {showDescription && pricingSettings?.description && (
              <p className="text-sm text-muted-foreground">
                {pricingSettings.description}
              </p>
            )}
          </CardContent>
        </Card>
      );

    case "large":
      return (
        <div className={`text-center ${className}`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Award className="h-6 w-6 text-primary" />
            <span className="text-lg font-medium text-gray-700">
              Overall System Cost
            </span>
          </div>
          <div className="text-4xl font-bold text-primary mb-2">
            {fullText}
          </div>
          {showDescription && pricingSettings?.description && (
            <p className="text-gray-600 max-w-md mx-auto">
              {pricingSettings.description}
            </p>
          )}
        </div>
      );

    case "inline":
    default:
      return (
        <span className={`font-semibold text-primary ${className}`}>
          {fullText}
        </span>
      );
  }
}

// Specialized components for common use cases
export function SystemPriceBadge({ className }: { className?: string }) {
  return (
    <DynamicPriceDisplay
      variant="badge"
      className={className}
    />
  );
}

export function SystemPriceCard({ 
  showDescription = true, 
  className 
}: { 
  showDescription?: boolean; 
  className?: string; 
}) {
  return (
    <DynamicPriceDisplay
      variant="card"
      showDescription={showDescription}
      className={className}
    />
  );
}

export function SystemPriceLarge({ 
  showDescription = true, 
  className 
}: { 
  showDescription?: boolean; 
  className?: string; 
}) {
  return (
    <DynamicPriceDisplay
      variant="large"
      showDescription={showDescription}
      className={className}
    />
  );
}
