"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

function EditMailbox() {
  return (
    <>
      <SheetHeader>
        <SheetTitle>Edit mailbox</SheetTitle>
        <SheetDescription>Mailboxes are provisioned and deleted with their owning identity.</SheetDescription>
      </SheetHeader>
      <div className="grid gap-4 px-6">
        <div className="grid gap-1">
          <Label htmlFor="sheet-name">Display name</Label>
          <Input id="sheet-name" defaultValue="Baked support" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="sheet-reply">Reply-to address</Label>
          <Input id="sheet-reply" type="email" placeholder="support@baked.design" />
        </div>
      </div>
      <SheetFooter>
        <Button>Save changes</Button>
        <SheetClose asChild>
          <Button variant="secondary">Cancel</Button>
        </SheetClose>
      </SheetFooter>
    </>
  );
}

export function Preview() {
  return (
    <div className="flex justify-center">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Edit mailbox</Button>
        </SheetTrigger>
        <SheetContent>
          <EditMailbox />
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function Sides() {
  const sides = ["top", "right", "bottom", "left"] as const;
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {sides.map((side) => (
        <Sheet key={side}>
          <SheetTrigger asChild>
            <Button variant="outline" className="capitalize">
              {side}
            </Button>
          </SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>Sheet from the {side}</SheetTitle>
              <SheetDescription>Slides from its edge on the drawer curve.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  );
}

export function Open() {
  return (
    <div className="min-h-120">
      <Sheet defaultOpen>
        <SheetContent>
          <EditMailbox />
        </SheetContent>
      </Sheet>
    </div>
  );
}
