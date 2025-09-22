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
    sm: "h-6 w-6 border-2",
    md: "h-10 w-10 border-3",
    lg: "h-16 w-16 border-4",
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-3">
      {/* Gradient Spinner */}
      <div
        className={cn(
          "relative rounded-full animate-spin",
          sizeClasses[size],
          className,
        )}
      >
        <div className="absolute inset-0 rounded-full border-dashed border-t-transparent border-l-blue-200 border-r-purple-400 border-b-pink-300"></div>
        <div className="absolute inset-[10%] rounded-full bg-gradient-to-tr from-blue-50 to-indigo-50"></div>
      </div>

      {/* Message */}
      <p className="text-gray-600 text-sm font-medium tracking-wide animate-pulse">
        {message}
      </p>
    </div>
  );
}

// Full Page Wow Loader
export function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-pink-50 relative overflow-hidden">
      {/* Background Decorative Shapes */}
      <div className="absolute -top-20 -left-20 w-60 h-60 bg-gradient-to-r from-blue-200 to-purple-200 rounded-full opacity-30 blur-3xl animate-pulse"></div>
      <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-gradient-to-l from-pink-200 to-red-200 rounded-full opacity-40 blur-3xl animate-bounce delay-1000"></div>

      {/* Main Content */}
      <div className="text-center z-10 transform transition-all duration-700 hover:scale-105">
        {/* Icon + Spinner */}
        <div className="relative inline-block mb-6">
          <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin shadow-lg"></div>
          {/* Bakery Emoji Badge */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">🧄</span>{" "}
            {/* Change to 🍞, 🎂, ☕ based on client */}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 mb-2 tracking-tight">
          Mero BakeSoft
        </h2>

        {/* Subtitle */}
        <p className="text-gray-500 max-w-xs mx-auto text-sm md:text-base leading-relaxed">
          Baking your digital experience with care... Please wait while we
          prepare everything perfectly.
        </p>

        {/* Dots Animation */}
        <div className="flex justify-center mt-4 space-x-1">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
