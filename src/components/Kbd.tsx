import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cx } from "../utilities/cx";

type KbdProps = HTMLAttributes<HTMLElement> & {
  children?: ReactNode;
};

export function Kbd({ className, children, ...rest }: KbdProps): ReactElement {
  return (
    <kbd className={cx("ps-kbd", className)} {...rest}>
      {children}
    </kbd>
  );
}