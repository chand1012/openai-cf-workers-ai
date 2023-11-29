import { Router } from 'itty-router';

// import the routes
import { chatHandler } from './routes/chat';
import { completionHandler } from './routes/completion';
import { embeddingsHandler } from './routes/embeddings';
import { transcriptionHandler, translationHandler } from './routes/audio';
import { getImageHandler, imageGenerationHandler } from './routes/image';
import {
	getThreadHandler,
	insertThreadHandler,
	modifyThreadHandler,
	deleteThreadHandler,
} from './routes/thread';
import {
	createMessage,
	getMessagesHandler,
	listMessagesHandler,
	updateMessage,
} from './routes/messages';
import {
	createAssistantHandler,
	deleteAssistantHandler,
	getAssistantHandler,
	listAssistantsHandler,
	modifyAssistantHandler,
} from './routes/assistants';

// Create a new router
const router = Router();

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

router.post('/threads', insertThreadHandler);

router.get('/threads/:id', getThreadHandler);

router.post('/threads/:id', modifyThreadHandler);

router.delete('/threads/:id', deleteThreadHandler);

router.get('/threads/:thread_id/messages', listMessagesHandler);

router.post('/threads/:thread_id/messages', createMessage);

router.get('/threads/:thread_id/messages/:id', getMessagesHandler);

router.post('/threads/:thread_id/messages/:id', updateMessage);

router.post('/assistants', createAssistantHandler);

router.get('/assistants', listAssistantsHandler);

router.get('/assistants/:id', getAssistantHandler);

router.post('/assistants/:id', modifyAssistantHandler);

router.delete('/assistants/:id', deleteAssistantHandler);

// 404 for everything else
router.all('*', () => new Response('404, not found!', { status: 404 }));

export default {
	fetch: router.handle,
};
