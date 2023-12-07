import { Ai } from '@cloudflare/ai';

import { estimateTokens } from '../utils/tokens';
import streamToString from '../utils/streamToString';
import getTextTokenLimits from '../constants/textGenTokenLimits';

export default async function (batch, env) {
	const db = await env.DB;
	// const vectorize = env.VECTORIZE_INDEX;
	const ai = new Ai(env.AI);
	try {
		for (const msg of batch.messages) {
			const run_id = msg.body;
			const run = await db.prepare('SELECT * FROM runs WHERE id = ?').bind(run_id).first();
			// assume it was successful, it throws if it wasn't
			// set the run status to 'in progress'
			await db.prepare('UPDATE runs SET status = ? WHERE id = ?').bind('in_progress', run.id).run();
			// get the assistant and thread for this run
			const assistant = await db
				.prepare('SELECT * FROM assistants WHERE id = ?')
				.bind(run.assistant_id)
				.first();

			const thread = await db
				.prepare('SELECT * FROM threads WHERE id = ?')
				.bind(run.thread_id)
				.first();

			// get all messages associated with the thread
			// newest first
			const msgResult = await db
				.prepare('SELECT * FROM messages WHERE thread_id = ? ORDER BY id DESC')
				.bind(thread.id)
				.all();

			const allMessages = msgResult.results;

			// get the latest message from a user
			// we have them all in memory so we can just iterate
			// eventually we will use this to get the context
			// skip for now because vectors need rewritten
			// const latestUserMessage = allMessages.find(msg => msg.role === 'user');

			const maxTokens = getTextTokenLimits(assistant.model).streamTokens;

			// the vector system needs rewritten. For now just get the last n messages
			// that fit within the token limit
			let messages = [];
			let token = estimateTokens(assistant.instructions);
			allMessages.forEach(msg => {
				const count = estimateTokens(msg.content);
				if (token + count < maxTokens) {
					token += count;
					messages.push(msg);
				}
			});
			messages.push({
				role: 'system',
				text: assistant.instructions,
			});
			// reverse the messages so they are in the correct order
			messages.reverse();
			const stream = await ai.run(assistant.model, {
				messages,
				stream: true,
			});
			// get the entire stream
			const response = await streamToString(stream);
			// add the new message to the db
			await db
				.prepare(
					'INSERT INTO messages (thread_id, role, content, assistant_id, run_id) VALUES (?, ?, ?)'
				)
				.bind(thread.id, 'assistant', response, assistant.id, run.id)
				.run();
			// mark the run as complete
			// now as epoch seconds
			const now = Math.floor(Date.now() / 1000);
			await db
				.prepare('UPDATE runs SET status = ?, completed_at = ? WHERE id = ?')
				.bind('completed', now, run.id)
				.run();

			msg.ack();
		}
	} catch (e) {
		console.error(e);
		// mark the run as failed
		// maybe we should throw in a dead letter queue?
	}
}
