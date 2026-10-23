import pc from 'picocolors';

export type OutputOptions = { json?: boolean };

export function emit(options: OutputOptions, data: unknown, text: () => string) {
	process.stdout.write(options.json ? `${JSON.stringify(data, null, 2)}\n` : `${text()}\n`);
}

export const color = pc;
