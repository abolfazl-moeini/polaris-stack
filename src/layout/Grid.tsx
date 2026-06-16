import type { ElementType } from "react";
import { cx } from "../utilities/cx";
import { spaceVar, type StyleWithVars } from "../utilities/props";
import type { BaseLayoutProps, Space } from "./types";

type GridProps = BaseLayoutProps & {
  gap?: Space;
  min?: string;
  style?: StyleWithVars;
};

export function Grid({
  as: Comp = "div",
  gap = "4",
  min = "16rem",
  className,
  style,
  children,
  ...rest
}: GridProps) {
  const C: any = Comp;
  const inlineStyle: StyleWithVars = {
    ...style,
    "--ps-gap": spaceVar(gap),
    "--ps-min": min,
  };
  return (
    <C className={cx("ps-grid", className)} style={inlineStyle} {...rest}>
      {children}
    </C>
  );
}
