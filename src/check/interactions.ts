import type { RawFinding } from './rules.js';
import { elementName, jsxAttr, literalAttr, type Node, type SourceFile } from './source.js';

type Push = (finding: RawFinding) => void;
const STATE = /(?:^|:)(?:(?:group|peer)-)?(?:hover|active|focus|focus-visible)(?:\/[^:]+)?:|aria-pressed:|\[.*:(?:hover|active|focus-visible).*\]:/;
const METRICS = /^(?:font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[)|text-(?:body|caption|micro|h[1-6]|xs|sm|base|lg|xl|\d+xl|\[\d)|tracking-|leading-|[pm][xytrblse]?-|gap-|space-|(?:min-|max-)?(?:w|h|size)-|border(?:-[xytrblse])?-(?:\d|\[\d))/;
const GEOMETRY = /^(?:-?(?:scale|translate|rotate|skew)-|transform(?:-|$))/;
const CSS_METRICS = /^(?:font(?:-weight|-size|-family|-stretch)?|letter-spacing|line-height|padding(?:-.+)?|margin(?:-.+)?|gap|row-gap|column-gap|(?:min-|max-)?(?:width|height)|border(?:-.+)?-width)$/;
const STILL = /^(?:none|normal|0(?:ms|s)?|initial|unset)$/;

/** Split variants outside brackets, so arbitrary selectors and CSS values remain intact. */
function utility(token: string) {
 let depth = 0, last = -1;
 for (let i = 0; i < token.length; i++) {
  if ('[('.includes(token[i])) depth++;
  else if ('])'.includes(token[i])) depth--;
  else if (token[i] === ':' && depth === 0) last = i;
 }
 return token.slice(last + 1).replace(/^!|!$/g, '');
}

function instant(file: SourceFile, element?: Node): boolean {
 for (let n = element; n; n = file.parents.get(n)) {
  if (n.type !== 'JSXElement') continue;
  if (literalAttr(n, 'data-ds-motion') === 'instant' || /^command(?:-|$)/.test(literalAttr(n, 'data-slot') ?? '') || /^(?:Command(?:Dialog|List|Item)?|CommandPalette)$/.test(elementName(n))) return true;
 }
 return false;
}

export function checkInteractionClass(token: string, offset: number, push: Push, isInstant = false) {
 const base = utility(token);
 const state = STATE.test(token);
 const finding = (rule: string, message: string, hint: string) => push({rule, message, hint, offset, length: token.length});
 if (state && (METRICS.test(base) || GEOMETRY.test(base) && !/^(?:scale-(?:100|\[1\])|translate-[xy]-0|rotate-0|transform-none)$/.test(base))) {
  finding('interaction-size', `State changes geometry: \`${token}\``, 'Keep font weight, size, padding and bounds fixed. Change color, background, border color or shadow instead.');
 }
 if (state && /^animate-/.test(base) && base !== 'animate-none') finding('motion-frequency', `Animation on a repeated interaction: \`${token}\``, 'Hover and press feedback must be subtle style changes; reserve expressive animation for rare events.');
 if (/^(?:transition-all|transition)$/.test(base)) finding('motion', `Broad transition: \`${token}\``, 'Name only the changing visual properties, such as transition-colors.');
 if (/^delay-/.test(base) && !/^delay-(?:0|\[0(?:ms|s)?\])$/.test(base)) finding('input-latency', `Delayed transition: \`${token}\``, 'Remove the delay. Press feedback must appear on pointer-down.');
 if ((isInstant || /(?:^|:)focus-visible:/.test(token)) && /^(?:animate-|transition(?:-|$))/.test(base) && !/^(?:animate|transition)-none$/.test(base)) finding('motion-frequency', `Motion on an instant interaction: \`${token}\``, 'Keyboard shortcuts and command palettes must use animation-none and transition-none.');
}

export function checkInteractionDecl(d: {prop: string; value: string; valueOffset: number; selector?: string}, push: Push) {
 const {prop, value, valueOffset: offset, selector = ''} = d;
 const state = /:(?:hover|active|focus(?:-visible)?)\b|\[aria-pressed/.test(selector);
 const noMotion = /data-ds-motion\s*=\s*["']?instant|command-(?:palette|dialog|list|item)/.test(selector);
 const finding = (rule: string, message: string, hint: string) => push({rule, message, hint, offset});
 if (state && (CSS_METRICS.test(prop) || /^(?:transform|scale|translate|rotate)$/.test(prop) && !/^(?:none|1|0|scale\(1\))$/.test(value))) finding('interaction-size', `\`${prop}\` changes on interaction`, 'Keep geometry and type metrics fixed; use color, background, border color or shadow feedback.');
 if (state && /^animation(?:-name)?$/.test(prop) && !STILL.test(value.replace(/\s*!important$/, ''))) finding('motion-frequency', 'Animation on hover, press or focus', 'Use subtle style feedback for frequent interactions, with no motion for keyboard actions.');
 if (noMotion && /^(?:animation|transition)(?:-duration|-delay|-property|-name)?$/.test(prop) && !STILL.test(value.replace(/\s*!important$/, ''))) finding('motion-frequency', 'Motion in an instant interaction', 'Remove animation and transition from this command or shortcut surface.');
 if (prop === 'transition-delay' && !value.split(',').every(v => /^0(?:ms|s)?$/.test(v.trim()))) finding('input-latency', 'Transition delay', 'Use 0s; do not postpone input feedback.');
 if (prop === 'transition') {
  // Substitute duration tokens before counting shorthand times. Commas inside easing functions are irrelevant.
  const clean = value.replace(/(?:cubic-bezier|steps)\([^)]*\)/g, '').replace(/var\(--ds-duration-[\w-]+\)/g, '1ms');
  if (clean.split(',').some(part => [...part.matchAll(/(-?\d*\.?\d+)(ms|s)\b/g)].slice(1).some(m => Number(m[1]) > 0))) finding('input-latency', 'Delayed transition shorthand', 'Remove the second time value; state feedback starts immediately.');
 }
 if (state && prop === 'animation-delay' && !STILL.test(value)) finding('input-latency', 'Delayed interaction animation', 'Remove the delay from the input path.');
}

/** Review UI timers, not CLI/background scripts. A local reason records an audited, nonblocking timer. */
export function checkInteractions(file: SourceFile): RawFinding[] {
 const out: RawFinding[] = [], push: Push = f => out.push(f);
 for (const t of file.classTokens) checkInteractionClass(t.value, t.offset, push, instant(file, t.element));
 // Shared class constants are often declared outside JSX or a class helper.
 for (const s of file.strings) if (s.context === 'code' && /(?:hover:|active:|transition-|delay-)/.test(s.value) && !/[{};]/.test(s.value)) {
  for (const t of s.value.matchAll(/\S+/g)) checkInteractionClass(t[0], s.offset + t.index, push);
 }
 const ui = file.jsxElements.length > 0 || file.imports.some(i => /^(?:react|react-native)$/.test(i.source)) || /\b(?:document|window)\./.test(file.text);
 if (ui) for (const node of file.parents.keys()) {
  if (node.type !== 'CallExpression') continue;
  const name = node.callee?.name ?? node.callee?.property?.name ?? '';
  if (!/^(?:setTimeout|setInterval|debounce|throttle)$/.test(name)) continue;
  // Require a meaningful reason immediately above or on the timer line, never a file-wide exemption.
  const lineStart = file.text.lastIndexOf('\n', node.start - 1) + 1;
  const previousStart = file.text.lastIndexOf('\n', lineStart - 2) + 1;
  const lineEnd = file.text.indexOf('\n', node.start);
  if (/\/\/\s*ds-latency:\s*\S.{15,}/.test(file.text.slice(previousStart, lineEnd < 0 ? undefined : lineEnd))) continue;
  push({rule:'input-latency',message:`Audit \`${name}\` on the UI path`,hint:'Remove artificial waits. Keep typing, local filtering and press feedback synchronous; document an essential nonblocking timer on the preceding line with // ds-latency: <reason>.',offset:node.start,length:name.length});
 }
 for (const el of file.jsxElements) for (const event of ['onClick','onPointerUp','onMouseUp','onTouchEnd']) {
  const attr = jsxAttr(el, event);
  if (attr && /\b(?:setPressed|setIsPressed|setPressing|setRipple|animate)\s*\(/.test(file.text.slice(attr.start, attr.end))) push({rule:'press-feedback',message:`Press feedback waits for ${event}`,hint:'Use :active or onPointerDown for visual feedback. Keep the actual action and accessible activation on click.',offset:attr.start});
 }
 return out;
}
