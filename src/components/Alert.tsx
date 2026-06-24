import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cx } from "../utilities/cx";

export type AlertTone = "info" | "success" | "warning" | "danger";

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: AlertTone;
  children?: ReactNode;
};

export function Alert({
  tone = "info",
  className,
  children,
  role = "status",
  ...rest
}: AlertProps): ReactElement {
  return (
    <div
      role={role}
      className={cx("ps-alert", `ps-alert-${tone}`, className)}
      {...rest}
    >
      {children}
    </div>
  );
}