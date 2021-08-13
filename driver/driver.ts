import { buildCallGraph, CallGraphData } from '@lib-calllgraph/callGraph';
import { astFromFiles } from '@lib-frontend/ast';
import { addBindings } from '@lib-frontend/bindings';
import { collectFiles } from '@utils/files';
import { panic } from '@utils/macros';
import { TSFixMe } from '@utils/types';
import * as E from 'fp-ts/lib/Either';
import { flow } from 'fp-ts/lib/function';
import fs from 'fs';
import path from 'path';

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

		if (E.isLeft(ast)) {
			panic('[Driver::build] Unable to build AST');
		}

		E.map(addBindings)(ast);

		const callGraph = E.map(buildCallGraph)(ast);

		if (E.isRight(callGraph)) {
			const result: Edge[] = [];
			callGraph.right.edges.iter((call, fn) => {
				//result.push(Driver.buildBinding(call, fn));
			});
			// TODO: set output file in class
			// const outputFile = '';
			// Driver.writeJSON(outputFile ?? 'outputfile.json', result);
		}

		// FP Version
		flow(
			E.map(addBindings),
			E.map(buildCallGraph),
			E.map(collectEdges),
			E.map(Driver.writeJSON('outputFile.json'))
		)(ast);

		function collectEdges(callGraph: CallGraphData) {
			const result: Edge[] = [];
			callGraph.edges.iter((call, fn) => {
				//result.push(Driver.buildBinding(call, fn));
			});
			return result;
		}
	}

	private static writeJSON(filename: string) {
		return function (result: Edge[]) {
			return E.tryCatch(
				() => fs.writeFileSync(filename, JSON.stringify(result, null, 2)),
				(e) => e
			);
		};
	}

	// TODO: build binding
	//private static buildBinding(u: Vertex, v: Vertex): Edge {}
}
