import { Ai } from '@cloudflare/ai';

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
			if (!json?.stream) json.stream = false;

			let buffer = '';
			const decoder = new TextDecoder();
			const encoder = new TextEncoder();
			const transformer = new TransformStream({
				transform(chunk, controller) {
					buffer += decoder.decode(chunk);
					// Process buffered data and try to find the complete message
					while (true) {
						const newlineIndex = buffer.indexOf('\n');
						if (newlineIndex === -1) {
							// If no line breaks are found, it means there is no complete message, wait for the next chunk
							break;
						}

						// Extract a complete message line
						const line = buffer.slice(0, newlineIndex + 1);
						// console.log(line);
						// console.log("-----------------------------------");
						buffer = buffer.slice(newlineIndex + 1); // Update buffer

						// Process this line
						try {
							if (line.startsWith('data: ')) {
								const content = line.slice('data: '.length);
								console.log(content);
								const doneflag = content.trim() == '[DONE]';
								const data = doneflag ? null : JSON.parse(content);
								const newChunk =
									'data: ' +
									JSON.stringify({
										id: uuid,
										created,
										object: 'chat.completion.chunk',
										model,
										choices: [
											{
												delta: { content: doneflag ? '' : data.response },
												index: 0,
												finish_reason: doneflag ? 'stop' : null,
											},
										],
									}) +
									'\n\n';
								controller.enqueue(encoder.encode(newChunk));
							}
						} catch (err) {
							console.error('Error parsing line:', err);
						}
					}
				},
			});

			// for now, nothing else does anything. Load the ai model.
			const aiResp = await ai.run(model, { stream: json.stream, messages });
			// Piping the readableStream through the transformStream
			return json.stream ? new Response(aiResp.pipeThrough(transformer), {
				headers: {
					'content-type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					'Connection': 'keep-alive',
				},
			}) : Response.json({
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
