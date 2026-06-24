import type {
  ButtonHTMLAttributes,
  ElementType,
  HTMLAttributes,
  ReactElement,
  ReactNode,
} from "react";
import { cx } from "../utilities/cx";
import { polymorphicElement } from "../utilities/polymorphic";

export type ButtonVariant = "solid" | "soft" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  as?: ElementType;
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children?: ReactNode;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> &
  Omit<HTMLAttributes<HTMLElement>, "children" | "className">;

export function Button({
  as,
  variant = "solid",
  size = "md",
  block = false,
  loading = false,
  leadingIcon,
  trailingIcon,
  className,
  type = "button",
  disabled,
  children,
  ...rest
}: ButtonProps): ReactElement {
  const isButton = (as ?? "button") === "button";
  const props: Record<string, unknown> = {
    className: cx(
      "ps-button",
      `ps-button-${variant}`,
      `ps-button-${size}`,
      block && "ps-button-block",
      loading && "ps-button-loading",
      className,
    ),
    "aria-busy": loading || undefined,
    disabled: disabled || loading || undefined,
    ...rest,
  };

  if (isButton) {
    props.type = type;
  }

  return polymorphicElement(
    as,
    "button",
    props,
    <>
      {leadingIcon ? (
        <span className="ps-button-icon" aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}
      {children}
      {trailingIcon ? (
        <span className="ps-button-icon" aria-hidden="true">
          {trailingIcon}
        </span>
      ) : null}
    </>,
  );
}