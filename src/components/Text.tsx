import type { ElementType, HTMLAttributes, ReactElement, ReactNode } from "react";
import { cx } from "../utilities/cx";
import { polymorphicElement } from "../utilities/polymorphic";

export type TextSize = "xs" | "sm" | "base" | "lg" | "xl";
export type TextWeight = "normal" | "medium" | "semibold" | "bold";
export type TextTone = "default" | "muted" | "subtle" | "strong";

type TextProps = {
  as?: ElementType;
  size?: TextSize;
  weight?: TextWeight;
  truncate?: boolean;
  tone?: TextTone;
  children?: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className">;

export function Text({
  as = "p",
  size = "base",
  weight = "normal",
  truncate = false,
  tone = "default",
  className,
  children,
  ...rest
}: TextProps): ReactElement {
  return polymorphicElement(
    as,
    "p",
    {
      className: cx(
        "ps-text",
        `ps-text-${size}`,
        `ps-text-weight-${weight}`,
        `ps-text-tone-${tone}`,
        truncate && "ps-text-truncate",
        className,
      ),
      ...rest,
    },
    children,
  );
}