import { readFileSync } from "node:fs";
import path from "node:path";
import { Code, PageBody, PageHead, Section } from "@www/components/chrome";
import { Gallery } from "@www/components/gallery";
import { examples } from "@www/lib/assets";
import { CLI_COMMAND } from "@www/lib/registry";

export const metadata = { title: "Illustrations", description: "The octopus, the reef, the console window and the wordmark patterns as scenes at any size." };

const RUN = CLI_COMMAND.replace("npx -y ", "npx ");

// The rules, each with its source, from brand/illustration.md: the numbered lines under each heading.
const doc = readFileSync(path.join(process.cwd(), "../../brand/illustration.md"), "utf8");
const groups = doc
  .split(/\n## /)
  .slice(1)
  .map((block) => {
    const [title, ...rest] = block.split("\n");
    const rules = rest.join("\n").split(/\n(?=\d+\. |- )/).map((r) => r.replace(/^\d+\. |^- /, "").replace(/\s+/g, " ").replace(/\*\*|`/g, "").trim()).filter(Boolean);
    return { title: title!.trim(), rules };
  });

export default function IllustrationsPage() {
  return (
    <>
      <PageHead title="Illustrations" description="The brand's illustration style as code: the octopus in its two poses, the reef, the console window and the wordmark tile, outline band and hatching, as scenes at any size. SVG keeps real vector shapes; the octopus is the brand's own art, never redrawn." />
      <PageBody className="max-w-300">
        <Code title="terminal" lang="bash" code={`${RUN} illustrate --list\n${RUN} illustrate reef --size og\n${RUN} illustrate octopus --pose hang --theme purple\n${RUN} illustrate window --image capture.png`} />
        <Section title="Subjects" description="Square by default; any image size or --width and --height. --image goes only into the window, as a capture.">
          <Gallery items={examples.illustrations} columns="grid-cols-2 lg:grid-cols-4" />
        </Section>
        <Section title="SVG" description="Two files as the command writes them: the reef is the Figma file's own vectors, the tile is the wordmark's paths.">
          <ul className="flex flex-wrap gap-3">
            {["reef", "pattern"].map((s) => (
              <li key={s}>
                <a href={`/assets-examples/illustration-${s}.svg`} className="rounded-control text-body text-fg-brand underline underline-offset-2 outline-none focus-visible:shadow-focus">
                  illustration-{s}.svg
                </a>
              </li>
            ))}
          </ul>
        </Section>
        {groups.map((g) => (
          <Section key={g.title} title={g.title}>
            <ol className="grid list-decimal gap-2 pl-5 text-body text-fg-secondary">
              {g.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ol>
          </Section>
        ))}
      </PageBody>
    </>
  );
}
