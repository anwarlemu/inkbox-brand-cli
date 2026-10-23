import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function Preview() {
  return (
    <div className="grid w-full max-w-100.5 gap-1">
      <Label htmlFor="description">Agent description</Label>
      <Textarea id="description" placeholder="Agent Description" />
    </div>
  );
}

export function States() {
  return (
    <div className="grid w-full max-w-100.5 gap-3">
      <Textarea aria-label="Note" defaultValue="Answers billing questions for Baked Design and forwards anything about refunds to Robert." />
      <Textarea aria-label="Invalid note" defaultValue="" placeholder="Required" aria-invalid />
      <Textarea aria-label="Read-only" readOnly defaultValue="Created by the Inkbox CLI on Jul 27, 2026." />
      <Textarea aria-label="Disabled" disabled placeholder="Disabled" />
    </div>
  );
}
