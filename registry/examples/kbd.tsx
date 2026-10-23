import { Kbd, KbdGroup } from "@/components/ui/kbd";

export function Preview() {
  return (
    <div className="grid gap-3 text-body text-fg-secondary">
      <p className="flex items-center gap-2">
        Compose an email
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>N</Kbd>
        </KbdGroup>
      </p>
      <p className="flex items-center gap-2">
        Search mailboxes
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </p>
      <p className="flex items-center gap-2">
        Close a dialog <Kbd>Esc</Kbd>
      </p>
    </div>
  );
}
