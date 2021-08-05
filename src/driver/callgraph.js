#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { ArgumentParser } = require('argparse');
const { version } = require('../../package.json');

const usage = './callgraph.js [options] inputFile [, inputFiles]';

const parser = new ArgumentParser({
	description: `Call-graph generator v${version}`,
	usage,
	add_help: true,
});

parser.add_argument('-o', '--output', { nargs: 1, help: 'Output filname: output.json' });

const args = parser.parse_known_args();
const outputFileName = args[0].output;
const inputFiles = args[1];

if (inputFiles.length === 0) {
	console.warn(`Usage: ${usage}`);
}
