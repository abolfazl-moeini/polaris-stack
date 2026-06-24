import type { HTMLAttributes, ReactElement } from "react";
import { cx } from "../utilities/cx";

type SpinnerProps = HTMLAttributes<HTMLSpanElement> & {
  label?: string;
};

export function Spinner({
  label = "Loading",
  className,
  ...rest
}: SpinnerProps): ReactElement {
  return (
    <span
      role="status"
      aria-label={label}
      className={cx("ps-spinner", className)}
      {...rest}
    />
  );
}