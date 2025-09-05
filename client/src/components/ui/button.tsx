"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Define button variants using `cva`
export const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white shadow-sm hover:shadow focus:ring-orange-300/50 hover:from-orange-500 hover:to-orange-600",
        outline:
          "border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 focus:ring-blue-500/30 disabled:bg-white disabled:text-gray-400",
        secondary:
          "bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-300/50 disabled:bg-gray-100",
        ghost:
          "hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-300/50 disabled:text-gray-400",
        link: "text-blue-600 underline-offset-4 hover:underline focus:ring-0 focus:underline disabled:text-blue-400",
      },
      size: {
        default: "h-10 px-6 py-2 rounded-lg",
        sm: "h-8 px-3 rounded-md text-xs",
        lg: "h-12 px-8 rounded-xl text-base font-semibold",
        icon: "h-10 w-10 rounded-lg p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

// Button component props
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

// Main Button component
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
