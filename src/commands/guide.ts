import { brand, cli } from '../lib/brand.js';
import { agentGuide } from '../lib/guide.js';
import { emit, type OutputOptions } from '../lib/output.js';
import { itemName, loadItem } from '../library/registry.js';

export function guide(opts: OutputOptions) {
	const b = brand();
	emit(opts, { schemaVersion: 1, name: b.name, instructions: agentGuide(), registry: `${b.registryUrl}/r/index.json` }, agentGuide);
}

export async function show(ref: string, opts: OutputOptions) {
	const item = await loadItem(itemName(ref));
	emit(opts, { schemaVersion: 1, ...item, command: `${cli()} add ${item.name}` }, () => [
		`# ${item.title ?? item.name}`, item.description, '',
		`Install: ${cli()} add ${item.name}`, `Reference: ${brand().registryUrl}/r/${item.name}.md`,
		`Exports: ${item.exports?.join(', ') || 'See source'}`,
		`Client boundary: ${item.client ? 'yes' : 'not required by this entry file'}`,
		`Requires: ${item.requires?.join(', ') || 'none'}`,
		`Packages: ${item.packages?.join(', ') || 'none'}`, '',
		'## Usage', item.useFor ?? '', ...((item.constraints ?? []).map(rule => `- Avoid: ${rule}`)), item.documentation ?? '',
		...(item.examples?.length ? ['\n## Examples', ...item.examples.map(example => `\nExample components: ${cli()} add ${example.requires.join(' ')}\n${example.path}\n\n\`\`\`tsx\n${example.content}\n\`\`\``)] : []),
		'\n## Source', ...(item.files ?? []).map(file => `\n${file.path}\n\n\`\`\`${file.path.endsWith('.css') ? 'css' : 'tsx'}\n${file.content}\n\`\`\``),
	].filter(line => line !== undefined).join('\n'));
}
