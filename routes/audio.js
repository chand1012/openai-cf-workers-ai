import { Ai } from '@cloudflare/ai';

export const transcriptionHandler = async (request, env) => {
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
};

function getLanguageId(text) {
	text = text.toLowerCase();
	if (text.includes('\n')) {
		return text.split('\n')[0];
	} else if (text.includes(' ')) {
		return text.split(' ')[0];
	} else {
		return text;
	}
}

export const translationHandler = async (request, env) => {
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
};
