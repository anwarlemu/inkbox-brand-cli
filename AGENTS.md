# Using this CLI

This file is for an agent that was handed the CLI and nothing else. Every brand fact comes from a command. If a name is not in `manifest`, it does not exist.

The binary name and the brand name come from `brand/brand.json`. The examples below use the published binary, `npx inkbox-ds`. In this repository, `node dist/cli.js` runs the same commands after `npm run prepare`.

## First command

```sh
npx inkbox-ds manifest --json
```

`describe` is the same command. The JSON lists the brand summary, image templates and sizes, video templates and sizes, every component name, and every design-rule topic. Read it before choosing a template, size, component, token or rule.

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

## Images

Social posts and Open Graph images already exist. They are rendered from SVG with `@resvg/resvg-wasm` and the fonts in `brand/fonts`. The same words write the same PNG.

```sh
npx inkbox-ds image templates --json
npx inkbox-ds og --template headline --headline "A mailbox for your agents" --json
npx inkbox-ds social --size square --template statement --headline "Every agent gets an inbox" --subtext "Email, phone and iMessage." --json
npx inkbox-ds image render --size landscape --template frame --headline "The console" --image ./screen.png --out ./images
```

Templates: `headline`, `statement`, `frame`, `quote`, `announcement`.
Sizes: `og` 1200x630, `square` 1080x1080, `portrait` 1080x1350, `landscape` 1200x675.
Grounds: `white` (default), `lilac`.
Exports: `png`, `svg`.

`--content` is a JSON object of those string fields and nothing else. A field the template does not list is an error. A frame image fills the card from the top left. The command does not write copy.

## Video

`video render` makes a 1 second clip: 10 frames at 10 fps. Each frame is the same SVG pipeline as the stills, packed into an APNG. There is no browser and no H.264 encoder, so the file is byte-identical for the same inputs. Play it in a browser. It is not an MP4.

```sh
npx inkbox-ds video templates --json
npx inkbox-ds video render --template social --size square --headline "A mailbox for your agents" --json
npx inkbox-ds video render --template announce --size vertical --eyebrow "New" --headline "Phone lines for agents" --json
npx inkbox-ds video render --template product --size landscape --headline "Every agent gets an inbox" --subtext "Email, phone and iMessage." --json
```

Templates:

- `social` draws the lockup and a headline. Eyebrow and subtext are optional.
- `announce` draws a pink eyebrow pill and a headline. `--eyebrow` is required. Subtext is optional.
- `product` draws the lockup, then a headline and subtext on a raised panel. It does not invent a product screenshot. `--subtext` is required.

Sizes: `square` 1080x1080, `vertical` 1080x1920 (9:16), `landscape` 1920x1080 (16:9).
The vertical size also draws `brand/logo/octopus.png`.
Motion is a fade and a 12px rise on `--ds-easing-out`. Those numbers are fixed.
`--out` is a directory (default `videos`). The file is `{template}-{size}.apng`.

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
- A product screenshot inside the `product` video.
- A component prop, state, template, size or token that is not in `manifest`.
