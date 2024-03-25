import { Router, createCors, error, json } from 'itty-router';

// import the routes
import { chatHandler } from './routes/chat';
import { completionHandler } from './routes/completion';
import { embeddingsHandler } from './routes/embeddings';
import { transcriptionHandler, translationHandler } from './routes/audio';
import { getImageHandler, imageGenerationHandler } from './routes/image';

const { preflight, corsify } = createCors();

// Create a new router
const router = Router();

// CORS, see https://itty.dev/itty-router/cors
router
	// embed preflight upstream to handle all OPTIONS requests
	.all('*', preflight);

// chat completion
router.post('/chat/completions', chatHandler);

// legacy completions
router.post('/completions', completionHandler);

// embeddings
router.post('/embeddings', embeddingsHandler);

// audio transcriptions
router.post('/audio/transcriptions', transcriptionHandler);

// audio translations
router.post('/audio/translations', translationHandler);

router.post('/images/generations', imageGenerationHandler);

router.get('/images/get/:name', getImageHandler);

// 404 for everything else
router.all('*', () => new Response('404, not found!', { status: 404 }));

export default {
	fetch: request =>
		router
			.handle(request)

			// catch any errors
			.catch(error)

			// add CORS headers to all requests,
			// including errors
			.then(corsify),
};
