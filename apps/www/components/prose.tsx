// Inline code in docs text: IBM Plex Mono on the lilac with 4px corners, kept whole across a line break.
export function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="rounded-xs bg-subtle px-1 py-px font-mono text-body-sm text-fg [box-decoration-break:clone] [overflow-wrap:anywhere]">{children}</code>;
}

// Docs text from the registry's frontmatter: `backticked` names become inline code.
export function Prose({ text }: { text: string }) {
  return <>{Array.from(text.matchAll(/`([^`]+)`|([^`]+|`)/g), (match) => (match[1] !== undefined ? <InlineCode key={match.index}>{match[1]}</InlineCode> : match[0]))}</>;
}
