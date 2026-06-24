import type { ElementType, HTMLAttributes, ReactElement, ReactNode } from "react";
import { cx } from "../utilities/cx";
import { polymorphicElement } from "../utilities/polymorphic";

type CardElevation = 1 | 2 | 3 | 4;

type CardProps = {
  as?: ElementType;
  elevation?: CardElevation;
  interactive?: boolean;
  children?: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className">;

export function Card({
  as,
  elevation = 1,
  interactive = false,
  className,
  children,
  ...rest
}: CardProps): ReactElement {
  return polymorphicElement(
    as,
    "div",
    {
      className: cx(
        "ps-card",
        `ps-card-elevation-${elevation}`,
        interactive && "ps-card-interactive",
        className,
      ),
      ...(interactive ? { tabIndex: 0 } : {}),
      ...rest,
    },
    children,
  );
}