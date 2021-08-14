import { functionVertex, getVertexForNodeType, propertyVertex } from '@lib-calllgraph/flowGraph';
import { FlowGraph } from '@lib-calllgraph/graph';
import { ProgramCollection, walk } from '@lib-frontend/ast';
import {
	ExtendedNode,
	ExtendedNodeT,
	isCallExpression,
	isCallTo,
	isClassDeclaration,
	isClassExpression,
	isExportAllDeclaration,
	isExportDefaultDeclaration,
	isExportNamedDeclaration,
	isFunctionDeclaration,
	isFunctionType,
	isImportDeclaration,
	isImportDefaultSpecifier,
	isImportNamespaceSpecifier,
	isImportSpecifier,
	isLiteral,
	isMethodDefinition,
	isModuleExports,
	isVariableDeclarator,
} from '@lib-frontend/astTypes';
import { createExtendedNode, createExtendedNodeT } from '@lib-frontend/astUtils';
import { namedTypes as n } from 'ast-types';
import path from 'path';
import { panic } from './macros';

type ExpFunctions = Record<
	string,
	{ default: ExtendedNode[]; named: Record<string, ExtendedNodeT<n.Identifier>>; redirect: string[] }
>;
type ImpFunctions = Record<
	string,
	Record<
		string,
		{ default: ExtendedNodeT<n.Identifier>[]; named: Record<string, ExtendedNodeT<n.Identifier>[]>; entire: boolean }
	>
>;

function addFileToExports(expFunctions: ExpFunctions, fileName: string) {
	expFunctions[fileName] = {
		default: [],
		named: {},
		redirect: [],
	};
}

function addSrcToFile(impFunctions: ImpFunctions, fileName: string, srcFileName: string) {
	impFunctions[fileName][srcFileName] = {
		default: [],
		named: {},
		entire: false,
	};
}

// Prevent imported / exported functions from colliding with prototype properties
function mangle(fnName: string) {
	return `$${fnName}`;
}

function unMangle(fnName: string) {
	return fnName.substring(1);
}

/**
 * CJS: module.exports = function ...
 * ESM: export default
 */
function addDefaultExport(expFunctions: ExpFunctions, fileName: string, node: ExtendedNode) {
	if (!(fileName in expFunctions)) {
		addFileToExports(expFunctions, fileName);
	}
	expFunctions[fileName].default.push(node);
}

/**
 * export function foo() {}
 * export { fooVar as foo, fooFn as fooF };
 */
function addNamedExport(
	expFunctions: ExpFunctions,
	fileName: string,
	local: ExtendedNodeT<n.Identifier>,
	exportedName: string
) {
	if (!(fileName in expFunctions)) {
		addFileToExports(expFunctions, fileName);
	}
	const mangledExportedName = mangle(exportedName);
	if (expFunctions[fileName].named[exportedName]) {
		panic('[modules::addNamedExport] Reassignment to exported name');
	}

	expFunctions[fileName].named[mangledExportedName] = local;
}

/**
 * barrel exports through an index file
 */
function addRedirectExport(expFunctions: ExpFunctions, fileName: string, redirectFileName: string) {
	if (!(fileName in expFunctions)) {
		addFileToExports(expFunctions, fileName);
	}
	expFunctions[fileName].redirect.push(redirectFileName);
}

/**
 * import foo from 'bar'
 */
function addDefaultImport(
	impFunctions: ImpFunctions,
	fileName: string,
	srcFileName: string,
	node: ExtendedNodeT<n.Identifier>
) {
	if (!(fileName in impFunctions)) {
		impFunctions[fileName] = {};
	}

	if (!(srcFileName in impFunctions[fileName])) {
		addSrcToFile(impFunctions, fileName, srcFileName);
	}

	impFunctions[fileName][srcFileName].default.push(node);
}

/**
 * import {foo as bar} from 'baz'
 */
function addNamedImport(
	impFunctions: ImpFunctions,
	fileName: string,
	srcFileName: string,
	local: ExtendedNodeT<n.Identifier>,
	importedName: string
) {
	if (!(fileName in impFunctions)) {
		impFunctions[fileName] = {};
	}

	if (!(srcFileName in impFunctions[fileName])) {
		addSrcToFile(impFunctions, fileName, srcFileName);
	}

	const { named } = impFunctions[fileName][srcFileName];

	const mangledName = mangle(importedName);

	if (named[mangledName]) {
		named[mangledName].push(local);
	} else {
		named[mangledName] = [local];
	}
}

/**
 * import * as foo from 'bar'
 */
function addEntireImport(impFunctions: ImpFunctions, fileName: string, srcFileName: string) {
	if (!(fileName in impFunctions)) {
		impFunctions[fileName] = {};
	}

	if (!(srcFileName in impFunctions[fileName])) {
		addSrcToFile(impFunctions, fileName, srcFileName);
	}

	impFunctions[fileName][srcFileName].entire = true;
}

/**
 * Add edge from srcFileName's default export to node in flowgraph
 */
function connectDefaultImport(
	expFunctions: ExpFunctions,
	flowGraph: FlowGraph,
	srcFileName: string,
	node: ExtendedNodeT<n.Identifier>
) {
	if (!(srcFileName in expFunctions)) return;

	for (const expr of expFunctions[srcFileName].default) {
		if (isFunctionType(expr)) {
			flowGraph.addEdge(functionVertex(expr), getVertexForNodeType(node));
		} else if (isClassDeclaration(expr) || isClassExpression(expr)) {
			const { body } = expr.body;
			for (const stmt of body) {
				if (isMethodDefinition(stmt) && stmt.kind === 'constructor' && isFunctionType(stmt.value)) {
					flowGraph.addEdge(functionVertex(stmt.value), getVertexForNodeType(node));
				}
			}
		} else {
			flowGraph.addEdge(getVertexForNodeType(expr), getVertexForNodeType(node));
		}
	}
}

function connectedNamedImport(
	expFunctions: ExpFunctions,
	flowGraph: FlowGraph,
	srcFileName: string,
	local: ExtendedNodeT<n.Identifier>,
	importedName: string
) {
	if (!(srcFileName in expFunctions)) return;

	for (const redirectFileName of expFunctions[srcFileName].redirect) {
		connectedNamedImport(expFunctions, flowGraph, redirectFileName, local, importedName);
	}

	const { named } = expFunctions[srcFileName];

	if (!named[importedName]) return;

	flowGraph.addEdge(getVertexForNodeType(named[importedName]), getVertexForNodeType(local));
}

function connectEntireImport(expFunctions: ExpFunctions, flowGraph: FlowGraph, srcFileName: string) {
	if (!(srcFileName in expFunctions)) return;

	for (const redirectFileName of expFunctions[srcFileName].redirect) {
		connectEntireImport(expFunctions, flowGraph, redirectFileName);
	}

	const { named } = expFunctions[srcFileName];

	for (const expName in named) {
		flowGraph.addEdge(
			getVertexForNodeType(named[expName]),
			propertyVertex({ type: 'Literal', value: unMangle(expName) })
		);
	}
}

function getRelativePath(curPath: string, importPath: string) {
	return path.join(curPath, '..', importPath) + '.js';
}

export function collectExportsImports(
	ast: ProgramCollection,
	expFunctions: ExpFunctions,
	impFunctions: ImpFunctions
): void {
	for (const prog of ast.programs) {
		const fileName = prog.attributes.fileName ?? '';

		walk(prog, (n) => {
			// Exports
			// cjs: module.exports = fn
			if (isModuleExports(n)) {
				addDefaultExport(expFunctions, fileName, n);
			}

			// amd: define(function() {return fn})
			if (isCallTo(n, 'define')) {
				panic('[modules::collectExportsImports] AMD exports not supported');
			}

			// esm: export default function foo
			if (isExportDefaultDeclaration(n)) {
				addDefaultExport(expFunctions, fileName, createExtendedNode(n.declaration));
			}

			// export function foo
			if (isExportNamedDeclaration(n)) {
				if (n.source) {
					const relativeImportPath = getRelativePath(fileName, n.source.value?.toString() ?? '');
					addRedirectExport(expFunctions, fileName, relativeImportPath);
				} else if (n.declaration && isFunctionDeclaration(n.declaration) && n.declaration.id) {
					addNamedExport(
						expFunctions,
						fileName,
						createExtendedNodeT<n.Identifier>(n.declaration.id),
						n.declaration.id?.name
					);
				} else if (n.specifiers) {
					for (const specifier of n.specifiers) {
						if (specifier.local) {
							addNamedExport(
								expFunctions,
								fileName,
								createExtendedNodeT<n.Identifier>(specifier.local),
								specifier.exported.name
							);
						}
					}
				}
			}

			// export * from ...
			if (isExportAllDeclaration(n)) {
				// TODO: implementation
				panic('[modules::collectExportsImports] Export all not supported yet');
			}

			// Imports
			// const foo = require()
			if (isVariableDeclarator(n)) {
				const { init } = n;
				if (init && isCallExpression(init) && isCallTo(init, 'require')) {
					const firstArg = init.arguments[0];
					if (isLiteral(firstArg)) {
						const requirePath = firstArg.value;
						if (typeof requirePath === 'string') {
							const relativeRequirePath = getRelativePath(fileName, requirePath);
							addDefaultImport(impFunctions, fileName, relativeRequirePath, createExtendedNodeT<n.Identifier>(n.id));
						}
					}
				}
			}
			// import foo from
			if (isImportDeclaration(n)) {
				const relativeImportPath = getRelativePath(fileName, n.source.value?.toString() ?? '');

				if (n.specifiers) {
					for (const specifier of n.specifiers) {
						if (isImportSpecifier(specifier) && specifier.local) {
							addNamedImport(
								impFunctions,
								fileName,
								relativeImportPath,
								createExtendedNodeT<n.Identifier>(specifier.local),
								specifier.imported.name
							);
						} else if (isImportDefaultSpecifier(specifier) && specifier.local) {
							addDefaultImport(
								impFunctions,
								fileName,
								relativeImportPath,
								createExtendedNodeT<n.Identifier>(specifier.local)
							);
						} else if (isImportNamespaceSpecifier(specifier)) {
							addEntireImport(impFunctions, fileName, relativeImportPath);
						}
					}
				}
			}
			return false;
		});
	}
}

export function connectImports(flowGraph: FlowGraph, expFunctions: ExpFunctions, impFunctions: ImpFunctions): void {
	for (const fileName in impFunctions) {
		for (const srcFileName in impFunctions[fileName]) {
			if (!(srcFileName in expFunctions)) continue;

			const imports = impFunctions[fileName][srcFileName];

			for (const node of imports.default) {
				connectDefaultImport(expFunctions, flowGraph, srcFileName, node);
			}

			for (const importedName in imports.named) {
				for (const local of imports.named[importedName]) {
					connectedNamedImport(expFunctions, flowGraph, srcFileName, local, importedName);
				}
			}

			if (imports.entire) {
				connectEntireImport(expFunctions, flowGraph, srcFileName);
			}
		}
	}
}
