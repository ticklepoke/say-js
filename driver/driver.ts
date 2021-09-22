import { buildCallGraph, CallGraphData } from '@lib-callgraph/callGraph';
import { Graph } from '@lib-callgraph/graph';
import {
	Vertex,
	isCalleeVertex,
	isFunctionVertex,
	isNativeVertex,
	prettyPrintVertex,
	isVariableVertex,
	isVariableDeclaratorVertex,
	isArgumentVertex,
	isExpressionVertex,
} from '@lib-callgraph/vertex';
import { astFromFiles } from '@lib-frontend/ast';
import {
	isAssignmentExpression,
	isBinaryExpression,
	isCallExpression,
	isIdentifier,
	isUpdateExpresion,
} from '@lib-frontend/astTypes';
import { enclosingFunctionName, functionName, variableDeclaratorName } from '@lib-frontend/astUtils';
import { addBindings } from '@lib-frontend/bindings';
import { collectFiles } from '@utils/files';
import { panic } from '@utils/macros';
import { RecursivePartial } from '@utils/types';
import * as E from 'fp-ts/lib/Either';
import { flow } from 'fp-ts/lib/function';
import fs from 'fs';
import path from 'path';

/**
 * For internal use, not to be confused with nodes in a graph
 */
type Node = {
	label: string;
	file: string;
	start: {
		row: number;
		column: number;
	};
	end: {
		row: number;
		column: number;
	};
	range: { start: number; end: number };
};

type Edge = {
	source: Node;
	target: Node;
};

export default class Driver {
	private static files: string[] = [];
	public static outputFileName: string;

	public static setFiles(fileList: string[]): void {
		Driver.files = [];
		for (const filePath of fileList) {
			const file = path.resolve(filePath);
			if (!fs.existsSync(file)) {
				panic(`[Driver::setFiles] File ${file} does not exist`);
			} else if (fs.statSync(file).isDirectory()) {
				const fileList = collectFiles(file, []);
				Driver.files.push(...fileList);
			} else if (file.endsWith('.js')) {
				Driver.files.push(file);
			}
		}
	}

	public static build(): RecursivePartial<Edge>[] | undefined {
		const ast = astFromFiles(Driver.files);

		function collectEdges(callGraph: CallGraphData) {
			const result: RecursivePartial<Edge>[] = [];
			callGraph.edges.iter((call, fn, annotation) => {
				const res = Driver.buildBinding(call, fn, annotation);
				if (E.isRight(res)) {
					result.push(res.right);
				} else {
					panic(E.right.toString());
				}
			});
			return { result, edges: callGraph.edges };
		}

		const res = flow(E.map(addBindings), E.map(buildCallGraph), E.map(collectEdges), E.chain(Driver.writeJSON))(ast);

		if (E.isRight(res)) {
			return res.right;
		} else {
			panic('Unable to build output');
		}
	}

	public static setOutputJson(outputFileName: string): void {
		if (!outputFileName.endsWith('.json')) {
			panic('[Driver::setOutputJson]: Filename must be json');
		}
		Driver.outputFileName = outputFileName;
	}

	private static writeJSON(props: { result: RecursivePartial<Edge>[]; edges: Graph }) {
		const { result, edges } = props;
		return E.tryCatch(
			() => {
				if (Driver.outputFileName) {
					fs.writeFileSync(path.resolve(__dirname, '../' + Driver.outputFileName), JSON.stringify(result, null, 2));
				} else {
					edges.iter((from, to, relation) => {
						console.log(relation + ': ' + prettyPrintVertex(from) + ' -> ' + prettyPrintVertex(to));
					});
				}
				return result;
			},
			(e) => e
		);
	}

	private static buildBinding(
		u: Vertex,
		v: Vertex,
		relation = 'UnknownRelation'
	): E.Either<null, RecursivePartial<Edge>> {
		const edge = {
			source: {
				label: undefined,
				file: undefined,
				start: { row: undefined, column: undefined },
				end: { row: undefined, column: undefined },
				range: { start: undefined, end: undefined },
			},
			target: {
				label: undefined,
				file: undefined,
				start: { row: undefined, column: undefined },
				end: { row: undefined, column: undefined },
				range: { start: undefined, end: undefined },
			},
			relation,
		};

		const resS = Driver.populateNode(edge.source, u);
		const resT = Driver.populateNode(edge.target, v);
		if (E.isLeft(resS) || E.isLeft(resT)) {
			return E.left(null);
		}
		return E.right(edge);
	}

	private static populateNode(n: RecursivePartial<Node>, v: Vertex): E.Either<string, RecursivePartial<Node>> {
		if (isCalleeVertex(v)) {
			const node = v.call;
			if (!node.loc || !node.range) {
				panic('[driver::populateNode] loc or range missing from node');
				return E.left('Missing Node');
			}
			const _n = n as Node;
			_n.label = enclosingFunctionName(node.attributes.enclosingFunction);
			_n.file = node.attributes.enclosingFile ?? '';
			_n.start = { row: node.loc.start.line, column: node.loc.start.column };
			_n.end = { row: node.loc.end.line, column: node.loc.end.column };
			_n.range = { start: node.range[0], end: node.range[1] };
			return E.right(_n);
		}

		if (isFunctionVertex(v)) {
			const { function: fn } = v;
			if (!fn.loc || !fn.range) {
				panic('[driver::populateNode] loc or range missing from node');
				return E.left('Missing Node');
			}
			const _n = n as Node;
			_n.label = functionName(fn);
			_n.file = fn.attributes.enclosingFile ?? '';
			_n.start = { row: fn.loc.start.line, column: fn.loc.start.column };
			_n.end = { row: fn.loc.end.line, column: fn.loc.end.column };
			_n.range = { start: fn.range[0], end: fn.range[1] };
			return E.right(_n);
		}

		if (isNativeVertex(v)) {
			n.label = v.name;
			n.file = 'Native';
			n.start!.row = undefined;
			n.end!.row = undefined;
			n.start!.column = undefined;
			n.end!.column = undefined;
			n.range = { start: undefined, end: undefined };
			return E.right(n);
		}

		if (isVariableVertex(v)) {
			const { node } = v;
			if (!isIdentifier(node)) {
				panic('[driver::populateNode] only identifier is supported');
				return E.left('Invalid Identifier Type');
			}
			if (!node.loc || !node.range) {
				panic('[driver::populateNode] loc or range missing from node');
				return E.left('Missing Node');
			}
			const _n = n as Node;
			_n.label = node.name;
			_n.file = node.attributes.enclosingFile ?? '';
			_n.start = { row: node.loc.start.line, column: node.loc.start.column };
			_n.end = { row: node.loc.end.line, column: node.loc.end.column };
			_n.range = { start: node.range[0], end: node.range[1] };
			return E.right(_n);
		}

		if (isVariableDeclaratorVertex(v)) {
			const { variableDeclarator: node } = v;
			if (!node.loc || !node.range) {
				panic('[driver::populateNode] loc or range missing from node');
				return E.left('Missing Node');
			}
			const _n = n as Node;
			_n.label = variableDeclaratorName(node);
			_n.file = node.attributes.enclosingFile ?? '';
			_n.start = { row: node.loc.start.line, column: node.loc.start.column };
			_n.end = { row: node.loc.end.line, column: node.loc.end.column };
			_n.range = { start: node.range[0], end: node.range[1] };
			return E.right(_n);
		}

		if (isArgumentVertex(v) && isCallExpression(v.node) && isIdentifier(v.node.callee)) {
			const { node } = v;
			if (!node.loc || !node.range) {
				panic('[driver::populateNode] loc or range missing from node');
				return E.left('Missing Node');
			}
			const _n = n as Node;
			// @ts-expect-error assuming its a literal now
			_n.label = node.arguments[v.index - 1].name;
			_n.file = node.attributes.enclosingFile ?? '';
			_n.start = { row: node.loc.start.line, column: node.loc.start.column };
			_n.end = { row: node.loc.end.line, column: node.loc.end.column };
			_n.range = { start: node.range[0], end: node.range[1] };
			return E.right(_n);
		}

		if (isExpressionVertex(v) && (isAssignmentExpression(v.node) || isBinaryExpression(v.node))) {
			const { node } = v;
			if (!node.loc || !node.range) {
				panic('[driver::populateNode] loc or range missing from node');
				return E.left('Missing Node');
			}

			const _n = n as Node;
			if (!isIdentifier(node.left)) {
				panic('[driver::populateNode] Only identifiers supported');
				return E.left('Unsupported node');
			}
			if (!node.left.loc || !node.left.range) {
				panic('[driver::populateNode] loc or range missing from node');
				return E.left('Missing Node');
			}
			_n.label = node.left.name;
			_n.file = node.left.attributes.enclosingFile ?? '';
			_n.start = { row: node.left.loc.start.line, column: node.left.loc.start.column };
			_n.end = { row: node.left.loc.end.line, column: node.left.loc.end.column };
			_n.range = { start: node.left.range[0], end: node.left.range[1] };
			return E.right(_n);
		}

		if (isExpressionVertex(v) && isUpdateExpresion(v.node)) {
			const { node } = v;
			if (!node.loc || !node.range) {
				panic('[driver::populateNode] loc or range missing from node');
				return E.left('Missing Node');
			}

			if (!isIdentifier(node.argument)) {
				panic('[driver::populateNode] Argument can only be identifier');
				return E.left('Unsupported Node');
			}

			const _n = n as Node;
			_n.label = node.argument.name + node.operator;
			_n.file = node.attributes.enclosingFile ?? '';
			_n.start = { row: node.loc.start.line, column: node.loc.start.column };
			_n.end = { row: node.loc.end.line, column: node.loc.end.column };
			_n.range = { start: node.range[0], end: node.range[1] };
			return E.right(_n);
		}

		return E.left('Unknown vertex: ' + JSON.stringify(v.type));
	}
}
