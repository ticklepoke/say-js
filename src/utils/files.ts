import fs from 'fs';
import path from 'path';

// Recursively checks for nested js files
export function collectFiles(dir: string, fileList: string[]): string[] {
	const files = fs.readdirSync(dir);
	for (const file of files) {
		if (fs.statSync(path.join(dir, file)).isDirectory()) {
			fileList = collectFiles(path.join(dir, file), fileList);
		} else if (file.endsWith('.js')) {
			fileList.push(path.join(dir, file));
		}
	}

	return fileList;
}
