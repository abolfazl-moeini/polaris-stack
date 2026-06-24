import type { ReactElement } from "react";
import { cx } from "../utilities/cx";
import { polymorphicElement } from "../utilities/polymorphic";
import { spaceVar, type StyleWithVars } from "../utilities/props";
import type { BaseLayoutProps, Space } from "./types";

type ContainerProps = BaseLayoutProps & {
  max?: string;
  gutters?: Space;
  style?: StyleWithVars;
};

export function Container({
  as,
  max = "var(--ps-size-content)",
  gutters,
  className,
  style,
  children,
  ...rest
}: ContainerProps): ReactElement {
  const inlineStyle: StyleWithVars = {
    ...style,
    "--ps-max": max,
  };
  if (gutters != null) {
    inlineStyle["--ps-gutters"] = spaceVar(gutters);
  }
  return polymorphicElement(
    as,
    "div",
    {
      className: cx("ps-container", className),
      style: inlineStyle,
      ...rest,
    },
    children,
  );
}