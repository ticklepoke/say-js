import util from 'util';

export function prettyPrint(arg: unknown): void {
	console.log(util.inspect(arg, false, null, true));
}
