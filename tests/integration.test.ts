import Driver from '@driver/driver';
import { prettyPrint } from '@utils/console';
import path from 'path';

describe('Integration', () => {
	it.each([
		[
			['./tests/__fixtures__/simpleCall.js'],
			[
				{
					source: {
						file: path.resolve(__dirname, '../../tests/__fixtures__/simpleCall.js'),
						label: 'global',
					},
					target: {
						file: path.resolve(__dirname, '../../tests/__fixtures__/simpleCall.js'),
						label: 'bar',
					},
					relation: 'FunctionCall',
				},
				{
					source: {
						file: path.resolve(__dirname, '../../tests/__fixtures__/simpleCall.js'),
						label: 'a',
					},
					target: {
						file: path.resolve(__dirname, '../../tests/__fixtures__/simpleCall.js'),
						label: 'a = ...',
					},
					relation: 'VariableUsage',
				},
			],
		],
		//[
		//['./tests/__fixtures__/simpleImport.js', './tests/__fixtures__/simpleCall.js'],
		//[
		//{
		//source: {
		//file: path.resolve(__dirname, '../../tests/__fixtures__/simpleCall.js'),
		//label: 'global',
		//},
		//target: {
		//file: path.resolve(__dirname, '../../tests/__fixtures__/simpleCall.js'),
		//label: 'bar',
		//},
		//relation: 'FunctionCall',
		//},
		//{
		//source: {
		//file: path.resolve(__dirname, '../../tests/__fixtures__/simpleImport.js'),
		//label: 'global',
		//},
		//target: {
		//file: path.resolve(__dirname, '../../tests/__fixtures__/simpleCall.js'),
		//label: 'bar',
		//},
		//relation: 'FunctionCall',
		//},
		//{
		//source: {
		//file: path.resolve(__dirname, '../../tests/__fixtures__/simpleCall.js'),
		//label: 'a',
		//},
		//target: {
		//file: path.resolve(__dirname, '../../tests/__fixtures__/simpleCall.js'),
		//label: 'a = ...',
		//},
		//relation: 'VariableUsage',
		//},
		//],
		//],
	])('%s', (pathName, expected) => {
		Driver.setFiles(pathName);
		const res = Driver.build();

		//console.log(res);
		const expectation = expected.map((e) => ({
			source: expect.objectContaining(e.source),
			target: expect.objectContaining(e.target),
			relation: e.relation,
		}));
		prettyPrint(res);
		//expect(res).toEqual(expectation);
	});
});
