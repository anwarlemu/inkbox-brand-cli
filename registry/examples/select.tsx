"use client";

import { EnvelopeSimpleIcon, PhoneIcon, ChatCircleIcon } from "@phosphor-icons/react/ssr";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Preview() {
  return (
    <div className="grid w-full max-w-114.5 gap-1">
      <Label htmlFor="any-state">Phone number state</Label>
      <Select defaultValue="any">
        <SelectTrigger id="any-state">
          <SelectValue placeholder="Choose a state" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any State</SelectItem>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>West</SelectLabel>
            <SelectItem value="ca">California</SelectItem>
            <SelectItem value="or">Oregon</SelectItem>
            <SelectItem value="wa">Washington</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>East</SelectLabel>
            <SelectItem value="ny">New York</SelectItem>
            <SelectItem value="ma">Massachusetts</SelectItem>
            <SelectItem value="fl" disabled>
              Florida (no numbers left)
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

export function WithIcons() {
  return (
    <Select defaultValue="email">
      <SelectTrigger aria-label="Channel" className="w-60">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="email">
          <EnvelopeSimpleIcon weight="fill" /> Email
        </SelectItem>
        <SelectItem value="phone">
          <PhoneIcon weight="fill" /> Phone
        </SelectItem>
        <SelectItem value="imessage">
          <ChatCircleIcon weight="fill" /> iMessage
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

export function States() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select>
        <SelectTrigger aria-label="Line" size="sm" className="w-44">
          <SelectValue placeholder="Choose a line" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="shared">Shared</SelectItem>
          <SelectItem value="dedicated">Dedicated</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue="shared" disabled>
        <SelectTrigger aria-label="Disabled" className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="shared">Shared</SelectItem>
        </SelectContent>
      </Select>
      <Select>
        <SelectTrigger aria-label="Invalid" aria-invalid className="w-44">
          <SelectValue placeholder="Required" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="edge">Edge</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
