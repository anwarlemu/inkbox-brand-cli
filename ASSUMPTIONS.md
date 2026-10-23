# Assumptions for the brand owner to confirm

Each is in force today; each names where it lives, so a change is one edit.

1. Source. Values were measured from the rendered https://www.agentcard.sh on 2026-10-17 (computed styles), with the
   agentcard-website source (main at 5b5c801) for names and structure. The live site is ahead of that branch (its
   blue is #0000FF; the branch has #1520B8 and #2E3AE8). `brand/tokens.css`, `brand/elements.json`.
2. Agentcard has a site only: every project, including an app or dashboard, gets the site's look. `brand/brand.json`
   (`surfaces`).
3. The display face is Neue Haas Grotesk Display, named in the stack and not shipped (it needs a webfont licence), so
   it renders as Helvetica Neue on Apple devices and Helvetica or Arial elsewhere, as on agentcard.sh. Only Inter is
   loaded. `brand/tokens.css` (`--ds-font-display`), `brand/brand.json` (`fonts`).
4. The one markup touch on a restyled site is `data-ds-hero` on the home hero: the blue ground, white type and the four
   stepped bands into the page below. Nothing else gets the blue ground automatically. `brand/site.css`,
   `brand/brand.json` (`touches`).
5. Section headings are centered with their description below, as on agentcard.sh's home. `brand/elements.json`.
6. Muted text tokens are solid colors composited on white (ink at 80, 68, 60 and 45 percent), so they read the same on
   any white and pass AA; on the blue ground, text uses white at 72 percent. `brand/tokens.css`.
7. Small tags are the one place type is set in caps, so the value check allows uppercase. `brand/brand.json` (`type`).
8. Fields are square (no corners), as on agentcard.sh's forms. `brand/elements.json` (input).
9. Code is set in the display face, as on agentcard.sh's code windows. `brand/tokens.css` (`--ds-font-mono`).
10. The logo is the new lockup supplied on 2026-10-17 (`brand/logo/lockup.svg`, `brand/logo/mark.svg`).
11. Review passes at 7 on every score. `brand/brand.json`.
12. The repo is public, so installs need no token. Make it private if the brand's files should not be public.
