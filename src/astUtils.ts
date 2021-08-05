import { parse as acornParse } from 'acorn';
import fs from 'fs';
import * as E from 'fp-ts/Either';
import {
	FunctionExpression,
	Property,
	Literal,
	FunctionDeclaration,
	ArrowFunctionExpression,
	MethodDefinition,
} from 'estree';
import { panic } from './macros';

type ExtendedNode = acorn.Node & {
	attributes?: {
		fileName?: string;
		functions?: unknown[];
		calls?: unknown[];
		enclosingFunction?: unknown;
		enclosingFile?: unknown;
		parent?: ExtendedNode;
		childPropName?: string;
	};
};

type ProgramCollection = {
	type: string;
	programs: ExtendedNode[];
	attributes: {
		fileName?: string;
		functions?: unknown[];
		calls?: unknown[];
		enclosingFunction?: unknown;
		enclosingFile?: unknown;
	};
};

function parse(src: string) {
	try {
		const node = acornParse(src, {
			ecmaVersion: 'latest',
			sourceType: 'module',
			locations: true,
			ranges: true,
		});
		return E.right(node);
	} catch (e) {
		return E.left(e as SyntaxError);
	}
}

function buildProgram(fileName: string, src: string) {
	const program = parse(src);
	return E.map((obj: acorn.Node) => ({ ...obj, attributes: { fileName } }))(program);
}

export function astFromFiles(files: string[]): E.Either<never, ProgramCollection> {
	const formattedAst: ProgramCollection = {
		type: 'ProgramCollection',
		programs: [],
		attributes: {},
	};

	for (const f of files) {
		const src = fs.readFileSync(f, 'utf-8');
		const program = buildProgram(f, src);
		if (E.isRight(program)) {
			formattedAst.programs.push(program.right);
		}
	}
	preProcess(formattedAst);
	return E.right(formattedAst);
}

export function astFromSrc(fileName: string, src: string): E.Either<SyntaxError, ProgramCollection> {
	const program = buildProgram(fileName, src);

	const formattedAst: E.Either<SyntaxError, ProgramCollection> = E.map((program: acorn.Node) => ({
		type: 'ProgramCollection',
		programs: [program],
		attributes: {},
	}))(program);

	E.map(preProcess)(formattedAst);
	return formattedAst;
}

function walk(
	root: ExtendedNode,
	callback: (
		node: ExtendedNode,
		traverse: (node: ExtendedNode, parent?: ExtendedNode) => void,
		parent?: ExtendedNode,
		childPropName?: string
	) => boolean
) {
	function traverse(node: ExtendedNode, parent?: ExtendedNode, childPropName?: string) {
		if (!node || typeof node !== 'object') return;

		if (node.type) {
			const res = callback(node, traverse, parent, childPropName);
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
	traverse(root);
}

function preProcess(root: ProgramCollection) {
	let enclosingFunction: acorn.Node;
	let enclosingFile: string | undefined;
	root.attributes.functions = [];
	root.attributes.calls = [];

	for (const p of root.programs) {
		walk(p, (node, traverse, parent, childPropName): boolean => {
			if (!node.attributes) {
				node.attributes = {};
			}
			if (enclosingFunction) {
				node.attributes.enclosingFunction = enclosingFunction;
			}
			if (enclosingFile) {
				node.attributes.enclosingFile = enclosingFile;
			}

			if (node.type === 'Program') {
				enclosingFile = node.attributes.fileName;
			}

			if (node.type === 'FunctionExpression' && parent?.type === 'Property') {
				const _parent = parent as unknown as Property;
				const _node = node as unknown as FunctionExpression;

				if (!_parent.computed) {
					if (_parent.key.type === 'Identifier') {
						_node.id = _parent.key;
					} else if (_parent.key.type === 'Literal') {
						const _key = _parent.key as Literal;
						_node.id = {
							type: 'Identifier',
							name: _key.value?.toString() ?? 'Unknown Name',
							range: _key.range,
							loc: _key.loc,
						};
					} else {
						panic('Invalid syntax: Unexpected key type on Property');
					}
				}
			}

			if (
				node.type === 'FunctionDeclaration' ||
				node.type === 'FunctionExpression' ||
				node.type === 'ArrowFunctionExpression'
			) {
				root.attributes.functions?.push(node);
				node.attributes.parent = parent;
				node.attributes.childPropName = childPropName;
				const prevEnclosingFn = enclosingFunction;
				enclosingFunction = node;
				{
					const _node = node as unknown as FunctionDeclaration | FunctionExpression;
					_node.id && traverse(_node.id as unknown as ExtendedNode);
				}
				const _node = node as unknown as FunctionDeclaration | FunctionExpression | ArrowFunctionExpression;
				traverse(_node.params as unknown as ExtendedNode);
				traverse(_node.body as unknown as ExtendedNode);
				enclosingFunction = prevEnclosingFn;
				return false;
			}

			if (node.type === 'MethodDefinition') {
				const _node = node as unknown as MethodDefinition;
				if (!_node.computed) {
					if (_node.key.type === 'Identifier') {
						_node.value.id = _node.key;
					} else if (_node.key.type === 'Literal') {
						panic('Invalid syntax: Method name cannot be literal');
					} else {
						panic('Invalid syntax: Unexpected key type for MethodDefinition');
					}
				} else {
					panic('Unimplemented: Computed keys for MethodDefinition');
				}
			}

			if (node.type === 'CallExpression' || node.type === 'NewExpression') {
				root.attributes.calls?.push(node);
			}
			return true;
		});
	}
}
