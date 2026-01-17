import * as React from "react";
import { cn } from "@/lib/utils";

type Gap = "none" | "sm" | "md" | "lg";

const gapMap: Record<Gap, string> = {
  none: "gap-0",
  sm: "gap-1",
  md: "gap-2",
  lg: "gap-4",
};

interface ButtonBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Spacing between buttons */
  gap?: Gap;
  /** Merge buttons together into a single group (removes borders between adjacent buttons) */
  merged?: boolean;
}

/**
 * ButtonBar component for grouping related buttons horizontally.
 *
 * Use `merged={true}` to create a unified button group where buttons
 * appear connected together.
 */
export const ButtonBar = React.forwardRef<HTMLDivElement, ButtonBarProps>(
  ({ className, gap = "md", merged = false, children, ...props }, ref) => {
    if (merged) {
      return (
        <div
          ref={ref}
          className={cn(
            "inline-flex",
            "[&>*:first-child]:rounded-r-none",
            "[&>*:last-child]:rounded-l-none",
            "[&>*:not(:first-child):not(:last-child)]:rounded-none",
            "[&>*:not(:first-child)]:-ml-px",
            className,
          )}
          {...props}
        >
          {children}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn("inline-flex", gapMap[gap], className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

ButtonBar.displayName = "ButtonBar";
