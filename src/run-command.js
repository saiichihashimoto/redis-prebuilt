import execa from 'execa';
import { homedir } from 'os';
import redisDownload from './redis-download';

export default async function runCommand(command, args) {
	const {
		env: {
			REDIS_DOWNLOADDIR: downloadDir = `${homedir()}/.redis-prebuilt`,
			REDIS_VERSION: version,
		},
	} = process;

	const directory = await redisDownload({
		downloadDir,
		version,
	});

	return execa(`${directory}/src/${command}`, args, { stdio: [process.stdin, process.stdout, process.stdout] });
}
