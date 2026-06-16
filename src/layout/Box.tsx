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
  if (props.p != null) s.padding = spaceVar(props.p);
  if (props.px != null) s.paddingInline = spaceVar(props.px);
  if (props.py != null) s.paddingBlock = spaceVar(props.py);
  if (props.pt != null) s.paddingBlockStart = spaceVar(props.pt);
  if (props.pr != null) s.paddingInlineEnd = spaceVar(props.pr);
  if (props.pb != null) s.paddingBlockEnd = spaceVar(props.pb);
  if (props.pl != null) s.paddingInlineStart = spaceVar(props.pl);
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
}: BoxProps) {
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
