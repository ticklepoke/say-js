import path from 'path';
import fs from 'fs';
import { panic } from '../utils/macros';
import { collectFiles } from '../utils/files';
import { astFromFiles } from '../lib-frontend/ast';
import * as E from 'fp-ts/lib/Either';
import { addBindings } from '../lib-frontend/bindings';

export default class Driver {
	static files: string[] = [];

	static setFiles(fileList: string[]): void {
		Driver.files = [];
		for (const filePath of fileList) {
			const file = path.resolve(filePath);
			if (!fs.existsSync(file)) {
				panic(`File ${file} does not exist`);
			} else if (fs.statSync(file).isDirectory()) {
				const fileList = collectFiles(file, []);
				Driver.files.push(...fileList);
			} else if (file.endsWith('.js')) {
				Driver.files.push(file);
			}
		}
	}

	// TODO: return type
	static build(): unknown[] {
		const ast = astFromFiles(Driver.files);

		if (E.isLeft(ast)) {
			panic('Unable to build AST');
		}

		E.map(addBindings)(ast);

		// TODO: build call graph

		// TODO: create bindings for edges?

		// TODO: output call graph to json
		return [];
	}
}
