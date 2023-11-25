# <h1 align="center">⚡️ OpenAI for Workers AI 🧠</h1>

### <p align="center">Simple, quick, and dirty implementation of OpenAI's API on Cloudflare's new Workers AI platform.</p>

## Why?

I think that in the near future, smaller, cheaper LLMs will be a legitimate competitor to OpenAI's GPT-3.5 and GPT-4 APIs. Most developers will not want to rewrite their entire codebase in order to use these up-and-coming models. I also think that Cloudflare Workers are a neat way to host AI and APIs, so I implemented the OpenAI API on Workers AI. This allows developers to use the OpenAI SDKs with the new LLMs without having to rewrite all of their code. This code, as is Workers AI, is not production ready but will be semi-regularly updated with new features as they roll out to Workers AI.

## Compatibility

Here are all the APIs I would like to implement or have implemented that are currently possible with the Workers AI platform.

* [x] Completions
* [x] Chat Completions
* [x] Audio Transcription
* [x] Embeddings
* [x] Audio Translation
  + Uses Whisper to transcribe, Llama 2 to identify the language, and m2m-100 to translate.
* [x] Images
  + [x] Image Generation
* [ ] Files
  + Needed for Assistants.
  + Use a D1 database for metadata, R2 for the actual file.
* [ ] Assistants
  + [ ] Assistants
    - Store assistants in a D1 database.
  + [ ] Threads
    - Use a D1 database to store threads. Relate them to an assistant.
  + [ ] Messages
    - Store messages in a D1 database. Relate them to a thread.
  + [ ] Runs
    - Use a queue to handle runs. Get messages from a D1 database, return results to database.

Here are the APIs that I would like to implement but are not currently possible with the Workers AI platform.

* [ ] Fine Tuning
* [ ] Images
  + [ ] Image Editing
  + [ ] Image Variants

Here are the APIs that could probably be implemented but I don't have the need to implement them.

* [ ] Moderation
  + Use Llama 2 to classify. May be difficult to prompt engineer.

## Deploying

First, clone the repository.

```bash
git clone https://github.com/chand1012/openai-cf-workers-ai
cd openai-cf-workers-ai
```

Then, install the dependencies and deploy to your account. If you are not logged in to wrangler, you will be prompted to log in.

```bash
yarn
yarn init-prod # only needs run the first time!!!
yarn deploy
```

As of 07/10/2023 testing locally does not work. However, you can test remotely using the following command:

```bash
yarn init-dev # only needs run the first time!!!
yarn dev
```

This will start a local server that will proxy requests to your deployed API. You can then use the API as you normally would, but with the local server's URL instead of the deployed URL.

## Usage

See the [OpenAI API docs](https://platform.openai.com/docs/api-reference/introduction) for more information on the API. Here's an example from the OpenAI docs:

```bash
curl https://openai-cf.yourusername.workers.dev/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "@cf/meta/llama-2-7b-chat-int8",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Hello!"
      }
    ]
  }'
# {"id":"ccfbc7fc-d871-4139-90dc-e6c33fc7f275","model":"@cf/meta/llama-2-7b-chat-int8","created":1696701894,"object":"chat.completion","choices":[{"index":0,"message":{"role":"assistant","content":"Hello there! *adjusts glasses* It's a pleasure to meet you. Is there something I can help you with or would you like to chat? I'm here to assist you in any way I can. 😊"},"finish_reason":"stop"}],"usage":{"prompt_tokens":0,"completion_tokens":0,"total_tokens":0}}
```

If you want to use this with the OpenAI Python or JavaScript SDK, you can use the following code, replace the base URL with your own. For example:

```python
import openai
openai.api_base = 'https://openai-cf.yourusername.workers.dev/'

# rest of code
```

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
    baseURL: 'https://openai-cf.yourusername.workers.dev/',
    ...
});

// rest of code
```

## Compromises

There were a few compromises I had to make in order to create the API.

The first is that the API does not count tokens, and will always return zero for the `usage` attribute in the return object. It will always return it for compatibility reasons, but until tokenization is added for the respective model, we cannot count tokens. Each model tokenizes differently, so we can't use tiktoken. It may be possible to tokenize using HuggingFace transformers, but that may take too long and not allow free users to deploy the API. More investigation is needed.

Stop tokens are also non-functional. There is no way to specify a stop reason or token with the current API. It will be ignored.

Finally, for simplicity's sake, there is no API key functionality. Because the current rate limits (as of 07/10/2023) are rather strict for Cloudflare AI anyways, I decided not to count or limit requests. In the future when we can count tokens this may change, or we may limit per request instead of per token.

## License

Licensed under the [MIT License](LICENSE).
