import execa from 'execa';
import request from 'request';
import requestAsync from 'request-promise-native';
import { createHash } from 'crypto';
import { createWriteStream, ensureDir, remove, rename } from 'fs-extra';
import { extract } from 'tar';
import { homedir } from 'os';

const redisHashesUrl = 'https://raw.githubusercontent.com/antirez/redis-hashes/master/README';
const downloadsDirectory = `${homedir}/.redis-prebuilt/redis-download`;
const stdio = [process.stdin, process.stdout, process.stdout];
const crReturn = (process.platform === 'win32') ? '\x1b[0G' : '\r';

export default async function redisDownload() {
	await ensureDir(downloadsDirectory);

	const [, filename, algo, digest, url] = (await requestAsync(redisHashesUrl))
		.split('\n')
		.filter((line) => line && line.charAt(0) !== '#')
		.map((line) => line.split(/\s+/))
		.pop();

	const file = `${downloadsDirectory}/${filename}`;
	const tempFile = `${file}.downloading`;
	const cwd = file.replace(/\.tar\.gz$/, '');

	const fileStream = createWriteStream(tempFile);

	await new Promise((resolve, reject) => {
		request
			.get(url)
			.on('response', (response) => {
				let completed = 0;
				let lastStdout;
				const total = parseInt(response.headers['content-length'], 10);
				const totalMB = Math.round(total / 1048576 * 10) / 10;
				const hash = createHash(algo);

				response.on('data', (chunk) => {
					hash.update(chunk);
					completed += chunk.length;
					const completedPercentage = Math.round(100.0 * completed / total * 10) / 10;
					const completedMB = Math.round(completed / 1048576 * 10) / 10;
					const text = `Completed: ${completedPercentage} % (${completedMB}mb / ${totalMB}mb)${crReturn}`;
					if (lastStdout !== text) {
						lastStdout = text;
						process.stdout.write(text);
					}
				});

				response.on('end', () => {
					if (hash.digest('hex') === digest) {
						return;
					}
					reject(new Error('The hash doesn\'t match!'));
				});
			})
			.on('error', (err) => {
				reject(err);
			})
			.pipe(fileStream);

		fileStream.on('finish', () => {
			fileStream.close(() => {
				resolve(file);
			});
		});
	});

	await rename(tempFile, file);
	await extract({ file, cwd: downloadsDirectory });
	await remove(file);
	await execa('make', { cwd, stdio });

	return `${cwd}/src`;
}
