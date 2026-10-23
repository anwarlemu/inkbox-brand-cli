"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

export function Preview() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Toaster />
      <Button
        variant="outline"
        onClick={() =>
          toast("Webhook paused", {
            description: "message.sent stops delivering to api.acme.dev.",
            action: { label: "Undo", onClick: () => toast.success("Webhook resumed") },
          })
        }
      >
        Pause webhook
      </Button>
      <Button variant="outline" onClick={() => toast.success("Agent created", { description: "@test-agent is ready to send its first email." })}>
        Success
      </Button>
      <Button variant="outline" onClick={() => toast.error("Handle not available", { description: "acme-support is taken. Try another." })}>
        Error
      </Button>
      <Button variant="outline" onClick={() => toast.warning("Copy this API key now", { description: "For security, the full key cannot be shown again." })}>
        Warning
      </Button>
      <Button variant="outline" onClick={() => toast.info("The vault is zero-knowledge", { description: "Encryption happens in your browser." })}>
        Info
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.promise(new Promise((resolve) => setTimeout(resolve, 1600)), {
            loading: "Provisioning phone line...",
            success: "Line +1 650 474 9720 is live",
            error: "Could not provision a line",
          })
        }
      >
        Promise
      </Button>
    </div>
  );
}
