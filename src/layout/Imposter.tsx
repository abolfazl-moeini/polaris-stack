import type { ReactElement } from "react";
import { cx } from "../utilities/cx";
import { polymorphicElement } from "../utilities/polymorphic";
import type { StyleWithVars } from "../utilities/props";
import type { BaseLayoutProps } from "./types";

type ImposterPosition = "center" | "start" | "end";

type ImposterProps = BaseLayoutProps & {
  position?: ImposterPosition;
  fixed?: boolean;
  style?: StyleWithVars;
};

const POSITION_MAP: Record<ImposterPosition, string> = {
  center: "center",
  start: "flex-start",
  end: "flex-end",
};

export function Imposter({
  as,
  position = "center",
  fixed = false,
  className,
  style,
  children,
  ...rest
}: ImposterProps): ReactElement {
  return polymorphicElement(
    as,
    "div",
    {
      className: cx("ps-imposter", fixed && "ps-imposter-fixed", className),
      style: {
        ...style,
        "--ps-imposter-position": POSITION_MAP[position],
      },
      ...rest,
    },
    children,
  );
}