# Packaging

## Production Build

### Javascript Bundles

Javascript bundles are generated using babel and [babel-preset-typescript](https://babeljs.io/docs/en/babel-preset-typescript) plugin. It is compatible with most pre-es6 environments. Please raise an [issue](https://github.com/ticklepoke/say-js/issues/new) if you find that the bundle does not work in your environment, stating the environment.

As babel is not able to preserve the directory structure of the source code, each directory is transpiled individually using [gulp-babel](https://github.com/babel/gulp-babel).

### Declaration Files

Declaration files are also generated for use in typescript development environments. For convenience, they are generated using [gulp-typescript](https://github.com/ivogabe/gulp-typescript). Declaration files are placed in the same folders that their corresponding Javascript files are located.

## Releases

Releases follow the [semantic versioning](https://semver.org/) format.

### Initial Release (v0)

Initial releases are manually published using `yarn publish`. Only the dist folder is published.

### Stable Release (v1)

Stable releases onwards will use [semantic release](https://github.com/semantic-release/semantic-release) for tagging, publishing and changelog generation.

Changelogs will be generated based on commit messages. In order to keep commits machine readable, [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) is adopted.
