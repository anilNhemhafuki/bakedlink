import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const isNumberInput = type === "number";

    return (
      <div className="relative">
        <input
          type={isNumberInput ? "text" : type}
          className={cn(
            "flex h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
            // Hide default number arrows
            isNumberInput &&
              "appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            className,
          )}
          ref={ref}
          {...props}
        />

        {/* Custom Up Arrow */}
        {isNumberInput && (
          <button
            type="button"
            onClick={() => {
              const input = ref.current;
              if (input) {
                const value = parseFloat(input.value) || 0;
                const step = parseFloat(input.step) || 1; // Respect step attribute
                input.value = (value + step).toString();
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.focus(); // Keep focus on input
              }
            }}
            className="absolute right-2 top-2 w-6 h-6 flex items-center justify-center 
                       rounded-full bg-gray-600 text-orange-500 hover:bg-gray-700 
                       active:bg-gray-800 transition-colors cursor-pointer 
                       ring-0 outline-none focus:ring-2 focus:ring-orange-400 
                       focus:ring-offset-1"
            aria-label="Increment"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>
        )}

        {/* Custom Down Arrow */}
        {isNumberInput && (
          <button
            type="button"
            onClick={() => {
              const input = ref.current;
              if (input) {
                const value = parseFloat(input.value) || 0;
                const step = parseFloat(input.step) || 1;
                input.value = (value - step).toString();
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.focus();
              }
            }}
            className="absolute right-2 bottom-2 w-6 h-6 flex items-center justify-center 
                       rounded-full bg-gray-600 text-orange-500 hover:bg-gray-700 
                       active:bg-gray-800 transition-colors cursor-pointer 
                       ring-0 outline-none focus:ring-2 focus:ring-orange-400 
                       focus:ring-offset-1"
            aria-label="Decrement"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
