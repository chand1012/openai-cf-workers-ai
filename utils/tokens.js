export const estimateTokens = prompt => {
	// roughly 4 characters per token, round up up to the nearest integer
	return Math.ceil(prompt.length / 4);
};

export const estimateTokensBGE = prompt => {
	// split on space and newline
	const words = prompt.split(/[\s\n]/);
	// one word is between 1 and 3 tokens. Let's assume 2 tokens per word
	// source: https://developers.cloudflare.com/workers-ai/models/text-embeddings/#available-embedding-models
	return words.length * 2;
};

export const chunkBGE = prompt => {
	const tokens = estimateTokensBGE(prompt);
	let chunks = [];
	if (tokens <= 500) {
		chunks.push(prompt);
	} else {
		// split messages on spaces into 250 word chunks
		const words = prompt.split(/[\s\n]/);
		let chunk = '';
		for (let i = 0; i < words.length; i++) {
			if (chunk.length + words[i].length > 250) {
				chunks.push(chunk.trim());
				chunk = '';
			}
			chunk += words[i] + ' ';
		}
	}

	return chunks;
};
