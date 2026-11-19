import { Cta } from "@/components/blocks/cta";
import { Button } from "@/components/ui/button";

export function Preview() {
  return (
    <Cta
      title="Create your first agent"
      description="Set up an identity to unlock mailbox, phone and vault features."
      actions={<Button>Get started free</Button>}
      // eslint-disable-next-line @next/next/no-img-element
      media={<img src="/octopus.png" alt="" width={160} height={142} className="h-auto w-40" />}
    />
  );
}
