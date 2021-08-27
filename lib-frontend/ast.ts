// Recast version of ast
import {
	ExtendedNode,
	isArrowFunctionExpression,
	isCallExpression,
	isFunctionExpression,
	isFunctionType,
	isIdentifier,
	isLiteral,
	isMethodDefinition,
	isNewExpression,
	isProgram,
	isProperty,
} from '@lib-frontend/astTypes';
import { createExtendedNode } from '@lib-frontend/astUtils';
import { panic } from '@utils/macros';
import { namedTypes as n } from 'ast-types';
import * as E from 'fp-ts/Either';
import fs from 'fs';
import { parseModule } from 'esprima';

/**
 * @type ProgramCollection A custom top level node that holds programs from multiple files
 */
export type ProgramCollection = n.Node &
	ExtendedNode & {
		type: 'ProgramCollection';
		programs: ExtendedNode[];
	};

/**
 * @function parse A higher order wrapper around recast's parse function. Provides sane default options and wraps the resulting AST in an algebraic Either
 * @param src Source code to be parsed
 * @returns Either an ES compliant AST or an error
 */
export function parse(src: string): E.Either<SyntaxError, n.Node> {
	return E.tryCatch(
		() => parseModule(src, { range: true, loc: true }) as n.Node,
		(e) => e as SyntaxError
	);
}

/**
 * @function buildProgram appends filenames to each AST node
 * @param fileName filename that AST is generated from
 * @param src source code in the file
 * @returns annotated AST
 */
function buildProgram(fileName: string, src: string): E.Either<SyntaxError, ExtendedNode> {
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

	const formattedAst: E.Either<SyntaxError, ProgramCollection> = E.map(
		(program: ExtendedNode) =>
			({
				type: 'ProgramCollection',
				programs: [program],
				attributes: {},
			} as ProgramCollection)
	)(program);

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
		traverse: (node: ExtendedNode | n.Node, parent?: ExtendedNode) => void,
		parent?: ExtendedNode,
		childPropName?: string,
		state?: State
	) => boolean | undefined,
	initialState?: State
): void {
	function traverse(node: ExtendedNode | n.Node, parent?: ExtendedNode, childPropName?: string, state?: State) {
		if (!node || typeof node !== 'object') return;

		const _node = createExtendedNode(node);
		if (_node.type) {
			const res = callback(_node, traverse, parent, childPropName, state);
			if (res === false) return;
		}

		for (const propName in _node) {
			// Ignore metadata and prototype
			// eslint-disable-next-line no-prototype-builtins
			if (!node.hasOwnProperty(propName) || propName.match(/^(range|loc|attributes|comments|raw)$/)) {
				continue;
			}
			traverse((node as never)[propName], _node, propName);
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

	walk(root, (node, traverse, parent, childPropName): boolean | undefined => {
		if (!node.attributes) {
			node.attributes = {};
		}
		if (enclosingFunction && isFunctionType(enclosingFunction)) {
			node.attributes.enclosingFunction = enclosingFunction;
		}
		if (enclosingFile) {
			node.attributes.enclosingFile = enclosingFile;
		}

		if (isProgram(node)) {
			enclosingFile = node.attributes.fileName;
		}

		if (isFunctionExpression(node) && parent && isProperty(parent)) {
			if (!parent.computed) {
				if (isIdentifier(parent.key)) {
					node.id = parent.key;
				} else if (isLiteral(parent.key)) {
					node.id = {
						type: 'Identifier',
						name: parent.key.value?.toString() ?? 'Unknown Name',
						range: createExtendedNode(parent.key).range,
						loc: parent.key.loc,
					} as n.Identifier;
				} else {
					panic('[Ast::preProcess] Invalid syntax: Unexpected key type on Property');
				}
			}
		}

		if (isFunctionType(node)) {
			root.attributes!.functions!.push(node);
			if (node.attributes === undefined) {
				node.attributes = {};
			}
			node.attributes.parent = parent;
			node.attributes.childPropName = childPropName;
			const prevEnclosingFn = enclosingFunction;
			enclosingFunction = node;
			if (!isArrowFunctionExpression(node)) {
				traverse(node.id as ExtendedNode);
			}
			for (const p of node.params) {
				traverse(createExtendedNode(p));
			}
			traverse(node.body as ExtendedNode);
			enclosingFunction = prevEnclosingFn;
			return false;
		}

		if (isMethodDefinition(node)) {
			if (!node.computed) {
				if (isIdentifier(node.key)) {
					node.value.id = node.key;
				} else if (isLiteral(node.key)) {
					panic('[Ast::preProcess] Invalid syntax: Method name cannot be literal');
				} else {
					panic('[Ast::preProcess] Invalid syntax: Unexpected key type for MethodDefinition');
				}
			} else {
				panic('[Ast::preProcess] Unimplemented: Computed keys for MethodDefinition');
			}
		}

		if (isCallExpression(node) || isNewExpression(node)) {
			root.attributes!.calls?.push(node);
		}
	});
}
