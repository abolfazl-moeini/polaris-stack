import type { ReactElement } from "react";
import { cx } from "../utilities/cx";
import { polymorphicElement } from "../utilities/polymorphic";
import { spaceVar, type StyleWithVars } from "../utilities/props";
import type { BaseLayoutProps, Space } from "./types";

type CoverProps = BaseLayoutProps & {
  min?: string;
  gap?: Space;
  style?: StyleWithVars;
};

export function Cover({
  as,
  min = "var(--ps-size-cover)",
  gap = "4",
  className,
  style,
  children,
  ...rest
}: CoverProps): ReactElement {
  return polymorphicElement(
    as,
    "div",
    {
      className: cx("ps-cover", className),
      style: {
        ...style,
        "--ps-cover-min": min,
        "--ps-gap": spaceVar(gap),
      },
      ...rest,
    },
    children,
  );
}