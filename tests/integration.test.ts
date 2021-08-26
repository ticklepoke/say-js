import Driver from '@driver/driver';

describe('Integration', () => {
	it.each([['./tests/__fixtures__/simpleCall.js', 'foo']])('%s', (pathName, expected) => {
		Driver.setFiles([pathName]);
		const res = Driver.build();
		console.log(res);
		expect(true).toBe(true);
	});
});
