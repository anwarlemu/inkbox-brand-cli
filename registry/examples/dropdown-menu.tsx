"use client";

import * as React from "react";
import { BuildingsIcon, DotsThreeIcon, GearSixIcon, KeyIcon, PencilSimpleIcon, QuestionIcon, SignOutIcon, TrashIcon, UsersThreeIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function AccountItems() {
  return (
    <>
      <DropdownMenuLabel>Robert Ligthart</DropdownMenuLabel>
      <DropdownMenuGroup>
        <DropdownMenuItem>
          <BuildingsIcon weight="fill" />
          My Organisation
          <DropdownMenuShortcut>⇧⌘O</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <KeyIcon weight="fill" />
          API Keys
          <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <UsersThreeIcon weight="fill" />
            Invite people
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>By email</DropdownMenuItem>
            <DropdownMenuItem>Copy invite link</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem>
          <GearSixIcon weight="fill" />
          Settings
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <QuestionIcon weight="fill" />
        Help
      </DropdownMenuItem>
      <DropdownMenuItem disabled>Billing (admins only)</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive">
        <SignOutIcon weight="fill" />
        Log out
      </DropdownMenuItem>
    </>
  );
}

export function Preview() {
  return (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Account</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <AccountItems />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function Open() {
  return (
    <div className="flex min-h-110 items-start justify-center">
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Account</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60">
          <AccountItems />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function RowActions() {
  return (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Actions for @acme">
            <DotsThreeIcon weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem>
            <PencilSimpleIcon weight="fill" />
            Edit agent
          </DropdownMenuItem>
          <DropdownMenuItem>
            <KeyIcon weight="fill" />
            Rotate API key
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <TrashIcon weight="fill" />
            Delete agent
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function Options() {
  const [channels, setChannels] = React.useState({ email: true, phone: true, imessage: false });
  const [mode, setMode] = React.useState("edge");
  return (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Filter</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Channels</DropdownMenuLabel>
          <DropdownMenuCheckboxItem checked={channels.email} onCheckedChange={(v) => setChannels((c) => ({ ...c, email: v === true }))}>
            Email
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={channels.phone} onCheckedChange={(v) => setChannels((c) => ({ ...c, phone: v === true }))}>
            Phone
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={channels.imessage} onCheckedChange={(v) => setChannels((c) => ({ ...c, imessage: v === true }))}>
            iMessage
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Tunnel TLS mode</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={mode} onValueChange={setMode}>
            <DropdownMenuRadioItem value="edge">Edge (default)</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="passthrough">Passthrough</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
