export const completionHandler = async (request, env) => {
	let model = '@cf/mistral/mistral-7b-instruct-v0.1';

	const created = Math.floor(Date.now() / 1000);
	const uuid = crypto.randomUUID();
	let error = null;

	try {
		// If the POST data is JSON then attach it to our response.
		if (request.headers.get('Content-Type') === 'application/json') {
			let json = await request.json();
			// when there is more than one model available, enable the user to select one
			if (json?.model) {
				const mapper = env.MODEL_MAPPER ?? {};
				model = mapper[json.model] ? mapper[json.model] : json.model;
			}
			if (json?.prompt) {
				if (typeof json.prompt === 'string') {
					if (json.prompt.length === 0) {
						return Response.json({ error: 'no prompt provided' }, { status: 400 });
					}
				}
			}
			// for now, nothing else does anything. Load the ai model.
			const aiResp = await env.AI.run(model, { prompt: json.prompt });
			return Response.json({
				id: uuid,
				model,
				created,
				object: 'text_completion',
				choices: [
					{
						index: 0,
						finish_reason: 'stop',
						text: aiResp.response,
						logprobs: null,
					},
				],
				usage: {
					prompt_tokens: 0,
					completion_tokens: 0,
					total_tokens: 0,
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
