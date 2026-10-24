import Link from "next/link";

import { Command, PageBody, PageHead, Section } from "@www/components/chrome";
import { CLI_COMMAND, INSTALL_COMMAND, items, registryName } from "@www/lib/registry";

export default function HomePage() {
  return (
    <>
      <PageHead title={`${registryName} design system`} description={`Every component, token and rule for building ${registryName} interfaces, drawn from the console's design. ${items.length} components, each with examples and source.`} />
      <PageBody className="max-w-240">
        <Section title="Install the CLI" description="Run once from the project root. It adds the brand stylesheet, the fonts and the agent instructions.">
          <div className="grid gap-2">
            <Command command={INSTALL_COMMAND} />
            <Command command="npx inkbox-ds init" />
          </div>
        </Section>
        <Section title="Add components" description="Components need React 19.2 or later, Tailwind CSS 4 and project configuration. The CLI respects configured aliases and JavaScript or TypeScript output, copies source and installs dependencies.">
          <Command command={`${CLI_COMMAND} add button dialog field input`} />
        </Section>
        <Section title="Discover and preview" description="Read the project configuration and exact component APIs before installing. Preview diffs before replacing local changes.">
          <div className="grid gap-2">
            <Command command="npx inkbox-ds info --json" />
            <Command command="npx inkbox-ds search button --json" />
            <Command command="npx inkbox-ds view button --json" />
            <Command command="npx inkbox-ds add button --diff" />
          </div>
        </Section>
        <Section title="Use with shadcn and agents" description="Init configures the standard registry and installs portable Claude/Codex skills. Include the theme when using shadcn to update existing theme aliases. Advanced commands use pinned shadcn 4.22.1.">
          <div className="grid gap-2">
            <Command command="npx inkbox-ds shadcn add @inkbox-ds/theme @inkbox-ds/button" />
            <Command command="npx inkbox-ds mcp init --client claude" />
            <Command command="npx inkbox-ds create --template vite --name my-app" />
          </div>
        </Section>
        <Section title="Components" description="Every component in the library, in the console's style.">
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-2">
            {items.map((i) => (
              <li key={i.name}>
                <Link href={`/components/${i.name}`} className="flex h-10 items-center rounded-control bg-subtle px-3 text-body text-fg outline-none transition-colors duration-150 ease-out hover:bg-subtle-hover focus-visible:outline-2 focus-visible:outline-focus-ring motion-reduce:transition-none">
                  {i.title}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </PageBody>
    </>
  );
}
