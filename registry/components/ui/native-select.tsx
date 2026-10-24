import * as React from "react";
import { CaretDownIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

// The browser's own select dressed as the console's select ("Any State", "Shared" in Create Agent Identity): a white
// 40px field with 8px corners and the Shadow/S ring, 14px ink at 14px from the left and a 20px ink caret 12px from the
// right. `size="sm"` is 36px. Use it where the platform picker is better (phones, long lists, forms without script).
type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & { size?: "sm" | "default" };

function NativeSelect({ className, size = "default", ...props }: NativeSelectProps) {
  return (
    <div data-slot="native-select-wrapper" data-size={size} className={cn("group/native-select relative w-fit has-[select:disabled]:opacity-50", className)}>
      <select
        data-slot="native-select"
        data-size={size}
        className="h-10 w-full min-w-0 cursor-pointer appearance-none rounded-pill bg-surface py-0 pr-10 pl-3.5 font-sans text-body leading-tight text-fg shadow-s outline-none transition-[box-shadow] duration-150 ease-out focus-visible:shadow-[var(--ds-shadow-s),var(--ds-shadow-focus)] disabled:cursor-not-allowed aria-invalid:shadow-[0_0_0_1px_var(--ds-color-status-danger)] data-[size=sm]:h-9 motion-reduce:transition-none"
        {...props}
      />
      <CaretDownIcon aria-hidden data-slot="native-select-icon" weight="bold" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg" />
    </div>
  );
}

function NativeSelectOption({ className, ...props }: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" className={cn("bg-surface text-fg", className)} {...props} />;
}

function NativeSelectOptGroup({ className, ...props }: React.ComponentProps<"optgroup">) {
  return <optgroup data-slot="native-select-optgroup" className={cn("bg-surface text-fg", className)} {...props} />;
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
