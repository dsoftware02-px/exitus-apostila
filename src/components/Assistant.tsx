import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, BookMetadata } from '../types';
import { chatWithAssistant } from '../lib/gemini';
import { Send, Bot, User, Loader2, Quote } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AssistantProps {
  contextText: string | null;
  metadata: BookMetadata;
  onClearContext: () => void;
}

export function Assistant({ contextText, metadata, onClearContext }: AssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou seu Assistente Cognitivo. Selecione um trecho do texto no editor para discutirmos, ou faça uma pergunta diretamente.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() && !contextText) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      context: contextText || undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithAssistant([...messages, userMsg], metadata, contextText || undefined);
      
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      if (contextText) onClearContext();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full bg-zinc-50 border-l border-zinc-200 flex flex-col">
      <div className="p-4 border-b border-zinc-200 bg-white flex items-center">
        <Bot className="w-5 h-5 text-blue-600 mr-2" />
        <h2 className="font-semibold text-zinc-900">Assistente Cognitivo</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div 
              className={`max-w-[90%] rounded-2xl p-3 text-sm ${
                msg.role === 'user' 
                  ? 'bg-zinc-900 text-white rounded-tr-sm' 
                  : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-sm shadow-sm'
              }`}
            >
              {msg.context && (
                <div className="mb-2 p-2 bg-black/20 rounded border-l-2 border-blue-400 text-xs italic opacity-90">
                  <Quote className="w-3 h-3 inline mr-1" />
                  {msg.context.length > 100 ? msg.context.substring(0, 100) + '...' : msg.context}
                </div>
              )}
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start">
            <div className="bg-white border border-zinc-200 rounded-2xl rounded-tl-sm p-3 shadow-sm">
              <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-zinc-200">
        {contextText && (
          <div className="mb-2 p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 flex justify-between items-start">
            <div className="flex-1 truncate mr-2">
              <span className="font-semibold">Contexto:</span> {contextText}
            </div>
            <button onClick={onClearContext} className="text-blue-400 hover:text-blue-600">✕</button>
          </div>
        )}
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={contextText ? "Pergunte sobre o trecho selecionado..." : "Digite sua mensagem..."}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-4 pr-12 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !contextText) || isLoading}
            className="absolute right-2 bottom-2 w-8 h-8 bg-zinc-900 text-white rounded-lg flex items-center justify-center disabled:opacity-50 hover:bg-zinc-800 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
