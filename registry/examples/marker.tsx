import { ArrowsLeftRightIcon, UserPlusIcon } from "@phosphor-icons/react/ssr";

import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";

export function Preview() {
  return (
    <div className="mx-auto grid w-full max-w-120 gap-5">
      <Marker variant="separator">
        <MarkerContent>Yesterday</MarkerContent>
      </Marker>
      <Marker>
        <MarkerIcon>
          <UserPlusIcon weight="fill" />
        </MarkerIcon>
        <MarkerContent>Ray Liao joined the conversation</MarkerContent>
      </Marker>
      <Marker variant="unread">
        <MarkerContent>2 unread</MarkerContent>
      </Marker>
    </div>
  );
}

export function Variants() {
  return (
    <div className="mx-auto grid w-full max-w-120 gap-5">
      <Marker variant="border">
        <MarkerContent>Threads</MarkerContent>
      </Marker>
      <Marker>
        <MarkerIcon>
          <ArrowsLeftRightIcon />
        </MarkerIcon>
        <MarkerContent>
          Delegated to @ops-agent over Agent2Agent. <a href="#session">View session</a>
        </MarkerContent>
      </Marker>
      <Marker variant="separator">
        <MarkerContent>Jul 31</MarkerContent>
      </Marker>
    </div>
  );
}
