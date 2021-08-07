// Recast version of ast
// TODO: if types work better, remove acorn and @types/estree
import {
	CallType,
	FunctionType,
	isArrowFunctionExpression,
	isCallExpression,
	isFunctionDeclaration,
	isFunctionExpression,
	isFunctionType,
	isIdentifier,
	isLiteral,
	isMethodDefinition,
	isNewExpression,
	isProperty,
} from '@lib-frontend/astTypes';
import SymbolTable from '@lib-ir/symbolTable';
import { panic } from '@utils/macros';
import { namedTypes as n } from 'ast-types';
import * as E from 'fp-ts/Either';
import fs from 'fs';
import { parse as recastParse } from 'recast';

type Attributes = {
	fileName: string;
	functions: FunctionType[];
	calls: CallType[];
	enclosingFunction: FunctionType;
	enclosingFile: string;
	parent: ExtendedNode;
	childPropName: string;
	scope: SymbolTable;
};

/**
 * @type ExtendedNode Adds extra metadata to be used for parsing. Extends ast-types::Node.
 */
export type ExtendedNode = n.Node & {
	range?: [number, number];
	attributes?: Partial<Attributes>;
};

// For use when extending a specific AST node
export type ExtendedNodeT<T extends n.Node> = T & {
	range?: [number, number];
	attributes?: Partial<Attributes>;
};

/**
 * @type ProgramCollection A custom top level node that holds programs from multiple files
 */
export type ProgramCollection = n.Node &
	ExtendedNode & {
		type: string;
		programs: ExtendedNode[];
	};

/**
 * @function parse A higher order wrapper around recast's parse function. Provides sane default options and wraps the resulting AST in an algebraic Either
 * @param src Source code to be parsed
 * @returns Either an ES compliant AST or an error
 */
export function parse(src: string): E.Either<SyntaxError, n.Node> {
	try {
		const ast: n.Node = recastParse(src, {
			range: true,
		});
		return E.right(ast);
	} catch (e) {
		return E.left(e);
	}
}

/**
 * @function buildProgram appends filenames to each AST node
 * @param fileName filename that AST is generated from
 * @param src source code in the file
 * @returns annotated AST
 */
function buildProgram(fileName: string, src: string) {
	const program = parse(src);
	return E.map((obj: n.Node) => ({ ...obj, attributes: { fileName } }))(program);
}

/**
 * @function astFromFiles creates a collection of ASTs from individual files
 * @param files Input file to generate
 * @returns Either formatted AST or error
 */
export function astFromFiles(files: string[]): E.Either<SyntaxError, ProgramCollection> {
	const formattedAst: ProgramCollection = {
		type: 'ProgramCollection',
		programs: [],
		attributes: {},
	};

	for (const f of files) {
		const src = fs.readFileSync(f, 'utf-8');
		const program = buildProgram(f, src);
		if (E.isLeft(program)) {
			return program;
		} else {
			formattedAst.programs.push(program.right);
		}
	}
	preProcess(formattedAst);
	return E.right(formattedAst);
}

/**
 * @function astFromSrc creates an AST from a single filename
 * @param fileName file to parse
 * @param src source code of file
 * @returns Either formatted AST or error
 */
export function astFromSrc(fileName: string, src: string): E.Either<SyntaxError, ProgramCollection> {
	const program = buildProgram(fileName, src);

	const formattedAst: E.Either<SyntaxError, ProgramCollection> = E.map((program: n.Node) => ({
		type: 'ProgramCollection',
		programs: [program],
		attributes: {},
	}))(program);

	E.map(preProcess)(formattedAst);
	return formattedAst;
}

// Markers to check if we are traversing specific branches
type State = {
	withinParams: boolean;
	withinDeclarator: boolean;
};

/**
 * @function walk Traverses the AST recursively
 * @param root Entry point to traverse
 * @param callback A visitor function to execute on each node
 * @param initialState State to track the traversal
 */
export function walk(
	root: ExtendedNode,
	callback: (
		node: ExtendedNode,
		traverse: (node: ExtendedNode, parent?: ExtendedNode) => void,
		parent?: ExtendedNode,
		childPropName?: string,
		state?: State
	) => boolean,
	initialState?: State
): void {
	function traverse(node: ExtendedNode, parent?: ExtendedNode, childPropName?: string, state?: State) {
		if (!node || typeof node !== 'object') return;

		if (node.type) {
			const res = callback(node, traverse, parent, childPropName, state);
			if (!res) return;
		}

		for (const propName in node) {
			// Ignore metadata and prototype
			// eslint-disable-next-line no-prototype-builtins
			if (!node.hasOwnProperty(propName) || propName.match(/^(range|loc|attributes|comments|raw)$/)) {
				continue;
			}
			traverse((node as never)[propName], node, propName);
		}
	}
	traverse(root, undefined, undefined, initialState);
}

/**
 * @function preProcess PreProcesses the AST by adding enclosing file names and functions to each node
 * @param root ProgramCollection
 */
function preProcess(root: ProgramCollection) {
	let enclosingFunction: n.Node;
	let enclosingFile: string | undefined;
	if (!root.attributes) {
		root.attributes = {};
	}
	root.attributes.functions = [];
	root.attributes.calls = [];

	for (const p of root.programs) {
		walk(p, (node, traverse, parent, childPropName): boolean => {
			if (!node.attributes) {
				node.attributes = {};
			}
			if (enclosingFunction && isFunctionType(enclosingFunction)) {
				node.attributes.enclosingFunction = enclosingFunction;
			}
			if (enclosingFile) {
				node.attributes.enclosingFile = enclosingFile;
			}

			if (node.type === 'Program') {
				enclosingFile = node.attributes.fileName;
			}

			if (isFunctionExpression(node) && parent && isProperty(parent)) {
				if (!parent.computed) {
					if (parent.key.type === 'Identifier') {
						node.id = parent.key;
					} else if (parent.key.type === 'Literal') {
						node.id = {
							type: 'Identifier',
							name: parent.key.value?.toString() ?? 'Unknown Name',
							range: (parent.key as ExtendedNode).range,
							loc: parent.key.loc,
						} as n.Identifier;
					} else {
						panic('Invalid syntax: Unexpected key type on Property');
					}
				}
			}

			if (isFunctionExpression(node) || isFunctionDeclaration(node) || isArrowFunctionExpression(node)) {
				root.attributes?.functions?.push(node);
				const extendedNode = node as ExtendedNodeT<typeof node>;
				if (extendedNode.attributes === undefined) {
					extendedNode.attributes = {};
				}
				extendedNode.attributes.parent = parent;
				extendedNode.attributes.childPropName = childPropName;
				const prevEnclosingFn = enclosingFunction;
				enclosingFunction = extendedNode;
				if (!isArrowFunctionExpression(node)) {
					traverse(extendedNode.id as ExtendedNode);
				}
				for (const p of extendedNode.params) {
					traverse(p as ExtendedNode);
				}
				traverse(extendedNode.body as ExtendedNode);
				enclosingFunction = prevEnclosingFn;
				return false;
			}

			if (isMethodDefinition(node)) {
				if (!node.computed) {
					if (isIdentifier(node.key)) {
						node.value.id = node.key;
					} else if (isLiteral(node.key)) {
						panic('Invalid syntax: Method name cannot be literal');
					} else {
						panic('Invalid syntax: Unexpected key type for MethodDefinition');
					}
				} else {
					panic('Unimplemented: Computed keys for MethodDefinition');
				}
			}

			if (isCallExpression(node) || isNewExpression(node)) {
				root.attributes!.calls?.push(node);
			}
			return true;
		});
	}
}
