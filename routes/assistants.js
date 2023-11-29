const INSERT_ASSISTANT =
	'INSERT INTO assistants (model, name, description, instructions, tools, file_ids, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)';
const GET_LATEST_ASSISTANT = 'SELECT * FROM assistants ORDER BY id DESC LIMIT 1';
const GET_QUERY = 'SELECT * FROM assistants WHERE id = ?';
// update query. Supports editing any field that insert supports
const UPDATE_QUERY =
	'UPDATE assistants SET model = ?, name = ?, description = ?, instructions = ?, tools = ?, file_ids = ?, metadata = ? WHERE id = ?';

const dbAssistantToResponse = assistant => {
	// convert the id to a string
	assistant.id = assistant.id.toString();
	// object type "assistant"
	assistant['object'] = 'assistant';
	// convert the created at date to epoch seconds
	assistant.created_at = Math.floor(Date.parse(assistant.created_at) / 1000);
	// parse the metadata
	assistant.metadata = assistant?.metadata ? JSON.parse(assistant.metadata) : {};
	// parse the tools array
	assistant.tools = assistant?.tools ? JSON.parse(assistant.tools) : [];
	// parse the file ids array
	assistant.file_ids = assistant?.file_ids ? JSON.parse(assistant.file_ids) : [];

	return assistant;
};

const dbAssistantListToResponse = assistants => {
	const data = assistants.map(dbAssistantToResponse);
	const object = 'list';
	const has_more = false;
	const first_id = data[data.length - 1]?.id || null;
	const last_id = data[0]?.id || null;

	return {
		object,
		data,
		has_more,
		first_id,
		last_id,
	};
};

const toDBAssistant = data => {
	const metadata = data?.metadata ? JSON.stringify(data.metadata) : '{}';
	// loop through each tool, if any are missing the type field or the type
	// field is not 'code_interpreter', 'retrieval', or 'function', throw an error
	const invalid_tools = data?.tools?.filter(tool => {
		return !tool.type || !['code_interpreter', 'retrieval', 'function'].includes(tool.type);
	});
	if (invalid_tools?.length > 0) {
		return Response.json({ error: 'invalid tools', invalid_tools }, { status: 400 });
	}
	const tools = data?.tools ? JSON.stringify(data.tools) : '[]';
	const file_ids = data?.file_ids ? JSON.stringify(data.file_ids) : '[]';

	return {
		model: data.model,
		name: data.name || null,
		description: data.description || null,
		instructions: data.instructions || null,
		tools,
		file_ids,
		metadata,
	};
};

export const createAssistantHandler = async (request, env) => {
	const db = await env.DB;
	const data = await request.json();

	// if model does not exist, is not a string, or is empty, throw an error
	if (!data?.model || typeof data?.model !== 'string' || data?.model.length === 0) {
		return Response.json({ error: 'invalid model' }, { status: 400 });
	}

	const dbAssistant = toDBAssistant(data);
	try {
		const resp = await db
			.prepare(INSERT_ASSISTANT)
			.bind(
				dbAssistant.model,
				dbAssistant.name,
				dbAssistant.description,
				dbAssistant.instructions,
				dbAssistant.tools,
				dbAssistant.file_ids,
				dbAssistant.metadata
			)
			.run();
		if (resp.success) {
			const inserted = await db.prepare(GET_LATEST_ASSISTANT).first();
			return Response.json(dbAssistantToResponse(inserted), { status: 201 });
		}
	} catch (e) {
		console.log(e);
	}

	return Response.json({ error: 'unable to insert assistant' }, { status: 500 });
};

export const getAssistantHandler = async (request, env) => {
	const { params } = request;
	const { id } = params;
	const db = await env.DB;
	try {
		const resp = await db.prepare(GET_QUERY).bind(id).first();
		return Response.json(dbAssistantToResponse(resp));
	} catch (e) {
		console.log(e);
	}
	return Response.json({ error: 'unable to get assistant' }, { status: 500 });
};

export const modifyAssistantHandler = async (request, env) => {
	const { params } = request;
	const { id } = params;
	const db = await env.DB;
	const data = await request.json();
	const dbAssistant = toDBAssistant(data);
	try {
		const resp = await db
			.prepare(UPDATE_QUERY)
			.bind(
				dbAssistant.model,
				dbAssistant.name,
				dbAssistant.description,
				dbAssistant.instructions,
				dbAssistant.tools,
				dbAssistant.file_ids,
				dbAssistant.metadata,
				id
			)
			.run();
		if (resp.success) {
			const updated = await db.prepare(GET_QUERY).bind(id).first();
			return Response.json(dbAssistantToResponse(updated));
		}
	} catch (e) {
		console.log(e);
	}

	return Response.json({ error: 'unable to update assistant' }, { status: 500 });
};

export const listAssistantsHandler = async (request, env) => {
	const db = await env.DB;
	try {
		const resp = await db.prepare('SELECT * FROM assistants ORDER BY id DESC').all();
		if (resp.success) {
			return Response.json(dbAssistantListToResponse(resp.results));
		}
	} catch (e) {}

	return Response.json({ error: 'unable to get assistants' }, { status: 500 });
};

export const deleteAssistantHandler = async (request, env) => {
	const { params } = request;
	const { id } = params;
	const db = await env.DB;
	try {
		const resp = await db.prepare('DELETE FROM assistants WHERE id = ?').bind(id).run();
		if (resp.success) {
			return Response.json({ deleted: true, object: 'assistant.deleted', id });
		}
	} catch (e) {
		console.log(e);
	}

	return Response.json({ error: 'unable to delete assistant' }, { status: 500 });
};
