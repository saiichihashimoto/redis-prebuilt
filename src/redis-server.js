#!/usr/bin/env node
import updateNotifier from 'update-notifier';

import pkg from '../package';

import runCommand from './run-command';

updateNotifier({ pkg }).notify();

runCommand('redis-server', process.argv.slice(2))
	.catch((err) => { // eslint-disable-line promise/prefer-await-to-callbacks
		console.error(err); // eslint-disable-line no-console

		process.exit(1);
	});
