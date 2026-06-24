import type { ReactElement } from "react";
import { cx } from "../utilities/cx";
import { polymorphicElement } from "../utilities/polymorphic";
import { spaceVar, type StyleWithVars } from "../utilities/props";
import type { BaseLayoutProps, Space } from "./types";

type BoxProps = BaseLayoutProps & {
  p?: Space;
  px?: Space;
  py?: Space;
  pt?: Space;
  pr?: Space;
  pb?: Space;
  pl?: Space;
  style?: StyleWithVars;
};

function paddingStyle(
  p?: Space,
  px?: Space,
  py?: Space,
  pt?: Space,
  pr?: Space,
  pb?: Space,
  pl?: Space,
  style?: StyleWithVars,
): StyleWithVars {
  const s: StyleWithVars = { ...(style ?? {}) };
  if (p != null) s["--ps-p"] = spaceVar(p);
  if (px != null) s["--ps-px"] = spaceVar(px);
  if (py != null) s["--ps-py"] = spaceVar(py);
  if (pt != null) s["--ps-pt"] = spaceVar(pt);
  if (pr != null) s["--ps-pr"] = spaceVar(pr);
  if (pb != null) s["--ps-pb"] = spaceVar(pb);
  if (pl != null) s["--ps-pl"] = spaceVar(pl);
  return s;
}

export function Box({
  as,
  className,
  p,
  px,
  py,
  pt,
  pr,
  pb,
  pl,
  style,
  children,
  ...rest
}: BoxProps): ReactElement {
  return polymorphicElement(
    as,
    "div",
    {
      className: cx("ps-box", className),
      style: paddingStyle(p, px, py, pt, pr, pb, pl, style),
      ...rest,
    },
    children,
  );
}