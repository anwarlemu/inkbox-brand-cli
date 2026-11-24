import { Code, PageBody, PageHead, Section } from "@www/components/chrome";
import { CommandList } from "@www/components/gallery";
import { examples } from "@www/lib/assets";
import { CLI_COMMAND } from "@www/lib/registry";

export const metadata = { title: "Designs", description: "Make a picture, then revise it in plain words or exact edits until it is right, on brand at every step." };

const RUN = CLI_COMMAND.replace("npx -y ", "npx ");

export default function DesignsPage() {
  const steps = examples.designs.filter((e) => !e.note);
  const refused = examples.designs.find((e) => e.note);
  return (
    <>
      <PageHead title="Designs" description="A design is a small file that says what a picture is: its template, size, theme, words and the changes made to its parts. Revise it in plain words or exact edits; every change is drawn, checked and kept in its history, and anything off brand is refused with nothing changed." />
      <PageBody className="max-w-300">
        <Code title="terminal" lang="bash" code={`${RUN} design new tile --size x-banner --headline "Every agent gets *an inbox*" -o banner.design.json\n${RUN} design revise banner.design.json "bigger headline, logo top right, darker theme"\n${RUN} design edit banner.design.json --layer art.scale=0.8\n${RUN} design undo banner.design.json\n${RUN} design variants banner.design.json --by theme\n${RUN} design sizes banner.design.json --to og,square,story`} />
        <Section title="One session" description="An X banner, made and then revised, as the CLI drew each step. The profile picture's corner stays clear throughout.">
          <ol className="grid gap-8">
            {steps.map((e, i) => (
              <li key={e.id} className="grid gap-2">
                <p className="text-body-sm text-fg-muted">{i === 0 ? "Made" : `Step ${i}`}</p>
                <img src={e.src} width={e.width} height={e.height} alt={`Step ${i} of the session, as the CLI draws it`} loading="lazy" className="h-auto w-full rounded-control bg-subtle shadow-s" />
                <code className="font-mono text-caption break-words text-fg-muted">{e.command}</code>
              </li>
            ))}
          </ol>
        </Section>
        {refused && (
          <Section title="Refused" description="A change the brand does not allow changes nothing, and says what can be done instead.">
            <Code title="terminal" lang="bash" code={`${RUN} ${refused.command}\n${refused.note}`} />
          </Section>
        )}
        <Section title="Compose" description="When no template fits: blocks of the brand (the headline, the octopus, the reef, the tile, the console window, cards, charts, flows and more) placed on a grid, with the same checks. design compose add|move|remove|order, or plain words: add a stat &quot;42%&quot; top right.">
          <ul className="grid gap-6 lg:grid-cols-2">
            {examples.compose.map((e) => (
              <li key={e.id} className="grid gap-2">
                <img src={e.src} width={e.width} height={e.height} alt={`${e.id}, as the CLI draws it`} loading="lazy" className="h-auto w-full rounded-control bg-subtle shadow-s" />
                <pre className="fade-x overflow-x-auto font-mono text-caption whitespace-pre text-fg-muted">{e.command}</pre>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Commands">
          <CommandList
            rows={[
              ["design new <template>", "Write the file and draw it. --size, --theme, --headline, --body, --badge, --image, --sample."],
              ["design revise <file> \"...\"", "Plain words, read by a fixed grammar. A part it does not understand fails the whole command and lists what it can do."],
              ["design edit <file>", "Exact edits: --set slot=words, --theme, --size, --template, --layer id.anchor|dx|dy|scale|align|hidden, --hide, --seed."],
              ["design undo | redo | history | show", "Walk the steps; no timestamps, so the same edits write the same bytes."],
              ["design variants <file> --by theme|seed|template", "One file each and a contact sheet, labeled."],
              ["design sizes <file> --to og,square,story", "The same design laid out again at each size, not stretched."],
              ["design compare <a> <b>", "Side by side, with the list of differences."],
              ["design render | check <file>", "Draw it in other formats, or check it: errors block every write."],
            ]}
          />
        </Section>
      </PageBody>
    </>
  );
}
