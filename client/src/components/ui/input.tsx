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
                input.value = (value + 1).toString();
                input.dispatchEvent(new Event("input", { bubbles: true }));
              }
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center  text-orange-500 transition-colors cursor-pointer"
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
                input.value = (value - 1).toString();
                input.dispatchEvent(new Event("input", { bubbles: true }));
              }
            }}
            className="absolute right-3 bottom-1/2 translate-y-1/2 w-4 h-4 flex items-center justify-center text-orange-500 transition-colors cursor-pointer"
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
