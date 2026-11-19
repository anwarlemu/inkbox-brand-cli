import { Code, PageBody, PageHead, Section } from "@www/components/chrome";
import { CommandList } from "@www/components/gallery";
import { CLI_COMMAND } from "@www/lib/registry";

export const metadata = { title: "Figma", description: "Brand tokens as Figma variables, and pushes, pulls and checks through the Figma MCP tools." };

const RUN = CLI_COMMAND.replace("npx -y ", "npx ");

const ACTIONS: [string, string][] = [
  ["figma tokens", "The brand tokens as Figma variables (one collection, typed and scoped, each linked to its CSS variable) and the shadows as effect styles: tokens.json plus use_figma scripts, safe to rerun."],
  ["figma push image <template>", "A share image as SVG, with a use_figma script that imports it as editable layers when it fits one call, and the upload_assets step."],
  ["figma push slide <type>", "A deck slide the same way."],
  ["figma push illustration <subject>", "An illustration the same way: the reef arrives as its own vectors."],
  ["figma push asset <file>", "Any SVG, PNG, JPEG, WebP or HTML file you already have."],
  ["figma push component <name>", "A library component's preview, captured as self-contained HTML for html_to_figma."],
  ["figma push page <url|file>", "A page as self-contained HTML for html_to_figma."],
  ["figma pull <url>", "The read steps for a Figma frame (create_session, get_variable_defs, get_design_context) and where to save each result."],
  ["figma check <files...>", "Checks saved Figma data against the tokens: colors, fonts, text sizes, radii and spacing. Each off-brand value names the nearest token; exits 1 when any are off."],
];

export default function FigmaPage() {
  return (
    <>
      <PageHead title="Figma" description="The CLI never calls Figma itself. Each action writes files and prints the Figma MCP tool calls to make, in order, so an agent with the Figma tools can apply them." />
      <PageBody className="max-w-240">
        <Code title="terminal" lang="bash" code={`${RUN} figma tokens --out figma\n${RUN} figma push image card --size square\n${RUN} figma pull "https://www.figma.com/design/<fileKey>/<name>?node-id=1-2"\n${RUN} figma check figma/variables-1-2.json figma/design-1-2.txt`} />
        <Section title="Actions" description="Every action takes --out (default ./figma), --file for an existing file key, and --json.">
          <CommandList rows={ACTIONS} />
        </Section>
        <Section title="A round trip" description="Push the tokens once, build or push frames bound to them, then pull a frame back and check it before building it in code.">
          <ol className="grid list-decimal gap-2 pl-5 text-body text-fg-secondary">
            <li>Run figma tokens and make its use_figma calls: the variables and effect styles land in the file.</li>
            <li>Push an image, slide, illustration or component and make the printed calls.</li>
            <li>Run figma pull on a frame's link, make the read calls and save their results where it says.</li>
            <li>Run figma check on the saved files. Fix every off-brand value with the token it names, then build with library components.</li>
          </ol>
        </Section>
        <Section title="Plan limits" description="A Starter or free plan allows one mode per collection; this brand has one look, so its variables use one mode either way. Figma rate limits MCP calls on Starter seats, so the scripts batch as much as one call allows." >
          <p className="text-body text-fg-muted">The value check, the variables and the scripts all read brand/tokens.css; nothing is typed by hand.</p>
        </Section>
      </PageBody>
    </>
  );
}
