/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import util from 'util';

export function prettyPrint(arg: unknown): void {
	console.log(util.inspect(arg, false, null, true));
}

export function safeStringify(obj: any, indent = 2): string {
	let cache: any[] | null = [];
	const retVal = JSON.stringify(
		obj,
		(key, value) =>
			typeof value === 'object' && value !== null && cache
				? cache.includes(value)
					? undefined // Duplicate reference found, discard key
					: cache.push(value) && value // Store value in our collection
				: value,
		indent
	);
	cache = null;
	return retVal;
}
