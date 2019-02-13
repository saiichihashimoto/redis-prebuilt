import execa from 'execa';
import redisDownload from './redis-download';

export default async function runCommand(command, args) {
	const directory = await redisDownload();

	return execa(`${directory}/${command}`, args, { stdio: [process.stdin, process.stdout, process.stdout] });
}
