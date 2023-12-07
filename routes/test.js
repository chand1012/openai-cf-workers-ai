import { Ai } from '@cloudflare/ai';

export const testHandler = async (request, env) => {
	const messages = [
		{
			role: 'system',
			content:
				'You are a helpful assistant who identifies languages. Only output one of the following and nothing else: english, chinese, french, spanish, arabic, russian, german, japanese, portuguese, hindi',
		},
		{ role: 'user', content: 'Hola mi nombre es brian y el tuyo?' },
		{ role: 'assistant', content: 'spanish' },
		{ role: 'user', content: 'Was für ein schönes Baby!' },
		{ role: 'assistant', content: 'german' },
		{ role: 'user', content: 'Ma voiture est en panne.' },
	];

	const model = '@cf/meta/llama-2-7b-chat-int8';

	const ai = new Ai(env.AI);

	let stream;

	try {
		stream = await ai.run(model, { messages, stream: true });
	} catch (e) {
		console.error(e);
		return new Response(e.message, { status: 500 });
	}

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream',
		},
	});
};
