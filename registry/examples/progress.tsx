"use client";

import * as React from "react";

import { Progress } from "@/components/ui/progress";

export function Preview() {
  const [value, setValue] = React.useState(12);
  React.useEffect(() => {
    const t = setTimeout(() => setValue(64), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="grid w-full max-w-100 gap-2">
      <div className="flex justify-between text-body">
        <span className="text-fg">Mailbox storage</span>
        <span className="text-fg-muted">{value}%</span>
      </div>
      <Progress value={value} aria-label="Mailbox storage used" />
    </div>
  );
}

export function Values() {
  return (
    <div className="grid w-full max-w-100 gap-4">
      <Progress value={0} aria-label="Empty" />
      <Progress value={33} aria-label="A third" />
      <Progress value={100} aria-label="Full" />
    </div>
  );
}
