import * as React from "react";
import { cn } from "@/lib/utils";

// Deliberately a styled native <select>, not a Radix Select — see the
// "Deliberate simplification" global constraint in the plan.
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-9 w-full border-2 border-foreground bg-background px-2.5 text-sm text-foreground focus-visible:bg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export { Select };
