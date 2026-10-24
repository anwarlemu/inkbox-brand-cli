import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import postcss from 'postcss';

const root = new URL('..', import.meta.url).pathname;
const read = file => readFileSync(join(root, file), 'utf8');
const brand = JSON.parse(read('brand/brand.json'));
const dir = join(root, 'apps/www/public/r/shadcn');
mkdirSync(dir, { recursive: true });
const address = name => `${brand.registryUrl}/r/shadcn/${name}.json`;
const entries = JSON.parse(read('apps/www/public/r/index.json')).items;
const objects = nodes => {
	const value = {};
	for (const node of nodes ?? []) {
		if (node.type === 'comment') continue;
		if (node.type === 'decl') value[node.prop] = node.value + (node.important ? ' !important' : '');
		else {
			const key = node.type === 'atrule' ? `@${node.name}${node.params ? ` ${node.params}` : ''}` : node.selector;
			value[key] = merge(value[key] ?? {}, objects(node.nodes));
		}
	}
	return value;
};
const merge = (a, b) => {
	for (const [key, value] of Object.entries(b)) a[key] = typeof value === 'object' && value && typeof a[key] === 'object' ? merge(a[key], value) : value;
	return a;
};
const skill = read('brand/skill.md').replaceAll('{{brand}}', brand.name).replaceAll('{{bin}}', brand.bin).replaceAll('{{source}}', brand.source).replaceAll('{{registry}}', brand.registryUrl);
const themeStyles = surface => {
	const parsed = postcss.parse(`${read('build/fonts.css')}\n${read(`build/${surface}.css`)}\n${read('build/theme.css')}`);
	const theme = {};
	parsed.walkAtRules('theme', rule => {
		for (const node of [...rule.nodes]) if (node.type === 'decl') { theme[node.prop.replace(/^--/, '')] = node.value; node.remove(); }
		if (!rule.nodes.length) rule.remove();
	});
	return { css: objects(parsed.nodes), cssVars: { theme } };
};
const items = entries.map(entry => {
	const item = JSON.parse(read(`apps/www/public/r/${entry.name}.json`));
	const type = item.type === 'theme' ? 'registry:style' : item.type === 'lib' ? 'registry:lib' : item.type === 'hook' ? 'registry:hook' : ['block', 'site', 'product', 'visual'].includes(item.type) ? 'registry:block' : 'registry:ui';
	const common = { $schema: 'https://ui.shadcn.com/schema/registry-item.json', name: item.name, type, title: item.title, description: item.description, dependencies: item.packages ?? [], registryDependencies: (item.requires ?? []).map(address), docs: `Reference: ${brand.registryUrl}/components/${item.name}. Read ${brand.bin} view ${item.name} --json for APIs and working examples.`, meta: { brand: brand.bin, surface: item.surface, reference: `${brand.registryUrl}/r/${item.name}.json` } };
	if (item.type === 'theme') {
		const styles = themeStyles('site');
		return { ...common, ...styles, files: [{ path: `skills/${brand.bin}/SKILL.md`, type: 'registry:file', target: `~/.agents/skills/${brand.bin}/SKILL.md`, content: skill }] };
	}
	return { ...common, files: (item.files ?? []).map(file => {
		// Private helpers travel with shared UI, even when the app keeps its own lib/hooks aliases.
		const helper = `components/ui/_${brand.bin}`;
		const path = /^(lib|hooks)\//.test(file.path) ? `${helper}/${file.path}` : file.path;
		const content = file.content.replace(/(["'])@\/(lib|hooks)\//g, `$1@/${helper}/$2/`);
		const ui = path.startsWith('components/ui/');
		const kind = ui ? 'ui' : path.startsWith('components/') ? 'component' : path.startsWith('hooks/') ? 'hook' : 'lib';
		const target = ui ? path.replace('components/ui/', '@ui/') : path.replace(/^(components|hooks|lib)\//, '@$1/');
		return { path, content, type: `registry:${kind}`, target };
	}) };
});
if ((brand.surfaces ?? ['site', 'product']).includes('product')) {
	const theme = items.find(item => item.name === 'theme');
	items.push({ ...theme, name: 'theme-product', title: `${brand.name} product theme`, ...themeStyles('product') });
}
const writeItem = (directory, item) => {
 writeFileSync(join(directory, `${item.name}.json`), `${JSON.stringify(item, null, 2)}\n`);
 // Keep an authoring tree too, so upstream registry validate/build can verify and reproduce these items.
 for (const file of item.files ?? []) {
  const target = join(directory, file.path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, file.content);
 }
};
for (const item of items) writeItem(dir, item);
const registry = { $schema: 'https://ui.shadcn.com/schema/registry.json', name: brand.bin, homepage: brand.registryUrl, items };
writeFileSync(join(dir, 'registry.json'), `${JSON.stringify(registry, null, 2)}\n`);
writeFileSync(join(dir, 'index.json'), `${JSON.stringify(registry, null, 2)}\n`);
console.log(`shadcn registry: ${items.length} items, configured targets, dependencies, theme and agent skill`);

// Product projects keep the same namespace while every dependency resolves to the product theme.
if ((brand.surfaces ?? ['site', 'product']).includes('product')) {
 const productDir = join(root, 'apps/www/public/r/shadcn-product');
 mkdirSync(productDir, { recursive: true });
 const productItems = items.map(item => {
  const result = JSON.parse(JSON.stringify(item.name === 'theme' ? { ...items.find(entry => entry.name === 'theme-product'), name: 'theme' } : item).replaceAll('/r/shadcn/', '/r/shadcn-product/'));
  writeItem(productDir, result);
  return result;
 });
 for (const file of ['index.json', 'registry.json']) writeFileSync(join(productDir, file), `${JSON.stringify({ ...registry, items: productItems }, null, 2)}\n`);
}
