#!/usr/bin/env node
import execa from 'execa';
import path from 'path';
import program from 'commander';
import request from 'request';
import requestAsync from 'request-promise-native';
import { createHash } from 'crypto';
import { createWriteStream, ensureDir, exists, readdir, rename } from 'fs-extra';
import { extract } from 'tar';
import { tmpdir } from 'os';

/*
 * FIXME SHOULD BE REPLACED BY redis-download
 *
 * https://github.com/saiichihashimoto/redis-download
 */

const redisHashesUrl = 'https://raw.githubusercontent.com/antirez/redis-hashes/master/README';
const crReturn = (process.platform === 'win32') ? '\x1b[0G' : '\r';
const binaryNames = [
	'redis-benchmark',
	'redis-check-aof',
	'redis-check-rdb',
	'redis-cli',
	'redis-sentinel',
	'redis-server',
];

async function getRedisHashes() {
	return (await requestAsync(redisHashesUrl))
		.split('\n')
		.filter((line) => line && line.charAt(0) !== '#')
		.map((line) => line.split(/\s+/));
}

async function downloadTar({ root, filename, algo, digest, url, stdio: [, stdout] }) {
	const tar = `${root}/${filename}`;
	const temp = `${tar}.downloading`;

	await new Promise((resolve, reject) => {
		const fileStream = createWriteStream(temp);
		const hash = createHash(algo);

		request(url)
			.on('response', (response) => {
				const total = parseInt(response.headers['content-length'], 10);
				const totalMB = Math.round(total / 1048576 * 10) / 10;
				let completed = 0;
				let lastStdout = `Completed: 0 % (0mb / ${totalMB}mb)${crReturn}`;
				stdout.write(lastStdout);

				response.on('data', (chunk) => {
					hash.update(chunk);
					completed += chunk.length;
					const completedPercentage = Math.round(100.0 * completed / total * 10) / 10;
					const completedMB = Math.round(completed / 1048576 * 10) / 10;
					const text = `Completed: ${completedPercentage} % (${completedMB}mb / ${totalMB}mb)${crReturn}`;
					if (lastStdout !== text) {
						lastStdout = text;
						stdout.write(text);
					}
				});
			})
			.on('error', reject)
			.pipe(fileStream);

		fileStream.on('finish', () => {
			fileStream.close(() => {
				if (hash.digest('hex') === digest) {
					resolve(temp);
				} else {
					reject(new Error('The hashes don\'t match!'));
				}
			});
		});
	});

	await rename(temp, tar);

	return tar;
}

async function redisDownload({
	version: specifiedVersion,
	downloadDir = tmpdir(),
	stdio = [process.stdin, process.stdout, process.stderr],
} = {}) {
	const root = path.resolve(downloadDir, 'redis-download');

	await ensureDir(root);

	let redisHashes;
	let version = specifiedVersion;

	if (!version || version === 'latest') {
		redisHashes = await getRedisHashes();
		const [, filename] = redisHashes[redisHashes.length - 1];
		[,, version] = filename.match(/^(redis-)?(.*?)(.tar.gz)?$/);
	}

	const files = (await readdir(root))
		.sort()
		.filter((filename) => filename.match(new RegExp(`^(redis-)?${version}(.tar.gz)?$`, 'g')))
		.map((filename) => path.resolve(root, filename));

	const directories = files
		.filter((file) => !file.match(/\.tar\.gz$/));

	const builds = (await Promise.all(directories.map(
		(directory) => Promise.all(binaryNames.map(
			(binaryName) => exists(path.resolve(directory, 'src', binaryName))
				.then((binaryExists) => {
					if (!binaryExists) {
						throw new Error('doesn\'t exist');
					}
					return true;
				}),
		))
			.then(() => directory, () => null),
	)))
		.filter(Boolean);

	let builtRedisDirectory = builds[0];

	if (!builtRedisDirectory) {
		let redisDirectory = directories[0];

		if (!redisDirectory) {
			let tar = files
				.filter((folderName) => folderName.match(/\.tar\.gz$/))[0];

			if (!tar) {
				redisHashes = redisHashes || await getRedisHashes();
				const redisHash = redisHashes
					.filter(([, filename]) => filename.match(new RegExp(`^(redis-)?${version}.tar.gz$`, 'g')))[0];

				const [, filename, algo, digest, url] = redisHash;
				tar = await downloadTar({ root, filename, algo, digest, url, stdio });
			}

			await extract({ file: tar, cwd: root });
			redisDirectory = tar.replace(/\.tar\.gz$/, '');
		}

		await execa('make', { cwd: redisDirectory, stdio });
		builtRedisDirectory = redisDirectory;
	}

	return builtRedisDirectory;
}

/* istanbul ignore next line */
if (require.main === module) {
	program
		.option('--download-dir <downloadDir>', 'Download path')
		.option('--version <version>', 'Redis version to download, "latest" is by default')
		.parse(process.argv);

	redisDownload(program)
		.then((redisDirectory) => console.log(redisDirectory)) // eslint-disable-line no-console
		.catch((err) => {
			console.error(err); // eslint-disable-line no-console

			process.exit(err.code || 1);
		});
}

export default redisDownload;
