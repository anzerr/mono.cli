
const fs = require('fs.promisify'),
	remove = require('fs.remove'),
	promise = require('promise.util'),
	mkdir = require('fs.mkdirp'),
	path = require('path');

class Git {

	constructor(core) {
		this._done = {};
		this.config = core.config;
		this.util = core.util;
	}

	clone(pack) {
		console.log('start', pack[0]);
		const repo = path.join(this.config.tmp, pack[0]);
		return this.util.clone(pack).then(() => {
			console.log('cloned');
			return this.publish(`${this.config.tmp}/${pack[0]}`);
		}).then(() => {
			return this.getPackage(repo);
		}).then((res) => {
			let version = `${res.version}-${this.config.version}`;
			return this.latest(pack[0]).then((v) => {
				if (v === version) {
					throw new Error('skip');
				}
				return {ver: version, res: res};
			});
		});
	}

	install(pack) {
		if (this._done[pack[0]]) {
			return;
		}
		let version = null;
		const repo = path.join(this.config.tmp, pack[0]);
		return this.clone(pack).then(({ver, res}) => {
			console.log(res);
			version = ver;
			let changes = 0;
			for (let i in res.dependencies) {
				console.log(i, res.dependencies[i]);
				if (res.dependencies[i].match(/\.git/)) {
					res.dependencies[i] = this._done[i];
					changes++;
				}
			}
			for (let i in res.devDependencies) {
				if (res.devDependencies[i].match(/\.git/)) {
					res.devDependencies[i] = this._done[i];
					changes++;
				}
			}
			res.version = version;
			if (this.config.nobuild) {
				return fs.writeFile(path.join(repo, 'package.json'), JSON.stringify(res, null, '\t'));
			}
			return Promise.all([
				fs.writeFile(path.join(repo, 'package.json'), JSON.stringify(res, null, '\t')),
				remove(path.join(repo, 'package-lock.json')),
				remove(path.join(repo, 'node_modules'))
			]).then(() => {
				if (changes) {
					return this.util.exec(`npm i --only=prod --registry ${this.config.npm}`, {cwd: repo});
				}
			});
		}).then(() => {
			return this.util.exec(`npm publish --registry ${this.config.npm}`, {cwd: repo});
		}).catch((err) => {
			if (err.toString() !== 'Error: skip') {
				console.log(err);
				throw err;
			}
		}).then(() => {
			this._done[pack[0]] = version;
			this.util.version[pack[0]] = version;
			console.log('done', pack[0], version);
		});
	}

	publish(dir) {
		return this.util.package(dir).then((res) => {
			let install = [];
			for (let i in res.dependencies) {
				if (res.dependencies[i].match(/\.git/)) {
					// install.push([i, res.dependencies[i].replace(reg, 'https://github.com')]);
					install.push([i, res.dependencies[i]
						.replace('git+', '')
						.replace(/ssh\:\/\/git@github.com(\/|:)/, 'git@github.com:')
					]);
				}
			}
			for (let i in res.devDependencies) {
				if (res.devDependencies[i].match(/\.git/)) {
					// install.push([i, res.devDependencies[i].replace(reg, 'https://github.com')]);
					install.push([i, res.devDependencies[i]
						.replace('git+', '')
						.replace(/ssh\:\/\/git@github.com(\/|:)/, 'git@github.com:')
					]);
				}
			}
			if (this.config.filter) {
				install = install.filter(this.config.filter);
			}
			console.log('filtered', install);
			return promise.each(install, (r) => this.install(r), 1);
		});
	}

	run(cwd) {
		return mkdir(this.config.tmp).then(() => this.publish(cwd));
	}

}

module.exports = Git;
