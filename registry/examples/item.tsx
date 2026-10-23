import { ArrowRightIcon, EnvelopeIcon, GearIcon, KeyIcon, PencilSimpleIcon, PhoneIcon, RobotIcon, UsersThreeIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemHeader, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";

const EMAILS = [
  { from: "Ray Liao", when: "Yesterday", subject: "Inkbox A2A: publish your Agent Card and connect by...", preview: "Hello @baked, This is Ray, cofounder of Inkbox. This update is written for you..." },
  { from: "Ray Liao", when: "Jul 31", subject: "Agent-to-Agent on Inkbox: you can now delegate...", preview: "Hello @baked, This is Ray, cofounder of Inkbox. This week we took A2A across..." },
  { from: "Ray Liao", when: "Jul 31", subject: "Agent-to-Agent on Inkbox: you can now delegate...", preview: "Hello @baked, This is Ray, cofounder of Inkbox. Two new capabilities, with exact..." },
];

export function Preview() {
  return (
    <ItemGroup className="w-full max-w-96">
      {EMAILS.map((email, i) => (
        <div key={i}>
          {i > 0 && <ItemSeparator />}
          <Item asChild aria-current={i === 0 ? "true" : undefined}>
            <a href="#email">
              <ItemHeader>
                <span className="text-fg">{email.from}</span>
                <span className="text-fg-muted">{email.when}</span>
              </ItemHeader>
              <ItemContent>
                <ItemTitle className="w-full truncate">{email.subject}</ItemTitle>
                <ItemDescription className="line-clamp-1">{email.preview}</ItemDescription>
              </ItemContent>
            </a>
          </Item>
        </div>
      ))}
    </ItemGroup>
  );
}

export function Events() {
  return (
    <ItemGroup className="w-full max-w-96">
      {["message.sent", "message.delivered", "message.bounced"].map((event, i) => (
        <div key={event}>
          {i > 0 && <ItemSeparator />}
          <Item asChild data-selected={i === 0}>
            <button type="button" className="w-full text-left">
              <ItemHeader className="justify-start">
                <Badge variant="blue" size="sm">Email</Badge>
                <ArrowRightIcon aria-hidden className="size-4.5 text-fg-muted" />
              </ItemHeader>
              <ItemContent>
                <ItemTitle>{event}</ItemTitle>
                <ItemDescription>0 configured destinations</ItemDescription>
              </ItemContent>
            </button>
          </Item>
        </div>
      ))}
    </ItemGroup>
  );
}

export function Rail() {
  const rows = [
    { label: "Agent Workspace", icon: RobotIcon, current: true },
    { label: "Manage Agents", icon: UsersThreeIcon },
    { label: "API Keys", icon: KeyIcon },
    { label: "Email", icon: EnvelopeIcon },
    { label: "Phone", icon: PhoneIcon },
  ];
  return (
    <ItemGroup className="w-full max-w-66 gap-0.5">
      {rows.map(({ label, icon: Icon, current }) => (
        <Item key={label} size="sm" asChild aria-current={current ? "page" : undefined}>
          <a href={`#${label}`}>
            <ItemMedia variant="icon">
              <Icon weight="fill" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{label}</ItemTitle>
            </ItemContent>
          </a>
        </Item>
      ))}
    </ItemGroup>
  );
}

export function Variants() {
  return (
    <div className="grid w-full max-w-120 gap-3">
      <Item variant="outline">
        <ItemMedia variant="icon">
          <EnvelopeIcon weight="fill" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>baked@inkboxmail.com</ItemTitle>
          <ItemDescription>Created Jul 27, 2026</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="icon" aria-label="Edit mailbox">
            <PencilSimpleIcon weight="fill" />
          </Button>
        </ItemActions>
      </Item>
      <Item variant="muted" size="sm">
        <ItemMedia variant="icon">
          <GearIcon weight="fill" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Mailbox settings</ItemTitle>
        </ItemContent>
      </Item>
      <Item size="xs">
        <ItemContent>
          <ItemTitle>Shared iMessage Line: Enabled</ItemTitle>
        </ItemContent>
      </Item>
    </div>
  );
}
