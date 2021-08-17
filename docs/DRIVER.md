# Driver

The driver is reponsible for driving the entire callgraph generation process. It exposes 3 main methods:

- `Driver.setFiles(files: string[])`: Set files or directories to be read.
- `Driver.setOutputJson(fileName: string)`: Set the output file name (json) to be written to.
- `Driver.build()`: Generates the callgraph and returns the graph.

## Usage

The driver can be used in 2 different ways:

- As a CLI tool in `driver/cli.ts`. It can be used as an executable with yarn or npm: `yarn sayjs ...` or as a script in `package.json`.

- As a programming interface by importing and interacting with the driver class directly:

```ts
import Driver from '@ticklepoke/sayjs'

sayjs.setFiles(['file.js', 'directory/']);
const edges = sayjs.build();
```
