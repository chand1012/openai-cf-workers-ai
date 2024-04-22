import { json } from 'itty-router';

const getModels = async env => {
	const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/models/search?hide_experimental=false&search=Text+Generation`;
	const headers = {
		'Content-Type': 'application/json',
		'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
	};

	const response = await fetch(url, { headers });

	if (!response.ok) {
		throw new Error(`Failed to fetch models: ${response.statusText}`);
	}

	const data = await response.json();

	return data.result;
};

export const modelsHandler = async (request, env) => {
	const models = await getModels(env);

	const modelList = models.map(model => ({
		id: model.name,
		object: 'model',
		created: Math.round(Date.now()),
		owned_by: model.source === 1 ? 'cloudflare' : 'huggingface',
	}));

	return json({
		object: 'list',
		data: modelList,
	});
};
