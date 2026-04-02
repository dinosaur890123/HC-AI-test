const MODEL_ENDPOINT = 'https://ai.hackclub.com/proxy/v1/models';

const FALLBACK_MODELS = [
  'qwen/qwen3-32b',
  'google/gemini-3-flash-preview',
  'deepseek/deepseek-v3.2',
  'deepseek/deepseek-r1-0528',
  'moonshotai/kimi-k2.5',
  'openai/gpt-5-mini',
];

type UpstreamModel = {
  id?: string;
};

type UpstreamModelResponse = {
  data?: UpstreamModel[];
};

function normalizeModelList(payload: UpstreamModelResponse): string[] {
  const ids = (payload.data ?? [])
    .map((item) => item.id?.trim())
    .filter((id): id is string => Boolean(id));

  if (ids.length === 0) {
    return FALLBACK_MODELS;
  }

  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

export async function GET() {
  try {
    const response = await fetch(MODEL_ENDPOINT, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return Response.json({ models: FALLBACK_MODELS, fallback: true }, { status: 200 });
    }

    const payload = (await response.json()) as UpstreamModelResponse;
    return Response.json({ models: normalizeModelList(payload), fallback: false });
  } catch {
    return Response.json({ models: FALLBACK_MODELS, fallback: true }, { status: 200 });
  }
}
