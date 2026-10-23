import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";

export function Preview() {
  return (
    <div className="grid w-full max-w-114.5 gap-1">
      <Label htmlFor="state">Phone number state</Label>
      <NativeSelect id="state" defaultValue="any" className="w-full">
        <NativeSelectOption value="any">Any State</NativeSelectOption>
        <NativeSelectOptGroup label="West">
          <NativeSelectOption value="ca">California</NativeSelectOption>
          <NativeSelectOption value="or">Oregon</NativeSelectOption>
          <NativeSelectOption value="wa">Washington</NativeSelectOption>
        </NativeSelectOptGroup>
        <NativeSelectOptGroup label="East">
          <NativeSelectOption value="ny">New York</NativeSelectOption>
          <NativeSelectOption value="ma">Massachusetts</NativeSelectOption>
        </NativeSelectOptGroup>
      </NativeSelect>
    </div>
  );
}

export function States() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <NativeSelect aria-label="Line" size="sm" defaultValue="shared">
        <NativeSelectOption value="shared">Shared</NativeSelectOption>
        <NativeSelectOption value="dedicated">Dedicated</NativeSelectOption>
      </NativeSelect>
      <NativeSelect aria-label="Disabled" disabled defaultValue="shared">
        <NativeSelectOption value="shared">Shared</NativeSelectOption>
      </NativeSelect>
      <NativeSelect aria-label="Invalid" aria-invalid defaultValue="">
        <NativeSelectOption value="" disabled>
          Choose a mode
        </NativeSelectOption>
        <NativeSelectOption value="edge">Edge</NativeSelectOption>
      </NativeSelect>
    </div>
  );
}
