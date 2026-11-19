// The brand's font files as brand.json lists them, read with fontkit: their roles, weights and family names.
import { readFileSync } from 'node:fs';
import { create, type FontkitFont } from 'fontkit';
import { brand } from '../lib/brand.js';
import { pkgPath } from '../lib/paths.js';

export type Role = 'sans' | 'medium' | 'semibold' | 'mono';

type Face = {
	role: Role;
	weight: number;
	file: string;
	/** Family name stored in the font file, before the medium face is aliased onto the sans family. */
	fileFamily: string;
	/** Family name to request. Medium is selected with font-weight on the sans family. */
	cssFamily: string;
	buffer: Buffer;
	font: FontkitFont;
};

let loaded: Face[] | undefined;

function load(): Face[] {
	if (loaded) return loaded;
	const files = brand().fonts.files;
	if (!files?.length) throw new Error('brand.json needs fonts.files so images can use the brand type.');
	const faces: Face[] = [];
	for (const spec of files) {
		if (!['sans', 'medium', 'semibold', 'mono'].includes(spec.role)) throw new Error(`Unknown font role "${spec.role}".`);
		const buffer = readFileSync(pkgPath('brand', spec.file));
		const font = create(buffer);
		if (typeof font.layout !== 'function' || !font.familyName) throw new Error(`Could not read ${spec.file}.`);
		faces.push({ role: spec.role as Role, weight: spec.weight, file: spec.file, fileFamily: font.familyName, cssFamily: font.familyName, buffer, font });
	}
	const sans = faces.find((face) => face.role === 'sans');
	const medium = faces.find((face) => face.role === 'medium');
	const mono = faces.find((face) => face.role === 'mono');
	if (!sans || !medium || !mono) throw new Error('fonts.files needs a sans face, a medium face and a mono face.');
	// The medium and semibold files' own family names are not what a renderer matches at weight 500 or 600.
	for (const face of faces) if (face.role === 'medium' || face.role === 'semibold') face.cssFamily = sans.font.familyName;
	for (const face of faces) if (face.role === 'mono') face.cssFamily = mono.font.familyName.replace(/ (Medium|SemiBold)$/, '');
	loaded = faces;
	return faces;
}

/** The font files the brand actually ships, after the medium face is aliased onto the sans family. */
export function fontFacts() {
	return load().map((item) => ({
		role: item.role,
		weight: item.weight,
		file: item.file,
		family: item.cssFamily,
		fileFamily: item.fileFamily,
		bytes: item.buffer.length,
	}));
}

