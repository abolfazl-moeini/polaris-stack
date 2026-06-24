import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cx } from "../utilities/cx";
import type { TextSize } from "./Text";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

type HeadingProps = Omit<HTMLAttributes<HTMLHeadingElement>, "children"> & {
  level?: HeadingLevel;
  size?: TextSize;
  children?: ReactNode;
  className?: string;
};

const TAGS: Record<HeadingLevel, "h1" | "h2" | "h3" | "h4" | "h5" | "h6"> = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
};

const SIZE_CLASS: Record<TextSize, string> = {
  xs: "ps-heading-6",
  sm: "ps-heading-5",
  base: "ps-heading-4",
  lg: "ps-heading-3",
  xl: "ps-heading-1",
};

export function Heading({
  level = 2,
  size,
  className,
  children,
  ...rest
}: HeadingProps): ReactElement {
  const Tag = TAGS[level];
  const visualClass = size != null ? SIZE_CLASS[size] : `ps-heading-${level}`;
  return (
    <Tag className={cx("ps-heading", visualClass, className)} {...rest}>
      {children}
    </Tag>
  );
}