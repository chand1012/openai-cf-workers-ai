import { chunkBGE } from '../utils/tokens';
import { newMessage } from './messages';

const INSERT_QUERY = 'INSERT INTO threads (metadata) VALUES (?)';
const GET_LAST_ID_QUERY = 'SELECT * FROM threads ORDER BY id DESC LIMIT 1';

const DELETE_QUERY = 'DELETE FROM threads WHERE id = ?';
const DELETE_MESSAGES_QUERY = 'DELETE FROM messages WHERE thread_id = ?';
const GET_QUERY = 'SELECT * FROM threads WHERE id = ?';
const UPDATE_QUERY = 'UPDATE threads SET metadata = ? WHERE id = ?';

const dbThreadToResponseThread = dbThread => {
	// parse the json metadata if it exists and replace
	if (dbThread.metadata) {
		dbThread.metadata = JSON.parse(dbThread.metadata);
	} else {
		dbThread.metadata = {};
	}
	// convert the date to epoch seconds
	dbThread.created_at = Math.floor(Date.parse(dbThread.created_at) / 1000);
	dbThread['object'] = 'thread';
	// convert the id to a string
	dbThread.id = dbThread.id.toString();
	return dbThread;
};

export const insertThreadHandler = async (request, env) => {
	let messages = [];
	let metadata = {};
	try {
		const data = await request.json();
		messages = data.messages || [];
		metadata = data.metadata || {};
	} catch (e) {
		console.log('Empty request body, continuing...');
	}
	let metadata_str = '';
	if (metadata) {
		metadata_str = JSON.stringify(metadata);
	}
	try {
		const db = await env.DB;
		const resp = await db.prepare(INSERT_QUERY).bind(metadata_str).all();
		if (resp.success) {
			// query for the most recent row
			let lastRow = await db.prepare(GET_LAST_ID_QUERY).first();
			if (messages.length > 0) {
				const messagePromises = messages.map(message => {
					return newMessage(lastRow.id, message, env);
				});
				await Promise.all(messagePromises);
			}

			return Response.json(dbThreadToResponseThread(lastRow), { status: 201 });
		}
	} catch (e) {
		console.log(e);
	}

	return Response.json({ error: 'unable to insert thread' }, { status: 500 });
};

export const getThreadHandler = async (request, env) => {
	const { params } = request;
	const { id } = params;
	const db = await env.DB;
	const resp = await db.prepare(GET_QUERY).bind(id).first();

	return Response.json(dbThreadToResponseThread(resp));
};

export const modifyThreadHandler = async (request, env) => {
	const { params } = request;
	const { id } = params;
	const db = await env.DB;
	const data = await request.json();
	const { metadata } = data;
	const metadata_str = JSON.stringify(metadata);
	const resp = await db.prepare(UPDATE_QUERY).bind(metadata_str, id).run();
	if (resp.success) {
		const updated = await db.prepare(GET_QUERY).bind(id).first();
		return Response.json(dbThreadToResponseThread(updated));
	}

	return Response.json({ error: 'unable to update thread' }, { status: 500 });
};

export const deleteThreadHandler = async (request, env) => {
	const { params } = request;
	const { id } = params;
	const db = await env.DB;
	// first, get all messages associated with this thread
	const messages = await db.prepare('SELECT * FROM messages WHERE thread_id = ?').bind(id).all();
	await deleteMessageVectors(messages.results, env);
	const msg_resp = await db.prepare(DELETE_MESSAGES_QUERY).bind(id).run();
	if (!msg_resp.success) {
		return Response.json({ error: 'unable to delete thread' }, { status: 500 });
	}
	const resp = await db.prepare(DELETE_QUERY).bind(id).run();

	if (resp.success) {
		return Response.json({ deleted: true, object: 'thread.deleted', id });
	}

	return Response.json({ error: 'unable to delete thread' }, { status: 500 });
};

const deleteMessageVectors = async (messages, env) => {
	const vectorIds = messages
		.map(msg => {
			const chunks = chunkBGE(msg.content);
			return chunks.map((_, i) => `${msg.id}-${i}`);
		})
		.flat();

	await env.VECTORIZE_INDEX.deleteByIds(vectorIds);
};
