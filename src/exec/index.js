
const Util = require('../bootstrap/util.js'),
	color = require('console.color'),
	promise = require('promise.util');

class Exec {

	constructor(config) {
		this.config = config;
		this.util = new Util({});
	}

	run(src, cmd) {
		return this.util.scan(src, 2).then((res) => {
			if (this.config.filter) {
				res = res.filter((a) => {
					let m = a.match(this.config.filter);
					return this.config.negative ? !m : m;
				});
			}
			console.log('run on', res, cmd);
			return promise.each(res, (project) => {
				return this.util.package(project).then(() => {
					return this.util.exec(cmd, {cwd: project}).catch((err) => console.log(color.red(err)));
				}).catch(() => {});
			}, this.config.count || 5);
		});
	}

}

module.exports = Exec;

