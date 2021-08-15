module.exports = {
	presets: ['@babel/preset-typescript', '@babel/preset-env'],
	plugins: [
		[
			'babel-plugin-root-import',
			{
				rootPathPrefix: '@',
			},
		],
	],
};
