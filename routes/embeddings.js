export const embeddingsHandler = async (request, env) => {
	let model = '@cf/baai/bge-base-en-v1.5';
	let error = null;

	try {
		if (request.headers.get('Content-Type') === 'application/json') {
			const json = await request.json();
			// if (json?.model) {
			// 	model = json.model;
			// }

			const embeddings = await env.AI.run(model, {
				text: json.input,
			});

			return Response.json({
				object: 'list',
				data: [
					{
						object: 'embedding',
						embedding: embeddings.data[0],
						index: 0,
					},
				],
				model,
				usage: {
					prompt_tokens: 0,
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
