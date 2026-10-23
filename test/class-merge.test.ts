import { readFileSync } from "node:fs";
import { libraryClasses } from "../src/library/adapt";
import { expect, it } from "vitest";
import ts from "typescript";
import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { cn } from "../registry/lib/utils";
import { patchUtils } from "../src/library/swap";

const old = `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export const untouched = 42;`;
function load(source: string) {
  const js = ts.transpileModule(source.replace(/^import .*;$/gm, "").replaceAll("export ", ""), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return Function("clsx", "extendTailwindMerge", `${js}; return {cn, untouched};`)(clsx, extendTailwindMerge);
}
for (const [name, merge] of [["registry", cn], ["CLI", load(patchUtils(old)!).cn]] as const) {
  it(`${name} preserves explicit line height with brand sizes in either order`, () => {
    expect(merge("leading-none text-h5 text-fg")).toBe("leading-none text-h5 text-fg");
    expect(merge("leading-none text-body-sm leading-body")).toBe("text-body-sm leading-body");
    expect(merge("tracking-tight tracking-label")).toBe("tracking-label");
    expect(merge("text-h5 leading-snug")).toBe("text-h5 leading-snug");
    expect(merge("leading-snug", "text-body-sm")).toBe("leading-snug text-body-sm");
    expect(merge("text-body text-h5")).toBe("text-h5");
    expect(merge("text-xl text-h5")).toBe("text-h5");
    expect(merge("text-h5 text-xl")).toBe("text-xl");
    expect(merge("leading-none text-h5/6")).toBe("text-h5/6");
    expect(merge("text-h5/6 leading-snug")).toBe("text-h5/6 leading-snug");
  });
}
it("upgrades the previous generated helper once and preserves other exports", () => {
  const legacy = `import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["body", "h5"] }] } },
});
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export const untouched = 42;`;
  const patched = patchUtils(legacy)!;
  expect(load(patched).cn("leading-none text-h5")).toBe("leading-none text-h5");
  expect(load(patched).untouched).toBe(42);
  expect(patchUtils(patched)).toBeUndefined();
});

it("the CLI fallback can extract the form label appearance", () => {
  const source = readFileSync(new URL("../registry/components/ui/label.tsx", import.meta.url), "utf8");
  const classes = libraryClasses(source, "Label", () => undefined);
  expect(classes).toContain("font-display text-caption leading-normal text-fg-muted");
});
