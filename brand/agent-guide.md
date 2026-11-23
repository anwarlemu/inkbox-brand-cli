# {{brand}} design system: instructions for agents

Use this system to build {{brand}} pages and interfaces from the user's brief. These instructions work with any agent that can read text and edit project files. The CLI is a local Node.js tool; no model account or agent-specific integration is needed for setup, discovery, installation or token checks.

## Start here

1. Run `{{cli}} manifest --json` (the same command is `describe`). It lists every capability, template, size, component and rule. If a name is not in that list, it does not exist. Do not invent one.
2. Read the project instructions and package.json. Identify the framework, package manager, stylesheet and import aliases. Use the user's requirements to decide whether to build new UI or restyle existing UI.
3. Read this guide, then the relevant component references. The library is at {{registry}}/components. Plain text is at {{registry}}/llms.txt; a complete copy is at {{registry}}/llms-full.txt.
4. Reuse the library's components and variants. Do not recreate them from screenshots or guess their props. Each reference contains the actual exports, dependencies, working examples and source code. Use `{{cli}} components inspect <name> --json` for props and states, and `{{cli}} components emit <name> --json` for markup.

## Install and prepare a project

Requires Node.js 20 or later. Run commands from the consuming project root, not the design-system repository.

```sh
npm install --save-dev {{source}}
{{cli}} init
```

`npm install` installs the CLI only. `init` installs styles, fonts and agent instructions without converting existing components or creating conversion review tasks. It preserves other instructions already in the project. Inspect its warnings about a missing stylesheet or alias.

React components require React 19 or later, Tailwind CSS 4 and a working build. The installer follows components.json and TypeScript or JavaScript aliases; without aliases, it uses relative imports. Set up that framework first. Other frameworks can use the CSS tokens and styling guidance, but cannot render the React components.

For an existing interface that the user wants restyled, preview the explicit apply command:

```sh
npx -y {{source}} apply --dry-run
npx -y {{source}} apply
```

The apply command can adapt matching components, convert style values, and install agent rules and hooks. Color conversion is scoped to recognized components; unrelated palettes and artwork remain unchanged. The legacy bare command also converts styles; use explicit commands for setup and discovery. Subsequent runs resume review tasks. `--redo` repeats conversion. Review the diff and test existing behavior after conversion; a successful exit is not proof that the visual review is complete.

## Find, inspect and add components

```sh
{{cli}} components list --json
{{cli}} components inspect select --json
{{cli}} components emit select --state Preview --json
{{cli}} show select --json
{{cli}} add field select button --dry-run --json
{{cli}} add field select button --json
```

The add command above is an example, not the list required for every page. Choose items from `components list`. `components inspect` returns the props and states declared in that component's source. `components emit` copies one example function and, when you pass `--set prop=value`, a JSX line that uses only those props. An unknown component, state, prop or value is an error. `show` is read-only and works offline using the registry bundled with the CLI. `show --json` returns source, examples, usage rules, exports, dependencies and links. Hooks and helper libraries are included in the JSON index.

`add` copies source files and their transitive dependencies, installs missing npm packages, and wires the theme. Existing files are kept. Use `--overwrite` only when intentionally replacing local component changes. Read the returned file list and warnings. Generated imports and target files follow components.json and the project alias configuration. Existing utility files are preserved; brand helpers use their own names.

For HTTP-only agents, fetch `{{registryHost}}/r/index.json`, then `{{registryHost}}/r/<name>.json` or `{{registryHost}}/r/<name>.md`. Follow `requires` recursively. Each `files[].path` is relative to the source root; `files[].content` is the exact source. Each example lists its own `requires` and `packages`; install these too when using that example. Do not copy the example file as the component implementation. The CLI handles dependency ordering and theme installation for you.

The component reference states its source. `{{registryHost}}/r/audit.json` records the reference basis for all components. Many components come straight from the console's design (Figma 427:2715); the rest extend its patterns because the design has no standalone equivalent (menus, calendars, charts). Each reference says which. Do not describe extensions as exact copies of the design.

## Compose the interface

- Follow the user's brief. For new pages, add the required content and behavior. When only restyling an existing page, preserve its content, links, order and behavior unless the user requests changes.
- Use component props and variants shown in the source. Read the named example functions before composing compound components. Keep client state inside a client component when using Next.js; imports of client components can still be rendered by server pages.
- Apply color tokens by component and state (primary action, field, panel, selected, invalid), using the component reference. The restyle installs the color definitions and Tailwind aliases, then maps identified uses. Preserve shared palette definitions, chart data, artwork, gradients and unrelated colors; do not replace every occurrence of a color or repurpose a shared variable. Leave ambiguous dynamic styling for review.
- `init`, `add` and restyle install the complete token set: colors, typography, spacing, layout, radii, shadows, blur and motion. Tailwind utilities read those variables, including fractional spacing, font weights and transition durations. Keep shared values in these tokens so edits remain consistent across components.
- Use design tokens for custom styles. `{{cli}} tokens <term> --json` finds values; `{{cli}} look <element-or-file> --json` explains styling by role. Use `var(--ds-*)` in CSS or the matching Tailwind utilities.
- Every word is Inter: 14px regular for body and controls, 20px regular for page and dialog titles, medium for tabs and card titles. Keys, hosts and IDs are IBM Plex Mono. Use the purple pill for the one main action, lilac wells and rails, 40px fields with the lilac-gray edge, Shadow/S on raised white panels and filled Phosphor glyphs. Do not introduce unrelated colors, shadows or type scales.
- Every icon is Phosphor: `@phosphor-icons/react` on the web (import from `@phosphor-icons/react/ssr` in server components), `phosphor-react-native` in native apps. Use the fill weight for navigation and object glyphs, regular for chevrons, close, plus and other line marks. Do not add another icon library or draw icons as inline SVG; `check` flags other icon packages.
- The installed stylesheet imports `./_{{bin}}/brand.css` and `./_{{bin}}/theme.css` beside the main stylesheet. `brand.css` includes tokens and base styles. Keep both imports after `@import "tailwindcss"`. Let the installer configure fonts; do not add a second font loader.
- Put one control in each Field. Field connects labels, help, errors and required state. Validation and submission belong to your form. For Select use `value` and `onValueChange`, SelectTrigger with SelectValue, and SelectContent with SelectItem; values must be non-empty strings. Give the root a `name` for FormData. Use `defaultValue` only for uncontrolled input.
- Connect every action to its intended behavior. Handle empty, loading, disabled, invalid, success and error states. Preserve keyboard controls, focus return, accessible names and native form semantics. Never present a preview's local demo action as a completed backend operation.
- Use the provided portal behavior. Surface is for an isolated preview or a scoped theme; ordinary pages do not need an extra Surface wrapper. Mount one Toaster per application when using toast notifications.

## Interaction and motion rules

- Rare triggers (onboarding, occasional feedback, celebrations) may use expressive animation. Keep it interruptible and respect reduced motion; never make an action wait for it. Repeated feedback is a frequent interaction, even if it is called a celebration.
- Tens of uses per day (hover effects, list navigation) get only subtle color, background, border-color, shadow or opacity changes, normally 100ms (the fast step). Reuse one component variant and interaction treatment for each role.
- Hundreds of uses per day, keyboard shortcuts and command palette toggles have no animation, transition or smooth-scroll wait. Use `data-ds-motion="instant"` on custom high-frequency surfaces, including portaled content. The command components already do this.
- Show press feedback on pointer-down with `:active` (or `onPointerDown` for custom drawing), never after click/touch-up. Keep the actual action on accessible click/keyboard activation. Use `touch-action: manipulation` on ordinary controls to avoid the tap delay while preserving zoom.
- Keep dimensions, padding, gaps and font metrics identical across hover, focus and pressed states. Never scale a button or change font weight from 400 to 500/600 on interaction. Change visual styling instead.
- Buttons and compact controls use `rounded-pill`; cards use `rounded-dialog` (24px), including small cards and cards with footers. Multi-select fields also use 24px corners; their individual chips remain pills.
- All dropdown menus and popup panels use the shared 16px `rounded-panel` radius, including submenus, command palettes, date pickers, hover cards, tooltips, dialogs and toasts. Sheets and drawers use it on their exposed corners.
- Use shared components, size variants and spacing tokens. Equivalent sections share a gutter; equivalent controls share padding. Do not invent separate hover treatments or per-instance spacing for the same component role.
- Audit every debounce, timeout, transition wait and artificial latency. Update controlled inputs and local filtering immediately. Debounce only necessary network/background work, with immediate local feedback and stale-result cancellation. Never wait for an exit animation before accepting input or opening the next view.
- `check` reports UI timers for review. Remove artificial waits. For an essential nonblocking timer, put `// ds-latency: <specific reason>` immediately above the call, explaining what it delays and why typing/actions remain immediate. This documents an audit, not a general exemption for delayed input.
- Verify in a browser with motion enabled and reduced motion: hold a pointer down before release, type rapidly, toggle the command palette and shortcuts repeatedly, compare bounds and font weight before/after hover and press, and check consistent section/component padding. Static checks cannot establish actual usage frequency or timing by themselves.

## Make images, posts, slides, video, merch and illustrations

The CLI draws every brand asset headlessly (a Skia canvas, no browser, no account) from the tokens, the fonts, the
logo and the octopus art, the way the share-image editor draws them. The same inputs write the same bytes. Every
command takes `--list` (what exists) and `--json` (the files it wrote); an unknown name exits 1 with the closest one.

```sh
{{cli}} image --list --json
{{cli}} image tile --headline "Give every *AI agent* a way to be reached"
{{cli}} image launch --headline "Agent Cards" --size square   # an occasion picks its first look
{{cli}} image --occasion hiring --all --size post --headline "Come build with us"
{{cli}} image feature --image capture.png --image-url acme.com
{{cli}} image card --headline "..." --seed 42             # a variation of the layout
{{cli}} design new tile --size x-banner --headline "..."   # a picture to revise (below)
{{cli}} deck --input deck.json --out deck                # a PNG per slide and deck.pdf
{{cli}} video inbox --size landscape                     # MP4 and WebM (ffmpeg); --still for one PNG
{{cli}} merch poster --headline "Give every *AI agent* a way to be reached"
{{cli}} illustrate reef --size og
{{cli}} figma tokens
```

- `image` (shortcuts `og` and `social`): templates `tile`, `app`, `outline`, `hatch`, `reef`, `feature`, `partner`,
  `funding`, `announce`, `card` and `mark` (the lockup alone; the octopus alone in a profile picture); occasions
  `launch`, `feature`, `partnership`, `funding`, `hiring`, `changelog`, `milestone` and `event` pick looks; themes
  `paper`, `mist`, `mono`, `lavender`, `purple` and `deep`. Sizes (the same ids in every brand CLI): `og`, `linkedin`,
  `square`, `portrait`, `story`, `landscape` (also `card`), `li-square`, `x-banner`, `linkedin-banner`,
  `linkedin-page`, `youtube`, `youtube-thumbnail`, `email`, `avatar`, or `custom` with `--width` and `--height`;
  `--size og,x-banner`, a group (`share`, `post`, `banner`, `profile`) or `all`. Copy: `--headline` (`*stars*` set a
  phrase in the highlight), `--body`, `--badge`, `--credit` and `--partner` (a name beside the lockup, never another
  logo), or the same fields in `--content file.json`. Only the words you pass are drawn, whole: they shrink to a
  readable size and re-wrap, and copy that still does not fit fails and says what to shorten. `--sample` fills sample
  copy to look at a template. Words, the lockup and the octopus keep out of what a platform covers (the X profile
  picture, the story bars, YouTube's crop). `--image` puts your capture in the window of `app` and `feature` only.
  `--carousel steps.json` makes numbered pictures with one look. PNG, SVG, JPEG and WebP (`--format png,jpg` or
  `all`); `--out` is a directory or one file.
- `deck`: `cover`, `section`, `statement`, `bullets` (up to six points), `stat`, `quote` (attribute to a role, never a
  made-up person), `image` and `end`, at 1920 by 1080, from `--input deck.json` (`{ "slides": [{ "type": "cover",
  "title": "..." }] }`) or one slide from flags.
- `video`: `reveal` (any template with `--layout`), `inbox`, `band`, `announce` and `card` at `square`, `portrait`,
  `vertical` and `landscape`. Layers come in on `--ds-easing-out` (420 ms, 80 ms apart; never ease-in, nothing from
  nothing) and the piece ends on the finished image. `--reduced-motion` keeps the fades only. Without ffmpeg, `--format
  frames` writes PNG frames.
- `merch`: `cap-front`, `tee-front`, `tee-back`, `hoodie-front`, `tote`, `mug-wrap`, `sticker` (die line in the SVG)
  and `poster`, at real size with bleed (SVG in inches, PNG at `--dpi`). Sizes are common vendor print areas: confirm
  them with the vendor. One-color variants carry the wordmark alone; the octopus is full-color art.
- `illustrate`: `octopus` (`--pose sit|hang`), `reef`, `window`, `tile`, `pattern`, `outline` and `hatch`, at any image
  size. SVG keeps real vector shapes (the reef is the Figma file's own vectors); the octopus is never redrawn. The
  rules, each with its source, are in `brand/illustration.md`.
- `figma`: `tokens` (variables and effect styles plus `use_figma` scripts), `push image|slide|illustration|asset|
  component|page`, `pull <url>` and `check <files>`. The CLI never calls Figma: it writes files and prints the Figma MCP
  steps in order.

Never put real people's names, posts, photos or avatars, or another company's logo, in an asset: use Acme and the
person's own `--image`.

## Revising a design

When a person wants a picture they can react to ("make it bigger", "darker", "logo top right"), make a design file and
revise it instead of drawing a new image each time. Every write draws the picture and checks it; anything off brand,
cut off, overlapping, illegible or under a platform's furniture is refused and nothing changes.

```sh
{{cli}} design new tile --size x-banner --headline "Every agent gets *an inbox*" -o banner.design.json
{{cli}} design revise banner.design.json "bigger headline, logo top right, darker theme"
{{cli}} design edit banner.design.json --layer art.scale=0.8 --set body="Email, phone and calendars"
{{cli}} design undo banner.design.json
{{cli}} design variants banner.design.json --by theme      # one file each and a contact sheet
{{cli}} design sizes banner.design.json --to og,square,story,linkedin-banner
{{cli}} design check banner.design.json --json
```

1. Make it with `design new`, then look at the PNG it wrote.
2. Change it with `design revise "<plain words>"` (a fixed grammar: anything it does not understand fails and lists
   what it can do) or, when you know the exact change, `design edit` (`--set`, `--theme`, `--size`, `--template`,
   `--layer <id>.anchor|dx|dy|scale|align|hidden`, `--hide`, `--seed`).
3. Look again, and repeat until the person is happy. `design history`, `undo` and `redo` walk the steps.
4. Never edit the PNG or SVG by hand: change the design file and let the CLI draw it. `design --json` lists every
   template, its layers and what each can do, the phrases and the rules.

Slides (`slide-cover`, ...), print files (`merch-poster`, ...), illustrations (`illustration-reef`, ...) and video
(`video-reveal`, ...) are designs too: their copy, theme, options, size and seed change the same way.

## Read the brand system

`brand` reads the tokens, font files, logo files and voice from the brand files. It does not search or guess.

```sh
{{cli}} brand --json
{{cli}} brand tokens --json
{{cli}} brand tokens color --json
{{cli}} brand tokens ds-color-ink --json
{{cli}} brand fonts --json
{{cli}} brand logos --json
{{cli}} brand voice --json
```

Groups are `color` (also `colour`), `type`, `spacing`, `layout`, `radii`, `shadow` and `motion`. A token name is exact, such as `ds-color-ink`. `brand fonts` lists the font files on disk and any weight token that has no file. `brand logos` lists the files in `brand/logo`, where they are referenced, and the usage lines the principles actually contain. There is no numeric clear-space rule. `brand voice` is the Voice section of the principles.

## Read the design rules

Product interfaces and website pages use the one look in the brand files. `brand.json` lists a single surface, `site`, and there is no separate product theme.

```sh
{{cli}} principles --json
{{cli}} principles product --json
{{cli}} principles website --json
{{cli}} principles voice --json
{{cli}} principles elements --json
```

`product` and `website` return the same do and don't lists, taken from the principles and the review rubric. `elements` returns each element rule from `brand/elements.json`. An unknown topic is an error.

## Verify before finishing

1. Run the consuming project's type checks, tests and production build.
2. Run `{{cli}} check --json`. Exit 0 means no detected token or interaction violations; exit 1 means unresolved violations or a command error. Read the JSON result, fix the findings and rerun. Static checks do not replace accessibility and interaction testing.
3. Test every interaction with mouse and keyboard. Submit invalid and valid forms, choose options, open and close overlays, and test loading/error paths. Check desktop and phone widths, focus visibility, overflow and reduced-motion behavior.
4. Compare screenshots against the relevant library previews and reference. `{{cli}} review http://localhost:3000 --any` can capture and review a running page. It requires playwright-core and Chromium. Automated scoring uses an available supported reviewer; if none is available, read the saved screenshots and report a manual review. Never claim an independent score that was not produced.
5. Report what changed, which checks passed, and any remaining limitations. If conversion left follow-up tasks, complete or report them explicitly.

## Instructions and hooks

`init` and conversion install AGENTS.md and a local `.ds/agent-guide.md`, plus supported agent instruction files and hook configuration. Agents that do not load those files automatically should read them explicitly. Hooks support Claude Code, Codex and Cursor when enabled by that tool; other agents run the CLI checks directly. Codex hook activation may require the user's `/hooks` trust step. No hook integration is required to use the components correctly.

Read-only commands: `guide`, `manifest`, `describe`, `brand`, `principles`, `components` (list, inspect and emit), `list`, `show`, `look`, `tokens`, `check` without `--fix`, and every asset command with `--list`.
Commands that write project files: `init`, `add`, `apply`, the legacy bare conversion command, `check --fix`, `image`, `og`, `social`, `design`, `deck`, `video`, `merch`, `illustrate`, `figma`, and review/snapshot state updates. Use `--dry-run` with `init`, `add` or conversion to inspect planned writes. JSON goes to stdout and progress goes to stderr. Pass `--json` and a bad name returns `{ "ok": false, "error": "..." }` with exit code 1. Installation/build failures return a nonzero exit code. Asset commands write only under `--out`.

## Project configuration and agent handoff

Start with `{{cli}} info --json`, then `search <term> --json` and `view <names...> --json`. These commands are read-only. `show` and `inspect` remain aliases of `view`.

`add` respects components.json, inherited TypeScript or JavaScript aliases, the target stylesheet and the package manager. It emits JSX/JS when `tsx` is false, installs the theme and agent guidance, and preserves differing local files. Use `add <names...> --diff` to review changes before `--overwrite`. Use `--cwd <app>` from a repository root. For shared workspace packages, use the upstream installer described below.

`create --template vite --name <directory>` scaffolds a new app and installs brand components. `init` configures an existing app; `init button card` also adds components. `apply --dry-run --json` previews a requested conversion of existing styles. Do not run conversion to discover or install the library.

Portable skills are installed in `.agents/skills/{{bin}}/SKILL.md` and `.claude/skills/{{bin}}/SKILL.md`; the full guide is `.ds/agent-guide.md`. Read `add --view` or the installed source for imports resolved to this project's paths. The installed brand utility is separate from the application's existing `lib/utils` exports.

The standard shadcn registry is configured under `@{{bin}}` in components.json. For workspace routing, install with `{{cli}} shadcn add @{{bin}}/theme @{{bin}}/button`. Include the theme explicitly with upstream shadcn so existing font and color aliases are updated. Native `add` applies it automatically.

Advanced operations use pinned shadcn 4.22.1: `shadcn <args...>`, `mcp`, `registry`, `preset`, `migrate`, `eject`, and `build`. These need network access on first use and preserve upstream output formats. Native brand commands accept `--json`. Preset/base changes are upstream operations that may change the brand; use them only when requested. MCP configuration alone does not prove the agent host has loaded its server.

The explicit `apply` command scopes color conversion to recognized components and preserves unrelated artwork and shared palette data. The legacy bare-command conversion remains for compatibility; use `apply` for new restyling tasks.
