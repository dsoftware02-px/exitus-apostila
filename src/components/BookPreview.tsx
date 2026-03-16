import React, { useEffect, useRef, useState } from 'react';
import { Book } from '../types';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Printer, RefreshCw } from 'lucide-react';
import { Previewer } from 'pagedjs';
import '../index.css';

interface BookPreviewProps {
  book: Book;
  onBack: () => void;
}

export function BookPreview({ book, onBack }: BookPreviewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const pagedjsContainerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pagedReady, setPagedReady] = useState(false);

  useEffect(() => {
    generatePdfPreview();
    
    // Clean up
    return () => {
      if (pagedjsContainerRef.current) {
        pagedjsContainerRef.current.innerHTML = '';
      }
    };
  }, []);

  const generatePdfPreview = async () => {
    if (!contentRef.current || !pagedjsContainerRef.current) return;
    
    setIsGenerating(true);
    setPagedReady(false);
    
    try {
      // Clear previous preview
      pagedjsContainerRef.current.innerHTML = '';
      
      const previewer = new Previewer();
      
      // Inject required CSS for PagedJS into head just for this preview
      const style = document.createElement('style');
      style.id = 'pagedjs-styles';
      style.textContent = `
        @media print {
          @page {
            size: A4;
            margin: 2cm;
            
            @bottom-center {
              content: counter(page);
              font-size: 10pt;
              color: #666;
            }
          }
          
          /* Force page break after cover and TOC */
          .page-break-after {
            break-after: page;
          }
          
          /* Prevent breaks inside sections if possible */
          .break-inside-avoid {
            break-inside: avoid;
          }
        }
        
        /* PagedJS specific screen styles to show pages nicely */
        .pagedjs_pages {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
          padding: 2rem 0;
          background-color: #e4e4e7; /* bg-zinc-200 */
        }
        
        .pagedjs_page {
          background: white;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          margin-bottom: 2rem;
        }
      `;
      
      if (!document.getElementById('pagedjs-styles')) {
        document.head.appendChild(style);
      }
      
      // Render PagedJS
      await previewer.preview(contentRef.current, [], pagedjsContainerRef.current);
      setPagedReady(true);
    } catch (error) {
      console.error('Error generating PagedJS preview:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="h-full overflow-y-auto bg-zinc-200 flex flex-col relative">
      {/* Top Bar */}
      <div className="bg-white border-b border-zinc-300 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm print:hidden">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-600" />
          </button>
          <div>
            <h1 className="font-semibold text-zinc-900">Visualização de Impressão (Paged.js)</h1>
            <p className="text-xs text-zinc-500">{book.metadata.discipline.subject} • {book.metadata.discipline.grade}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={generatePdfPreview}
            disabled={isGenerating}
            className="flex items-center bg-white border border-zinc-300 text-zinc-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={handlePrint}
            disabled={!pagedReady}
            className="flex items-center bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {isGenerating && (
        <div className="absolute inset-0 bg-zinc-200/80 backdrop-blur-sm z-40 flex items-center justify-center print:hidden">
          <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center">
            <RefreshCw className="w-8 h-8 text-zinc-900 animate-spin mb-4" />
            <p className="font-medium text-zinc-900">Paginando o livro...</p>
            <p className="text-sm text-zinc-500 mt-1">Isso pode levar alguns segundos dependendo do tamanho.</p>
          </div>
        </div>
      )}

      {/* Container for PagedJS output */}
      <div 
        ref={pagedjsContainerRef} 
        className="flex-1 overflow-y-auto w-full"
      ></div>

      {/* Hidden Source Content for PagedJS */}
      <div style={{ display: 'none' }}>
        <div ref={contentRef} className="book-source-content">
          
          {/* Capa */}
          <div className="page-break-after" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '10%' }}>
            <h3 style={{ fontSize: '24pt', color: '#71717a', marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {book.metadata.discipline.subject}
            </h3>
            <h1 style={{ fontSize: '48pt', fontWeight: 'bold', color: '#18181b', marginBottom: '4rem' }}>
              {book.metadata.discipline.grade}
            </h1>
            <div style={{ width: '100px', height: '4px', backgroundColor: '#18181b', margin: '0 auto 4rem auto' }}></div>
            <p style={{ fontSize: '18pt', color: '#52525b', maxWidth: '80%' }}>
              Material Didático Focado em {book.metadata.course.rigorLevel}
            </p>
          </div>

          {/* Índice */}
          <div className="page-break-after">
            <h2 style={{ fontSize: '32pt', fontWeight: 'bold', borderBottom: '2px solid #18181b', paddingBottom: '1rem', marginBottom: '3rem' }}>
              Índice
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {book.parts.map((part, pIdx) => (
                <div key={part.id}>
                  <h3 style={{ fontSize: '18pt', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '1rem' }}>
                    {book.metadata.style.structureLevel1} {pIdx + 1}: {part.title}
                  </h3>
                  <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {part.chapters.map((chapter, cIdx) => (
                      <div key={chapter.id}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', fontWeight: '500' }}>
                          <span>{book.metadata.style.structureLevel2} {cIdx + 1}: {chapter.title}</span>
                          <span style={{ borderBottom: '1px dotted #d4d4d8', flex: 1, margin: '0 1rem' }}></span>
                        </div>
                        <div style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {chapter.sessions.map((session, sIdx) => (
                            <div key={session.id} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', fontSize: '11pt', color: '#52525b' }}>
                              <span>{cIdx + 1}.{sIdx + 1} {session.title}</span>
                              <span style={{ borderBottom: '1px dotted #e4e4e7', flex: 1, margin: '0 1rem' }}></span>
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
              <div className="page-break-after" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#18181b', color: 'white', padding: '10%', textAlign: 'center' }}>
                <span style={{ color: '#a1a1aa', fontSize: '16pt', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>
                  {book.metadata.style.structureLevel1} {pIdx + 1}
                </span>
                <h1 style={{ fontSize: '40pt', fontWeight: 'bold' }}>{part.title}</h1>
              </div>

              {part.chapters.map((chapter, cIdx) => (
                <div key={chapter.id} className="page-break-after">
                  <header style={{ marginBottom: '3rem', borderBottom: '4px solid #18181b', paddingBottom: '1.5rem' }}>
                    <span style={{ color: '#71717a', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '12pt' }}>
                      {book.metadata.style.structureLevel2} {cIdx + 1}
                    </span>
                    <h2 style={{ fontSize: '32pt', fontWeight: 'bold', marginTop: '0.5rem', color: '#18181b' }}>{chapter.title}</h2>
                    <p style={{ color: '#52525b', marginTop: '1rem', fontStyle: 'italic' }}>{chapter.objective}</p>
                  </header>

                  <div style={{ columnCount: 2, columnGap: '3rem', textAlign: 'justify' }}>
                    {chapter.sessions.map((session, sIdx) => (
                      <div key={session.id} className="break-inside-avoid" style={{ marginBottom: '3rem' }}>
                        <h3 style={{ fontSize: '18pt', fontWeight: 'bold', color: '#27272a', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
                          <span style={{ backgroundColor: '#18181b', color: 'white', width: '2rem', height: '2rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '12pt', marginRight: '0.75rem', flexShrink: 0 }}>
                            {cIdx + 1}.{sIdx + 1}
                          </span>
                          {session.title}
                        </h3>
                        
                        {session.content ? (
                          <div className="prose prose-sm prose-zinc max-w-none" style={{ fontSize: '11pt', lineHeight: 1.6 }}>
                            <ReactMarkdown>{session.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <div style={{ backgroundColor: '#fafafa', border: '1px dashed #d4d4d8', borderRadius: '0.5rem', padding: '1.5rem', textAlign: 'center', color: '#a1a1aa', fontSize: '10pt' }}>
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
    </div>
  );
}
