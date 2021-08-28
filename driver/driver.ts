import { buildCallGraph, CallGraphData } from '@lib-callgraph/callGraph';
import { Graph } from '@lib-callgraph/graph';
import { Vertex, isCalleeVertex, isFunctionVertex, isNativeVertex, prettyPrintVertex } from '@lib-callgraph/vertex';
import { astFromFiles } from '@lib-frontend/ast';
import { enclosingFunctionName, functionName } from '@lib-frontend/astUtils';
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
				result.push(Driver.buildBinding(call, fn, annotation));
			});
			return { result, edges: callGraph.edges };
		}

		const res = flow(E.map(addBindings), E.map(buildCallGraph), E.map(collectEdges), E.chain(Driver.writeJSON))(ast);

		if (E.isRight(res)) {
			return res.right;
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
					edges.iter((from, to) => {
						console.log(prettyPrintVertex(from) + ' -> ' + prettyPrintVertex(to));
					});
				}
				return result;
			},
			(e) => e
		);
	}

	private static buildBinding(u: Vertex, v: Vertex, relation = 'UnknownRelation'): RecursivePartial<Edge> {
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

		Driver.populateNode(edge.source, u);
		Driver.populateNode(edge.target, v);
		return edge;
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

		return E.left('Unknown vertex: ' + JSON.stringify(v));
	}
}
