"use client";

import { ArchiveIcon, PushPinIcon, TextBIcon, TextItalicIcon } from "@phosphor-icons/react/ssr";

import { Toggle } from "@/components/ui/toggle";

export function Preview() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Toggle aria-label="Pin the thread" defaultPressed>
        <PushPinIcon weight="fill" />
      </Toggle>
      <Toggle>
        <ArchiveIcon weight="fill" />
        Show archived
      </Toggle>
    </div>
  );
}

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Toggle variant="outline" aria-label="Bold" defaultPressed>
        <TextBIcon weight="bold" />
      </Toggle>
      <Toggle variant="outline" aria-label="Italic">
        <TextItalicIcon weight="bold" />
      </Toggle>
      <Toggle size="sm" aria-label="Pin, small">
        <PushPinIcon weight="fill" />
      </Toggle>
      <Toggle size="lg">Large</Toggle>
      <Toggle disabled>Disabled</Toggle>
    </div>
  );
}
