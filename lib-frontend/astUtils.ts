import { ProgramCollection } from '@lib-frontend/ast';
import {
	ExtendedNode,
	ExtendedNodeT,
	FunctionType,
	isBlockStatement,
	isCallExpression,
	isIdentifier,
	isReturnStatement,
} from '@lib-frontend/astTypes';
import { panic } from '@utils/macros';
import { namedTypes as n } from 'ast-types';

function basename(filename: string) {
	let idx = filename.lastIndexOf('/');
	if (idx === -1) {
		idx = filename.lastIndexOf('\\');
	}
	return filename.substring(idx + 1);
}

function functionName(fn: FunctionType) {
	if (!fn.id) {
		return 'anon';
	} else {
		return fn.id.name;
	}
}

// TODO: check if enclosing fn should be Option type
function enclosingFunctionName(enclosingFn: FunctionType | undefined) {
	if (!enclosingFn) {
		return 'global';
	} else if (!enclosingFn.id) {
		return 'anon';
	} else {
		return enclosingFn.id.name;
	}
}

type FunctionObject = {
	name: string;
	file: string;
	range: [number, number];
	charRange: [number, number];
	code: string;
	enclosingFunctionName: string;
	colonSepId: string;
};

function colonSepId(fn: FunctionObject) {
	return fn.file + ':' + fn.name + ':' + fn.range[0] + ':' + fn.range[1] + ':' + (fn.charRange[1] - fn.charRange[0]);
}

function getFunctions(root: ProgramCollection, src: string) {
	const fns: Partial<FunctionObject>[] = [];
	const fnNodes = root.attributes?.functions;

	if (!fnNodes) return;

	for (const _fnNode of fnNodes) {
		const fnNode = _fnNode as ExtendedNodeT<FunctionType>;
		const fnName = functionName(fnNode);

		const startLine = fnNode.loc?.start.line;
		const endLine = fnNode.loc?.end.line;
		if (!startLine || !endLine) {
			panic('Startline or endline not available');
			return;
		}

		fns.push({
			name: fnName,
			file: fnNode.attributes!.enclosingFile,
			range: [startLine, endLine],
			charRange: fnNode.range,
			code: src.substring(fnNode.range![0], fnNode.range![1]),
			enclosingFunctionName: enclosingFunctionName(fnNode.attributes!.enclosingFunction),
			colonSepId: '',
		});
	}

	// We know that fn is not partial
	fns.map((fn) => (fn.colonSepId = colonSepId(fn as FunctionObject)));

	// Create a dummy fn for global context
	console.assert(root.programs.length === 1);
	const prog = root.programs[0];
	if (!prog.loc) {
		panic('loc is null');
		return;
	}

	fns.push({
		name: 'global',
		file: prog.attributes?.fileName,
		range: [prog.loc.start.line, prog.loc.end.line],
		charRange: undefined,
		code: undefined,
		enclosingFunctionName: undefined,
		colonSepId: prog.attributes?.fileName + ':global',
	});

	return fns;
}

// Check if a node calls a function
// TODO: could extend this to check if a node references a var
function isCallTo(node: n.Node, fnName: string): boolean {
	if (!isCallExpression(node)) {
		return false;
	}

	const { callee } = node;

	if (!isIdentifier(callee)) {
		return false;
	}

	return callee.name === fnName;
}

function getReturnValues(node: FunctionType) {
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
