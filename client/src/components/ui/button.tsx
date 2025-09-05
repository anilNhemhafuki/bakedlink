"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Define variants cleanly: separate style (variant) and size
const buttonVariants = {
  variant: {
    default:
      "bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white shadow-sm hover:shadow-md active:shadow-none " +
      "hover:from-orange-500 hover:to-orange-600 " +
      "focus:outline-none focus:ring-2 focus:ring-orange-300/50 focus:ring-offset-2 " +
      "disabled:bg-orange-300 disabled:cursor-not-allowed",
    outline:
      "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 " +
      "focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 " +
      "disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200",
    secondary:
      "bg-gray-100 text-gray-800 hover:bg-gray-200 " +
      "focus:ring-2 focus:ring-gray-300/50 " +
      "disabled:bg-gray-100 disabled:text-gray-400",
    ghost:
      "text-gray-700 hover:bg-gray-100 hover:text-gray-900 " +
      "focus:ring-2 focus:ring-gray-300/50 " +
      "disabled:text-gray-400",
    link:
      "text-blue-600 underline-offset-2 hover:underline hover:text-blue-700 " +
      "focus:ring-0 focus:underline",
  },
  size: {
    default: "h-10 px-6 py-2 rounded-lg text-sm font-medium",
    sm: "h-8 px-3 rounded-md text-xs font-normal",
    lg: "h-12 px-8 rounded-xl text-base font-semibold",
    icon: "h-10 w-10 rounded-lg p-0",
  },
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      children,
      asChild,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? "span" : "button";

    // Only generate ripple on client
    const [ripples, setRipples] = React.useState<
      { x: number; y: number; key: number }[]
    >([]);
    const idRef = React.useRef(
      `ripple-${React.useId?.() || Math.random().toString(36).substr(2, 9)}`,
    );

    const rippleAnimationName = `ripple-${idRef.current}`;

    // Inject keyframes safely only on client
    React.useEffect(() => {
      const style = document.createElement("style");
      style.textContent = `
        @keyframes ${rippleAnimationName} {
          0% { transform: scale(0); opacity: 0.5; }
          100% { transform: scale(4); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }, [rippleAnimationName]);

    const addRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const diameter = Math.max(rect.width, rect.height);
      const radius = diameter / 2;
      const x = event.clientX - rect.left - radius;
      const y = event.clientY - rect.top - radius;

      const ripple = { x, y, key: Date.now() };
      setRipples((prev) => [...prev, ripple]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.key !== ripple.key));
      }, 600);
    };

    return (
      <Comp
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap rounded-md transition-all duration-200 focus:outline-none disabled:pointer-events-none",
          buttonVariants.variant[variant],
          buttonVariants.size[size],
          // Common hover/active states
          variant !== "link" && "hover:translate-y-px active:translate-y-0",
          className,
        )}
        onMouseDown={(e) => {
          if (Comp === "button") addRipple(e);
          props.onMouseDown?.(e);
        }}
        {...(props as any)}
        // Prevent span from being a button
        {...(Comp === "button" ? { type: props.type || "button" } : {})}
      >
        {/* Ripple effect */}
        {Comp === "button" &&
          ripples.map((ripple) => (
            <span
              key={ripple.key}
              className="absolute pointer-events-none rounded-full animate-ripple"
              style={{
                left: ripple.x,
                top: ripple.y,
                width: "20px",
                height: "20px",
                background: "white",
                opacity: 0.25,
                transform: "translate(-50%, -50%)",
                animation: `${rippleAnimationName} 0.6s linear forwards`,
              }}
            />
          ))}

        {children}
      </Comp>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
