import type { ReactElement } from "react";
import { cx } from "../utilities/cx";
import { polymorphicElement } from "../utilities/polymorphic";
import { spaceVar, type StyleWithVars } from "../utilities/props";
import type { BaseLayoutProps, Space } from "./types";

type ClusterJustify = "start" | "center" | "end" | "between";
type ClusterAlign = "start" | "center" | "end" | "stretch";

const JUSTIFY_MAP: Record<ClusterJustify, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
};

const ALIGN_MAP: Record<ClusterAlign, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
};

type ClusterProps = BaseLayoutProps & {
  gap?: Space;
  justify?: ClusterJustify;
  align?: ClusterAlign;
  style?: StyleWithVars;
};

export function Cluster({
  as,
  gap = "4",
  justify = "start",
  align = "center",
  className,
  style,
  children,
  ...rest
}: ClusterProps): ReactElement {
  return polymorphicElement(
    as,
    "div",
    {
      className: cx("ps-cluster", className),
      style: {
        ...style,
        "--ps-gap": spaceVar(gap),
        "--ps-justify": JUSTIFY_MAP[justify],
        "--ps-align": ALIGN_MAP[align],
      },
      ...rest,
    },
    children,
  );
}