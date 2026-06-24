import type { ReactElement } from "react";
import { cx } from "../utilities/cx";
import { polymorphicElement } from "../utilities/polymorphic";
import type { StyleWithVars } from "../utilities/props";
import type { BaseLayoutProps } from "./types";

type DividerProps = BaseLayoutProps & {
  size?: string;
  style?: StyleWithVars;
};

export function Divider({
  as,
  size,
  className,
  style,
  ...rest
}: DividerProps): ReactElement {
  const inlineStyle: StyleWithVars = { ...style };
  if (size != null) {
    inlineStyle["--ps-divider-size"] = size;
  }
  return polymorphicElement(as, "hr", {
    className: cx("ps-divider", className),
    style: inlineStyle,
    ...rest,
  });
}