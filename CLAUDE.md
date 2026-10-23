# inkbox-ds (working on the harness itself)

This repo is the CLI that applies the Inkbox design system to any project and keeps agents on it. `README.md` says how
it is used. Apps that install it get a different contract, written from `brand/contract.md`. Inkbox has one look, the
console's (`"surfaces": ["site"]` in `brand/brand.json` is the engine's single-look mode): every project gets it.

## Loop

```sh
npm install          # also builds (prepare)
npm run build        # tsc, then scripts/build-brand.mjs (brand/ -> build/)
npm run ci           # build, limits, registry, tests; must pass before you push
```

## Where things are

- `registry/`: the component library, one item per shadcn/ui component (every one of them, rebuilt in the Inkbox
  style, no shadcn code): `components/ui`, `lib/` (cn, surface), `hooks/`, `docs/<item>.md` (frontmatter: type,
  surface, kinds, files...) and `examples/<item>.tsx` (exports `Preview` first, then named states).
  `scripts/build-registry.ts` (`npm run registry`) validates every item, derives files and dependencies from imports,
  adds the theme item from the brand tokens, writes one JSON file per item and an index into `apps/www/public/r`,
  type-checks the library and runs the value check over it. Primitives: `radix-ui`, `cmdk`, `sonner`; icons are
  Phosphor (`@phosphor-icons/react/ssr`, the `...Icon` names, fill weight for the console's glyphs).
- `apps/www/`: the docs site (Next.js), laid out as the console (a rail and page heads), deployed to the Vercel project
  `inkbox-ds` (Agencidev team) with `vercel deploy --prod --scope agencidev-dev` from the repo root; it renders every
  item from source.
- `src/library/`: loading registry items (`registry.ts`) and swap mode (`swap.ts`); `src/commands/add.ts` (add, list).
- `brand/`: the only brand-specific content. `tokens.css` is the single source of values (`:root`). `site.css` is the
  base layer (type defaults). `elements.json` holds how each kind of element is styled, with `match` data for
  detection and a `source`. `reference/` holds the console's screens from the design (used by `review`). `brand.json`
  holds names, fonts and the library's variant names. `logo/` holds the octopus mark, the octopus art and the wordmark.
- Reference for the look: the Figma file "Inkbox (Copy) (Copy)" (`KtJhYsxU4hqtBzqqbFuMWy`), section "New" (node
  427:2715): the console's screens. Values were measured from its 1x renders and layer geometry (the Figma MCP was
  rate limited on the Starter plan, so colors are sampled, type is fitted to text layer widths, radii and sizes come
  from the geometry). When the design changes, re-measure, update `brand/`, and recapture `brand/reference/`.
- `src/project/`: stack detection, main stylesheet and layouts, screens and the files each is drawn from.
- `src/convert/`: converts style values by role in every file type (CSS, templates, scripts, Tailwind, native).
- `src/install/`: the brand stylesheet and fonts, contract, hooks (Claude Code, Codex, Cursor), pre-commit.
- `src/plan/`: the task queue (`state.json` in the app), element detection and `look` output.
- `src/check/`: the value check (rules.ts), used by hooks, pre-commit and `check`.
- `src/review/`, `src/hooks/`, `src/commands/`.

## Rules

- No brand strings in `src/` (read `brand/brand.json`); `scripts/ci-limits.mjs` enforces it.
- No em dashes; American spelling; sentence case.
- Element styles use only brand tokens and follow the animation rules (no ease-in, no `transition: all`, 150 to 300ms);
  the tests check every value.
- Restyle only: nothing the CLI writes may change a project's copy, elements or structure. The only markup it asks for
  is none: Inkbox has no markup touches.
- Library items use only brand token classes (the value check runs over `registry/` in CI), follow the animation
  rules, take data through props (no Next imports, auth or analytics), and have a docs entry and an example.
- Apps install the `release` branch: a compiled tree (no source, intake or dev dependencies) so installs take
  seconds. `npm run release` runs the checks, builds it and pushes it; nothing reaches apps until then. CI and the
  release workflow are in `scripts/ci.workflow.yml` and `scripts/release.workflow.yml`: copy them to
  `.github/workflows/` with a token that has the workflow scope (`gh auth refresh -s workflow`).
- Test changes on real projects (copies in a scratch folder, never the originals): a site, a plain HTML site, a dark
  site, a Tailwind app and a native sample.

## Do not

- Kill processes by pattern (`pkill -f "next dev"`): the owner's other dev servers run on :3000.
- Modify any other brand's repo (agentcard, opencommerce, context-dev) or the Figma file.
- Commit `build`, `dist` or `node_modules`.
