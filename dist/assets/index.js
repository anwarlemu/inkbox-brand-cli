import { createRequire as __ds_require } from 'node:module'; const require = __ds_require(import.meta.url);

// dist/assets/canvas.js
import { readFileSync as readFileSync2 } from "node:fs";
import { createCanvas, GlobalFonts, SvgExportFlag } from "@napi-rs/canvas";

// dist/lib/brand.js
import { readFileSync } from "node:fs";

// dist/lib/paths.js
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
var PKG_ROOT = (() => {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(dir, "brand", "brand.json")) && dirname(dir) !== dir)
    dir = dirname(dir);
  return dir;
})();
var pkgPath = (...parts) => join(PKG_ROOT, ...parts);

// dist/lib/brand.js
var tokenFile;
function tokens() {
  tokenFile ??= JSON.parse(readFileSync(pkgPath("build", "tokens.json"), "utf8"));
  return tokenFile;
}
function colorHex(name, theme = "site") {
  const t = tokens();
  const table = theme === "site" ? t.site : theme === "product" ? t.product : { ...t.product, ...t.dark };
  const raw = table[`--ds-color-${name}`];
  if (!raw)
    return void 0;
  if (raw.startsWith("#"))
    return raw.toUpperCase();
  const rgb2 = raw.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[/,]\s*([\d.]+))?/);
  if (!rgb2)
    return void 0;
  const hex = [rgb2[1], rgb2[2], rgb2[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("").toUpperCase();
  return rgb2[4] === void 0 ? `#${hex}` : `#${hex}${Math.round(Number(rgb2[4]) * 255).toString(16).padStart(2, "0").toUpperCase()}`;
}

// dist/assets/png.js
import { deflateSync } from "node:zlib";
var CRC = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++)
      c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
function crc32(buf) {
  let c = 4294967295;
  for (let i = 0; i < buf.length; i++)
    c = CRC[(c ^ buf[i]) & 255] ^ c >>> 8;
  return (c ^ 4294967295) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(pixels, width, height, channels = 4, dpi) {
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++)
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = channels === 4 ? 6 : 2;
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr)];
  if (dpi) {
    const phys = Buffer.alloc(9);
    const ppm = Math.round(dpi / 0.0254);
    phys.writeUInt32BE(ppm, 0);
    phys.writeUInt32BE(ppm, 4);
    phys[8] = 1;
    parts.push(chunk("pHYs", phys));
  }
  parts.push(chunk("IDAT", deflateSync(raw, { level: 6 })), chunk("IEND", Buffer.alloc(0)));
  return Buffer.concat(parts);
}

// dist/assets/canvas.js
var fonts;
function brandFonts() {
  if (fonts)
    return fonts;
  const doc6 = JSON.parse(readFileSync2(pkgPath("brand", "fonts", "fonts.json"), "utf8"));
  for (const face of [doc6.sans, doc6.mono])
    for (const file of Object.values(face.files))
      GlobalFonts.registerFromPath(pkgPath("brand", "fonts", file), face.family);
  fonts = { sans: `"${doc6.sans.family}"`, mono: `"${doc6.mono.family}"` };
  return fonts;
}
function surface(width, height, opts = {}) {
  brandFonts();
  const scale = opts.scale ?? 1;
  const pw = Math.max(1, Math.round(width * scale));
  const ph = Math.max(1, Math.round(height * scale));
  const canvas = opts.svg ? createCanvas(pw, ph, SvgExportFlag.ConvertTextToPaths) : createCanvas(pw, ph);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  return { canvas, ctx, width, height, scale, svg: !!opts.svg };
}
function scratch(width, height) {
  brandFonts();
  const canvas = createCanvas(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
  return { canvas, ctx: canvas.getContext("2d") };
}
function pixelsOf(s) {
  const { width, height } = s.canvas;
  const img = s.canvas.getContext("2d").getImageData(0, 0, width, height);
  return { data: Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength), width, height };
}
function toPng(s, opts = {}) {
  if (s.svg)
    throw new Error("This surface records SVG; draw again on a raster surface for PNG.");
  const px2 = pixelsOf(s);
  if (!opts.opaque)
    return encodePng(px2.data, px2.width, px2.height, 4, opts.dpi);
  const rgb2 = Buffer.alloc(px2.width * px2.height * 3);
  for (let i = 0, j = 0; i < px2.data.length; i += 4, j += 3) {
    rgb2[j] = px2.data[i];
    rgb2[j + 1] = px2.data[i + 1];
    rgb2[j + 2] = px2.data[i + 2];
  }
  return encodePng(rgb2, px2.width, px2.height, 3, opts.dpi);
}
function toJpg(s) {
  return s.canvas.toBuffer("image/jpeg", 92);
}
function toWebp(s) {
  return s.canvas.toBuffer("image/webp", 92);
}
function toSvg(s, physical) {
  if (!s.svg)
    throw new Error("This surface holds pixels; draw again with { svg: true } for SVG.");
  let svg = stableIds(compactSvg(s.canvas.getContent().toString("utf8")));
  if (physical)
    svg = svg.replace(/(<svg [^>]*?)width="[\d.]+" height="[\d.]+"/, `$1width="${physical.widthIn}in" height="${physical.heightIn}in" viewBox="0 0 ${s.canvas.width} ${s.canvas.height}"`);
  return svg;
}
function tokenColor(ref) {
  if (typeof ref === "object")
    return withAlpha(tokenColor(ref.token), ref.alpha);
  const name = ref;
  if (!name)
    return "";
  if (/^#[0-9a-f]{3,8}$/i.test(name) || /^rgba?\(/.test(name))
    return name;
  const hex = colorHex(name.replace(/^--ds-color-/, ""));
  if (!hex)
    throw new Error(`Unknown color token \`${name}\`.`);
  if (hex.length === 9) {
    const n = (i) => Number.parseInt(hex.slice(i, i + 2), 16);
    return `rgba(${n(1)}, ${n(3)}, ${n(5)}, ${Math.round(n(7) / 255 * 1e3) / 1e3})`;
  }
  return hex;
}
function withAlpha(color, alpha) {
  const rgba = color.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[,/]\s*([\d.]+))?/);
  if (rgba)
    return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${Math.round(Number(rgba[4] ?? 1) * alpha * 1e3) / 1e3})`;
  const h = color.replace("#", "");
  const full = h.length === 3 ? h.replace(/./g, "$&$&") : h;
  const n = (i) => Number.parseInt(full.slice(i, i + 2), 16);
  const a = full.length === 8 ? n(6) / 255 : 1;
  return `rgba(${n(0)}, ${n(2)}, ${n(4)}, ${Math.round(a * alpha * 1e3) / 1e3})`;
}
function stableIds(svg) {
  const map = /* @__PURE__ */ new Map();
  for (const m of svg.matchAll(/\sid="([a-z]+)_([0-9a-f]+)"/g)) {
    const id = `${m[1]}_${m[2]}`;
    if (!map.has(id))
      map.set(id, `${m[1]}_${map.size}`);
  }
  if (!map.size)
    return svg;
  return svg.replace(/(id="|#)([a-z]+_[0-9a-f]+)(?=[")])/g, (whole2, pre, id) => map.has(id) ? `${pre}${map.get(id)}` : whole2);
}
function compactSvg(svg) {
  return svg.replace(/ d="([^"]*)"/g, (_m, d) => ` d="${compactPath(d)}"`);
}
var r2 = (n) => {
  const v = Math.round(n * 100) / 100;
  return Object.is(v, -0) ? "0" : String(v);
};
function compactPath(d) {
  const tokens2 = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g);
  if (!tokens2 || tokens2.some((t) => /^[A-Za-z]$/.test(t) && !"MLQCZ".includes(t)))
    return d;
  const subpaths = [];
  let cur = [];
  let seg;
  for (const t of tokens2) {
    if (/^[A-Z]$/.test(t)) {
      if (t === "M" && cur.length) {
        subpaths.push(cur);
        cur = [];
      }
      seg = { cmd: t, nums: [] };
      cur.push(seg);
    } else
      seg?.nums.push(Number(t));
  }
  if (cur.length)
    subpaths.push(cur);
  return subpaths.map((sp) => circleOf(sp) ?? sp.map((s) => s.cmd + s.nums.map(r2).join(" ")).join("")).join("");
}
function circleOf(sp) {
  if (sp.length < 9 || sp[0].cmd !== "M" || sp[0].nums.length !== 2)
    return void 0;
  const pts = [];
  for (const s of sp) {
    if (s.cmd === "Z")
      continue;
    if (s.cmd !== "M" && s.cmd !== "Q")
      return void 0;
    for (let i = 0; i + 1 < s.nums.length; i += 2)
      pts.push([s.nums[i], s.nums[i + 1]]);
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const r = (x1 - x0) / 2;
  if (r <= 0 || Math.abs(x1 - x0 - (y1 - y0)) > r * 0.03)
    return void 0;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  for (const s of sp) {
    if (s.cmd === "Z")
      continue;
    const n = s.nums;
    const ex = n[n.length - 2];
    const ey = n[n.length - 1];
    if (Math.abs(Math.hypot(ex - cx, ey - cy) - r) > Math.max(0.01, r * 0.02))
      return void 0;
  }
  const [sx, sy] = pts[0];
  const last = pts[pts.length - 1];
  if (Math.hypot(last[0] - sx, last[1] - sy) > Math.max(0.01, r * 0.02))
    return void 0;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    area += ax * by - bx * ay;
  }
  const sweep = area > 0 ? 1 : 0;
  return `M${r2(cx + r)} ${r2(cy)}A${r2(r)} ${r2(r)} 0 1 ${sweep} ${r2(cx - r)} ${r2(cy)}A${r2(r)} ${r2(r)} 0 1 ${sweep} ${r2(cx + r)} ${r2(cy)}Z`;
}

// dist/assets/brand-art.js
import { readFileSync as readFileSync3 } from "node:fs";
import { loadImage, Path2D } from "@napi-rs/canvas";
var image;
var logo;
var imageDoc = () => image ??= JSON.parse(readFileSync3(pkgPath("brand", "assets", "image.json"), "utf8"));
var logoDoc = () => logo ??= JSON.parse(readFileSync3(pkgPath("brand", "assets", "logo.json"), "utf8"));
function brandColor(name) {
  const ref = imageDoc().colors[name];
  if (ref === void 0 || Array.isArray(ref))
    throw new Error(`brand/assets/image.json has no color \`${name}\`.`);
  return tokenColor(ref);
}
function brandColors(name) {
  const ref = imageDoc().colors[name];
  if (!Array.isArray(ref))
    throw new Error(`brand/assets/image.json color \`${name}\` is not a list.`);
  return ref.map(tokenColor);
}
var themeCache;
function themes() {
  if (themeCache)
    return themeCache;
  themeCache = {};
  for (const [id, t] of Object.entries(imageDoc().themes)) {
    const ink = tokenColor(t.ink);
    themeCache[id] = { ...t, bg: tokenColor(t.bg), ink, muted: tokenColor(t.muted), line: tokenColor(t.line), tile: tokenColor(t.tile), border: tokenColor(t.border), pill: t.pill ? tokenColor(t.pill) : brandColor(t.dark ? "pillFillDark" : "pillFill") };
  }
  return themeCache;
}
var themeNames = () => Object.keys(imageDoc().themes);
var highlightNames = () => Object.keys(imageDoc().highlights);
var highlightColor = (name, theme) => {
  const h = imageDoc().highlights[name];
  return tokenColor(h?.on?.[theme] ?? h?.color ?? "");
};
var toneColor = (name) => tokenColor(imageDoc().tones[name] ?? imageDoc().tones.lilac);
var word;
function wordmarkPath() {
  if (!word) {
    word = new Path2D();
    for (const d of logoDoc().wordmark.paths)
      word.addPath(new Path2D(d));
  }
  return word;
}
var art = /* @__PURE__ */ new Map();
async function artImage(id) {
  const hit = art.get(id);
  if (hit)
    return hit;
  const doc6 = logoDoc();
  const file = id === "reef" ? doc6.reef.file : doc6.art[id]?.file ?? id;
  const im = await loadImage(readFileSync3(pkgPath("brand", "assets", file)));
  art.set(id, im);
  return im;
}
function artBytes(id) {
  const doc6 = logoDoc();
  const file = id === "reef" ? doc6.reef.file : doc6.art[id]?.file ?? id;
  return readFileSync3(pkgPath("brand", "assets", file));
}

// dist/design/platforms.js
var MB = 1024 * 1024;
var px = (w, h, name, x, y, rw, rh, official = false) => ({ name, official, rect: { x: x / w, y: y / h, w: rw / w, h: rh / h } });
var PLATFORMS = [
  { id: "og", label: "Link preview", width: 1200, height: 630, aliases: ["link-preview", "share", "opengraph", "open-graph", "social-card", "1.91:1"], avoid: [], shown: 540, limit: { bytes: 5 * MB, official: false }, source: "https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image", note: "X allows 5 MB for a card picture. Its page refuses automated reading, so the limit is approximate." },
  { id: "square", label: "Square post", width: 1080, height: 1080, aliases: ["1:1", "instagram", "instagram-post", "ig-post", "square-post"], avoid: [], shown: 468, limit: { bytes: 8 * MB, official: false } },
  { id: "portrait", label: "Portrait post", width: 1080, height: 1350, aliases: ["4:5", "portrait-post", "instagram-portrait", "vertical"], avoid: [], shown: 468, limit: { bytes: 8 * MB, official: false } },
  {
    id: "story",
    label: "Story",
    width: 1080,
    height: 1920,
    aliases: ["9:16", "stories", "instagram-story", "ig-story", "reel-cover", "tiktok", "phone"],
    avoid: [px(1080, 1920, "the profile bar at the top", 0, 0, 1080, 250), px(1080, 1920, "the reply bar at the bottom", 0, 1580, 1080, 340)],
    shown: 390,
    limit: { bytes: 8 * MB, official: false },
    source: "https://www.facebook.com/business/help/980593475366490",
    note: "Meta asks for about 14% at the top (250 px) and 20% at the bottom (340 px) to stay free. Its page draws the numbers with a script and could not be read, so they are approximate. Reels covers are stricter (about 35% at the bottom)."
  },
  { id: "landscape", label: "Landscape post", width: 1200, height: 675, aliases: ["16:9", "x-post", "twitter-post", "twitter", "tweet", "landscape-post", "wide", "horizontal"], avoid: [], shown: 516, limit: { bytes: 5 * MB, official: false }, source: "https://help.x.com/en/using-x/posting-gifs-and-pictures" },
  {
    id: "x-banner",
    label: "X header",
    width: 1500,
    height: 500,
    aliases: ["x", "x-header", "twitter-banner", "twitter-header", "twitter-cover", "x-cover", "3:1"],
    avoid: [px(1500, 500, "the profile picture, lower left", 0, 280, 390, 220), px(1500, 500, "the strip X may crop at the top", 0, 0, 1500, 60), px(1500, 500, "the strip X may crop at the bottom", 0, 440, 1500, 60)],
    shown: 600,
    limit: { bytes: 5 * MB, official: false },
    source: "https://help.x.com/en/managing-your-account/common-issues-when-uploading-profile-photo",
    note: "X recommends 1500 x 500 and the header is cropped by up to about 60 px at the top and bottom. The profile picture covers the lower left: its place is measured on x.com at its 600 px column, so it is approximate."
  },
  { id: "linkedin", label: "LinkedIn post", width: 1200, height: 627, aliases: ["linkedin-post", "li-post"], avoid: [], shown: 552, limit: { bytes: 5 * MB, official: false } },
  {
    id: "linkedin-banner",
    label: "LinkedIn profile cover",
    width: 1584,
    height: 396,
    aliases: ["linkedin-cover", "linkedin-header", "linkedin-background", "li-banner", "4:1"],
    avoid: [px(1584, 396, "the profile picture, lower left", 0, 168, 400, 228)],
    shown: 792,
    limit: { bytes: 8 * MB, official: true },
    source: "https://www.linkedin.com/help/linkedin/answer/a568217",
    note: "1584 x 396 and under 8 MB are LinkedIn's. Where the profile picture sits is measured on the desktop page, so it is approximate."
  },
  {
    id: "linkedin-page",
    label: "LinkedIn page cover",
    width: 1512,
    height: 256,
    aliases: ["linkedin-company", "linkedin-company-banner", "linkedin-page-banner", "linkedin-page-cover", "li-page"],
    avoid: [px(1512, 256, "the lower-right corner", 1260, 154, 252, 102), px(1512, 256, "the page logo, lower left", 0, 160, 225, 96), px(1512, 256, "the left edge", 0, 0, 40, 256), px(1512, 256, "the right edge", 1472, 0, 40, 256), px(1512, 256, "the top edge", 0, 0, 1512, 16), px(1512, 256, "the bottom edge", 0, 240, 1512, 16)],
    shown: 1128,
    limit: { bytes: 3 * MB, official: true },
    source: "https://www.linkedin.com/help/linkedin/answer/a563309",
    note: `1512 x 256, 3 MB, and "keep key details away from the edges, especially the lower-right corner" are LinkedIn's. The widths of those edges are approximate, as it gives none. (The older 1128 x 191 is the same shape to within 1%.)`
  },
  {
    id: "youtube",
    label: "YouTube channel art",
    width: 2560,
    height: 1440,
    aliases: ["youtube-banner", "youtube-channel-art", "channel-art", "youtube-art", "youtube-cover", "yt-banner"],
    avoid: [],
    safe: { name: "the part every device shows", official: true, rect: { x: (1 - 1235 / 2048) / 2, y: (1 - 338 / 1152) / 2, w: 1235 / 2048, h: 338 / 1152 } },
    shown: 1280,
    limit: { bytes: 6 * MB, official: true },
    source: "https://support.google.com/youtube/answer/10456525",
    note: "YouTube: 2560 x 1440 recommended, words and logos inside 1235 x 338 of 2048 x 1152, 6 MB or smaller."
  },
  {
    id: "youtube-thumbnail",
    label: "YouTube thumbnail",
    width: 1280,
    height: 720,
    aliases: ["thumbnail", "yt-thumbnail", "video-thumbnail", "youtube-thumb"],
    avoid: [px(1280, 720, "the video length, lower right", 1120, 630, 160, 90)],
    shown: 360,
    limit: { bytes: 2 * MB, official: true },
    source: "https://support.google.com/youtube/answer/72431",
    note: "YouTube takes 2 MB from a phone and 50 MB from a computer; the check warns at 2 MB. Where the video length sits is approximate."
  },
  { id: "email", label: "Email header", width: 1200, height: 400, aliases: ["email-header", "newsletter"], avoid: [], shown: 600, limit: { bytes: 1 * MB, official: false }, note: "Emails are usually 600 px wide, so this is drawn at twice that." },
  {
    id: "avatar",
    label: "Profile picture",
    width: 800,
    height: 800,
    aliases: ["profile-picture", "profile-photo", "pfp", "profile", "app-icon"],
    avoid: [],
    safe: { name: "the circle it is cropped to", official: true, rect: { x: (1 - Math.SQRT1_2) / 2, y: (1 - Math.SQRT1_2) / 2, w: Math.SQRT1_2, h: Math.SQRT1_2 } },
    shown: 400,
    limit: { bytes: 2 * MB, official: true },
    source: "https://help.x.com/en/managing-your-account/common-issues-when-uploading-profile-photo",
    note: "X takes 2 MB; YouTube takes 15 MB. Shown as a circle, so everything stays inside the square the circle holds."
  },
  { id: "pinterest", label: "Pinterest pin", width: 1e3, height: 1500, aliases: ["pin", "2:3"], avoid: [], shown: 236, limit: { bytes: 20 * MB, official: true }, source: "https://help.pinterest.com/en/business/article/pinterest-product-specs", note: "Pinterest recommends 2:3 (1000 x 1500), 20 MB on desktop. Its grid shows pins about 236 px wide (approximate), so small text needs to be large." },
  { id: "facebook-cover", label: "Facebook page cover", width: 1702, height: 630, aliases: ["facebook-banner", "fb-cover"], avoid: [px(1702, 630, "the strip a phone crops at the left", 0, 0, 95, 630), px(1702, 630, "the strip a phone crops at the right", 1607, 0, 95, 630), px(1702, 630, "the profile picture, lower left", 0, 470, 420, 160)], shown: 851, limit: { bytes: 100 * 1024, official: true }, source: "https://www.facebook.com/help/125379114252045", note: "Facebook recommends 851 x 315 (this is twice that) and under 100 KB for fast loading; phones show 2.4:1, so the sides are cropped. The profile picture covers part of the left: where is approximate." },
  { id: "facebook", label: "Facebook post", width: 1080, height: 1350, aliases: ["facebook-post", "fb-post", "threads", "threads-post", "meta-feed"], avoid: [], shown: 500, limit: { bytes: 8 * MB, official: false }, note: "Facebook, Threads and Meta feed ads take 4:5 at 1080 x 1350." },
  { id: "ad-300x250", label: "Medium rectangle ad", width: 300, height: 250, aliases: ["medium-rectangle", "mrec"], avoid: [], shown: 300, limit: { bytes: 150 * 1024, official: false }, source: "https://support.google.com/google-ads/answer/7031480", note: "Listed by Google Ads among common sizes. The 150 KB limit is what ad networks usually ask for (approximate)." },
  { id: "ad-336x280", label: "Large rectangle ad", width: 336, height: 280, aliases: ["large-rectangle"], avoid: [], shown: 336, limit: { bytes: 150 * 1024, official: false }, source: "https://support.google.com/google-ads/answer/7031480" },
  { id: "ad-728x90", label: "Leaderboard ad", width: 728, height: 90, aliases: ["leaderboard"], avoid: [], shown: 728, limit: { bytes: 150 * 1024, official: false }, source: "https://support.google.com/google-ads/answer/7031480" },
  { id: "ad-300x600", label: "Half page ad", width: 300, height: 600, aliases: ["half-page"], avoid: [], shown: 300, limit: { bytes: 150 * 1024, official: false }, source: "https://support.google.com/google-ads/answer/7031480" },
  { id: "ad-320x50", label: "Mobile banner ad", width: 320, height: 50, aliases: ["mobile-banner"], avoid: [], shown: 320, limit: { bytes: 150 * 1024, official: false }, note: "An IAB size; Google's page lists 300x50 instead." },
  { id: "ad-160x600", label: "Wide skyscraper ad", width: 160, height: 600, aliases: ["skyscraper", "wide-skyscraper"], avoid: [], shown: 160, limit: { bytes: 150 * 1024, official: false }, source: "https://support.google.com/google-ads/answer/7031480" },
  { id: "ad-970x250", label: "Billboard ad", width: 970, height: 250, aliases: ["billboard"], avoid: [], shown: 970, limit: { bytes: 150 * 1024, official: false }, note: "An IAB size; Google's page lists 970x90." },
  { id: "meeting", label: "Video call background", width: 1920, height: 1080, aliases: ["zoom", "zoom-background", "meet", "teams", "virtual-background"], avoid: [px(1920, 1080, "where the person sits", 560, 300, 800, 780)], shown: 960, note: "Zoom recommends 1920 x 1080. The middle is covered by the person on the call (approximate), and apps mirror the picture for the person themselves." },
  { id: "desktop", label: "Desktop wallpaper", width: 2880, height: 1800, aliases: ["wallpaper", "desktop-wallpaper", "laptop"], avoid: [], shown: 1440 },
  { id: "phone-wallpaper", label: "Phone wallpaper", width: 1170, height: 2532, aliases: ["lock-screen", "mobile-wallpaper", "iphone"], avoid: [px(1170, 2532, "the clock", 0, 0, 1170, 760), px(1170, 2532, "the home bar and controls", 0, 2240, 1170, 292)], shown: 390, note: "An iPhone at 3x. Where the clock and controls sit is approximate." },
  { id: "a4", label: "A4 page", width: 2480, height: 3508, aliases: ["a4-page", "one-pager", "one-pager-a4"], avoid: [], shown: 794, note: "At 300 dpi; shown is the page at 96 dpi." },
  { id: "letter", label: "US Letter page", width: 2550, height: 3300, aliases: ["us-letter", "letter-page", "one-pager-letter"], avoid: [], shown: 816, note: "At 300 dpi; shown is the page at 96 dpi." },
  { id: "business-card", label: "Business card", width: 1050, height: 600, aliases: ["card-print", "visiting-card"], avoid: [px(1050, 600, "the bleed and safe margin", 0, 0, 1050, 75), px(1050, 600, "the bleed and safe margin", 0, 525, 1050, 75), px(1050, 600, "the bleed and safe margin", 0, 0, 75, 600), px(1050, 600, "the bleed and safe margin", 975, 0, 75, 600)], shown: 336, note: "3.5 x 2 in at 300 dpi; the edges hold 0.125 in of bleed and 0.125 in of safe margin. Confirm with the printer." },
  { id: "email-signature", label: "Email signature", width: 1200, height: 300, aliases: ["signature"], avoid: [], shown: 600, limit: { bytes: 100 * 1024, official: false }, note: "Shown at 600 x 150; keep it light, mail clients clip large signatures." }
];
function platformOf(id, width, height) {
  const hit = PLATFORMS.find((p) => p.id === id);
  return hit ?? { id, label: id, width, height, aliases: [], avoid: [], shown: Math.max(540, width / 2) };
}
var zonePx = (z, width, height) => ({ x: z.rect.x * width, y: z.rect.y * height, w: z.rect.w * width, h: z.rect.h * height });
var key = (s) => s.toLowerCase().trim().replace(/[\s_]+/g, "-");
function sizeAlias(typed) {
  const k = key(typed);
  return PLATFORMS.find((p) => p.id === k || p.aliases.includes(k))?.id;
}

// dist/design/doc.js
var STATE_KEYS = ["template", "size", "theme", "copy", "images", "seed", "options", "layers", "allow", "blocks", "grid"];
var DOC_KEYS = ["version", "brand", "kind", ...STATE_KEYS, "history", "future"];

// dist/design/compose.js
var GRID = { cols: 12, rows: 12 };
function gridOf(doc6, margin) {
  const { width: W, height: H } = doc6.size;
  const grid = doc6.grid ?? GRID;
  const pf = platformOf(doc6.size.id, W, H);
  let S = pf.safe ? zonePx(pf.safe, W, H) : { x: 0, y: 0, w: W, h: H };
  for (const z of pf.avoid) {
    const r = zonePx(z, W, H);
    if (r.w > W - 1)
      S = r.y < 1 ? { ...S, y: r.y + r.h, h: S.y + S.h - r.y - r.h } : { ...S, h: r.y - S.y };
    else if (r.h > H - 1)
      S = r.x < 1 ? { ...S, x: r.x + r.w, w: S.x + S.w - r.x - r.w } : { ...S, w: r.x - S.x };
  }
  const m = margin ?? Math.round(Math.min(S.w, S.h) * 0.06);
  const g = Math.round(Math.min(S.w, S.h) * 0.02);
  const cw = (S.w - m * 2 - g * (grid.cols - 1)) / grid.cols;
  const ch = (S.h - m * 2 - g * (grid.rows - 1)) / grid.rows;
  return {
    m,
    g,
    cell: (at) => ({ x: S.x + m + at.col * (cw + g), y: S.y + m + at.row * (ch + g), w: at.cols * cw + (at.cols - 1) * g, h: at.rows * ch + (at.rows - 1) * g })
  };
}
function blockRects(doc6, margin) {
  const g = gridOf(doc6, margin);
  return (doc6.blocks ?? []).map((block) => ({ block, rect: g.cell(block.at) }));
}

// dist/design/png.js
var TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++)
    c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
  return c >>> 0;
});

// dist/design/check.js
var SMALL_FLOOR = 8;

// dist/assets/place.js
var inter = (a, b, gap = 0) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
var grow = (r, by) => ({ x: r.x - by, y: r.y - by, w: r.w + 2 * by, h: r.h + 2 * by });
var union = (rs) => {
  const x = Math.min(...rs.map((r) => r.x));
  const y = Math.min(...rs.map((r) => r.y));
  return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y };
};
function emptyRects(area, obstacles) {
  if (area.w <= 0 || area.h <= 0)
    return [];
  let free = [area];
  for (const o of obstacles) {
    const next = [];
    for (const f of free) {
      if (!inter(f, o)) {
        next.push(f);
        continue;
      }
      if (o.x > f.x)
        next.push({ x: f.x, y: f.y, w: o.x - f.x, h: f.h });
      if (o.x + o.w < f.x + f.w)
        next.push({ x: o.x + o.w, y: f.y, w: f.x + f.w - o.x - o.w, h: f.h });
      if (o.y > f.y)
        next.push({ x: f.x, y: f.y, w: f.w, h: o.y - f.y });
      if (o.y + o.h < f.y + f.h)
        next.push({ x: f.x, y: o.y + o.h, w: f.w, h: f.y + f.h - o.y - o.h });
    }
    const inside = (a, b) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
    free = next.filter((a, i) => a.w > 1 && a.h > 1 && !next.some((b, j) => j !== i && inside(a, b) && (!inside(b, a) || j < i)));
    if (free.length > 48)
      free = free.sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 48);
  }
  return free.sort((a, b) => b.w * b.h - a.w * a.h || a.y - b.y || a.x - b.x);
}
function rgb(color) {
  const m = color.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[,/]\s*([\d.]+))?/);
  if (m)
    return [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4] ?? 1)];
  const n = (i) => Number.parseInt(color.slice(i, i + 2), 16);
  return [n(1), n(3), n(5), color.length === 9 ? n(7) / 255 : 1];
}
function luminance(color) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb(color);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function over(color, ground, alpha = 1) {
  const c = rgb(color);
  const g = rgb(ground);
  const a = c[3] * alpha;
  return `#${[0, 1, 2].map((i) => Math.round(c[i] * a + g[i] * (1 - a)).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

// dist/assets/window.js
import { existsSync as existsSync2, readFileSync as readFileSync4 } from "node:fs";
import { Path2D as Path2D2 } from "@napi-rs/canvas";
var APP_W = 1040;
var APP_H = 585;
function appStart() {
  const a = imageDoc().app;
  return {
    handle: String(a.handle),
    domain: String(a.domain),
    mails: a.mails.join("\n"),
    subject: String(a.subject),
    body: String(a.body),
    workspaceNav: String(a.workspaceNav),
    mailboxNav: String(a.mailboxNav),
    showWorkspace: true,
    showMailbox: true,
    showList: true,
    showOpen: true,
    showLogo: true,
    openIndex: 0,
    listTitle: "",
    unread: String(a.unread ?? ""),
    textScale: 100,
    radius: 4.3
  };
}
function parseNav(s) {
  const out = [{ items: [] }];
  let foot = false;
  for (const raw of s.split("\n")) {
    const l = raw.trim();
    if (!l)
      continue;
    if (l === "---") {
      foot = true;
      out.push({ foot, items: [] });
      continue;
    }
    if (l.startsWith("#")) {
      const tune = l.endsWith("+");
      out.push({ label: l.replace(/^#+\s*/, "").replace(/\s*\+$/, ""), tune, foot, items: [] });
      continue;
    }
    const on = l.endsWith("*");
    const [icon = "", label = "", tag = ""] = l.replace(/\s*\*$/, "").split("|").map((p) => p.trim());
    out[out.length - 1].items.push({ icon, label: label || icon, tag: tag || void 0, on });
  }
  return out.filter((sec) => sec.label || sec.items.length);
}
function colorsOf() {
  const c = imageDoc().app.colors;
  const t = (k) => tokenColor(c[k]);
  return { strong: t("strong"), ink: t("ink"), muted: t("muted"), accent: t("accent"), tint: t("tint"), side: t("side"), bg: t("bg"), line: t("line"), pink: t("pink"), pinkFill: t("pinkFill"), blue: t("avatar"), avatarInk: t("avatarInk"), unreadBg: t("unreadBg"), unread: t("unread"), shadow: t("shadow") };
}
function parseMails(s) {
  return s.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [from = "", date = "", subject = "", preview = ""] = l.split("|").map((p) => p.trim());
    return { from, date, subject, preview };
  });
}
var kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2").toLowerCase();
function iconNames(a) {
  const names = /* @__PURE__ */ new Set(["SlidersHorizontal", "CaretDown", "PencilSimpleLine", "GearSix", "ArrowBendUpLeft", "ShareFat"]);
  for (const s of [...parseNav(a.workspaceNav), ...parseNav(a.mailboxNav)])
    for (const it of s.items)
      names.add(it.icon);
  return [...names];
}
async function loadIcons(a = appStart()) {
  const map = /* @__PURE__ */ new Map();
  for (const name of iconNames(a)) {
    const file = pkgPath("brand", "assets", "icons", `${kebab(name)}.svg`);
    if (!existsSync2(file))
      continue;
    const d = readFileSync4(file, "utf8").match(/\sd="([^"]+)"/)?.[1];
    if (d)
      map.set(name, new Path2D2(d));
  }
  return map;
}
function fit(ctx, s, w) {
  if (ctx.measureText(s).width <= w)
    return s;
  let lo = 0;
  let hi = s.length;
  while (lo < hi) {
    const mid = lo + hi + 1 >> 1;
    if (ctx.measureText(`${s.slice(0, mid)}\u2026`).width <= w)
      lo = mid;
    else
      hi = mid - 1;
  }
  return `${s.slice(0, lo).trimEnd()}\u2026`;
}
function wrapPlain(ctx, s, w) {
  const out = [];
  let line = "";
  for (const word2 of s.split(/\s+/)) {
    const next = line ? `${line} ${word2}` : word2;
    if (line && ctx.measureText(next).width > w) {
      out.push(line);
      line = word2;
    } else
      line = next;
  }
  if (line)
    out.push(line);
  return out;
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function drawApp(ctx, a0, icons, fonts2, mark) {
  const a = { ...appStart(), ...a0 };
  const C = colorsOf();
  const L = logoDoc().lockup;
  const handle = a.handle.trim() || "agent";
  const email = `${handle}@${a.domain.trim() || String(imageDoc().app.domain)}`;
  const font = (size, weight = 400) => `${weight} ${size * (a.textScale / 100)}px ${fonts2.sans}`;
  const icon = (name, x, y, s = 11.92) => {
    const path = icons.get(name);
    if (!path)
      return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s / 256, s / 256);
    ctx.fillStyle = C.ink;
    ctx.fill(path);
    ctx.restore();
  };
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const r = a.radius;
  const cols = [a.showWorkspace ? 156 : 0, a.showMailbox ? 156 : 0, a.showList ? 222 : 0];
  const x1 = cols[0];
  const x2 = x1 + cols[1];
  const x3 = x2 + cols[2];
  const APPW = a.width ?? APP_W;
  const openW = APPW - x3;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, APPW, APP_H * 2);
  if (cols[1]) {
    ctx.fillStyle = C.side;
    ctx.fillRect(x1, 0, 156, APP_H * 2);
  }
  ctx.fillStyle = C.line;
  for (const x of [x1, x2, x3])
    if (x > 0 && x < APPW)
      ctx.fillRect(x - 0.27, 0, 0.54, APP_H * 2);
  const nav = (it, x, y, w, pill) => {
    if (it.on) {
      ctx.fillStyle = pill;
      rr(ctx, x, y, w, 20.58, r);
      ctx.fill();
    }
    icon(it.icon, x + 6.5, y + 4.33);
    ctx.fillStyle = C.ink;
    ctx.font = font(7.6, it.on ? 500 : 400);
    ctx.fillText(it.label, x + 23.83, y + 10.3);
    if (it.tag) {
      const tx = x + 23.83 + ctx.measureText(it.label).width + 5.5;
      ctx.font = font(5.6, 500);
      const tw = ctx.measureText(it.tag).width + 7.6;
      const pink = /beta|new/i.test(it.tag);
      ctx.strokeStyle = pink ? C.pink : C.line;
      ctx.lineWidth = 0.6;
      ctx.fillStyle = pink ? C.pinkFill : C.tint;
      rr(ctx, tx, y + 4.33, tw, 11.92, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = pink ? C.pink : C.muted;
      ctx.fillText(it.tag, tx + 3.8, y + 10.4);
    }
  };
  const label = (s, x, y) => {
    ctx.fillStyle = C.muted;
    ctx.font = font(7, 400);
    ctx.fillText(s, x, y + 4.6);
  };
  const sections = (secs, pill, shadow, startY) => {
    let y = startY;
    const foot = secs.filter((s) => s.foot);
    const body = secs.filter((s) => !s.foot);
    const draw = (sec) => {
      if (sec.label) {
        label(sec.label, 8.67, y + 6.5);
        if (sec.tune)
          icon("SlidersHorizontal", 138.1, y + 6.67, 8.67);
        y += 19.83;
      }
      for (const it of sec.items) {
        if (it.on && shadow) {
          ctx.save();
          ctx.shadowColor = withA(C.shadow, 0.06);
          ctx.shadowBlur = 3;
          ctx.shadowOffsetY = 0.6;
          nav(it, 6.5, y, 142.46, pill);
          ctx.restore();
        } else
          nav(it, 6.5, y, 142.46, pill);
        y += 21.67;
      }
      y += 5;
    };
    body.forEach(draw);
    const footH = foot.reduce((h, s) => h + (s.label ? 19.83 : 0) + s.items.length * 21.67 + 5, 0);
    y = Math.max(y, APP_H - footH - 7);
    foot.forEach(draw);
  };
  if (cols[0]) {
    if (mark && a.showLogo) {
      const k = 13 / L.h;
      ctx.drawImage(mark, 8.67, 10.83, L.mark.w * k, L.mark.h * k);
      ctx.save();
      ctx.translate(8.67 + L.word.x * k, 10.83 + L.word.y * k);
      ctx.scale(k, k);
      ctx.fillStyle = C.strong;
      ctx.fill(wordmarkPath());
      ctx.restore();
    }
    sections(parseNav(a.workspaceNav), C.tint, false, 34.67);
  }
  if (cols[1]) {
    ctx.save();
    ctx.translate(x1, 0);
    ctx.fillStyle = C.blue;
    rr(ctx, 13.54, 11.92, 10.83, 10.83, 2.4);
    ctx.fill();
    ctx.fillStyle = C.avatarInk;
    ctx.font = font(6.6, 500);
    ctx.textAlign = "center";
    ctx.fillText(handle[0].toUpperCase(), 18.96, 17.5);
    ctx.textAlign = "left";
    ctx.fillStyle = C.strong;
    ctx.font = font(7.6, 500);
    ctx.fillText(fit(ctx, `@${handle}`, 92), 30.33, 17.4);
    icon("CaretDown", 131.6, 11.9, 10.83);
    sections(parseNav(a.mailboxNav), C.bg, true, 34.67);
    ctx.restore();
  }
  const mails = a.blank ? [] : parseMails(a.mails);
  const chosen = Math.min(Math.max(0, a.openIndex), Math.max(0, mails.length - 1));
  if (cols[2]) {
    ctx.save();
    ctx.translate(x2, 0);
    ctx.fillStyle = C.strong;
    ctx.font = font(7.6, 500);
    ctx.fillText(fit(ctx, a.listTitle || handle, 150), 13, 11.5);
    ctx.fillStyle = C.accent;
    ctx.font = font(7.6, 400);
    ctx.fillText(fit(ctx, email, 150), 13, 22.7);
    icon("PencilSimpleLine", 174.9, 11.7, 10.83);
    icon("GearSix", 192.2, 11.7, 10.83);
    let y = 40.75;
    mails.forEach((m, i) => {
      const shown = a.rows === void 0 ? 1 : Math.max(0, Math.min(1, a.rows - i));
      if (shown <= 0)
        return;
      ctx.save();
      ctx.globalAlpha *= shown;
      ctx.translate(0, (1 - shown) * 8);
      if (i === chosen) {
        ctx.fillStyle = C.tint;
        rr(ctx, 6.5, y, 208.54, 53.58, r);
        ctx.fill();
      } else if (i !== chosen + 1) {
        ctx.fillStyle = C.line;
        ctx.fillRect(6.5, y - 1.36, 208.54, 0.54);
      }
      ctx.font = font(7.6, 500);
      ctx.fillStyle = C.strong;
      ctx.fillText(fit(ctx, m.from, 140), 13, y + 14);
      ctx.font = font(7.6, 400);
      ctx.fillStyle = C.muted;
      ctx.textAlign = "right";
      ctx.fillText(m.date, 202, y + 14);
      ctx.textAlign = "left";
      ctx.fillStyle = C.strong;
      ctx.fillText(fit(ctx, m.subject, 192), 13, y + 37.9);
      ctx.fillStyle = C.accent;
      ctx.fillText(fit(ctx, m.preview, 192), 13, y + 49);
      ctx.restore();
      y += 56.29;
    });
    ctx.restore();
  }
  if (a.showOpen && openW > 40 && !a.blank) {
    ctx.save();
    ctx.translate(x3, 0);
    const first = mails[chosen] ?? { from: "", date: "", subject: "", preview: "" };
    const right = openW - 20;
    ctx.fillStyle = C.strong;
    ctx.font = font(10.6, 500);
    ctx.fillText(fit(ctx, a.subject || first.subject, right - 80), 13, 17.75);
    ctx.fillStyle = C.muted;
    ctx.font = font(7, 400);
    ctx.textAlign = "right";
    ctx.fillText(`${mails.length || 1} message${mails.length === 1 ? "" : "s"}`, right, 17.75);
    ctx.textAlign = "left";
    ctx.fillStyle = C.line;
    ctx.fillRect(0, 35.23, openW, 0.54);
    ctx.fillStyle = C.strong;
    ctx.font = font(7.6, 500);
    ctx.fillText(first.from, 13, 46.5);
    const fw = ctx.measureText(first.from).width;
    if (a.unread.trim()) {
      ctx.font = font(5.6, 500);
      const uw = ctx.measureText(a.unread).width + 4.4;
      ctx.fillStyle = C.unreadBg;
      rr(ctx, 13 + fw + 2.2, 42.5, uw, 8, 1.6);
      ctx.fill();
      ctx.fillStyle = C.unread;
      ctx.fillText(a.unread, 13 + fw + 4.4, 46.7);
    }
    ctx.font = font(7.6, 400);
    ctx.fillStyle = C.accent;
    ctx.fillText(`To: ${email}`, 13, 57.6);
    ctx.fillStyle = C.muted;
    ctx.textAlign = "right";
    ctx.fillText(first.date, right, 52);
    ctx.textAlign = "left";
    icon("ArrowBendUpLeft", right - 94, 47.5, 8.67);
    icon("ShareFat", right - 84, 47.5, 8.67);
    ctx.fillStyle = C.strong;
    ctx.font = font(7.6, 400);
    let y = 80.75;
    const body = a.body.replaceAll("{handle}", handle);
    const wrapW = Math.min(openW - 26, Math.max(366.7, openW * 0.72));
    for (const para of body.split(/\n/)) {
      if (!para.trim()) {
        y += 4;
        continue;
      }
      for (const line of wrapPlain(ctx, para, wrapW)) {
        ctx.fillText(line, 13, y);
        y += 9 * (a.textScale / 100);
        if (y > APP_H + 10)
          break;
      }
    }
    ctx.restore();
  }
}
function withA(color, alpha) {
  return tokenColor({ token: color, alpha });
}

// dist/assets/share.js
var TEMPLATES = ["tile", "app", "outline", "hatch", "reef", "feature", "partner", "funding", "announce", "card", "mark"];
var BADGES = ["pill", "solid", "dot", "none"];
var faceOf = (f, k) => k === "mono" ? f.mono : f.sans;
var iw = (im) => "naturalWidth" in im && im.naturalWidth || im.width || 1;
var ih = (im) => "naturalHeight" in im && im.naturalHeight || im.height || 1;
var motion;
function layer(ctx, name, cx, cy, draw) {
  const st = motion?.(name);
  if (!st)
    return draw();
  if ((st.a ?? 1) <= 0)
    return;
  ctx.save();
  ctx.globalAlpha *= st.a ?? 1;
  ctx.translate((st.x ?? 0) + cx, (st.y ?? 0) + cy);
  ctx.scale(st.s ?? 1, st.s ?? 1);
  ctx.translate(-cx, -cy);
  draw();
  ctx.restore();
}
var clampDim = (n) => Math.round(Math.min(4e3, Math.max(50, n || 0)));
function frameOf(d) {
  const s = imageDoc().sizes[d.size];
  return s ? { w: s.w, h: s.h } : { w: clampDim(d.w), h: clampDim(d.h) };
}
function unitOf(d) {
  const { F, W, H } = frameFor(d);
  const part = F.w * F.h / (W * H) < 0.45;
  return Math.sqrt((part ? F.w : W) * (part ? F.h : H) / (1200 * 630));
}
var WM = () => logoDoc().wordmark;
var LOCKUP = () => logoDoc().lockup;
function panelWidth(cols, tile, u) {
  const tw = tile * WM().w / WM().h;
  const gx = tile * (18.43 / 51.61);
  return (24 + cols * tw + (cols - 1) * gx + 2) * u;
}
function frameFor(at) {
  const { w: W, h: H } = frameOf(at);
  const p = platformOf(at.size, W, H);
  const inset = { t: 0, r: 0, b: 0, l: 0 };
  const avoid = [];
  for (const z of p.avoid) {
    const q = zonePx(z, W, H);
    if (q.w > W - 1)
      q.y < 1 ? inset.t = Math.max(inset.t, q.h) : inset.b = Math.max(inset.b, H - q.y);
    else if (q.h > H - 1)
      q.x < 1 ? inset.l = Math.max(inset.l, q.w) : inset.r = Math.max(inset.r, W - q.x);
    else
      avoid.push(q);
  }
  if (p.safe) {
    const q = zonePx(p.safe, W, H);
    inset.t = Math.max(inset.t, q.y);
    inset.l = Math.max(inset.l, q.x);
    inset.r = Math.max(inset.r, W - q.x - q.w);
    inset.b = Math.max(inset.b, H - q.y - q.h);
  }
  const F = { x: inset.l, y: inset.t, w: W - inset.l - inset.r, h: H - inset.t - inset.b };
  return { W, H, F, inset, avoid, shown: p.shown, circle: isCircle(at.size) };
}
var isCircle = (size) => size === "avatar";
function floorsOf(at) {
  const { W, shown } = frameFor(at);
  const k = Math.max(1, W / shown);
  return { head: 16 * k, small: (SMALL_FLOOR + 1) * k };
}
var sit = (x, y, size, extra = {}) => ({ src: "sit", x, y, size, rotate: 0, shadow: true, auto: true, rest: "middle", ...extra });
var hang = (x, y, size, extra = {}) => ({ src: "hang", x, y, size, rotate: 0, shadow: false, auto: true, rest: "hang", ...extra });
var BARE = { pattern: "none", outline: false, hatch: "none", guides: false, reef: false, frame: "none", window: "none", logo: false, foot: false, stickers: [] };
function mulberry(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function varied(seed) {
  if (seed === void 0)
    return { flip: false, shift: 0, spot: 0.5, on: false };
  const rnd = mulberry(seed);
  rnd();
  return { flip: rnd() < 0.5, shift: Math.round(rnd() * 100) / 100, spot: 0.2 + Math.round(rnd() * 60) / 100, on: true };
}
function layoutFor(t, at, seed) {
  const fr0 = frameFor(at);
  const { W, H, avoid } = fr0;
  let { F, inset } = fr0;
  const corner = F.w / F.h > 4 ? avoid.find((a) => a.x > W / 2) : void 0;
  if (corner) {
    inset = { ...inset, r: W - corner.x };
    F = { ...F, w: corner.x - F.x };
  }
  const u = unitOf(at);
  const S = Math.min(F.w, F.h);
  const A = F.w / F.h;
  const wide = A >= 1.4;
  const banner = A >= 2.4;
  const ultra = A > 4;
  const tall = F.h / F.w > 1.15;
  const squareish = !wide && !tall;
  const v = varied(seed);
  const hk = banner ? Math.min(1, (F.w * F.h / (W * H) < 0.45 ? F.h : H) / (500 * u)) : 1;
  const m = (banner ? 48 * hk : 40) * u;
  const near = 12 * u;
  const P = { l: F.x + (inset.l ? near : m), t: F.y + (inset.t ? near : m), r: F.x + F.w - (inset.r ? near : m), b: F.y + F.h - (inset.b ? near : m) };
  const box = (l, top, r, b) => ({ x: l, y: top, w: Math.max(1, r - l), h: Math.max(1, b - top) });
  const fx = (px2) => px2 / W;
  const fy = (px2) => px2 / H;
  const sz = (px2) => px2 / Math.min(W, H);
  const fb = F.y + F.h;
  const fr = F.x + F.w;
  const cx = F.x + F.w / 2;
  const lockH = LOCKUP().h * hk;
  const lockBL = { logoX: fx(P.l), logoY: fy(P.b - lockH * u), logoAnchor: "left", logoSize: lockH };
  const base = {
    ...at,
    ...BARE,
    seed,
    ...lockBL,
    valign: "top",
    tracking: -10,
    leading: 1.04,
    badgeScale: 100,
    bodyScale: 100,
    winGap: 40,
    badgeAt: "words",
    headFont: "display",
    bodyFont: "text",
    badgeFont: "text",
    badgeTracking: 0,
    badgeWeight: 500,
    bodyAlpha: 78,
    bodyLeading: 1.4,
    bodyGap: 30,
    bodyWidth: 0,
    logoMarkScale: 100,
    logoMarkLift: 0,
    logoGap: 100,
    logoMark: true,
    logoWord: true,
    group: false,
    outlineFloor: 0,
    pad: P,
    logoMax: P.r - P.l
  };
  const band = (size, oct) => {
    const bh = size * u;
    let bottom = H > fb ? Math.min(H, fb - 0.235 * oct - 6 * u + bh * (1 - WM().xTop / WM().h)) : H;
    if (H - bottom < 0.05 * H)
      bottom = H;
    return { bottom, rule: bottom - bh + bh * WM().xTop / WM().h, floor: bottom < H - 1 ? bottom : 0 };
  };
  switch (t) {
    case "tile": {
      const below = tall || squareish;
      let cols = banner && !avoid.length ? 3 : 2;
      while (cols > 1 && panelWidth(cols, 51.6 * hk, u) > F.w * 0.5)
        cols--;
      const tile = 51.6 * hk;
      const pw = panelWidth(cols, tile, u);
      if (below) {
        const top = F.y + F.h * (tall ? 0.46 : 0.5);
        const bottom = P.b - lockH * u - 26 * u;
        const panel = box(P.l, top, P.r, bottom);
        return {
          ...base,
          align: "left",
          area: box(P.l, P.t, P.r, top - 24 * u),
          textSize: tall ? 78 : 66,
          badge: "pill",
          pattern: "panel",
          panel,
          tileSize: 51.6,
          tileStrength: 100,
          tileStagger: false,
          panelBorder: true,
          logo: true,
          stickers: [sit(fx(panel.x + panel.w * (v.on ? 0.3 + v.spot * 0.4 : 0.62)), fy(panel.y + panel.h / 2), sz(Math.min(panel.w * 0.5, panel.h * 0.86)))]
        };
      }
      const left = v.flip;
      const px2 = left ? inset.l ? P.l : F.x + 40 * u * hk : (inset.r ? P.r : fr - 40 * u * hk) - pw;
      return {
        ...base,
        align: "left",
        area: left ? box(px2 + pw + m, P.t, P.r, P.b) : box(P.l, P.t, px2 - m, P.b),
        textSize: (banner ? 58 : 61.4) * hk,
        badge: "pill",
        pattern: "panel",
        panel: { x: px2, y: -22 * u, w: pw, h: H + 44 * u },
        tileSize: tile,
        tileStrength: 100,
        tileStagger: false,
        panelBorder: true,
        logo: !banner,
        ...left ? { logoX: fx(px2 + pw + m) } : {},
        stickers: [sit(fx(px2 + pw / 2), fy(F.y + F.h * (v.on ? 0.42 + 0.16 * v.spot : 0.5)), sz(Math.min(0.568 * pw, 0.62 * F.h)))]
      };
    }
    case "app": {
      if (banner) {
        const ww2 = Math.min(0.52 * F.w, F.h * 1.7);
        const os2 = Math.min(250 * u * hk, F.h * 0.56);
        const wx = v.flip && !avoid.length ? P.l + ww2 / 2 : P.r - ww2 / 2;
        const top = P.t + os2 * 0.4;
        return {
          ...base,
          align: "left",
          area: wx < cx ? box(wx + ww2 / 2 + m, P.t, P.r, P.b) : box(P.l, P.t, wx - ww2 / 2 - m, P.b),
          textSize: 54 * hk,
          badge: "pill",
          window: "app",
          winX: fx(wx),
          winY: fy(top),
          winW: ww2 / W,
          winRatio: APP_H / APP_W,
          winRadius: 10 * hk,
          stickers: [hang(fx(wx + ww2 / 2 - os2 * 0.5), 0, sz(os2), { onWindow: true, edge: 23 * (os2 / 286) })]
        };
      }
      const gi = (tall ? 40 : 80) * u + F.x;
      const ww = W - 2 * gi;
      const os = 286 * u * (tall ? 0.95 : 1);
      const left = v.flip;
      const ox = left ? gi + 127 * u : W - gi - 127 * u;
      const rise = 0.42 * os;
      const area = tall || squareish ? box(gi + 20 * u, P.t, W - gi - 20 * u, fb - 0.34 * F.h) : left ? box(ox + 0.4 * os + 20 * u, P.t, W - gi - 20 * u, fb - 0.34 * F.h) : box(gi + 20 * u, P.t, ox - 0.4 * os - 20 * u, fb - 0.34 * F.h);
      return {
        ...base,
        align: "left",
        area,
        textSize: tall ? 74 : 61.4,
        badge: "pill",
        guides: true,
        guideInset: gi / u,
        logoMax: ww - 40 * u,
        reef: true,
        reefScale: tall ? 260 : 100,
        window: "app",
        winFollow: true,
        winGap: tall || squareish ? rise / u + 24 : 44,
        winMinTop: fy(P.t + rise),
        winX: 0.5,
        winY: fy(F.y + 263 * u),
        winW: ww / W,
        winRatio: tall ? 1.2 : squareish ? 0.8 : APP_H / APP_W,
        winRadius: 10,
        stickers: [hang(fx(ox), 0, sz(os), { onWindow: true, edge: 23 * u * (tall ? 0.95 : 1) })]
      };
    }
    case "outline":
    case "funding": {
      const big = t === "funding";
      const oct = (big ? tall ? 380 : 300 : 286) * u * hk * (banner && !ultra ? 0.9 : 1);
      const b = band(188.8 * hk, oct);
      const sw = 32 * u * hk;
      const beside = banner;
      const spot = beside ? v.flip && !avoid.length ? 0.14 : 0.84 : v.on ? v.spot : big ? 0.5 : 0.503;
      return {
        ...base,
        align: beside ? "left" : "center",
        area: box(Math.max(P.l, sw + 30 * u), inset.t ? P.t : F.y + Math.max(44 * u * hk, (big ? tall ? 110 : 58 : 64) * u * hk), Math.min(P.r, W - sw - 30 * u), b.rule - 14 * u * hk),
        textSize: (big ? tall ? 108 : banner ? 76 : wide ? 76 : 86 : banner ? 66 : tall ? 80 : 66) * hk,
        badge: "pill",
        badgeScale: big ? 115 : 100,
        outline: true,
        outlineSize: 188.8 * hk,
        outlineY: fy(b.bottom),
        outlineFloor: b.floor,
        outlineShift: v.on ? v.shift : big ? 0.2 : 0,
        outlineRule: true,
        hatch: "sides",
        hatchGap: 19 * Math.max(0.6, hk),
        sideWidth: 32 * hk,
        stickers: [hang(fx(F.x + F.w * spot), 0, sz(oct), { edge: b.rule, y: fy(b.rule - 23 / 286 * oct) })]
      };
    }
    case "hatch": {
      const floor = fb - Math.max(167 * u * hk, 0);
      const oct = 286 * u * hk;
      const left = v.flip && !avoid.length;
      const ox = left ? F.x + 143 * u * hk + (inset.l ? 0 : 8 * u) : fr - 143 * u * hk - (inset.r ? 0 : 8 * u);
      const beside = banner;
      const area = beside ? left ? box(ox + oct * 0.4 + m, P.t, P.r, floor - 14 * u * hk) : box(P.l, P.t, ox - oct * 0.4 - m * 0.6, floor - 14 * u * hk) : box(Math.max(P.l, F.x + 60 * u), inset.t ? P.t : F.y + 64 * u, Math.min(P.r, fr - 60 * u), floor - 16 * u);
      return {
        ...base,
        align: left ? "left" : "right",
        area,
        textSize: (banner ? 58 : tall ? 76 : 61.4) * hk,
        badge: "pill",
        hatch: "floor",
        hatchY: fy(floor),
        hatchGap: 19 * Math.max(0.6, hk),
        hatchMirror: left,
        stickers: [hang(fx(ox), fy(floor - 23 * u * hk), sz(oct), { edge: floor })]
      };
    }
    case "reef": {
      const R = logoDoc().reef;
      const scale = banner ? 100 : tall ? 260 : 120;
      const rh = W * (scale / 100) * R.h / R.w;
      const oct = banner ? 0.56 * F.h : (tall ? 0.52 : 0.4) * S;
      const drop = banner ? Math.min(0.26, Math.max(0.16, 1 - 0.55 * F.h / rh)) : 0;
      const sand = H - rh * (0.285 - drop);
      const ground = Math.min(sand + oct * 0.04, fb - 14 * u, banner ? F.y + F.h * 0.94 : fb);
      const spot = banner ? v.flip && !avoid.length ? 0.24 : 0.72 : v.on ? 0.3 + v.spot * 0.4 : 0.5;
      return {
        ...base,
        align: banner ? "left" : "center",
        area: box(Math.max(P.l, banner ? F.x + F.w * 0.1 : P.l), P.t, P.r, P.b),
        textSize: (banner ? 64 : tall ? 84 : 66) * hk,
        badge: "pill",
        reef: true,
        reefScale: scale,
        reefDrop: drop,
        logo: !banner,
        logoSize: lockH,
        logoX: tall ? fx(cx) : fx(P.l),
        logoY: fy(P.t),
        logoAnchor: tall ? "center" : "left",
        stickers: [sit(fx(F.x + F.w * spot), fy(ground - oct * 0.8055 * 0.99 / 2), sz(oct), { rest: "sit", edge: ground })]
      };
    }
    case "feature": {
      const fw = (tall ? 26 : 22) * u * hk;
      const frame = { frame: "hatch", frameWidth: fw / u, frameRadius: 18 * hk, frameTone: "lilac" };
      const L = { l: Math.max(P.l, fw + 40 * u * hk), r: Math.min(P.r, W - fw - 40 * u * hk) };
      if (banner) {
        const ww = Math.min(0.5 * F.w, (F.h - fw) * 1.8);
        const onLeft = v.flip && !avoid.length;
        const wx = onLeft ? L.l + ww / 2 : L.r - ww / 2;
        return {
          ...base,
          align: "left",
          area: onLeft ? box(wx + ww / 2 + m, Math.max(P.t, fw + 24 * u * hk), L.r, Math.min(P.b, H - fw - 24 * u * hk)) : box(L.l, Math.max(P.t, fw + 24 * u * hk), wx - ww / 2 - m, Math.min(P.b, H - fw - 24 * u * hk)),
          valign: "middle",
          textSize: 54 * hk,
          badge: "pill",
          ...frame,
          window: "app",
          winX: fx(wx),
          winY: fy(Math.max(P.t, fw + 34 * u * hk)),
          winW: ww / W,
          winRatio: APP_H / APP_W,
          winRadius: 12 * hk,
          winChrome: true
        };
      }
      return {
        ...base,
        align: "center",
        area: box(L.l, inset.t ? P.t : fw + (tall ? 90 : 48) * u, L.r, fb - 0.4 * F.h),
        textSize: tall ? 74 : wide ? 54 : 64,
        badge: "pill",
        ...frame,
        window: "app",
        winFollow: true,
        winGap: tall ? 60 : 36,
        winMinTop: fy(inset.t ? P.t : fw + 48 * u),
        winX: 0.5,
        winY: 0.42,
        winW: tall ? 0.84 : wide ? 0.78 : 0.84,
        winRatio: tall ? 1.2 : squareish ? 0.8 : APP_H / APP_W,
        winRadius: 12,
        winChrome: true
      };
    }
    case "partner": {
      const fw = 30 * u * hk;
      return {
        ...base,
        align: "center",
        area: box(Math.max(P.l, fw + 60 * u * hk), Math.max(P.t, fw + 22 * u * hk), Math.min(P.r, W - fw - 60 * u * hk), Math.min(P.b, H - fw - 22 * u * hk)),
        valign: "middle",
        textSize: (tall ? 70 : wide ? 52 : 60) * hk,
        badge: "pill",
        pattern: "full",
        tileSize: (v.on ? 40 + v.spot * 24 : 51.6) * hk,
        tileStrength: 55,
        tileStagger: v.on ? !v.flip : true,
        panelBorder: false,
        frame: "line",
        frameWidth: fw / u,
        frameRadius: 20 * hk,
        frameTone: "lilac",
        logo: true,
        logoSize: 60 * hk,
        logoX: fx(cx),
        logoY: fy(F.y + F.h * (banner ? 0.18 : tall ? 0.36 : wide ? 0.25 : 0.3)),
        logoAnchor: "center",
        group: true
      };
    }
    case "announce": {
      const inner = m + 34 * u * hk;
      const I = { l: Math.max(P.l, inner), t: Math.max(P.t, inner), r: Math.min(P.r, W - inner), b: Math.min(P.b, H - inner) };
      const left = v.flip && !avoid.length;
      const oct = (banner ? ultra ? 0.5 : 0.42 : 0.32) * S;
      const lk = LOCKUP().h * hk * u;
      return {
        ...base,
        align: "left",
        area: box(I.l, I.t + (banner || inset.t ? 0 : tall ? 40 * u : 30 * u), I.r, I.b),
        textSize: (tall ? 92 : banner ? 56 : wide ? 72 : 76) * hk,
        badge: "dot",
        frame: "solid",
        frameWidth: 34 * hk,
        frameRadius: 26 * hk,
        frameTone: "purple",
        logo: true,
        logoX: banner ? fx(left ? I.l : I.r) : fx(left ? I.r : I.l),
        logoY: banner ? fy(I.t) : fy(I.b - lk),
        logoAnchor: banner ? left ? "left" : "right" : left ? "right" : "left",
        logoSize: LOCKUP().h * hk,
        logoMax: I.r - I.l - (ultra || banner ? 0 : oct * 0.8 + 24 * u),
        stickers: ultra ? [] : [sit(fx(left ? I.l + oct / 2 : I.r - oct / 2), fy(I.b - oct * 0.8055 / 2), sz(oct), { rest: "sit", edge: I.b })]
      };
    }
    case "card": {
      const mm = Math.min(71 * u, 0.09 * Math.min(W, H));
      const q = mm / 98 * (banner ? 1.45 : 1);
      const px2 = (n) => n * q / u;
      const { small } = floorsOf(at);
      const l = Math.max(P.l, F.x + mm);
      const r = Math.min(P.r, fr - mm);
      const top0 = inset.t ? P.t : F.y + mm;
      const bot0 = inset.b ? P.b : fb - mm;
      const footH = Math.max(28 * q, small);
      const foot = F.h > footH * 9;
      const logoPx = Math.max(68.7 * q, ultra ? 0.2 * F.h : 0);
      const top = top0 + logoPx * 1.3 + 28 * q;
      const bottom = foot ? bot0 - footH - 40 * q : bot0;
      return {
        ...base,
        align: "left",
        area: box(l, top, r, bottom),
        valign: "middle",
        textSize: px2(112),
        tracking: -28,
        leading: 1.06,
        headFont: "plex",
        headWeight: 600,
        bodyFont: "plex",
        bodyWeight: 400,
        bodyScale: 111,
        bodyLeading: 1.41,
        bodyGap: 37,
        bodyAlpha: 100,
        bodyWidth: banner ? 0 : 0.876,
        badge: "solid",
        badgeAt: "corner",
        badgeX: fx(r),
        badgeY: fy(top0 + Math.max(41 * q, 1.24 * Math.max(26 * q, small))),
        badgeScale: 100 * 26 * q / (19 * u),
        badgeFont: "mono",
        badgeWeight: 600,
        badgeTracking: 80,
        logo: true,
        logoX: fx(l),
        logoY: fy(top0 + Math.max(22 * q, 0.31 * logoPx)),
        logoAnchor: "left",
        logoSize: logoPx / u,
        logoMarkScale: 117,
        logoMarkLift: 21.8,
        logoGap: 76,
        foot,
        footSize: footH / u,
        footInset: 0,
        footBox: { l, r, b: bot0 }
      };
    }
    case "mark": {
      const circle = frameFor(at).circle;
      const side = avoid.filter((a) => a.y < F.y + F.h * 0.7).map((a) => (a.x < cx ? cx - (a.x + a.w) : a.x - cx) - 30 * u);
      const lw = circle ? 0 : Math.min(F.w * 0.5, F.h * 0.34 * LOCKUP().w / LOCKUP().h, ...side.map((x) => Math.max(60, x * 2)));
      const logoPx = circle ? 0 : lw * LOCKUP().h / LOCKUP().w;
      return {
        ...base,
        align: "center",
        area: box(P.l, P.t, P.r, P.b),
        textSize: 60,
        badge: "none",
        logo: !circle,
        logoSize: logoPx / u,
        logoX: fx(cx),
        logoY: fy(F.y + F.h / 2 - logoPx / 2),
        logoAnchor: "center",
        wordless: true,
        logoMax: Math.min(P.r - P.l, ...side.map((x) => Math.max(60, x * 2))),
        stickers: circle ? [sit(0.5, 0.5, 0.62)] : []
      };
    }
  }
}
function designStart() {
  const s = imageDoc().start;
  return {
    name: "Untitled",
    template: "tile",
    size: "og",
    w: 1200,
    h: 630,
    theme: "paper",
    highlight: "pink",
    badge: "pill",
    badgeText: "",
    badgeScale: 100,
    headline: "",
    body: "",
    credit: "",
    page: "",
    align: "left",
    area: { x: 40, y: 40, w: 600, h: 400 },
    valign: "top",
    pad: { l: 40, t: 40, r: 1160, b: 590 },
    group: false,
    wordless: false,
    textSize: 61.4,
    textCap: 0,
    tracking: -10,
    leading: 1.04,
    bodyScale: 100,
    badgeAt: "words",
    badgeX: 0.95,
    badgeY: 0.08,
    foot: false,
    footLeft: s.footLeft ?? "",
    footRight: s.footRight ?? "",
    footBox: { l: 40, r: 1160, b: 590 },
    logo: true,
    logoX: 0.033,
    logoY: 0.863,
    logoSize: 46.08,
    logoAnchor: "left",
    logoMax: 0,
    partnerName: "",
    pattern: "none",
    panel: { x: 0, y: 0, w: 1, h: 1 },
    tileSize: 51.6,
    tileStrength: 100,
    tileStagger: false,
    panelBorder: true,
    outline: false,
    outlineSize: 188.8,
    outlineY: 1,
    outlineFloor: 0,
    outlineShift: 0,
    outlineRule: true,
    hatch: "none",
    hatchY: 0.66,
    hatchGap: 19,
    hatchMirror: false,
    sideWidth: 32,
    guides: false,
    guideInset: 80,
    reef: false,
    reefScale: 100,
    reefFade: themes().paper.reefFade,
    reefDrop: 0,
    frame: "none",
    frameWidth: 24,
    frameRadius: 18,
    frameTone: "lilac",
    window: "none",
    winX: 0.5,
    winY: 0.42,
    winW: 0.86,
    winRatio: APP_H / APP_W,
    winRadius: 10,
    winFollow: false,
    winGap: 40,
    winMinTop: 0,
    winChrome: false,
    winUrl: s.winUrl ?? "",
    app: appStart(),
    stickers: [],
    headWeight: 600,
    headFont: "display",
    badgeGap: 21,
    badgeWeight: 500,
    badgeFont: "text",
    badgeTracking: 0,
    bodyAlpha: 78,
    bodyFont: "text",
    bodyWeight: 400,
    bodyLeading: 1.4,
    bodyGap: 30,
    bodyWidth: 0,
    logoMark: true,
    logoWord: true,
    logoMarkScale: 100,
    logoMarkLift: 0,
    logoGap: 100,
    footSize: 20,
    footWeight: 500,
    footInset: 56,
    edits: {},
    asked: {}
  };
}
var STAR = "\0";
function parseLine(line) {
  const out = [];
  let hi = false;
  line = line.replaceAll("\\*", STAR);
  if ((line.split("*").length - 1) % 2)
    line = line.replace(/\*(?=[^*]*$)/, STAR);
  for (const [i, chunk2] of line.split("*").entries()) {
    if (i > 0)
      hi = !hi;
    for (const b of chunk2.split(/(\s+)/)) {
      if (!b)
        continue;
      if (/^\s+$/.test(b)) {
        if (out.length)
          out[out.length - 1].space = true;
      } else {
        const prev = out[out.length - 1];
        if (prev && !prev.space)
          prev.tail = [...prev.tail ?? [], { text: b.replaceAll(STAR, "*"), hi }];
        else
          out.push({ text: b.replaceAll(STAR, "*"), hi, space: false });
      }
    }
  }
  return out;
}
var whole = (w) => w.text + (w.tail ?? []).map((t) => t.text).join("");
var plainWords = (s) => s.split("\n").map((l) => parseLine(l).map(whole).join(" ")).join(" ").replace(/\s+/g, " ").trim();
function wrapWords(ctx, words, max) {
  const space = ctx.measureText(" ").width;
  const lines = [];
  let cur = [];
  let w = 0;
  for (const wd of words) {
    const ww = ctx.measureText(whole(wd)).width;
    const add = cur.length ? space + ww : ww;
    if (cur.length && w + add > max) {
      lines.push({ words: cur, w });
      cur = [wd];
      w = ww;
    } else {
      cur.push(wd);
      w += add;
    }
  }
  if (cur.length)
    lines.push({ words: cur, w });
  return lines;
}
function balanced(ctx, text, max) {
  return text.split("\n").flatMap((l) => {
    const words = parseLine(l);
    const greedy = wrapWords(ctx, words, max);
    if (greedy.length < 2)
      return greedy;
    let lo = max * 0.45;
    let hi = max;
    for (let i = 0; i < 9; i++) {
      const mid = (lo + hi) / 2;
      const t = wrapWords(ctx, words, mid);
      if (t.length <= greedy.length && t.every((x) => x.w <= mid + 0.01))
        hi = mid;
      else
        lo = mid;
    }
    const out = wrapWords(ctx, words, hi);
    return out.length === greedy.length ? out : greedy;
  });
}
function baselineIn(ctx, lineTop, size, lh) {
  const m = ctx.measureText("Hg");
  const asc = m.fontBoundingBoxAscent || size * 0.9;
  const desc = m.fontBoundingBoxDescent || size * 0.22;
  return lineTop + (size * lh - (asc + desc)) / 2 + asc;
}
function colorsOf2(d) {
  const t = themes()[d.theme];
  return { bg: t.bg, ink: t.ink, muted: t.muted, line: t.line, tile: t.tile, border: t.border, hi: highlightColor(d.highlight, d.theme), dark: t.dark, tileAlpha: t.tileAlpha };
}
function hatchLines(ctx, r, gap, angle = 45, mirror = false) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  const L = Math.hypot(r.w, r.h) + gap * 2;
  const sp = Math.max(1, gap / Math.SQRT2);
  ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
  ctx.rotate((mirror ? 1 : -1) * angle * Math.PI / 180);
  ctx.beginPath();
  for (let y = -L / 2; y <= L / 2; y += sp) {
    ctx.moveTo(-L / 2, y);
    ctx.lineTo(L / 2, y);
  }
  ctx.stroke();
  ctx.restore();
}
function tileWords(ctx, r, tile, u, stagger, keep = []) {
  const th = tile * u;
  const k = th / WM().h;
  const tw = WM().w * k;
  const gx = th * (18.43 / 51.61);
  const gy = th * (10 / 51.61);
  const n = Math.max(1, Math.floor((r.w + gx) / (tw + gx)));
  const rows = Math.max(1, Math.floor((r.h + gy) / (th + gy)));
  const sx = n > 1 ? Math.min(gx * 1.6, gx + (r.w - n * tw - (n - 1) * gx - gx) / (n - 1)) : gx;
  const sy = rows > 1 ? Math.min(gy * 1.8, gy + Math.max(0, r.h - rows * th - (rows - 1) * gy - gy) / (rows - 1)) : gy;
  const gapX = Math.max(gx, sx);
  const x0 = r.x + (r.w - (n * tw + (n - 1) * gapX)) / 2;
  const y0 = r.y + (r.h - (rows * th + (rows - 1) * sy)) / 2;
  const path = wordmarkPath();
  const out = [];
  for (let row = 0; row < rows; row++) {
    const odd = stagger && row % 2 === 1 && n > 1;
    for (let c = 0; c < (odd ? n - 1 : n); c++) {
      const box = { x: x0 + c * (tw + gapX) + (odd ? (tw + gapX) / 2 : 0), y: y0 + row * (th + sy), w: tw, h: th };
      if (keep.some((q) => inter(box, q)))
        continue;
      ctx.save();
      ctx.translate(box.x, box.y);
      ctx.scale(k, k);
      ctx.fill(path);
      ctx.restore();
      out.push(box);
    }
  }
  return out;
}
function drawLockup(ctx, d, b, ink, pics, fonts2) {
  const L = LOCKUP();
  const { k, x, y, lh } = b;
  const mark = pics.get("sit");
  if (d.logoMark && mark)
    ctx.drawImage(mark, x, b.my, b.markW, b.mh);
  if (d.logoWord) {
    ctx.save();
    ctx.translate(x + b.markW + b.wordGap, y + L.word.y * k);
    ctx.scale(k, k);
    ctx.fillStyle = ink;
    ctx.fill(wordmarkPath());
    ctx.restore();
  }
  if (b.partner) {
    let px2 = x + b.lw + b.gap;
    const cy = y + lh / 2;
    const cx = px2 + b.times / 2;
    ctx.strokeStyle = ink;
    ctx.globalAlpha *= 0.55;
    ctx.lineWidth = 2.2 * k;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - b.times / 2, cy - b.times / 2);
    ctx.lineTo(cx + b.times / 2, cy + b.times / 2);
    ctx.moveTo(cx + b.times / 2, cy - b.times / 2);
    ctx.lineTo(cx - b.times / 2, cy + b.times / 2);
    ctx.stroke();
    ctx.globalAlpha /= 0.55;
    px2 = cx + b.times / 2 + b.gap;
    ctx.fillStyle = ink;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = `600 ${lh * 0.72}px ${fonts2.sans}`;
    ctx.fillText(b.partner, px2, cy + lh * 0.03);
  }
}
function drawBadge(ctx, d, x, y, size, ink, _hi, dark, fonts2, measureOnly, bg) {
  if (d.badge === "none" || !d.badgeText.trim())
    return { w: 0, h: 0 };
  const fs = size;
  const text = d.badgeText.replace(/\s+/g, " ").trim();
  const sq = fs * 1.2857;
  const wordInk = d.badge === "solid" ? bg : ink;
  const face = faceOf(fonts2, d.badgeFont);
  const track = d.badgeTracking / 1e3 * fs;
  ctx.font = `${d.badgeWeight} ${fs}px ${face}`;
  ctx.letterSpacing = `${track}px`;
  const tw = ctx.measureText(text).width - (track > 0 ? track : 0);
  ctx.letterSpacing = "0px";
  const words = (x2, y2) => {
    ctx.font = `${d.badgeWeight} ${fs}px ${face}`;
    ctx.letterSpacing = `${track}px`;
    ctx.fillStyle = wordInk;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(text, x2, y2 + fs * 0.04);
    ctx.letterSpacing = "0px";
  };
  if (d.badge === "solid") {
    const padX = fs * 1.08;
    const h = fs * 2.46;
    const w2 = tw + padX * 2;
    if (!measureOnly) {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.roundRect(x, y, w2, h, h / 2);
      ctx.fill();
      words(x + padX, y + h / 2);
    }
    return { w: w2, h };
  }
  if (d.badge === "pill") {
    const padX = fs * 0.75;
    const h = fs * 1.9;
    const w2 = tw + padX * 2 + fs * 0.9;
    if (!measureOnly) {
      ctx.fillStyle = themes()[d.theme].pill;
      ctx.strokeStyle = dark ? brandColor("pillStrokeDark") : brandColor("pillStroke");
      ctx.lineWidth = Math.max(1, fs * 0.06);
      ctx.beginPath();
      ctx.roundRect(x, y, w2, h, h / 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = brandColor("pink");
      ctx.beginPath();
      ctx.arc(x + padX + fs * 0.22, y + h / 2, fs * 0.24, 0, Math.PI * 2);
      ctx.fill();
      words(x + padX + fs * 0.9, y + h / 2);
    }
    return { w: w2, h };
  }
  const r = fs * 0.3;
  const w = r * 2 + fs * 0.55 + tw;
  if (!measureOnly) {
    ctx.fillStyle = brandColor("pink");
    ctx.beginPath();
    ctx.arc(x + r, y + sq / 2, r, 0, Math.PI * 2);
    ctx.fill();
    words(x + r * 2 + fs * 0.55, y + sq / 2);
  }
  return { w, h: sq };
}
function glyphBox(ctx, text, x, base, w) {
  const m = ctx.measureText(text);
  return { x, y: base - m.actualBoundingBoxAscent, w, h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent };
}
var edit = (d, id) => d.edits[id] ?? {};
var hidden = (d, id) => !!d.edits[id]?.hidden;
function layWords(ctx, d, base, maxW, fonts2, forced) {
  const { small } = floorsOf(d);
  const size = forced ?? base;
  const out = { size, w: 0, h: 0, word: 0 };
  let y = 0;
  if (d.badgeAt === "words" && d.badge !== "none" && d.badgeText.trim() && !hidden(d, "badge")) {
    const fs = Math.max(small, base * 0.3046 * (d.badgeScale / 100)) * (edit(d, "badge").scale ?? 1);
    const b = drawBadge(ctx, d, 0, 0, fs, "#000000", "", false, fonts2, true, "#FFFFFF");
    out.badge = { ...b, fs, top: y };
    out.word = Math.max(out.word, b.w);
    out.w = Math.max(out.w, b.w);
    y += b.h;
  }
  if (d.headline.trim() && !hidden(d, "headline")) {
    if (y)
      y += size * (d.badgeGap / 100);
    ctx.font = `${d.headWeight} ${size}px ${faceOf(fonts2, d.headFont)}`;
    ctx.letterSpacing = `${d.tracking / 1e3 * size}px`;
    const lines = balanced(ctx, d.headline, maxW);
    for (const l of lines) {
      out.w = Math.max(out.w, l.w);
      for (const wd of l.words)
        out.word = Math.max(out.word, ctx.measureText(whole(wd)).width);
    }
    ctx.letterSpacing = "0px";
    out.head = { lines, top: y };
    y += lines.length * size * d.leading;
    if (!d.body.trim() && !d.credit.trim())
      y += size * Math.max(0, 1.1 - d.leading);
  }
  let tail = 0;
  const plain = (id, text, fs, weight, leading, width, gap) => {
    if (!text.trim() || hidden(d, id))
      return;
    const f = fs * (edit(d, id).scale ?? 1);
    if (y)
      y += gap;
    ctx.font = `${weight} ${f}px ${faceOf(fonts2, d.bodyFont)}`;
    const lines = text.split("\n").flatMap((l) => {
      const words = parseLine(l.replaceAll("*", "\\*"));
      return wrapWords(ctx, words, width).map((ln) => ({ text: ln.words.map(whole).join(" "), w: ln.w, words: ln.words }));
    });
    for (const l of lines) {
      out.w = Math.max(out.w, l.w);
      for (const wd of l.words)
        out.word = Math.max(out.word, ctx.measureText(whole(wd)).width);
    }
    out[id] = { lines: lines.map((l) => ({ text: l.text, w: l.w })), size: f, top: y };
    y += lines.length * f * leading;
    tail = f * Math.max(0, 1.3 - leading);
  };
  const bw = d.bodyWidth > 0 ? d.bodyWidth * maxW : maxW;
  plain("body", d.body, Math.max(small * 1.1, base * 0.34 * (d.bodyScale / 100)), d.bodyWeight, d.bodyLeading, bw, base * (d.bodyGap / 100) * (out.head ? 1 : 0.6));
  const credit = d.credit.trim();
  if (credit)
    plain("credit", credit, Math.max(small, base * 0.2), 500, 1.15, bw, base * (d.body.trim() ? 0.14 : 0.24));
  out.h = y + tail;
  return out;
}
function nudge(d, id) {
  const { w: W, h: H } = frameOf(d);
  const e = edit(d, id);
  const h = id === "headline" ? {} : edit(d, "headline");
  return { x: ((e.dx ?? 0) + (h.dx ?? 0)) * W, y: ((e.dy ?? 0) + (h.dy ?? 0)) * H };
}
var leftOf = (p, w) => p.align === "left" ? p.x : p.align === "center" ? p.x + (p.w - w) / 2 : p.x + p.w - w;
function drawWords(ctx, d, p, C, fonts2, out) {
  const { w: W } = frameOf(d);
  const b = p.block;
  const { small, head: headFloor } = floorsOf(d);
  if (b.badge) {
    const n = nudge(d, "badge");
    const x = leftOf(p, b.badge.w) + n.x;
    const y = p.y + b.badge.top + n.y;
    layer(ctx, "badge", x + b.badge.w / 2, y + b.badge.h / 2, () => drawBadge(ctx, d, x, y, b.badge.fs, C.ink, C.hi, C.dark, fonts2, false, C.bg));
    out.push(badgeLayer(d, { x, y, w: b.badge.w, h: b.badge.h }, b.badge.fs, C));
  }
  if (b.head) {
    const n = nudge(d, "headline");
    const size = b.size;
    const lh = d.leading;
    ctx.font = `${d.headWeight} ${size}px ${faceOf(fonts2, d.headFont)}`;
    ctx.letterSpacing = `${d.tracking / 1e3 * size}px`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const space = ctx.measureText(" ").width;
    const hi = C.hi || C.ink;
    const ink = [];
    let lit = false;
    const drawn = [];
    b.head.lines.forEach((line, li) => {
      let x = leftOf(p, line.w) + n.x;
      const top = p.y + b.head.top + n.y + li * size * lh;
      const base = baselineIn(ctx, top, size, lh);
      ink.push(glyphBox(ctx, line.words.map(whole).join(" "), x, base, line.w));
      layer(ctx, `line:${li}`, x + line.w / 2, top + size * lh / 2, () => line.words.forEach((wd, i) => {
        let at = x;
        for (const part of [{ text: wd.text, hi: wd.hi }, ...wd.tail ?? []]) {
          ctx.fillStyle = part.hi ? hi : C.ink;
          if (part.hi)
            lit = true;
          ctx.fillText(part.text, at, base);
          at += ctx.measureText(part.text).width;
        }
        x += ctx.measureText(whole(wd)).width + (i < line.words.length - 1 ? space : 0);
      }));
      drawn.push(line.words.map(whole).join(" "));
    });
    ctx.letterSpacing = "0px";
    const color = lit && contrast(hi, C.bg) < contrast(C.ink, C.bg) ? hi : C.ink;
    out.push({ id: "headline", kind: "text", box: union(ink), ink, text: { ...said(d, "headline", plainWords(d.headline), drawn.join(" ")), size, color, ground: [C.bg], bold: d.headWeight >= 600 }, can: canOf(d, "headline") });
    void headFloor;
  }
  const para = (id, weight, leading, color, asked) => {
    const part = b[id];
    if (!part)
      return;
    const n = nudge(d, id);
    ctx.font = `${weight} ${part.size}px ${faceOf(fonts2, d.bodyFont)}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = color;
    const ink = [];
    part.lines.forEach((l, i) => {
      const x = leftOf(p, l.w) + n.x;
      const top = p.y + part.top + n.y + i * part.size * leading;
      const base = baselineIn(ctx, top, part.size, leading);
      ink.push(glyphBox(ctx, l.text, x, base, l.w));
      layer(ctx, id, x + l.w / 2, top, () => ctx.fillText(l.text, x, base));
    });
    out.push({ id, kind: "text", box: union(ink), ink, text: { ...said(d, id, asked.replace(/\s+/g, " ").trim(), part.lines.map((l) => l.text).join(" ")), size: part.size, color, ground: [C.bg] }, can: canOf(d, id) });
  };
  para("body", d.bodyWeight, d.bodyLeading, d.bodyAlpha >= 100 ? C.ink : C.muted, d.body);
  para("credit", 500, 1.15, C.muted, d.credit);
  void W;
  void small;
}
var ANCHORS = ["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"];
function said(d, slot, want, drawn) {
  const raw = d.asked[slot];
  const whole2 = want === drawn.replace(/\s+/g, " ").trim();
  return { asked: raw ?? want, drawn: whole2 && raw !== void 0 ? raw : drawn, ...raw === void 0 ? { sample: true } : {} };
}
function layerCans(t, key2 = t) {
  const words = [
    { id: "headline", can: { move: true, scale: [0.6, 1.6], align: true, hide: true, ...headAnchors(t).length ? { anchors: headAnchors(t) } : {} } },
    { id: "body", can: { move: true, scale: [0.8, 1.6], hide: true } },
    { id: "badge", can: { move: true, scale: [0.8, 1.6], hide: true } },
    { id: "credit", can: { move: true, scale: [0.8, 1.6], hide: true } }
  ];
  const places = imageDoc().logoAnchors?.[key2] ?? ANCHORS;
  const logo2 = { id: "logo", can: { move: true, scale: [0.7, 2], hide: true, ...places.length ? { anchors: places } : {} } };
  const art2 = (anchors) => ({ id: "art", can: { move: true, scale: [0.5, 1.6], hide: true, ...anchors ? { anchors } : {} } });
  const window = { id: "window", can: { move: true, scale: [0.7, 1.2], hide: true } };
  const decor = (...ids) => ids.map((id) => ({ id, can: { hide: true } }));
  const own = {
    tile: [art2(), ...decor("pattern")],
    app: [window, art2(), ...decor("reef", "guides")],
    outline: [art2(EDGE), ...decor("band", "hatch")],
    funding: [art2(EDGE), ...decor("band", "hatch")],
    hatch: [art2(EDGE), ...decor("hatch")],
    reef: [art2(EDGE), ...decor("reef")],
    feature: [window, ...decor("frame")],
    partner: decor("pattern", "frame"),
    announce: [art2(EDGE), ...decor("frame")],
    card: decor("handle", "footer"),
    mark: [art2()]
  };
  return [...t === "mark" ? [] : words, logo2, { id: "partner", can: {} }, ...own[t], ...t === "mark" ? [] : [{ id: "page", can: { hide: true } }]];
}
var canOf = (d, id) => layerCans(d.template).find((l) => l.id === id)?.can ?? {};
var EDGE = ["left", "center", "right", "bottom-left", "bottom", "bottom-right"];
function headAnchors(t) {
  if (t === "outline" || t === "funding" || t === "hatch" || t === "reef")
    return ["top-left", "top", "top-right"];
  if (t === "announce" || t === "card")
    return ["top-left", "top", "left"];
  if (t === "tile")
    return ["top-left", "left"];
  return [];
}
function badgeLayer(d, box, fs, C) {
  const ground = d.badge === "solid" ? C.ink : d.badge === "pill" ? over(themes()[d.theme].pill, C.bg) : C.bg;
  return { id: "badge", kind: "text", box, text: { ...said(d, "badge", d.badgeText.replace(/\s+/g, " ").trim(), d.badgeText.replace(/\s+/g, " ").trim()), size: fs, color: d.badge === "solid" ? C.bg : C.ink, ground: [ground], bold: d.badgeWeight >= 600 }, can: canOf(d, "badge") };
}
var inkOf = { sit: [0, 0, 1, 0.8055], hang: [0.117, 0.158, 0.742, 0.651] };
function inkBox(id, x, y, w) {
  const r = inkOf[id] ?? [0, 0, 1, 1];
  return { x: x + r[0] * w, y: y + r[1] * w, w: r[2] * w, h: r[3] * w };
}
function stickerInk(s, W, H, winTop) {
  const S = Math.min(W, H);
  const w = s.size * S;
  const r = inkOf[s.src] ?? [0, 0, 1, s.ratio ?? 1];
  const h = w * (s.src === "sit" ? 0.8055 : 1);
  const x = s.x * W - w / 2;
  const y = s.y * H + (s.onWindow && winTop !== null ? winTop : 0) - h / 2;
  return { x: x + r[0] * w, y: y + r[1] * w, w: r[2] * w, h: r[3] * w };
}
function placedSticker(d, s, k, mirror) {
  const { w: W, h: H } = frameOf(d);
  const { F } = frameFor(d);
  const e = edit(d, "art");
  const size = s.size * k;
  const S = Math.min(W, H);
  let x = s.x;
  let y = s.y;
  if (mirror && s.rest !== "middle")
    x = (2 * F.x + F.w) / W - s.x;
  const ratio = s.src === "sit" ? 0.8055 : 1;
  const at = (kk) => {
    const w = s.size * kk * S;
    if (s.rest === "hang" && s.onWindow)
      return -(s.edge ?? 0) * kk / H;
    if (s.rest === "hang")
      return ((s.edge ?? 0) - 23 / 286 * w) / H;
    if (s.rest === "sit")
      return ((s.edge ?? 0) - w * ratio / 2) / H;
    return s.y;
  };
  if (s.rest)
    y = at(k);
  if (e.anchor) {
    const w = size * S;
    const P = d.pad;
    const ink = inkOf[s.src] ?? [0, 0, 1, ratio];
    const half = ink[2] * w / 2;
    if (e.anchor.includes("left"))
      x = (P.l + half) / W;
    else if (e.anchor.includes("right"))
      x = (P.r - half) / W;
    else
      x = (P.l + P.r) / 2 / W;
    if (s.rest !== "hang") {
      if (e.anchor.startsWith("top"))
        y = (P.t + w * ratio / 2) / H;
      else if (e.anchor.startsWith("bottom"))
        y = (P.b - w * ratio / 2) / H;
      else if (s.rest !== "sit")
        y = (P.t + P.b) / 2 / H;
    }
  }
  return { ...s, size, x: x + (e.dx ?? 0), y: y + (e.dy ?? 0) };
}
function innerOf(d, u, clear) {
  const { W, H } = frameFor(d);
  const P = d.pad;
  const ring = d.frame === "none" || hidden(d, "frame") ? 0 : d.frameWidth * u + Math.max(clear, 16 * u);
  const side = Math.max(ring, d.hatch === "sides" && !hidden(d, "hatch") ? d.sideWidth * u + Math.max(clear, 16 * u) : 0, d.guides && !hidden(d, "guides") ? d.guideInset * u + Math.max(clear, 16 * u) : 0);
  const floor = Math.min(d.outline && !hidden(d, "band") ? d.outlineY * H - d.outlineSize * u : H, d.hatch === "floor" && !hidden(d, "hatch") ? d.hatchY * H : H);
  return { l: Math.max(P.l, side), r: Math.min(P.r, W - side), t: Math.max(P.t, ring), b: Math.min(P.b, H - ring, floor < H ? floor - clear : H) };
}
var clearOf = (lh) => lh * logoDoc().clear.share;
function logoBox(ctx, d, u, fonts2) {
  if (!d.logo || !d.logoMark && !d.logoWord || hidden(d, "logo"))
    return null;
  const L = LOCKUP();
  const { w: W, h: H } = frameOf(d);
  const e = edit(d, "logo");
  const partner = d.partnerName.trim();
  let base = partner ? Math.max(d.logoSize, floorsOf(d).small / 0.72 / u) : d.logoSize;
  if (partner && d.logoMax > 0) {
    ctx.font = `600 100px ${fonts2.sans}`;
    ctx.letterSpacing = "0px";
    const wide = (n) => n * u * (L.w + 26 * 2 + 16) / L.h + ctx.measureText(partner).width / 100 * n * u * 0.72;
    if (wide(base) > d.logoMax)
      base *= d.logoMax / wide(base);
  }
  const size = base * (e.scale ?? 1);
  const k = size * u / L.h;
  const ms = (d.logoMarkScale ?? 100) / 100;
  const markW = d.logoMark ? L.mark.w * k * ms : 0;
  const wordGap = d.logoMark && d.logoWord ? (L.word.x - L.mark.w) * k * (d.logoGap / 100) : 0;
  const wordW = d.logoWord ? L.word.w * k : 0;
  const lw = markW + wordGap + wordW;
  const lh = L.h * k;
  const gap = 26 * k;
  const times = 16 * k;
  let pw = 0;
  if (partner) {
    ctx.font = `600 ${lh * 0.72}px ${fonts2.sans}`;
    ctx.letterSpacing = "0px";
    pw = ctx.measureText(partner).width;
  }
  const total = partner ? lw + gap * 2 + times + pw : lw;
  let x = d.logoAnchor === "left" ? d.logoX * W : d.logoAnchor === "center" ? d.logoX * W - total / 2 : d.logoX * W - total;
  let y = d.logoY * H;
  const mh = L.mark.h * k * ms;
  if (e.scale && !e.anchor) {
    const was = base * u;
    y = d.logoY * H + (d.logoY > 0.5 ? was - lh : d.group ? (was - lh) / 2 : 0);
  }
  if (e.anchor) {
    const P = innerOf(d, u, clearOf(lh));
    x = e.anchor.includes("left") ? P.l : e.anchor.includes("right") ? P.r - total : (P.l + P.r) / 2 - total / 2;
    y = e.anchor.startsWith("top") ? P.t : e.anchor.startsWith("bottom") ? P.b - lh : (P.t + P.b) / 2 - lh / 2;
  }
  x += (e.dx ?? 0) * W;
  y += (e.dy ?? 0) * H;
  const my = y + lh / 2 - mh / 2 - (d.logoMarkLift ?? 0) / 100 * lh;
  const top = d.logoMark ? Math.min(y, my) : y;
  const bottom = d.logoMark ? Math.max(y + lh, my + mh) : y + lh;
  return { x, y, w: total, h: bottom - top, top, k, lh, markW, wordGap, lw, my, mh, gap, times, pw, partner, clear: clearOf(lh) };
}
var logoRect = (b) => ({ x: b.x, y: b.top, w: b.w, h: b.h });
function freeCorner(d, b, u, pics) {
  const { W, H, avoid } = frameFor(d);
  const { l, r, t, b: bt } = innerOf(d, u, b.clear);
  const taken = [...avoid];
  if (d.pattern === "panel")
    taken.push(d.panel);
  if (d.outline)
    taken.push({ x: 0, y: d.outlineY * H - d.outlineSize * u, w: W, h: H });
  if (d.hatch === "floor")
    taken.push({ x: 0, y: d.hatchY * H, w: W, h: H });
  const reef = pics.get("reef");
  if (d.reef && reef)
    taken.push(...reefInk(d, reef, W, H));
  if (d.window !== "none")
    taken.push({ x: d.winX * W - d.winW * W / 2, y: d.winFollow ? d.area.y + d.area.h * 0.6 : d.winY * H, w: d.winW * W, h: H });
  const baseTaken = taken.length;
  for (const s of d.stickers)
    if (!s.onWindow)
      taken.push(stickerInk(s, W, H, null));
    else
      taken.push({ x: s.x * W - s.size * Math.min(W, H) / 2, y: 0, w: s.size * Math.min(W, H), h: d.winY * H });
  const lift = b.y - b.top;
  const left = d.align === "right" ? [r - b.w, l] : [l, r - b.w];
  const center = (l + r) / 2 - b.w / 2;
  const xs = d.align === "center" ? [center, l, r - b.w] : [...left, center];
  const spots = [...xs.slice(0, 2).map((x) => ({ x, y: bt - b.h })), ...xs.map((x) => ({ x, y: t }))];
  for (const [pass, p] of [...spots.map((p2) => [0, p2]), ...spots.slice(2).map((p2) => [1, p2])]) {
    const box = { x: p.x, y: p.y, w: b.w, h: b.h };
    if (taken.slice(0, pass ? baseTaken : taken.length).some((q) => inter(box, q, b.clear)))
      continue;
    const e = edit(d, "logo");
    const x = p.x + (e.dx ?? 0) * W;
    const y = p.y + (e.dy ?? 0) * H;
    return { ...b, x, y: y + lift, top: y, my: b.my + y - b.top };
  }
  return null;
}
function footBox(ctx, d, u, fonts2) {
  if (!d.foot)
    return null;
  const fs = d.footSize * u;
  const { l, r, b } = d.footBox;
  ctx.font = `${d.footWeight} ${fs}px ${fonts2.mono}`;
  ctx.letterSpacing = "0px";
  const left = d.footLeft.trim();
  const right = d.page ? "" : d.footRight.trim();
  const rects = [];
  if (left && !hidden(d, "handle"))
    rects.push({ id: "handle", box: { x: l, y: b - fs, w: ctx.measureText(left).width, h: fs }, text: left });
  if (right && !hidden(d, "footer")) {
    const w = ctx.measureText(right).width;
    rects.push({ id: "footer", box: { x: r - w, y: b - fs, w, h: fs }, text: right });
  }
  const { avoid } = frameFor(d);
  const shown = rects.filter((x) => !avoid.some((a) => inter(x.box, a, fs)) && !(d.logoKeep && inter(x.box, d.logoKeep)));
  const has = (t) => shown.some((x) => x.text === t);
  return { fs, mid: b - fs * 0.5, l, r, left: left && has(left) ? left : "", right: right && has(right) ? right : "", rects: shown };
}
function pageBox(ctx, d, u, fonts2) {
  if (!d.page || hidden(d, "page"))
    return null;
  const fs = Math.max(floorsOf(d).small, 20 * u);
  ctx.font = `500 ${fs}px ${fonts2.mono}`;
  ctx.letterSpacing = "0px";
  const w = ctx.measureText(d.page).width;
  const P = d.pad;
  const f = d.frame !== "none" ? d.frameWidth * u * 1.4 : 0;
  const r = Math.min(P.r, frameOf(d).w - Math.max(f, 0) - 8 * u);
  const b = Math.min(P.b, frameOf(d).h - Math.max(f, 0) - 8 * u);
  return { fs, text: d.page, box: { x: r - w, y: b - fs, w, h: fs } };
}
var reefTops;
function reefInkIn(reef, x0, foot, rw, drop) {
  const R = logoDoc().reef;
  if (!reefTops) {
    const w = 240;
    const h = Math.round(w * R.h / R.w);
    const off = scratch(w, h);
    off.ctx.drawImage(reef, 0, 0, w, h);
    const data = off.ctx.getImageData(0, 0, w, h).data;
    reefTops = [];
    for (let c = 0; c < 48; c++) {
      let top = h;
      for (let x = c * 5; x < c * 5 + 5; x++)
        for (let y = 0; y < top; y++)
          if (data[(y * w + x) * 4 + 3] > 24)
            top = y;
      reefTops.push(top / h);
    }
  }
  const rh = rw * R.h / R.w;
  return reefTops.map((t, c) => ({ x: x0 + rw * c / 48, y: foot - rh + rh * (t + drop), w: rw / 48, h: rh * (1 - t - drop) })).filter((r) => r.h > 0);
}
function reefInk(d, reef, W, H) {
  const rw = W * (d.reefScale / 100);
  return reefInkIn(reef, W * 0.5 - rw / 2, H, rw, d.reefDrop).filter((r) => r.x + r.w > 0 && r.x < W);
}
var TooLong = class extends Error {
};
function resolve2(ctx, d, u, pics, fonts2, depth = 0, base) {
  const { W, H, avoid } = frameFor(d);
  const floors = floorsOf(d);
  let logo2 = logoBox(ctx, d, u, fonts2);
  if (logo2 && !layoutFor(d.template, { size: d.size, w: d.w, h: d.h }, d.seed).logo && !edit(d, "logo").anchor)
    logo2 = freeCorner(d, logo2, u, pics) ?? logo2;
  const gap = 14 * u;
  const foot = footBox(ctx, d, u, fonts2);
  const page = pageBox(ctx, d, u, fonts2);
  let corner = null;
  if (d.badgeAt === "corner" && d.badge !== "none" && d.badgeText.trim() && !hidden(d, "badge")) {
    const e = edit(d, "badge");
    const fs = Math.max(floors.small, 19 * u * (d.badgeScale / 100)) * (e.scale ?? 1);
    const b = drawBadge(ctx, d, 0, 0, fs, "#000000", "", false, fonts2, true, "#FFFFFF");
    corner = { x: d.badgeX * W - b.w + (e.dx ?? 0) * W, y: d.badgeY * H - b.h / 2 + (e.dy ?? 0) * H, w: b.w, h: b.h, fs };
  }
  const fixed = avoid.map((a) => grow(a, gap));
  if (logo2 && !d.group)
    fixed.push(grow(logoRect(logo2), Math.max(logo2.clear, gap)));
  if (corner)
    fixed.push(grow(corner, gap));
  if (foot)
    for (const r of foot.rects)
      fixed.push(grow(r.box, gap));
  if (page)
    fixed.push(grow(page.box, gap));
  const reef = pics.get("reef");
  if (d.reef && reef && !hidden(d, "reef"))
    fixed.push(...reefInk(d, reef, W, H).map((r) => ({ ...r, y: r.y - gap, h: r.h + gap })));
  const visible = hidden(d, "art") ? [] : d.stickers.filter((s) => !s.hidden);
  const head = edit(d, "headline");
  const align = head.align ?? (head.anchor ? head.anchor.includes("left") ? "left" : head.anchor.includes("right") ? "right" : "center" : d.align);
  const moved = !!head.anchor || !!head.align;
  let area = d.area;
  if (head.anchor) {
    const I = innerOf(d, u, gap);
    area = { x: I.l, y: I.t, w: I.r - I.l, h: Math.max(1, Math.min(I.b, d.area.y + d.area.h) - I.t) };
  }
  if (head.anchor && d.pattern === "panel" && !hidden(d, "pattern"))
    fixed.push(grow(d.panel, 24 * u));
  const hasWords = d.headline.trim() || d.body.trim() || d.credit.trim() || d.badgeAt === "words" && d.badge !== "none" && d.badgeText.trim();
  if (d.group && logo2 && hasWords) {
    const e = edit(d, "logo");
    if (e.anchor || e.dx || e.dy)
      fixed.push(grow(logoRect(logo2), Math.max(logo2.clear, gap)));
    else
      area = { ...area, y: area.y + logo2.h + 34 * u, h: area.h - logo2.h - 34 * u };
  }
  const nominal0 = d.textSize * u;
  const keep = Object.keys(d.edits).length && !head.anchor && !head.align ? resolve2(ctx, { ...d, edits: {}, logo: !!layoutFor(d.template, { size: d.size, w: d.w, h: d.h }, d.seed).logo || !!d.partnerName.trim() }, u, pics, fonts2).placed : null;
  const nominal1 = Math.max(floors.head, d.textCap > 0 ? Math.min(d.textCap, nominal0) : nominal0);
  const nominal = keep ? Math.min(nominal1, keep.block.size) : nominal1;
  const memo = /* @__PURE__ */ new Map();
  const lay = (s, w, forced) => {
    const key2 = `${s.toFixed(2)}|${w.toFixed(1)}|${forced ?? ""}`;
    let b = memo.get(key2);
    if (!b)
      memo.set(key2, b = layWords(ctx, d, s, w, fonts2, forced));
    return b;
  };
  const fits = (b, r) => b.h <= r.h + 0.5 && b.word <= r.w + 0.5 && b.w <= r.w + 0.5;
  const fit3 = (r) => {
    if (!fits(lay(floors.head, r.w), r))
      return null;
    if (fits(lay(nominal, r.w), r))
      return nominal;
    let lo = floors.head;
    let hi = nominal;
    for (let i = 0; i < 9; i++) {
      const mid = (lo + hi) / 2;
      if (fits(lay(mid, r.w), r))
        lo = mid;
      else
        hi = mid;
    }
    return lo;
  };
  const center = d.area.x + d.area.w / 2;
  const spotsIn = (obstacles) => {
    const out = [];
    for (const r of emptyRects(area, obstacles)) {
      if (align === "center" && !head.anchor) {
        const half = Math.min(center - r.x, r.x + r.w - center);
        if (half > 1)
          out.push({ x: center - half, y: r.y, w: half * 2, h: r.h });
      }
      out.push(r);
    }
    return out;
  };
  const want = (b, r) => {
    const v = head.anchor ? head.anchor.startsWith("top") ? "top" : head.anchor.startsWith("bottom") ? "bottom" : "middle" : d.valign;
    const mid = Math.max(r.y, Math.min(r.y + r.h - b.h, area.y + area.h / 2 - b.h / 2));
    return { x: r.x, y: v === "top" ? r.y : v === "bottom" ? r.y + r.h - b.h : mid };
  };
  const keepAt = keep ? { x: keep.align === "left" ? keep.x : keep.align === "right" ? keep.x + keep.w : keep.x + keep.w / 2, y: keep.y } : null;
  const drift = (r, b) => {
    if (!keepAt)
      return 0;
    const px2 = align === "left" ? r.x : align === "right" ? r.x + r.w : r.x + r.w / 2;
    return Math.hypot((px2 - keepAt.x) / W, (want(b, r).y - keepAt.y) / H);
  };
  const rate = (r, size2) => {
    const b = lay(size2, r.w);
    const p = want(b, r);
    const ax = align === "left" ? area.x : align === "right" ? area.x + area.w : head.anchor ? area.x + area.w / 2 : center;
    const px2 = align === "left" ? r.x : align === "right" ? r.x + r.w : r.x + r.w / 2;
    const v = head.anchor ? head.anchor.startsWith("top") ? 0 : head.anchor.startsWith("bottom") ? 1 : 0.5 : d.valign === "top" ? 0 : d.valign === "bottom" ? 1 : 0.5;
    const off = Math.hypot((px2 - ax) / W * 1.8, (p.y + b.h * v - (area.y + area.h * v)) / H);
    const lines = b.head?.lines.length ?? 0;
    const words = plainWords(d.headline).split(" ").length;
    return size2 / nominal - off * 1.1 - Math.max(0, lines - Math.max(2, words / 3)) * 0.08 - drift(r, b) * 8;
  };
  const solve = (obstacles) => {
    let best = null;
    for (const r of spotsIn(obstacles)) {
      const size2 = fit3(r);
      if (size2 === null)
        continue;
      const score = rate(r, size2);
      if (!best || score > best.score + 1e-6)
        best = { r, size: size2, score };
    }
    return best;
  };
  const own = edit(d, "art").scale;
  const clash = (list) => list.some((s) => {
    if (s.onWindow)
      return false;
    const ink = stickerInk(s, W, H, null);
    return avoid.some((a) => inter(ink, a)) || logo2 && !d.group && inter(ink, grow(logoRect(logo2), logo2.clear)) || page && inter(ink, grow(page.box, gap));
  });
  const choose = (ladder2, mirrors) => {
    let best = null;
    for (const [k, mirror] of visible.length ? ladder2.flatMap((k2) => mirrors.map((m) => [k2, m])) : [[1, false]]) {
      const stickers = visible.map((s) => placedSticker(d, s, k, mirror));
      const bad = clash(stickers);
      if (mirror && mirrors.length > 1 && !clash(visible.map((s) => placedSticker(d, s, k, false))))
        continue;
      const obstacles = [...fixed, ...stickers.filter((s) => !s.onWindow).map((s) => grow(stickerInk(s, W, H, null), gap))];
      const spot = hasWords ? solve(obstacles) : null;
      if (hasWords && !spot)
        continue;
      const score = (spot ? Math.min(1, spot.size / nominal / 0.9) : 1) + k * 0.7 - (bad ? 1.5 : 0) - (mirror ? 0.02 : 0) + (spot ? Math.min(0, spot.score - spot.size / nominal) * 0.6 : 0);
      if (!best || score > best.score + 1e-6)
        best = { spot, stickers, score, k, mirror };
      if (!hasWords && !bad)
        break;
    }
    return best;
  };
  const free = [1, 0.9, 0.8, 0.72, 0.64, 0.56];
  const moved2 = !!edit(d, "art").anchor || !!edit(d, "art").dx;
  let pickd = choose(free, moved2 ? [false] : [false, true]);
  const ladder = own ? [(pickd?.k ?? free[free.length - 1]) * own] : free;
  if (own)
    pickd = choose(ladder, [pickd?.mirror ?? false]);
  if (!pickd)
    throw tooLong();
  const chosen = pickd;
  function tooLong() {
    const what = d.body.trim().length > plainWords(d.headline).length * 2 ? "line under the headline" : "headline";
    const key2 = what === "headline" ? "headline" : "body";
    const obstacles = [...fixed, ...visible.map((s) => placedSticker(d, s, ladder[ladder.length - 1], false)).filter((s) => !s.onWindow).map((s) => grow(stickerInk(s, W, H, null), gap))];
    const words = d[key2].split(/\s+/).filter(Boolean);
    const long = [...words].sort((a, b) => b.length - a.length)[0] ?? "";
    const rects = spotsIn(obstacles);
    const widest = Math.max(0, ...rects.map((r) => r.w));
    ctx.font = `${d.headWeight} ${floors.head}px ${faceOf(fonts2, d.headFont)}`;
    const wide = what === "headline" && ctx.measureText(long.replace(/\*/g, "")).width > widest;
    let n = words.length;
    const keep2 = d[key2];
    if (!wide) {
      while (n > 0) {
        n--;
        d[key2] = words.slice(0, n).join(" ").replace(/\*/g, "");
        memo.clear();
        if (rects.some((r) => fit3(r) !== null))
          break;
      }
      d[key2] = keep2;
      memo.clear();
    }
    const fitChars = words.slice(0, n).join(" ").replace(/\*/g, "").length;
    const at = d.size === "custom" ? `${W}x${H}` : `${d.size} (${W}x${H})`;
    return new TooLong(wide ? `The word "${long.replace(/\*/g, "")}" is too long for ${d.template} at ${at}: it is wider than the room for words at the smallest readable size (${Math.round(floors.head)} px). Shorten it, add a space, or use another template or size.` : `The ${what} is too long for ${d.template} at ${at}: ${fitChars ? `at the smallest readable size about ${fitChars} characters fit, and it has ${keep2.replace(/\*/g, "").length}. Shorten it,` : "at the smallest readable size there is no room for it under the other words. Shorten them, leave it out,"} or use another template or size.`);
  }
  let placed = null;
  let size = nominal;
  if (chosen.spot) {
    let { r } = chosen.spot;
    size = chosen.spot.size;
    let block = lay(size, r.w);
    const scale = head.scale ?? 1;
    if (scale !== 1) {
      const forced = (base ?? size) * scale;
      const search = () => {
        let found2 = null;
        let fallback2 = null;
        for (const k of visible.length ? ladder : [1]) {
          const stickers = visible.map((s, i) => own ? chosen.stickers[i] : placedSticker(d, s, k, chosen.mirror));
          const obstacles = [...fixed, ...stickers.filter((s) => !s.onWindow).map((s) => grow(stickerInk(s, W, H, null), gap))];
          for (const x2 of spotsIn(obstacles)) {
            const b = lay(size, x2.w, forced);
            if (fits(b, x2) && drift(x2, b) < 0.02) {
              const score = k * 0.3 + rate(x2, size);
              if (!found2 || score > found2.score + 1e-6)
                found2 = { r: x2, stickers, score };
            } else {
              const over2 = Math.max(0, b.h - x2.h) / H + Math.max(0, Math.max(b.w, b.word) - x2.w) / W + drift(x2, b) * 10;
              if (!fallback2 || over2 < fallback2.over - 1e-6)
                fallback2 = { r: x2, stickers, over: over2 };
            }
          }
        }
        let nearly2 = null;
        if (!found2 && scale > 1) {
          for (const k of visible.length ? ladder : [1]) {
            const stickers = visible.map((s, i) => own ? chosen.stickers[i] : placedSticker(d, s, k, chosen.mirror));
            const obstacles = [...fixed, ...stickers.filter((s) => !s.onWindow).map((s) => grow(stickerInk(s, W, H, null), gap))];
            for (const x2 of spotsIn(obstacles)) {
              let lo = 1;
              let hi = scale;
              if (!(fits(lay(size, x2.w, size), x2) && drift(x2, lay(size, x2.w, size)) < 0.02))
                continue;
              for (let i = 0; i < 8; i++) {
                const mid = (lo + hi) / 2;
                if (fits(lay(size, x2.w, size * mid), x2))
                  lo = mid;
                else
                  hi = mid;
              }
              if (!nearly2 || lo > nearly2.f + 1e-6)
                nearly2 = { r: x2, stickers, f: lo };
            }
          }
        }
        let moved4 = null;
        const enough = (n2) => !!n2 && (scale > 1 ? n2.f >= 1 + (scale - 1) * 0.3 : true);
        if (!found2 && !enough(nearly2)) {
          for (const k of visible.length ? ladder : [1]) {
            const stickers = visible.map((s, i) => own ? chosen.stickers[i] : placedSticker(d, s, k, chosen.mirror));
            const obstacles = [...fixed, ...stickers.filter((s) => !s.onWindow).map((s) => grow(stickerInk(s, W, H, null), gap))];
            for (const x2 of spotsIn(obstacles)) {
              if (!fits(lay(size, x2.w, forced), x2))
                continue;
              const score = k * 0.3 + rate(x2, size) + drift(x2, lay(size, x2.w, forced)) * 8;
              if (!moved4 || score > moved4.score + 1e-6)
                moved4 = { r: x2, stickers, score };
            }
          }
        }
        return { found: found2, nearly: nearly2, moved: moved4, fallback: fallback2, enough: !!found2 || enough(nearly2) || !!moved4 };
      };
      let got = search();
      if (!got.enough && scale > 1 && d.winFollow && d.window !== "none") {
        area = { ...area, h: area.h + (scale - 1) * block.h * 1.4 };
        got = search();
      }
      if (!got.enough && scale > 1 && d.reef && depth < 2)
        return resolve2(ctx, { ...d, reefDrop: Math.min(0.5, d.reefDrop + 0.18) }, u, pics, fonts2, depth + 1, base ?? size);
      const { found, nearly, moved: moved3, fallback } = got;
      const use = found ?? (nearly && (scale <= 1 || nearly.f >= 1 + (scale - 1) * 0.3) ? nearly : null) ?? moved3 ?? nearly ?? fallback;
      if (use) {
        r = use.r;
        chosen.stickers = use.stickers;
        block = lay(size, r.w, "f" in use ? size * use.f : forced);
      }
    }
    const p = want(block, r);
    let x = r.x;
    let w = r.w;
    if (moved && head.align && !head.anchor) {
      x = r.x;
      w = r.w;
    }
    let y = p.y;
    if (d.group && logo2) {
      const e = edit(d, "logo");
      if (!e.anchor && !e.dx && !e.dy && !head.anchor) {
        const total = logo2.h + 34 * u + block.h;
        const top = Math.max(d.area.y, d.area.y + (d.area.h - total) / 2);
        const shift = top - logo2.top;
        logo2 = { ...logo2, y: logo2.y + shift, top, my: logo2.my + shift };
        y = top + logo2.h + 34 * u;
        const all = { x, y, w, h: block.h };
        if (fixed.some((f) => inter(all, f)))
          y = p.y;
      }
    }
    const n = nudge(d, "headline");
    placed = { block, x, y, w, align };
    size = block.size;
    void n;
  } else if (d.group && logo2 && !edit(d, "logo").anchor) {
    const top = d.area.y + (d.area.h - logo2.h) / 2 + (edit(d, "logo").dy ?? 0) * H;
    const shift = top - logo2.top;
    logo2 = { ...logo2, y: logo2.y + shift, top, my: logo2.my + shift };
  }
  let winTop = null;
  if (d.window !== "none" && !hidden(d, "window")) {
    const n = nudge(d, "headline");
    const follow = d.winFollow ? placed ? Math.max(d.winMinTop * H, placed.y + placed.block.h + n.y + d.winGap * u) : d.winMinTop * H : d.winY * H;
    winTop = follow + (edit(d, "window").dy ?? 0) * H;
  }
  return { placed, logo: logo2, corner, foot, page, stickers: chosen.stickers, winTop, size, reefDrop: d.reefDrop };
}
function shadowFilter(w) {
  const k = w / 281.7;
  const c = (a) => withAlpha(brandColor("shadow"), a);
  return `drop-shadow(0 ${8 * k}px ${8.5 * k}px ${c(0.12)}) drop-shadow(0 ${31 * k}px ${15 * k}px ${c(0.1)}) drop-shadow(0 ${70 * k}px ${21 * k}px ${c(0.05)})`;
}
function drawItem(ctx, s, im, S, W, H, winTop, svg = false) {
  const w = s.size * S;
  const own = im ? ih(im) / iw(im) : 1;
  const h = w * (s.ratio && s.ratio > 0 ? s.ratio : own);
  const cx = s.x * W;
  const cy = s.y * H + (s.onWindow && winTop !== null ? winTop : 0);
  const box = { x: cx - w / 2, y: cy - h / 2, w, h };
  if (w < 1 || h < 0.5 || !im)
    return box;
  const radius = s.radius ?? 0;
  const draw = () => {
    if (!radius && !s.ratio) {
      ctx.drawImage(im, -w / 2, -h / 2, w, h);
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(w, h) / 2 * (radius / 50));
    ctx.clip();
    const fit3 = s.fit === "contain" ? Math.min(w / iw(im), h / ih(im)) : Math.max(w / iw(im), h / ih(im));
    const dw = iw(im) * fit3;
    const dh = ih(im) * fit3;
    ctx.drawImage(im, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  };
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(s.rotate * Math.PI / 180);
  if (s.flip)
    ctx.scale(-1, 1);
  ctx.globalAlpha = (s.opacity ?? 100) / 100;
  if (s.shadow && !svg)
    ctx.filter = shadowFilter(Math.max(w, 60));
  draw();
  ctx.restore();
  return box;
}
function windowBox(d, pics, top) {
  const { w: W } = frameOf(d);
  const e = edit(d, "window");
  const ww = d.winW * W * (e.scale ?? 1);
  const pic = d.window === "picture" ? pics.get("picture") : void 0;
  const ratio = d.winRatio > 0 ? d.winRatio : pic ? ih(pic) / iw(pic) : APP_H / APP_W;
  const chrome = d.winChrome ? 30 * (ww / Math.max(700, 1040 * Math.min(1, d.winW * 1.2))) : 0;
  return { x: d.winX * W - ww / 2 + (e.dx ?? 0) * W, y: top, w: ww, h: ww * ratio + chrome, chrome };
}
function appView(d, b) {
  const ratio = (b.h - b.chrome) / b.w;
  if (ratio > 1)
    return { showWorkspace: false, showOpen: false, width: 378 };
  if (ratio > 0.7)
    return { showWorkspace: false, width: 700 };
  if (b.w < 760 * unitOf(d))
    return { showWorkspace: false, width: 700 };
  return { width: APP_W };
}
function drawWindow(ctx, d, u, pics, icons, fonts2, line, box, svg = false) {
  const { x, y, w: ww, h: wh, chrome } = box;
  const pic = d.window === "picture" ? pics.get("picture") : void 0;
  const r = d.winRadius * u;
  const bg = brandColor("window");
  ctx.save();
  ctx.save();
  if (!svg) {
    ctx.shadowColor = withAlpha(brandColor("shadow"), 0.16);
    ctx.shadowBlur = 40 * u;
    ctx.shadowOffsetY = 14 * u;
  }
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, ww, wh, r);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, ww, wh, r);
  ctx.clip();
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, ww, wh);
  if (chrome) {
    const k = chrome / 30;
    ctx.fillStyle = brandColor("chrome");
    ctx.fillRect(x, y, ww, chrome);
    brandColors("chromeDots").forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x + (16 + i * 13) * k, y + chrome / 2, 4.2 * k, 0, Math.PI * 2);
      ctx.fill();
    });
    if (d.winUrl.trim()) {
      const bw = Math.min(300 * k, ww * 0.5);
      ctx.fillStyle = brandColor("chromeUrl");
      ctx.beginPath();
      ctx.roundRect(x + ww / 2 - bw / 2, y + chrome * 0.2, bw, chrome * 0.6, chrome * 0.3);
      ctx.fill();
      ctx.fillStyle = brandColor("chromeUrlInk");
      let fs = 8.4 * k * 1.3;
      ctx.font = `400 ${fs}px ${fonts2.sans}`;
      const tw = ctx.measureText(d.winUrl).width;
      if (tw > bw * 0.9)
        fs *= bw * 0.9 / tw;
      ctx.font = `400 ${fs}px ${fonts2.sans}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(d.winUrl, x + ww / 2, y + chrome / 2 + 0.5 * k);
    }
    ctx.fillStyle = brandColor("chromeRule");
    ctx.fillRect(x, y + chrome - 0.6 * k, ww, 0.6 * k);
  }
  ctx.beginPath();
  ctx.rect(x, y + chrome, ww, wh - chrome);
  ctx.clip();
  if (d.window === "app") {
    const view = appView(d, box);
    const s = ww / view.width;
    ctx.translate(x, y + chrome);
    ctx.scale(s, s);
    drawApp(ctx, { ...d.app, ...view }, icons, fonts2, pics.get("sit") ?? null);
  } else if (pic) {
    const bh = wh - chrome;
    const cover = Math.max(ww / iw(pic), bh / ih(pic));
    const dw = iw(pic) * cover;
    ctx.drawImage(pic, x - (dw - ww) / 2, y + chrome, dw, ih(pic) * cover);
  }
  ctx.restore();
  ctx.strokeStyle = line;
  ctx.lineWidth = Math.max(0.5, u);
  ctx.beginPath();
  ctx.roundRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, ww - ctx.lineWidth, wh - ctx.lineWidth, r);
  ctx.stroke();
  ctx.restore();
}
function windowFade(d, u, box) {
  const { H, F, inset } = frameFor(d);
  const ring = d.frame === "none" ? 0 : d.frameWidth * u;
  const end = Math.min(H - ring, F.y + F.h) - (inset.b || ring ? 2 * u : 0);
  const room = ring || inset.b ? 0 : 28 * u;
  if (box.y + box.h <= end - Math.max(room, 10 * u))
    return null;
  const from = Math.max(box.y + (end - box.y) * 0.62, end - (d.reef ? 80 : 110) * u);
  return { from, to: end };
}
function drawFrame(ctx, d, u, W, H, bg) {
  if (d.frame === "none")
    return;
  const fw = d.frameWidth * u;
  const r = d.frameRadius * u;
  const tone = toneColor(d.frameTone);
  const dark = themes()[d.theme].dark;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.roundRect(fw, fw, W - fw * 2, H - fw * 2, r);
  ctx.clip("evenodd");
  if (d.frame === "solid") {
    ctx.fillStyle = tone;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    if (d.frame === "hatch") {
      ctx.strokeStyle = tone;
      ctx.lineWidth = Math.max(0.5, u);
      hatchLines(ctx, { x: 0, y: 0, w: W, h: H }, d.hatchGap * u * 0.8, 45);
    } else if (d.frame === "tile") {
      ctx.fillStyle = tone;
      ctx.globalAlpha = (dark ? 0.5 : 0.35) * (d.tileStrength / 100);
      tileWords(ctx, { x: 0, y: 0, w: W, h: H }, Math.max(8, d.frameWidth * 0.7), u, true);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
  if (d.frame !== "solid") {
    ctx.strokeStyle = tone;
    ctx.lineWidth = Math.max(0.5, u);
    ctx.beginPath();
    ctx.roundRect(fw, fw, W - fw * 2, H - fw * 2, r);
    ctx.stroke();
  }
}
function drawReef(ctx, d, reef, W, H, bg, px2) {
  const R = logoDoc().reef;
  const rw = W * (d.reefScale / 100);
  const rh = rw * R.h / R.w;
  const off = scratch(Math.max(1, Math.round(rw * px2)), Math.max(1, Math.round(rh * px2)));
  const o = off.ctx;
  o.drawImage(reef, 0, 0, off.canvas.width, off.canvas.height);
  if (d.reefFade > 0) {
    o.globalCompositeOperation = "source-atop";
    o.globalAlpha = d.reefFade;
    o.fillStyle = bg;
    o.fillRect(0, 0, off.canvas.width, off.canvas.height);
  }
  ctx.drawImage(off.canvas, W * 0.5 - rw / 2, H - rh * (1 - d.reefDrop), rw, rh);
}
function drawFoot(ctx, d, f, ink, fonts2) {
  ctx.save();
  ctx.fillStyle = ink;
  ctx.font = `${d.footWeight} ${f.fs}px ${fonts2.mono}`;
  ctx.letterSpacing = "0px";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  if (f.left)
    ctx.fillText(f.left, f.l, f.mid);
  ctx.textAlign = "right";
  if (f.right)
    ctx.fillText(f.right, f.r, f.mid);
  ctx.restore();
}
var bandStops = (g, color) => {
  g.addColorStop(0, withAlpha(color, 0));
  g.addColorStop(0.16, color);
  g.addColorStop(0.84, color);
  g.addColorStop(1, withAlpha(color, 0));
};
function drawDesign(ctx, d0, pics, icons, fonts2, px2 = 1, svg = false, move, phase = "all") {
  motion = move;
  const u = unitOf(d0);
  let d = yieldToLogo(ctx, d0, u, fonts2);
  const { w: W, h: H } = frameOf(d);
  const S = Math.min(W, H);
  const C = colorsOf2(d);
  const layers = [];
  const under = phase === "all" || phase === "under";
  const top = phase === "all" || phase === "over";
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.letterSpacing = "0px";
  const at = resolve2(ctx, d, u, pics, fonts2);
  if (at.reefDrop !== void 0 && at.reefDrop !== d.reefDrop)
    d = { ...d, reefDrop: at.reefDrop };
  ctx.restore();
  ctx.save();
  const wordsBox = at.placed ? placedBox(d, at.placed) : null;
  const clearWords = [];
  if (wordsBox)
    clearWords.push(grow(wordsBox, 10 * u));
  if (at.logo)
    clearWords.push(grow(logoRect(at.logo), Math.max(at.logo.clear, 8 * u)));
  if (at.page)
    clearWords.push(grow(at.page.box, 8 * u));
  if (under) {
    ctx.fillStyle = C.bg;
    if (!d.bare)
      ctx.fillRect(0, 0, W, H);
  }
  const reef = pics.get("reef");
  if (d.reef && reef && !hidden(d, "reef")) {
    if (under)
      drawReef(ctx, d, reef, W, H, C.bg, px2);
    const ink = reefInk(d, reef, W, H);
    layers.push({ id: "reef", kind: "art", box: union(ink), ink, bleeds: true, can: canOf(d, "reef") });
  }
  if (d.pattern !== "none" && !hidden(d, "pattern")) {
    const alpha = Math.min(1, C.tileAlpha * (d.tileStrength / 100));
    const ring = d.frame === "none" ? 0 : d.frameWidth * u;
    const r = d.pattern === "full" ? { x: ring + 14 * u, y: ring + 12 * u, w: W - 2 * ring - 28 * u, h: H - 2 * ring - 24 * u } : d.panel;
    const inner = d.pattern === "full" ? r : { x: r.x + 10 * u, y: Math.max(r.y, 0) + 8 * u, w: r.w - 20 * u, h: Math.min(r.y + r.h, H) - Math.max(r.y, 0) - 16 * u };
    ctx.save();
    ctx.fillStyle = C.tile;
    ctx.globalAlpha = alpha;
    const words2 = under ? tileWords(ctx, inner, d.tileSize, u, d.tileStagger, clearWords) : [];
    ctx.restore();
    if (d.pattern === "panel" && d.panelBorder && under) {
      ctx.strokeStyle = C.border;
      ctx.lineWidth = Math.max(1, u);
      ctx.beginPath();
      ctx.rect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      ctx.stroke();
    }
    layers.push({ id: "pattern", kind: "panel", box: d.pattern === "full" ? r : d.panel, ink: d.pattern === "full" ? words2 : [{ x: r.x, y: Math.max(0, r.y), w: r.w, h: Math.min(H, r.y + r.h) - Math.max(0, r.y) }], bleeds: d.pattern === "panel", can: canOf(d, "pattern") });
  }
  if (d.outline && !hidden(d, "band")) {
    const bh = d.outlineSize * u;
    const k = bh / WM().h;
    const bw = WM().w * k;
    const gap = bh * 0.12;
    const bottom = d.outlineY * H - 0.9 * u;
    const t0 = bottom - bh;
    const oc = C.line;
    const l = d.hatch === "sides" && !hidden(d, "hatch") ? d.sideWidth * u : 0;
    if (under) {
      if (d.outlineFloor > 0) {
        ctx.strokeStyle = oc;
        ctx.lineWidth = Math.max(0.5, u);
        hatchLines(ctx, { x: 0, y: d.outlineFloor, w: W, h: H - d.outlineFloor }, d.hatchGap * u, 45);
        ctx.fillStyle = oc;
        ctx.fillRect(0, d.outlineFloor, W, Math.max(0.5, u));
      }
      if (d.outlineRule) {
        ctx.fillStyle = oc;
        ctx.fillRect(0, t0 + WM().xTop * k, W, Math.max(0.5, u));
      }
      let x0 = W / 2 - bw / 2 + d.outlineShift * (bw + gap);
      while (x0 > l - bw)
        x0 -= bw + gap;
      for (let x = x0; x < W - l; x += bw + gap) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(l, 0, W - 2 * l, H);
        ctx.clip();
        ctx.translate(x, t0);
        ctx.scale(k, k);
        const grad = (color) => {
          const g = ctx.createLinearGradient((l - x) / k, 0, (W - l - x) / k, 0);
          bandStops(g, color);
          return g;
        };
        ctx.fillStyle = grad(C.bg);
        ctx.fill(wordmarkPath());
        ctx.strokeStyle = grad(oc);
        ctx.lineWidth = 1.3 * u / k;
        ctx.stroke(wordmarkPath());
        ctx.restore();
      }
    }
    const rule = t0 + WM().xTop * k;
    layers.push({ id: "band", kind: "art", box: { x: 0, y: rule, w: W, h: H - rule }, bleeds: true, can: canOf(d, "band") });
  }
  if (d.hatch !== "none" && !hidden(d, "hatch")) {
    const g = d.hatchGap * u;
    const hc = C.line;
    const lw = Math.max(0.5, u);
    const ink = [];
    ctx.strokeStyle = hc;
    ctx.lineWidth = lw;
    if (d.hatch === "floor" || d.hatch === "both") {
      const hy = d.hatchY * H;
      if (under) {
        ctx.fillStyle = C.bg;
        if (!d.bare)
          ctx.fillRect(0, hy, W, H - hy);
        hatchLines(ctx, { x: 0, y: hy, w: W, h: H - hy }, g, 45, d.hatchMirror);
        ctx.fillStyle = hc;
        ctx.fillRect(0, hy, W, lw);
      }
      ink.push({ x: 0, y: hy, w: W, h: H - hy });
    }
    if (d.hatch === "sides" || d.hatch === "both") {
      const sw = d.sideWidth * u;
      if (under) {
        ctx.fillStyle = C.bg;
        ctx.fillRect(0, 0, sw, H);
        ctx.fillRect(W - sw, 0, sw, H);
        ctx.strokeStyle = hc;
        hatchLines(ctx, { x: 0, y: 0, w: sw, h: H }, g, 45);
        hatchLines(ctx, { x: W - sw, y: 0, w: sw, h: H }, g, 45, true);
        ctx.fillStyle = hc;
        ctx.fillRect(sw - lw, 0, lw, H);
        ctx.fillRect(W - sw, 0, lw, H);
      }
      ink.push({ x: 0, y: 0, w: sw, h: H }, { x: W - sw, y: 0, w: sw, h: H });
    }
    layers.push({ id: "hatch", kind: "art", box: union(ink), ink, bleeds: true, can: canOf(d, "hatch") });
  }
  if (d.guides && !hidden(d, "guides")) {
    const gi = d.guideInset * u;
    const gw = Math.max(0.5, u);
    if (under) {
      ctx.fillStyle = C.line;
      ctx.fillRect(gi, 0, gw, H);
      ctx.fillRect(W - gi - gw, 0, gw, H);
    }
    const ink = [{ x: gi, y: 0, w: gw, h: H }, { x: W - gi - gw, y: 0, w: gw, h: H }];
    layers.push({ id: "guides", kind: "art", box: union(ink), ink, bleeds: true, can: canOf(d, "guides") });
  }
  if (d.frame !== "none" && !hidden(d, "frame")) {
    if (under)
      drawFrame(ctx, d, u, W, H, C.bg);
    const fw = d.frameWidth * u;
    const ink = [{ x: 0, y: 0, w: W, h: fw }, { x: 0, y: H - fw, w: W, h: fw }, { x: 0, y: 0, w: fw, h: H }, { x: W - fw, y: 0, w: fw, h: H }];
    layers.push({ id: "frame", kind: "panel", box: { x: 0, y: 0, w: W, h: H }, ink, bleeds: true, can: canOf(d, "frame") });
  }
  const boxes = [];
  const item = (s, i) => {
    const cy = s.y * H + (s.onWindow && at.winTop !== null ? at.winTop : 0);
    layer(ctx, `sticker:${i}`, s.x * W, cy, () => void drawItem(ctx, s, pics.get(s.src), S, W, H, at.winTop, svg));
  };
  let win = null;
  let fade = null;
  if (at.winTop !== null && d.window !== "none" && !hidden(d, "window")) {
    const box = windowBox(d, pics, at.winTop);
    fade = windowFade(d, u, box);
    win = fade ? { x: box.x, y: box.y, w: box.w, h: Math.min(box.h, fade.to - box.y) } : { x: box.x, y: box.y, w: box.w, h: box.h };
    if (phase === "all" || phase === "window")
      layer(ctx, "window", d.winX * W, box.y + box.h / 2, () => {
        if (!fade || svg)
          return drawWindow(ctx, d, u, pics, icons, fonts2, C.line, box, svg);
        const off = scratch(W * px2, H * px2);
        off.ctx.setTransform(px2, 0, 0, px2, 0, 0);
        drawWindow(off.ctx, d, u, pics, icons, fonts2, C.line, box);
        off.ctx.globalCompositeOperation = "destination-in";
        const g = off.ctx.createLinearGradient(0, fade.from, 0, fade.to);
        g.addColorStop(0, "rgba(0, 0, 0, 1)");
        g.addColorStop(1, "rgba(0, 0, 0, 0)");
        off.ctx.fillStyle = g;
        off.ctx.fillRect(0, 0, W, H);
        ctx.drawImage(off.canvas, 0, 0, W, H);
      });
    layers.push({ id: "window", kind: "picture", box: win, over: ["reef", "guides", "frame", "hatch", "pattern"], can: canOf(d, "window") });
  }
  const behind = ["pattern", "frame", "window"];
  const words = [];
  const sink = top ? ctx : null;
  if (at.placed) {
    if (sink)
      drawWords(sink, d, at.placed, C, fonts2, words);
    else
      drawWords(scratch(1, 1).ctx, d, at.placed, C, fonts2, words);
  }
  for (const w of words)
    layers.push({ ...w, over: ["frame", ...d.pattern === "full" ? ["pattern"] : [], ...d.guides ? ["guides"] : []] });
  if (at.logo) {
    const b = at.logo;
    if (top)
      layer(ctx, "lockup", b.x + b.w / 2, b.top + b.h / 2, () => drawLockup(ctx, d, b, C.ink, pics, fonts2));
    layers.push({ id: "logo", kind: "logo", box: logoRect(b), over: ["frame", ...d.pattern === "full" ? ["pattern"] : []], logo: { clear: b.clear, min: logoDoc().clear.min * u * Math.min(1, frameFor(d).F.h / (500 * u)) }, can: canOf(d, "logo") });
    if (b.partner)
      layers.push({ id: "partner", kind: "text", box: { x: b.x + b.lw + b.gap * 2 + b.times, y: b.top, w: b.pw, h: b.h }, over: ["logo", "frame", ...d.pattern === "full" ? ["pattern"] : []], text: { ...said(d, "partner", d.partnerName.trim(), b.partner), size: b.lh * 0.72, color: C.ink, ground: [C.bg], bold: true }, can: {} });
  }
  if (at.corner) {
    const c = at.corner;
    if (top)
      layer(ctx, "badge", c.x + c.w / 2, c.y + c.h / 2, () => drawBadge(ctx, d, c.x, c.y, c.fs, C.ink, C.hi, C.dark, fonts2, false, C.bg));
    layers.push({ ...badgeLayer(d, { x: c.x, y: c.y, w: c.w, h: c.h }, c.fs, C), over: ["frame"] });
  }
  if (at.foot) {
    const f = at.foot;
    if (top)
      layer(ctx, "foot", W / 2, H, () => drawFoot(ctx, d, f, C.ink, fonts2));
    for (const r of f.rects)
      layers.push({ id: r.id, kind: "text", box: r.box, text: { asked: r.text, drawn: r.text, size: f.fs, color: C.ink, ground: [C.bg], own: true }, can: canOf(d, r.id) });
  }
  if (at.page) {
    const p = at.page;
    if (top) {
      ctx.font = `500 ${p.fs}px ${fonts2.mono}`;
      ctx.letterSpacing = "0px";
      ctx.fillStyle = C.ink;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(p.text, p.box.x, p.box.y + p.box.h / 2);
    }
    layers.push({ id: "page", kind: "text", box: p.box, over: ["frame", "hatch", "pattern"], text: { asked: p.text, drawn: p.text, size: p.fs, color: C.ink, ground: [C.bg], own: true }, can: canOf(d, "page") });
  }
  at.stickers.forEach((s, i) => {
    if (top)
      item(s, i);
    const ink = stickerInk(s, W, H, at.winTop);
    boxes.push(ink);
    layers.push({ id: at.stickers.length > 1 && i ? `art-${i + 1}` : "art", kind: "art", box: ink, over: [...behind, "reef", "band", "hatch", "guides"], can: canOf(d, "art") });
  });
  ctx.restore();
  motion = void 0;
  return { layers, text: wordsBox, logo: at.logo ? logoRect(at.logo) : null, window: win, stickers: boxes, size: at.size, fade };
}
function yieldToLogo(ctx, d, u, fonts2) {
  const e = edit(d, "logo");
  if (!e.anchor && !e.dx && !e.dy)
    return d;
  const b = logoBox(ctx, d, u, fonts2);
  if (!b)
    return d;
  const zone = grow(logoRect(b), b.clear + 8 * u);
  let out = { ...d, logoKeep: zone };
  if (d.badgeAt === "corner" && d.badgeText.trim()) {
    const { w: W, h: H } = frameOf(d);
    const fs = Math.max(floorsOf(d).small, 19 * u * (d.badgeScale / 100));
    const m = drawBadge(ctx, d, 0, 0, fs, "#000000", "", false, fonts2, true, "#FFFFFF");
    if (inter({ x: d.badgeX * W - m.w, y: d.badgeY * H - m.h / 2, w: m.w, h: m.h }, zone))
      out = { ...out, badgeAt: "words", badgeScale: 100 };
  }
  return out;
}
function placedBox(d, p) {
  const n = nudge(d, "headline");
  return { x: leftOf(p, p.block.w) + n.x, y: p.y + n.y, w: p.block.w, h: p.block.h };
}

// dist/assets/image.js
import { existsSync as existsSync3, readFileSync as readFileSync6 } from "node:fs";
import { isAbsolute as isAbsolute2, resolve as resolve3 } from "node:path";
import { loadImage as loadImage2 } from "@napi-rs/canvas";

// dist/assets/glyphs.js
import { readFileSync as readFileSync5 } from "node:fs";
var maps = /* @__PURE__ */ new Map();
function cmap(file) {
  const hit = maps.get(file);
  if (hit)
    return hit;
  const b = readFileSync5(pkgPath("brand", "fonts", file));
  const out = /* @__PURE__ */ new Set();
  const n = b.readUInt16BE(4);
  for (let i = 0; i < n; i++) {
    const rec = 12 + i * 16;
    if (b.toString("latin1", rec, rec + 4) !== "cmap")
      continue;
    const base = b.readUInt32BE(rec + 8);
    const tables = b.readUInt16BE(base + 2);
    for (let t = 0; t < tables; t++) {
      const at = base + b.readUInt32BE(base + 4 + t * 8 + 4);
      const format = b.readUInt16BE(at);
      if (format === 4) {
        const segs = b.readUInt16BE(at + 6) / 2;
        for (let s = 0; s < segs; s++) {
          const end = b.readUInt16BE(at + 14 + s * 2);
          const start = b.readUInt16BE(at + 16 + segs * 2 + s * 2);
          const delta = b.readUInt16BE(at + 16 + segs * 4 + s * 2);
          const ro = at + 16 + segs * 6 + s * 2;
          const off = b.readUInt16BE(ro);
          for (let c = start; c <= end && c < 65535; c++) {
            const g = off ? b.readUInt16BE(ro + off + (c - start) * 2) : c + delta & 65535;
            if (g)
              out.add(c);
          }
        }
      } else if (format === 12) {
        const groups = b.readUInt32BE(at + 12);
        for (let g = 0; g < groups; g++)
          for (let c = b.readUInt32BE(at + 16 + g * 12); c <= b.readUInt32BE(at + 20 + g * 12); c++)
            out.add(c);
      }
    }
  }
  maps.set(file, out);
  return out;
}
var doc;
function missing(text, face = "sans") {
  doc ??= JSON.parse(readFileSync5(pkgPath("brand", "fonts", "fonts.json"), "utf8"));
  const sets = Object.values(doc[face].files).map(cmap);
  const out = [];
  for (const ch of text) {
    const c = ch.codePointAt(0);
    if (c === 9 || c === 10 || c === 13 || c === 8203 || c === 65039 || c === 65038)
      continue;
    if (!sets.every((s) => s.has(c)) && !out.includes(ch))
      out.push(ch);
  }
  return out;
}
function drawable(slot, text, face = "sans") {
  if (!text)
    return;
  const gone = missing(text, face);
  if (gone.length)
    throw new Error(`${doc[face].family} (the brand's face) has no character for ${gone.slice(0, 6).map((c) => `"${c}"`).join(", ")}${gone.length > 6 ? ` and ${gone.length - 6} more` : ""} in the ${slot}. Take ${gone.length === 1 ? "it" : "them"} out, or write it in Latin, Cyrillic, Greek or Vietnamese letters.`);
}

// dist/assets/io.js
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname as dirname2, isAbsolute, relative } from "node:path";
var normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length];
}
function suggest(typed, pool, max = 3) {
  const t = normalize(typed);
  return [...new Set(pool)].map((name) => {
    const n = normalize(name);
    return { name, d: n && (n.includes(t) || t.includes(n)) ? Math.abs(n.length - t.length) * 0.3 : distance(t, n) };
  }).filter((s) => s.d <= Math.max(2, t.length * 0.4)).sort((a, b) => a.d - b.d || a.name.length - b.name.length).slice(0, max).map((s) => s.name);
}
function unknown(what, typed, pool) {
  const near = suggest(typed, pool);
  return new Error(`Unknown ${what} \`${typed}\`.${near.length ? ` Did you mean ${near.map((n) => `\`${n}\``).join(" or ")}?` : ""} Choose from: ${pool.join(", ")}.`);
}
function pick(what, typed, pool) {
  const hit = pool.find((p) => p.toLowerCase() === typed.trim().toLowerCase());
  if (!hit)
    throw unknown(what, typed, [...pool]);
  return hit;
}
function num(name, value, min, max, opts = {}) {
  if (value === void 0 || value === null || value === "")
    return void 0;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || opts.integer && !Number.isInteger(n))
    throw new Error(`--${name} takes a ${opts.integer ? "whole " : ""}number, not \`${String(value)}\`.`);
  if (n < min || n > max)
    throw new Error(`--${name} takes ${min} to ${max}, not ${n}.`);
  return n;
}
function write(path, data) {
  mkdirSync(dirname2(path), { recursive: true });
  writeFileSync(path, data);
}
function display(cwd, path) {
  const rel = relative(cwd, path);
  return !rel || rel.startsWith("..") || isAbsolute(rel) ? path : rel;
}

// dist/assets/image.js
var occasionNames = () => Object.keys(imageDoc().occasions);
function imageSizes() {
  const doc6 = imageDoc();
  const groupOf = (id) => Object.entries(doc6.groups).find(([, g]) => g.sizes.includes(id))?.[0] ?? "post";
  return Object.entries(doc6.sizes).map(([id, s]) => ({ id, group: groupOf(id), label: s.label, width: s.w, height: s.h, aliases: s.aliases }));
}
function sizeId(typed) {
  const t = typed.trim().toLowerCase();
  if (t === "custom")
    return "custom";
  const own = imageSizes();
  const hit = own.find((s) => s.id === t || s.aliases.includes(t)) ?? own.find((s) => s.id === sizeAlias(t));
  if (!hit)
    throw unknown("size", typed, [...imageSizes().map((s) => s.id), "custom"]);
  return hit.id;
}
function emphasise(s) {
  if (s.includes("*"))
    return s;
  const money = s.match(/\$\d[\d,.]*[kKmMbB]?/);
  if (money && money.index !== void 0)
    return `${s.slice(0, money.index)}*${money[0]}*${s.slice(money.index + money[0].length)}`;
  const quoted = s.match(/[“"]([^”"]{2,48})[”"]/);
  if (quoted && quoted.index !== void 0)
    return `${s.slice(0, quoted.index)}*${quoted[1]}*${s.slice(quoted.index + quoted[0].length)}`;
  const lines = s.split("\n");
  const last = lines[lines.length - 1];
  const words = last.trim().split(/\s+/);
  if (words.length >= 3) {
    const n = words.length > 8 ? 3 : 2;
    lines[lines.length - 1] = `${words.slice(0, -n).join(" ")} *${words.slice(-n).join(" ")}*`;
    return lines.join("\n");
  }
  return s;
}
function badgeOf(req) {
  const styled = req.badge !== void 0 && BADGES.find((b) => b === req.badge.trim().toLowerCase());
  if (styled)
    return { text: req.badgeText, style: req.badgeStyle ? pick("badge style", req.badgeStyle, BADGES) : styled };
  const text = req.badgeText ?? req.badge;
  return { text: text?.trim() ? text : void 0, style: req.badgeStyle ? pick("badge style", req.badgeStyle, BADGES) : void 0 };
}
var given = (s) => s !== void 0 && s.trim() ? s.replace(/\\n/g, "\n").replace(/\r/g, "") : "";
function designOf(req) {
  const doc6 = imageDoc();
  let template;
  let occasion;
  if (req.occasion)
    occasion = pick("occasion", req.occasion, occasionNames());
  if (req.template) {
    const t = req.template.trim().toLowerCase();
    if (TEMPLATES.includes(t))
      template = t;
    else if (occasionNames().includes(t))
      occasion ??= t;
    else
      throw unknown("template or occasion", req.template, [...TEMPLATES, ...occasionNames()]);
  }
  if (!occasion && template && doc6.templateOccasion[template])
    occasion = doc6.templateOccasion[template];
  const occ = occasion ? doc6.occasions[occasion] : void 0;
  if (!template) {
    const pool = occ ? occ.looks.map((l) => l.template) : TEMPLATES.filter((t) => t !== "mark");
    template = req.seed !== void 0 ? pool[Math.floor(mulberry(req.seed)() * pool.length)] : occ ? pool[0] : "tile";
  }
  const theme = req.theme ? pick("theme", req.theme, themeNames()) : occ?.looks.find((l) => l.template === template)?.theme ?? occ?.looks[0]?.theme ?? "paper";
  const size = req.size ? sizeId(req.size) : "og";
  if (size === "custom" && (!req.width || !req.height))
    throw new Error("A custom size needs --width and --height (50 to 4000).");
  if (size !== "custom" && (req.width || req.height))
    throw new Error(`--width and --height go with --size custom, not ${size}.`);
  const known = doc6.sizes[size];
  const w = known?.w ?? clampDim(req.width);
  const h = known?.h ?? clampDim(req.height);
  const at = { size, w, h };
  if (isCircle(size) && template !== "mark")
    throw new Error(`A profile picture (${size}) is cropped to a circle and draws no words: use the mark template.`);
  const look = occ?.looks.find((l) => l.template === template && l.theme === theme) ?? occ?.looks.find((l) => l.template === template);
  const style = { ...occ?.style ?? {}, ...look?.style ?? {} };
  const sample = req.sample ? { ...(occ ?? doc6.occasions.launch).sample, ...look?.sample ?? {} } : {};
  const b = badgeOf(req);
  let d = {
    ...designStart(),
    theme,
    reefFade: themes()[theme].reefFade,
    ...layoutFor(template, at, req.seed),
    template,
    size,
    w,
    h,
    name: template,
    edits: req.edits ?? {},
    sample: !!req.sample
  };
  if (style.badge && template !== "card")
    d.badge = style.badge;
  if (style.highlight)
    d.highlight = style.highlight;
  d.headline = given(req.headline);
  if (d.headline && req.emphasise !== false)
    d.headline = emphasise(d.headline);
  d.body = given(req.body);
  d.credit = given(req.credit);
  d.badgeText = given(b.text);
  d.partnerName = given(req.partner);
  d.page = given(req.page);
  if (req.textCap)
    d.textCap = req.textCap;
  if (req.sample && template !== "mark") {
    d.headline ||= sample.headline ?? "";
    d.body ||= req.body === void 0 ? sample.body ?? "" : "";
    d.badgeText ||= sample.badgeText ?? "";
    if (template === "partner")
      d.partnerName ||= sample.partnerName ?? "Acme";
  }
  if (b.style)
    d.badge = b.style;
  if (b.style === "none" && b.text?.trim())
    throw new Error("--badge none draws no badge, so it takes no words: leave one of them out.");
  if (req.highlight)
    d.highlight = pick("highlight", req.highlight, highlightNames());
  if (d.partnerName || d.edits.logo && !d.edits.logo.hidden)
    d.logo = d.logo || !isCircle(size);
  d.asked = Object.fromEntries([["headline", req.headline], ["body", req.body], ["credit", req.credit], ["badge", b.text], ["partner", req.partner]].flatMap(([k, v]) => v?.trim() ? [[k, v]] : []));
  if (d.wordless) {
    for (const [k, v] of [["headline", d.headline], ["body", d.body], ["credit", d.credit], ["badge", d.badgeText]])
      if (v)
        throw new Error(`The ${template} template draws no words, so it takes no ${k}. Templates with words: ${TEMPLATES.filter((t) => t !== "mark").join(", ")}.`);
    if (isCircle(size) && d.partnerName)
      throw new Error("A profile picture has no room for a partner.");
  }
  for (const [slot, v] of [["headline", d.headline], ["body", d.body], ["credit", d.credit], ["partner", d.partnerName]])
    drawable(slot, v);
  drawable("badge", d.badgeText, d.badgeFont === "mono" ? "mono" : "sans");
  drawable("page", d.page, "mono");
  const windowed = () => TEMPLATES.filter((t) => layoutFor(t, at).window && layoutFor(t, at).window !== "none").join(", ");
  if (req.picture) {
    if (d.window === "none")
      throw new Error(`The ${d.template} template has no window for a picture. Templates with one: ${windowed()}.`);
    d = { ...d, window: "picture", winChrome: true, winRatio: 0 };
  }
  if (req.pictureUrl !== void 0) {
    if (d.window === "none")
      throw new Error(`The ${d.template} template has no window for an address. Templates with one: ${windowed()}.`);
    drawable("address", req.pictureUrl);
    d = { ...d, winUrl: req.pictureUrl, winChrome: true };
  } else if (req.picture)
    d.winUrl = "";
  if (req.console) {
    const c = pick("console", req.console, ["inbox", "blank"]);
    if (d.window !== "app")
      throw new Error(`--console goes with the console's window: ${windowed()} without --image.`);
    d.app = { ...d.app, blank: c === "blank" };
  }
  return d;
}
async function readPicture(cwd, file) {
  const path = isAbsolute2(file) ? file : resolve3(cwd, file);
  if (!existsSync3(path))
    throw new Error(`No picture at ${file}.`);
  try {
    return await loadImage2(readFileSync6(path));
  } catch (err) {
    throw new Error(`Could not read ${file} as a picture (${err.message}). Pass a PNG, JPEG, WebP, GIF or SVG.`);
  }
}
async function picturesFor(picture) {
  const map = /* @__PURE__ */ new Map();
  for (const id of ["sit", "hang", "reef"])
    map.set(id, await artImage(id));
  if (picture)
    map.set("picture", picture);
  return map;
}
async function svgPictures(pics, longest) {
  const out = /* @__PURE__ */ new Map();
  for (const [k, im] of pics) {
    const max = Math.min(Math.round(longest * 0.5), 640);
    if (k === "reef" || im.width <= max) {
      out.set(k, im);
      continue;
    }
    const h = Math.round(im.height * max / im.width);
    const c = scratch(max, h);
    c.ctx.drawImage(im, 0, 0, max, h);
    out.set(k, await loadImage2(c.canvas.toBuffer("image/png")));
  }
  return out;
}
async function measureDesign(d, pics) {
  return drawDesign(scratch(4, 4).ctx, d, pics, await loadIcons(), brandFonts(), 1, false, void 0, "none");
}
async function designSvg(d0, pics, reef = "") {
  const L = frameOf(d0);
  const d = reef ? { ...d0, bare: true } : d0;
  const icons = await loadIcons();
  const fonts2 = brandFonts();
  const small = await svgPictures(pics, Math.max(L.w, L.h));
  const part = (phase, n) => {
    const s = surface(L.w, L.h, { svg: true });
    const drawn = drawDesign(s.ctx, d, small, icons, fonts2, 2, true, void 0, phase);
    const svg = toSvg(s);
    return { drawn, svg, inner: svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").replace(/(id="|url\(#|href="#)([a-z]+_\d+)/g, `$1${n}$2`) };
  };
  const { fade } = drawDesign(scratch(4, 4).ctx, d, small, icons, fonts2, 1, false, void 0, "none");
  if (!fade && !reef)
    return part("all", "").svg;
  const r23 = (n) => String(Math.round(n * 100) / 100);
  const open = `<?xml version="1.0" encoding="utf-8" ?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${L.w}" height="${L.h}" viewBox="0 0 ${L.w} ${L.h}">${reef ? `<rect width="${L.w}" height="${L.h}" fill="${themes()[d.theme].bg}"/>` : ""}`;
  if (!fade)
    return `${open}${reef}${part("all", "").inner}</svg>
`;
  const mask = `<defs><linearGradient id="fade" gradientUnits="userSpaceOnUse" x1="0" y1="${r23(fade.from)}" x2="0" y2="${r23(fade.to)}"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient><mask id="window-fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${L.w}" height="${L.h}"><rect width="${L.w}" height="${L.h}" fill="url(#fade)"/></mask></defs>`;
  return `${open}${mask}${reef}${part("under", "a").inner}<g mask="url(#window-fade)">${part("window", "b").inner}</g>${part("over", "c").inner}</svg>
`;
}
async function renderDesign(d, pics, opts = { png: true }) {
  const L = frameOf(d);
  const icons = await loadIcons();
  const fonts2 = brandFonts();
  const scale = opts.scale ?? 1;
  let drawn;
  const out = { width: Math.round(L.w * scale), height: Math.round(L.h * scale) };
  if (opts.png !== false || opts.jpg || opts.webp) {
    const s = surface(L.w, L.h, { scale });
    drawn = drawDesign(s.ctx, d, pics, icons, fonts2, scale);
    if (opts.png !== false)
      out.png = toPng(s);
    if (opts.jpg)
      out.jpg = toJpg(s);
    if (opts.webp)
      out.webp = toWebp(s);
  } else
    drawn = await measureDesign(d, pics);
  if (opts.svg)
    out.svg = await designSvg(d, pics);
  out.drawn = drawn;
  out.layers = drawn.layers;
  return out;
}
async function carouselDesigns(slides, pics) {
  const reqs = slides.map((s, i) => ({ ...s, page: s.page ?? `${i + 1}/${slides.length}` }));
  const sizes = [];
  for (const [i, r] of reqs.entries())
    if (r.headline?.trim())
      sizes.push((await measureDesign(designOf(r), await pics(i))).size);
  const cap = sizes.length ? Math.min(...sizes) : void 0;
  return reqs.map((r) => designOf({ ...r, textCap: cap }));
}
function imageCatalog() {
  const doc6 = imageDoc();
  return {
    templates: TEMPLATES.map((id) => ({ id, name: doc6.templates[id].label, description: doc6.templates[id].description, window: (layoutFor(id, { size: "og", w: 1200, h: 630 }).window ?? "none") !== "none", words: id !== "mark" })),
    occasions: occasionNames().map((id) => ({ id, name: doc6.occasions[id].label, sample: doc6.occasions[id].sample, looks: doc6.occasions[id].looks.map((l) => ({ template: l.template, theme: l.theme, label: l.label })) })),
    groups: Object.entries(doc6.groups).map(([id, g]) => ({ id, label: g.label, sizes: g.sizes })),
    sizes: [...imageSizes(), { id: "custom", group: "post", label: "Custom", width: 0, height: 0, aliases: [], note: "--width and --height, 50 to 4000" }],
    safeAreas: PLATFORMS.filter((p) => p.avoid.length || p.safe).map((p) => ({ size: p.id, avoid: p.avoid, safe: p.safe, source: p.source, note: p.note })),
    themes: Object.entries(doc6.themes).map(([id, t]) => ({ id, label: t.label, dark: t.dark, bg: t.bg, ink: t.ink })),
    highlights: Object.entries(doc6.highlights).map(([id, h]) => ({ id, label: h.label, color: h.color || null, on: h.on ?? {} })),
    badges: BADGES,
    slots: ["headline", "body", "credit", "badge", "partner"],
    formats: ["png", "svg", "jpg", "webp"],
    picture: "image: a PNG, JPEG, WebP, GIF or SVG shown in the window (app and feature templates only)",
    console: ["inbox", "blank"],
    copy: "Only the words that are passed are drawn, whole: text shrinks to a readable size and wraps, and copy that still does not fit is an error. --sample fills the words that were not passed with sample copy.",
    seed: "A variation of the named template (its sides, the band's start, where the octopus is), or with no template named, a template too: an integer from 1 to 1000000000; the same seed always rebuilds the same layout.",
    notes: doc6.notes
  };
}

// dist/assets/deck.js
import { readFileSync as readFileSync8 } from "node:fs";
import { Path2D as Path2D4 } from "@napi-rs/canvas";

// dist/assets/text.js
function setFont(ctx, s) {
  ctx.font = `${s.weight} ${s.size}px ${s.family}`;
  ctx.letterSpacing = `${(s.tracking ?? 0) * s.size}px`;
}
function wrap(ctx, text, max) {
  const out = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (line && ctx.measureText(next).width > max) {
        out.push(line);
        line = w;
      } else
        line = next;
    }
    out.push(line);
  }
  return out;
}
function fit2(ctx, text, style, max, maxLines = 99, minScale = 0.5, what = "text") {
  const value = style.caps ? text.toUpperCase() : text;
  for (let size = style.size; size >= style.size * minScale - 0.01; size -= Math.max(0.5, style.size / 40)) {
    setFont(ctx, { ...style, size });
    const lines = wrap(ctx, value, max);
    const widths = lines.map((l) => ctx.measureText(l).width);
    if (lines.length <= maxLines && widths.every((w) => w <= max + 0.5)) {
      ctx.letterSpacing = "0px";
      return { lines, size, widths, width: Math.max(0, ...widths), height: lines.length * size * (style.leading ?? 1.2), style: { ...style, size } };
    }
  }
  ctx.letterSpacing = "0px";
  throw new Error(`The ${what} is too long for this layout: it needs more than ${maxLines} line${maxLines === 1 ? "" : "s"} at ${Math.round(style.size * minScale)}px in ${Math.round(max)}px. Shorten it.`);
}
function drawFitted(ctx, f, x, top, width = f.width) {
  const s = f.style;
  const lh = s.size * (s.leading ?? 1.2);
  setFont(ctx, s);
  ctx.fillStyle = s.color ?? "#000000";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  f.lines.forEach((l, i) => {
    const w = f.widths[i];
    const lx = s.align === "center" ? x + (width - w) / 2 : s.align === "right" ? x + width - w : x;
    ctx.fillText(l, lx, top + i * lh + s.size * 0.92);
  });
  ctx.letterSpacing = "0px";
  const left = s.align === "center" ? x + (width - f.width) / 2 : s.align === "right" ? x + width - f.width : x;
  return { x: left, y: top, w: f.width, h: f.lines.length * lh };
}

// dist/design/run.js
var BOOLEAN = /* @__PURE__ */ new Set(["json", "force", "help", "dry-run", "sample", "front", "back"]);
var FLAGS = ["variants", "template", "size", "theme", "width", "height", "seed", "set", "option", "image", "layer", "hide", "show", "reset", "allow", "out", "format", "scale", "by", "count", "to", "steps", "replace", "at", "place", "id", "grid", "flavor", ...BOOLEAN];

// dist/assets/icons.js
import { readdirSync, readFileSync as readFileSync7 } from "node:fs";
function glyphs() {
  const dir = pkgPath("brand", "assets", "icons");
  return readdirSync(dir).filter((f) => f.endsWith(".svg") && f !== "apple-logo.svg").sort().map((f) => ({ name: f.replace(/\.svg$/, ""), svg: readFileSync7(`${dir}/${f}`, "utf8") }));
}

// dist/assets/compose.js
import { Path2D as Path2D3 } from "@napi-rs/canvas";
var TEXT = { scale: [0.5, 1.6], hide: true, align: true };
var PART = { scale: [0.5, 1.6], hide: true };
var DECOR = { hide: true };
var BLOCKS = [
  { type: "headline", names: ["title", "heading"], kind: "text", description: "The headline in Inter SemiBold; *stars* set a phrase in the highlight.", copy: [{ id: "text", required: true }], span: { cols: 12, rows: 3 }, place: "top", sample: { text: "Every agent gets *an inbox*" } },
  { type: "body", names: ["subtitle", "text", "paragraph", "credit"], kind: "text", description: "A line or a paragraph.", copy: [{ id: "text", required: true }], span: { cols: 8, rows: 2 }, sample: { text: "Email, phone and calendars for every agent." } },
  { type: "badge", names: ["eyebrow", "chip", "tag", "label", "pill"], kind: "text", description: "The pill badge with its pink dot, or the dot badge.", copy: [{ id: "text", required: true }], options: [{ id: "style", values: ["pill", "dot", "solid"] }], span: { cols: 3, rows: 1 }, place: "top-left", sample: { text: "New" } },
  { type: "logo", names: ["lockup", "wordmark"], kind: "logo", description: "The lockup: the octopus and the wordmark.", copy: [], options: [{ id: "part", values: ["full", "wordmark"] }], span: { cols: 4, rows: 1 }, place: "top-left" },
  { type: "art", names: ["octopus", "mascot", "character"], kind: "art", description: "The octopus, sitting or hanging (the brand's own art, never redrawn).", copy: [], options: [{ id: "pose", values: ["sit", "hang"] }], span: { cols: 4, rows: 4 }, place: "right" },
  { type: "reef", names: ["seabed", "scene"], kind: "art", description: "The reef along the foot of its cells, faded into the ground on light themes.", copy: [], span: { cols: 12, rows: 4 }, place: "bottom", under: true },
  { type: "tile", names: ["pattern", "wordmark-tile"], kind: "art", description: "The wordmark repeated in rows, whole words only.", copy: [], options: [{ id: "stagger", values: ["true", "false"] }], span: { cols: 5, rows: 12 }, place: "right", under: true },
  { type: "band", names: ["outline", "outline-band"], kind: "art", description: "The wordmark huge and hollow on its rule, one whole word.", copy: [], span: { cols: 12, rows: 3 }, place: "bottom", under: true },
  { type: "hatch", names: ["hatching", "floor"], kind: "art", description: "45 degree hairlines under a rule.", copy: [], span: { cols: 12, rows: 3 }, place: "bottom", under: true },
  { type: "window", names: ["console", "screenshot", "picture", "image", "product"], kind: "picture", description: "The console in a window (Acme placeholder mail), or your capture.", copy: [], image: { values: ["none"] }, span: { cols: 10, rows: 7 }, place: "bottom" },
  { type: "card", names: ["feature", "panel"], kind: "panel", description: "A white card (24 px corners, Shadow/S) with a heading and a line.", copy: [{ id: "heading", required: true }, { id: "text" }], sample: { heading: "Email", text: "Every agent gets an address." }, span: { cols: 6, rows: 3 } },
  { type: "stat", names: ["number", "metric", "figure"], kind: "text", description: "A big number in the highlight, with a line under it.", copy: [{ id: "value", required: true }, { id: "label" }], sample: { value: "42%", label: "less time on setup" }, span: { cols: 5, rows: 4 } },
  { type: "quote", names: ["testimonial"], kind: "text", description: "A quote in the headline face with who said it (a role at Acme, never a made-up person).", copy: [{ id: "text", required: true }, { id: "attribution" }], sample: { text: "Our agent answers its own email now.", attribution: "Head of operations, Acme" }, span: { cols: 10, rows: 5 } },
  { type: "list", names: ["bullets", "points", "checklist"], kind: "text", description: "Points with | between, each led by the filled check circle.", copy: [{ id: "items", required: true }], sample: { items: "An email address | A phone number | An Agent Card" }, span: { cols: 6, rows: 5 } },
  { type: "button", names: ["cta"], kind: "text", description: "The purple pill button.", copy: [{ id: "text", required: true }], span: { cols: 3, rows: 1 }, place: "bottom-left", sample: { text: "Get started" } },
  { type: "search", names: ["search-bar", "input", "field"], kind: "text", description: "A 40 px field with its lilac-gray edge and the magnifier.", copy: [{ id: "text", required: true }], span: { cols: 8, rows: 1 }, place: "center", sample: { text: "Search messages" } },
  { type: "chart", names: ["graph"], kind: "text", description: 'A bar, line or donut chart from "label value | label value", in the chart-series colors.', copy: [{ id: "data", required: true }, { id: "title" }], options: [{ id: "kind", values: ["bar", "line", "donut"] }], sample: { data: "Email 42 | Phone 31 | Cards 27", title: "Messages by channel" }, span: { cols: 6, rows: 6 } },
  { type: "flow", names: ["diagram", "steps", "process", "architecture"], kind: "text", description: `Steps in boxes joined by arrows, from "step | step | step": across in wide cells, down in tall ones (built from the card's edge and the line color).`, copy: [{ id: "steps", required: true }], sample: { steps: "Message in | Agent reads | Agent replies" }, span: { cols: 12, rows: 3 } },
  { type: "divider", names: ["rule", "line"], kind: "art", description: "A hairline in the theme's line color.", copy: [], span: { cols: 12, rows: 1 }, place: "center" },
  { type: "icon", names: ["glyph"], kind: "key", description: "One of the console's Phosphor glyphs (MIT), by name.", copy: [], options: [{ id: "name", values: glyphNames() }], span: { cols: 1, rows: 1 } }
];
function glyphNames() {
  try {
    return glyphs().map((g) => g.name);
  } catch {
    return [];
  }
}
var kindOf = (type) => BLOCKS.find((b) => b.type === type)?.kind ?? "text";
async function composePictures(doc6, read) {
  const pictures = {};
  for (const b of doc6.blocks ?? [])
    if (b.type === "window")
      pictures[b.id] = doc6.images[b.id] && doc6.images[b.id] !== "none" ? await read(doc6.images[b.id]) : null;
  return { sit: await artImage("sit"), hang: await artImage("hang"), reef: await artImage("reef"), pictures };
}
function drawCompose(ctx, doc6, pics, icons, fonts2, svg = false) {
  const W = doc6.size.width;
  const H = doc6.size.height;
  const t = themes()[doc6.theme ?? "paper"] ?? themes().paper;
  const hi = highlightColor("pink", doc6.theme ?? "paper") || t.ink;
  const u = Math.sqrt(W * H / (1200 * 630));
  const floor = floorsOf({ size: doc6.size.id, w: W, h: H }).small;
  const layers = [];
  const e = (id) => doc6.layers[id] ?? {};
  const words = (id, slot) => doc6.copy[`${id}.${slot}`]?.trim() ?? "";
  const tooLong = (id) => new Error(`The ${id} is too long for its cells. Shorten it, or give it more cells (make it wider or taller).`);
  ctx.save();
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);
  const placed = blockRects(doc6).filter((b) => !e(b.block.id).hidden);
  const keep = placed.filter((b) => kindOf(b.block.type) !== "art" && b.block.type !== "window").map((b) => ({ x: b.rect.x - 8 * u, y: b.rect.y - 8 * u, w: b.rect.w + 16 * u, h: b.rect.h + 16 * u }));
  const fitText = (id, text, face, from, r, least = floor) => {
    drawable(id, text, face.family === fonts2.mono ? "mono" : "sans");
    const plain = text.replace(/\*/g, "");
    const tryAt = (size) => {
      setFont(ctx, { family: face.family, weight: face.weight, size, tracking: face.tracking ?? 0 });
      const lines = wrap(ctx, plain, r.w);
      const widths = lines.map((l) => ctx.measureText(l).width);
      ctx.letterSpacing = "0px";
      const h = lines.length * size * face.leading;
      if (widths.some((x) => x > r.w + 0.5) || h + size * Math.max(0, 1.18 - face.leading) > r.h + 0.5)
        return null;
      return { lines, widths, size, face, w: Math.max(0, ...widths), h, asked: text };
    };
    let got = null;
    for (let s = Math.max(from, least); s >= least - 0.01; s *= 0.96)
      if (got = tryAt(s))
        break;
    if (!got)
      throw tooLong(id);
    const k = e(id).scale ?? 1;
    if (k === 1)
      return got;
    const scaled = tryAt(got.size * k);
    if (!scaled || scaled.size < floor - 0.01)
      throw tooLong(`${id} at that size`);
    return scaled;
  };
  const drawText = (f, r, align, color, top = r.y) => {
    setFont(ctx, { family: f.face.family, weight: f.face.weight, size: f.size, tracking: f.face.tracking ?? 0 });
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    const lit = /* @__PURE__ */ new Set();
    let on = false;
    let n = 0;
    for (const part of f.asked.split("*")) {
      for (const _w of part.split(/\s+/).filter(Boolean)) {
        if (on)
          lit.add(n);
        n++;
      }
      on = !on;
    }
    const ink = [];
    let word2 = 0;
    f.lines.forEach((line, i) => {
      const lw = f.widths[i];
      let x = align === "center" ? r.x + (r.w - lw) / 2 : align === "right" ? r.x + r.w - lw : r.x;
      const base = top + i * f.size * f.face.leading + f.size * 0.92;
      const m = ctx.measureText(line);
      ink.push({ x, y: base - m.actualBoundingBoxAscent, w: lw, h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent });
      for (const w of line.split(" ")) {
        ctx.fillStyle = lit.has(word2) ? hi : color;
        ctx.fillText(w, x, base);
        x += ctx.measureText(`${w} `).width;
        word2++;
      }
    });
    ctx.letterSpacing = "0px";
    return ink;
  };
  const union2 = (rs) => {
    const x = Math.min(...rs.map((q) => q.x));
    const y = Math.min(...rs.map((q) => q.y));
    return { x, y, w: Math.max(...rs.map((q) => q.x + q.w)) - x, h: Math.max(...rs.map((q) => q.y + q.h)) - y };
  };
  const textLayer = (id, f, ink, color, ground, can, extra = {}) => ({
    id,
    kind: "text",
    box: union2(ink),
    ink,
    text: { asked: f.asked, drawn: f.lines.join(" "), size: f.size, color, ground: [ground], ...f.face.weight >= 600 ? { bold: true } : {} },
    can,
    ...extra
  });
  const sans = (weight, leading, tracking = 0) => ({ family: fonts2.sans, weight, leading, tracking });
  const lockupAt = (x, y, h, part) => {
    const L = logoDoc().lockup;
    const k = h / L.h;
    if (part !== "wordmark")
      ctx.drawImage(pics.sit, x, y, L.mark.w * k, L.mark.h * k);
    const wk = part === "wordmark" ? h / logoDoc().wordmark.h : k;
    ctx.save();
    ctx.translate(part === "wordmark" ? x : x + L.word.x * k, part === "wordmark" ? y : y + L.word.y * k);
    ctx.scale(wk, wk);
    ctx.fillStyle = t.ink;
    ctx.fill(wordmarkPath());
    ctx.restore();
  };
  for (const { block, rect: r } of placed) {
    const id = block.id;
    const k = e(id).scale ?? 1;
    switch (block.type) {
      case "headline": {
        const f = fitText(id, words(id, "text"), sans(600, 1.04, -0.01), Math.min(r.h, 96 * u), r, floor * 1.4);
        const ink = drawText(f, r, e(id).align ?? "left", t.ink);
        const litColor = f.asked.includes("*") && contrast(hi, t.bg) < contrast(t.ink, t.bg) ? hi : t.ink;
        layers.push(textLayer(id, f, ink, litColor, t.bg, TEXT));
        break;
      }
      case "body": {
        const f = fitText(id, words(id, "text"), sans(400, 1.4), Math.max(floor, Math.min(30 * u, r.h)), r);
        layers.push(textLayer(id, f, drawText(f, r, e(id).align ?? "left", t.muted), t.muted, t.bg, TEXT));
        break;
      }
      case "badge": {
        const style = String(doc6.options[`${id}.style`] ?? "pill");
        const fs0 = Math.max(floor, Math.min(19 * u, r.h * 0.45));
        const f = fitText(id, words(id, "text"), sans(500, 1), fs0, { ...r, w: r.w - fs0 * 2.6, h: r.h / 1.45 });
        const fs = f.size;
        const h = Math.min(r.h, style === "solid" ? fs * 2.2 : fs * 1.9);
        const w = f.w + (style === "dot" ? fs * 1.2 : fs * 2.4);
        const box = { x: r.x, y: r.y + (r.h - h) / 2, w, h };
        let ground = t.bg;
        let color = t.ink;
        if (style === "pill") {
          ctx.fillStyle = t.pill;
          ctx.strokeStyle = t.dark ? brandColor("pillStrokeDark") : brandColor("pillStroke");
          ctx.lineWidth = Math.max(1, fs * 0.06);
          ctx.beginPath();
          ctx.roundRect(box.x, box.y, w, h, h / 2);
          ctx.fill();
          ctx.stroke();
          ground = over(t.pill, t.bg);
        } else if (style === "solid") {
          ctx.fillStyle = t.ink;
          ctx.beginPath();
          ctx.roundRect(box.x, box.y, w, h, h / 2);
          ctx.fill();
          ground = t.ink;
          color = t.bg;
        }
        const dx = style === "dot" ? 0 : fs * 0.75;
        if (style !== "solid") {
          ctx.fillStyle = brandColor("pink");
          ctx.beginPath();
          ctx.arc(box.x + dx + fs * 0.24, box.y + h / 2, fs * 0.24, 0, Math.PI * 2);
          ctx.fill();
        }
        const tx = box.x + (style === "solid" ? fs * 1.2 : dx + fs * 0.9);
        drawText(f, { x: tx, y: box.y + (h - fs * 1.2) / 2, w: f.w + 1, h: fs * 1.2 }, "left", color, box.y + (h - fs * 1.2) / 2 + fs * 0.06);
        layers.push({ id, kind: "text", box, ink: [box], text: { asked: f.asked, drawn: f.lines.join(" "), size: fs, color, ground: [ground] }, can: PART });
        break;
      }
      case "logo": {
        const part = String(doc6.options[`${id}.part`] ?? "full");
        const ratio = part === "wordmark" ? logoDoc().wordmark.w / logoDoc().wordmark.h : logoDoc().lockup.w / logoDoc().lockup.h;
        const least = logoDoc().clear.min * u * 0.7;
        const clearK = logoDoc().clear.share;
        const h = Math.max(least, Math.min(r.h / (1 + 2 * clearK), (r.w - 2 * clearK * r.h) / ratio, 60 * u)) * k;
        const w = h * ratio;
        if (w > r.w + 1)
          throw new Error(`The ${id} needs more cells: ${Math.ceil(w)} px wide here. Make it wider (too long for its cells as it is).`);
        const g = doc6.grid ?? { cols: 12, rows: 12 };
        const x = block.at.col + block.at.cols >= g.cols && block.at.col > 0 ? r.x + r.w - w : block.at.col > 0 && Math.abs(block.at.col * 2 + block.at.cols - g.cols) <= 1 ? r.x + (r.w - w) / 2 : r.x;
        const box = { x, y: r.y + (r.h - h) / 2, w, h };
        lockupAt(box.x, box.y, h, part);
        layers.push({ id, kind: "logo", box, logo: { clear: h * clearK, min: least }, can: PART });
        break;
      }
      case "art": {
        const pose = String(doc6.options[`${id}.pose`] ?? "sit") === "hang" ? "hang" : "sit";
        const im = pose === "hang" ? pics.hang : pics.sit;
        const ratio = im.height / im.width;
        const w = Math.min(r.w, r.h / ratio) * k;
        const h = w * ratio;
        const x = r.x + (r.w - w) / 2;
        const y = r.y + (r.h - h) / (pose === "hang" ? 1 : 2);
        ctx.save();
        if (pose === "sit" && !svg) {
          const kk = w / 281.7;
          const c = (a) => withAlpha(brandColor("shadow"), a);
          ctx.filter = `drop-shadow(0 ${8 * kk}px ${8.5 * kk}px ${c(0.12)}) drop-shadow(0 ${31 * kk}px ${15 * kk}px ${c(0.1)})`;
        }
        ctx.drawImage(im, x, y, w, h);
        ctx.restore();
        const ink = inkBox(pose, x, y, w);
        layers.push({ id, kind: "art", box: ink, can: PART });
        break;
      }
      case "reef": {
        const R = logoDoc().reef;
        const rw = r.w;
        const rh = rw * R.h / R.w;
        const off = scratch(Math.max(1, Math.round(rw)), Math.max(1, Math.round(rh)));
        off.ctx.drawImage(pics.reef, 0, 0, off.canvas.width, off.canvas.height);
        if (t.reefFade > 0) {
          off.ctx.globalCompositeOperation = "source-atop";
          off.ctx.globalAlpha = t.reefFade;
          off.ctx.fillStyle = t.bg;
          off.ctx.fillRect(0, 0, off.canvas.width, off.canvas.height);
        }
        const foot = r.y + r.h;
        const drop = rh > r.h ? (rh - r.h) / rh : 0;
        ctx.save();
        ctx.beginPath();
        ctx.rect(r.x, r.y, r.w, r.h);
        ctx.clip();
        ctx.drawImage(off.canvas, r.x, foot - rh * (1 - drop), rw, rh);
        ctx.restore();
        const ink = reefInkIn(pics.reef, r.x, foot, rw, drop);
        layers.push({ id, kind: "art", box: r, ink, can: DECOR });
        break;
      }
      case "tile": {
        ctx.save();
        ctx.fillStyle = t.tile;
        ctx.globalAlpha = Math.min(1, t.tileAlpha);
        const ink = tileWords(ctx, r, 51.6 * Math.min(1, r.w / (300 * u)), u, String(doc6.options[`${id}.stagger`] ?? "false") === "true", keep);
        ctx.restore();
        layers.push({ id, kind: "art", box: r, ink: ink.length ? ink : [{ x: r.x, y: r.y, w: 1, h: 1 }], can: DECOR });
        break;
      }
      case "band": {
        const WM3 = logoDoc().wordmark;
        const kk = Math.min(r.h / WM3.h, r.w / WM3.w);
        const bw = WM3.w * kk;
        const rule = r.y + r.h - WM3.h * kk + WM3.xTop * kk;
        ctx.fillStyle = t.line;
        ctx.fillRect(r.x, rule, r.w, Math.max(0.5, u));
        ctx.save();
        ctx.translate(r.x + (r.w - bw) / 2, r.y + r.h - WM3.h * kk);
        ctx.scale(kk, kk);
        ctx.fillStyle = t.bg;
        ctx.fill(wordmarkPath());
        ctx.strokeStyle = t.line;
        ctx.lineWidth = 1.3 * u / kk;
        ctx.stroke(wordmarkPath());
        ctx.restore();
        layers.push({ id, kind: "art", box: { x: r.x, y: rule, w: r.w, h: r.y + r.h - rule }, can: DECOR });
        break;
      }
      case "hatch": {
        ctx.strokeStyle = t.line;
        ctx.lineWidth = Math.max(0.5, u);
        hatchLines(ctx, r, 19 * u, 45);
        ctx.fillStyle = t.line;
        ctx.fillRect(r.x, r.y, r.w, Math.max(0.5, u));
        layers.push({ id, kind: "art", box: r, can: DECOR });
        break;
      }
      case "window": {
        const pic = pics.pictures[id] ?? null;
        const ratio = pic ? pic.height / pic.width : APP_H / APP_W;
        const w = Math.min(r.w, r.h / ratio) * k;
        const h = Math.min(r.h, w * ratio);
        const box = { x: r.x + (r.w - w) / 2, y: r.y, w, h };
        const rad = 10 * u;
        ctx.save();
        if (!svg) {
          ctx.shadowColor = withAlpha(brandColor("shadow"), 0.16);
          ctx.shadowBlur = 40 * u;
          ctx.shadowOffsetY = 14 * u;
        }
        ctx.fillStyle = brandColor("window");
        ctx.beginPath();
        ctx.roundRect(box.x, box.y, w, h, rad);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(box.x, box.y, w, h, rad);
        ctx.clip();
        if (pic) {
          const c = Math.max(w / pic.width, h / pic.height);
          ctx.drawImage(pic, box.x + (w - pic.width * c) / 2, box.y, pic.width * c, pic.height * c);
        } else {
          const view = w < 760 * u ? 700 : APP_W;
          ctx.translate(box.x, box.y);
          ctx.scale(w / view, w / view);
          drawApp(ctx, { width: view, showWorkspace: view === APP_W }, icons, fonts2, pics.sit);
        }
        ctx.restore();
        ctx.strokeStyle = t.line;
        ctx.lineWidth = Math.max(0.5, u);
        ctx.beginPath();
        ctx.roundRect(box.x, box.y, w, h, rad);
        ctx.stroke();
        layers.push({ id, kind: "picture", box, can: PART });
        break;
      }
      case "card": {
        const fill = tokenColor("white");
        const rad = Math.min(24 * u, r.h / 4);
        ctx.save();
        if (!svg) {
          ctx.shadowColor = "rgba(23, 47, 41, 0.08)";
          ctx.shadowBlur = 4 * u;
          ctx.shadowOffsetY = 2 * u;
        }
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w, r.h, rad);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = tokenColor("border-default");
        ctx.lineWidth = Math.max(0.5, u * 0.75);
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w, r.h, rad);
        ctx.stroke();
        layers.push({ id, kind: "panel", box: r, can: PART });
        const pad = Math.min(24 * u, r.h * 0.18, r.w * 0.08);
        const inner = { x: r.x + pad, y: r.y + pad, w: r.w - 2 * pad, h: r.h - 2 * pad };
        const ink = tokenColor("ink");
        const hd = fitText(`${id}-heading`, words(id, "heading"), sans(500, 1.25), Math.max(floor, 26 * u), { ...inner, h: inner.h * 0.5 });
        layers.push(textLayer(`${id}-heading`, hd, drawText(hd, inner, "left", ink), ink, fill, {}, { over: [id] }));
        const body = words(id, "text");
        if (body) {
          const top = inner.y + hd.h + 10 * u;
          const muted = tokenColor("text-secondary");
          const bb = fitText(`${id}-text`, body, sans(400, 1.4), Math.max(floor, 19 * u), { ...inner, y: top, h: inner.y + inner.h - top });
          layers.push(textLayer(`${id}-text`, bb, drawText(bb, { ...inner, y: top }, "left", muted), muted, fill, {}, { over: [id] }));
        }
        break;
      }
      case "stat": {
        const value = words(id, "value");
        const label = words(id, "label");
        const vf = fitText(id, value, sans(600, 1, -0.02), Math.min(r.h * (label ? 0.6 : 0.9), 200 * u), { ...r, h: r.h * (label ? 0.66 : 1) }, floor * 2);
        const statColor = contrast(hi, t.bg) >= 3 ? hi : t.ink;
        const vi = drawText(vf, r, e(id).align ?? "left", statColor);
        layers.push(textLayer(id, vf, vi, statColor, t.bg, PART));
        if (label) {
          const top = r.y + vf.h + vf.size * 0.12;
          const lf = fitText(`${id}-label`, label, sans(400, 1.35), Math.max(floor, vf.size * 0.24), { ...r, y: top, h: r.y + r.h - top });
          layers.push(textLayer(`${id}-label`, lf, drawText(lf, { ...r, y: top }, e(id).align ?? "left", t.muted), t.muted, t.bg, {}));
        }
        break;
      }
      case "quote": {
        const text = words(id, "text");
        const who = words(id, "attribution");
        const af = who ? fitText(`${id}-attribution`, who, sans(500, 1.3), Math.max(floor, 18 * u), { ...r, h: r.h * 0.22 }) : void 0;
        const qf = fitText(id, `\u201C${text.replace(/^[“"]|[”"]$/g, "")}\u201D`, sans(600, 1.12, -0.01), Math.min(56 * u, r.h * 0.4), { ...r, h: r.h - (af ? af.h + 18 * u : 0) }, floor * 1.4);
        qf.asked = text;
        const qi = drawText({ ...qf, asked: qf.lines.join(" ") }, r, e(id).align ?? "left", t.ink);
        layers.push({ ...textLayer(id, qf, qi, t.ink, t.bg, TEXT), text: { asked: text, drawn: qf.lines.join(" ").replace(/^“|”$/g, ""), size: qf.size, color: t.ink, ground: [t.bg], bold: true } });
        if (af) {
          const top = r.y + qf.h + 18 * u;
          layers.push(textLayer(`${id}-attribution`, af, drawText(af, { ...r, y: top }, e(id).align ?? "left", t.muted), t.muted, t.bg, {}));
        }
        break;
      }
      case "list": {
        const items = words(id, "items").split("|").map((x) => x.trim()).filter(Boolean);
        for (const it of items)
          drawable(id, it);
        let fs = Math.min(30 * u, r.h / (items.length * 1.8)) * k;
        let fitted = [];
        for (; fs >= floor - 0.01; fs *= 0.95) {
          try {
            fitted = items.map((it) => {
              setFont(ctx, { family: fonts2.sans, weight: 400, size: fs, tracking: 0 });
              const lines = wrap(ctx, it, r.w - fs * 1.7);
              const widths = lines.map((l) => ctx.measureText(l).width);
              if (widths.some((x) => x > r.w - fs * 1.7 + 0.5))
                throw tooLong(id);
              return { lines, widths, size: fs, face: sans(400, 1.35), w: Math.max(...widths), h: lines.length * fs * 1.35, asked: it };
            });
          } catch {
            continue;
          }
          const h = fitted.reduce((n, b) => n + b.h, 0) + fs * 0.55 * (items.length - 1);
          if (h <= r.h + 0.5)
            break;
        }
        if (fs < floor - 0.01)
          throw tooLong(id);
        const check = new Path2D3("M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z");
        let y = r.y;
        const ink = [];
        for (const b of fitted) {
          ctx.save();
          ctx.translate(r.x, y + fs * 0.08);
          ctx.scale(fs * 1.15 / 256, fs * 1.15 / 256);
          ctx.fillStyle = t.dark ? brandColor("pink") : brandColor("purple");
          ctx.fill(check);
          ctx.restore();
          ink.push(...drawText(b, { x: r.x + fs * 1.7, y, w: r.w - fs * 1.7, h: b.h }, "left", t.ink, y));
          y += b.h + fs * 0.55;
        }
        layers.push({ id, kind: "text", box: union2(ink), ink, text: { asked: items.join(" "), drawn: fitted.flatMap((b) => b.lines).join(" "), size: fs, color: t.ink, ground: [t.bg] }, can: PART });
        break;
      }
      case "button": {
        const fs0 = Math.max(floor, Math.min(18 * u, r.h / 2.6));
        const f = fitText(id, words(id, "text"), sans(500, 1.2), fs0, { ...r, w: r.w - fs0 * 2.6, h: r.h / 2.4 });
        const bh = f.size * 2.5;
        const bw = f.w + f.size * 2.6;
        const box = { x: r.x, y: r.y + (r.h - bh) / 2, w: bw, h: bh };
        const fill = tokenColor("action-primary");
        const ink = tokenColor("action-primary-fg");
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.roundRect(box.x, box.y, bw, bh, bh / 2);
        ctx.fill();
        drawText(f, { x: box.x + f.size * 1.3, y: box.y, w: f.w + 1, h: bh }, "left", ink, box.y + (bh - f.size * 1.2) / 2 + f.size * 0.04);
        layers.push({ id, kind: "text", box, ink: [box], text: { asked: f.asked, drawn: f.lines.join(" "), size: f.size, color: ink, ground: [fill] }, can: PART });
        break;
      }
      case "search": {
        const fs0 = Math.max(floor, Math.min(15 * u, r.h * 0.38));
        const f = fitText(id, words(id, "text"), sans(400, 1.2), fs0, { ...r, w: r.w - fs0 * 4, h: r.h * 0.6 });
        const bh = Math.min(r.h, f.size * 2.7);
        const box = { x: r.x, y: r.y + (r.h - bh) / 2, w: r.w, h: bh };
        const white = tokenColor("white");
        const muted = tokenColor("text-muted");
        ctx.fillStyle = white;
        ctx.beginPath();
        ctx.roundRect(box.x, box.y, box.w, bh, bh / 2);
        ctx.fill();
        ctx.strokeStyle = tokenColor("border-field");
        ctx.lineWidth = Math.max(1, u);
        ctx.stroke();
        const glass = icons.get("MagnifyingGlass");
        if (glass) {
          ctx.save();
          ctx.translate(box.x + bh * 0.4, box.y + bh / 2 - f.size * 0.55);
          ctx.scale(f.size * 1.1 / 256, f.size * 1.1 / 256);
          ctx.fillStyle = muted;
          ctx.fill(glass);
          ctx.restore();
        }
        const textColor = tokenColor("text-secondary");
        drawText(f, { x: box.x + bh * 0.4 + f.size * 1.6, y: box.y, w: f.w + 1, h: bh }, "left", textColor, box.y + (bh - f.size * 1.2) / 2 + f.size * 0.04);
        layers.push({ id, kind: "text", box, ink: [box], text: { asked: f.asked, drawn: f.lines.join(" "), size: f.size, color: textColor, ground: [white] }, can: PART });
        break;
      }
      case "chart": {
        const data = words(id, "data").split("|").map((x) => x.trim()).filter(Boolean).map((row) => {
          const m = /^(.*\S)\s+(-?\d+(?:\.\d+)?)%?$/.exec(row);
          if (!m)
            throw new Error(`The ${id}'s data is "label value" rows with | between; "${row}" has no value at its end.`);
          drawable(id, m[1]);
          return { label: m[1], value: Number(m[2]) };
        });
        if (data.length < 2 || data.length > 8)
          throw new Error(`The ${id} takes 2 to 8 rows, not ${data.length}.`);
        const series = [1, 2, 3, 4, 5].map((n) => tokenColor(`chart-series-${n}`));
        const kind = String(doc6.options[`${id}.kind`] ?? "bar");
        const title = words(id, "title");
        const fs = Math.max(floor, Math.min(17 * u, r.h / (data.length * 2.6)));
        const tf = title ? fitText(`${id}-title`, title, sans(500, 1.25), Math.max(floor, 24 * u), { ...r, h: r.h * 0.2 }) : void 0;
        if (tf)
          layers.push(textLayer(`${id}-title`, tf, drawText(tf, r, "left", t.ink), t.ink, t.bg, {}));
        const area = { ...r, y: r.y + (tf ? tf.h + 12 * u : 0), h: r.h - (tf ? tf.h + 12 * u : 0) };
        const max = Math.max(...data.map((x) => x.value), 0) || 1;
        const ink = [];
        const drawn = [];
        const label = (text, x, y, w, align = "left") => {
          setFont(ctx, { family: fonts2.sans, weight: 400, size: fs, tracking: 0 });
          const tw = ctx.measureText(text).width;
          if (tw > w + 0.5)
            throw tooLong(id);
          const f = { lines: [text], widths: [tw], size: fs, face: sans(400, 1.2), w: tw, h: fs * 1.2, asked: text };
          ink.push(...drawText(f, { x: align === "right" ? x - w : align === "center" ? x - w / 2 : x, y, w, h: fs * 1.2 }, align, t.ink, y));
          drawn.push(text);
        };
        if (kind === "bar") {
          setFont(ctx, { family: fonts2.sans, weight: 400, size: fs, tracking: 0 });
          const lw = Math.min(area.w * 0.4, Math.max(...data.map((x) => ctx.measureText(x.label).width)));
          const vw = Math.max(...data.map((x) => ctx.measureText(String(x.value)).width));
          const row = area.h / data.length;
          const bh = Math.min(row * 0.55, fs * 1.4);
          data.forEach((x, i) => {
            const y = area.y + i * row + (row - fs * 1.2) / 2;
            label(x.label, area.x, y, lw);
            const bx = area.x + lw + fs;
            const full = area.w - lw - vw - fs * 2.5;
            const w = Math.max(bh, full * x.value / max);
            ctx.fillStyle = series[0];
            ctx.beginPath();
            ctx.roundRect(bx, area.y + i * row + (row - bh) / 2, w, bh, bh / 2);
            ctx.fill();
            label(String(x.value), bx + w + fs * 0.5, y, vw + 2);
          });
        } else if (kind === "line") {
          const plot = { x: area.x + fs, y: area.y + fs * 0.5, w: area.w - 2 * fs, h: area.h - fs * 2.6 };
          ctx.fillStyle = t.line;
          ctx.fillRect(plot.x, plot.y + plot.h, plot.w, Math.max(0.5, u));
          const pts = data.map((x, i) => ({ x: plot.x + plot.w * i / (data.length - 1), y: plot.y + plot.h - plot.h * x.value / max }));
          ctx.strokeStyle = series[0];
          ctx.lineWidth = Math.max(2, 3 * u);
          ctx.beginPath();
          pts.forEach((pt, i) => i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y));
          ctx.stroke();
          ctx.fillStyle = series[0];
          for (const pt of pts) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, Math.max(3, 5 * u), 0, Math.PI * 2);
            ctx.fill();
          }
          const slot = plot.w / Math.max(1, data.length - 1);
          data.forEach((x, i) => label(`${x.label} ${x.value}`, pts[i].x, plot.y + plot.h + fs * 0.5, i === 0 || i === data.length - 1 ? slot : slot * 0.95, i === 0 ? "left" : i === data.length - 1 ? "right" : "center"));
        } else {
          const total = data.reduce((n, x) => n + Math.max(0, x.value), 0) || 1;
          const R = Math.min(area.h / 2, area.w * 0.26);
          const cx = area.x + R;
          const cy = area.y + area.h / 2;
          let a = -Math.PI / 2;
          data.forEach((x, i) => {
            const b = a + Math.PI * 2 * Math.max(0, x.value) / total;
            ctx.strokeStyle = series[i % series.length];
            ctx.lineWidth = R * 0.34;
            ctx.beginPath();
            ctx.arc(cx, cy, R * 0.83, a, b);
            ctx.stroke();
            a = b;
          });
          const lx = cx + R + fs * 1.5;
          data.forEach((x, i) => {
            const y = area.y + (area.h - data.length * fs * 1.6) / 2 + i * fs * 1.6;
            ctx.fillStyle = series[i % series.length];
            ctx.beginPath();
            ctx.arc(lx + fs * 0.4, y + fs * 0.6, fs * 0.4, 0, Math.PI * 2);
            ctx.fill();
            label(`${x.label} ${x.value}`, lx + fs * 1.3, y, area.x + area.w - lx - fs * 1.3);
          });
        }
        layers.push({ id, kind: "text", box: union2(ink), ink, text: { asked: data.map((x) => `${x.label} ${x.value}`).join(" "), drawn: drawn.join(" "), size: fs, color: t.ink, ground: [t.bg] }, can: PART });
        break;
      }
      case "flow": {
        const steps = words(id, "steps").split("|").map((x) => x.trim()).filter(Boolean);
        if (steps.length < 2 || steps.length > 6)
          throw new Error(`The ${id} takes 2 to 6 steps, not ${steps.length}.`);
        const across = r.w / r.h >= 1.6;
        const n = steps.length;
        const gapA = (across ? r.w : r.h) * 0.08;
        const boxW = across ? (r.w - gapA * (n - 1)) / n : r.w;
        const boxH = across ? r.h : (r.h - gapA * (n - 1)) / n;
        const fill = tokenColor("white");
        const edge = tokenColor("border-field");
        const ink = tokenColor("ink");
        const inks = [];
        const drawn = [];
        let size = Infinity;
        steps.forEach((step, i) => {
          const bx = across ? r.x + i * (boxW + gapA) : r.x;
          const by = across ? r.y : r.y + i * (boxH + gapA);
          const box = { x: bx, y: by, w: boxW, h: boxH };
          ctx.fillStyle = fill;
          ctx.strokeStyle = edge;
          ctx.lineWidth = Math.max(1, u);
          ctx.beginPath();
          ctx.roundRect(box.x, box.y, box.w, box.h, Math.min(16 * u, box.h / 3));
          ctx.fill();
          ctx.stroke();
          const pad = Math.min(14 * u, box.h * 0.2, box.w * 0.1);
          const inner = { x: box.x + pad, y: box.y + pad, w: box.w - 2 * pad, h: box.h - 2 * pad };
          const f = fitText(id, step, sans(500, 1.25), Math.max(floor, Math.min(22 * u, inner.h)), inner);
          const top = inner.y + (inner.h - f.h) / 2;
          inks.push(...drawText(f, inner, "center", ink, top));
          drawn.push(f.lines.join(" "));
          size = Math.min(size, f.size);
          if (i < n - 1) {
            ctx.strokeStyle = t.dark ? t.ink : t.line;
            ctx.fillStyle = ctx.strokeStyle;
            ctx.lineWidth = Math.max(1.5, 1.5 * u);
            const a = across ? { x: box.x + box.w + gapA * 0.18, y: box.y + box.h / 2 } : { x: box.x + box.w / 2, y: box.y + box.h + gapA * 0.18 };
            const b = across ? { x: box.x + box.w + gapA * 0.82, y: a.y } : { x: a.x, y: box.y + box.h + gapA * 0.82 };
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            const hs = Math.min(gapA * 0.25, 8 * u);
            ctx.beginPath();
            if (across) {
              ctx.moveTo(b.x, b.y);
              ctx.lineTo(b.x - hs, b.y - hs * 0.7);
              ctx.lineTo(b.x - hs, b.y + hs * 0.7);
            } else {
              ctx.moveTo(b.x, b.y);
              ctx.lineTo(b.x - hs * 0.7, b.y - hs);
              ctx.lineTo(b.x + hs * 0.7, b.y - hs);
            }
            ctx.fill();
          }
        });
        layers.push({ id, kind: "text", box: r, ink: inks, text: { asked: steps.join(" "), drawn: drawn.join(" "), size, color: ink, ground: [fill] }, can: PART });
        break;
      }
      case "divider": {
        const h = Math.max(1, u);
        const y = r.y + r.h / 2 - h / 2;
        ctx.fillStyle = t.line;
        ctx.fillRect(r.x, y, r.w, h);
        layers.push({ id, kind: "art", box: { x: r.x, y, w: r.w, h }, can: DECOR });
        break;
      }
      case "icon": {
        const name = String(doc6.options[`${id}.name`] ?? "envelope-simple");
        const g = glyphs().find((x) => x.name === name);
        const d = g?.svg.match(/\sd="([^"]+)"/)?.[1];
        const sz = Math.min(r.w, r.h) * k;
        const box = { x: r.x + (r.w - sz) / 2, y: r.y + (r.h - sz) / 2, w: sz, h: sz };
        if (d) {
          ctx.save();
          ctx.translate(box.x, box.y);
          ctx.scale(sz / 256, sz / 256);
          ctx.fillStyle = t.dark ? t.ink : brandColor("purple");
          ctx.fill(new Path2D3(d));
          ctx.restore();
        }
        layers.push({ id, kind: "key", box, can: PART });
        break;
      }
    }
  }
  ctx.restore();
  return layers;
}

// dist/assets/deck.js
var LISTS = ["bullets", "agenda", "timeline", "team", "comparison", "chart", "images"];
var COMPOSED = ["team", "comparison", "chart", "images"];
var doc2;
var deckDoc = () => doc2 ??= JSON.parse(readFileSync8(pkgPath("brand", "assets", "deck.json"), "utf8"));
var slideTypes = () => Object.keys(deckDoc().slides);
function deckCatalog() {
  const d = deckDoc();
  return {
    size: { width: d.width, height: d.height },
    slides: slideTypes().map((id) => ({ id, name: d.slides[id].name, description: d.slides[id].description, template: d.slides[id].template, theme: d.slides[id].theme, slots: d.slides[id].slots, picture: id === "image" })),
    themes: themeNames()
  };
}
var MAIN = { cover: "title", section: "title", statement: "title", bullets: "items", agenda: "items", timeline: "items", stat: "stat", quote: "quote", qa: "title", team: "items", chart: "data" };
function slotsFor(type, given2) {
  const def = deckDoc().slides[type].slots;
  const out = given2.sample ? { ...def } : {};
  for (const [k0, v] of Object.entries(given2)) {
    if (["type", "theme", "picture", "image", "images", "sample", "seed", "edits", "highlight"].includes(k0))
      continue;
    const k = k0 === "headline" ? "title" in def ? "title" : "quote" in def ? "quote" : k0 : k0 === "badge" && "number" in def ? "number" : k0;
    if (!(k in def))
      throw new Error(`A ${type} slide does not take "${k}". It takes ${Object.keys(def).map((s) => `"${s}"`).join(", ")}${type === "image" ? ' and "image"' : ""}.`);
    if (Array.isArray(v) && v.every((x) => typeof x === "string"))
      out[k] = v.join(" | ");
    else if (typeof v === "string")
      out[k] = v;
    else
      throw new Error(`A ${type} slide's "${k}" takes text.`);
    if (!out[k].trim())
      delete out[k];
  }
  const main = MAIN[type];
  if (main && !out[main])
    throw new Error(`A ${type} slide needs "${main}". (--sample fills sample copy.)`);
  for (const [k, v] of Object.entries(out))
    drawable(k, v);
  return out;
}
function slideDesign(type, slots, theme, picture, more = {}) {
  const def = deckDoc().slides[type];
  const req = { template: def.template, theme, size: "custom", width: deckDoc().width, height: deckDoc().height, emphasise: false, seed: more.seed, edits: more.edits, highlight: more.highlight };
  switch (type) {
    case "cover":
      return designOf({ ...req, headline: slots.title, body: slots.body ?? "" });
    case "section": {
      const d = designOf({ ...req, headline: slots.title, body: "", badgeStyle: "dot", badgeText: slots.number });
      return { ...d, textSize: d.textSize * 1.6, badgeScale: 120 };
    }
    case "statement":
    case "qa":
      return designOf({ ...req, headline: slots.title, body: "" });
    case "stat":
      return designOf({ ...req, headline: `*${(slots.stat ?? "").replace(/\*/g, "")}*`, body: slots.title ?? "" });
    case "quote":
      return designOf({ ...req, headline: `\u201C${(slots.quote ?? "").replace(/^[“"]|[”"]$/g, "")}\u201D`, body: slots.attribution ?? "", badge: "none", highlight: more.highlight ?? "ink" });
    case "image":
      return designOf({ ...req, headline: slots.title, body: slots.body ?? "", picture, pictureUrl: slots.url });
    case "end":
      return designOf({ ...req, headline: slots.title, body: slots.url ?? "" });
    default:
      throw new Error(`${type} is not a template slide.`);
  }
}
function drawBullets(ctx, slots, theme, pics, fonts2, mode = "bullets") {
  const W = deckDoc().width;
  const H = deckDoc().height;
  const t = themes()[theme];
  const u = Math.sqrt(W * H / (1200 * 630));
  const items = (slots.items ?? "").split("|").map((s) => s.trim()).filter(Boolean);
  if (items.length > 6)
    throw new Error(`A bullets slide holds up to 6 points; it was given ${items.length}. Split it.`);
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);
  const sw = 32 * u;
  const g = 19 * u;
  ctx.strokeStyle = t.line;
  ctx.lineWidth = Math.max(0.5, u);
  for (const [x, mirror] of [[0, false], [W - sw, true]]) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, 0, sw, H);
    ctx.clip();
    ctx.translate(x + sw / 2, H / 2);
    ctx.rotate((mirror ? 1 : -1) * 45 * Math.PI / 180);
    ctx.beginPath();
    const L2 = Math.hypot(sw, H) + g * 2;
    for (let y = -L2 / 2; y <= L2 / 2; y += g / Math.SQRT2) {
      ctx.moveTo(-L2 / 2, y);
      ctx.lineTo(L2 / 2, y);
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = t.line;
  ctx.fillRect(sw - u, 0, u, H);
  ctx.fillRect(W - sw, 0, u, H);
  const left = sw + 96 * u;
  const layers = [{ id: "hatch", kind: "art", box: { x: 0, y: 0, w: W, h: H }, ink: [{ x: 0, y: 0, w: sw, h: H }, { x: W - sw, y: 0, w: sw, h: H }], bleeds: true, can: {} }];
  const title = (slots.title ?? "").replace(/\*/g, "");
  const top = 110 * u;
  let y0 = top;
  if (title) {
    const f = fit2(ctx, title, { family: fonts2.sans, weight: 600, size: 62 * u, tracking: -0.01, leading: 1.06, color: t.ink }, W - left * 2, 2, 0.6, "title");
    const box = drawFitted(ctx, f, left, top);
    layers.push({ id: "headline", kind: "text", box, ink: f.lines.map((_l, i) => ({ x: left, y: top + i * f.size * 1.06 + f.size * 0.14, w: f.widths[i], h: f.size * 0.98 })), text: { asked: title.replace(/\s+/g, " ").trim(), drawn: f.lines.join(" "), size: f.size, color: t.ink, ground: [t.bg] }, can: {} });
    y0 = top + f.height;
  }
  const cols = items.length > 4 ? 2 : 1;
  const colW = (W - left * 2 - (cols - 1) * 64 * u) / cols;
  const rows = Math.ceil(items.length / cols);
  const check = new Path2D4("M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z");
  const listTop = y0 + 60 * u;
  const lockTop = H - 64 * u - logoDoc().lockup.h * u;
  const room = lockTop - 40 * u - listTop;
  let pt = 30 * u;
  let wrapped = [];
  for (; ; pt -= u) {
    if (pt < 18 * u) {
      const long = [...items].sort((a, b) => b.length - a.length)[0];
      throw new Error(`The points are too long for a bullets slide: at ${Math.round(18 * u)} px they need more room than it has. Shorten "${long}", or split the slide.`);
    }
    try {
      wrapped = items.map((text) => fit2(ctx, text, { family: fonts2.sans, weight: 400, size: pt, leading: 1.35, color: t.ink }, colW - pt * 1.7, 2, 1, "point"));
    } catch {
      continue;
    }
    const tallest = Math.max(...wrapped.map((f) => f.height));
    if (rows * tallest + (rows - 1) * pt * 0.6 <= room)
      break;
  }
  const pitch = Math.min(Math.max(...wrapped.map((f) => f.height)) + pt * 1.1, rows > 1 ? (room - wrapped[0].height) / (rows - 1) : Infinity);
  wrapped.forEach((f, i) => {
    const x = left + Math.floor(i / rows) * (colW + 64 * u);
    const y = listTop + i % rows * pitch;
    const mark2 = t.dark ? brandColor("pink") : brandColor("purple");
    if (mode === "bullets") {
      ctx.save();
      ctx.translate(x, y + pt * 0.1);
      ctx.scale(pt * 1.2 / 256, pt * 1.2 / 256);
      ctx.fillStyle = mark2;
      ctx.fill(check);
      ctx.restore();
    } else {
      const cx = x + pt * 0.6;
      const cy = y + pt * 0.7;
      if (mode === "timeline" && i % rows < rows - 1) {
        ctx.fillStyle = t.line;
        ctx.fillRect(cx - u / 2, cy, u, pitch);
      }
      ctx.fillStyle = mark2;
      ctx.beginPath();
      ctx.arc(cx, cy, mode === "agenda" ? pt * 0.6 : pt * 0.28, 0, Math.PI * 2);
      ctx.fill();
      if (mode === "agenda") {
        ctx.fillStyle = t.dark ? t.ink : tokenColor("white");
        ctx.font = `600 ${pt * 0.62}px ${fonts2.mono}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), cx, cy + pt * 0.03);
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
      }
    }
    const box = drawFitted(ctx, f, x + pt * 1.7, y + pt * 0.12);
    layers.push({ id: `point-${i + 1}`, kind: "text", box, text: { asked: items[i].replace(/\s+/g, " ").trim(), drawn: f.lines.join(" "), size: f.size, color: t.ink, ground: [t.bg] }, can: {} });
  });
  const L = logoDoc().lockup;
  const lh = L.h * u;
  const k = lh / L.h;
  const ly = H - 64 * u - lh;
  const mark = pics.get("sit");
  if (mark)
    ctx.drawImage(mark, left, ly, L.mark.w * k, L.mark.h * k);
  ctx.save();
  ctx.translate(left + L.word.x * k, ly + L.word.y * k);
  ctx.scale(k, k);
  ctx.fillStyle = t.ink;
  ctx.fill(wordmarkPath());
  ctx.restore();
  layers.push({ id: "logo", kind: "logo", box: { x: left, y: ly, w: L.w * k, h: lh }, logo: { clear: lh * logoDoc().clear.share, min: logoDoc().clear.min * u }, can: {} });
  return layers;
}
function slideOf(slide) {
  const type = pick("slide type", slide.type, slideTypes());
  const slots = slotsFor(type, slide);
  const theme = slide.theme ? pick("theme", slide.theme, themeNames()) : deckDoc().slides[type].theme;
  const d = slideDesign(type, slots, theme, !!slide.picture, { seed: typeof slide.seed === "number" ? slide.seed : void 0, edits: slide.edits, highlight: slide.highlight });
  const asked = {};
  const given2 = slotsFor(type, { ...slide, sample: false, ...MAIN[type] && slide.sample ? { [MAIN[type]]: slots[MAIN[type]] } : {} });
  const say = (k, v) => {
    if (v !== void 0)
      asked[k] = v;
  };
  say("headline", given2[type === "stat" ? "stat" : type === "quote" ? "quote" : "title"]);
  say("body", given2[type === "stat" ? "title" : type === "quote" ? "attribution" : type === "end" ? "url" : "body"]);
  say("badge", given2.number);
  return { ...d, asked, sample: !!slide.sample };
}
async function composedDoc(type, slots, theme, slide) {
  const at = (col, row, cols, rows) => ({ col, row, cols, rows });
  const blocks = [];
  const copy = {};
  const options = {};
  const images = {};
  const pictures = {};
  const title = slots.title?.trim();
  const top = title ? 3 : 1;
  if (title) {
    blocks.push({ id: "headline", type: "headline", at: at(0, 0, 12, 2) });
    copy["headline.text"] = title;
  }
  const items = (v) => (v ?? "").split("|").map((x) => x.trim()).filter(Boolean);
  if (type === "team") {
    const people = items(slots.items);
    if (people.length > 6)
      throw new Error(`A team slide holds up to 6 people; it was given ${people.length}. Split it.`);
    const cols = people.length > 3 ? 3 : people.length;
    people.forEach((p, i) => {
      const [name, ...role] = p.split(/\s+-\s+/);
      const id = `person-${i + 1}`;
      blocks.push({ id, type: "card", at: at(i % cols * (12 / cols), top + Math.floor(i / cols) * 4, 12 / cols, 3) });
      copy[`${id}.heading`] = name.trim();
      if (role.join(" - ").trim())
        copy[`${id}.text`] = role.join(" - ").trim();
    });
  } else if (type === "comparison") {
    for (const [side, col] of [["left", 0], ["right", 6]]) {
      if (slots[side]?.trim()) {
        blocks.push({ id: side, type: "body", at: at(col, top, 6, 1) });
        copy[`${side}.text`] = slots[side];
      }
      if (slots[`${side}-items`]?.trim()) {
        blocks.push({ id: `${side}-items`, type: "list", at: at(col, top + 2, 5, 12 - top - 4) });
        copy[`${side}-items.items`] = slots[`${side}-items`];
      }
    }
  } else if (type === "chart") {
    blocks.push({ id: "chart", type: "chart", at: at(0, top, 9, 12 - top - 2) });
    copy["chart.data"] = slots.data ?? "";
    options["chart.kind"] = slots.kind ? pick("chart kind", slots.kind, ["bar", "line", "donut"]) : "bar";
  } else {
    const files = (Array.isArray(slide.images) ? slide.images : []).filter((f) => !!f && typeof f === "object");
    if (files.length < 2 || files.length > 4)
      throw new Error(`A picture grid takes 2 to 4 pictures ("images"); it was given ${files.length}.`);
    files.forEach((im, i) => {
      const id = `picture-${i + 1}`;
      const w = 12 / files.length;
      blocks.push({ id, type: "window", at: at(i * w, top, w, 12 - top - 2) });
      images[id] = id;
      pictures[id] = im;
    });
  }
  blocks.push({ id: "logo", type: "logo", at: at(0, 11, 3, 1) });
  const doc6 = { version: 1, brand: "", kind: "image", template: "compose", size: { id: "slide", width: deckDoc().width, height: deckDoc().height }, theme, copy, images, options, layers: {}, blocks, history: [], future: [] };
  const base = await composePictures({ ...doc6, blocks: [] }, async () => null);
  return { doc: doc6, pics: { ...base, pictures } };
}
async function drawComposed(ctx, type, slots, theme, slide, fonts2, svg = false) {
  const { doc: doc6, pics } = await composedDoc(type, slots, theme, slide);
  return drawCompose(ctx, doc6, pics, await loadIcons(), fonts2, svg);
}
async function drawSlide(ctx, slide, opts = {}) {
  const type = pick("slide type", slide.type, slideTypes());
  const slots = slotsFor(type, slide);
  const theme = slide.theme ? pick("theme", slide.theme, themeNames()) : deckDoc().slides[type].theme;
  if (slide.picture && type !== "image")
    throw new Error(`A ${type} slide holds no picture; "image" goes with the image slide.`);
  const pics = opts.pics ?? await picturesFor(slide.picture ?? null);
  const fonts2 = brandFonts();
  if (LISTS.includes(type)) {
    if (slide.edits && Object.keys(slide.edits).length)
      throw new Error("A list slide has no layers to move: change its words, theme or highlight.");
    if (COMPOSED.includes(type))
      return drawComposed(ctx, type, slots, theme, slide, fonts2, opts.svg);
    return drawBullets(ctx, slots, theme, pics, fonts2, type);
  }
  return drawDesign(ctx, slideOf(slide), pics, await loadIcons(), fonts2, opts.px ?? 1, !!opts.svg).layers;
}
async function renderSlide(slide, opts = { png: true }) {
  const { width: W, height: H } = deckDoc();
  const scale = opts.scale ?? 1;
  const out = { width: Math.round(W * scale), height: Math.round(H * scale), layers: [] };
  if (opts.png !== false || opts.jpg || opts.webp) {
    const s = surface(W, H, { scale });
    out.layers = await drawSlide(s.ctx, slide, { px: scale });
    out.png = toPng(s, { opaque: true });
    if (opts.jpg)
      out.jpg = toJpg(s);
    if (opts.webp)
      out.webp = toWebp(s);
    const px2 = pixelsOf(s).data;
    const rgb2 = Buffer.alloc(px2.length / 4 * 3);
    for (let i = 0, j = 0; i < px2.length; i += 4, j += 3) {
      rgb2[j] = px2[i];
      rgb2[j + 1] = px2[i + 1];
      rgb2[j + 2] = px2[i + 2];
    }
    out.rgb = rgb2;
  }
  if (opts.svg) {
    const pics = await picturesFor(slide.picture ?? null);
    if (LISTS.includes(slide.type)) {
      const s = surface(W, H, { svg: true });
      out.layers = await drawSlide(s.ctx, slide, { svg: true, px: 1, pics: await svgPictures(pics, W) });
      out.svg = toSvg(s);
    } else {
      const d = slideOf(slide);
      out.svg = await designSvg(d, pics);
      if (!out.layers.length)
        out.layers = (await measureDesign(d, pics)).layers;
    }
  }
  return out;
}

// dist/assets/merch.js
import { readFileSync as readFileSync9 } from "node:fs";

// dist/assets/pdf.js
import { deflateSync as deflateSync2 } from "node:zlib";
function imagesToPdf(pages, pageWidthPt) {
  if (!pages.length)
    throw new Error("A PDF needs at least one page.");
  const objects = [];
  const add = (body) => {
    objects.push(typeof body === "string" ? Buffer.from(body, "latin1") : body);
    return objects.length;
  };
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add("");
  const kids = [];
  for (const page of pages) {
    const ptW = pageWidthPt;
    const ptH = Math.round(pageWidthPt * page.height / page.width * 100) / 100;
    const data = deflateSync2(page.rgb, { level: 6 });
    const img = add(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${data.length} >>
stream
`, "latin1"), data, Buffer.from("\nendstream", "latin1")]));
    const content = `q ${ptW} 0 0 ${ptH} 0 0 cm /Im0 Do Q`;
    const contents = add(`<< /Length ${content.length} >>
stream
${content}
endstream`);
    kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Resources << /XObject << /Im0 ${img} 0 R >> >> /Contents ${contents} 0 R >>`));
  }
  objects[1] = Buffer.from(`<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`, "latin1");
  const parts = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
  const offsets = [];
  let at = parts[0].length;
  objects.forEach((body, i) => {
    const head = Buffer.from(`${i + 1} 0 obj
`, "latin1");
    const tail = Buffer.from("\nendobj\n", "latin1");
    offsets.push(at);
    parts.push(head, body, tail);
    at += head.length + body.length + tail.length;
  });
  const xref = [`xref
0 ${objects.length + 1}
0000000000 65535 f 
`, ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n 
`)].join("");
  parts.push(Buffer.from(`${xref}trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${at}
%%EOF
`, "latin1"));
  return Buffer.concat(parts);
}

// dist/assets/merch.js
var PX_PER_IN = 300;
var doc3;
var merchDoc = () => doc3 ??= JSON.parse(readFileSync9(pkgPath("brand", "assets", "merch.json"), "utf8"));
var merchItems = () => merchDoc().items;
var findItem = (id) => {
  const name = pick("item", id, merchItems().map((i) => i.id));
  return merchItems().find((i) => i.id === name);
};
function merchCatalog() {
  return {
    items: merchItems().map((i) => ({
      id: i.id,
      name: i.name,
      trim: { width: i.size[0], height: i.size[1], unit: "in" },
      bleed: i.bleed,
      safe: i.safe,
      method: i.method,
      variants: i.variants,
      pixels: { width: Math.round((i.size[0] + 2 * i.bleed) * PX_PER_IN), height: Math.round((i.size[1] + 2 * i.bleed) * PX_PER_IN), dpi: PX_PER_IN },
      dieCut: Boolean(i.cut),
      slots: [...new Set(i.layers.flatMap((l) => l.type === "text" ? [l.slot] : []))],
      source: i.source
    })),
    variants: Object.entries(merchDoc().variants).map(([id, v]) => ({ id, ground: v.ground || null, ink: v.ink, fullColor: v.fullColor })),
    lockups: logoDoc().lockups,
    note: "Sizes are common vendor print areas, not a vendor's exact template: confirm with the vendor before ordering."
  };
}
var LOCK = () => logoDoc().lockup;
var WM2 = () => logoDoc().wordmark;
function ratioOf(part) {
  const L = LOCK();
  if (part === "wordmark")
    return WM2().w / WM2().h;
  if (part === "mark")
    return L.mark.w / L.mark.h;
  return L.w / L.h;
}
function drawLockupPart(ctx, part, x, y, h, ink, mark) {
  const L = LOCK();
  if (part === "wordmark") {
    const k2 = h / WM2().h;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k2, k2);
    ctx.fillStyle = ink;
    ctx.fill(wordmarkPath());
    ctx.restore();
    return;
  }
  const k = h / L.h;
  ctx.drawImage(mark, x, y, L.mark.w * k, L.mark.h * k);
  if (part === "mark")
    return;
  ctx.save();
  ctx.translate(x + L.word.x * k, y + L.word.y * k);
  ctx.scale(k, k);
  ctx.fillStyle = ink;
  ctx.fill(wordmarkPath());
  ctx.restore();
}
async function drawItem2(ctx, item, req = {}) {
  const variant = pick(`variant for ${item.id}`, req.variant ?? item.variants[0], item.variants);
  const v = merchDoc().variants[variant];
  const ink = tokenColor(v.ink);
  const line = tokenColor(v.line);
  const ground = v.ground ? tokenColor(v.ground) : "";
  const o = item.bleed * PX_PER_IN;
  const W = (item.size[0] + 2 * item.bleed) * PX_PER_IN;
  const H = (item.size[1] + 2 * item.bleed) * PX_PER_IN;
  const px2 = (b) => ({ x: b[0] * PX_PER_IN + o, y: b[1] * PX_PER_IN + o, w: b[2] * PX_PER_IN, h: b[3] * PX_PER_IN });
  const takes = new Set(item.layers.flatMap((l) => l.type === "text" ? [l.slot] : []));
  for (const k of Object.keys(req.slots ?? {}))
    if (!takes.has(k))
      throw new Error(`${item.id} does not draw --${k}.${takes.size ? ` It takes ${[...takes].map((s) => `--${s}`).join(", ")}.` : " It takes no text."}`);
  const slots = { ...req.sample ? Object.fromEntries(Object.entries(merchDoc().sample).filter(([k]) => takes.has(k))) : {}, ...Object.fromEntries(Object.entries(req.slots ?? {}).filter(([, t]) => t.trim())) };
  for (const l of item.layers)
    if (l.type === "text")
      drawable(l.slot, slots[l.slot], l.face === "mono" ? "mono" : "sans");
  const layers = [];
  const inGround = [ground || tokenColor("white")];
  const add = (id, kind, box, more = {}) => {
    const n = layers.filter((x) => x.id === id || x.id.startsWith(`${id}-`)).length;
    layers.push({ id: n ? `${id}-${n + 1}` : id, kind, box, can: {}, ...more });
  };
  const fonts2 = brandFonts();
  const mark = await artImage("sit");
  if (v.groundPrinted && ground) {
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, W, H);
  }
  const u = PX_PER_IN / 60;
  const safe = { x: o + item.safe * PX_PER_IN, y: o + item.safe * PX_PER_IN, w: W - 2 * (o + item.safe * PX_PER_IN), h: H - 2 * (o + item.safe * PX_PER_IN) };
  const inSafe = (r) => {
    const x = Math.max(r.x, safe.x);
    const y = Math.max(r.y, safe.y);
    return { x, y, w: Math.min(r.x + r.w, safe.x + safe.w) - x, h: Math.min(r.y + r.h, safe.y + safe.h) - y };
  };
  for (const l of item.layers) {
    const b = px2(l.box);
    if (l.type === "pattern") {
      const r = { ...b };
      if (v.groundPrinted) {
        if (r.x <= o + 0.01) {
          r.w += r.x;
          r.x = 0;
        }
        if (r.x + r.w >= W - o - 0.01)
          r.w = W - r.x;
        if (r.y + r.h >= H - o - 0.01)
          r.h = H - r.y;
      }
      if ((l.kind === "reef" || l.kind === "tile") && !v.fullColor)
        continue;
      add(l.kind, "art", r, { bleeds: true, ...l.kind === "reef" ? { ink: reefInkIn(await artImage("reef"), r.x, r.y + r.h, r.w, l.drop ?? 0) } : {} });
      if (l.kind === "hatch") {
        ctx.strokeStyle = line;
        ctx.lineWidth = u;
        hatchLines(ctx, r, 19 * u, 45);
        ctx.fillStyle = line;
        ctx.fillRect(r.x, r.y, r.w, u);
      } else if (l.kind === "tile") {
        ctx.save();
        ctx.fillStyle = tokenColor(v.tile);
        ctx.globalAlpha = ground && ground !== tokenColor("white") ? 0.22 : 0.12;
        if (l.fade && v.fullColor) {
          const off = scratch(r.w, r.h);
          off.ctx.fillStyle = ctx.fillStyle;
          const q = inSafe(r);
          tileWords(off.ctx, { x: q.x - r.x, y: q.y - r.y, w: q.w, h: q.h }, 51.6, u, true);
          off.ctx.globalCompositeOperation = "destination-in";
          const g = off.ctx.createLinearGradient(0, 0, 0, r.h);
          g.addColorStop(0, "rgba(0,0,0,1)");
          g.addColorStop(1, "rgba(0,0,0,0)");
          off.ctx.fillStyle = g;
          off.ctx.fillRect(0, 0, r.w, r.h);
          ctx.drawImage(off.canvas, r.x, r.y);
        } else
          tileWords(ctx, inSafe(r), 51.6, u, true);
        ctx.restore();
      } else if (l.kind === "outline") {
        const k = Math.min(r.h / WM2().h, r.w / WM2().w);
        const bw = WM2().w * k;
        ctx.save();
        ctx.fillStyle = line;
        ctx.fillRect(r.x, r.y + WM2().xTop * k, r.w, Math.max(1, u));
        ctx.translate(r.x + (r.w - bw) / 2, r.y);
        ctx.scale(k, k);
        if (ground) {
          ctx.fillStyle = ground;
          ctx.fill(wordmarkPath());
        } else {
          ctx.globalCompositeOperation = "destination-out";
          ctx.fill(wordmarkPath());
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.strokeStyle = line;
        ctx.lineWidth = 1.6 * u / k;
        ctx.stroke(wordmarkPath());
        ctx.restore();
      } else {
        const reef = await artImage("reef");
        const R = logoDoc().reef;
        const rh = r.w * R.h / R.w;
        const off = scratch(r.w, rh);
        off.ctx.drawImage(reef, 0, 0, r.w, rh);
        if (ground && ground !== tokenColor("brand")) {
          off.ctx.globalCompositeOperation = "source-atop";
          off.ctx.globalAlpha = 0.62;
          off.ctx.fillStyle = ground;
          off.ctx.fillRect(0, 0, r.w, rh);
        }
        ctx.drawImage(off.canvas, r.x, r.y + r.h - rh * (1 - (l.drop ?? 0)));
      }
    } else if (l.type === "art") {
      if (!v.fullColor)
        continue;
      const im = await artImage(l.id);
      const ratio = im.height / im.width;
      const w = Math.min(b.w, b.h / ratio);
      const h = w * ratio;
      ctx.drawImage(im, b.x + (b.w - w) / 2, b.y + (b.h - h) / 2, w, h);
      add("art", "art", inkBox(l.id, b.x + (b.w - w) / 2, b.y + (b.h - h) / 2, w), { over: ["reef", "outline", "tile", "hatch"] });
    } else if (l.type === "logo") {
      const part = !v.fullColor && l.part !== "wordmark" ? l.fallback ?? null : l.part;
      if (!part)
        continue;
      const at = part !== l.part && l.boxOne ? px2(l.boxOne) : b;
      const ratio = ratioOf(part);
      const h = Math.min(at.h, at.w / ratio);
      const w = h * ratio;
      const box = { x: l.align === "left" ? at.x : at.x + (at.w - w) / 2, y: at.y + (at.h - h) / 2, w, h };
      const clear = part === "mark" ? 0 : h * logoDoc().clear.share;
      if (l.clear && ground) {
        ctx.fillStyle = ground;
        ctx.beginPath();
        ctx.roundRect(box.x - clear * 1.2, box.y - clear, box.w + clear * 2.4, box.h + clear * 2, h / 2);
        ctx.fill();
      }
      add("logo", "logo", box, { logo: { clear: part === "wordmark" ? 0 : clear, min: 0.25 * PX_PER_IN }, over: ["hatch", "tile"] });
      drawLockupPart(ctx, part, box.x, box.y, h, ink, mark);
    } else {
      const value = slots[l.slot] ?? "";
      if (!value.trim())
        continue;
      const plain = value.replace(/\\n/g, "\n").replace(/\*/g, "");
      const style = l.face === "mono" ? { family: fonts2.mono, weight: 500, size: l.size * PX_PER_IN, tracking: 0, leading: 1.2, color: ink, align: l.align ?? "center" } : { family: fonts2.sans, weight: 600, size: l.size * PX_PER_IN, tracking: -0.01, leading: 1.04, color: ink, align: l.align ?? "center" };
      const f = fit2(ctx, plain, style, b.w, l.maxLines ?? 2, 0.6, `${item.id} ${l.slot}`);
      const hi = /* @__PURE__ */ new Set();
      if (l.highlight && v.fullColor) {
        let on = false;
        let idx = 0;
        for (const part of value.split("*")) {
          for (const _w of part.split(/\s+/).filter(Boolean)) {
            if (on)
              hi.add(idx);
            idx++;
          }
          on = !on;
        }
      }
      const lh = f.size * (f.style.leading ?? 1.2);
      ctx.font = `${f.style.weight} ${f.size}px ${f.style.family}`;
      ctx.letterSpacing = `${(f.style.tracking ?? 0) * f.size}px`;
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      let word2 = 0;
      const lineBoxes = [];
      const hiColor = v.highlight ? tokenColor(v.highlight) : ink;
      f.lines.forEach((ln, i) => {
        const lw = f.widths[i];
        let x = f.style.align === "center" ? b.x + (b.w - lw) / 2 : f.style.align === "right" ? b.x + b.w - lw : b.x;
        lineBoxes.push({ x, y: b.y + i * lh, w: lw, h: f.size * 1.1 });
        const yb = b.y + i * lh + f.size * 0.92;
        for (const w of ln.split(" ")) {
          ctx.fillStyle = hi.has(word2) ? hiColor : ink;
          ctx.fillText(w, x, yb);
          x += ctx.measureText(`${w} `).width;
          word2++;
        }
      });
      ctx.letterSpacing = "0px";
      const said2 = plain.replace(/\s+/g, " ").trim();
      const box = { x: Math.min(...lineBoxes.map((q) => q.x)), y: lineBoxes[0].y, w: Math.max(...lineBoxes.map((q) => q.w)), h: lineBoxes.length * lh };
      add(l.slot, "text", box, { ink: lineBoxes, text: { asked: said2, drawn: f.lines.join(" "), size: f.size, color: hi.size && v.ground && contrast(hiColor, inGround[0]) < contrast(ink, inGround[0]) ? hiColor : ink, ground: v.ground ? inGround : [contrast(ink, tokenColor("white")) >= contrast(ink, tokenColor("ink")) ? tokenColor("white") : tokenColor("ink")], ...req.sample && !req.slots?.[l.slot] ? { sample: true } : {} } });
    }
  }
  if (req.guides) {
    ctx.save();
    ctx.strokeStyle = tokenColor("status-danger");
    ctx.lineWidth = 3;
    if (item.bleed)
      ctx.strokeRect(o, o, item.size[0] * PX_PER_IN, item.size[1] * PX_PER_IN);
    const s = item.safe * PX_PER_IN;
    ctx.setLineDash([18, 12]);
    ctx.strokeRect(o + s, o + s, item.size[0] * PX_PER_IN - 2 * s, item.size[1] * PX_PER_IN - 2 * s);
    ctx.restore();
  }
  return { variant, width: W, height: H, layers };
}
function cutPath(item) {
  if (!item.cut)
    return "";
  const o = item.bleed * PX_PER_IN;
  const w = item.size[0] * PX_PER_IN;
  const h = item.size[1] * PX_PER_IN;
  const r = item.cut.radius * PX_PER_IN;
  const d = `M${o + r} ${o}H${o + w - r}A${r} ${r} 0 0 1 ${o + w} ${o + r}V${o + h - r}A${r} ${r} 0 0 1 ${o + w - r} ${o + h}H${o + r}A${r} ${r} 0 0 1 ${o} ${o + h - r}V${o + r}A${r} ${r} 0 0 1 ${o + r} ${o}Z`;
  return `<g id="CutContour"><path d="${d}" fill="none" stroke="#FF00FF" stroke-width="3"/></g>`;
}
async function renderItem(item, req = {}) {
  const widthIn = item.size[0] + 2 * item.bleed;
  const heightIn = item.size[1] + 2 * item.bleed;
  const W = Math.round(widthIn * PX_PER_IN);
  const H = Math.round(heightIn * PX_PER_IN);
  const dpi = req.dpi ?? PX_PER_IN;
  const out = { layers: [], variant: "", width: Math.round(widthIn * dpi), height: Math.round(heightIn * dpi), widthIn, heightIn, dpi };
  if (req.png !== false || req.pdf) {
    const s = surface(W, H, { scale: dpi / PX_PER_IN });
    const drawn = await drawItem2(s.ctx, item, req);
    out.variant = drawn.variant;
    out.layers = drawn.layers;
    if (req.png !== false)
      out.png = toPng(s, { dpi });
    if (req.pdf) {
      const flat = surface(W, H, { scale: dpi / PX_PER_IN });
      flat.ctx.fillStyle = tokenColor("white");
      flat.ctx.fillRect(0, 0, W, H);
      flat.ctx.setTransform(1, 0, 0, 1, 0, 0);
      flat.ctx.drawImage(s.canvas, 0, 0);
      const px2 = pixelsOf(flat);
      const rgb2 = Buffer.alloc(px2.data.length / 4 * 3);
      for (let i = 0, j = 0; i < px2.data.length; i += 4, j += 3)
        px2.data.copy(rgb2, j, i, i + 3);
      out.pdf = imagesToPdf([{ rgb: rgb2, width: px2.width, height: px2.height }], widthIn * 72);
    }
  }
  if (req.svg) {
    const s = surface(W, H, { svg: true });
    const drawn = await drawItem2(s.ctx, item, req);
    out.variant = drawn.variant;
    out.layers = drawn.layers;
    out.svg = toSvg(s, { widthIn, heightIn }).replace(/<\/svg>\s*$/, `${cutPath(item)}</svg>
`);
  }
  return out;
}

// dist/assets/video.js
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync as mkdirSync2, readFileSync as readFileSync10 } from "node:fs";
import { dirname as dirname3 } from "node:path";
var doc4;
var videoDoc = () => doc4 ??= JSON.parse(readFileSync10(pkgPath("brand", "assets", "video.json"), "utf8"));
var videoTemplates = () => Object.keys(videoDoc().templates);
function hasFfmpeg() {
  if (process.env.DS_NO_FFMPEG)
    return false;
  return spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
}
function videoCatalog() {
  const d = videoDoc();
  return {
    templates: videoTemplates().map((id) => ({ id, ...d.templates[id] })),
    sizes: Object.entries(d.sizes).map(([id, [width, height]]) => ({ id, width, height })),
    fps: d.fps,
    easing: { token: "--ds-easing-out", value: tokens().site["--ds-easing-out"] },
    enter: d.enter,
    formats: ["mp4", "webm", "gif", "frames", "all"],
    encoder: "ffmpeg (H.264 MP4, VP9 WebM) when installed; otherwise PNG frames.",
    reducedMotion: "--reduced-motion keeps the fades and drops every movement; --still writes one PNG frame (the finished design at the end)."
  };
}
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sample = (u, a, b, c) => ((a * u + b) * u + c) * u;
  return (t) => {
    if (t <= 0)
      return 0;
    if (t >= 1)
      return 1;
    let lo = 0;
    let hi = 1;
    let u = t;
    for (let i = 0; i < 40; i++) {
      const x = sample(u, ax, bx, cx);
      if (Math.abs(x - t) < 1e-7)
        break;
      if (x < t)
        lo = u;
      else
        hi = u;
      u = (lo + hi) / 2;
    }
    return sample(u, ay, by, cy);
  };
}
var ease;
function easeOut(t) {
  if (!ease) {
    const raw = tokens().site["--ds-easing-out"] ?? "";
    const m = raw.match(/^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/);
    if (!m)
      throw new Error(`--ds-easing-out must be a cubic-bezier() so video timing is fixed. It is "${raw}".`);
    ease = bezier(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]));
  }
  return ease(t);
}
function videoDesign(o) {
  const def = videoDoc().templates[pick("video template", o.template, videoTemplates())];
  const layout = o.layout ? pick("layout", o.layout, TEMPLATES) : def.layout;
  if (o.layout && o.template !== "reveal")
    throw new Error("--layout goes with the reveal template; the others have their own.");
  const known = { square: "square", portrait: "portrait", vertical: "story" }[o.size];
  const { seconds: _s, fps: _f, reduced: _r, layout: _l, ...req } = o;
  const design = designOf({ ...req, template: layout, theme: o.theme ? pick("theme", o.theme, themeNames()) : def.theme, ...known ? { size: known, width: void 0, height: void 0 } : { size: "custom", width: o.width, height: o.height } });
  return { design, def };
}
function motionAt(def, t, reduced) {
  const e = videoDoc().enter;
  const order = def.order ?? videoDoc().order;
  return (name) => {
    const [kind, n] = name.split(":");
    const i = order.findIndex((p2) => p2 === name || p2 === `${kind}:*`);
    if (i < 0)
      return void 0;
    const start = i * e.gap + (n ? Number(n) * e.stagger : 0);
    const p = easeOut((t - start) / e.seconds);
    if (p >= 1)
      return void 0;
    const rise = kind === "window" ? e.windowRise : kind === "sticker" ? e.stickerRise : e.rise;
    const scaled = kind === "window" || kind === "sticker";
    return reduced ? { a: p } : { a: p, y: (1 - p) * rise, s: scaled ? e.scaleFrom + (1 - e.scaleFrom) * p : 1 };
  };
}
function countTo(text, p) {
  return text.replace(/\d[\d,.]*/g, (n) => {
    const decimals = /\.(\d+)$/.exec(n)?.[1]?.length ?? 0;
    const value = Number(n.replace(/,/g, "")) * p;
    const s = value.toFixed(decimals);
    return n.includes(",") ? Number(s).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : s;
  });
}
function drawLowerThird(ctx, design, t, seconds, pics, reduced) {
  const W = design.w;
  const H = design.h;
  const u = Math.sqrt(W * H / (1200 * 630));
  const fonts2 = brandFonts();
  const p = easeOut(Math.min(1, t / videoDoc().enter.seconds / 1.4));
  const out = reduced ? 1 : p;
  const name = design.headline.replace(/\*/g, "");
  const role = design.body;
  ctx.save();
  ctx.font = `600 ${26 * u}px ${fonts2.sans}`;
  const nw = ctx.measureText(name).width;
  ctx.font = `400 ${17 * u}px ${fonts2.sans}`;
  const rw = role ? ctx.measureText(role).width : 0;
  const mark = pics.get("sit");
  const pad = 18 * u;
  const mh = 44 * u;
  const w = pad * 3 + mh + Math.max(nw, rw);
  const h = role ? 86 * u : 70 * u;
  const x = 56 * u - (reduced ? 0 : (1 - out) * 40 * u);
  const y = H - 72 * u - h;
  ctx.globalAlpha = out;
  ctx.shadowColor = tokenColor("shadow-drop");
  ctx.shadowBlur = 12 * u;
  ctx.shadowOffsetY = 4 * u;
  ctx.fillStyle = tokenColor("white");
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 16 * u);
  ctx.fill();
  ctx.shadowColor = "transparent";
  if (mark)
    ctx.drawImage(mark, x + pad, y + (h - mh) / 2, mh * (mark.width / mark.height), mh);
  ctx.fillStyle = tokenColor("ink");
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 ${26 * u}px ${fonts2.sans}`;
  ctx.fillText(name, x + pad * 2 + mh, y + (role ? 38 : 44) * u);
  if (role) {
    ctx.font = `400 ${17 * u}px ${fonts2.sans}`;
    ctx.fillStyle = tokenColor("text-secondary");
    ctx.fillText(role, x + pad * 2 + mh, y + 64 * u);
  }
  ctx.restore();
  void seconds;
}
function drawFrame2(ctx, design, def, t, seconds, pics, icons, reduced = false, shots = []) {
  if (def.lowerThird)
    return drawLowerThird(ctx, design, t, seconds, pics, reduced);
  const d = { ...design };
  if (def.counter && !reduced)
    d.headline = countTo(design.headline, easeOut(Math.min(1, t / def.counter.seconds)));
  if (def.walk && shots.length > 1) {
    const span = seconds / shots.length;
    const k = Math.min(shots.length - 1, Math.floor(t / span));
    const into = t - k * span;
    const fade = Math.min(0.5, span * 0.3);
    drawDesign(ctx, d, k > 0 && into < fade ? shots[k - 1] : shots[k], icons, brandFonts(), 1, false, motionAt(def, t, reduced));
    if (k > 0 && into < fade)
      drawDesign(ctx, d, shots[k], icons, brandFonts(), 1, false, (n) => n === "window" ? { a: easeOut(into / fade) } : void 0, "window");
    return;
  }
  if (def.marquee)
    d.outlineShift = design.outlineShift + (reduced ? 0 : t / seconds);
  if (def.rows) {
    const total = (d.app.mails ?? "").split("\n").filter(Boolean).length;
    const rows = Math.min(total, Math.max(0, (t - def.rows.start) / def.rows.every));
    const whole2 = Math.floor(rows);
    d.app = { ...d.app, rows: whole2 + easeOut(rows - whole2) };
  }
  drawDesign(ctx, d, pics, icons, brandFonts(), 1, false, motionAt(def, t, reduced));
}
async function* videoFrames(o, pics, shots = []) {
  const { design, def } = videoDesign(o);
  const icons = await loadIcons();
  const count = Math.round(o.seconds * o.fps);
  for (let i = 0; i < count; i++) {
    const s = surface(o.width, o.height);
    drawFrame2(s.ctx, design, def, i / o.fps, o.seconds, pics, icons, o.reduced, shots);
    yield { index: i, rgba: pixelsOf(s).data, png: () => toPng(s, { opaque: !def.transparent }) };
  }
}
async function stillFrame(o, pics, at, shots = []) {
  const { design, def } = videoDesign(o);
  const s = surface(o.width, o.height);
  drawFrame2(s.ctx, design, def, at, o.seconds, pics, await loadIcons(), o.reduced, shots);
  return toPng(s, { opaque: !def.transparent });
}
async function encode(frames, o) {
  for (const out of o.outputs)
    mkdirSync2(dirname3(out.path), { recursive: true });
  const args = ["-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${o.width}x${o.height}`, "-r", String(o.fps), "-i", "-"];
  for (const out of o.outputs) {
    args.push("-map_metadata", "-1", "-fflags", "+bitexact", "-flags:v", "+bitexact");
    if (out.format === "mp4")
      args.push("-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-threads", "1", "-movflags", "+faststart", out.path);
    else if (out.format === "gif")
      args.push("-filter_complex", `fps=${Math.min(o.fps, 15)},scale=${Math.min(o.width, 720)}:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=5`, "-loop", "0", out.path);
    else
      args.push("-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "28", "-pix_fmt", o.alpha ? "yuva420p" : "yuv420p", "-row-mt", "0", "-threads", "1", out.path);
  }
  const ff = spawn("ffmpeg", args, { stdio: ["pipe", "ignore", "pipe"] });
  let err = "";
  ff.stderr.on("data", (d) => err += d);
  const done = new Promise((res) => ff.on("close", (code2) => res(code2 ?? 1)));
  let closed = false;
  ff.stdin.on("error", () => closed = true);
  ff.on("close", () => closed = true);
  for await (const f of frames) {
    if (closed)
      break;
    if (!ff.stdin.write(f))
      await Promise.race([new Promise((r) => ff.stdin.once("drain", r)), done]);
  }
  ff.stdin.end();
  const code = await done;
  if (code !== 0)
    throw new Error(`ffmpeg failed: ${err.trim() || `exit ${code}`}`);
}

// dist/assets/illustrate.js
import { readFileSync as readFileSync11 } from "node:fs";
var doc5;
var illustrateDoc = () => doc5 ??= JSON.parse(readFileSync11(pkgPath("brand", "assets", "illustrate.json"), "utf8"));
var subjects = () => Object.keys(illustrateDoc().subjects);
function illustrateCatalog() {
  const d = illustrateDoc();
  return {
    subjects: subjects().map((id) => ({ id, ...d.subjects[id] })),
    poses: Object.entries(d.poses).map(([id, label]) => ({ id, label })),
    themes: themeNames(),
    sizes: [...imageSizes().map((s) => ({ id: s.id, width: s.width, height: s.height })), { id: "custom", width: 0, height: 0 }],
    defaultSize: "square",
    formats: ["png", "svg", "jpg", "webp"],
    rules: "brand/illustration.md"
  };
}
function planOf(req) {
  const id = pick("subject", req.subject, subjects());
  const s = illustrateDoc().subjects[id];
  const theme = req.theme ? pick("theme", req.theme, themeNames()) : s.theme;
  if (req.picture && !s.picture)
    throw new Error(`The ${id} subject takes no picture; --image goes with ${subjects().filter((k) => illustrateDoc().subjects[k].picture).join(", ")}.`);
  if (req.pose && id !== "octopus")
    throw new Error("--pose goes with the octopus subject.");
  const size = req.size ? sizeId(req.size) : "square";
  if (size === "custom" && (!req.width || !req.height))
    throw new Error("A custom size needs --width and --height (160 to 4000).");
  if (id === "octopus") {
    const known = imageSizes().find((x) => x.id === size);
    return { kind: "octopus", w: known?.width ?? clampDim(req.width), h: known?.height ?? clampDim(req.height), theme, pose: req.pose ? pick("pose", req.pose, Object.keys(illustrateDoc().poses)) : "sit" };
  }
  const d = designOf({ template: s.layout, theme, size, width: size === "custom" ? req.width : void 0, height: size === "custom" ? req.height : void 0, emphasise: false, picture: !!req.picture, pictureUrl: req.pictureUrl, console: req.console, seed: req.seed });
  return { kind: "scene", design: { ...d, logo: false, foot: false } };
}
function octopusBox(p, pics) {
  const im = pics.get(p.pose);
  const S = Math.min(p.w, p.h);
  const w = S * (p.pose === "sit" ? 0.62 : 0.7);
  const h = w * im.height / im.width;
  return inkBox(p.pose, (p.w - w) / 2, (p.h - h) / 2 - S * 0.03, w);
}
function drawOctopus(ctx, p, pics, svg, bare = false) {
  const t = themes()[p.theme];
  if (!bare) {
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, p.w, p.h);
  }
  const im = pics.get(p.pose);
  const S = Math.min(p.w, p.h);
  const w = S * (p.pose === "sit" ? 0.62 : 0.7);
  const h = w * im.height / im.width;
  ctx.save();
  if (p.pose === "sit" && !svg) {
    const k = Math.max(w, 60) / 281.7;
    const c = (a) => withAlpha(brandColor("shadow"), a);
    ctx.filter = `drop-shadow(0 ${8 * k}px ${8.5 * k}px ${c(0.12)}) drop-shadow(0 ${31 * k}px ${15 * k}px ${c(0.1)}) drop-shadow(0 ${70 * k}px ${21 * k}px ${c(0.05)})`;
  }
  ctx.drawImage(im, (p.w - w) / 2, (p.h - h) / 2 - S * 0.03, w, h);
  ctx.restore();
}
function reefSvg(d, W, H) {
  if (!d.reef)
    return "";
  const R = logoDoc().reef;
  const rw = W * (d.reefScale / 100);
  const rh = rw * R.h / R.w;
  const inner = artBytes("reef").toString("utf8").replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const opacity = Math.round((1 - d.reefFade) * 1e3) / 1e3;
  return `<svg x="${r22(W * 0.5 - rw / 2)}" y="${r22(H - rh * (1 - d.reefDrop))}" width="${r22(rw)}" height="${r22(rh)}" viewBox="0 0 ${R.w} ${R.h}" overflow="visible"><g opacity="${opacity}">${inner}</g></svg>`;
}
var r22 = (n) => String(Math.round(n * 100) / 100);
async function renderIllustration(req, opts = { png: true }) {
  const plan = planOf(req);
  const W = plan.kind === "scene" ? plan.design.size === "custom" ? plan.design.w : imageSizes().find((s) => s.id === plan.design.size).width : plan.w;
  const H = plan.kind === "scene" ? plan.design.size === "custom" ? plan.design.h : imageSizes().find((s) => s.id === plan.design.size).height : plan.h;
  const theme = plan.kind === "scene" ? plan.design.theme : plan.theme;
  const pics = await picturesFor(req.picture ?? null);
  const icons = await loadIcons();
  const scale = opts.scale ?? 1;
  const out = { width: Math.round(W * scale), height: Math.round(H * scale), subject: req.subject, theme, layers: [] };
  if (plan.kind === "scene")
    out.layers = (await measureDesign(plan.design, pics)).layers;
  else
    out.layers = [{ id: "art", kind: "art", box: octopusBox(plan, pics), can: {} }];
  if (opts.png !== false || opts.jpg || opts.webp) {
    const s = surface(W, H, { scale });
    if (plan.kind === "scene")
      drawDesign(s.ctx, plan.design, pics, icons, brandFonts(), scale);
    else
      drawOctopus(s.ctx, plan, pics, false);
    if (opts.png !== false)
      out.png = toPng(s);
    if (opts.jpg)
      out.jpg = toJpg(s);
    if (opts.webp)
      out.webp = toWebp(s);
  }
  if (opts.svg) {
    const bg = `<rect width="${W}" height="${H}" fill="${themes()[theme].bg}"/>`;
    if (plan.kind === "scene")
      out.svg = (await designSvg({ ...plan.design, reef: false }, pics, reefSvg(plan.design, W, H))).replace(/<\?xml[^>]*>\s*/, "");
    else {
      const s = surface(W, H, { svg: true });
      drawOctopus(s.ctx, plan, await svgPictures(pics, Math.max(W, H)), true, true);
      out.svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bg}${toSvg(s).replace(/^[\s\S]*?<svg/, '<svg x="0" y="0"')}</svg>
`;
    }
  }
  return out;
}
export {
  PX_PER_IN,
  TEMPLATES,
  appStart,
  artImage,
  brandColor,
  brandFonts,
  carouselDesigns,
  compactSvg,
  deckCatalog,
  designOf,
  designStart,
  designSvg,
  display,
  drawApp,
  drawDesign,
  drawFitted,
  drawItem2 as drawItem,
  drawSlide,
  easeOut,
  emphasise,
  encode,
  encodePng,
  findItem,
  fit2 as fit,
  frameOf,
  hasFfmpeg,
  hatchLines,
  illustrateCatalog,
  imageCatalog,
  imageDoc,
  imageSizes,
  imagesToPdf,
  layoutFor,
  loadIcons,
  logoDoc,
  measureDesign,
  merchCatalog,
  merchItems,
  num,
  occasionNames,
  pick,
  picturesFor,
  pixelsOf,
  readPicture,
  renderDesign,
  renderIllustration,
  renderItem,
  renderSlide,
  scratch,
  setFont,
  sizeId,
  slideTypes,
  stableIds,
  stillFrame,
  subjects,
  suggest,
  surface,
  themeNames,
  themes,
  tileWords,
  toPng,
  toSvg,
  tokenColor,
  unknown,
  videoCatalog,
  videoFrames,
  videoTemplates,
  withAlpha,
  wordmarkPath,
  wrap,
  write
};
