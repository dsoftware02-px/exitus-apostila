import React from 'react';
import { Book } from '../types';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Printer } from 'lucide-react';

interface BookPreviewProps {
  book: Book;
  onBack: () => void;
}

export function BookPreview({ book, onBack }: BookPreviewProps) {
  return (
    <div className="h-full overflow-y-auto bg-zinc-200 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b border-zinc-300 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-600" />
          </button>
          <div>
            <h1 className="font-semibold text-zinc-900">Visualização de Impressão</h1>
            <p className="text-xs text-zinc-500">{book.metadata.discipline.subject} • {book.metadata.discipline.grade}</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
        >
          <Printer className="w-4 h-4 mr-2" />
          Imprimir / PDF
        </button>
      </div>

      {/* Pages Container */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center space-y-8 print:p-0 print:space-y-0 print:block">
        
        {/* Capa */}
        <div className="w-[210mm] min-h-[297mm] bg-white shadow-xl flex flex-col items-center justify-center p-20 print:shadow-none print:w-full print:h-screen print:break-after-page">
          <h3 className="text-2xl font-medium text-zinc-500 mb-4 tracking-widest uppercase">{book.metadata.discipline.subject}</h3>
          <h1 className="text-6xl font-bold text-zinc-900 text-center mb-8">{book.metadata.discipline.grade}</h1>
          <div className="w-24 h-1 bg-zinc-900 mb-8"></div>
          <p className="text-xl text-zinc-600 text-center max-w-lg">
            Material Didático Focado em {book.metadata.course.rigorLevel}
          </p>
        </div>

        {/* Índice */}
        <div className="w-[210mm] min-h-[297mm] bg-white shadow-xl p-20 print:shadow-none print:w-full print:h-screen print:break-after-page">
          <h2 className="text-4xl font-bold text-zinc-900 mb-12 border-b-2 border-zinc-900 pb-4">Índice</h2>
          <div className="space-y-6">
            {book.parts.map((part, pIdx) => (
              <div key={part.id}>
                <h3 className="text-xl font-bold text-zinc-800 mb-4 uppercase tracking-wider">{book.metadata.style.structureLevel1} {pIdx + 1}: {part.title}</h3>
                <div className="space-y-3 pl-4">
                  {part.chapters.map((chapter, cIdx) => (
                    <div key={chapter.id}>
                      <div className="flex items-baseline justify-between">
                        <span className="font-medium text-zinc-700">{book.metadata.style.structureLevel2} {cIdx + 1}: {chapter.title}</span>
                        <span className="text-zinc-400 border-b border-dotted border-zinc-300 flex-1 mx-4"></span>
                      </div>
                      <div className="pl-4 mt-2 space-y-1">
                        {chapter.sessions.map((session, sIdx) => (
                          <div key={session.id} className="flex items-baseline justify-between text-sm">
                            <span className="text-zinc-600">{cIdx + 1}.{sIdx + 1} {session.title}</span>
                            <span className="text-zinc-300 border-b border-dotted border-zinc-200 flex-1 mx-4"></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        {book.parts.map((part, pIdx) => (
          <React.Fragment key={part.id}>
            {/* Divisor de Parte */}
            <div className="w-[210mm] min-h-[297mm] bg-zinc-900 shadow-xl flex flex-col items-center justify-center p-20 print:shadow-none print:w-full print:h-screen print:break-after-page">
              <span className="text-zinc-400 text-xl tracking-widest uppercase mb-4">{book.metadata.style.structureLevel1} {pIdx + 1}</span>
              <h1 className="text-5xl font-bold text-white text-center">{part.title}</h1>
            </div>

            {part.chapters.map((chapter, cIdx) => (
              <div key={chapter.id} className="w-[210mm] min-h-[297mm] bg-white shadow-xl p-20 print:shadow-none print:w-full print:min-h-screen print:break-after-page">
                <header className="mb-12 border-b-4 border-zinc-900 pb-6">
                  <span className="text-zinc-500 font-medium uppercase tracking-wider text-sm">{book.metadata.style.structureLevel2} {cIdx + 1}</span>
                  <h2 className="text-4xl font-bold text-zinc-900 mt-2">{chapter.title}</h2>
                  <p className="text-zinc-600 mt-4 italic">{chapter.objective}</p>
                </header>

                <div className="columns-2 gap-12 text-justify">
                  {chapter.sessions.map((session, sIdx) => (
                    <div key={session.id} className="mb-12 break-inside-avoid">
                      <h3 className="text-2xl font-bold text-zinc-800 mb-4 flex items-center">
                        <span className="bg-zinc-900 text-white w-8 h-8 flex items-center justify-center rounded-full text-sm mr-3 shrink-0">
                          {cIdx + 1}.{sIdx + 1}
                        </span>
                        {session.title}
                      </h3>
                      
                      {session.content ? (
                        <div className="prose prose-sm prose-zinc max-w-none prose-p:leading-relaxed prose-headings:font-semibold prose-img:rounded-xl prose-img:w-full">
                          <ReactMarkdown>{session.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="bg-zinc-50 border border-dashed border-zinc-300 rounded-lg p-6 text-center text-zinc-400 text-sm">
                          Conteúdo pendente para esta sessão.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
