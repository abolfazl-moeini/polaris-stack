import type { ElementType, HTMLAttributes, ReactElement, ReactNode } from "react";
import { cx } from "../utilities/cx";

type TextProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  children?: ReactNode;
};

export function Text({
  as: Comp = "p",
  className,
  children,
  ...rest
}: TextProps): ReactElement {
  const C: any = Comp;
  return (
    <C className={cx("ps-text", className)} {...rest}>
      {children}
    </C>
  );
}
