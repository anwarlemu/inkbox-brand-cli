"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Preview() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create Agent</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Agent Identity</DialogTitle>
          <DialogDescription className="sr-only">Choose a handle and a display name for the new agent.</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-3">
          <div className="grid gap-1">
            <Label htmlFor="handle">Agent handle</Label>
            <Input id="handle" placeholder="robert-baked-design" />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="display">Agent display name</Label>
            <Input id="display" placeholder="Robert" />
          </div>
          <Button className="mt-3 w-full">Create Agent Identity</Button>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
