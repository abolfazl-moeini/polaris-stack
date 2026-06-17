import type { ReactElement } from "react";
import { cx } from "../utilities/cx";
import { spaceVar, type StyleWithVars } from "../utilities/props";
import type { BaseLayoutProps, Space } from "./types";

type CenterProps = BaseLayoutProps & {
  max?: string;
  gutters?: Space;
  style?: StyleWithVars;
};

export function Center({
  as: Comp = "div",
  max = "var(--ps-size-content)",
  gutters,
  className,
  style,
  children,
  ...rest
}: CenterProps): ReactElement {
  const C: any = Comp;
  const inlineStyle: StyleWithVars = {
    ...style,
    "--ps-max": max,
  };
  if (gutters != null) {
    inlineStyle["--ps-gutters"] = spaceVar(gutters);
  }
  return (
    <C className={cx("ps-center", className)} style={inlineStyle} {...rest}>
      {children}
    </C>
  );
}
