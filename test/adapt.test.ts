import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';
import { adaptComponent } from '../src/library/adapt.js';
import { componentsIn } from '../src/library/components.js';

const ROOT = join(import.meta.dirname, '..');

it('type-checks converted buttons and badges with absent or optional variant and size props', () => {
	const dir = mkdtempSync(join(tmpdir(), 'ds-adapter-types-'));
	try {
		symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'), 'dir');
		const fixtures = [
			['button', 'plain', 'ButtonHTMLAttributes<HTMLButtonElement>', '{ className = "", ...props }', '<button className={className} {...props} />', '<Button type="submit" disabled onClick={() => {}}>Create workspace</Button>'],
			['button', 'variant', 'ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }', '{ variant, className, children, ...props }', '<button className={className} {...props}>{children}</button>', '<Button variant="primary">Continue</Button>'],
			['button', 'size', 'ButtonHTMLAttributes<HTMLButtonElement> & { size?: "small" | "large" }', '{ size, children, ...props }', '<button {...props}>{children}</button>', '<Button size="small">Continue</Button>'],
			['badge', 'plain', 'HTMLAttributes<HTMLSpanElement>', '{ className, ...props }', '<span className={className} {...props} />', '<Badge title="Current status">Active</Badge>'],
			['badge', 'variant', 'HTMLAttributes<HTMLSpanElement> & { variant?: "success" | "warning" }', '{ variant, children, ...props }', '<span {...props}>{children}</span>', '<Badge variant="success">Active</Badge>'],
		];
		const files = fixtures.map(([item, name, type, params, body, usage]) => {
			const file = join(dir, `${item}-${name}.tsx`);
			const componentName = item === 'button' ? 'Button' : 'Badge';
			const source = `import type { ButtonHTMLAttributes, HTMLAttributes } from "react";\nexport function ${componentName}(${params}: ${type}) { return ${body}; }\n`;
			const [component] = componentsIn(file, source);
			const adapted = adaptComponent(source, component, item, 'site', `@/components/ui/${item}`, component.values);
			expect(adapted).toBeDefined();
			writeFileSync(file, `${adapted}\nconst example = ${usage};\n`);
			return file;
		});
		const program = ts.createProgram(files, {
			noEmit: true, strict: true, skipLibCheck: true, esModuleInterop: true,
			target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.ReactJSX,
			baseUrl: dir,
			paths: {
				'@/components/ui/*': [join(ROOT, 'registry/components/ui/*')],
				'@/lib/*': [join(ROOT, 'registry/lib/*')],
			},
		});
		const errors = ts.getPreEmitDiagnostics(program).map(d => `${d.file?.fileName}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
		expect(errors).toEqual([]);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
