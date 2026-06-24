type CxArg =
  | string
  | false
  | null
  | undefined
  | Record<string, boolean | undefined>
  | readonly CxArg[];

function flatten(args: readonly CxArg[]): string[] {
  const out: string[] = [];
  for (const arg of args) {
    if (!arg) continue;
    if (typeof arg === "string") {
      out.push(arg);
    } else if (Array.isArray(arg)) {
      out.push(...flatten(arg));
    } else if (typeof arg === "object") {
      for (const [key, on] of Object.entries(arg)) {
        if (on) out.push(key);
      }
    }
  }
  return out;
}

export function cx(...args: (CxArg | unknown)[]): string {
  return flatten(args as CxArg[]).join(" ");
}