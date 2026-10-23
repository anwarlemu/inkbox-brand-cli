import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

const TEMPLATES = [
  { name: "Support desk", text: "Answers inbound email and hands hard cases to a person." },
  { name: "Scheduler", text: "Books calls over iMessage and confirms by email." },
  { name: "Researcher", text: "Reads replies and files notes to the shared vault." },
  { name: "Recruiter", text: "Screens candidates by phone and logs each call." },
  { name: "Concierge", text: "Greets new contacts and routes them to the right agent." },
];

function Slide({ name, text }: { name: string; text: string }) {
  return (
    <div className="grid h-36 content-start gap-1 rounded-control border border-line-field bg-surface p-4">
      <p className="text-body leading-tight font-medium text-fg">{name}</p>
      <p className="text-body leading-body text-fg-muted">{text}</p>
    </div>
  );
}

export function Preview() {
  return (
    <div className="mx-auto w-full max-w-sm px-12">
      <Carousel>
        <CarouselContent>
          {TEMPLATES.map((t) => (
            <CarouselItem key={t.name}>
              <Slide {...t} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}

export function Sizes() {
  return (
    <div className="mx-auto w-full max-w-2xl px-12">
      <Carousel opts={{ align: "start" }}>
        <CarouselContent>
          {TEMPLATES.map((t) => (
            <CarouselItem key={t.name} className="sm:basis-1/2 lg:basis-1/3">
              <Slide {...t} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}

export function Vertical() {
  return (
    <div className="mx-auto w-full max-w-xs py-12">
      <Carousel orientation="vertical">
        <CarouselContent className="h-40">
          {TEMPLATES.map((t) => (
            <CarouselItem key={t.name}>
              <Slide {...t} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}
