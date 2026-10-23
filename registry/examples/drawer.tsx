"use client";

import * as React from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

const LINES = [
  { id: "shared", title: "Shared", body: "Assigned when someone connects to this agent." },
  { id: "dedicated", title: "Dedicated", body: "A number only this agent uses." },
];

function ChooseLine({ onChoose }: { onChoose?: () => void }) {
  const [line, setLine] = React.useState("shared");
  return (
    <>
      <DrawerHeader>
        <DrawerTitle>iMessage line</DrawerTitle>
        <DrawerDescription>Choose how recipients connect to @baked.</DrawerDescription>
      </DrawerHeader>
      <div role="radiogroup" aria-label="iMessage line" className="grid gap-2 px-6">
        {LINES.map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={line === l.id}
            onClick={() => setLine(l.id)}
            className="flex items-start gap-3 rounded-control bg-subtle p-3.5 text-left outline-none transition-colors duration-150 ease-out hover:bg-subtle-hover focus-visible:outline-2 focus-visible:outline-focus-ring aria-checked:bg-surface aria-checked:shadow-s motion-reduce:transition-none"
          >
            <span className="grid flex-1 gap-0.5">
              <span className="text-body font-medium text-fg">{l.title}</span>
              <span className="text-body text-fg-muted">{l.body}</span>
            </span>
            {line === l.id && <CheckCircleIcon weight="fill" className="size-5.5 text-success" />}
          </button>
        ))}
      </div>
      <DrawerFooter>
        <Button onClick={onChoose}>Use {line} line</Button>
        <DrawerClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DrawerClose>
      </DrawerFooter>
    </>
  );
}

export function Preview() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex justify-center">
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="outline">Choose a line</Button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="mx-auto w-full max-w-md">
            <ChooseLine onChoose={() => setOpen(false)} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export function Directions() {
  const directions = ["bottom", "top", "right", "left"] as const;
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {directions.map((direction) => (
        <Drawer key={direction} direction={direction}>
          <DrawerTrigger asChild>
            <Button variant="outline" className="capitalize">
              {direction}
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Drawer from the {direction}</DrawerTitle>
              <DrawerDescription>Drag it back toward its edge, or flick it, to close.</DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="secondary">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ))}
    </div>
  );
}

export function Open() {
  return (
    <div className="min-h-120">
      <Drawer defaultOpen>
        <DrawerContent>
          <div className="mx-auto w-full max-w-md">
            <ChooseLine />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
