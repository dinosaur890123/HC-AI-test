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
                const data = JSON.parse(line.slice(6));
                const text = data.choices?.[0]?.delta?.content || '';
                
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
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="p-4 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between shadow-sm">
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
            className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block p-2 outline-none shadow-sm cursor-pointer font-medium"
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
              className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
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
            <div className="flex flex-col items-center justify-center text-center h-[50vh] text-slate-500">
              <div className="bg-red-50 p-4 rounded-full mb-4 shadow-sm border border-red-100">
                <Sparkles className="w-10 h-10 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-slate-800">Welcome to Hack Club AI</p>
              <p className="mt-2 text-slate-500 max-w-sm">Ask a question, generate some code, or have a chat.</p>
            </div>
          )}
          
          {messages.map((m) => (
            <div 
              key={m.id} 
              className={`lex gap-4 p-5 rounded-2xl max-w-[85%] shadow-sm `}
            >
              <div className="mt-1 shrink-0">
                {m.role === 'user' ? (
                  <div className="w-8 h-8 rounded-full bg-blue-700 border border-blue-500 flex items-center justify-center shadow-sm">
                    <User className="w-5 h-5 text-white flex-shrink-0" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-sm">
                    <Bot className="w-5 h-5 text-white flex-shrink-0" />
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className={`ont-semibold mb-1 text-sm `}>
                  {m.role === 'user' ? 'You' : 'Hackbot'}
                </p>
                <div className={`prose prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:border prose-pre:border-slate-700 w-full max-w-none text-[15px] `}>
                  {m.role === 'user' ? (
                    <p className="whitespace-pre-wrap m-0">{m.content}</p>
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

      <footer className="p-4 bg-slate-50 border-t border-slate-200 sticky bottom-0 z-10">
        <div className="max-w-3xl mx-auto">
          <form 
            onSubmit={handleSubmit}
            className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-300 focus-within:border-red-400 focus-within:ring-4 focus-within:ring-red-100/50 transition-all shadow-sm"
          >
            <input
              className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 px-4 py-3 text-[15px]"
              value={input}
              placeholder="Ask me anything..."
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-red-500 rounded-xl transition-all text-white flex items-center justify-center shadow-sm"
            >
              <SendIcon className="w-5 h-5 ml-1" />
            </button>
          </form>
          <p className="text-center text-xs text-slate-400 mt-4 font-medium">
            AI can make mistakes. Powered by Hack Club API.
          </p>
        </div>
      </footer>
    </div>
  );
}
