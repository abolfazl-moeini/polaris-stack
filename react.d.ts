// Build-time bridge: kit aliases react → @preact/compat. Not shipped in tarball.
import type * as React from "preact/compat";

export type ElementType = React.ElementType;
export type ReactNode = React.ReactNode;
export type ReactElement = React.ReactElement;
export type HTMLAttributes<T extends EventTarget = EventTarget> =
  React.HTMLAttributes<T>;
export type ButtonHTMLAttributes<T extends HTMLButtonElement = HTMLButtonElement> =
  React.ButtonHTMLAttributes<T>;
export type CSSProperties = React.CSSProperties;

export import JSX = React.JSX;

export { jsx, jsxs, Fragment } from "preact/jsx-runtime";