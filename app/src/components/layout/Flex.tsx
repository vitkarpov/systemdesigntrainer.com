import { type ReactNode, type ElementType } from "react";
import { cn } from "@/lib/utils";

type Spacing =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "8"
  | "10"
  | "12"
  | "16"
  | "20";
type FlexDirection = "row" | "row-reverse" | "col" | "col-reverse";
type AlignItems = "start" | "center" | "end" | "baseline" | "stretch";
type JustifyContent =
  | "start"
  | "center"
  | "end"
  | "between"
  | "around"
  | "evenly";
type FlexWrap = "wrap" | "wrap-reverse" | "nowrap";

interface FlexProps<T extends ElementType = "div"> {
  children: ReactNode;
  as?: T;
  className?: string;
  direction?: FlexDirection;
  align?: AlignItems;
  justify?: JustifyContent;
  wrap?: FlexWrap;
  gap?: Spacing;
  inline?: boolean;
}

const spacingMap: Record<Spacing, string> = {
  "0": "gap-0",
  "1": "gap-1",
  "2": "gap-2",
  "3": "gap-3",
  "4": "gap-4",
  "5": "gap-5",
  "6": "gap-6",
  "8": "gap-8",
  "10": "gap-10",
  "12": "gap-12",
  "16": "gap-16",
  "20": "gap-20",
};

const directionMap: Record<FlexDirection, string> = {
  row: "flex-row",
  "row-reverse": "flex-row-reverse",
  col: "flex-col",
  "col-reverse": "flex-col-reverse",
};

const alignMap: Record<AlignItems, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  baseline: "items-baseline",
  stretch: "items-stretch",
};

const justifyMap: Record<JustifyContent, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

const wrapMap: Record<FlexWrap, string> = {
  wrap: "flex-wrap",
  "wrap-reverse": "flex-wrap-reverse",
  nowrap: "flex-nowrap",
};

export function Flex<T extends ElementType = "div">({
  children,
  as,
  className,
  direction = "row",
  align,
  justify,
  wrap,
  gap,
  inline = false,
}: FlexProps<T>) {
  const Component = as || "div";

  const classes = cn(
    // Display
    inline ? "inline-flex" : "flex",
    // Direction
    directionMap[direction],
    // Alignment
    align && alignMap[align],
    // Justify
    justify && justifyMap[justify],
    // Wrap
    wrap && wrapMap[wrap],
    // Gap
    gap && spacingMap[gap],
    className,
  );

  return <Component className={classes}>{children}</Component>;
}
