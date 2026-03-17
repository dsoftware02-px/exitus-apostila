import React from 'react';
import { Book, Session, Chapter } from '../types';
import { CheckCircle2, Circle, Loader2, ChevronDown, Printer } from 'lucide-react';

interface BookMapProps {
  book: Book;
  activeSessionId: string | null;
  onSelectSession: (chapterId: string, session: Session) => void;
  onPreview: () => void;
}

export function BookMap({ book, activeSessionId, onSelectSession, onPreview }: BookMapProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VALIDATED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'GENERATING':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Circle className="w-4 h-4 text-zinc-300" />;
    }
  };

  return (
    <div className="h-full bg-zinc-50 border-r border-zinc-200 flex flex-col">
      <div className="p-4 border-b border-zinc-200 bg-white">
        <h2 className="font-semibold text-zinc-900">Mapa do Livro</h2>
        <p className="text-xs text-zinc-500 mt-1">{book.metadata.discipline.subject} • {book.metadata.discipline.grade}</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {book.parts.map((part) => (
          <div key={part.id}>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
              {part.title}
            </h3>
            <div className="space-y-4">
              {part.chapters.map((chapter) => (
                <div key={chapter.id} className="space-y-1">
                  <div className="flex items-center text-sm font-medium text-zinc-700 mb-2">
                    <ChevronDown className="w-4 h-4 mr-1 text-zinc-400" />
                    <span className="truncate">{chapter.title}</span>
                  </div>
                  <div className="ml-2 pl-3 border-l border-zinc-200 space-y-1">
                    {chapter.sessions.map((session) => {
                      const isActive = session.id === activeSessionId;
                      return (
                        <button
                          key={session.id}
                          onClick={() => onSelectSession(chapter.id, session)}
                          className={`w-full flex items-center text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                            isActive 
                              ? 'bg-zinc-900 text-white' 
                              : 'text-zinc-600 hover:bg-zinc-200/50'
                          }`}
                        >
                          <span className="mr-2 shrink-0">
                            {isActive && session.status === 'PENDING' ? (
                              <Circle className="w-4 h-4 text-zinc-400" />
                            ) : (
                              getStatusIcon(session.status)
                            )}
                          </span>
                          <span className="truncate">{session.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-zinc-200 bg-white">
        <button
          onClick={onPreview}
          className="w-full flex items-center justify-center bg-zinc-100 text-zinc-900 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors"
        >
          <Printer className="w-4 h-4 mr-2" />
          Visualizar Impressão
        </button>
      </div>
    </div>
  );
}
