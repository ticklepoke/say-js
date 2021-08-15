/* eslint-disable @typescript-eslint/no-var-requires */
const gulp = require('gulp');
const babel = require('gulp-babel');

const { parallel } = gulp;

const copyPackageJson = () => gulp.src('package.json').pipe(gulp.dest('dist'));

const buildDriver = () =>
	gulp
		.src('driver/**')
		.pipe(
			babel({
				presets: ['@babel/preset-typescript', '@babel/preset-env'],
			})
		)
		.pipe(gulp.dest('dist/driver'));

const buildFrontend = () =>
	gulp
		.src('lib-frontend/**')
		.pipe(
			babel({
				presets: ['@babel/preset-typescript', '@babel/preset-env'],
				plugins: [
					[
						'babel-plugin-root-import',
						{
							rootPathPrefix: '@',
						},
					],
				],
			})
		)
		.pipe(gulp.dest('dist/lib-frontend'));

const buildIr = () =>
	gulp
		.src('lib-ir/**')
		.pipe(
			babel({
				presets: ['@babel/preset-typescript', '@babel/preset-env'],
				plugins: [
					[
						'babel-plugin-root-import',
						{
							rootPathPrefix: '@',
						},
					],
				],
			})
		)
		.pipe(gulp.dest('dist/lib-ir'));

const buildCallgraph = () =>
	gulp
		.src('lib-callgraph/**')
		.pipe(
			babel({
				presets: ['@babel/preset-typescript', '@babel/preset-env'],
				plugins: [
					[
						'babel-plugin-root-import',
						{
							rootPathPrefix: '@',
						},
					],
				],
			})
		)
		.pipe(gulp.dest('dist/lib-callgraph'));

const buildUtils = () =>
	gulp
		.src('utils/**')
		.pipe(
			babel({
				presets: ['@babel/preset-typescript', '@babel/preset-env'],
				plugins: [
					[
						'babel-plugin-root-import',
						{
							rootPathPrefix: '@',
						},
					],
				],
			})
		)
		.pipe(gulp.dest('dist/utils'));

gulp.task('default', parallel(copyPackageJson, buildDriver, buildFrontend, buildIr, buildCallgraph, buildUtils));
