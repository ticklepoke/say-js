# SAY.JS - A Static Analyser for Javascript

![npm](https://img.shields.io/npm/v/@ticklepoke/sayjs)

This project provides static analysis tools for Javascript source code. It generates function - callee and variable - reference graphs. It builds upon the call-graph construction algorithm described in:

> A. Feldthaus, M. Schäfer, M. Sridharan, J. Dolby, F. Tip. Efficient Construction of Approximate Call Graphs for JavaScript IDE Services. In ICSE, 2013.

## Usage

### Installation

```sh
yarn add @ticklepoke/sayjs
```

```sh
npm install @ticklepoke/sayjs
```

### CLI Usage

- Generate a graph for a single file:

```sh
sayjs foo/bar.js
```

- Generate a graph for an entire directory:

```sh
sayjs foo/
```

- Save results to JSON file:

```sh
sayjs -o graph.json foo/bar.js

sayjs --output-file graph.json foo/bar.js
```

### Programming Interface

```js
import sayjs from '@ticklepoke/sayjs';
// or
const sayjs = require('@ticklepoke/sayjs');

sayjs.setFiles(['file.js', 'directory/']);
const edges = sayjs.build();
```

## Output JSON

```json
{
    "foo": "bar"
}
```

## Supported Modern Javascript Features

- Modules
  - ES modules
  - CommonJS

## Contributing

Refer to [CONTRIBUTING.md](./CONTRIBUTING.md) for developer documentation.
