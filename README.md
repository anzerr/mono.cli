
### `Intro`
![GitHub Actions status | publish](https://github.com/anzerr/mono.cli/workflows/publish/badge.svg)

Cli to help working on a monorepo using a local npm registry like [verdaccio](https://github.com/verdaccio)

#### `Install`
``` bash
git clone git+https://github.com/anzerr/mono.cli.git &&
cd mono.cli &&
npm link

npm install -g @anzerr/mono.cli
```

### `Example`
``` bash
mono bootstrap --registry http://192.168.99.101:4873 --filter "^.*$"
mono restore
mono exec --count 1 "pwd"
mono exec --filter "project-" --count 1 "rm -Rf node_modules/ package-lock.json && npm i --verbose"
```