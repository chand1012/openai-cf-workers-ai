import { Readable } from 'node:stream';
import { Buffer } from 'node:buffer';

export default async function streamToString(readableStream) {
	let concatenatedString = '';
	let lastChunk = '';

	const nodeReadable = new Readable({
		async read() {
			const reader = readableStream.getReader();
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						this.push(null); // Indicate the end of the stream
						break;
					}
					this.push(Buffer.from(value));
				}
			} catch (err) {
				this.emit('error', err);
				this.push(null); // Close the stream on error
			}
		},
	});

	for await (const chunk of nodeReadable) {
		const chunkAsString = chunk.toString().replace('data: ', '');
		// fullResponse += chunkAsString;
		if (chunkAsString === '[DONE]') {
			return concatenatedString;
		}

		// Attempt to parse the chunk as JSON
		try {
			const data = JSON.parse(chunkAsString);
			if (data.response !== lastChunk) {
				concatenatedString += data.response || '';
				lastChunk = data.response;
			}
		} catch (err) {
			// Handle JSON parsing error
			console.error(`JSON parsing error: ${err.message}`);
			// Optionally, you can accumulate non-JSON chunks or handle them differently
			// concatenatedString += chunkAsString;
		}
	}

	// console.log(fullResponse);

	return concatenatedString;
}
