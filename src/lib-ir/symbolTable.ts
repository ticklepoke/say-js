import * as O from 'fp-ts/lib/Option';
import { TSFixMe } from '../utils/types';

// TODO: add type, pointer to outer scope
type Outer = TSFixMe;

export default class SymbolTable {
	outerScope: Outer;
	_values: Record<string, TSFixMe>;

	constructor(outerScope: Outer) {
		this.outerScope = outerScope;
		this._values = {};
	}

	get(name: string): O.Option<TSFixMe> {
		const mangledName = mangle(name);
		if (this.has(name)) {
			return O.some(this._values[mangledName]);
		}
		return O.none;
	}

	has(name: string): boolean {
		return mangle(name) in this._values;
	}

	set(name: string, value: string): void {
		this._values[mangle(name)] = value;
	}

	get values(): TSFixMe[] {
		return Object.keys(this.values)
			.filter(isMangled)
			.map((key) => this._values[key]);
	}
}

export function mangle(name: string): string {
	return `$${name}`;
}

export function isMangled(name: string): boolean {
	return name[0] === '$';
}
