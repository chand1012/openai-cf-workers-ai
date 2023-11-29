const INSERT_RUN =
	'INSERT INTO runs (assistant_id, thread_id, model, instructions, tools, file_ids, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)';
const GET_LATEST_RUN = 'SELECT * FROM runs ORDER BY id DESC LIMIT 1';

const dbRunToResponse = dbRun => {
	// all timestamps should be epoch seconds
	dbRun.created_at = Math.floor(Date.parse(dbRun.created_at) / 1000);
	dbRun.expires_at = Math.floor(Date.parse(dbRun.expires_at) / 1000);
	dbRun.started_at = Math.floor(Date.parse(dbRun.started_at) / 1000);
	dbRun.cancelled_at = Math.floor(Date.parse(dbRun.cancelled_at) / 1000);
	dbRun.failed_at = Math.floor(Date.parse(dbRun.failed_at) / 1000);
	dbRun.completed_at = Math.floor(Date.parse(dbRun.completed_at) / 1000);
	// convert the id to a string
	dbRun.id = dbRun.id.toString();
	// if metadata, tools, or file_ids exist, parse them. Else return empty object
	dbRun.metadata = dbRun.metadata ? JSON.parse(dbRun.metadata) : {};
	dbRun.tools = dbRun.tools ? JSON.parse(dbRun.tools) : [];
	dbRun.file_ids = dbRun.file_ids ? JSON.parse(dbRun.file_ids) : [];
	// convert thread and assistant ids to strings
	dbRun.thread_id = dbRun.thread_id.toString();
	dbRun.assistant_id = dbRun.assistant_id.toString();

	return dbRun;
};

const dbRunListToResponse = dbRuns => {
	const runs = dbRuns.map(dbRunToResponse);
	// get the first and last run ids
	const first_id = runs[runs.length - 1]?.id || null;
	const last_id = runs[0]?.id || null;
	const has_more = false;
	const object = 'list';
	return {
		object,
		data: runs,
		first_id,
		last_id,
		has_more,
	};
};

export const createRunHandler = async (request, env) => {
	const { params } = request;
	const { thread_id } = params;
	const data = await request.json();
	// if assistant id does not exist, is not a string, or is empty, throw an error
	if (
		!data.assistant_id ||
		typeof data.assistant_id !== 'string' ||
		data.assistant_id.length === 0
	) {
		return Response.json({ error: 'invalid assistant id' }, { status: 400 });
	}

	const db = await env.DB;

	// query the db for the assistant
	const assistant = await db
		.prepare('SELECT * FROM assistants WHERE id = ?')
		.bind(data.assistant_id)
		.first();

	if (!assistant) {
		return Response.json({ error: 'assistant not found' }, { status: 404 });
	}

	const model = data?.model || assistant.model;
	const instructions = data?.instructions || assistant.instructions;
	const tools = data?.tools || assistant.tools || '[]';

	let metadata;
	try {
		metadata = data?.metadata ? JSON.stringify(data?.metadata) : '{}';
	} catch (e) {
		console.log('metadata is not valid json, continuing...');
	}

	// get all messages associated with the thread
	const messages = await db
		.prepare('SELECT * FROM messages WHERE thread_id = ? ORDER BY id DESC')
		.bind(thread_id)
		.all();

	const thread = await db.prepare('SELECT * FROM threads WHERE id = ?').bind(thread_id).first();

	// get all file ids from either the thread or the messages
	// but truncate to the first 10
	const fileIds = messages.results
		.map(message => {
			try {
				return message.file_ids ? JSON.parse(message?.file_ids) : [];
			} catch (e) {
				console.log(`unable to parse file_ids for message ${message.id}`);
				return [];
			}
		})
		.flat();

	if (thread?.file_ids) {
		try {
			const threadFileIds = JSON.parse(thread.file_ids);
			fileIds.push(...threadFileIds);
		} catch (e) {
			console.log(`unable to parse file_ids for thread ${thread.id}`);
		}
	}

	// create the run
	const resp = await db
		.prepare(INSERT_RUN)
		.bind(assistant.id, thread_id, model, instructions, tools, JSON.stringify(fileIds), metadata)
		.run();

	if (resp.success) {
		// put the run in the queue
		const lastRow = await db.prepare(GET_LATEST_RUN).first();
		await env.QUEUE.send({
			run_id: lastRow.id,
		});
		return Response.json(dbRunToResponse(lastRow), { status: 201 });
	}

	return Response.json({ error: 'unable to insert run' }, { status: 500 });
};

export const getRunHandler = async (request, env) => {
	const { params } = request;
	const { thread_id, id } = params;
	const db = await env.DB;
	const resp = await db
		.prepare('SELECT * FROM runs WHERE id = ? AND thread_id = ?')
		.bind(id, thread_id)
		.first();

	if (resp) {
		return Response.json(dbRunToResponse(resp));
	}

	return Response.json({ error: 'run not found' }, { status: 404 });
};

export const listRunsHandler = async (request, env) => {
	const { params } = request;
	const { thread_id } = params;
	const db = await env.DB;
	const resp = await db
		.prepare('SELECT * FROM runs WHERE thread_id = ? ORDER BY id DESC')
		.bind(thread_id)
		.all();
	if (resp.success) {
		return Response.json(dbRunListToResponse(resp.results));
	}

	return Response.json({ error: 'unable to get runs' }, { status: 500 });
};

export const modifyRunHandler = async (request, env) => {
	// modify the metadata of the run
	const { params } = request;
	const { thread_id, id } = params;
	const db = await env.DB;
	const data = await request.json();
	const { metadata } = data;
	const metadata_str = JSON.stringify(metadata);
	const resp = await db
		.prepare('UPDATE runs SET metadata = ? WHERE id = ? AND thread_id = ?')
		.bind(metadata_str, id, thread_id)
		.run();

	if (resp.success) {
		const updated = await db
			.prepare('SELECT * FROM runs WHERE id = ? AND thread_id = ?')
			.bind(id, thread_id)
			.first();
		return Response.json(dbRunToResponse(updated));
	}

	return Response.json({ error: 'unable to update run' }, { status: 500 });
};
