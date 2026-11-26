# Testimonial
A quote on the lilac panel with the speaker as a role at a company.

Install: npx inkbox-ds add testimonial
Requires: theme, utils, avatar
Packages: none
Exports: Testimonial
Client boundary: not required by this entry file

## Usage
Use one per page, between features and the call to action. Attribute to a role at a company (Acme in templates); name a real person only with their permission.
- Avoid: Invented names or photos
- Avoid: Star ratings
- Avoid: More than one quote side by side


## Examples
Example components: npx inkbox-ds add testimonial
[Preview](https://inkbox-ds.vercel.app/preview/testimonial/Preview)

examples/testimonial.tsx

```tsx
import { Testimonial } from "@/components/blocks/testimonial";

export function Preview() {
  return <Testimonial quote="Our agents answer their own email now. Setup took an afternoon." role="Head of operations" company="Acme" />;
}

```

## Source

components/blocks/testimonial.tsx

```tsx
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/**
 * A quote on the lilac panel: 20px regular ink words, then who said it as a role at a company with an initial avatar.
 * Quote real people only with their permission; otherwise a role at Acme.
 */
function Testimonial({ quote, role, company, className }: { quote: string; role: string; company: string; className?: string }) {
  return (
    <section data-slot="testimonial" className={cn("mx-auto max-w-(--ds-layout-column) px-6 py-16", className)}>
      <figure className="mx-auto grid max-w-(--ds-layout-text) gap-6 rounded-dialog bg-subtle p-8 md:p-10">
        <blockquote className="text-h3 leading-heading font-normal text-pretty text-fg">“{quote}”</blockquote>
        <figcaption className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{company.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="grid">
            <span className="text-body leading-body font-medium text-fg">{role}</span>
            <span className="text-body-sm leading-tight text-fg-muted">{company}</span>
          </span>
        </figcaption>
      </figure>
    </section>
  );
}

export { Testimonial };

```
