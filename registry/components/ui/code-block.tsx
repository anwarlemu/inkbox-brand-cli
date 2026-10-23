"use client";

import * as React from "react";
import { BracketsCurlyIcon, CheckIcon, CopyIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

// The event catalog's code block (Figma 427:2715, Webhooks: Signature headers, Payload example): 8px corners and the
// editor's gray edge, a 40px gray head with the language (yellow braces for JSON) and a purple copy glyph, then the
// off-white body in the system monospace at 14px on 20px lines, line numbers in the editor's teal (the first line's
// darker), and the Light+ colors: red keys, blue values and braces. Long lines scroll, or wrap with `wrap`.
function CodeBlock({ className, ...props }: React.ComponentProps<"figure">) {
  return <figure data-slot="code-block" className={cn("group/code-block m-0 flex w-full min-w-0 flex-col overflow-hidden rounded-control border border-line-code bg-code text-code-text", className)} {...props} />;
}

function CodeBlockHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="code-block-header" className={cn("flex h-10 min-w-0 shrink-0 items-center gap-2 border-b border-line-code bg-code-head pr-1.5 pl-3", className)} {...props} />;
}

function CodeBlockTitle({ className, children, language, ...props }: React.ComponentProps<"figcaption"> & { language?: string }) {
  return (
    <figcaption data-slot="code-block-title" className={cn("flex min-w-0 items-center gap-2 font-sans text-body leading-tight text-code-head-fg [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className)} {...props}>
      {language === "json" && <BracketsCurlyIcon aria-hidden className="text-code-brace" />}
      <span className="truncate">{children}</span>
    </figcaption>
  );
}

function CodeBlockActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="code-block-actions" className={cn("ml-auto flex shrink-0 items-center gap-1", className)} {...props} />;
}

function CodeBlockCopyButton({ value, className, ...props }: Omit<React.ComponentProps<"button">, "value" | "children"> & { value: string }) {
  const [state, setState] = React.useState<"idle" | "copied" | "failed">("idle");
  React.useEffect(() => {
    if (state === "idle") return;
    const timeout = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(timeout);
  }, [state]);
  return (
    <>
      <button
        type="button"
        data-slot="code-block-copy-button"
        data-copied={state === "copied" || undefined}
        aria-label={state === "copied" ? "Copied" : "Copy code"}
        onClick={() => navigator.clipboard.writeText(value).then(() => setState("copied"), () => setState("failed"))}
        className={cn("inline-flex size-8 items-center justify-center rounded-control text-fg-brand outline-none transition-[background-color,scale] duration-150 ease-out hover:bg-surface active:scale-97 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring motion-reduce:transition-none", className)}
        {...props}
      >
        {state === "copied" ? <CheckIcon className="size-4.5" weight="bold" /> : <CopyIcon className="size-4.5" weight="duotone" />}
      </button>
      <span aria-live="polite" className="sr-only">
        {state === "copied" ? "Copied" : state === "failed" ? "Copy failed. Select the code and copy it." : ""}
      </span>
    </>
  );
}

type Kind = "key" | "string" | "punct" | "keyword" | "comment" | "number" | "function" | "type" | "tag" | "attr" | "plain";
const COLOR: Record<Kind, string | undefined> = {
  key: "text-code-key",
  string: "text-code-string",
  punct: "text-code-punct",
  keyword: "text-code-keyword",
  comment: "text-code-comment",
  number: "text-code-number",
  function: "text-code-function",
  type: "text-code-type",
  tag: "text-code-tag",
  attr: "text-code-attr",
  plain: undefined,
};

const KEYWORDS = /^(?:import|from|export|default|function|return|const|let|var|if|else|for|of|in|new|type|interface|extends|as|async|await|true|false|null|undefined|class|this|throw|try|catch)$/;

/** Splits code into colored runs for the Light+ theme. JSON keys are red and values blue; in scripts strings are red. */
function tokenize(code: string, language: string): { kind: Kind; text: string }[] {
  const out: { kind: Kind; text: string }[] = [];
  const push = (kind: Kind, text: string) => (text ? out.push({ kind, text }) : undefined);
  if (language === "json") {
    for (const m of code.matchAll(/("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false|null)|([{}[\]])|([^"{}[\]\d\-tfn]+|[\s\S])/g)) {
      if (m[1]) {
        push(m[2] ? "key" : "string", m[1]);
        push("plain", m[2] ?? "");
      } else if (m[3]) push("number", m[3]);
      else if (m[4]) push("keyword", m[4]);
      else if (m[5]) push("punct", m[5]);
      else push("plain", m[0]);
    }
    return out;
  }
  if (language === "bash" || language === "sh" || language === "shell") {
    for (const line of code.split(/(\n)/)) {
      if (line === "\n") push("plain", line);
      else if (/^\s*#/.test(line)) push("comment", line);
      else
        for (const [i, m] of [...line.matchAll(/("[^"]*"|'[^']*')|(\s--?[\w-]+)|(\S+|\s+)/g)].entries()) {
          if (m[1]) push("string", m[1]);
          else if (m[2]) push("keyword", m[2]);
          else push(i === 0 || (i === 1 && /^\s/.test(line)) ? "function" : "plain", m[0]);
        }
    }
    return out;
  }
  const pattern = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(<\/?)([A-Za-z][\w.]*)|([A-Za-z_$][\w-]*)(=)|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Z][\w$]*)|([A-Za-z_$][\w$]*)|([\s\S])/g;
  for (const m of code.matchAll(pattern)) {
    if (m[1]) push("comment", m[1]);
    else if (m[2]) push("string", m[2]);
    else if (m[3]) {
      push("punct", m[3]);
      push("tag", m[4]);
    } else if (m[5]) {
      push("attr", m[5]);
      push("plain", m[6]);
    } else if (m[7]) push("number", m[7]);
    else if (m[8]) push(KEYWORDS.test(m[8]) ? "keyword" : "function", m[8]);
    else if (m[9]) push("type", m[9]);
    else if (m[10]) push(KEYWORDS.test(m[10]) ? "keyword" : "plain", m[10]);
    else push("plain", m[11]);
  }
  return out.map((t) => (t.kind === "string" ? { ...t, kind: "key" as Kind } : t));
}

/**
 * The code itself. Pass the text as `code` and its `language` (json, tsx, ts, css, bash); line numbers show by default.
 * `wrap` breaks long lines instead of scrolling; `maxHeight` scrolls a long file inside the block.
 */
function CodeBlockContent({ code, language = "tsx", lineNumbers = true, wrap = false, className, ...props }: Omit<React.ComponentProps<"pre">, "children"> & { code: string; language?: string; lineNumbers?: boolean; wrap?: boolean }) {
  const lines = React.useMemo(() => {
    const rows: { kind: Kind; text: string }[][] = [[]];
    for (const token of tokenize(code.replace(/\n$/, ""), language)) {
      const parts = token.text.split("\n");
      parts.forEach((part, i) => {
        if (i > 0) rows.push([]);
        if (part) rows[rows.length - 1].push({ kind: token.kind, text: part });
      });
    }
    return rows;
  }, [code, language]);
  return (
    <pre
      data-slot="code-block-content"
      tabIndex={0}
      className={cn("m-0 overflow-auto bg-code py-3 font-code text-body leading-5 outline-none [scrollbar-width:thin] [tab-size:2] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring", className)}
      {...props}
    >
      <code className={cn("grid", wrap ? "min-w-0" : "min-w-max")}>
        {lines.map((line, i) => (
          <span key={i} className={cn("grid", lineNumbers ? "grid-cols-[3rem_minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)] pl-4", wrap && "min-w-0")}>
            {lineNumbers && (
              <span aria-hidden className={cn("pr-4 text-right select-none", i === 0 ? "text-code-line-active" : "text-code-line")}>
                {i + 1}
              </span>
            )}
            <span className={cn("pr-4", wrap ? "break-all whitespace-pre-wrap" : "whitespace-pre")}>
              {line.length ? line.map((t, j) => (
                <span key={j} className={COLOR[t.kind]}>
                  {t.text}
                </span>
              )) : "\u200b"}
            </span>
          </span>
        ))}
      </code>
    </pre>
  );
}

export { CodeBlock, CodeBlockActions, CodeBlockContent, CodeBlockCopyButton, CodeBlockHeader, CodeBlockTitle, tokenize };
