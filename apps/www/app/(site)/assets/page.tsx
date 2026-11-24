import { Code, PageBody, PageHead, Section } from "@www/components/chrome";
import { CommandList, Gallery } from "@www/components/gallery";
import { examples } from "@www/lib/assets";
import { CLI_COMMAND } from "@www/lib/registry";

export const metadata = { title: "Assets", description: "Share images, social posts, banners, deck slides, video and merch print files from the CLI." };

const RUN = CLI_COMMAND.replace("npx -y ", "npx ");

const COMMANDS: [string, string][] = [
  ["manifest --json", "Every command, flag, template, size, slot, theme, subject and lockup. Start here; an unknown name exits 1 with the closest match."],
  ["image <template|occasion>", "Share images, posts, banners, thumbnails and profile pictures: tile, app, outline, hatch, reef, feature, partner, funding, announce, card and mark, in six themes, at every platform size or custom. PNG, SVG, JPEG and WebP; numbered carousels. Only the words you pass are drawn."],
  ["design new|revise|edit", "A picture you revise in plain words or exact edits, checked at every step. See Designs."],
  ["deck", "Slides at 1920 by 1080 from a JSON file or flags: cover, section, statement, bullets, agenda, timeline, stat, quote, image, questions and end. A PNG per slide and one PDF."],
  ["video <template>", "The share images' layers coming in on the brand's ease-out: reveal, inbox, band, announce, card and a logo sting. MP4, WebM and GIF through ffmpeg, PNG frames without it, or one still."],
  ["merch <item>", "Print files only: SVG at physical size and 300 dpi PNG with bleed and safe area, the sticker's die line, approved lockups only."],
  ["merch <item> (stationery)", "Business card front and back, letterheads (Letter and A4), report cover, certificate, event badge, name tag and notebook cover: built from the lockups, patterns and tokens (the brand made none of its own). PDF, SVG and PNG."],
  ["icons", "The favicon set (ico, 16, 32, 48), the Apple touch icon, web app icons (192, 512, maskable), the 1024 app icon, and the console's Phosphor glyphs (MIT)."],
  ["email <kind>", "Newsletter, announcement, receipt, password reset and signature, as HTML tables mail clients keep, with the logo."],
  ["illustrate <subject>", "The octopus, the reef, the console window and the wordmark patterns as scenes. See Illustrations."],
  ["figma <action>", "Tokens as Figma variables, pushes, pulls and checks through the Figma MCP tools. See Figma."],
];

export default function AssetsPage() {
  return (
    <>
      <PageHead title="Assets" description="The CLI draws the brand's share images, posts, banners, slides, video and merch from the tokens, the logo and the octopus art, the way the share-image editor draws them. The same inputs always write the same files." />
      <PageBody className="max-w-300">
        <Code title="terminal" lang="bash" code={`${RUN} manifest --json\n${RUN} image tile --headline "Give every *AI agent* a way to be reached"\n${RUN} image launch --size square\n${RUN} image feature --image capture.png --image-url acme.com`} />
        <Section title="Commands" description="Each takes --list and --json. Copy goes in as flags or a --content JSON file; *stars* highlight a phrase in pink.">
          <CommandList rows={COMMANDS} />
        </Section>
        <Section title="Share images" description="The ten templates at 1200 by 630, each in an occasion's look. An occasion (launch, feature, partnership, funding, hiring, changelog, milestone, event) brings its words and four looks; --seed gives a new layout for the same words.">
          <Gallery items={examples.image} columns="sm:grid-cols-2 lg:grid-cols-3" />
        </Section>
        <Section title="Posts and banners" description="Square, portrait, story, landscape, the X and LinkedIn banners, and the link previews; --size share, post or banner writes a whole group.">
          <Gallery items={examples.social} columns="grid-cols-2 lg:grid-cols-3" />
        </Section>
        <Section title="Deck" description="Every slide but bullets is a share template at the slide's size, so a deck shares the posts' layers.">
          <Gallery items={examples.deck} columns="grid-cols-2 lg:grid-cols-4" />
        </Section>
        <Section title="Video" description="Entrances use --ds-easing-out, 420 ms each and 80 ms apart; the outline band slides at a constant speed. The last frame is the finished image. --reduced-motion keeps the fades only.">
          <Gallery items={examples.video} columns="sm:grid-cols-2" />
        </Section>
        <Section title="Stationery" description="Print files built only from the lockups, the patterns and the tokens, at common print sizes with bleed. Pass the words; --sample shows Acme placeholders.">
          <Gallery items={examples.print} columns="grid-cols-2 lg:grid-cols-3" />
        </Section>
        <Section title="Icons" description="The octopus on the theme's ground at every size browsers and app stores ask for; the maskable icon keeps inside the 80% circle.">
          <Gallery items={examples.icons} columns="grid-cols-3 lg:grid-cols-6" />
        </Section>
        <Section title="Email" description="Plain HTML tables with inline styles, the brand's colors and type, and the logo.">
          <ul className="grid gap-6 lg:grid-cols-2">
            {examples.email.map((e) => (
              <li key={e.id} className="grid gap-2">
                <iframe src={e.src} title={e.id} className="h-96 w-full rounded-control bg-subtle shadow-s" />
                <code className="font-mono text-caption break-words text-fg-muted">{e.command}</code>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Merch" description="Print files at real size. Sizes are common vendor print areas: confirm them with the vendor's template. One-color files carry the wordmark alone.">
          <Gallery items={examples.merch} columns="grid-cols-2 lg:grid-cols-4" />
        </Section>
      </PageBody>
    </>
  );
}
