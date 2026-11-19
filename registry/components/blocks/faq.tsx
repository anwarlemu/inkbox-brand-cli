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
