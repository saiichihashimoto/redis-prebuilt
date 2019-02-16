import execa from 'execa';
import { homedir } from 'os';
import redisDownload from './redis-download';

export default async function runCommand(command, args) {
	const {
		env: {
			REDIS_DOWNLOADDIR: downloadsDirectory = `${homedir()}/.redis-prebuilt`,
			REDIS_VERSION: version,
		},
	} = process;

	const directory = await redisDownload({
		downloadsDirectory,
		version,
	});

	return execa(`${directory}/${command}`, args, { stdio: [process.stdin, process.stdout, process.stdout] });
}
