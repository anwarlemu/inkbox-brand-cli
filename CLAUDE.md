# agentcard-ds (working on the harness itself)

This repo is the CLI that applies the Agentcard design system to any site and keeps agents on it. `README.md` says how
it is used. Apps that install it get a different contract, written from `brand/contract.md`. Agentcard has a site
only (`"surfaces": ["site"]` in `brand/brand.json`): every project gets the site's look.

## Loop

```sh
npm install          # also builds (prepare)
npm run build        # tsc, then scripts/build-brand.mjs (brand/ -> build/)
npm run ci           # build, limits, registry, tests; must pass before you push
```

## Where things are

- `registry/`: the component library. `components/ui|site|blocks|visuals`, `lib/` (cn, surface), `hooks/`,
  `docs/<item>.md` (frontmatter: type, surface, kinds, files...) and `examples/<item>.tsx` (exports `Site` or
  `Block`, plus named states). `scripts/build-registry.ts` (`npm run registry`) validates every item, derives files
  and dependencies from imports, adds the theme item from the brand tokens, writes one JSON file per item and an index
  into `apps/www/public/r`, type-checks the library and runs the value check over it.
- `apps/www/`: the docs site (Next.js), deployed to the Vercel project `agentcard-ds` (Agencidev team) with
  `vercel deploy --prod --scope agencidev-dev` from the repo root; it renders every item from source.
- `src/library/`: loading registry items (`registry.ts`) and swap mode (`swap.ts`); `src/commands/add.ts` (add, list).
- `brand/`: the only brand-specific content. `tokens.css` is the single source of values (`:root`). `site.css` is the
  base layer (type defaults, phone steps, the blue hero and its stepped bands). `elements.json` holds how each kind of
  element is styled, with `match` data for detection and a `source`. `reference/` holds the brand's own pages as
  screenshots (used by `review`). `brand.json` holds names, fonts, the home touches and the library's variant names.
  `logo/` holds the lockup and the mark.
- Reference for the look: the live https://www.agentcard.sh, measured as rendered (computed styles). The source is
  `anwarlemu/agentcard-website` (private; clone it read-only into a scratch folder with `gh repo clone`; never write
  to it). The live site is ahead of that repo's main, so values come from the rendered page and structure from the
  source. When the brand changes, re-measure, update `brand/`, and recapture `brand/reference/`.
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
  is `data-ds-hero` on the home hero and `data-ds-ground="blue"` on a header over it.
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
- Modify `~/Desktop/TRIAGE/Work/Agencidev/agentcard-website` or any other brand's repo.
- Commit `build`, `dist` or `node_modules`.
