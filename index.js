import { Router } from 'itty-router';
import { Ai } from '@cloudflare/ai';
// Create a new router
const router = Router();

// chat completion
router.post('/chat/completions', async (request, env) => {
	const ai = new Ai(env.AI);
	let model = '@cf/meta/llama-2-7b-chat-int8';
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
			// if (json.model) {
			// 	model = json.model;
			// }
			if (json?.messages) {
				if (Array.isArray(json.messages)) {
					if (json.messages.length === 0) {
						return Response.json({ error: 'no messages provided' }, { status: 400 });
					}
					messages = json.messages;
				}
			}
			// for now, nothing else does anything. Load the ai model.
			const aiResp = await ai.run(model, { messages });
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
});

// regular completions
router.post('/completions', async (request, env) => {
	const ai = new Ai(env.AI);
	let model = '@cf/meta/llama-2-7b-chat-int8';

	const created = Math.floor(Date.now() / 1000);
	const uuid = crypto.randomUUID();
	let error = null;

	try {
		// If the POST data is JSON then attach it to our response.
		if (request.headers.get('Content-Type') === 'application/json') {
			let json = await request.json();
			// when there is more than one model available, enable the user to select one
			// if (json.model) {
			// 	model = json.model;
			// }
			if (json?.prompt) {
				if (typeof json.prompt === 'string') {
					if (json.prompt.length === 0) {
						return Response.json({ error: 'no prompt provided' }, { status: 400 });
					}
				}
			}
			// for now, nothing else does anything. Load the ai model.
			const aiResp = await ai.run(model, { prompt: json.prompt });
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
});

router.post('/embeddings', async (request, env) => {
	const ai = new Ai(env.AI);
	let model = '@cf/baai/bge-base-en-v1.5';
	let error = null;

	try {
		if (request.headers.get('Content-Type') === 'application/json') {
			const json = await request.json();
			// if (json?.model) {
			// 	model = json.model;
			// }

			const embeddings = await ai.run(model, {
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
});

router.post('/audio/transcriptions', async (request, env) => {
	const ai = new Ai(env.AI);
	let model = '@cf/openai/whisper';
	let error = null;
	// don't need anything else as openai just gives back text
	console.log(request.headers.get('Content-Type'));
	try {
		if (request.headers.get('Content-Type').includes('multipart/form-data')) {
			const formData = await request.formData();
			const audio = formData.get('file');
			if (!audio) {
				return Response.json({ error: 'no audi`o provided' }, { status: 400 });
			}
			const blob = await audio.arrayBuffer();
			const input = {
				audio: [...new Uint8Array(blob)],
			};
			const resp = await ai.run(model, input);
			return Response.json({
				text: resp.text,
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
});

function getLanguageId(text) {
	if (text.includes('\n')) {
		return text.split('\n')[0];
	} else if (text.includes(' ')) {
		return text.split(' ')[0];
	} else {
		return text;
	}
}

router.post('/audio/translations', async (request, env) => {
	const ai = new Ai(env.AI);
	let model = '@cf/openai/whisper';
	let error = null;

	try {
		if (request.headers.get('Content-Type').includes('multipart/form-data')) {
			const formData = await request.formData();
			const audio = formData.get('file');
			if (!audio) {
				throw new Error('no audio provided');
			}
			const blob = await audio.arrayBuffer();
			const input = {
				audio: [...new Uint8Array(blob)],
			};
			const resp = await ai.run(model, input);

			const language_id_resp = await ai.run('@cf/meta/llama-2-7b-chat-int8', {
				messages: [
					{
						role: 'user',
						content:
							"Output one of the following: english, chinese, french, spanish, arabic, russian, german, japanese, portuguese, hindi. Identify the following languages.\nQ:'Hola mi nombre es brian y el tuyo?'",
					},
					{ role: 'assistant', content: 'spanish' },
					{ role: 'user', content: 'Was für ein schönes Baby!' },
					{ role: 'assistant', content: 'german' },
					{ role: 'user', content: resp.text },
				],
			});

			const translation_resp = await ai.run('@cf/meta/m2m100-1.2b', {
				text: resp.text,
				source_lang: getLanguageId(language_id_resp.response),
				target_lang: 'english',
			});

			if (!translation_resp.translated_text) {
				console.log({ translation_resp });
				throw new Error('translation failed');
			}

			return Response.json({
				text: translation_resp.translated_text,
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
});

/*
This is the last route we define, it will match anything that hasn't hit a route we've defined
above, therefore it's useful as a 404 (and avoids us hitting worker exceptions, so make sure to include it!).

Visit any page that doesn't exist (e.g. /foobar) to see it in action.
*/
router.all('*', () => new Response('404, not found!', { status: 404 }));

export default {
	fetch: router.handle,
};
