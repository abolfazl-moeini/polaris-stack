import type { ReactElement } from "react";
import { cx } from "../utilities/cx";
import { polymorphicElement } from "../utilities/polymorphic";
import { spaceVar, type StyleWithVars } from "../utilities/props";
import type { BaseLayoutProps, Space } from "./types";

type SwitcherProps = BaseLayoutProps & {
  gap?: Space;
  threshold?: string;
  limit?: number;
  style?: StyleWithVars;
};

export function Switcher({
  as,
  gap = "4",
  threshold = "30rem",
  limit,
  className,
  style,
  children,
  ...rest
}: SwitcherProps): ReactElement {
  return polymorphicElement(
    as,
    "div",
    {
      className: cx("ps-switcher", className),
      ...(limit != null ? { "data-limit": limit } : {}),
      style: {
        ...style,
        "--ps-gap": spaceVar(gap),
        "--ps-threshold": threshold,
        ...(limit != null ? { "--ps-limit": String(limit) } : {}),
      },
      ...rest,
    },
    children,
  );
}