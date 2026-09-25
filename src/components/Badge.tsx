import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cx } from "../utilities/cx";

export type BadgeTone = "neutral" | "default" | "success" | "danger" | "warning" | "info";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  children?: ReactNode;
};

export function Badge({
  tone: rawTone = "neutral",
  className,
  children,
  ...rest
}: BadgeProps): ReactElement {
  const tone = rawTone === "default" ? "neutral" : rawTone;
  return (
    <span
      className={cx("ps-badge", `ps-badge-${tone}`, className)}
      {...rest}
    >
      {children}
    </span>
  );
}