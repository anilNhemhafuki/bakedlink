"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import React from "react";
import { cn } from "@/lib/utils";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <CollapsiblePrimitive.Content
    ref={ref}
    className={cn(
      "overflow-hidden",
      "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
      "transition-all duration-300 ease-out",
      className,
    )}
    {...props}
  >
    <div className="pb-2 pt-1 space-y-1">{children}</div>
  </CollapsiblePrimitive.Content>
));

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
