import path from 'path';
import { astFromFiles } from './lib-frontend/ast';

const ast = astFromFiles([path.resolve('./examples/classFunction.js')]);

//prettyPrint(ast);
