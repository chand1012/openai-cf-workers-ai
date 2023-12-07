// export default async function streamToString(readableStream) {
// 	let concatenatedString = '';
// 	const reader = readableStream.getReader();

// 	// Process each stream chunk
// 	reader
// 		.read()
// 		.then(function processText({ done, value }) {
// 			if (done) return;

// 			const chunkAsString = new TextDecoder().decode(value);
// 			if (chunkAsString === '[DONE]') {
// 				reader.cancel();
// 				return concatenatedString;
// 			}

// 			try {
// 				const data = JSON.parse(chunkAsString);
// 				concatenatedString += data.response || '';
// 			} catch (err) {
// 				throw new Error(`JSON parsing error: ${err.message}`);
// 			}

// 			// Read the next chunk
// 			reader.read().then(processText);
// 		})
// 		.catch(err => {
// 			throw new Error(`Stream reading error: ${err.message}`);
// 		});

// 	// Return the final concatenated string
// 	await reader.closed;
// 	return concatenatedString;
// }

export default async function streamToString(readableStream) {
	let concatenatedString = '';

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
		const chunkAsString = chunk.toString();

		if (chunkAsString === '[DONE]') {
			return concatenatedString;
		}

		// Attempt to parse the chunk as JSON
		try {
			const data = JSON.parse(chunkAsString);
			concatenatedString += data.response || '';
		} catch (err) {
			// Handle JSON parsing error
			console.error(`JSON parsing error: ${err.message}`);
			// Optionally, you can accumulate non-JSON chunks or handle them differently
			// concatenatedString += chunkAsString;
		}
	}

	return concatenatedString;
}
