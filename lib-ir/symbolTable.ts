import { ExtendedNode } from '@lib-frontend/astTypes';
import * as O from 'fp-ts/lib/Option';

export default class SymbolTable {
	outerScope: SymbolTable | undefined;
	global: boolean;
	_values: Record<string, ExtendedNode>;

	constructor(outerScope?: SymbolTable) {
		this.outerScope = outerScope;
		this._values = {};
		this.global = false;
	}

	get(name: string): O.Option<ExtendedNode> {
		const mangledName = mangle(name);
		if (this.has(name)) {
			return O.some(this._values[mangledName]);
		}
		return O.none;
	}

	has(name: string): boolean {
		return mangle(name) in this._values;
	}

	set(name: string, value: ExtendedNode): void {
		this._values[mangle(name)] = value;
	}

	get values(): ExtendedNode[] {
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
