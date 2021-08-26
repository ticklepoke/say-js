import * as O from 'fp-ts/lib/Option';

export default class SymbolTable<T> {
	outerScope: SymbolTable<T> | undefined;
	global: boolean;
	_values: Record<string, T>;

	constructor(outerScope?: SymbolTable<T>) {
		this.outerScope = outerScope;
		this._values = {};
		this.global = false;
	}

	get(name: string): O.Option<T> {
		const mangledName = mangle(name);
		if (this.has(name)) {
			return O.some(this._values[mangledName]);
		}
		return O.none;
	}

	has(name: string): boolean {
		return mangle(name) in this._values;
	}

	set(name: string, value: T): void {
		this._values[mangle(name)] = value;
	}

	values(): T[] {
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
