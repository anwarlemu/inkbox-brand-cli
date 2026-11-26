# Inkbox illustrations

What the brand's illustrations are, as its own sources draw them. Each rule names where it comes from; nothing here goes
beyond them. `illustrate` follows these rules, and `brand/assets/illustrate.json` holds its subjects.

Sources: **editor** = agd-playground `src/components/inkbox-og/` (`draw.ts`, `brand.ts`, `app.ts`), the share-image
editor at `/inkbox`; **Figma** = the file the editor reads, `KtJhYsxU4hqtBzqqbFuMWy` (share images 739:75090, 739:74904,
739:75571; banners 739:46372, 739:46485; OG background 739:3155; the app in 739:75698); **art** = agd-playground
`public/inkbox-og/` (`octo-sit.png`, `octo-hang.png`, `reef.svg`, `icons/`); **explorations** = agd-playground
`src/components/inkbox/` (`InkboxWindow.tsx`, `variations.ts`), the console's navigation; **tokens** = `brand/tokens.css`.

## The cast

1. **The octopus is the brand's one character: a soft, purple, cube-headed octopus, rendered in 3D.** It comes in two
   poses: sitting (a mascot that sits on a surface) and hanging over an edge (its tentacles over a rule, a window or a
   floor). (art `octo-sit.png`, `octo-hang.png`; editor `brand.ts` OCTOPI)
2. **The octopus is never redrawn, recolored, cropped or traced.** It is used as the art file at its own proportions;
   only its size and place change. (editor `draw.ts`: stickers keep `naturalHeight / naturalWidth`)
3. **The sitting octopus casts the brand's soft shadow,** three drop shadows in the ink (8, 31 and 70 units down);
   the hanging one has none, since it rests on the thing it hangs over. (editor `shadowFilter`, `sit()` and `hang()`)
4. **A hanging octopus sits with its middle about 23 units above the edge it hangs over,** so the tentacles cross it.
   (editor `layoutFor`: app, outline, hatch, funding)

## The ground and its layers

5. **Scenes are built from the share images' layers, in this order: the ground, the reef, the wordmark tile, the
   outline band, hatching, guides, a border, the window, the octopi.** (editor `drawDesign`)
6. **The reef is the Figma file's own vector art along the bottom edge,** scaled with the width and faded into the
   ground on light themes (62 percent on paper and mist, 50 on lavender, none on purple and deep). (art `reef.svg`;
   editor `drawDesign`, `THEMES.reefFade`)
7. **The wordmark tile is the wordmark repeated in rows,** in the tile color at a low strength (9 percent on paper),
   in a bordered panel beside or under the words, or staggered over the whole frame. (editor `tileWords`, `panelWidth`)
8. **The outline band is the wordmark huge and hollow, repeated along a rule that runs through its x-height.** (editor
   `drawDesign` outline, `WORDMARK_X_TOP`)
9. **Hatching is 45 degree hairlines, 19 units apart,** as a floor under a rule or as strips down the sides, mirrored
   on the right. (editor `hatchLines`)
10. **Lines are one unit wide in the theme's line color** (the lilac, here the text-faint token), on rules, guides,
   borders and outlines alike. (editor `THEMES.line`; tokens)
11. **One unit is a pixel of the 1200 by 630 link preview, grown with the frame's area,** so a scene redraws at any
   size with the same proportions. (editor `unitOf`)

## The product

12. **The product appears as the console itself, never a mock:** the workspace rail, the mailbox rail, the message
   list and the open message on the Figma frame's 1040 by 585 grid, in a white window with a soft ink shadow and a
   hairline. (editor `app.ts`; Figma 739:75698; explorations)
13. **A capture goes in a browser window** with the three soft dots and the address, never in a device frame. (editor
   `drawWindow` chrome)
14. **The window's content is placeholder data (Acme),** never a real person's mail. (brand rule; image.json `app`)

## Color

15. **Themes are a ground and an ink: paper, mist, mono, lavender, purple and deep,** each a pair of brand tokens.
   (editor `THEMES`; image.json `themes`)
16. **Pink is the one accent:** the highlighted phrase, a badge's dot, a BETA tag. Scenes without words carry no pink
   except in the console's own tags. (editor `HIGHLIGHTS`, `drawBadge`)

## What `illustrate` does not do

- It does not generate new characters, poses or objects: the octopus has two poses because the art has two.
- It does not turn a person's picture into brand art. `--image` goes only into the console window, as a capture.
- It does not trace the octopus to vectors: in an SVG it is the art file, embedded.
