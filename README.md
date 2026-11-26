# Inkbox design system

Components, design tokens and a CLI for building Inkbox pages and interfaces.

Reference: https://inkbox-ds.vercel.app

## Consistent CLI workflow

```sh
npx inkbox-ds info --json
npx inkbox-ds search button --json
npx inkbox-ds view button --json
npx inkbox-ds add button card --dry-run --json
npx inkbox-ds add button card --json
npx inkbox-ds add button --diff
```

For a new app: `npx -y github:anwarlemu/inkbox-brand-cli#release create --template vite --name my-app`.
For an existing app: `init` sets up the theme; `apply --dry-run` previews a requested restyle.
`add` also installs agent instructions and portable Claude/Codex skills, so a separate init is optional.
Use `--cwd <app>` for a different directory. Existing components.json aliases, TS/JS output, local helpers, unrelated registries and local component edits are preserved.

The standard registry works with shadcn 4.22.1:

```sh
npx inkbox-ds init
npx inkbox-ds shadcn add @inkbox-ds/theme @inkbox-ds/button
npx inkbox-ds mcp init --client claude
```

Include `theme` explicitly when using upstream shadcn to update existing theme aliases. Native `add` handles it automatically. Shared workspace installation, presets, migrations, registry authoring and MCP use the pinned upstream implementation via `shadcn <args...>`. Bundled component discovery works offline; installation needs network access for missing dependencies. Agent hosts must load their MCP configuration before it is available in a session.

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

`init` and `add` install what the library's components need: brand tokens, the Tailwind theme, fonts and the
provider they render in. The components render fully styled (the brand font and type inside them), and the app's
existing pages keep their look. The base layer (the page's type, colors, headings, links and focus on every element)
comes only with a decision to brand the whole app: `apply` with no targets, `create`, or `init` in an app with no
pages yet. An app set up with the base layer keeps it on every later `add` or selection.
Requires Node.js 20 or later. Read [the agent guide](https://inkbox-ds.vercel.app/agents.md) with any coding agent.
The same guide is installed at `.ds/agent-guide.md`. Agents that do not auto-load project instructions should read it explicitly.

## Add components

Run `add` from the target app root. Components require React 19.2+, Tailwind CSS 4, and valid project configuration. For other frameworks, run the bare CLI command to apply the brand instead. In a React and Tailwind 4 app, add the components the page needs:

```sh
npx inkbox-ds add button card field input
```

The CLI copies component source, installs dependencies and adds the theme. It uses the project’s `src` folder and
configured aliases and components.json paths. Read each component’s examples and usage notes before changing it.

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
For images, posts, banners, slides, video, merch, illustrations and Figma, run npx inkbox-ds manifest --json, then the asset command with --list.
Start from npx inkbox-ds manifest --json. It lists every template, size, component and rule.
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
| `manifest` | List every capability, template, size, component and rule. `describe` is the same command. |
| `brand` | Read tokens, fonts, logos and voice. `brand tokens <group-or-token>` reads one group or one exact token. |
| `principles [topic]` | Read product and website rules, voice, or one section. `product` and `website` use the one console look. |
| `components` | List components. `components inspect <name>` reads props and states. `components emit <name>` copies real markup. |
| `image` | Share images, posts, banners, thumbnails and profile pictures: eleven templates, six themes, every platform size. PNG, SVG, JPEG and WebP. |
| `design` | A picture you revise: `new`, `revise "bigger headline, logo top right"`, `edit`, `undo`, `variants`, `sizes`, `check`. |
| `og`, `social` | `image` at the link-preview size, or a post size. |
| `deck` | Slides at 1920 by 1080: a PNG per slide and one PDF. |
| `video` | Motion pieces as MP4 and WebM (ffmpeg), PNG frames, or one still. |
| `merch` | Print files at real size with bleed: SVG in inches and PNG at a dpi. |
| `illustrate` | The octopus, the reef, the console window and the wordmark patterns as scenes. SVG and PNG. |
| `icons` | Favicons, app icons and the console's glyphs (Phosphor, MIT). |
| `email` | Emails as HTML tables: newsletter, announcement, receipt, password reset, signature. |
| `figma` | Tokens as Figma variables, pushes, pulls and checks through the Figma MCP tools. |

## Make images, posts, slides, video, merch and illustrations

The CLI draws every brand asset headlessly (a Skia canvas, no browser, no account) from the tokens, the fonts, the
logo and the octopus art, the way the share-image editor draws them. The same inputs write the same bytes. Every
command takes `--list` (what exists) and `--json` (the files it wrote); an unknown name exits 1 with the closest one.

```sh
npx inkbox-ds image --list --json
npx inkbox-ds image tile --headline "Give every *AI agent* a way to be reached"
npx inkbox-ds image launch --headline "Agent Cards" --size square   # an occasion picks its first look
npx inkbox-ds image --occasion hiring --all --size post --headline "Come build with us"
npx inkbox-ds image feature --image capture.png --image-url acme.com
npx inkbox-ds image card --headline "..." --seed 42             # a variation of the layout
npx inkbox-ds deck --input deck.json --out deck                # a PNG per slide and deck.pdf
npx inkbox-ds video inbox --size landscape                     # MP4 and WebM (ffmpeg); --still for one PNG
npx inkbox-ds merch poster --headline "Give every *AI agent* a way to be reached"
npx inkbox-ds illustrate reef --size og
npx inkbox-ds figma tokens
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

## I need X: which command

| I need | Run |
|---|---|
| A link preview, post, banner, thumbnail or ad at any size | `npx inkbox-ds image <template> --size <id or custom> --headline "..."` |
| A picture the person will revise with me | `npx inkbox-ds design new <template>`, then `design revise "..."` |
| The same picture at every size | `npx inkbox-ds design sizes <file> --to og,square,story,...` or `image --size all` |
| A numbered carousel | `npx inkbox-ds image <template> --carousel slides.json` |
| A profile picture or the lockup alone | `npx inkbox-ds image mark --size avatar` |
| Slides or a PDF deck (cover, agenda, timeline, bullets, stat, quote, image, questions, end) | `npx inkbox-ds deck --input deck.json` |
| A video, a GIF loop or a logo sting | `npx inkbox-ds video <reveal\|inbox\|band\|announce\|card\|logo> --format mp4,gif` |
| Merch or stationery print files (business card, letterhead, report cover, certificate, badge, name tag, notebook, poster) | `npx inkbox-ds merch <item> --format pdf,png` |
| Favicons, app icons and the console's glyphs | `npx inkbox-ds icons`, `npx inkbox-ds icons glyphs` |
| An email (newsletter, announcement, receipt, password reset, signature) | `npx inkbox-ds email <kind>` |
| An illustration, pattern or background still at any size | `npx inkbox-ds illustrate <subject> --size <id>` |
| A component, section or page | `npx inkbox-ds add <name>`; `npx inkbox-ds list` shows every one |
| Figma variables, pushes and checks | `npx inkbox-ds figma <action>` |

## Revising a design

When a person wants a picture they can react to ("make it bigger", "darker", "logo top right"), make a design file and
revise it instead of drawing a new image each time. Every write draws the picture and checks it; anything off brand,
cut off, overlapping, illegible or under a platform's furniture is refused and nothing changes.

```sh
npx inkbox-ds design new tile --size x-banner --headline "Every agent gets *an inbox*" -o banner.design.json
npx inkbox-ds design revise banner.design.json "bigger headline, logo top right, darker theme"
npx inkbox-ds design edit banner.design.json --layer art.scale=0.8 --set body="Email, phone and calendars"
npx inkbox-ds design undo banner.design.json
npx inkbox-ds design variants banner.design.json --by theme      # one file each and a contact sheet
npx inkbox-ds design sizes banner.design.json --to og,square,story,linkedin-banner
npx inkbox-ds design check banner.design.json --json
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

## Read the brand, the components and the rules

```sh
npx inkbox-ds manifest --json
npx inkbox-ds brand tokens color --json
npx inkbox-ds brand fonts --json
npx inkbox-ds brand logos --json
npx inkbox-ds brand voice --json
npx inkbox-ds principles product --json
npx inkbox-ds principles website --json
npx inkbox-ds components inspect button --json
npx inkbox-ds components emit button --state States --set variant=soft --json
```

`manifest` is the list an agent should read first. `brand` only returns tokens, font files, logo files and voice that are in the repo. Inter 700 is requested by the stylesheet but not shipped; it is reported, not filled in. Logo files do not define a numeric clear-space. `principles product` and `principles website` return the same rules, because this brand has one look. `components emit` copies an example and rejects props the component does not declare.

## Update an existing interface

The `apply` command restyles existing code, with color changes scoped to recognized components. It can replace matching React
components, convert style values, install styles and fonts, and add agent rules and checks. Review the diff before
continuing. This conversion preserves existing copy and behavior. It installs color tokens and applies them at
identified component usage sites, including supported variants and states. Shared palette definitions, chart data,
artwork, gradients and unrelated colors stay intact. Unknown or dynamic color roles are left for review. The
installed checks follow the same color scope, including `check --fix`.

```sh
npx inkbox-ds apply --dry-run
npx inkbox-ds apply
```

To restyle only part of an app, name it. Each target is a route, a file or glob, a library component (any case:
`Button`, `alert-dialog`) or one of the app's own components (`PrimaryButton`):

```sh
npx inkbox-ds apply button card dialog          # those components, wherever the app uses them
npx inkbox-ds apply /settings /billing          # those pages and the components only they use
npx inkbox-ds apply "app/(marketing)/**/page.tsx"
npx inkbox-ds apply button --pages /settings    # buttons on the settings page only
npx inkbox-ds apply /settings --with-shared     # also the layout and shell files it shares
npx inkbox-ds apply button --dry-run --json     # each file it would change, with the reason
```

A named page renders in the brand: its root element takes the `ds-page` class (the brand's type, text color and
ground on that page), its values convert to tokens, and its uses of components other pages share take the library's
look at the use site (`className` with important classes), while the shared components stay as they are. A page can
be a route, a file, or, in an app that routes without a router, its page component by name (`Settings`). Naming a
library component also restyles a component the app built on its own cva (shadcn's `button.tsx`), in its own file.

Nothing outside the selection changes apart from the shared setup (brand tokens, theme and fonts, without the base
layer, and the provider the library's components render in): pages outside it render as before. A name that matches
nothing stops the run with the closest names. The selection is recorded in `.ds/state.json`: `apply --redo` repeats
it, a later `apply <more>` adds to it, and a bare `apply` takes the whole app. The checks, hooks and pre-commit
enforce the brand only inside the selection; `check --all` checks every file.

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
the complete file. `guide`, `manifest`, `describe`, `brand`, `principles`, `components`, `list`, `show`, `look`, `tokens`, every asset command with `--list`, and `check` without `--fix` are read-only. `init` and
`add` accept `--dry-run`; add `--json` for structured results. `image`, `og`, `social`, `deck`, `video`, `merch`, `illustrate` and `figma` write files under `--out` and nothing else. JSON goes to stdout; progress goes to stderr. With `--json`, an unknown name exits 1 and prints `{ "ok": false, "error": "..." }`.

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

The explicit `apply` command scopes color conversion to recognized components and preserves unrelated artwork and shared palette data. The legacy bare-command conversion remains for compatibility; use `apply` for new restyling tasks.
