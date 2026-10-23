import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Preview() {
  return (
    <div className="grid w-full max-w-86 gap-1">
      <Label htmlFor="vault-key">Vault key</Label>
      <Input id="vault-key" type="password" placeholder="Enter a vault key" />
    </div>
  );
}
