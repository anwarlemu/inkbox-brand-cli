"use client";

import * as React from "react";
import { CopyIcon, FileTextIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react/ssr";

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";

function Bar({ open }: { open?: boolean }) {
  const [wrap, setWrap] = React.useState(true);
  const [format, setFormat] = React.useState("markdown");
  return (
    <Menubar defaultValue={open ? "note" : undefined}>
      <MenubarMenu value="note">
        <MenubarTrigger>Note</MenubarTrigger>
        <MenubarContent className="w-56">
          <MenubarGroup>
            <MenubarItem>
              <PlusIcon />
              New note
              <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <CopyIcon weight="duotone" />
              Duplicate
              <MenubarShortcut>⌘D</MenubarShortcut>
            </MenubarItem>
            <MenubarSub>
              <MenubarSubTrigger>
                <FileTextIcon weight="fill" />
                Export as
              </MenubarSubTrigger>
              <MenubarSubContent className="w-40">
                <MenubarItem>Markdown</MenubarItem>
                <MenubarItem>Plain text</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
          </MenubarGroup>
          <MenubarSeparator />
          <MenubarItem variant="destructive">
            <TrashIcon weight="fill" />
            Delete note
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu value="edit">
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent className="w-52">
          <MenubarItem>
            Undo <MenubarShortcut>⌘Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem disabled>
            Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu value="view">
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent className="w-52">
          <MenubarCheckboxItem checked={wrap} onCheckedChange={(v) => setWrap(v === true)}>
            Wrap lines
          </MenubarCheckboxItem>
          <MenubarSeparator />
          <MenubarLabel>Show as</MenubarLabel>
          <MenubarRadioGroup value={format} onValueChange={setFormat}>
            <MenubarRadioItem value="markdown">Markdown</MenubarRadioItem>
            <MenubarRadioItem value="formatted">Formatted</MenubarRadioItem>
          </MenubarRadioGroup>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

export function Preview() {
  return <Bar />;
}

export function Open() {
  return (
    <div className="min-h-80">
      <Bar open />
    </div>
  );
}
