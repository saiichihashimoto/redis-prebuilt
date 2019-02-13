#!/usr/bin/env node
import runCommand from './run-command';

runCommand('redis-cli', process.argv.slice(2))
	.catch((err) => {
		console.error(err); // eslint-disable-line no-console

		process.exit(1);
	});
