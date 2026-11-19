"use client";

import * as React from "react";

import { AppPageBody, AppPageHead, AppShell } from "@/components/product/app-shell";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export function Preview() {
  const [current, setCurrent] = React.useState("Vault");
  return (
    <AppShell current={current} onSelect={setCurrent}>
      <AppPageHead title={current} description="Zero-knowledge encrypted secret store for your agents." actions={<Button size="sm">Add secret</Button>} />
      <AppPageBody>
        <Empty className="min-h-80">
          <EmptyHeader>
            <EmptyTitle>Nothing here yet</EmptyTitle>
            <EmptyDescription>Pick a row in the rail: the page head follows it.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </AppPageBody>
    </AppShell>
  );
}
