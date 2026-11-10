---
name: {{bin}}
description: Build or restyle interfaces with the {{brand}} design system. Use when the project uses {{bin}} or the user requests {{brand}} components, tokens, or visual styling.
---

Use the project's configured components and brand tokens. Preserve the user's requested content and behavior.

Read project context with `npx {{bin}} info --json`. It reports the framework, stylesheet, aliases, installed components and registry. If the CLI is missing, use `npx -y {{source}}` in its place.

Find suitable components with `search <term> --json`, then read `view <names...> --json`. The response contains exact source and working examples. Inspect variant names, callback signatures and example dependencies instead of assuming another library's API.

Install with `add <names...> --dry-run --json`, then `add <names...> --json`. Existing local files are preserved. Use `add <names...> --diff` to compare updates; use `--overwrite` only when replacing those local changes is intended.

For new applications, `create --template vite --name <directory>` scaffolds the framework and installs the brand. Existing applications use `init`. Use `apply --dry-run` only when the user requests conversion of existing styles; package installation and restyling are different operations.

Read `manifest --json` first. It lists every capability, template, size, component and rule. Read `guide` for brand rules, `principles product` or `principles website` for do and don't rules, and `brand tokens <name> --json` for an exact token. `brand fonts`, `brand logos` and `brand voice` read the files and the voice section. Keep colors scoped to component roles; preserve artwork, chart data and unrelated palettes. Use `check --json` and the application's build and interaction tests to verify the result.

Inspect a component with `components inspect <name> --json` and copy a real example with `components emit <name> --state Preview --json`. `--set variant=soft` is accepted only when that prop and value exist. Unknown names are errors.

Render Open Graph and social images with `image templates --json`, then `og` or `social` (or `image render`). Pass the words as flags: `--headline`, `--subtext`, `--eyebrow`, `--quote`, `--attribution`, `--image`. `--json` lists the files it wrote. Sizes are `og` (1200x630), `square` (1080x1080), `portrait` (1080x1350) and `landscape` (1200x675). Templates are `headline`, `statement`, `frame`, `quote` and `announcement`. A frame image fills the card from the top left. No browser is required.

Render a short video with `video templates --json`, then `video render`. Templates are `social`, `announce` and `product`. Sizes are `square` (1080x1080), `vertical` (1080x1920) and `landscape` (1920x1080). The file is an APNG from the same renderer as the still images. The same words write the same file.

The standard shadcn registry is `{{registryHost}}/r/shadcn/{name}.json`, under `@{{bin}}` in components.json. Use `npx shadcn@4.22.1 add @{{bin}}/theme @{{bin}}/<name>` for shadcn's workspace routing and ecosystem integrations. The same registry works with its MCP server. Component references are at `{{registry}}/components`.

With the upstream installer, include the theme explicitly so existing shadcn font and color aliases are updated. Native add applies it automatically.
