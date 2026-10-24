# Inkbox design system

Components, design tokens and a CLI for building Inkbox pages and interfaces.

Reference: https://inkbox-ds.vercel.app

## Install the CLI

Run once from the project root:

```sh
npm install --save-dev github:anwarlemu/inkbox-brand-cli#release
```

Prepare styles, fonts and agent instructions for new work:

```sh
npx inkbox-ds init
npx inkbox-ds guide
```

`init` does not convert existing components. The bare command does; see "Update an existing interface" below.
Requires Node.js 20 or later. Read [the agent guide](https://inkbox-ds.vercel.app/agents.md) with any coding agent.
The same guide is installed at `.ds/agent-guide.md`. Agents that do not auto-load project instructions should read it explicitly.

## Add components

Run `add` from the target app root. Components require React 19.2+, Tailwind CSS 4, and the `@/*` source alias. For other frameworks, run the bare CLI command to apply the brand instead. In a React and Tailwind 4 app, add the components the page needs:

```sh
npx inkbox-ds add button card field input
```

The CLI copies component source, installs dependencies and adds the theme. It uses the project’s `src` folder and
`@` alias when configured. Read each component’s examples and usage notes before changing it.

```sh
npx inkbox-ds list --json
npx inkbox-ds show select --json
npx inkbox-ds tokens border
```

## Instructions for coding agents

Include this with the page requirements:

```text
Build this page using the Inkbox design system at https://inkbox-ds.vercel.app.
Read https://inkbox-ds.vercel.app/agents.md first.
Run npx inkbox-ds show <name> --json for exact exports, usage rules, examples and source.
Add existing components with the CLI. Use design tokens for custom layout and styling.
Connect every control to its intended behavior. Include validation, loading, empty and error states where needed.
Run the project checks and the CLI token check. Test keyboard interaction and desktop and phone layouts.
```

## Check the implementation

```sh
npx inkbox-ds check --changed
npx inkbox-ds review http://localhost:3000 --any
```

Start the development server before running `review`. It captures desktop and phone screenshots and compares the
page with the Inkbox reference. It requires `playwright-core` and Chromium (`npx playwright install chromium`).
Review uses the available Codex or Claude Code session, or the Anthropic API when configured. When no reviewer is
available, it saves screenshots for the coding agent to review. Visual review does not test form validation or
control behavior; test those separately.

## Commands

Run these commands with `npx inkbox-ds` after installing the CLI.

| Command | Purpose |
|---|---|
| `init` | Install styles, fonts and agent instructions without converting existing components. |
| `guide` | Read the portable agent workflow, including setup and verification. |
| `show <item>` | Read usage rules, exports, examples and source. Use `--json` for structured output. |
| `add <items...>` | Copy components, dependencies and the theme into a React and Tailwind 4 project. |
| `list` | List the available components. |
| `look <file\|element>` | Show component and token guidance for a file or element type. |
| `tokens [term]` | Find a token by name or role. |
| `check [files...]` | Check style values. Use `--changed` for Git changes or `--fix` for exact token replacements. |
| `review <url> --any` | Review a page that is not part of an existing conversion task list. |
| `review <url>` | Review a tracked screen and mark its task complete when it passes. |
| `approve` | Approve a `ds-override` comment in a human-operated terminal. |
| `done <screen>` | Mark a native screen task complete. Web screen tasks use `review`. |
| `skip <screen> --reason "..."` | Record why a tracked screen was left unchanged. |

## Update an existing interface

Running the CLI without a subcommand applies the design system to existing code. It can replace matching React
components, convert style values, install styles and fonts, and add agent rules and checks. Review the diff before
continuing. This conversion preserves existing copy and behavior. It installs color tokens and applies them at
identified component usage sites, including supported variants and states. Shared palette definitions, chart data,
artwork, gradients and unrelated colors stay intact. Unknown or dynamic color roles are left for review. The
installed checks follow the same color scope, including `check --fix`.

```sh
npx inkbox-ds --dry-run
npx inkbox-ds
```

Subsequent runs report the next screen to review. `--redo` repeats conversion after an update. Component decisions
are recorded in `.ds/components.json`. The conversion also installs checks for Claude Code, Codex, Cursor and Git
commits. Adding individual components with `add` does not run this conversion.

## Text and structured references

- `/agents.md`: the agent workflow.
- `/llms.txt`: short catalog with links to every component.
- `/llms-full.txt`: complete guide, examples and source.
- `/r/index.json`: all items, including hooks, helpers and theme.
- `/r/<name>.md` and `/r/<name>.json`: usage rules, exports, dependencies, examples and exact source.

All references are generated from the same registry the CLI installs. Prefer individual component references to
the complete file. `guide`, `list`, `show`, `look`, `tokens` and `check` without `--fix` are read-only. `init` and
`add` accept `--dry-run`; add `--json` for structured results. JSON goes to stdout; progress goes to stderr.

## Source

- `registry/components/`: the components.
- `registry/examples/`: working examples shown in the docs.
- `registry/docs/`: component descriptions, usage notes and constraints.
- `brand/tokens.css`: design tokens.
- `brand/elements.json`: styles for each element type and their source references.
- `brand/reference/`: reference screenshots used for review.
- `apps/www/`: the design system site.

Run `npm run ci` for the CLI tests and registry checks, `npm run build --workspace www` for the docs build,
and `DOCS_URL=http://localhost:3000 npm run test:docs` for the browser checks against a running production build.
