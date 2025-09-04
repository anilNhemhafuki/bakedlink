import * as React from "react";
import { cn } from "@/lib/utils";

// Base button class with simple orange style
const buttonVariants = {
  default:
    "bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-6 py-3 h-11 text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none",
  sm: "h-9 px-4 text-sm",
  lg: "h-12 px-8 text-base font-semibold",
  icon: "h-10 w-10 rounded",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  variant?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants[variant], className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
