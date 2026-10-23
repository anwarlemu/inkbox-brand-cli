import { ArrowsClockwiseIcon, GearSixIcon, InfoIcon, PencilSimpleIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function Preview() {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Edit mailbox">
              <PencilSimpleIcon weight="fill" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit mailbox</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Refresh">
              <ArrowsClockwiseIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Mailbox settings">
              <GearSixIcon weight="fill" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Mailbox settings</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export function Info() {
  return (
    <div className="flex min-h-40 items-start justify-center pt-14">
      <p className="flex items-center gap-1.5 text-body text-fg">
        Tunnel TLS mode
        <Tooltip defaultOpen>
          <TooltipTrigger className="rounded-pill text-fg-label outline-none focus-visible:outline-2 focus-visible:outline-focus-ring" aria-label="About TLS modes">
            <InfoIcon weight="fill" className="size-4.5" />
          </TooltipTrigger>
          <TooltipContent side="top">Edge ends TLS at Inkbox. Passthrough sends it to your agent.</TooltipContent>
        </Tooltip>
      </p>
    </div>
  );
}
