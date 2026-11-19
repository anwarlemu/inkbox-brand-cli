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
  const rgb = raw.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[/,]\s*([\d.]+))?/);
  if (!rgb)
    return void 0;
  const hex = [rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("").toUpperCase();
  return rgb[4] === void 0 ? `#${hex}` : `#${hex}${Math.round(Number(rgb[4]) * 255).toString(16).padStart(2, "0").toUpperCase()}`;
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
  const doc5 = JSON.parse(readFileSync2(pkgPath("brand", "fonts", "fonts.json"), "utf8"));
  for (const face of [doc5.sans, doc5.mono])
    for (const file of Object.values(face.files))
      GlobalFonts.registerFromPath(pkgPath("brand", "fonts", file), face.family);
  fonts = { sans: `"${doc5.sans.family}"`, mono: `"${doc5.mono.family}"` };
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
  const px = pixelsOf(s);
  if (!opts.opaque)
    return encodePng(px.data, px.width, px.height, 4, opts.dpi);
  const rgb = Buffer.alloc(px.width * px.height * 3);
  for (let i = 0, j = 0; i < px.data.length; i += 4, j += 3) {
    rgb[j] = px.data[i];
    rgb[j + 1] = px.data[i + 1];
    rgb[j + 2] = px.data[i + 2];
  }
  return encodePng(rgb, px.width, px.height, 3, opts.dpi);
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
  return svg.replace(/(id="|#)([a-z]+_[0-9a-f]+)(?=[")])/g, (whole, pre, id) => map.has(id) ? `${pre}${map.get(id)}` : whole);
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
    themeCache[id] = { ...t, bg: tokenColor(t.bg), ink, muted: ink, line: tokenColor(t.line), tile: tokenColor(t.tile), border: tokenColor(t.border) };
  }
  return themeCache;
}
var themeNames = () => Object.keys(imageDoc().themes);
var highlightNames = () => Object.keys(imageDoc().highlights);
var highlightColor = (name) => tokenColor(imageDoc().highlights[name]?.color ?? "");
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
  const doc5 = logoDoc();
  const file = id === "reef" ? doc5.reef.file : doc5.art[id]?.file ?? id;
  const im = await loadImage(readFileSync3(pkgPath("brand", "assets", file)));
  art.set(id, im);
  return im;
}
function artBytes(id) {
  const doc5 = logoDoc();
  const file = id === "reef" ? doc5.reef.file : doc5.art[id]?.file ?? id;
  return readFileSync3(pkgPath("brand", "assets", file));
}

// dist/assets/share.js
import { Path2D as Path2D3 } from "@napi-rs/canvas";

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
  const openW = APP_W - x3;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, APP_W, APP_H);
  if (cols[1]) {
    ctx.fillStyle = C.side;
    ctx.fillRect(x1, 0, 156, APP_H);
  }
  ctx.fillStyle = C.line;
  for (const x of [x1, x2, x3])
    if (x > 0 && x < APP_W)
      ctx.fillRect(x - 0.27, 0, 0.54, APP_H);
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
  const mails = parseMails(a.mails);
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
  if (a.showOpen && openW > 40) {
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
var TEMPLATES = ["tile", "app", "outline", "hatch", "reef", "feature", "partner", "funding", "announce", "card"];
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
var clampDim = (n) => Math.round(Math.min(4e3, Math.max(160, n || 0)));
function frameOf(d) {
  const s = imageDoc().sizes[d.size];
  return s ? { w: s.w, h: s.h } : { w: clampDim(d.w), h: clampDim(d.h) };
}
function unitOf(d) {
  const { w, h } = frameOf(d);
  return Math.sqrt(w * h / (1200 * 630));
}
var WM = () => logoDoc().wordmark;
var LOCKUP = () => logoDoc().lockup;
function panelWidth(cols, tile, u) {
  const tw = tile * WM().w / WM().h;
  const gx = tile * (18.43 / 51.61);
  return (24 + cols * tw + (cols - 1) * gx + 2) * u;
}
var sit = (x, y, size, extra = {}) => ({ src: "sit", x, y, size, rotate: 0, shadow: true, auto: true, ...extra });
var hang = (x, y, size, onWindow = false) => ({ src: "hang", x, y, size, rotate: 0, shadow: false, onWindow, auto: true });
var BARE = { pattern: "none", outline: false, hatch: "none", guides: false, reef: false, frame: "none", window: "none", logo: false };
function layoutFor(t, at) {
  const { w: W, h: H } = frameOf(at);
  const u = unitOf(at);
  const S = Math.min(W, H);
  const wide = W / H >= 1.4;
  const banner = W / H >= 2.4;
  const ultra = W / H > 4;
  const tall = H / W > 1.15;
  const squareish = !wide && !tall;
  const m = (banner ? 48 : 40) * u;
  const hk = banner ? Math.min(1, H / (500 * u)) : 1;
  const fx = (px) => px / W;
  const fy = (px) => px / H;
  const lockH = LOCKUP().h;
  const lockBL = { logoX: fx(m), logoY: fy(H - m - lockH * u), logoAnchor: "left" };
  const base = {
    ...at,
    ...BARE,
    tracking: -10,
    leading: 1,
    badgeScale: 100,
    bodyScale: 100,
    textFit: 0,
    winFollow: false,
    winGap: 40,
    textMiddle: false,
    badgeAt: "words",
    foot: false,
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
    logoGap: 100
  };
  switch (t) {
    case "tile": {
      const side = tall || squareish ? "bottom" : "right";
      const cols = banner ? 3 : 2;
      const pw = panelWidth(cols, 51.6, u);
      const panelTop = tall ? 0.52 : squareish ? 0.5 : 0;
      return {
        ...base,
        align: "left",
        textX: fx(m),
        textY: fy(m),
        textSize: (banner ? 56 : 61.4) * hk,
        textWidth: side === "bottom" ? 0.84 : Math.min(0.5, (W - pw - m * 3) / W),
        textFit: side === "bottom" ? panelTop - 0.04 : banner ? 0.9 : fy(H - m - lockH * u - 24 * u),
        badge: "pill",
        pattern: "panel",
        panelSide: side,
        panelCols: cols,
        panelTop,
        tileSize: 51.6,
        tileStrength: 100,
        tileStagger: false,
        panelBorder: true,
        logo: !banner,
        ...lockBL,
        logoSize: lockH,
        stickers: [side === "bottom" ? sit(0.62, (panelTop + 1) / 2, tall ? 0.55 : 0.42) : sit(fx(W - m - pw / 2), 0.5, Math.min(0.568 * pw, 0.62 * H) / S)]
      };
    }
    case "app": {
      const inset = (banner ? 120 : tall ? 40 : 80) * u;
      const winW = (W - 2 * inset) / W;
      return {
        ...base,
        align: "left",
        textX: fx(inset + 20 * u),
        textY: fy(39 * u * hk),
        textSize: (banner ? 50 : 61.4) * hk,
        textWidth: banner ? 0.45 : wide ? 0.56 : 0.6,
        textFit: banner ? 0.5 : tall ? 0.4 : 0.55,
        badge: "pill",
        guides: true,
        guideInset: inset / u,
        reef: true,
        reefScale: tall ? 260 : 100,
        window: "app",
        winFollow: true,
        winGap: banner ? 24 * hk : tall ? 120 : 60,
        winX: 0.5,
        winY: fy(263 * u),
        winW,
        winRatio: tall ? 1.25 : squareish ? 0.8 : APP_H / APP_W,
        winRadius: 10,
        winChrome: false,
        winZoom: tall ? 1.7 : squareish ? 1.25 : 1,
        winPanX: 0,
        winPanY: 0,
        /* Its middle sits 23 units above the window's top edge, as in Figma. */
        stickers: [hang(fx(W - inset - 127 * u * (tall ? 0.95 : 1)), -(23 * u * (tall ? 0.95 : 1) * hk) / H, (tall ? 0.95 : 1) * 286 * u * hk / S, true)]
      };
    }
    case "outline": {
      const size = 188.8 * hk;
      const bottom = H + 9.84 * u * hk;
      const rule = bottom - size * u + size * u * WM().xTop / WM().h;
      const oct = 286 * u * hk;
      return {
        ...base,
        align: ultra ? "left" : "center",
        textX: ultra ? fx(m * 2) : 0.5,
        textY: fy(84 * u * hk),
        textSize: (banner ? 71.5 : 66) * hk,
        textWidth: ultra ? 0.6 : banner ? 0.6 : 0.86,
        textFit: ultra ? 0.62 : fy(rule - oct * 0.42),
        badge: "pill",
        outline: true,
        outlineSize: size,
        outlineY: fy(bottom),
        outlineShift: 0,
        outlineRule: true,
        hatch: "sides",
        hatchGap: 19,
        sideWidth: 32,
        hatchY: 0.66,
        stickers: [hang(ultra ? 0.84 : 0.503, fy(rule - 22 * u * hk), oct / S)]
      };
    }
    case "hatch": {
      const floor = H - 167 * u * hk;
      return {
        ...base,
        align: "right",
        textX: fx(W - 60 * u),
        textY: fy(80 * u * hk),
        textSize: (banner ? 56.2 : 61.4) * hk,
        textWidth: banner ? 0.45 : 0.62,
        textFit: fy(floor - 20 * u),
        badge: "pill",
        hatch: "floor",
        hatchY: fy(floor),
        hatchGap: 19,
        sideWidth: 32,
        stickers: [hang(fx(W - 143 * u * hk), fy(floor - 23 * u * hk), 286 * u * hk / S)]
      };
    }
    case "reef": {
      const oct = banner ? 0.42 * H : (tall ? 0.52 : 0.4) * S;
      const cy = banner ? 0.62 : 0.6;
      return {
        ...base,
        align: ultra ? "left" : "center",
        textX: ultra ? fx(m * 2) : 0.5,
        textY: fy(banner ? 50 * u * hk : tall ? 140 * u : 70 * u),
        textSize: (banner ? 54 : 66) * hk,
        textWidth: banner ? 0.6 : 0.84,
        textFit: ultra ? 0.85 : cy - oct * 0.42 / H,
        badge: "pill",
        reef: true,
        reefScale: banner ? 100 : tall ? 260 : 120,
        logo: !banner,
        ...lockBL,
        logoSize: lockH,
        stickers: [sit(ultra ? 0.84 : 0.5, cy, oct / S)]
      };
    }
    case "feature": {
      const fw = tall ? 26 : 22;
      return {
        ...base,
        align: "center",
        textX: 0.5,
        textY: fy(fw * u + (tall ? 120 : banner ? 30 * hk : 64) * u),
        textSize: (tall ? 74 : wide ? 54 : 64) * hk,
        textWidth: banner ? 0.6 : 0.82,
        textFit: banner ? 0.6 : tall ? 0.42 : 0.5,
        badge: "pill",
        frame: "hatch",
        frameWidth: fw * hk,
        frameRadius: 18 * hk,
        frameTone: "lilac",
        window: "app",
        winFollow: true,
        winGap: (tall ? 90 : banner ? 20 : 44) * hk,
        winX: 0.5,
        winY: 0.42,
        winW: tall ? 0.92 : banner ? 0.6 : wide ? 0.78 : 0.9,
        winRatio: tall ? 1.3 : APP_H / APP_W,
        winRadius: 12,
        winChrome: true,
        winZoom: tall ? 1.55 : 1.15,
        winPanX: tall ? 0.18 : 0,
        winPanY: 0,
        stickers: []
      };
    }
    case "partner":
      return {
        ...base,
        align: "center",
        textX: 0.5,
        textY: banner ? 0.5 : tall ? 0.52 : 0.5,
        textSize: (tall ? 70 : wide ? 52 : 60) * hk,
        textWidth: 0.8,
        textFit: 0.94,
        badge: "pill",
        pattern: "full",
        panelSide: "right",
        panelCols: 2,
        panelTop: 0,
        tileSize: 51.6 * hk,
        tileStrength: 55,
        tileStagger: true,
        panelBorder: false,
        frame: "line",
        frameWidth: 30 * hk,
        frameRadius: 20 * hk,
        frameTone: "lilac",
        logo: true,
        logoSize: 60 * hk,
        logoX: 0.5,
        logoY: banner ? 0.18 : tall ? 0.36 : wide ? 0.25 : 0.3,
        logoAnchor: "center",
        stickers: []
      };
    case "funding": {
      const oct = (tall ? 380 : 300) * u * hk;
      const octY = H - (banner ? 120 : 160) * u * hk;
      return {
        ...base,
        align: ultra ? "left" : "center",
        textX: ultra ? fx(m * 2) : 0.5,
        textY: fy((tall ? 200 : banner ? 40 : 70) * u * hk),
        textSize: (tall ? 120 : banner ? 64 : wide ? 88 : 96) * hk,
        textWidth: ultra ? 0.6 : 0.86,
        textFit: ultra ? 0.9 : fy(octY - oct * 0.4),
        badge: "pill",
        badgeScale: 130,
        outline: true,
        outlineSize: 188.8 * hk,
        outlineY: fy(H + 9.84 * u * hk),
        outlineShift: 0.2,
        outlineRule: true,
        hatch: "sides",
        hatchGap: 19,
        sideWidth: 32,
        hatchY: 0.66,
        stickers: [hang(ultra ? 0.84 : 0.5, fy(octY), oct / S)]
      };
    }
    case "announce": {
      const inner = m + 34 * u * hk;
      return {
        ...base,
        align: "left",
        textX: fx(inner),
        textY: fy(inner + (banner ? 10 : 70) * u * hk),
        textSize: (tall ? 96 : banner ? 56 : wide ? 72 : 76) * hk,
        textWidth: banner ? 0.6 : 0.78,
        textFit: banner ? 0.86 : fy(H - inner - lockH * u - 40 * u),
        badge: "dot",
        frame: "solid",
        frameWidth: 34 * hk,
        frameRadius: 26 * hk,
        frameTone: "purple",
        logo: true,
        logoX: banner ? fx(W - inner) : fx(inner),
        logoY: banner ? fy(inner) : fy(H - inner - lockH * u),
        logoAnchor: banner ? "right" : "left",
        logoSize: lockH * hk,
        stickers: ultra ? [] : [sit(fx(W - inner - 0.16 * S), fy(H - inner - 0.12 * S), banner ? 0.42 : 0.32)]
      };
    }
    case "card": {
      const mm = Math.min(71 * u, 0.09 * S);
      const q = mm / 98;
      const px = (n) => n * q / u;
      const logoH = 82 * q;
      const footH = 28 * q;
      const top = mm + logoH + 40 * q;
      const bottom = H - mm - footH - 40 * q;
      return {
        ...base,
        align: "left",
        textX: fx(mm),
        textY: fy((top + bottom) / 2 - 4 * q),
        textMiddle: true,
        textSize: px(112),
        textWidth: (W - 2 * mm) / W,
        textFit: Math.max(0.2, (bottom - top) / H),
        tracking: -28,
        leading: 1.036,
        headFont: "plex",
        headWeight: 600,
        bodyFont: "plex",
        bodyWeight: 400,
        bodyScale: 111,
        bodyLeading: 1.41,
        bodyGap: 37,
        bodyAlpha: 100,
        bodyWidth: banner ? 0 : 0.876 * (W - 2 * mm) / W,
        badge: "solid",
        badgeAt: "corner",
        badgeX: fx(W - mm),
        badgeY: fy(mm + 41 * q),
        badgeScale: 100 * 26 * q / (19 * u),
        badgeFont: "mono",
        badgeWeight: 600,
        badgeTracking: 80,
        logo: true,
        logoX: fx(mm),
        logoY: fy(mm + 22 * q),
        logoAnchor: "left",
        logoSize: px(68.7),
        logoMark: true,
        logoWord: true,
        logoMarkScale: 117,
        logoMarkLift: 21.8,
        logoGap: 76,
        foot: true,
        footSize: px(28),
        footInset: px(98),
        stickers: []
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
    badge: s.badge ?? "pill",
    badgeText: s.badgeText ?? "",
    badgeScale: 100,
    headline: s.headline ?? "",
    body: "",
    credit: "",
    align: "left",
    textX: 0.033,
    textY: 0.064,
    textSize: 61.4,
    textWidth: 0.47,
    tracking: -10,
    leading: 1,
    bodyScale: 100,
    textFit: 0,
    textMiddle: false,
    badgeAt: "words",
    badgeX: 0.95,
    badgeY: 0.08,
    foot: false,
    footLeft: s.footLeft ?? "",
    footIcon: s.footIcon ?? "none",
    footRight: s.footRight ?? "",
    logo: true,
    logoX: 0.033,
    logoY: 0.863,
    logoSize: 46.08,
    logoAnchor: "left",
    partnerName: "",
    pattern: "none",
    panelSide: "right",
    panelCols: 2,
    panelTop: 0,
    tileSize: 51.6,
    tileStrength: 100,
    tileStagger: false,
    panelBorder: true,
    outline: false,
    outlineSize: 188.8,
    outlineY: 1.02,
    outlineShift: 0,
    outlineRule: true,
    hatch: "none",
    hatchY: 0.66,
    hatchGap: 19,
    sideWidth: 32,
    guides: false,
    guideInset: 80,
    reef: false,
    reefScale: 100,
    reefFade: themes().paper.reefFade,
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
    winChrome: false,
    winUrl: s.winUrl ?? "",
    winZoom: 1,
    winPanX: 0,
    winPanY: 0,
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
    footInset: 56
  };
}
var STAR = "\0";
function parseLine(line) {
  const out = [];
  let hi = false;
  line = line.replaceAll("\\*", STAR);
  for (const [i, chunk2] of line.split("*").entries()) {
    if (i > 0)
      hi = !hi;
    for (const b of chunk2.split(/(\s+)/)) {
      if (!b)
        continue;
      if (/^\s+$/.test(b)) {
        if (out.length)
          out[out.length - 1].space = true;
      } else
        out.push({ text: b.replaceAll(STAR, "*"), hi, space: false });
    }
  }
  return out;
}
function wrapWords(ctx, words, max) {
  const space = ctx.measureText(" ").width;
  const lines = [];
  let cur = [];
  let w = 0;
  for (const wd of words) {
    const ww = ctx.measureText(wd.text).width;
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
  if (cur.length || !lines.length)
    lines.push({ words: cur, w });
  return lines;
}
function plainLines(ctx, s, max) {
  return s.split("\n").flatMap((l) => wrapWords(ctx, parseLine(l), max)).map((l) => ({ text: l.words.map((w) => w.text).join(" "), w: l.w }));
}
function baselineIn(ctx, lineTop, size, lh) {
  const m = ctx.measureText("Hg");
  const asc = m.fontBoundingBoxAscent || size * 0.9;
  const desc = m.fontBoundingBoxDescent || size * 0.22;
  return lineTop + (size * lh - (asc + desc)) / 2 + asc;
}
function colorsOf2(d) {
  const t = themes()[d.theme];
  return { bg: t.bg, ink: t.ink, line: t.line, tile: t.tile, border: t.border, hi: highlightColor(d.highlight), dark: t.dark, tileAlpha: t.tileAlpha };
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
function tileWords(ctx, r, tile, u, stagger, startX, startY) {
  const th = tile * u;
  const k = th / WM().h;
  const tw = WM().w * k;
  const gx = th * (18.43 / 51.61);
  const gy = th * (10 / 51.61);
  const path = wordmarkPath();
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  let row = 0;
  for (let y = startY; y < r.y + r.h; y += th + gy, row++) {
    const off = stagger && row % 2 ? (tw + gx) / 2 : 0;
    let x = startX - off;
    while (x > r.x)
      x -= tw + gx;
    for (; x < r.x + r.w; x += tw + gx) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(k, k);
      ctx.fill(path);
      ctx.restore();
    }
  }
  ctx.restore();
}
function drawLockup(ctx, d, u, ink, pics, fonts2) {
  if (!d.logo || !d.logoMark && !d.logoWord)
    return null;
  const L = LOCKUP();
  const { w: W, h: H } = frameOf(d);
  const k = d.logoSize * u / L.h;
  const color = ink;
  const ms = (d.logoMarkScale ?? 100) / 100;
  const markW = d.logoMark ? L.mark.w * k * ms : 0;
  const wordGap = d.logoMark && d.logoWord ? (L.word.x - L.mark.w) * k * (d.logoGap / 100) : 0;
  const wordW = d.logoWord ? L.word.w * k : 0;
  const lw = markW + wordGap + wordW;
  const lh = L.h * k;
  const pname = d.partnerName.trim();
  const hasPartner = !!pname;
  const gap = 26 * k;
  const times = 16 * k;
  let pw = 0;
  if (pname) {
    ctx.font = `600 ${lh * 0.72}px ${fonts2.sans}`;
    ctx.letterSpacing = "0px";
    pw = ctx.measureText(pname).width;
  }
  const total = hasPartner ? lw + gap * 2 + times + pw : lw;
  const x = d.logoAnchor === "left" ? d.logoX * W : d.logoAnchor === "center" ? d.logoX * W - total / 2 : d.logoX * W - total;
  const y = d.logoY * H;
  const mark = pics.get("sit");
  const mh = L.mark.h * k * ms;
  const my = y + lh / 2 - mh / 2 - (d.logoMarkLift ?? 0) / 100 * lh;
  if (d.logoMark && mark)
    ctx.drawImage(mark, x, my, markW, mh);
  if (d.logoWord) {
    ctx.save();
    ctx.translate(x + markW + wordGap, y + L.word.y * k);
    ctx.scale(k, k);
    ctx.fillStyle = color;
    ctx.fill(wordmarkPath());
    ctx.restore();
  }
  if (hasPartner) {
    let px = x + lw + gap;
    const cy = y + lh / 2;
    const cx = px + times / 2;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2.2 * k;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - times / 2, cy - times / 2);
    ctx.lineTo(cx + times / 2, cy + times / 2);
    ctx.moveTo(cx + times / 2, cy - times / 2);
    ctx.lineTo(cx - times / 2, cy + times / 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    px = cx + times / 2 + gap;
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = `600 ${lh * 0.72}px ${fonts2.sans}`;
    ctx.fillText(pname, px, cy + lh * 0.03);
  }
  const top = d.logoMark ? Math.min(y, my) : y;
  const bottom = d.logoMark ? Math.max(y + lh, my + mh) : y + lh;
  return { x, y: top, w: total, h: bottom - top };
}
function drawBadge(ctx, d, x, y, size, ink, hi, dark, fonts2, measureOnly, bg) {
  if (d.badge === "none" || !d.badgeText.trim())
    return { w: 0, h: 0 };
  const fs = size;
  const sq = fs * 1.2857;
  const wordInk = d.badge === "solid" ? bg : ink;
  const face = faceOf(fonts2, d.badgeFont);
  const track = d.badgeTracking / 1e3 * fs;
  ctx.font = `${d.badgeWeight} ${fs}px ${face}`;
  ctx.letterSpacing = `${track}px`;
  const tw = ctx.measureText(d.badgeText).width - (track > 0 ? track : 0);
  ctx.letterSpacing = "0px";
  const words = (x2, y2) => {
    ctx.font = `${d.badgeWeight} ${fs}px ${face}`;
    ctx.letterSpacing = `${track}px`;
    ctx.fillStyle = wordInk;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(d.badgeText, x2, y2 + fs * 0.04);
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
      ctx.fillStyle = dark ? brandColor("pillFillDark") : brandColor("pillFill");
      ctx.strokeStyle = dark ? brandColor("pillStrokeDark") : brandColor("pillStroke");
      ctx.lineWidth = Math.max(1, fs * 0.06);
      ctx.beginPath();
      ctx.roundRect(x, y, w2, h, h / 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = hi || brandColor("pink");
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
    ctx.fillStyle = hi || brandColor("pink");
    ctx.beginPath();
    ctx.arc(x + r, y + sq / 2, r, 0, Math.PI * 2);
    ctx.fill();
    words(x + r * 2 + fs * 0.55, y + sq / 2);
  }
  return { w, h: sq };
}
function drawWords(ctx, d, size, ink, hiColor, dark, fonts2, dry = false) {
  const { w: W, h: H } = frameOf(d);
  const maxW = d.textWidth * W;
  const lh = d.leading;
  const ax = d.textX * W;
  let y = d.textY * H;
  const top = y;
  const xFor = (w) => d.align === "left" ? ax : d.align === "center" ? ax - w / 2 : ax - w;
  const badgeSize = size * 0.3046 * (d.badgeScale / 100);
  const bg = colorsOf2(d).bg;
  const b = d.badgeAt === "corner" ? { w: 0, h: 0 } : drawBadge(ctx, d, 0, 0, badgeSize, ink, hiColor, dark, fonts2, true, bg);
  let widest = b.w;
  if (b.w) {
    if (!dry)
      layer(ctx, "badge", xFor(b.w) + b.w / 2, y + b.h / 2, () => drawBadge(ctx, d, xFor(b.w), y, badgeSize, ink, hiColor, dark, fonts2, false, bg));
    y += b.h + size * (d.badgeGap / 100);
  }
  const headInk = ink;
  ctx.font = `${d.headWeight} ${size}px ${faceOf(fonts2, d.headFont)}`;
  ctx.letterSpacing = `${d.tracking / 1e3 * size}px`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const hi = hiColor || headInk;
  const lines = d.headline.split("\n").flatMap((l) => wrapWords(ctx, parseLine(l), maxW));
  const space = ctx.measureText(" ").width;
  lines.forEach((line, li) => {
    let x = xFor(line.w);
    widest = Math.max(widest, line.w);
    if (!dry) {
      const base = baselineIn(ctx, y, size, lh);
      layer(ctx, `line:${li}`, x + line.w / 2, y + size * lh / 2, () => line.words.forEach((wd, i) => {
        const ww = ctx.measureText(wd.text).width;
        ctx.fillStyle = wd.hi ? hi : headInk;
        ctx.fillText(wd.text, x, base);
        x += ww + (i < line.words.length - 1 ? space : 0);
      }));
    }
    y += size * lh;
  });
  ctx.letterSpacing = "0px";
  if (d.body.trim()) {
    const bs = size * 0.34 * (d.bodyScale / 100);
    const bw = d.bodyWidth > 0 ? d.bodyWidth * W : maxW;
    y += size * (d.bodyGap / 100);
    ctx.font = `${d.bodyWeight} ${bs}px ${faceOf(fonts2, d.bodyFont)}`;
    ctx.fillStyle = ink;
    ctx.globalAlpha = d.bodyAlpha / 100;
    for (const l of plainLines(ctx, d.body, bw)) {
      widest = Math.max(widest, l.w);
      if (!dry)
        layer(ctx, "body", xFor(l.w) + l.w / 2, y, () => ctx.fillText(l.text, xFor(l.w), baselineIn(ctx, y, bs, d.bodyLeading)));
      y += bs * d.bodyLeading;
    }
    ctx.globalAlpha = 1;
  }
  const credit = (d.credit ?? "").trim();
  const plainHead = d.headline.replace(/\*/g, "").replace(/\s+/g, " ").trim();
  if (credit && credit.toLowerCase() !== plainHead.toLowerCase()) {
    const cs = Math.max(11, size * 0.2);
    y += size * (d.body.trim() ? 0.12 : 0.2);
    ctx.font = `500 ${cs}px ${faceOf(fonts2, d.bodyFont)}`;
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.72;
    const cw = d.bodyWidth > 0 ? d.bodyWidth * W : maxW;
    for (const l of plainLines(ctx, credit, cw)) {
      widest = Math.max(widest, l.w);
      if (!dry)
        layer(ctx, "credit", xFor(l.w) + l.w / 2, y, () => ctx.fillText(l.text, xFor(l.w), baselineIn(ctx, y, cs, 1.15)));
      y += cs * 1.15;
    }
    ctx.globalAlpha = 1;
  }
  return { x: xFor(widest), y: top, w: widest, h: y - top };
}
function fittedSize(ctx, d, u, fonts2) {
  const H = frameOf(d).h;
  let size = d.textSize * u;
  if (d.textFit <= 0)
    return size;
  const limit = d.textMiddle ? d.textFit * H : d.textFit * H - d.textY * H;
  if (limit <= 0)
    return size * 0.4;
  for (let i = 0; i < 6; i++) {
    const r = drawWords(ctx, d, size, "#000", "", false, fonts2, true);
    if (r.h <= limit + 0.5)
      break;
    size = Math.max(d.textSize * u * 0.4, size * Math.max(0.6, Math.min(0.98, limit / r.h)));
  }
  return size;
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
function drawWindow(ctx, d, u, pics, icons, fonts2, line, top) {
  if (d.window === "none")
    return null;
  const { w: W } = frameOf(d);
  const ww = d.winW * W;
  const pic = d.window === "picture" ? pics.get("picture") : void 0;
  const ratio = d.winRatio > 0 ? d.winRatio : pic ? ih(pic) / iw(pic) : APP_H / APP_W;
  const chrome = d.winChrome ? 30 * (ww / 1040) : 0;
  const wh = ww * ratio + chrome;
  const x = d.winX * W - ww / 2;
  const y = top;
  const r = d.winRadius * u;
  const bg = brandColor("window");
  ctx.save();
  ctx.save();
  ctx.shadowColor = withAlpha(brandColor("shadow"), 0.16);
  ctx.shadowBlur = 40 * u;
  ctx.shadowOffsetY = 14 * u;
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
    const k = ww / 1040;
    ctx.fillStyle = brandColor("chrome");
    ctx.fillRect(x, y, ww, chrome);
    brandColors("chromeDots").forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x + (16 + i * 13) * k, y + chrome / 2, 4.2 * k, 0, Math.PI * 2);
      ctx.fill();
    });
    if (d.winUrl.trim()) {
      const bw = Math.min(300 * k, ww * 0.4);
      ctx.fillStyle = brandColor("chromeUrl");
      ctx.beginPath();
      ctx.roundRect(x + ww / 2 - bw / 2, y + chrome * 0.2, bw, chrome * 0.6, chrome * 0.3);
      ctx.fill();
      ctx.fillStyle = brandColor("chromeUrlInk");
      ctx.font = `400 ${8.4 * k}px ${fonts2.sans}`;
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
  const zoom = Math.max(0.3, d.winZoom);
  if (d.window === "app") {
    const s = ww / APP_W * zoom;
    const vw = ww / s;
    const vh = (wh - chrome) / s;
    const ox = (APP_W - vw) * d.winPanX * (vw < APP_W ? 1 : 0);
    const oy = Math.max(0, APP_H - vh) * d.winPanY;
    ctx.translate(x, y + chrome);
    ctx.scale(s, s);
    ctx.translate(-ox, -oy);
    drawApp(ctx, d.app, icons, fonts2, pics.get("sit") ?? null);
  } else if (pic) {
    const bw = ww;
    const bh = wh - chrome;
    const cover = Math.max(bw / iw(pic), bh / ih(pic)) * zoom;
    const dw = iw(pic) * cover;
    const dh = ih(pic) * cover;
    ctx.drawImage(pic, x - (dw - bw) * d.winPanX, y + chrome - (dh - bh) * d.winPanY, dw, dh);
  } else {
    ctx.fillStyle = brandColor("windowEmpty");
    ctx.fillRect(x, y + chrome, ww, wh - chrome);
  }
  ctx.restore();
  ctx.strokeStyle = line;
  ctx.lineWidth = Math.max(0.5, u);
  ctx.beginPath();
  ctx.roundRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, ww - ctx.lineWidth, wh - ctx.lineWidth, r);
  ctx.stroke();
  ctx.restore();
  return { x, y, w: ww, h: wh };
}
function windowTop(d, words, u) {
  return d.winFollow ? words.y + words.h + d.winGap * u : d.winY * frameOf(d).h;
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
      tileWords(ctx, { x: 0, y: 0, w: W, h: H }, Math.max(8, d.frameWidth * 0.7), u, true, 0, fw * 0.15);
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
var FOOT_ICONS = {
  x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  linkedin: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.114 20.452H3.558V9h3.556v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
};
function drawFoot(ctx, d, u, W, H, ink, fonts2) {
  const fs = d.footSize * u;
  const inset = d.footInset * u;
  const mid = H - inset - fs * 0.5;
  ctx.save();
  ctx.fillStyle = ink;
  ctx.font = `${d.footWeight} ${fs}px ${fonts2.mono}`;
  ctx.letterSpacing = "0px";
  ctx.textBaseline = "middle";
  let x = inset;
  if (d.footIcon !== "none" && d.footLeft.trim()) {
    const ih2 = fs * 0.98;
    ctx.save();
    ctx.translate(x, mid - ih2 / 2);
    ctx.scale(ih2 / 24, ih2 / 24);
    ctx.fill(new Path2D3(FOOT_ICONS[d.footIcon]));
    ctx.restore();
    x += ih2 * 0.95 + fs * 0.42;
  }
  ctx.textAlign = "left";
  if (d.footLeft.trim())
    ctx.fillText(d.footLeft, x, mid);
  ctx.textAlign = "right";
  if (d.footRight.trim())
    ctx.fillText(d.footRight, W - inset, mid);
  ctx.restore();
}
function drawReef(ctx, d, reef, W, H, u, bg, px) {
  const R = logoDoc().reef;
  const rw = W * (d.reefScale / 100);
  const rh = rw * R.h / R.w;
  const off = scratch(Math.max(1, Math.round(rw * px)), Math.max(1, Math.round(rh * px)));
  const o = off.ctx;
  o.drawImage(reef, 0, 0, off.canvas.width, off.canvas.height);
  if (d.reefFade > 0) {
    o.globalCompositeOperation = "source-atop";
    o.globalAlpha = d.reefFade;
    o.fillStyle = bg;
    o.fillRect(0, 0, off.canvas.width, off.canvas.height);
  }
  ctx.drawImage(off.canvas, W * 0.5 - rw / 2, H - rh, rw, rh);
  void u;
}
function drawDesign(ctx, d, pics, icons, fonts2, px = 1, svg = false, move) {
  motion = move;
  const { w: W, h: H } = frameOf(d);
  const u = unitOf(d);
  const S = Math.min(W, H);
  const C = colorsOf2(d);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.letterSpacing = "0px";
  ctx.save();
  ctx.fillStyle = C.bg;
  if (!d.bare)
    ctx.fillRect(0, 0, W, H);
  const reef = pics.get("reef");
  if (d.reef && reef)
    drawReef(ctx, d, reef, W, H, u, C.bg, px);
  if (d.pattern !== "none") {
    const alpha = Math.min(1, C.tileAlpha * (d.tileStrength / 100));
    const th = d.tileSize * u;
    if (d.pattern === "full") {
      ctx.fillStyle = C.tile;
      ctx.globalAlpha = alpha;
      tileWords(ctx, { x: 0, y: 0, w: W, h: H }, d.tileSize, u, d.tileStagger, 0, -th * 0.4);
    } else {
      let r;
      const m = 40 * u;
      if (d.panelSide === "bottom") {
        const top = d.panelTop * H;
        r = { x: m, y: top, w: W - 2 * m, h: H - top + 2 - m };
      } else {
        const pw = panelWidth(d.panelCols, d.tileSize, u);
        r = { x: d.panelSide === "right" ? W - m - pw : m, y: -22 * u, w: pw, h: H + 44 * u };
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      ctx.clip();
      ctx.fillStyle = C.tile;
      ctx.globalAlpha = alpha;
      tileWords(ctx, r, d.tileSize, u, d.tileStagger, r.x + 13 * u, r.y + 1 * u);
      ctx.restore();
      ctx.globalAlpha = 1;
      if (d.panelBorder) {
        ctx.strokeStyle = C.border;
        ctx.lineWidth = Math.max(1, u);
        ctx.beginPath();
        ctx.rect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  if (d.outline) {
    const bh = d.outlineSize * u;
    const k = bh / WM().h;
    const bw = WM().w * k;
    const gap = bh * 0.12;
    const bottom = d.outlineY * H;
    const top = bottom - bh;
    const oc = C.line;
    if (d.outlineRule) {
      ctx.fillStyle = oc;
      ctx.fillRect(0, top + WM().xTop * k, W, Math.max(0.5, u));
    }
    let x0 = W / 2 - bw / 2 + d.outlineShift * (bw + gap);
    while (x0 > -bw)
      x0 -= bw + gap;
    for (let x = x0; x < W; x += bw + gap) {
      ctx.save();
      ctx.translate(x, top);
      ctx.scale(k, k);
      ctx.fillStyle = C.bg;
      ctx.fill(wordmarkPath());
      ctx.strokeStyle = oc;
      ctx.lineWidth = 1.3 * u / k;
      ctx.stroke(wordmarkPath());
      ctx.restore();
    }
  }
  if (d.hatch !== "none") {
    const g = d.hatchGap * u;
    const hc = C.line;
    const lw = Math.max(0.5, u);
    ctx.strokeStyle = hc;
    ctx.lineWidth = lw;
    if (d.hatch === "floor" || d.hatch === "both") {
      const hy = d.hatchY * H;
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, hy, W, H - hy);
      hatchLines(ctx, { x: 0, y: hy, w: W, h: H - hy }, g, 45);
      ctx.fillStyle = hc;
      ctx.fillRect(0, hy, W, lw);
    }
    if (d.hatch === "sides" || d.hatch === "both") {
      const sw = d.sideWidth * u;
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
  }
  if (d.guides) {
    const gi = d.guideInset * u;
    const gw = Math.max(0.5, u);
    ctx.fillStyle = C.line;
    ctx.fillRect(gi, 0, gw, H);
    ctx.fillRect(W - gi - gw, 0, gw, H);
  }
  drawFrame(ctx, d, u, W, H, C.bg);
  const size = fittedSize(ctx, d, u, fonts2);
  let laid = drawWords(ctx, d, size, C.ink, C.hi, C.dark, fonts2, true);
  const dw = d.textMiddle ? { ...d, textY: d.textY - laid.h / 2 / H } : d;
  if (d.textMiddle)
    laid = drawWords(ctx, dw, size, C.ink, C.hi, C.dark, fonts2, true);
  const winTop = d.window === "none" ? null : windowTop(d, laid, u);
  const boxes = new Array(d.stickers.length);
  const item = (s, i) => {
    let box = { x: 0, y: 0, w: 0, h: 0 };
    const cy = s.y * H + (s.onWindow && winTop !== null ? winTop : 0);
    layer(ctx, `sticker:${i}`, s.x * W, cy, () => box = drawItem(ctx, s, pics.get(s.src), S, W, H, winTop, svg));
    return box;
  };
  d.stickers.forEach((s, i) => {
    if (s.behind && !s.hidden)
      boxes[i] = item(s, i);
  });
  let win = null;
  if (winTop !== null)
    layer(ctx, "window", d.winX * W, winTop + d.winW * W * (d.winRatio || APP_H / APP_W) / 2, () => win = drawWindow(ctx, dw, u, pics, icons, fonts2, C.line, winTop));
  const text = drawWords(ctx, dw, size, C.ink, C.hi, C.dark, fonts2);
  let logo2 = null;
  layer(ctx, "lockup", d.logoX * W, d.logoY * H, () => logo2 = drawLockup(ctx, d, u, C.ink, pics, fonts2));
  if (d.badgeAt === "corner") {
    const fs = 19 * u * (d.badgeScale / 100);
    const b = drawBadge(ctx, d, 0, 0, fs, C.ink, C.hi, C.dark, fonts2, true, C.bg);
    if (b.w)
      layer(ctx, "badge", d.badgeX * W - b.w / 2, d.badgeY * H, () => drawBadge(ctx, d, d.badgeX * W - b.w, d.badgeY * H - b.h / 2, fs, C.ink, C.hi, C.dark, fonts2, false, C.bg));
  }
  if (d.foot)
    layer(ctx, "foot", W / 2, H, () => drawFoot(ctx, d, u, W, H, C.ink, fonts2));
  d.stickers.forEach((s, i) => {
    if (!s.behind && !s.hidden)
      boxes[i] = item(s, i);
  });
  ctx.restore();
  motion = void 0;
  return { text, logo: logo2, window: win, stickers: boxes };
}

// dist/assets/image.js
import { existsSync as existsSync3, readFileSync as readFileSync5 } from "node:fs";
import { isAbsolute as isAbsolute2, resolve as resolve2 } from "node:path";
import { loadImage as loadImage2 } from "@napi-rs/canvas";

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
  const doc5 = imageDoc();
  const groupOf = (id) => Object.entries(doc5.groups).find(([, g]) => g.sizes.includes(id))?.[0] ?? "post";
  return Object.entries(doc5.sizes).map(([id, s]) => ({ id, group: groupOf(id), label: s.label, width: s.w, height: s.h, aliases: s.aliases }));
}
function sizeId(typed) {
  const t = typed.trim().toLowerCase();
  if (t === "custom")
    return "custom";
  const hit = imageSizes().find((s) => s.id === t || s.aliases.includes(t));
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
function designOf(req) {
  const doc5 = imageDoc();
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
  if (!occasion && template && doc5.templateOccasion[template])
    occasion = doc5.templateOccasion[template];
  const occ = occasion ? doc5.occasions[occasion] : void 0;
  if (!template)
    template = occ?.looks[0]?.template ?? "tile";
  const theme = req.theme ? pick("theme", req.theme, themeNames()) : occ?.looks.find((l) => l.template === template)?.theme ?? occ?.looks[0]?.theme ?? "paper";
  const size = req.size ? sizeId(req.size) : "og";
  if (size === "custom" && (!req.width || !req.height))
    throw new Error("A custom size needs --width and --height (160 to 4000).");
  if (size !== "custom" && (req.width || req.height))
    throw new Error(`--width and --height go with --size custom, not ${size}.`);
  const known = doc5.sizes[size];
  const w = known?.w ?? clampDim(req.width);
  const h = known?.h ?? clampDim(req.height);
  const at = { size, w, h };
  const look = occ?.looks.find((l) => l.template === template && l.theme === theme) ?? occ?.looks.find((l) => l.template === template);
  const words = { ...occ?.words ?? {}, ...look?.words ?? {} };
  const start = designStart();
  let d = {
    ...start,
    ...words,
    theme,
    highlight: words.highlight ?? start.highlight,
    reefFade: themes()[theme].reefFade,
    ...layoutFor(template, at),
    template,
    size,
    w,
    h,
    name: template
  };
  if (words.badge)
    d.badge = words.badge;
  if (words.badgeText)
    d.badgeText = words.badgeText;
  if (words.headline)
    d.headline = words.headline;
  if (words.body !== void 0)
    d.body = words.body;
  if (req.headline !== void 0)
    d.headline = (req.emphasise === false ? req.headline : emphasise(req.headline)).replace(/\\n/g, "\n");
  if (req.body !== void 0)
    d.body = req.body.replace(/\\n/g, "\n");
  if (req.badge)
    d.badge = pick("badge", req.badge, BADGES);
  if (req.badgeText !== void 0)
    d.badgeText = req.badgeText;
  if (req.highlight)
    d.highlight = pick("highlight", req.highlight, highlightNames());
  if (req.partner) {
    d.partnerName = req.partner;
    d.logo = true;
  } else if (req.headline !== void 0)
    d.partnerName = "";
  else if (words.partnerName)
    d.partnerName = String(words.partnerName);
  d.credit = req.credit ?? "";
  if (req.seed !== void 0)
    d = varyLayout(d, req.seed);
  if (req.picture) {
    if (d.window === "none")
      throw new Error(`The ${d.template} template has no window for a picture. Templates with one: ${TEMPLATES.filter((t) => layoutFor(t, at).window !== "none").join(", ")}.`);
    d = { ...d, window: "picture", winUrl: req.pictureUrl ?? d.winUrl, winChrome: true, winZoom: 1, winPanX: 0, winPanY: 0, winRatio: 0 };
  }
  return d;
}
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
function varyLayout(base, seed) {
  const rnd = mulberry(seed);
  const template = TEMPLATES[Math.floor(rnd() * TEMPLATES.length)];
  const laid = layoutFor(template, { size: base.size, w: base.w, h: base.h });
  return {
    ...base,
    ...laid,
    template,
    theme: base.theme,
    highlight: base.highlight,
    reefFade: themes()[base.theme].reefFade,
    headline: base.headline,
    body: base.body,
    credit: base.credit,
    badge: base.badge,
    badgeText: base.badgeText,
    partnerName: base.partnerName,
    size: base.size,
    w: base.w,
    h: base.h,
    app: base.app
  };
}
async function readPicture(cwd, file) {
  const path = isAbsolute2(file) ? file : resolve2(cwd, file);
  if (!existsSync3(path))
    throw new Error(`No picture at ${file}.`);
  try {
    return await loadImage2(readFileSync5(path));
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
async function renderDesign(d, pics, opts = { png: true }) {
  const L = frameOf(d);
  const icons = await loadIcons();
  const fonts2 = brandFonts();
  const scale = opts.scale ?? 1;
  const out = { width: Math.round(L.w * scale), height: Math.round(L.h * scale) };
  if (opts.png !== false) {
    const s = surface(L.w, L.h, { scale });
    drawDesign(s.ctx, d, pics, icons, fonts2, scale);
    out.png = toPng(s);
  }
  if (opts.svg) {
    const s = surface(L.w, L.h, { svg: true });
    drawDesign(s.ctx, d, await svgPictures(pics, Math.max(L.w, L.h)), icons, fonts2, 2, true);
    out.svg = toSvg(s);
  }
  return out;
}
function imageCatalog() {
  const doc5 = imageDoc();
  return {
    templates: TEMPLATES.map((id) => ({ id, name: doc5.templates[id].label, description: doc5.templates[id].description, window: layoutFor(id, { size: "og", w: 1200, h: 630 }).window !== "none" })),
    occasions: occasionNames().map((id) => ({ id, name: doc5.occasions[id].label, words: doc5.occasions[id].words, looks: doc5.occasions[id].looks.map((l) => ({ template: l.template, theme: l.theme, label: l.label })) })),
    groups: Object.entries(doc5.groups).map(([id, g]) => ({ id, label: g.label, sizes: g.sizes })),
    sizes: [...imageSizes(), { id: "custom", group: "post", label: "Custom", width: 0, height: 0, aliases: [], note: "--width and --height, 160 to 4000" }],
    themes: Object.entries(doc5.themes).map(([id, t]) => ({ id, label: t.label, dark: t.dark, bg: t.bg, ink: t.ink })),
    highlights: Object.entries(doc5.highlights).map(([id, h]) => ({ id, label: h.label, color: h.color || null })),
    badges: BADGES,
    slots: ["headline", "body", "credit", "badge-text", "partner"],
    picture: "image: a PNG, JPEG, WebP, GIF or SVG shown in the window (app and feature templates only)",
    seed: "A new on-brand layout for the same words: an integer from 1 to 1000000000; the same seed always rebuilds the same layout.",
    notes: doc5.notes
  };
}

// dist/assets/deck.js
import { readFileSync as readFileSync6 } from "node:fs";
import { Path2D as Path2D4 } from "@napi-rs/canvas";
var doc;
var deckDoc = () => doc ??= JSON.parse(readFileSync6(pkgPath("brand", "assets", "deck.json"), "utf8"));
var slideTypes = () => Object.keys(deckDoc().slides);
function deckCatalog() {
  const d = deckDoc();
  return {
    size: { width: d.width, height: d.height },
    slides: slideTypes().map((id) => ({ id, name: d.slides[id].name, description: d.slides[id].description, template: d.slides[id].template, theme: d.slides[id].theme, slots: d.slides[id].slots, picture: id === "image" })),
    themes: themeNames()
  };
}
function slotsFor(type, given) {
  const def = deckDoc().slides[type].slots;
  const out = { ...def };
  for (const [k, v] of Object.entries(given)) {
    if (["type", "theme", "picture", "image"].includes(k))
      continue;
    if (!(k in def))
      throw new Error(`A ${type} slide does not take "${k}". It takes ${Object.keys(def).map((s) => `"${s}"`).join(", ")}${type === "image" ? ' and "image"' : ""}.`);
    if (Array.isArray(v) && v.every((x) => typeof x === "string"))
      out[k] = v.join(" | ");
    else if (typeof v === "string")
      out[k] = v;
    else
      throw new Error(`A ${type} slide's "${k}" takes text.`);
  }
  return out;
}
function slideDesign(type, slots, theme, picture) {
  const def = deckDoc().slides[type];
  const req = { template: def.template, theme, size: "custom", width: deckDoc().width, height: deckDoc().height, emphasise: false, partner: "" };
  switch (type) {
    case "cover":
      return designOf({ ...req, headline: slots.title, body: slots.body ?? "", badge: "none" });
    case "section": {
      const d = designOf({ ...req, headline: slots.title, body: "", badge: slots.number ? "dot" : "none", badgeText: slots.number ?? "" });
      return { ...d, textSize: d.textSize * 1.6, badgeScale: 150 };
    }
    case "statement":
      return designOf({ ...req, headline: slots.title, body: "", badge: "none" });
    case "stat":
      return designOf({ ...req, headline: `*${(slots.stat ?? "").replace(/\*/g, "")}*`, body: slots.title ?? "", badge: "none" });
    case "quote":
      return designOf({ ...req, headline: `\u201C${(slots.quote ?? "").replace(/^[“"]|[”"]$/g, "")}\u201D`, body: slots.attribution ?? "", badge: "none", highlight: "ink" });
    case "image":
      return designOf({ ...req, headline: slots.title, body: slots.body ?? "", badge: "none", picture, pictureUrl: slots.url });
    case "end":
      return { ...designOf({ ...req, headline: slots.title, body: slots.url ?? "", badge: "none" }), partnerName: "" };
    default:
      throw new Error(`${type} is not a template slide.`);
  }
}
function drawBullets(ctx, slots, theme, pics, fonts2) {
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
  const title = slots.title ?? "";
  let size = 66 * u;
  ctx.font = `600 ${size}px ${fonts2.sans}`;
  ctx.letterSpacing = `${-0.01 * size}px`;
  while (ctx.measureText(title).width > W - left * 2 && size > 40 * u) {
    size -= 2;
    ctx.font = `600 ${size}px ${fonts2.sans}`;
    ctx.letterSpacing = `${-0.01 * size}px`;
  }
  ctx.fillStyle = t.ink;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const top = 120 * u;
  ctx.fillText(title, left, top + size * 0.82);
  ctx.letterSpacing = "0px";
  const cols = items.length > 4 ? 2 : 1;
  const colW = (W - left * 2 - (cols - 1) * 64 * u) / cols;
  const rows = Math.ceil(items.length / cols);
  const pt = 30 * u;
  const check = new Path2D4("M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z");
  const listTop = top + size + 72 * u;
  const textW = colW - pt * 1.7;
  ctx.font = `400 ${pt}px ${fonts2.sans}`;
  const wrapped = items.map((text) => {
    const lines = [];
    let line = "";
    for (const word2 of text.split(/\s+/)) {
      const next = line ? `${line} ${word2}` : word2;
      if (line && ctx.measureText(next).width > textW) {
        lines.push(line);
        line = word2;
      } else
        line = next;
    }
    lines.push(line);
    if (lines.length > 2 || lines.some((l) => ctx.measureText(l).width > textW))
      throw new Error(`The point "${text}" is too long for a bullets slide (two lines of ${Math.round(textW)}px at ${Math.round(pt)}px). Shorten it.`);
    return lines;
  });
  const lockTop = H - 64 * u - logoDoc().lockup.h * u;
  const pitch = Math.min(pt * 1.35 * 2 + pt * 0.9, (lockTop - 48 * u - listTop) / rows);
  wrapped.forEach((lines, i) => {
    const col = Math.floor(i / rows);
    const row = i % rows;
    const x = left + col * (colW + 64 * u);
    const y = listTop + row * pitch;
    ctx.save();
    ctx.translate(x, y - pt * 0.1);
    ctx.scale(pt * 1.2 / 256, pt * 1.2 / 256);
    ctx.fillStyle = t.dark ? brandColor("pink") : brandColor("purple");
    ctx.fill(check);
    ctx.restore();
    ctx.font = `400 ${pt}px ${fonts2.sans}`;
    ctx.fillStyle = t.ink;
    ctx.textBaseline = "middle";
    lines.forEach((l, j) => ctx.fillText(l, x + pt * 1.7, y + pt * 0.5 + j * pt * 1.35));
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
}
async function drawSlide(ctx, slide, opts = {}) {
  const type = pick("slide type", slide.type, slideTypes());
  const slots = slotsFor(type, slide);
  const theme = slide.theme ? pick("theme", slide.theme, themeNames()) : deckDoc().slides[type].theme;
  if (slide.picture && type !== "image")
    throw new Error(`A ${type} slide holds no picture; "image" goes with the image slide.`);
  const pics = opts.pics ?? await picturesFor(slide.picture ?? null);
  const fonts2 = brandFonts();
  if (type === "bullets")
    return drawBullets(ctx, slots, theme, pics, fonts2);
  const d = slideDesign(type, slots, theme, !!slide.picture);
  drawDesign(ctx, d, pics, await loadIcons(), fonts2, opts.px ?? 1, !!opts.svg);
}
async function renderSlide(slide, opts = { png: true }) {
  const { width: W, height: H } = deckDoc();
  const out = { width: W, height: H };
  if (opts.png !== false) {
    const s = surface(W, H);
    await drawSlide(s.ctx, slide);
    out.png = toPng(s, { opaque: true });
    const px = pixelsOf(s).data;
    const rgb = Buffer.alloc(px.length / 4 * 3);
    for (let i = 0, j = 0; i < px.length; i += 4, j += 3) {
      rgb[j] = px[i];
      rgb[j + 1] = px[i + 1];
      rgb[j + 2] = px[i + 2];
    }
    out.rgb = rgb;
  }
  if (opts.svg) {
    const s = surface(W, H, { svg: true });
    const pics = await svgPictures(await picturesFor(slide.picture ?? null), W);
    await drawSlide(s.ctx, slide, { svg: true, px: 1, pics });
    out.svg = toSvg(s);
  }
  return out;
}

// dist/assets/merch.js
import { readFileSync as readFileSync7 } from "node:fs";

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

// dist/assets/merch.js
var PX_PER_IN = 300;
var doc2;
var merchDoc = () => doc2 ??= JSON.parse(readFileSync7(pkgPath("brand", "assets", "merch.json"), "utf8"));
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
  const px = (b) => ({ x: b[0] * PX_PER_IN + o, y: b[1] * PX_PER_IN + o, w: b[2] * PX_PER_IN, h: b[3] * PX_PER_IN });
  const takes = new Set(item.layers.flatMap((l) => l.type === "text" ? [l.slot] : []));
  for (const k of Object.keys(req.slots ?? {}))
    if (!takes.has(k))
      throw new Error(`${item.id} does not draw --${k}.${takes.size ? ` It takes ${[...takes].map((s) => `--${s}`).join(", ")}.` : " It takes no text."}`);
  const slots = { ...merchDoc().slots, ...req.slots };
  const fonts2 = brandFonts();
  const mark = await artImage("sit");
  if (v.groundPrinted && ground) {
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, W, H);
  }
  const u = PX_PER_IN / 60;
  for (const l of item.layers) {
    const b = px(l.box);
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
          tileWords(off.ctx, { x: 0, y: 0, w: r.w, h: r.h }, 51.6, u, true, 0, 0);
          off.ctx.globalCompositeOperation = "destination-in";
          const g = off.ctx.createLinearGradient(0, 0, 0, r.h);
          g.addColorStop(0, "rgba(0,0,0,1)");
          g.addColorStop(1, "rgba(0,0,0,0)");
          off.ctx.fillStyle = g;
          off.ctx.fillRect(0, 0, r.w, r.h);
          ctx.drawImage(off.canvas, r.x, r.y);
        } else
          tileWords(ctx, r, 51.6, u, true, r.x, r.y);
        ctx.restore();
      } else if (l.kind === "outline") {
        const bh = r.h;
        const k = bh / WM2().h;
        const bw = WM2().w * k;
        const gap = bh * 0.12;
        ctx.save();
        ctx.beginPath();
        ctx.rect(r.x, r.y, r.w, r.h);
        ctx.clip();
        ctx.fillStyle = line;
        ctx.fillRect(r.x, r.y + WM2().xTop * k, r.w, Math.max(1, u));
        let x0 = r.x + r.w / 2 - bw / 2;
        while (x0 > r.x - bw)
          x0 -= bw + gap;
        for (let x = x0; x < r.x + r.w; x += bw + gap) {
          ctx.save();
          ctx.translate(x, r.y);
          ctx.scale(k, k);
          if (ground) {
            ctx.fillStyle = ground;
            ctx.fill(wordmarkPath());
          }
          ctx.strokeStyle = line;
          ctx.lineWidth = 1.6 * u / k;
          ctx.stroke(wordmarkPath());
          ctx.restore();
        }
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
        ctx.drawImage(off.canvas, r.x, r.y + r.h - rh);
      }
    } else if (l.type === "art") {
      if (!v.fullColor)
        continue;
      const im = await artImage(l.id);
      const ratio = im.height / im.width;
      const w = Math.min(b.w, b.h / ratio);
      const h = w * ratio;
      ctx.drawImage(im, b.x + (b.w - w) / 2, b.y + (b.h - h) / 2, w, h);
    } else if (l.type === "logo") {
      const part = !v.fullColor && l.part !== "wordmark" ? l.fallback ?? null : l.part;
      if (!part)
        continue;
      const ratio = ratioOf(part);
      const h = Math.min(b.h, b.w / ratio);
      const w = h * ratio;
      drawLockupPart(ctx, part, l.align === "left" ? b.x : b.x + (b.w - w) / 2, b.y + (b.h - h) / 2, h, ink, mark);
    } else {
      const value = slots[l.slot] ?? "";
      if (!value.trim())
        continue;
      const plain = value.replace(/\*/g, "");
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
      f.lines.forEach((ln, i) => {
        const lw = f.widths[i];
        let x = f.style.align === "center" ? b.x + (b.w - lw) / 2 : b.x;
        const yb = b.y + i * lh + f.size * 0.92;
        for (const w of ln.split(" ")) {
          ctx.fillStyle = hi.has(word2) ? brandColor("pink") : ink;
          ctx.fillText(w, x, yb);
          x += ctx.measureText(`${w} `).width;
          word2++;
        }
      });
      ctx.letterSpacing = "0px";
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
  return { variant, width: W, height: H };
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
  const out = { variant: "", width: Math.round(widthIn * dpi), height: Math.round(heightIn * dpi), widthIn, heightIn, dpi };
  if (req.png !== false) {
    const s = surface(W, H, { scale: dpi / PX_PER_IN });
    out.variant = (await drawItem2(s.ctx, item, req)).variant;
    out.png = toPng(s, { dpi });
  }
  if (req.svg) {
    const s = surface(W, H, { svg: true });
    out.variant = (await drawItem2(s.ctx, item, req)).variant;
    out.svg = toSvg(s, { widthIn, heightIn }).replace(/<\/svg>\s*$/, `${cutPath(item)}</svg>
`);
  }
  return out;
}

// dist/assets/video.js
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync as mkdirSync2, readFileSync as readFileSync8 } from "node:fs";
import { dirname as dirname3 } from "node:path";
var doc3;
var videoDoc = () => doc3 ??= JSON.parse(readFileSync8(pkgPath("brand", "assets", "video.json"), "utf8"));
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
    formats: ["mp4", "webm", "frames", "all"],
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
  const design = designOf({ ...o, template: layout, theme: o.theme ? pick("theme", o.theme, themeNames()) : def.theme, size: "custom", width: o.width, height: o.height });
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
function drawFrame2(ctx, design, def, t, seconds, pics, icons, reduced = false) {
  const d = { ...design };
  if (def.marquee)
    d.outlineShift = design.outlineShift + (reduced ? 0 : t / seconds);
  if (def.rows) {
    const total = (d.app.mails ?? "").split("\n").filter(Boolean).length;
    const rows = Math.min(total, Math.max(0, (t - def.rows.start) / def.rows.every));
    const whole = Math.floor(rows);
    d.app = { ...d.app, rows: whole + easeOut(rows - whole) };
  }
  drawDesign(ctx, d, pics, icons, brandFonts(), 1, false, motionAt(def, t, reduced));
}
async function* videoFrames(o, pics) {
  const { design, def } = videoDesign(o);
  const icons = await loadIcons();
  const count = Math.round(o.seconds * o.fps);
  for (let i = 0; i < count; i++) {
    const s = surface(o.width, o.height);
    drawFrame2(s.ctx, design, def, i / o.fps, o.seconds, pics, icons, o.reduced);
    yield { index: i, rgba: pixelsOf(s).data, png: () => toPng(s, { opaque: true }) };
  }
}
async function stillFrame(o, pics, at) {
  const { design, def } = videoDesign(o);
  const s = surface(o.width, o.height);
  drawFrame2(s.ctx, design, def, at, o.seconds, pics, await loadIcons(), o.reduced);
  return toPng(s, { opaque: true });
}
async function encode(frames, o) {
  for (const out of o.outputs)
    mkdirSync2(dirname3(out.path), { recursive: true });
  const args = ["-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${o.width}x${o.height}`, "-r", String(o.fps), "-i", "-"];
  for (const out of o.outputs) {
    args.push("-map_metadata", "-1", "-fflags", "+bitexact", "-flags:v", "+bitexact");
    if (out.format === "mp4")
      args.push("-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-threads", "1", "-movflags", "+faststart", out.path);
    else
      args.push("-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "28", "-pix_fmt", "yuv420p", "-row-mt", "0", "-threads", "1", out.path);
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
import { readFileSync as readFileSync9 } from "node:fs";
var doc4;
var illustrateDoc = () => doc4 ??= JSON.parse(readFileSync9(pkgPath("brand", "assets", "illustrate.json"), "utf8"));
var subjects = () => Object.keys(illustrateDoc().subjects);
function illustrateCatalog() {
  const d = illustrateDoc();
  return {
    subjects: subjects().map((id) => ({ id, ...d.subjects[id] })),
    poses: Object.entries(d.poses).map(([id, label]) => ({ id, label })),
    themes: themeNames(),
    sizes: [...imageSizes().map((s) => ({ id: s.id, width: s.width, height: s.height })), { id: "custom", width: 0, height: 0 }],
    defaultSize: "square",
    formats: ["png", "svg", "both"],
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
  const d = designOf({ template: s.layout, theme, size, width: size === "custom" ? req.width : void 0, height: size === "custom" ? req.height : void 0, headline: "", body: "", badge: "none", emphasise: false, picture: !!req.picture, pictureUrl: req.pictureUrl });
  return { kind: "scene", design: { ...d, headline: "", body: "", credit: "", badgeText: "", logo: false, partnerName: "", foot: false, textFit: 0, winFollow: false } };
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
  return `<svg x="${r22(W * 0.5 - rw / 2)}" y="${r22(H - rh)}" width="${r22(rw)}" height="${r22(rh)}" viewBox="0 0 ${R.w} ${R.h}" overflow="visible"><g opacity="${opacity}">${inner}</g></svg>`;
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
  const out = { width: Math.round(W * scale), height: Math.round(H * scale), subject: req.subject, theme };
  if (opts.png !== false) {
    const s = surface(W, H, { scale });
    if (plan.kind === "scene")
      drawDesign(s.ctx, plan.design, pics, icons, brandFonts(), scale);
    else
      drawOctopus(s.ctx, plan, pics, false);
    out.png = toPng(s);
  }
  if (opts.svg) {
    const s = surface(W, H, { svg: true });
    const small = await svgPictures(pics, Math.max(W, H));
    if (plan.kind === "scene")
      drawDesign(s.ctx, { ...plan.design, bare: true, reef: false }, small, icons, brandFonts(), 2, true);
    else
      drawOctopus(s.ctx, plan, small, true, true);
    const drawing = toSvg(s).replace(/^[\s\S]*?<svg/, '<svg x="0" y="0"');
    const bg = themes()[theme].bg;
    out.svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${bg}"/>${plan.kind === "scene" ? reefSvg(plan.design, W, H) : ""}${drawing}</svg>
`;
  }
  return out;
}

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
export {
  PX_PER_IN,
  TEMPLATES,
  appStart,
  artImage,
  brandColor,
  brandFonts,
  compactSvg,
  deckCatalog,
  designOf,
  designStart,
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
  varyLayout,
  videoCatalog,
  videoFrames,
  videoTemplates,
  withAlpha,
  wordmarkPath,
  wrap,
  write
};
