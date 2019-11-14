
const fs = require('fs.promisify'),
	path = require('path'),
	remove = require('fs.remove'),
	Util = require('../bootstrap/util.js'),
	promise = require('promise.util');

class Restore {

	constructor() {
		this.util = new Util({});
	}

	run(src) {
		return this.util.scan(src, 2).then((res) => {
			return promise.each(res, (project) => {
				return this.util.package(project).then(() => {
					const backup = path.join(project, 'package.backup.json');
					return fs.access(backup).then(() => {
						return fs.readFile(backup).then((r) => {
							return fs.writeFile(path.join(project, 'package.json'), r);
						}).then(() => {
							return remove(backup);
						});
					});
				}).catch(() => {});
			}, 5);
		});
	}

}

module.exports = Restore;
