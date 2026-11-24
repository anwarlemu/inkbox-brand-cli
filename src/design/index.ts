// The design core: shared by every brand CLI, byte for byte. Only adapter.ts beside it belongs to one brand.
export * from './types.js';
export { CORE_VERSION, designHelp, designManifest, runDesign, type DesignIO } from './run.js';
export { checkDesign, checkText, contrast, errorsOf, inkOf, luminance, NEVER_ALLOWED, RULES, SMALL_FLOOR, wordsOf, type CheckInput } from './check.js';
export { allTemplates, DesignError, differences, infoFor, docText, nearest, parseDoc, redo, sameAs, SAME, stateOf, undo } from './doc.js';
export { applyEdits, create, layerFlag, type Applied, type Edit } from './ops.js';
export { examples, parsePhrases } from './phrases.js';
export { PLATFORMS, platformOf, sizeAlias, zonePx, type Platform, type Zone } from './platforms.js';
export { decodePng, encodePng, pngSize, type Pixels } from './png.js';
export { comparison, contactSheet, sheetCanvas, sheetSvg, type CanvasApi, type Painter, type SheetItem, type SheetSpec } from './sheet.js';
export { applyCompose, blockInfo, blockOf, blockOverlaps, blockRects, COMPOSE, composeExamples, composeInfo, composePhrase, GRID, gridOf, isCompose, outsideCells, parseAt, placeAt, validateBlocks, validateOutline, type ComposeEdit, type Outline } from './compose.js';
