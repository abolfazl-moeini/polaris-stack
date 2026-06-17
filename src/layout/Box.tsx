import type { ReactElement } from "react";
import { cx } from "../utilities/cx";
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

function paddingStyle(props: BoxProps): StyleWithVars {
  const s: StyleWithVars = { ...(props.style ?? {}) };
  if (props.p != null) s["--ps-p"] = spaceVar(props.p);
  if (props.px != null) s["--ps-px"] = spaceVar(props.px);
  if (props.py != null) s["--ps-py"] = spaceVar(props.py);
  if (props.pt != null) s["--ps-pt"] = spaceVar(props.pt);
  if (props.pr != null) s["--ps-pr"] = spaceVar(props.pr);
  if (props.pb != null) s["--ps-pb"] = spaceVar(props.pb);
  if (props.pl != null) s["--ps-pl"] = spaceVar(props.pl);
  return s;
}

export function Box({
  as: Comp = "div",
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
  const C: any = Comp;
  return (
    <C
      className={cx("ps-box", className)}
      style={paddingStyle({ p, px, py, pt, pr, pb, pl, style })}
      {...rest}
    >
      {children}
    </C>
  );
}
