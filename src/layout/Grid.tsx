import type { ReactElement } from "react";
import { cx } from "../utilities/cx";
import { polymorphicElement } from "../utilities/polymorphic";
import { spaceVar, type StyleWithVars } from "../utilities/props";
import type { BaseLayoutProps, Space } from "./types";

type GridProps = BaseLayoutProps & {
  gap?: Space;
  min?: string;
  style?: StyleWithVars;
};

export function Grid({
  as,
  gap = "4",
  min,
  className,
  style,
  children,
  ...rest
}: GridProps): ReactElement {
  const inlineStyle: StyleWithVars = {
    ...style,
    "--ps-gap": spaceVar(gap),
  };
  if (min != null) {
    inlineStyle["--ps-min"] = min;
  }
  return polymorphicElement(
    as,
    "div",
    {
      className: cx("ps-grid", className),
      style: inlineStyle,
      ...rest,
    },
    children,
  );
}