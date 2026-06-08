"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InfoTickVariant } from "@/components/ui/info-tick-button";

const tickVariantClasses: Record<InfoTickVariant, string> = {
  primary:
    "border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
  success:
    "border-green-500/60 data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600 data-[state=checked]:text-white dark:data-[state=checked]:bg-green-500",
  warning:
    "border-amber-500/60 data-[state=checked]:border-amber-600 data-[state=checked]:bg-amber-500 data-[state=checked]:text-white",
  danger:
    "border-red-500/60 data-[state=checked]:border-red-600 data-[state=checked]:bg-red-600 data-[state=checked]:text-white",
  muted:
    "border-border data-[state=checked]:bg-muted data-[state=checked]:text-foreground",
};

type CheckboxProps = React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
  tickVariant?: InfoTickVariant;
};

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, tickVariant = "primary", ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      tickVariantClasses[tickVariant],
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check className="h-4 w-4 text-current" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
