
const fs = require('fs.promisify'),
	path = require('path'),
	Project = require('./project.js'),
	Util = require('./util.js'),
	promise = require('promise.util'),
	os = require('os'),
	key = require('unique.util');

class Bootstrap extends require('events') {

	constructor(config) {
		super();
		this.config = {
			npm: 'http://192.168.99.101:4873/',
			tmp: path.join(os.tmpdir(), 'tmplocalnpm'),
			version: 'd54g',
			nobuild: true,
			cache: true,
			...config
		};
		this.util = new Util(this.config);
		this._project = {};
		this._watcher = {};
	}

	wait(k) {
		return new Promise((resolve) => {
			let cd = (version) => {
				resolve(version);
				this.removeListener(k, cd);
			};
			console.log('hook on', k);
			this.on(k, cd);
		});
	}

	run(src) {
		return this.util.scan(src, 2).then((res) => {
			if (this.config.filter) {
				res = res.filter((a) => {
					let m = a.match(this.config.filter);
					return this.config.negative ? !m : m;
				});
			}

			return promise.each(res, (project) => {
				return this.util.package(project).then((pack) => {
					return fs.access(path.join(project, 'package.backup.json')).then(() => {
						return fs.readFile(path.join(project, 'package.backup.json')).then((r) => {
							return fs.writeFile(path.join(project, 'package.json'), r);
						});
					}).catch(() => {
						return fs.readFile(path.join(project, 'package.json')).then((r) => {
							return fs.writeFile(path.join(project, 'package.backup.json'), r);
						});
					}).then(() => {
						pack.name = pack.name || key.short();
						this._project[pack.name] = pack;
						this._watcher[pack.name] = new Project(this, pack, project);
						this._watcher[pack.name].name = pack.name;
					});
				}).catch(() => {});
			}, 5).then(() => {
				console.log('project keys', Object.keys(this._watcher));
				return promise.each(Object.keys(this._watcher), (project) => {
					return this._watcher[project].run();
				}, 1).then(() => {
					console.log('all done');
				});
			});
		});
	}

}

module.exports = Bootstrap;
