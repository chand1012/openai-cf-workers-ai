export const estimateTokens = prompt => {
	// roughly 4 characters per token, round up up to the nearest integer
	return Math.ceil(prompt.length / 4);
};
