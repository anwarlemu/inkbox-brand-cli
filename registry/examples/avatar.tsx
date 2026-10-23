import { CheckIcon } from "@phosphor-icons/react/ssr";

import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@/components/ui/avatar";

export function Preview() {
  return (
    <div className="grid gap-3">
      <div className="flex h-9.5 items-center gap-2.5 px-3">
        <Avatar size="sm">
          <AvatarFallback>R</AvatarFallback>
        </Avatar>
        <span className="text-body text-fg">Robert Ligthart</span>
      </div>
      <div className="flex h-9.5 items-center gap-2.5 px-3">
        <Avatar size="sm">
          <AvatarFallback>B</AvatarFallback>
        </Avatar>
        <span className="text-body text-fg">@baked</span>
      </div>
    </div>
  );
}

export function Sizes() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar size="sm">
        <AvatarFallback>R</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>R</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>R</AvatarFallback>
      </Avatar>
      <Avatar shape="circle" size="sm">
        <AvatarImage src="/logo-mark.png" alt="@test-agent" />
        <AvatarFallback>T</AvatarFallback>
      </Avatar>
      <Avatar shape="circle">
        <AvatarImage src="/logo-mark.png" alt="@test-agent" />
        <AvatarFallback>T</AvatarFallback>
      </Avatar>
      <Avatar shape="circle" size="lg">
        <AvatarImage src="/logo-mark.png" alt="@test-agent" />
        <AvatarFallback>T</AvatarFallback>
      </Avatar>
    </div>
  );
}

export function WithBadge() {
  return (
    <div className="flex items-center gap-4">
      <Avatar>
        <AvatarFallback>B</AvatarFallback>
        <AvatarBadge />
      </Avatar>
      <Avatar size="lg" shape="circle">
        <AvatarImage src="/logo-mark.png" alt="@test-agent" />
        <AvatarFallback>T</AvatarFallback>
        <AvatarBadge>
          <CheckIcon weight="bold" />
        </AvatarBadge>
      </Avatar>
    </div>
  );
}

export function Group() {
  return (
    <AvatarGroup>
      <Avatar>
        <AvatarFallback>R</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>B</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>M</AvatarFallback>
      </Avatar>
      <AvatarGroupCount>+3</AvatarGroupCount>
    </AvatarGroup>
  );
}

export function Fallback() {
  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg" shape="circle">
        <AvatarFallback>R</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>R</AvatarFallback>
      </Avatar>
    </div>
  );
}
