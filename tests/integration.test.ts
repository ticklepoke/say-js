import Driver from '@driver/driver';
import path from 'path';

describe('Integration', () => {
	it.each([
		[
			'./tests/__fixtures__/simpleCall.js',
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
				},
			],
		],
	])('%s', (pathName, expected) => {
		Driver.setFiles([pathName]);
		const res = Driver.build();

		const expectation = expected.map((e) => ({
			source: expect.objectContaining(e.source),
			target: expect.objectContaining(e.target),
		}));
		expect(res).toEqual(expect.arrayContaining(expectation));
	});
});
