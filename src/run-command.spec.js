import execa from 'execa';
import os from 'os';
import redisDownload from './redis-download';
import runCommand from './run-command';

jest.mock('./redis-download');
jest.mock('execa');
jest.mock('os');

describe('run-command', () => {
	beforeEach(() => {
		execa.mockImplementation(() => Promise.resolve());
		os.homedir.mockImplementation(() => '/a/home/dir');
		redisDownload.mockImplementation(() => Promise.resolve('/a/home/dir/.redis-prebuilt/redis-x.y.z'));
	});

	afterEach(() => {
		delete process.env.REDIS_DOWNLOADDIR;
		delete process.env.REDIS_VERSION;

		jest.resetAllMocks();
	});

	it('downloads redis', async () => {
		await runCommand('redis-command');

		expect(redisDownload).toHaveBeenCalledWith({ downloadDir: '/a/home/dir/.redis-prebuilt' });
	});

	it('executes the redis command', async () => {
		await runCommand('redis-command', ['args1', 'args2']);

		expect(execa).toHaveBeenCalledWith('/a/home/dir/.redis-prebuilt/redis-x.y.z/src/redis-command', ['args1', 'args2'], expect.anything());
	});
});
