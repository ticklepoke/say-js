import Driver from '@driver/driver';
import path from 'path';

describe('Integration', () => {
	it.each([
		[
			['./tests/__fixtures__/simpleCall.js'],
			[
				{
					source: {
						file: path.resolve(__dirname, '../../tests/__fixtures__/simpleCall.js'),
						label: 'a',
					},
					target: {
						file: path.resolve(__dirname, '../../tests/__fixtures__/simpleCall.js'),
						label: 'a = ...',
					},
					relation: 'VariableReference',
				},
				{
					source: {
						file: path.resolve(__dirname, '../../tests/__fixtures__/simpleCall.js'),
						label: 'a++',
					},
					target: {
						file: path.resolve(__dirname, '../../tests/__fixtures__/simpleCall.js'),
						label: 'a = ...',
					},
					relation: 'VariableReference',
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
					relation: 'VariableReference',
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
					relation: 'VariableReference',
				},
			],
		],
	])('%s', (pathName, expected) => {
		Driver.setFiles(pathName);
		const res = Driver.build();

		const expectation = expected.map((e) => ({
			source: expect.objectContaining(e.source),
			target: expect.objectContaining(e.target),
			relation: e.relation,
		}));
		expect(res).toEqual(expectation);
	});
});
