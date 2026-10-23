import { CodeBlock, CodeBlockActions, CodeBlockContent, CodeBlockCopyButton, CodeBlockHeader, CodeBlockTitle } from "@/components/ui/code-block";
import { cn } from "@/lib/utils";
import { CopyText } from "@www/components/copy-text";

/**
 * A page's head, as the console opens Vault and Webhooks: the 20px regular title, a 14px muted line under it, and the
 * header rule across the page. Actions sit at the right (Tunnel quickstart).
 */
export function PageHead({ title, description, eyebrow, children }: { title: React.ReactNode; description?: React.ReactNode; eyebrow?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="border-b border-line-subtle px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-body-sm leading-tight text-fg-label">{eyebrow}</p>}
          <h1 className="text-h3 leading-heading font-normal text-fg">{title}</h1>
          {description && <p className="mt-0.5 max-w-180 text-body leading-body text-fg-muted">{description}</p>}
        </div>
        {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
      </div>
    </header>
  );
}

/** The page's body, with the console's 24px sides. */
export function PageBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("grid gap-10 px-4 py-6 sm:px-6", className)}>{children}</div>;
}

/** A titled block of a page (Signature headers, Payload example): a 14px label over its content. */
export function Section({ id, title, description, children }: { id?: string; title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="grid min-w-0 scroll-mt-6 gap-3">
      <div>
        <h2 className="text-h4 leading-body font-medium text-fg">{title}</h2>
        {description && <p className="text-body text-fg-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** A shell command in the tunnel's copy box: the lilac well, the value in IBM Plex Mono, a purple copy glyph. */
export function Command({ command, className }: { command: string; className?: string }) {
  return <CopyText value={command} label="Copy command" className={className} />;
}

/** Code in the event catalog's code block, with its file name in the head. */
export function Code({ code, title, lang = "tsx", tall = false, className }: { code: string; title?: string; lang?: string; tall?: boolean; className?: string }) {
  const text = code.trim();
  return (
    <CodeBlock className={className}>
      <CodeBlockHeader>
        <CodeBlockTitle language={lang}>{title ?? lang.toUpperCase()}</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={text} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent code={text} language={lang} className={tall ? "max-h-140" : "max-h-96"} />
    </CodeBlock>
  );
}
