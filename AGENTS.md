# Using this CLI

This file is for an agent that was handed the CLI and nothing else. Every brand fact comes from a command. If a name is not in `manifest`, it does not exist.

The binary name and the brand name come from `brand/brand.json`. The examples below use the published binary, `npx inkbox-ds`. In this repository, `node dist/cli.js` runs the same commands after `npm run prepare`.

## First command

```sh
npx inkbox-ds manifest --json
```

`describe` is the same command. The JSON lists every command and flag, the image templates, occasions, sizes and themes, the deck slides, video templates, merch items, illustration subjects and lockups, every component name, and every design-rule topic. Read it before choosing a template, size, component, token or rule.

Add `--json` to any agent-facing command. JSON goes to stdout. A bad name exits 1 and prints `{ "ok": false, "error": "..." }`. The command does not substitute a nearby name.

## Brand system

```sh
npx inkbox-ds brand --json
npx inkbox-ds brand tokens --json
npx inkbox-ds brand tokens color --json
npx inkbox-ds brand tokens ds-color-ink --json
npx inkbox-ds brand fonts --json
npx inkbox-ds brand logos --json
npx inkbox-ds brand voice --json
```

`brand tokens` reads `brand/tokens.css`. Groups are `color` (also `colour`), `type`, `spacing`, `layout`, `radii` (also `radius`), `shadow` and `motion`. A token name is exact (`ds-color-ink` or `--ds-color-ink`). An unknown group or token is an error.

`brand fonts` lists the font files in `brand/fonts`, the license next to each file, and any weight token that has no file. The Google Fonts stylesheet asks for Inter 600 and 700, and both that stylesheet and the next/font config ask for IBM Plex Mono 500. Those files are not in the repo. Do not invent a face for a missing weight.

`brand logos` lists the files in `brand/logo`, their pixel or viewBox size, the files that reference them, and the usage lines the principles and elements actually contain. `clearSpace` is null because this repo has no numeric clear-space rule.

`brand voice` is the Voice section of `brand/principles.md`, including the words to avoid.

`tokens <term>` still searches by role. Use `brand tokens` when the name must be exact.

## Make images, posts, slides, video, merch and illustrations

The CLI draws every brand asset headlessly (a Skia canvas, no browser, no account) from the tokens, the fonts, the
logo and the octopus art, the way the share-image editor draws them. The same inputs write the same bytes. Every
command takes `--list` (what exists) and `--json` (the files it wrote); an unknown name exits 1 with the closest one.

```sh
npx inkbox-ds image --list --json
npx inkbox-ds image tile --headline "Give every *AI agent* a way to be reached"
npx inkbox-ds image launch --size square                      # an occasion picks its words and first look
npx inkbox-ds image --occasion hiring --all --size post       # its four looks at every post size
npx inkbox-ds image feature --image capture.png --image-url acme.com
npx inkbox-ds image card --seed 42                             # a new layout for the same words
npx inkbox-ds deck --input deck.json --out deck                # a PNG per slide and deck.pdf
npx inkbox-ds video inbox --size landscape                     # MP4 and WebM (ffmpeg); --still for one PNG
npx inkbox-ds merch poster --headline "Give every *AI agent* a way to be reached"
npx inkbox-ds illustrate reef --size og
npx inkbox-ds figma tokens
```

- `image` (shortcuts `og` and `social`): templates `tile`, `app`, `outline`, `hatch`, `reef`, `feature`, `partner`,
  `funding`, `announce` and `card`; occasions `launch`, `feature`, `partnership`, `funding`, `hiring`, `changelog`,
  `milestone` and `event`; themes `paper`, `mist`, `mono`, `lavender`, `purple` and `deep`. Sizes: `og`, `card`,
  `linkedin`, `square`, `portrait`, `story`, `landscape`, `li-square`, `x-banner`, `linkedin-banner`, `li-page`,
  `youtube`, `email`, or `custom` with `--width` and `--height`; `--size share|post|banner|all` writes a group.
  Copy: `--headline` (`*stars*` set a phrase in pink), `--body`, `--credit` (an `@handle` under a post),
  `--badge pill|solid|dot|none`, `--badge-text`, `--partner` (a name beside the lockup, never another logo), or the
  same fields in `--content file.json`. `--image` puts your capture in the window of `app` and `feature` only.
  PNG and SVG (text as paths); `--out` is a directory or one `.png`/`.svg` file.
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

## Components

```sh
npx inkbox-ds components list --json
npx inkbox-ds components inspect button --json
npx inkbox-ds components emit button --state States --set variant=soft --json
npx inkbox-ds show button --json
```

`inspect` returns the props, variants and states declared in the component source and its examples. `emit` copies one example function. `--set prop=value` adds a JSX line that uses only declared props. An unknown component, state, prop or value is an error. The command does not guess a variant.

`show` returns the full source, examples, usage rules and dependencies. `add` copies a component into a React and Tailwind 4 app. `list` is the same catalog.

Props that are only spread onto the DOM element are not enumerated. States are the example functions the component exports, such as `Preview` and `States`.

## Design principles

Product interfaces and website pages share one look. `brand.json` lists a single surface, `site`, and there is no `product.css`.

```sh
npx inkbox-ds principles --json
npx inkbox-ds principles product --json
npx inkbox-ds principles website --json
npx inkbox-ds principles voice --json
npx inkbox-ds principles elements --json
```

`product` and `website` return the same do and don't lists, taken from `brand/principles.md` and `brand/rubric.md`. `elements` returns each rule in `brand/elements.json`. Other topics are the section headings of those files. An unknown topic is an error.

`guide` prints the long agent workflow. `look <file>` gives element guidance for a file. `check` checks style values.

## What the commands will not invent

- A font file for a weight token that has no file.
- A numeric logo clear-space.
- A second theme for product versus website.
- A product screenshot: the window shows the console's placeholder inbox unless you pass `--image`.
- A component prop, state, template, size or token that is not in `manifest`.
