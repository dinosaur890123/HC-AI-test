// Native fetch implementation to Hack Club AI API
export async function POST(req: Request) {
  const reqBody = await req.json();
  const { messages } = reqBody;

  const apiKey = process.env.HACK_CLUB_AI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing API key' }), { status: 500 });
  }

  // We are calling the Hack Club proxy API directly
  const response = await fetch('https://ai.hackclub.com/proxy/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: reqBody.model || 'qwen/qwen3-32b',
      messages: [
        { role: 'system', content: 'You are a lively, helpful AI assistant built for Hack Club. You use short, modern responses. ALWAYS render code snippets in Markdown.' },
        ...messages
      ],
      stream: true, // Tell the API to stream the response
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return new Response(err, { status: response.status });
  }

  // Return the streaming response directly to the client
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
