import * as React from "react";
import { cn } from "@/lib/utils";

// Modern orange button variants (no external styles)
const buttonVariants = {
  default:
    "bg-gradient-to-r from-orange-400 via-orange-500 to-orange-500 text-white " +
    "rounded-xl px-6 py-3 h-11 text-sm font-medium " +
    "transition-all duration-200 ease-out " +
    "hover:shadow-lg hover:shadow-orange-200/50 " +
    "hover:from-orange-500 hover:to-orange-600 " +
    "active:scale-95 active:shadow-md " +
    "focus:outline-none focus:ring-2 focus:ring-orange-300/60 focus:ring-offset-2 " +
    "relative overflow-hidden inline-flex items-center justify-center gap-2",

  sm: "h-9 px-4 text-xs rounded-lg",
  lg: "h-12 px-8 text-base font-semibold rounded-2xl",
  icon: "h-10 w-10 rounded-lg",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  variant?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const [ripples, setRipples] = React.useState<
      { x: number; y: number; key: number }[]
    >([]);
    const idRef = React.useRef(
      `ripple-button-${Math.random().toString(36).substr(2, 9)}`,
    );

    // Generate unique animation name per instance to avoid conflict
    const rippleAnimationName = `ripple-${idRef.current}`;

    // Define keyframes as a style string
    const keyframesStyle = `
      <style>
        @keyframes ${rippleAnimationName} {
          0% {
            transform: scale(0);
            opacity: 0.7;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
      </style>
    `;

    const addRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;

      const ripple = { x, y, key: Date.now() };
      setRipples((prev) => [...prev, ripple]);

      // Clean up ripple after animation ends
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.key !== ripple.key));
      }, 600);
    };

    return (
      <>
        {/* Inject unique keyframes per button */}
        <div dangerouslySetInnerHTML={{ __html: keyframesStyle }} />

        <button
          ref={ref}
          className={cn(buttonVariants[variant], className)}
          onMouseDown={addRipple}
          {...props}
        >
          {ripples.map((ripple) => (
            <span
              key={ripple.key}
              className="absolute pointer-events-none rounded-full animate-ripple"
              style={{
                left: ripple.x,
                top: ripple.y,
                width: "20px",
                height: "20px",
                background: "white",
                opacity: 0.3,
                transform: "translate(-50%, -50%)",
                animation: `${rippleAnimationName} 0.6s linear forwards`,
              }}
            />
          ))}
          {children}
        </button>
      </>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
