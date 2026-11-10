import type { Command } from 'commander';
import { brandFonts, brandLogos, brandSummary, brandTokens, brandVoice } from '../brand/system.js';
import { readImageContent, readVideoContent } from '../lib/content.js';
import { cli } from '../lib/brand.js';
import { emit } from '../lib/output.js';
import { emitComponent, inspectComponent, listComponents } from '../library/describe.js';
import { manifest } from '../manifest/build.js';
import { principles } from '../principles/read.js';
import { videoCatalog } from '../video/catalog.js';
import { renderVideo } from '../video/render.js';

const SECTIONS = ['tokens', 'fonts', 'logos', 'voice'] as const;

function brandCommand(section: string | undefined, name: string | undefined, opts: { json?: boolean }) {
	if (!section) {
		emit(opts, brandSummary(), () => {
			const summary = brandSummary();
			return [
				`${summary.name} brand system`,
				`Surfaces: ${summary.surfaces.join(', ')}`,
				'Token groups:',
				...summary.groups.map((group) => `  ${group.id.padEnd(12)} ${group.count}`),
				'Fonts:',
				...summary.fonts.map((face) => `  ${face.role.padEnd(12)} ${face.file} (${face.weight})`),
				summary.missingWeights.length ? `No font file for: ${summary.missingWeights.map((item) => item.token).join(', ')}` : '',
				`Logos: ${summary.logos.join(', ')}`,
				summary.clearSpace ? '' : 'No numeric logo clear-space is defined.',
				`Voice avoids: ${summary.voice.avoid.join(', ')}`,
				`Read a part with \`${cli()} brand tokens\`, fonts, logos or voice.`,
			]
				.filter(Boolean)
				.join('\n');
		});
		return;
	}
	const key = section.trim().toLowerCase();
	if (!SECTIONS.includes(key as (typeof SECTIONS)[number])) {
		throw new Error(`Unknown brand section "${section}". Use ${SECTIONS.join(', ')}.`);
	}
	if (key === 'tokens') {
		const data = brandTokens(name);
		emit(opts, data, () => {
			if (data.kind === 'token') return `${data.token}  ${data.value}  (${data.group})`;
			if (data.kind === 'group') return [`${data.group}`, ...Object.entries(data.tokens).map(([token, value]) => `  ${token.padEnd(34)} ${value}`)].join('\n');
			return data.groups.map((group) => `  ${group.id.padEnd(12)} ${group.count}`).join('\n');
		});
		return;
	}
	if (name) throw new Error(`\`brand ${key}\` does not take a name. Use \`brand tokens <group-or-token>\` for one token.`);
	if (key === 'fonts') {
		const data = brandFonts();
		emit(opts, data, () =>
			[
				...data.faces.map((face) => `  ${face.role.padEnd(10)} ${face.file}  ${face.fileFamily}  ${face.weight}${face.license ? `  ${face.license}` : ''}`),
				data.note,
			].join('\n'),
		);
		return;
	}
	if (key === 'logos') {
		const data = brandLogos();
		emit(opts, data, () =>
			[
				...data.files.map((file) => `  ${file.file.padEnd(16)} ${file.format}  ${file.width ?? '?'}x${file.height ?? '?'}`),
				...data.usage.map((line) => `  ${line.source}: ${line.text}`),
				data.note,
			].join('\n'),
		);
		return;
	}
	const voice = brandVoice();
	emit(opts, voice, () => [voice.text, voice.avoid.length ? `Avoid: ${voice.avoid.join(', ')}` : ''].filter(Boolean).join('\n'));
}

function principlesText(data: ReturnType<typeof principles>, topic?: string) {
	if (!topic && 'product' in data) {
		return [
			data.summary,
			'',
			'Do',
			...data.product.do.map((rule) => `  ${rule.text}`),
			'',
			'Do not',
			...data.product.dont.map((rule) => `  ${rule.text}`),
			'',
			`Topics: \`${cli()} principles product\`, website, voice, elements.`,
		].join('\n');
	}
	if ('do' in data && 'dont' in data) {
		return [data.summary, '', 'Do', ...data.do.map((rule) => `  ${rule.text}`), '', 'Do not', ...data.dont.map((rule) => `  ${rule.text}`)].join('\n');
	}
	if ('avoid' in data && 'text' in data) return [data.text, data.avoid.length ? `Avoid: ${data.avoid.join(', ')}` : ''].filter(Boolean).join('\n');
	if ('elements' in data && data.elements && !('product' in data)) return data.elements.map((item) => `  ${item.id}: ${item.rules.join(' ')}`).join('\n');
	if ('title' in data && 'items' in data) return [data.title, ...data.items.map((item) => `  ${item}`), ...data.paragraphs].filter(Boolean).join('\n');
	return JSON.stringify(data, null, 2);
}

function parseSet(values: string[] | undefined) {
	const set: Record<string, string> = {};
	for (const value of values ?? []) {
		const match = /^([A-Za-z][A-Za-z0-9]*)=(\S+)$/.exec(value);
		if (!match) throw new Error(`--set must be prop=value. Got "${value}".`);
		if (set[match[1]]) throw new Error(`--set ${match[1]} was given twice.`);
		set[match[1]] = match[2];
	}
	return set;
}

type VideoFlags = {
	template?: string;
	size?: string;
	ground?: string;
	headline?: string;
	subtext?: string;
	eyebrow?: string;
	content?: string;
	out?: string;
	json?: boolean;
};

async function runVideo(flags: VideoFlags) {
	const file = readVideoContent(flags.content);
	const template = flags.template ?? file.template;
	if (!template) throw new Error(`Pass --template. \`${cli()} video templates\` lists them.`);
	const result = await renderVideo({
		template,
		size: flags.size ?? file.size ?? 'square',
		ground: flags.ground ?? file.ground,
		outDir: flags.out ?? file.out ?? 'videos',
		headline: flags.headline ?? file.headline,
		subtext: flags.subtext ?? file.subtext,
		eyebrow: flags.eyebrow ?? file.eyebrow,
	});
	emit(flags, result, () => [`Wrote ${result.files[0].path} (${result.template}, ${result.size}, ${result.width}x${result.height}, ${result.frames} frames).`].join('\n'));
}

function videoOptions(command: Command) {
	command
		.option('--template <name>', 'social, announce or product')
		.option('--size <size>', 'square (1080x1080, the default), vertical (1080x1920) or landscape (1920x1080)')
		.option('--headline <text>', 'main line')
		.option('--subtext <text>', 'second line')
		.option('--eyebrow <text>', 'short label; a pink pill on the announce template')
		.option('--ground <ground>', 'white (default) or lilac')
		.option('--content <file>', 'JSON file with the same fields; flags override it')
		.option('--out <dir>', 'directory to write (default: videos)')
		.option('--json', 'JSON output');
}

/** manifest, brand, principles, components and video. */
export function registerDiscover(program: Command) {
	const bin = cli();
	program
		.command('manifest')
		.alias('describe')
		.description('List every capability, template, size, component and rule')
		.option('--json', 'JSON output')
		.action((_opts, command: Command) => {
			const data = manifest();
			emit(command.optsWithGlobals(), data, () =>
				[
					`${data.name} ${data.version}. Start with \`${bin} manifest --json\`.`,
					'Capabilities: brand, images, video, components, principles.',
					`Images: ${data.images.templates.map((item) => item.id).join(', ')}`,
					`Image sizes: ${data.images.sizes.map((item) => item.id).join(', ')}`,
					`Video: ${data.video.templates.map((item) => item.id).join(', ')} (${data.video.renderer.id})`,
					`Video sizes: ${data.video.sizes.map((item) => item.id).join(', ')}`,
					`Components: ${data.components.count}`,
					`Principle topics: ${data.principles.topics.join(', ')}`,
					data.determinism,
				].join('\n'),
			);
		});

	program
		.command('brand [section] [name]')
		.description('Read tokens, fonts, logos and voice. Sections: tokens, fonts, logos, voice')
		.option('--json', 'JSON output')
		.action((section: string | undefined, name: string | undefined, _opts, command: Command) => brandCommand(section, name, command.optsWithGlobals()));

	program
		.command('principles [topic]')
		.description('Design rules for product and website, plus voice. Topics include product, website, voice and elements')
		.option('--json', 'JSON output')
		.action((topic: string | undefined, _opts, command: Command) => {
			const data = principles(topic);
			emit(command.optsWithGlobals(), data, () => principlesText(data, topic));
		});

	const components = program.command('components').description('List, inspect and emit components from the registry').option('--json', 'JSON output');
	components.action((_opts, command: Command) => {
		const data = listComponents();
		emit(command.optsWithGlobals(), data, () => data.items.map((item) => `  ${item.name.padEnd(24)} ${item.description}`).join('\n'));
	});
	components
		.command('list')
		.description('List every component')
		.option('--json', 'JSON output')
		.action((_opts, command: Command) => {
			const data = listComponents();
			emit(command.optsWithGlobals(), data, () => data.items.map((item) => `  ${item.name.padEnd(24)} ${item.description}`).join('\n'));
		});
	components
		.command('inspect <name>')
		.description('Props, states, exports and usage rules for one component')
		.option('--json', 'JSON output')
		.action((name: string, _opts, command: Command) => {
			const data = inspectComponent(name);
			emit(command.optsWithGlobals(), data, () =>
				[
					`${data.title} (${data.name})`,
					data.description,
					data.useFor,
					data.constraints.length ? `Avoid: ${data.constraints.join('; ')}` : '',
					`Exports: ${data.exports.join(', ')}`,
					`Primary: ${data.primary ?? 'none'}`,
					...data.components.map((component) => `  ${component.exportName}: ${component.props.map((prop) => `${prop.name}=${prop.values.join('|')}`).join(', ') || 'no enumerated props'}`),
					data.states.length ? `States: ${data.states.map((state) => state.name).join(', ')}` : 'No example states.',
					data.note,
				]
					.filter(Boolean)
					.join('\n'),
			);
		});
	components
		.command('emit <name>')
		.description('Emit an example and a JSX usage line whose props exist on the component')
		.option('--state <name>', 'example export to copy, such as Preview or States')
		.option('--export <name>', 'component export to use in the JSX line')
		.option('--set <prop=value>', 'set a declared prop; repeat for more than one', (value: string, previous: string[] = []) => previous.concat(value), [] as string[])
		.option('--json', 'JSON output')
		.action((name: string, _opts, command: Command) => {
			const opts = command.optsWithGlobals();
			const data = emitComponent(name, { state: opts.state, exportName: opts.export, set: parseSet(opts.set) });
			emit(opts, data, () => [data.imports, data.usage ? data.usage.jsx : '', data.code ?? '', data.note].filter(Boolean).join('\n\n'));
		});

	const video = program.command('video').description('Render a short on-brand video from tokens, fonts and logos').option('--json', 'JSON output');
	video
		.command('templates')
		.description('List video templates, sizes and the renderer')
		.option('--json', 'JSON output')
		.action((_opts, command: Command) => {
			const catalog = videoCatalog();
			emit(command.optsWithGlobals(), catalog, () =>
				[
					`Renderer: ${catalog.renderer.id} (${catalog.renderer.rasterizer}, ${catalog.renderer.container}, ${catalog.renderer.frames} frames at ${catalog.renderer.fps} fps)`,
					'Templates',
					...catalog.templates.map((item) => `  ${item.id.padEnd(12)} ${item.description}`),
					'Sizes',
					...catalog.sizes.map((item) => `  ${item.id.padEnd(12)} ${item.width}x${item.height}  ${item.use}`),
					`Grounds: ${catalog.grounds.join(', ')}`,
					'Export: apng',
				].join('\n'),
			);
		});
	const render = video.command('render').description('Render one video from the content you pass in');
	videoOptions(render);
	render.action((_opts, command: Command) => runVideo(command.optsWithGlobals()));
}
