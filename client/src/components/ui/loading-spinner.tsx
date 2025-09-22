import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  message?: string;
}

export function LoadingSpinner({
  className,
  size = "md",
  message = "Loading...",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div
        className={cn(
          "animate-spin rounded-full border-4 border-gray-200 border-t-blue-600",
          sizeClasses[size],
          className,
        )}
      />
      <p className="text-gray-500 mt-2 text-sm">{message}</p>
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Loading Mero BakeSoft
        </h2>
        <p className="text-gray-500">
          Please wait while we prepare your bakery management system...
        </p>
      </div>
    </div>
  );
}
