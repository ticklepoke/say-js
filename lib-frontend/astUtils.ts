import { ExtendedNode, ExtendedNodeT, FunctionType, isBlockStatement, isReturnStatement } from '@lib-frontend/astTypes';
import { namedTypes as n } from 'ast-types';

function basename(filename: string) {
	let idx = filename.lastIndexOf('/');
	if (idx === -1) {
		idx = filename.lastIndexOf('\\');
	}
	return filename.substring(idx + 1);
}

export function functionName(fn: FunctionType): string {
	if (!fn.id) {
		return 'anon';
	} else {
		return fn.id.name;
	}
}

// TODO: check if enclosing fn should be Option type
export function enclosingFunctionName(enclosingFn: FunctionType | undefined): string {
	if (!enclosingFn) {
		return 'global';
	} else if (!enclosingFn.id) {
		return 'anon';
	} else {
		return enclosingFn.id.name;
	}
}

export function getReturnValues(node: FunctionType): n.Node[] {
	const list: n.Node[] = [];
	const fnBody = node.body;

	if (isBlockStatement(fnBody)) {
		const block = fnBody.body;
		for (const stmt of block) {
			if (isReturnStatement(stmt) && stmt.argument) {
				list.push(stmt.argument);
			}
		}
	} else {
		list.push(fnBody);
	}
	return list;
}

export function prettyPrintPosition(node: ExtendedNode): string {
	const filename = node.attributes?.enclosingFile ?? 'Invalid_File';
	const startLine = node.loc?.start.line ?? 'Invalid_Start_Line';
	const rangeStart = node.range ? node.range[0] : 'Invalid_Range_Start';
	const rangeEnd = node.range ? node.range[1] : 'Invalid_Range_End';

	return basename(filename) + '@' + startLine + ':' + rangeStart + '-' + rangeEnd;
}

export function createExtendedNode(node: n.Node | ExtendedNode): ExtendedNode {
	return {
		attributes: {},
		...node,
	};
}

export function createExtendedNodeT<T extends n.Node>(node: n.Node | ExtendedNode): ExtendedNodeT<T> {
	return createExtendedNode(node) as ExtendedNodeT<T>; // Doing abit of handwaving here
}
