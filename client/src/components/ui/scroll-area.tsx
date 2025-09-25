import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "./button";

import { cn } from "@/lib/utils";

interface ScrollAreaWithButtonsProps
  extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  showScrollButtons?: boolean;
}

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaWithButtonsProps
>(({ className, children, showScrollButtons = false, ...props }, ref) => {
  const [canScrollUp, setCanScrollUp] = React.useState(false);
  const [canScrollDown, setCanScrollDown] = React.useState(false);
  const viewportRef = React.useRef<HTMLDivElement>(null);

  const checkScrollability = React.useCallback(() => {
    if (!viewportRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = viewportRef.current;
    const buffer = 1; // Small buffer to avoid false negatives

    setCanScrollUp(scrollTop > buffer);
    setCanScrollDown(scrollTop < scrollHeight - clientHeight - buffer);
  }, []);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !showScrollButtons) return;

    // Initial check
    checkScrollability();

    // Listen to scroll and resize
    viewport.addEventListener("scroll", checkScrollability);
    const observer = new ResizeObserver(checkScrollability);
    observer.observe(viewport);

    return () => {
      viewport.removeEventListener("scroll", checkScrollability);
      observer.disconnect();
    };
  }, [checkScrollability, showScrollButtons]);

  const scrollUp = () => {
    if (viewportRef.current) {
      viewportRef.current.scrollBy({ top: -80, behavior: "smooth" });
    }
  };

  const scrollDown = () => {
    if (viewportRef.current) {
      viewportRef.current.scrollBy({ top: 80, behavior: "smooth" });
    }
  };

  return (
    <div className="relative h-full">
      {/* Scroll Up Button */}
      {showScrollButtons && canScrollUp && (
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollUp}
          className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10 h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm border pointer-events-auto transition-all duration-200 hover:scale-105"
          style={{ backdropFilter: "blur(4px)" }}
          aria-label="Scroll up"
          data-testid="scroll-up-button"
        >
          <ChevronUp className="h-4 w-4 text-gray-600" />
        </Button>
      )}

      {/* Radix ScrollArea Root */}
      <ScrollAreaPrimitive.Root
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        {...props}
      >
        <ScrollAreaPrimitive.Viewport
          ref={viewportRef}
          className="h-full w-full rounded-[inherit]"
        >
          {children}
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar orientation="vertical" />
        <ScrollAreaPrimitive.Corner />
      </ScrollAreaPrimitive.Root>

      {/* Scroll Down Button */}
      {showScrollButtons && canScrollDown && (
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollDown}
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 z-10 h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm border pointer-events-auto transition-all duration-200 hover:scale-105"
          style={{ backdropFilter: "blur(4px)" }}
          aria-label="Scroll down"
          data-testid="scroll-down-button"
        >
          <ChevronDown className="h-4 w-4 text-gray-600" />
        </Button>
      )}
    </div>
  );
});
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical"
        ? "h-full w-2.5 border-l border-l-transparent p-[1px] mr-0.5"
        : "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb
      className={cn(
        "relative flex-1 rounded-full bg-border hover:bg-gray-300 transition-colors duration-200",
        orientation === "vertical" ? "min-h-8" : "min-w-8",
      )}
    />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
