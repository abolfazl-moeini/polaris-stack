// Polaris uses framework-neutral type imports from "react" (see v1.md).
// This build-time bridge makes `import type { ElementType, ReactNode, ... } from "react"`
// resolve to @preact/compat's types inside the wp-starter-kit monorepo (where "react"
// is aliased at runtime via package.json).
// 
// - This file lives at the package root (outside src/) so it is never copied by
//   the installer generator into consumer projects' src/polaris/.
// - It is not included in the published "files": ["dist"] tarball.
// - Consumer projects (real React or aliased Preact) supply their own "react" types
//   via peer / installed React; the emitted .d.ts files only reference "react".
//
// Keep this file in sync with the alias used by the kit root.

export * from "@preact/compat";

// Re-export JSX namespace types under the classic React.* names so that
// Polaris components can use `import type { ElementType, ReactNode, HTMLAttributes, ButtonHTMLAttributes, CSSProperties } from "react"`
// while running under the Preact alias (or real React at consumer side).
import type { JSX as PreactJSX } from "@preact/compat";

export type ElementType = keyof PreactJSX.IntrinsicElements | (new (props: any) => any) | ((props: any) => any);
export type ReactNode = PreactJSX.Element | string | number | boolean | null | undefined | ReactNode[];

export type HTMLAttributes<T extends EventTarget = EventTarget> = PreactJSX.HTMLAttributes<T>;
export type ButtonHTMLAttributes<T extends EventTarget = HTMLButtonElement> = PreactJSX.HTMLAttributes<T> & {
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: (e?: any) => void;
};

export type CSSProperties = PreactJSX.CSSProperties;

// Support automatic JSX runtime type lookup ("react/jsx-runtime") used by
// "jsx": "react-jsx" + tsc emitDeclarationOnly inside the package.
export const jsx: any;
export const jsxs: any;
export const Fragment: any;

// Provide JSX namespace members so that automatic JSX ("react-jsx") can
// type-check intrinsic elements and components when resolving jsx-runtime
// through our bridge during the package's declaration emit.
export namespace JSX {
  export type Element = PreactJSX.Element;
  export type ElementClass = PreactJSX.ElementClass;
  export interface IntrinsicElements extends PreactJSX.IntrinsicElements {
    // Broad fallback so package-local tsc (declaration emit) accepts all intrinsics
    // ("button", "div", "h1"…) regardless of how precisely Preact's JSX types
    // are surfaced through the alias/bridge. Consumers get accurate types from
    // their own "react" resolution.
    [elemName: string]: any;
  }
  export interface ElementAttributesProperty extends PreactJSX.ElementAttributesProperty {}
  export interface ElementChildrenAttribute extends PreactJSX.ElementChildrenAttribute {}
  export type LibraryManagedAttributes<C, P> = PreactJSX.LibraryManagedAttributes<C, P>;
}
