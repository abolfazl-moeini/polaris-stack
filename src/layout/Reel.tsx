import type { ReactElement } from "react";
import { cx } from "../utilities/cx";
import { polymorphicElement } from "../utilities/polymorphic";
import { spaceVar, type StyleWithVars } from "../utilities/props";
import type { BaseLayoutProps, Space } from "./types";

type ReelProps = BaseLayoutProps & {
  gap?: Space;
  style?: StyleWithVars;
};

export function Reel({
  as,
  gap = "4",
  className,
  style,
  children,
  ...rest
}: ReelProps): ReactElement {
  return polymorphicElement(
    as,
    "div",
    {
      className: cx("ps-reel", className),
      style: { ...style, "--ps-gap": spaceVar(gap) },
      ...rest,
    },
    children,
  );
}