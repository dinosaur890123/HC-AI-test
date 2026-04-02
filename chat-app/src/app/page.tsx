'use client';

import { SendIcon, Bot, User, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('qwen/qwen3-32b');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const clearChat = () => {
    if (confirm('Are you sure you want to clear the conversation?')) {
      setMessages([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Create a placeholder for the bot's streaming response
    const botMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: botMessageId, role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, model: selectedModel }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                // Hack Club's OpenRouter compatible API sends JSON chunks
                const data = JSON.parse(line.slice(6));
                const text = data.choices?.[0]?.delta?.content || '';
                
                // Append text token to the last (assistant) message
                setMessages((prev) => {
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage.id !== botMessageId) return prev;
                  return [
                    ...prev.slice(0, -1),
                    { ...lastMessage, content: lastMessage.content + text }
                  ];
                });
              } catch (e) {
                // Ignore parse errors on partial chunks
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 font-sans">
      <header className="p-4 border-b border-gray-800 bg-gray-950/50 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-red-500" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
            Hack Club AI 
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-gray-900 border border-gray-800 text-gray-300 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block p-2"
          >
            <option value="qwen/qwen3-32b">Qwen3 32B (Default)</option>
            <option value="google/gemini-3-flash-preview">Gemini 3 Flash Preview</option>
            <option value="deepseek/deepseek-v3.2">DeepSeek V3.2</option>
            <option value="deepseek/deepseek-r1-0528">DeepSeek R1</option>
            <option value="moonshotai/kimi-k2.5">Kimi K2.5</option>
          </select>
          {messages.length > 0 && (
            <button 
              onClick={clearChat}
              className="text-gray-400 hover:text-red-400 transition-colors p-2"
              title="Clear Chat"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center h-[50vh] text-gray-500">
              <Sparkles className="w-12 h-12 mb-4 text-gray-700" />
              <p className="text-xl font-medium text-gray-400">Welcome to Hack Club AI</p>
              <p className="mt-2">Start a conversation by typing a message below.</p>
            </div>
          )}
          
          {messages.map((m) => (
            <div 
              key={m.id} 
              className={`flex gap-4 p-4 rounded-2xl max-w-[85%] ${
                m.role === 'user' 
                  ? 'ml-auto bg-gray-800 rounded-tr-sm' 
                  : 'mr-auto bg-gray-900 border border-gray-800 rounded-tl-sm'
              }`}
            >
              <div className="mt-1 shrink-0">
                {m.role === 'user' ? (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                    <User className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold mb-1 text-sm text-gray-400">
                  {m.role === 'user' ? 'You' : 'Hackbot'}
                </p>
                <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700 w-full max-w-none text-gray-200 text-[15px]">
                  {m.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content || (isLoading && m.role === 'assistant' ? '...' : '')}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </main>

      <footer className="p-4 bg-gray-950 sticky bottom-0 z-10">
        <div className="max-w-3xl mx-auto">
          <form 
            onSubmit={handleSubmit}
            className="flex items-center gap-2 bg-gray-900 p-2 rounded-2xl border border-gray-800 focus-within:border-gray-600 focus-within:ring-1 focus-within:ring-gray-600 transition-all shadow-xl"
          >
            <input
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 px-4 py-3 text-[15px]"
              value={input}
              placeholder="Ask me anything..."
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600 rounded-xl transition-colors text-white flex items-center justify-center shadow-lg"
            >
              <SendIcon className="w-5 h-5 ml-1" />
            </button>
          </form>
          <p className="text-center text-xs text-gray-600 mt-4">
            Standard POST requests. Powered by Hack Club API.
          </p>
        </div>
      </footer>
    </div>
  );
}
