'use client';

import {
  Bot,
  Loader2,
  RefreshCw,
  Search,
  SendIcon,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type ModelsResponse = {
  models?: string[];
  fallback?: boolean;
};

const DEFAULT_MODEL = 'qwen/qwen3-32b';

function modelLabel(modelId: string): string {
  const [, model] = modelId.split('/');
  return model?.replace(/[-_]/g, ' ') ?? modelId;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [models, setModels] = useState<string[]>([]);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);
  const [usingFallbackModels, setUsingFallbackModels] = useState(false);
  const [modelQuery, setModelQuery] = useState('');
  const [temperature, setTemperature] = useState(0.8);
  const [maxTokens, setMaxTokens] = useState(1200);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const savedModel = window.localStorage.getItem('hc:selectedModel');
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('hc:selectedModel', selectedModel);
  }, [selectedModel]);

  const filteredModels = useMemo(() => {
    const query = modelQuery.trim().toLowerCase();
    if (!query) return models;
    return models.filter((model) => model.toLowerCase().includes(query));
  }, [models, modelQuery]);

  const loadModels = useCallback(async () => {
    setIsModelsLoading(true);
    setModelFetchError(null);

    try {
      const response = await fetch('/api/models', { method: 'GET' });
      if (!response.ok) {
        throw new Error('Could not fetch models.');
      }

      const payload = (await response.json()) as ModelsResponse;
      const incomingModels = payload.models ?? [];
      setUsingFallbackModels(Boolean(payload.fallback));
      setModels(incomingModels);

      if (incomingModels.length > 0) {
        setSelectedModel((current) => (incomingModels.includes(current) ? current : incomingModels[0]));
      }
    } catch {
      setModelFetchError('Unable to load models right now. You can still chat with the default model.');
      setModels([DEFAULT_MODEL]);
      setUsingFallbackModels(true);
    } finally {
      setIsModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const clearChat = () => {
    if (confirm('Are you sure you want to clear the conversation?')) {
      setMessages([]);
      setChatError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setChatError(null);
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const botMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: botMessageId, role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          model: selectedModel,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Network response was not ok');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffered = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffered += decoder.decode(value, { stream: true });
          const lines = buffered.split('\n');
          buffered = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;

            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]' || payload.length === 0) {
              continue;
            }

            try {
              const data = JSON.parse(payload);
              const text = data.choices?.[0]?.delta?.content || '';

              if (!text) continue;

              setMessages((prev) => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage.id !== botMessageId) return prev;
                return [
                  ...prev.slice(0, -1),
                  { ...lastMessage, content: lastMessage.content + text },
                ];
              });
            } catch {
              try {
                const nestedPayload = JSON.parse(payload.replace(/^data:\s*/, ''));
                const nestedText = nestedPayload.choices?.[0]?.delta?.content || '';
                if (!nestedText) continue;

                setMessages((prev) => {
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage.id !== botMessageId) return prev;
                  return [
                    ...prev.slice(0, -1),
                    { ...lastMessage, content: lastMessage.content + nestedText },
                  ];
                });
              } catch {
                // Ignore malformed stream fragments.
              }
            }
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error while sending message.';
      setChatError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(80rem_50rem_at_10%_-10%,#fef2f2_0%,transparent_55%),radial-gradient(70rem_45rem_at_100%_0%,#e0f2fe_0%,transparent_45%),#f8fafc] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-lg shadow-rose-200/70">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Hack Club AI</p>
              <h1 className="text-lg font-semibold leading-tight md:text-2xl">Model Playground</h1>
            </div>
          </div>

          <button
            onClick={clearChat}
            disabled={messages.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:grid-cols-12 md:px-8">
        <section className="order-2 flex min-h-[68vh] flex-col rounded-3xl border border-white/60 bg-white/90 shadow-xl shadow-slate-200/50 md:order-1 md:col-span-8">
          <div className="border-b border-slate-200/80 px-5 py-4">
            <p className="text-sm text-slate-600">
              Active model:
              <span className="ml-2 inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                {selectedModel}
              </span>
            </p>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6 md:px-6">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 p-4">
                  <Sparkles className="h-10 w-10 text-rose-500" />
                </div>
                <p className="text-2xl font-semibold text-slate-900">Try a prompt to start</p>
                <p className="mt-2 max-w-md text-sm text-slate-500">
                  Compare model behavior in one place. Search models on the right, tweak generation settings, and chat.
                </p>
              </div>
            )}

            {messages.map((m) => {
              const isUser = m.role === 'user';

              return (
                <article
                  key={m.id}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm md:max-w-[80%] ${
                      isUser
                        ? 'border border-sky-200 bg-sky-50 text-sky-950'
                        : 'border border-slate-200 bg-white text-slate-900'
                    }`}
                  >
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {isUser ? 'You' : 'Hackbot'}
                    </p>
                    <div className="prose prose-sm max-w-none prose-pre:border prose-pre:border-slate-700 prose-pre:bg-slate-900 prose-pre:text-slate-100">
                      {isUser ? (
                        <p className="m-0 whitespace-pre-wrap">{m.content}</p>
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.content || (isLoading ? 'Thinking...' : '')}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>

                  {isUser && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white shadow">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </article>
              );
            })}

            {chatError && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {chatError}
              </p>
            )}

            <div ref={messagesEndRef} className="h-1" />
          </div>

          <footer className="border-t border-slate-200/80 p-4">
            <form
              onSubmit={handleSubmit}
              className="flex items-end gap-3 rounded-2xl border border-slate-300 bg-white p-2 focus-within:border-rose-400 focus-within:ring-4 focus-within:ring-rose-100"
            >
              <textarea
                className="max-h-36 min-h-[52px] flex-1 resize-y border-none bg-transparent px-3 py-2 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
                value={input}
                placeholder="Ask anything..."
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500 text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendIcon className="h-5 w-5" />}
              </button>
            </form>
            <p className="mt-3 text-center text-xs text-slate-500">Responses may contain mistakes. Verify important output.</p>
          </footer>
        </section>

        <aside className="order-1 rounded-3xl border border-white/60 bg-white/90 p-4 shadow-xl shadow-slate-200/50 md:order-2 md:col-span-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">Models</h2>
            <button
              onClick={loadModels}
              disabled={isModelsLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-500 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isModelsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <label className="mb-3 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={modelQuery}
              onChange={(e) => setModelQuery(e.target.value)}
              placeholder="Search models"
              className="w-full border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </label>

          <div className="h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
            {isModelsLoading && models.length === 0 && (
              <p className="px-2 py-3 text-sm text-slate-500">Loading models...</p>
            )}

            {filteredModels.map((model) => (
              <button
                key={model}
                type="button"
                onClick={() => setSelectedModel(model)}
                className={`w-full rounded-lg px-3 py-2 text-left transition ${
                  selectedModel === model
                    ? 'bg-slate-900 text-white shadow'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <p className="text-sm font-medium">{modelLabel(model)}</p>
                <p className={`text-xs ${selectedModel === model ? 'text-slate-300' : 'text-slate-500'}`}>{model}</p>
              </button>
            ))}

            {!isModelsLoading && filteredModels.length === 0 && (
              <p className="px-2 py-3 text-sm text-slate-500">No models match that search.</p>
            )}
          </div>

          {(modelFetchError || usingFallbackModels) && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {modelFetchError ?? 'Using fallback model list because live model discovery was unavailable.'}
            </p>
          )}

          <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <SlidersHorizontal className="h-4 w-4" />
              Generation
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Temperature: {temperature.toFixed(1)}</span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Max Tokens</span>
              <input
                type="number"
                min={64}
                max={8192}
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value) || 1200)}
                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-500"
              />
            </label>
          </div>
        </aside>
      </main>
    </div>
  );
}
