import type { ElementType, ReactElement, ReactNode } from "react";

/**
 * Single cast point for polymorphic `as` props. All layout primitives use this
 * instead of scattering `const C: any = Comp` across components.
 */
export function polymorphicElement(
  as: ElementType | undefined,
  defaultAs: ElementType,
  props: Record<string, unknown>,
  children?: ReactNode,
): ReactElement {
  const Component = as ?? defaultAs;
  const Tag = Component as ElementType & string;
  return <Tag {...props}>{children}</Tag>;
}