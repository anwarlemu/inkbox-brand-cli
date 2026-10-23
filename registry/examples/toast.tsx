"use client";

import { Button } from "@/components/ui/button";
import { ToastAction, Toaster, useToast } from "@/components/ui/toast";

export function Preview() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Toaster />
      <Button
        variant="outline"
        onClick={() =>
          toast({
            title: "Mailbox archived",
            description: "support@inkboxmail.com no longer receives mail.",
            action: <ToastAction altText="Undo the archive">Undo</ToastAction>,
          })
        }
      >
        Archive mailbox
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast({
            variant: "destructive",
            title: "Delivery failed",
            description: "api.acme.dev answered 500 three times.",
            action: <ToastAction altText="Retry the delivery">Retry</ToastAction>,
          })
        }
      >
        Destructive
      </Button>
      <Button variant="outline" onClick={() => toast({ title: "Contact rule saved" })}>
        Title only
      </Button>
    </div>
  );
}
