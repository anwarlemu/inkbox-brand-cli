import { readFileSync } from "node:fs";
import path from "node:path";

export type Example = { id: string; command: string; src: string; width: number; height: number; video?: string; note?: string };
export type Examples = { image: Example[]; social: Example[]; deck: Example[]; video: Example[]; merch: Example[]; illustrations: Example[]; designs: Example[] };

// Written by scripts/assets-docs-examples.mjs, which runs the CLI itself.
export const examples = JSON.parse(readFileSync(path.join(process.cwd(), "public", "assets-examples", "examples.json"), "utf8")) as Examples;
