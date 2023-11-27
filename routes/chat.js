import { Ai } from '@cloudflare/ai';

import { estimateTokens } from '../utils/tokens';

export const chatHandler = async (request, env) => {
	const ai = new Ai(env.AI);
	let model = '@cf/mistral/mistral-7b-instruct-v0.1';
	let messages = [];
	let error = null;

	// get the current time in epoch seconds
	const created = Math.floor(Date.now() / 1000);
	const uuid = crypto.randomUUID();

	try {
		// If the POST data is JSON then attach it to our response.
		if (request.headers.get('Content-Type') === 'application/json') {
			let json = await request.json();
			// when there is more than one model available, enable the user to select one
			if (json?.model) {
				model = json.model;
			}
			if (json?.messages) {
				if (Array.isArray(json.messages)) {
					if (json.messages.length === 0) {
						return Response.json({ error: 'no messages provided' }, { status: 400 });
					}
					messages = json.messages;
				}
			}
			let prompt_tokens = 0;
			messages.forEach(message => {
				if (typeof message.content === 'string') {
					prompt_tokens += estimateTokens(message.content);
				}
			});
			// for now, nothing else does anything. Load the ai model.
			const aiResp = await ai.run(model, { messages });
			const completion_tokens = estimateTokens(aiResp.response);
			return Response.json({
				id: uuid,
				model,
				created,
				object: 'chat.completion',
				choices: [
					{
						index: 0,
						message: {
							role: 'assistant',
							content: aiResp.response,
						},
						finish_reason: 'stop',
					},
				],
				usage: {
					prompt_tokens,
					completion_tokens,
					total_tokens: prompt_tokens + completion_tokens,
				},
			});
		}
	} catch (e) {
		error = e;
	}

	// if there is no header or it's not json, return an error
	if (error) {
		return Response.json({ error: error.message }, { status: 400 });
	}

	// if we get here, return a 400 error
	return Response.json({ error: 'invalid request' }, { status: 400 });
};
