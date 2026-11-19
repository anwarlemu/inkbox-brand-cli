import { Hero } from "@/components/blocks/hero";
import { Button } from "@/components/ui/button";

export function Preview() {
  return (
    <Hero
      eyebrow="Agent2Agent ships today"
      title="Give every AI agent a way to be reached"
      description="Email, phone, iMessage and Agent2Agent for your agents, with contacts, notes and a vault they share."
      actions={
        <>
          <Button>Get started free</Button>
          <Button variant="outline">Read the docs</Button>
        </>
      }
      // eslint-disable-next-line @next/next/no-img-element
      media={<img src="/octopus.png" alt="" width={320} height={283} className="mx-auto h-auto w-full max-w-80" />}
    />
  );
}

export function Centered() {
  return <Hero align="center" eyebrow="Product" title="Everything an agent needs to be reached" description="Turn on the channels each agent uses." actions={<Button>Get started free</Button>} />;
}
