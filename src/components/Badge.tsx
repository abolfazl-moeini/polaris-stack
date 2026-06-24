import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cx } from "../utilities/cx";

export type BadgeTone = "default" | "success" | "danger" | "warning" | "info";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  children?: ReactNode;
};

export function Badge({
  tone = "default",
  className,
  children,
  ...rest
}: BadgeProps): ReactElement {
  return (
    <span
      className={cx("ps-badge", `ps-badge-${tone}`, className)}
      {...rest}
    >
      {children}
    </span>
  );
}