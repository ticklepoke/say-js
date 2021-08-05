import path from 'path';
import Driver from './driver/driver';
import { astFromFiles } from './lib-frontend/ast';

// const ast = astFromFiles([path.resolve('./examples/classFunction.js')]);

//prettyPrint(ast);

Driver.setFiles(['blah.js']);
