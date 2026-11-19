# FAQ
Questions and answers in the library's accordion, the heading at the left on wide screens.

Install: npx inkbox-ds add faq
Requires: theme, section-head, accordion, utils
Packages: none
Exports: Question, Faq
Client boundary: not required by this entry file

## Usage
Use near the end of a page for objections. Keep answers to two or three sentences.
- Avoid: Every item open by default
- Avoid: Nesting accordions


## Examples
Example components: npx inkbox-ds add faq
[Preview](https://inkbox-ds.vercel.app/preview/faq/Preview)

examples/faq.tsx

```tsx
import { Faq } from "@/components/blocks/faq";

export function Preview() {
  return (
    <Faq
      questions={[
        { question: "What is an agent identity?", answer: "An identity gives one agent its own handle, inbox, phone number and Agent Card." },
        { question: "Can I use my own domain?", answer: "Yes. Paid plans add custom email domains." },
      ]}
    />
  );
}

```

## Source

components/blocks/faq.tsx

```tsx
import * as React from "react";

import { SectionHead } from "@/components/blocks/section-head";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export type Question = { question: string; answer: React.ReactNode };

/** Questions and answers in the library's accordion, the heading at the left on wide screens. */
function Faq({ label, title = "Questions", description, questions, className }: { label?: string; title?: React.ReactNode; description?: React.ReactNode; questions: Question[]; className?: string }) {
  return (
    <section data-slot="faq" className={cn("mx-auto grid max-w-(--ds-layout-column) gap-8 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16", className)}>
      <SectionHead label={label} title={title} description={description} />
      <Accordion type="single" collapsible className="w-full">
        {questions.map((q) => (
          <AccordionItem key={q.question} value={q.question}>
            <AccordionTrigger>{q.question}</AccordionTrigger>
            <AccordionContent>{q.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export { Faq };

```
