import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Preview() {
  return (
    <div className="grid w-full max-w-86 gap-1">
      <Label htmlFor="email">Email address</Label>
      <Input id="email" type="email" placeholder="your@email.com" autoComplete="email" />
    </div>
  );
}

export function States() {
  return (
    <div className="grid w-full max-w-100 gap-3">
      <Input aria-label="Agent display name" placeholder="Agent display name" />
      <Input aria-label="Agent handle" defaultValue="robert-baked-design" aria-invalid />
      <Input aria-label="Mailbox" defaultValue="robert-baked-design" readOnly />
      <Input aria-label="Disabled" placeholder="Disabled" disabled />
    </div>
  );
}
