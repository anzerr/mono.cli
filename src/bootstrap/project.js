
const fs = require('fs.promisify'),
	path = require('path'),
	remove = require('fs.remove'),
	Git = require('./git.js'),
	promise = require('promise.util'),
	key = require('unique.util');

class Project {

	constructor(core, pack, cwd) {
		this.core = core;
		this.config = core.config;
		this.util = core.util;
		this.pack = pack;
		this.cwd = cwd;
		this.done = false;
		this.key = key.random({length: 8, char: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'});
	}

	publish() {
		if (this.done) {
			console.log(`skiped "${this.name}" done at "${this.util.version[this.name]}"`);
			this.core.emit(this.name, this.util.version[this.name]);
			return Promise.resolve(this.util.version[this.name]);
		}
		let version = null;
		return fs.readFile(path.join(this.cwd, 'package.backup.json')).then((res) => {
			return JSON.parse(res.toString());
		}).then((res) => {
			res.version = `${res.version}-${this.key}`;
			version = res.version;
			return this.util.latest(res.name).then((v) => {
				console.log(v, res.version);
				if (v === res.version) {
					throw new Error('skip');
				}
				return res;
			});
		}).then((res) => {
			let git = new Git({
				config: {
					...this.core.config,
					filter: null
				},
				util: this.core.util
			});
			return git.run(this.cwd).then(() => res);
		}).then((res) => {
			const wait = [], values = ['dependencies', 'devDependencies'], change = {};
			for (let v in values) {
				const k = values[v];
				for (let i in res[k]) {
					if (this.core._watcher[i]) {
						console.log(i, 'found _watcher');
					}
					let a = this.util.version[i];
					if (a) {
						console.log('got version', i, a);
						res[k][i] = (change[i] = a);
					} else {
						if (this.core._watcher[i]) {
							wait.push({i: i, k: k});
						}
					}
				}
			}
			return promise.each(wait, ({k, i}) => {
				if (this.util.version[i]) {
					res[k][i] = (change[i] = this.util.version[i]);
					return;
				}
				console.log(`waiting on sub "${i} for "${this.name}"`, res[k][i]);
				return Promise.all([
					this.core._watcher[i].run(),
					this.core.wait(i)
				]).then((r) => {
					res[k][i] = (change[i] = r[1]);
					console.log('waiting done', i, res[k][i], r);
				});
			}, 1).then(() => {
				console.log('updating package', res.name, change);
				return Promise.all([
					fs.writeFile(path.join(this.cwd, 'package.json'), JSON.stringify(res, null, '\t')),
					remove(path.join(this.cwd, 'package-lock.json')),
					remove(path.join(this.cwd, 'node_modules'))
				]);
			}).then(() => {
				return this.util.exec(`npm i ${(this.config.prod) ? '--only=prod ' : ''}--registry ${this.config.npm}`, {cwd: this.cwd});
			}).then(() => {
				return this.util.exec('npm run clean --if-present && npm run build --if-present', {cwd: this.cwd});
			}).then(() => {
				return this.util.exec(`npm publish --registry ${this.config.npm}`, {cwd: this.cwd});
			}).then(() => {
				this.util.version[this.name] = res.version;
			});
		}).catch((err) => console.log('fixed', err)).then(() => {
			console.log(this.cwd, this.name, 'versions done', version, this.util.version);
			this.done = true;
			this.core.emit(this.name, version);
			return version;
		});
	}

	run() {
		console.log('project.run', this.cwd);
		return this.publish();
	}

}

module.exports = Project;
