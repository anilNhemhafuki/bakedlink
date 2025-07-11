import { useQuery } from "@tanstack/react-query";

const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  NPR: "Rs. ",
  INR: "₹",
  CAD: "C$",
  AUD: "A$",
  JPY: "¥",
  CNY: "¥",
  KRW: "₩",
};

export function useCurrency() {
  const { data: settings = {} } = useQuery({
    queryKey: ["/api/settings"],
  });

  const currency = settings.currency || "NPR";
  const symbol =
    CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || "Rs. ";

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return `${symbol}${numAmount.toFixed(2)}`;
  };

  const formatCurrencyWithCommas = (amount: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return `${symbol}${numAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCurrencyInput = (amount: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return "";
    return numAmount.toFixed(2);
  };

  const parseCurrency = (value: string) => {
    const cleanValue = value.replace(/[^\d.-]/g, "");
    return parseFloat(cleanValue) || 0;
  };

  return {
    currency,
    symbol,
    formatCurrency,
    formatCurrencyWithCommas,
    formatCurrencyInput,
    parseCurrency,
  };
}
