# Hack Club AI Chat Playground

A Next.js chat UI for the Hack Club AI API with:

- Live model discovery from Hack Club AI
- Searchable model selector
- Streaming responses
- Generation controls (temperature and max tokens)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local env file in the project root and add your key:

```bash
HACK_CLUB_AI_API_KEY=your_api_key_here
```

3. Start the dev server:

```bash
npm run dev
```

4. Open http://localhost:3000

## API behavior

- Chat requests are proxied through `src/app/api/chat/route.ts`
- Model list is loaded from `GET /proxy/v1/models` via `src/app/api/models/route.ts`
- If live model discovery fails, the UI falls back to a curated model list

## References

- Hack Club AI docs: https://docs.ai.hackclub.com/
- Chat completions: https://docs.ai.hackclub.com/api/chat-completions.html
- Get models: https://docs.ai.hackclub.com/api/get-models.html
