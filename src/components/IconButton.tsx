import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import { cx } from "../utilities/cx";
import type { ButtonVariant } from "./Button";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  label: string;
  children?: ReactNode;
};

export function IconButton({
  variant = "ghost",
  label,
  className,
  type = "button",
  children,
  ...rest
}: IconButtonProps): ReactElement {
  return (
    <button
      type={type}
      aria-label={label}
      className={cx(
        "ps-button",
        "ps-button-icon-only",
        `ps-button-${variant}`,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}