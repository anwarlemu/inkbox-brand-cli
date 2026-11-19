// The asset renderer as a module, for scripts and other commands:
//
//   import { designOf, picturesFor, renderDesign } from '<package>/dist/assets/index.js';
//   const d = designOf({ template: 'reef', size: 'square', headline: 'Every agent gets *an inbox*' });
//   const { png, svg } = await renderDesign(d, await picturesFor(null), { png: true, svg: true });
//
// Everything brand-specific comes from brand/ (tokens, fonts, assets/*.json, the art); nothing here names the brand.

export { brandFonts, compactSvg, pixelsOf, scratch, stableIds, surface, toPng, toSvg, tokenColor, withAlpha, type AnyCanvas, type ColorRef, type Ctx, type Fonts, type Surface } from './canvas.js';
export { artImage, brandColor, imageDoc, logoDoc, themeNames, themes, wordmarkPath } from './brand-art.js';
export { designStart, drawDesign, frameOf, hatchLines, layoutFor, tileWords, TEMPLATES, type Design, type Motion, type Pictures, type Template } from './share.js';
export { appStart, drawApp, loadIcons, type AppContent } from './window.js';
export { designOf, emphasise, imageCatalog, imageSizes, occasionNames, picturesFor, readPicture, renderDesign, sizeId, varyLayout, type ImageRequest, type Rendered } from './image.js';
export { deckCatalog, drawSlide, renderSlide, slideTypes, type Slide, type SlideType } from './deck.js';
export { drawItem, findItem, merchCatalog, merchItems, renderItem, PX_PER_IN, type MerchItem } from './merch.js';
export { easeOut, encode, hasFfmpeg, stillFrame, videoCatalog, videoFrames, videoTemplates, type VideoOptions } from './video.js';
export { illustrateCatalog, renderIllustration, subjects, type IllustrateRequest } from './illustrate.js';
export { drawFitted, fit, setFont, wrap, type Fitted, type TextStyle } from './text.js';
export { encodePng } from './png.js';
export { imagesToPdf, type PdfPage } from './pdf.js';
export { display, num, pick, suggest, unknown, write, type OutFile } from './io.js';
