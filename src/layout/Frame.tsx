import type { ReactElement } from "react";
import { cx } from "../utilities/cx";
import { polymorphicElement } from "../utilities/polymorphic";
import type { StyleWithVars } from "../utilities/props";
import type { BaseLayoutProps } from "./types";

type FrameProps = BaseLayoutProps & {
  ratio?: string;
  style?: StyleWithVars;
};

export function Frame({
  as,
  ratio,
  className,
  style,
  children,
  ...rest
}: FrameProps): ReactElement {
  const inlineStyle: StyleWithVars = { ...style };
  if (ratio != null) {
    inlineStyle["--ps-frame-ratio"] = ratio;
  }
  return polymorphicElement(
    as,
    "div",
    {
      className: cx("ps-frame", className),
      style: inlineStyle,
      ...rest,
    },
    children,
  );
}