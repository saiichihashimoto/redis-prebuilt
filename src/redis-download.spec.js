import execa from 'execa';
import request from 'request';
import requestAsync from 'request-promise-native';
import { Readable, Writable } from 'stream';
import { createHash } from 'crypto';
import { createWriteStream, ensureDir, exists, readdir, rename } from 'fs-extra';
import { extract } from 'tar';
import { tmpdir } from 'os';
import redisDownload from './redis-download';

/*
 * FIXME SHOULD BE REPLACED BY redis-download
 *
 * https://github.com/saiichihashimoto/redis-download
 */

jest.mock('crypto');
jest.mock('execa');
jest.mock('fs-extra');
jest.mock('os');
jest.mock('request');
jest.mock('request-promise-native');
jest.mock('tar');

describe('redis-download', () => {
	const digest = jest.fn();
	const update = jest.fn();

	let stdio;
	let response;
	let writable;

	beforeEach(() => {
		stdio = [new Readable(), new Writable(), new Writable()];
		stdio[1]._write = jest.fn(); // eslint-disable-line no-underscore-dangle

		response = new Readable();
		response._read = jest.fn(); // eslint-disable-line no-underscore-dangle
		response.headers = { 'content-length': 10485760 };

		writable = new Writable();
		writable.close = jest.fn().mockImplementation((func) => func());

		createHash.mockImplementation(() => ({ digest, update }));
		digest.mockImplementation(() => 'THEHASH');
		ensureDir.mockImplementation(() => Promise.resolve());
		execa.mockImplementation(() => Promise.resolve());
		exists.mockImplementation(() => Promise.resolve(false));
		extract.mockImplementation(() => Promise.resolve());
		readdir.mockImplementation(() => Promise.resolve([]));
		rename.mockImplementation(() => Promise.resolve());
		requestAsync.mockImplementation(() => Promise.resolve('hash redis-u.v.w.tar.gz algo THEHASH http://foo-bar.com/redis-u.v.w.tar.gz\nhash redis-x.y.z.tar.gz algo THEHASH http://foo-bar.com/redis-x.y.z.tar.gz'));
		tmpdir.mockImplementation(() => '/a/tmp/dir');

		request.mockImplementation(() => {
			const readable = new Readable();
			readable._read = jest.fn(); // eslint-disable-line no-underscore-dangle

			setImmediate(() => {
				readable.emit('response', response);
			});

			return readable;
		});

		createWriteStream.mockImplementation(() => {
			setImmediate(() => {
				writable.emit('finish');
			});

			return writable;
		});
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('downloads, extracts, and builds the latest redis', async () => {
		const downloadLocation = await redisDownload({ stdio });

		expect(requestAsync).toHaveBeenCalledWith('https://raw.githubusercontent.com/antirez/redis-hashes/master/README');
		expect(request).toHaveBeenCalledWith('http://foo-bar.com/redis-x.y.z.tar.gz');
		expect(extract).toHaveBeenCalledWith(expect.objectContaining({ file: '/a/tmp/dir/redis-download/redis-x.y.z.tar.gz', cwd: '/a/tmp/dir/redis-download' }));
		expect(execa).toHaveBeenCalledWith('make', expect.objectContaining({ cwd: '/a/tmp/dir/redis-download/redis-x.y.z' }));

		expect(downloadLocation).toBe('/a/tmp/dir/redis-download/redis-x.y.z');
	});

	it('downloads, extracts, and builds the specified redis', async () => {
		const downloadLocation = await redisDownload({ stdio, version: 'u.v.w' });

		expect(requestAsync).toHaveBeenCalledWith('https://raw.githubusercontent.com/antirez/redis-hashes/master/README');
		expect(request).toHaveBeenCalledWith('http://foo-bar.com/redis-u.v.w.tar.gz');
		expect(extract).toHaveBeenCalledWith(expect.objectContaining({ file: '/a/tmp/dir/redis-download/redis-u.v.w.tar.gz', cwd: '/a/tmp/dir/redis-download' }));
		expect(execa).toHaveBeenCalledWith('make', expect.objectContaining({ cwd: '/a/tmp/dir/redis-download/redis-u.v.w' }));

		expect(downloadLocation).toBe('/a/tmp/dir/redis-download/redis-u.v.w');
	});

	it('prints status updates', async () => {
		createWriteStream.mockImplementation(() => writable);

		const stdout = stdio[1];
		const downloadLocation = redisDownload({ stdio });

		await new Promise((resolve) => {
			stdout.write = jest.fn().mockImplementationOnce(() => resolve());
		});

		expect(stdout.write).toHaveBeenNthCalledWith(1, 'Completed: 0 % (0mb / 10mb)\r');

		for (let i = 0; i < 10; i += 1) {
			response.emit('data', { length: 1048576 });
		}

		expect(stdout.write).toHaveBeenNthCalledWith(2, 'Completed: 10 % (1mb / 10mb)\r');
		expect(stdout.write).toHaveBeenNthCalledWith(3, 'Completed: 20 % (2mb / 10mb)\r');
		expect(stdout.write).toHaveBeenNthCalledWith(4, 'Completed: 30 % (3mb / 10mb)\r');
		expect(stdout.write).toHaveBeenNthCalledWith(5, 'Completed: 40 % (4mb / 10mb)\r');
		expect(stdout.write).toHaveBeenNthCalledWith(6, 'Completed: 50 % (5mb / 10mb)\r');
		expect(stdout.write).toHaveBeenNthCalledWith(7, 'Completed: 60 % (6mb / 10mb)\r');
		expect(stdout.write).toHaveBeenNthCalledWith(8, 'Completed: 70 % (7mb / 10mb)\r');
		expect(stdout.write).toHaveBeenNthCalledWith(9, 'Completed: 80 % (8mb / 10mb)\r');
		expect(stdout.write).toHaveBeenNthCalledWith(10, 'Completed: 90 % (9mb / 10mb)\r');
		expect(stdout.write).toHaveBeenNthCalledWith(11, 'Completed: 100 % (10mb / 10mb)\r');
		expect(stdout.write).toHaveBeenCalledTimes(11);

		response.emit('data', { length: 0 });

		expect(stdout.write).toHaveBeenCalledTimes(11);

		writable.emit('finish');

		await downloadLocation;
	});

	it('fails if hashes don\'t match', async () => {
		digest.mockImplementation(() => 'NOTTHEHASH');

		await expect(redisDownload({ stdio })).rejects.toThrow('The hashes don\'t match!');
	});

	it('skips downloading if the tar exists', async () => {
		readdir.mockImplementation(() => Promise.resolve(['redis-u.v.w.tar.gz', 'redis-x.y.z.tar.gz']));

		const downloadLocation = await redisDownload({ stdio });

		expect(requestAsync).toHaveBeenCalledWith('https://raw.githubusercontent.com/antirez/redis-hashes/master/README');
		expect(request).not.toHaveBeenCalled();
		expect(extract).toHaveBeenCalledWith(expect.objectContaining({ file: '/a/tmp/dir/redis-download/redis-x.y.z.tar.gz', cwd: '/a/tmp/dir/redis-download' }));
		expect(execa).toHaveBeenCalledWith('make', expect.objectContaining({ cwd: '/a/tmp/dir/redis-download/redis-x.y.z' }));

		expect(downloadLocation).toBe('/a/tmp/dir/redis-download/redis-x.y.z');
	});

	it('skips downloading if the specified tar exists', async () => {
		readdir.mockImplementation(() => Promise.resolve(['redis-u.v.w.tar.gz', 'redis-x.y.z.tar.gz']));

		const downloadLocation = await redisDownload({ stdio, version: 'u.v.w' });

		expect(requestAsync).not.toHaveBeenCalled();
		expect(request).not.toHaveBeenCalled();
		expect(extract).toHaveBeenCalledWith(expect.objectContaining({ file: '/a/tmp/dir/redis-download/redis-u.v.w.tar.gz', cwd: '/a/tmp/dir/redis-download' }));
		expect(execa).toHaveBeenCalledWith('make', expect.objectContaining({ cwd: '/a/tmp/dir/redis-download/redis-u.v.w' }));

		expect(downloadLocation).toBe('/a/tmp/dir/redis-download/redis-u.v.w');
	});

	it('skips downloading and extracting if the directory exists', async () => {
		readdir.mockImplementation(() => Promise.resolve(['redis-u.v.w', 'redis-x.y.z', 'redis-x.y.z.tar.gz']));

		const downloadLocation = await redisDownload({ stdio });

		expect(requestAsync).toHaveBeenCalledWith('https://raw.githubusercontent.com/antirez/redis-hashes/master/README');
		expect(request).not.toHaveBeenCalled();
		expect(extract).not.toHaveBeenCalled();
		expect(execa).toHaveBeenCalledWith('make', expect.objectContaining({ cwd: '/a/tmp/dir/redis-download/redis-x.y.z' }));

		expect(downloadLocation).toBe('/a/tmp/dir/redis-download/redis-x.y.z');
	});

	it('skips downloading and extracting if the specified directory exists', async () => {
		readdir.mockImplementation(() => Promise.resolve(['redis-u.v.w', 'redis-x.y.z', 'redis-u.v.w.tar.gz']));

		const downloadLocation = await redisDownload({ stdio, version: 'u.v.w' });

		expect(requestAsync).not.toHaveBeenCalled();
		expect(request).not.toHaveBeenCalled();
		expect(extract).not.toHaveBeenCalled();
		expect(execa).toHaveBeenCalledWith('make', expect.objectContaining({ cwd: '/a/tmp/dir/redis-download/redis-u.v.w' }));

		expect(downloadLocation).toBe('/a/tmp/dir/redis-download/redis-u.v.w');
	});

	it('skips downloading, extracting, and building if the build exists', async () => {
		const binaries = [
			'/a/tmp/dir/redis-download/redis-u.v.w/src/redis-benchmark',
			'/a/tmp/dir/redis-download/redis-u.v.w/src/redis-check-aof',
			'/a/tmp/dir/redis-download/redis-u.v.w/src/redis-check-rdb',
			'/a/tmp/dir/redis-download/redis-u.v.w/src/redis-cli',
			'/a/tmp/dir/redis-download/redis-u.v.w/src/redis-sentinel',
			'/a/tmp/dir/redis-download/redis-u.v.w/src/redis-server',
			'/a/tmp/dir/redis-download/redis-x.y.z/src/redis-benchmark',
			'/a/tmp/dir/redis-download/redis-x.y.z/src/redis-check-aof',
			'/a/tmp/dir/redis-download/redis-x.y.z/src/redis-check-rdb',
			'/a/tmp/dir/redis-download/redis-x.y.z/src/redis-cli',
			'/a/tmp/dir/redis-download/redis-x.y.z/src/redis-sentinel',
			'/a/tmp/dir/redis-download/redis-x.y.z/src/redis-server',
		];

		exists.mockImplementation((filePath) => Promise.resolve(binaries.includes(filePath)));
		readdir.mockImplementation(() => Promise.resolve(['redis-u.v.w', 'redis-x.y.z', 'redis-x.y.z.tar.gz']));

		const downloadLocation = await redisDownload({ stdio });

		expect(requestAsync).toHaveBeenCalledWith('https://raw.githubusercontent.com/antirez/redis-hashes/master/README');
		expect(request).not.toHaveBeenCalled();
		expect(extract).not.toHaveBeenCalled();
		expect(execa).not.toHaveBeenCalled();

		expect(downloadLocation).toBe('/a/tmp/dir/redis-download/redis-x.y.z');
	});

	it('skips downloading, extracting, and building if the specified build exists', async () => {
		const binaries = [
			'/a/tmp/dir/redis-download/redis-u.v.w/src/redis-benchmark',
			'/a/tmp/dir/redis-download/redis-u.v.w/src/redis-check-aof',
			'/a/tmp/dir/redis-download/redis-u.v.w/src/redis-check-rdb',
			'/a/tmp/dir/redis-download/redis-u.v.w/src/redis-cli',
			'/a/tmp/dir/redis-download/redis-u.v.w/src/redis-sentinel',
			'/a/tmp/dir/redis-download/redis-u.v.w/src/redis-server',
			'/a/tmp/dir/redis-download/redis-x.y.z/src/redis-benchmark',
			'/a/tmp/dir/redis-download/redis-x.y.z/src/redis-check-aof',
			'/a/tmp/dir/redis-download/redis-x.y.z/src/redis-check-rdb',
			'/a/tmp/dir/redis-download/redis-x.y.z/src/redis-cli',
			'/a/tmp/dir/redis-download/redis-x.y.z/src/redis-sentinel',
			'/a/tmp/dir/redis-download/redis-x.y.z/src/redis-server',
		];

		exists.mockImplementation((filePath) => Promise.resolve(binaries.includes(filePath)));
		readdir.mockImplementation(() => Promise.resolve(['redis-u.v.w', 'redis-x.y.z', 'redis-u.v.w.tar.gz']));

		const downloadLocation = await redisDownload({ stdio, version: 'u.v.w' });

		expect(requestAsync).not.toHaveBeenCalled();
		expect(request).not.toHaveBeenCalled();
		expect(extract).not.toHaveBeenCalled();
		expect(execa).not.toHaveBeenCalled();

		expect(downloadLocation).toBe('/a/tmp/dir/redis-download/redis-u.v.w');
	});

	it('downloads to the specified directory', async () => {
		const downloadLocation = await redisDownload({ stdio, downloadDir: '/a/different/dir' });

		expect(extract).toHaveBeenCalledWith(expect.objectContaining({ file: '/a/different/dir/redis-download/redis-x.y.z.tar.gz', cwd: '/a/different/dir/redis-download' }));
		expect(execa).toHaveBeenCalledWith('make', expect.objectContaining({ cwd: '/a/different/dir/redis-download/redis-x.y.z' }));

		expect(downloadLocation).toBe('/a/different/dir/redis-download/redis-x.y.z');
	});
});
