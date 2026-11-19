/** One example row in help text: the command, then what it does in a column. A command too long for the column puts
 * its description on the next line, aligned, instead of running into it. */
export function helpRow(cmd: string, what: string, width: number): string {
	if (!what) return `  ${cmd}`;
	return cmd.length < width ? `  ${cmd.padEnd(width)}${what}` : `  ${cmd}\n  ${' '.repeat(width)}${what}`;
}
