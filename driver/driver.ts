import { buildCallGraph, CallGraphData } from '@lib-calllgraph/callGraph';
import { Vertex, isCalleeVertex, isFunctionVertex, isNativeVertex } from '@lib-calllgraph/vertex';
import { astFromFiles } from '@lib-frontend/ast';
import { enclosingFunctionName, functionName } from '@lib-frontend/astUtils';
import { addBindings } from '@lib-frontend/bindings';
import { collectFiles } from '@utils/files';
import { panic } from '@utils/macros';
import { TSFixMe } from '@utils/types';
import * as E from 'fp-ts/lib/Either';
import { flow } from 'fp-ts/lib/function';
import fs from 'fs';
import path from 'path';

/**
 * For internal use, not to be confused with nodes in a graph
 */
type Node = {
	label: TSFixMe;
	file: TSFixMe;
	start: {
		row: TSFixMe;
		column: TSFixMe;
	};
	end: {
		row: TSFixMe;
		column: TSFixMe;
	};
	range: { start: TSFixMe; end: TSFixMe };
};

type Edge = {
	source: Node;
	target: Node;
};

export default class Driver {
	private static files: string[] = [];

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

	public static build(): void {
		const ast = astFromFiles(Driver.files);

		flow(
			E.map(addBindings),
			E.map(buildCallGraph),
			E.map(collectEdges),
			E.map(Driver.writeJSON('outputFile.json'))
		)(ast);

		function collectEdges(callGraph: CallGraphData) {
			const result: Edge[] = [];
			callGraph.edges.iter((call, fn) => {
				result.push(Driver.buildBinding(call, fn));
			});
			return result;
		}
	}

	private static writeJSON(filename: string) {
		return (result: Edge[]) =>
			E.tryCatch(
				() => fs.writeFileSync(filename, JSON.stringify(result, null, 2)),
				(e) => e
			);
	}

	private static buildBinding(u: Vertex, v: Vertex): Edge {
		const edge: Edge = {
			source: {
				label: null,
				file: null,
				start: { row: null, column: null },
				end: { row: null, column: null },
				range: { start: null, end: null },
			},
			target: {
				label: null,
				file: null,
				start: { row: null, column: null },
				end: { row: null, column: null },
				range: { start: null, end: null },
			},
		};

		Driver.populateNode(edge.source, u);
		Driver.populateNode(edge.target, v);
		return edge;
	}

	private static populateNode(n: Node, v: Vertex): E.Either<string, Node> {
		if (isCalleeVertex(v)) {
			const node = v.call;
			n.label = enclosingFunctionName(node.attributes.enclosingFunction);
			n.file = node.attributes.enclosingFile;
			n.start = { row: node.loc?.start.line, column: node.loc?.start.column };
			n.end = { row: node.loc?.end.line, column: node.loc?.end.column };
			n.range = { start: node.range?.[0], end: node.range?.[1] };
			return E.right(n);
		}

		if (isFunctionVertex(v)) {
			const { function: fn } = v;
			n.label = functionName(fn);
			n.file = fn.attributes.enclosingFile;
			n.start = { row: fn.loc?.start.line, column: fn.loc?.start.column };
			n.end = { row: fn.loc?.end.line, column: fn.loc?.end.column };
			n.range = { start: fn.range?.[0], end: fn.range?.[1] };
			return E.right(n);
		}

		if (isNativeVertex(v)) {
			n.label = v.name;
			n.file = 'Native';
			n.start.row = null;
			n.end.row = null;
			n.start.column = null;
			n.end.column = null;
			n.range = { start: null, end: null };
			return E.right(n);
		}

		return E.left('Unknown vertex: ' + JSON.stringify(v));
	}
}
