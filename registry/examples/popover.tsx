"use client";

import * as React from "react";
import { PencilSimpleIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";

function RenameForm({ onDone }: { onDone?: () => void }) {
  const [name, setName] = React.useState("Acme support");
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onDone?.();
      }}
    >
      <PopoverHeader>
        <PopoverTitle>Display name</PopoverTitle>
        <PopoverDescription>Shown as the sender on acme@inkboxmail.com.</PopoverDescription>
      </PopoverHeader>
      <div className="grid gap-1">
        <Label htmlFor="display-name">Name</Label>
        <Input id="display-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <Button type="submit" className="w-full">
        Save
      </Button>
    </form>
  );
}

export function Preview() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex justify-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <PencilSimpleIcon weight="fill" />
            Rename mailbox
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start">
          <RenameForm onDone={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function Open() {
  return (
    <div className="flex min-h-80 items-start justify-center">
      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <PencilSimpleIcon weight="fill" />
            Rename mailbox
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <RenameForm />
        </PopoverContent>
      </Popover>
    </div>
  );
}
