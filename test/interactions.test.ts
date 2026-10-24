import { describe, expect, it } from 'vitest';
import { checkText } from '../src/check/engine.js';
import { convertCss, newStats } from '../src/convert/css.js';
import { sitePalette } from '../src/convert/palette.js';
import { elementLayer } from '../src/install/layer.js';

const rules = (source: string, path = 'control.tsx') => checkText(path, source).findings.map(f => f.rule);

describe('interaction policy', () => {
 it.each(['hover:font-medium', 'group-hover/item:font-semibold', 'active:scale-97', 'hover:px-6', 'hover:text-body-lg', 'focus-visible:tracking-tight', 'aria-pressed:font-medium', '[&:hover]:translate-y-1'])('rejects geometry changes in %s', cls => {
  expect(rules(`<button className="${cls}">Save</button>`)).toContain('interaction-size');
 });
 it('checks shared class constants as well as JSX and cva variants', () => {
  expect(rules('const BUTTON = "inline-flex hover:scale-105";')).toContain('interaction-size');
  expect(rules('const button = cva("inline-flex", {variants:{look:{default:"hover:font-medium"}}});')).toContain('interaction-size');
 });
 it('allows semantic variants, stable spacing and subtle visual states', () => {
  expect(rules('<button className="px-5 font-medium hover:bg-subtle active:brightness-95 active:transition-none focus-visible:transition-none motion-reduce:transition-none">Save</button>')).toEqual([]);
  expect(rules('<div className="md:px-6 data-[state=open]:w-72"><span className="animate-spin-steady" /></div>')).toEqual([]);
 });
 it('allows rare event animation but rejects hover animation and keyboard motion', () => {
  expect(rules('<div data-ds-motion="rare" className="animate-celebrate motion-reduce:animate-none" />')).toEqual([]);
  expect(rules('<button className="hover:animate-bounce" />')).toContain('motion-frequency');
  expect(rules('<button className="focus-visible:animate-pop-in" />')).toContain('motion-frequency');
  expect(rules('<div data-ds-motion="instant"><section><div className="animate-pop-in" /></section></div>')).toContain('motion-frequency');
  expect(rules('<CommandDialog><div className="transition-opacity" /></CommandDialog>')).toContain('motion-frequency');
  expect(rules('<CommandDialog><div className="transition-none animate-none" /></CommandDialog>')).toEqual([]);
 });
 it('checks nested CSS interaction states without flagging base sizes or keyframes', () => {
  expect(rules('.button:hover { font-weight: var(--ds-font-weight-medium); padding: var(--ds-space-6); transform: scale(.97); }', 'controls.css').filter(r => r === 'interaction-size')).toHaveLength(3);
  expect(rules('@media (hover: hover) { .button { &:active { width: 20px; } } }', 'controls.css')).toContain('interaction-size');
  expect(rules('.button { padding: var(--ds-space-5); } .button:hover { background-color: var(--ds-color-bg-subtle); } @keyframes celebration { to { transform: rotate(360deg); } }', 'controls.css')).toEqual([]);
  expect(rules('.button:focus-visible { animation: none !important; transition: none !important; }', 'controls.css')).toEqual([]);
 });
 it('flags transition delays and broad transitions', () => {
  for (const cls of ['delay-300', 'hover:delay-[150ms]', 'transition-all']) expect(rules(`<button className="${cls}" />`).length).toBeGreaterThan(0);
  expect(rules('<button className="delay-0 active:transition-none" />')).toEqual([]);
  expect(rules('.button { transition: opacity var(--ds-duration-fast) ease-out 300ms; }', 'controls.css')).toContain('input-latency');
  expect(rules('.button { transition-delay: var(--ds-duration-fast); }', 'controls.css')).toContain('input-latency');
 });
 it('audits UI timers, including zero-delay scheduling, while allowing justified background work', () => {
  expect(rules('function Search(){ setTimeout(() => setQuery(value), 300); return <input />; }')).toContain('input-latency');
  expect(rules('const search = debounce(update, 250); export const View = () => <input />;')).toContain('input-latency');
  expect(rules('function Copy(){\n // ds-latency: clears completed copy feedback; copying and input have already finished.\n setTimeout(resetFeedback, 2000);\n return <button />; }')).toEqual([]);
  expect(rules('function Copy(){\n // ds-latency: clears completed copy feedback; copying and input have already finished.\n setTimeout(resetFeedback, 2000);\n\n setTimeout(blockInput, 500);\n return <button />; }')).toContain('input-latency');
  expect(rules('function View(){ setTimeout(updateInput, 0); return <input />; }')).toContain('input-latency');
  expect(rules('function View(){\n // ds-latency: focus requires the input to mount; value updates and press feedback are immediate.\n setTimeout(focusInput, 0); return <input />; }')).toEqual([]);
  expect(rules('setTimeout(backgroundPoll, 5000);', 'worker.ts')).toEqual([]);
 });
 it('keeps action activation on click but requires visual press feedback before release', () => {
  expect(rules('<button onClick={() => submit()} onPointerDown={() => setPressed(true)} />')).toEqual([]);
  expect(rules('<button onPointerUp={() => setPressed(true)} />')).toContain('press-feedback');
  expect(rules('<button onClick={() => setIsPressed(true)} />')).toContain('press-feedback');
 });
 it('preserves zero durations during conversion instead of introducing latency', () => {
  const css = '.command { transition-duration: 0ms; animation-duration: 0s; transition-delay: 300ms; }';
  const result = convertCss(css, sitePalette(css), newStats());
  expect(result).toContain('transition-duration: 0ms');
  expect(result).toContain('animation-duration: 0ms');
  expect(result).toContain('transition-delay: 0ms');
 });
 it('removes shorthand transition waits without changing rare animation delays', () => {
  const css = '.button { transition: opacity 150ms cubic-bezier(0.2, 0, 0, 1) 300ms, color var(--ds-duration-fast) 200ms; } .celebration { animation-delay: var(--ds-duration-base); }';
  const result = convertCss(css, sitePalette(css), newStats());
  expect(result).toContain('opacity var(--ds-duration-fast) var(--ds-easing-out) 0ms');
  expect(result).toContain('color var(--ds-duration-fast) 0ms');
  expect(result).toContain('animation-delay: var(--ds-duration-base)');
  expect(rules(result, 'controls.css')).not.toContain('input-latency');
 });
 it('applies immediate, stable press feedback in the CSS restyling layer', () => {
  const {block} = elementLayer('controls.css', '.btn-primary { color: red; }', 'site');
  expect(block).toContain('.btn-primary:active');
  expect(block).toContain('filter: brightness(0.95)');
  expect(block).toContain('transition: none');
  expect(block).not.toContain('scale(');
  expect(block).not.toContain('scale:');
 });
});
