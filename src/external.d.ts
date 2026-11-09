declare module '@babel/plugin-transform-typescript' {
	const plugin: import('@babel/core').PluginItem;
	export default plugin;
}

declare module 'fontkit' {
	export type FontkitFont = {
		familyName: string;
		unitsPerEm: number;
		ascent: number;
		descent: number;
		layout: (text: string) => {
			advanceWidth: number;
			glyphs: { bbox: { minX: number; minY: number; maxX: number; maxY: number } }[];
		};
	};
	export function create(buffer: Buffer | Uint8Array): FontkitFont;
}
