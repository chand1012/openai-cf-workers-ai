// source: https://developers.cloudflare.com/workers-ai/models/text-generation/

const limits = {
	'@cf/meta/llama-2-7b-chat-fp16': {
		tokens: 256,
		streamTokens: 2500,
		context: 3072,
	},
	'@cf/meta/llama-2-7b-chat-int8': {
		tokens: 256,
		streamTokens: 1800,
		context: 2048,
	},
	'@cf/mistral/mistral-7b-instruct-v0.1': {
		tokens: 256,
		streamTokens: 1800,
		// context is not listed
	},
	'@hf/thebloke/codellama-7b-instruct-awq': {
		tokens: 256,
		streamTokens: 596,
		// context is not listed
	},
};

export default function getTextTokenLimits(model) {
	return limits[model];
}
