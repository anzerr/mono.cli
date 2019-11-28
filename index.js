#!/usr/bin/env node

const {Cli, Map} = require('cli.util'),
	Bootstrap = require('./src/bootstrap'),
	Restore = require('./src/restore'),
	Exec = require('./src/exec');

let cli = new Cli(process.argv, [
		new Map('filter').alias(['f', 'F']).arg(),
		new Map('count').alias(['c', 'C']).arg(),
		new Map('negative').alias(['n', 'N']).arg()
	]), arg = cli.argument();

if (arg.is('bootstrap')) {
	const config = {};
	if (cli.has('registry')) {
		config.npm = cli.get('registry');
	}
	if (cli.has('skip')) {
		config.skip = cli.get('skip');
	}
	const s = new Bootstrap({
		filter: cli.get('filter'),
		negative: cli.get('negative'),
		...config
	});
	return s.run(process.cwd());
}

if (arg.is('restore')) {
	const s = new Restore();
	return s.run(process.cwd());
}

if (arg.is('exec')) {
	const s = new Exec({
		filter: cli.get('filter'),
		count: cli.get('count'),
		negative: cli.get('negative')
	});
	return s.run(process.cwd(), arg.get());
}
