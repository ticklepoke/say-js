import path from 'path';
import { astFromFiles } from './astUtils';

const ast = astFromFiles([path.resolve('./examples/classFunction.js')]);

//prettyPrint(ast);
