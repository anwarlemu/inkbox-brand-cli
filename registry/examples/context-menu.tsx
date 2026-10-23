"use client";

import * as React from "react";
import { ArchiveIcon, ArrowBendUpLeftIcon, ArrowBendUpRightIcon, EnvelopeOpenIcon, ProhibitIcon, TrashIcon, WarningIcon } from "@phosphor-icons/react/ssr";

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export function Preview() {
  const [starred, setStarred] = React.useState(false);
  const [folder, setFolder] = React.useState("inbox");
  return (
    <ContextMenu>
      <ContextMenuTrigger className="mx-auto grid w-full max-w-96 gap-1 rounded-control bg-subtle p-3">
        <span className="flex justify-between text-body text-fg">
          Ray Liao <span className="text-fg-muted">Yesterday</span>
        </span>
        <span className="text-body text-fg">Inkbox A2A: publish your Agent Card</span>
        <span className="truncate text-body text-fg-brand">Hello @acme, This is Ray, cofounder of Inkbox.</span>
        <span className="mt-2 text-caption text-fg-muted">Right-click or long-press the email</span>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-60">
        <ContextMenuItem>
          <ArrowBendUpLeftIcon />
          Reply
          <ContextMenuShortcut>R</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>
          <ArrowBendUpRightIcon />
          Forward
          <ContextMenuShortcut>F</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>
          <EnvelopeOpenIcon weight="fill" />
          Mark as unread
        </ContextMenuItem>
        <ContextMenuCheckboxItem checked={starred} onCheckedChange={(v) => setStarred(v === true)}>
          Starred
        </ContextMenuCheckboxItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <ArchiveIcon weight="fill" />
            Move to
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            <ContextMenuLabel>Folders</ContextMenuLabel>
            <ContextMenuRadioGroup value={folder} onValueChange={setFolder}>
              <ContextMenuRadioItem value="inbox">Inbox</ContextMenuRadioItem>
              <ContextMenuRadioItem value="sent">Sent</ContextMenuRadioItem>
              <ContextMenuRadioItem value="spam">Spam</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem>
          <WarningIcon weight="fill" />
          Report spam
        </ContextMenuItem>
        <ContextMenuItem>
          <ProhibitIcon />
          Block sender
        </ContextMenuItem>
        <ContextMenuItem variant="destructive">
          <TrashIcon weight="fill" />
          Delete
          <ContextMenuShortcut>⌫</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
