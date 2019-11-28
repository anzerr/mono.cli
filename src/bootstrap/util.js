
const fs = require('fs.promisify'),
	Request = require('request.libary'),
	{spawn} = require('child_process'),
	color = require('console.color'),
	remove = require('fs.remove'),
	promise = require('promise.util'),
	path = require('path'),
	key = require('unique.util');

const alpha = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

class Util {

	constructor(config) {
		this.config = config;
		this.version = {};
	}

	key(n = 8) {
		return key.random({length: n, char: alpha});
	}

	latest(name) {
		return new Request(this.config.npm).get(name).then((res) => {
			if (res.isOkay()) {
				let data = res.parse();
				if (typeof data === 'object' && !Buffer.isBuffer(data)) {
					let version = Object.keys(data.versions);
					return version[version.length - 1];
				}
			}
			return null;
		});
	}

	clone(r) {
		const repo = path.join(this.config.tmp, r[0]);
		if (this.config.cache) {
			return fs.access(repo).then(() => {
				return this.exec('git fetch --all && git pull origin master && git reset --hard HEAD', {cwd: repo});
			}).catch(() => {
				return this.exec(`git clone ${r[1]} ${r[0]}`, {cwd: this.config.tmp});
			});
		}
		return remove(repo).then(() => {
			return this.exec(`git clone ${r[1]} ${r[0]}`, {cwd: this.config.tmp});
		});
	}

	package(p) {
		return fs.readFile(path.join(p, 'package.json')).then((res) => {
			return JSON.parse(res.toString());
		});
	}

	scan(s, dep = 1) {
		const out = [], sub = (src, max) => {
			if (max < 1) {
				return;
			}
			return fs.readdir(src).then((res) => {
				return promise.each(res, (file) => {
					let location = path.join(src, file);
					return fs.stat(location).then((r) => {
						if (r.isDirectory()) {
							return this.package(location).then(() => {
								out.push(location);
							}).catch(() => {
								return sub(location, max - 1);
							});
						}
					}).catch(() => {});
				});
			});
		};
		return sub(s, dep).then(() => out);
	}

	exec(c, o) {
		console.log(color.yellow(c));
		return new Promise((resolve) => {
			const cmd = spawn('sh', ['-c', c], o);
			let data = [];
			cmd.stdout.on('data', (d) => {
				process.stdout.write(color.white(d.toString()));
				data.push(d);
			});
			cmd.stderr.on('data', (d) => {
				process.stderr.write(color.red(d.toString()));
			});
			cmd.on('error', (e) => {
				throw e;
			});
			cmd.on('close', () => {
				resolve(Buffer.concat(data));
			});
		});
	}

}

module.exports = Util;
