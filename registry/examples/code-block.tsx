import { CodeBlock, CodeBlockActions, CodeBlockContent, CodeBlockCopyButton, CodeBlockHeader, CodeBlockTitle } from "@/components/ui/code-block";

const HEADERS = `{
  "X-Inkbox-Request-ID": "b4f64d39-7cf0-4c89-b2fa-3522091e979d",
  "X-Inkbox-Timestamp": "1764875501",
  "X-Inkbox-Signature": "sha256=2f8d6b7f37b7d6461f7b8a91f4f495eb54f60af8f4a1f9d3edfdc7d2adf237f2"
}`;

const SNIPPET = `import { Inkbox } from "@inkbox/sdk";

// Send the agent's first email.
const inkbox = new Inkbox({ apiKey: process.env.INKBOX_API_KEY });
await inkbox.mail.send({ to: "you@example.com", subject: "Hello" });`;

export function Preview() {
  return (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle language="json">JSON</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={HEADERS} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent code={HEADERS} language="json" wrap />
    </CodeBlock>
  );
}

export function Script() {
  return (
    <CodeBlock>
      <CodeBlockHeader>
        <CodeBlockTitle>send.ts</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={SNIPPET} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent code={SNIPPET} language="ts" />
    </CodeBlock>
  );
}
