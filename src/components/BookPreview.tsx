import React, { useEffect, useRef, useState } from 'react';
import { Book } from '../types';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';

interface BookPreviewProps {
  book: Book;
  onBack: () => void;
}

const BOOK_PAGED_CSS = `
@page {
  size: A4;
  margin: 20mm;
}

.pagedjs_page {
  background: white;
  box-shadow: 0 4px 24px rgba(0,0,0,0.12);
  margin-bottom: 32px;
  border-radius: 2px;
}

.pagedjs_pages {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0;
}

/* Capa */
.book-cover {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  text-align: center;
  break-after: page;
}

.book-cover h3 {
  font-size: 18pt;
  font-weight: 500;
  color: #71717a;
  margin-bottom: 16px;
  letter-spacing: 4px;
  text-transform: uppercase;
}

.book-cover h1 {
  font-size: 36pt;
  font-weight: 700;
  color: #18181b;
  margin-bottom: 24px;
}

.book-cover .divider {
  width: 80px;
  height: 4px;
  background: #18181b;
  margin: 0 auto 24px;
}

.book-cover p {
  font-size: 14pt;
  color: #52525b;
  max-width: 400px;
}

/* Índice */
.book-toc {
  break-after: page;
}

.book-toc h2 {
  font-size: 24pt;
  font-weight: 700;
  color: #18181b;
  margin-bottom: 32px;
  border-bottom: 2px solid #18181b;
  padding-bottom: 12px;
}

.toc-part {
  margin-bottom: 20px;
}

.toc-part h3 {
  font-size: 14pt;
  font-weight: 700;
  color: #27272a;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 12px;
}

.toc-chapter {
  margin-bottom: 8px;
  padding-left: 16px;
}

.toc-chapter-title {
  font-size: 12pt;
  font-weight: 500;
  color: #3f3f46;
}

.toc-session {
  padding-left: 32px;
  font-size: 10pt;
  color: #71717a;
  margin-bottom: 4px;
}

/* Divisor de Parte */
.part-divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  text-align: center;
  background: #18181b;
  color: white;
  margin: -20mm;
  padding: 20mm;
  break-after: page;
}

.part-divider span {
  font-size: 14pt;
  color: #a1a1aa;
  letter-spacing: 4px;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.part-divider h1 {
  font-size: 30pt;
  font-weight: 700;
  color: white;
}

/* Conteúdo do capítulo */
.chapter-block {
  break-after: page;
}

.chapter-header {
  margin-bottom: 32px;
  border-bottom: 4px solid #18181b;
  padding-bottom: 16px;
}

.chapter-header .label {
  font-size: 10pt;
  color: #71717a;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.chapter-header h2 {
  font-size: 24pt;
  font-weight: 700;
  color: #18181b;
  margin-top: 8px;
}

.chapter-header p {
  color: #52525b;
  font-style: italic;
  margin-top: 12px;
  font-size: 11pt;
}

.session-block {
  margin-bottom: 32px;
}

.session-block h3 {
  font-size: 16pt;
  font-weight: 700;
  color: #27272a;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.session-number {
  background: #18181b;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10pt;
  flex-shrink: 0;
}

.session-content {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 11pt;
  line-height: 1.7;
  color: #1a1a1a;
  text-align: justify;
}

.session-content img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 12px 0;
}

.session-content h1, .session-content h2, .session-content h3, .session-content h4 {
  font-weight: 600;
  margin: 16px 0 8px;
  color: #18181b;
}

.session-content p {
  margin-bottom: 8px;
}

.session-content ul, .session-content ol {
  padding-left: 24px;
  margin-bottom: 8px;
}

.session-content blockquote {
  border-left: 3px solid #d4d4d8;
  padding-left: 12px;
  color: #52525b;
  font-style: italic;
  margin: 12px 0;
}

.session-pending {
  background: #fafafa;
  border: 1px dashed #d4d4d8;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  color: #a1a1aa;
  font-size: 10pt;
}

@media print {
  .pagedjs_page {
    box-shadow: none !important;
    margin-bottom: 0 !important;
  }
}
`;

export function BookPreview({ book, onBack }: BookPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    renderBook();
  }, [book]);

  const renderBook = async () => {
    if (!containerRef.current) return;
    setIsRendering(true);

    try {
      const { Previewer } = await import('pagedjs');

      // Montar o HTML completo do livro
      let bookHtml = '';

      // Capa
      bookHtml += `
        <div class="book-cover">
          <h3>${book.metadata.discipline.subject}</h3>
          <h1>${book.metadata.discipline.grade}</h1>
          <div class="divider"></div>
          <p>Material Didático Focado em ${book.metadata.course.rigorLevel}</p>
        </div>
      `;

      // Índice
      bookHtml += `<div class="book-toc"><h2>Índice</h2>`;
      book.parts.forEach((part, pIdx) => {
        bookHtml += `<div class="toc-part">`;
        bookHtml += `<h3>${book.metadata.style.structureLevel1} ${pIdx + 1}: ${part.title}</h3>`;
        part.chapters.forEach((chapter, cIdx) => {
          bookHtml += `<div class="toc-chapter"><span class="toc-chapter-title">${book.metadata.style.structureLevel2} ${cIdx + 1}: ${chapter.title}</span></div>`;
          chapter.sessions.forEach((session, sIdx) => {
            bookHtml += `<div class="toc-session">${cIdx + 1}.${sIdx + 1} ${session.title}</div>`;
          });
        });
        bookHtml += `</div>`;
      });
      bookHtml += `</div>`;

      // Conteúdo
      book.parts.forEach((part, pIdx) => {
        // Divisor de parte
        bookHtml += `
          <div class="part-divider">
            <span>${book.metadata.style.structureLevel1} ${pIdx + 1}</span>
            <h1>${part.title}</h1>
          </div>
        `;

        part.chapters.forEach((chapter, cIdx) => {
          bookHtml += `<div class="chapter-block">`;
          bookHtml += `
            <div class="chapter-header">
              <span class="label">${book.metadata.style.structureLevel2} ${cIdx + 1}</span>
              <h2>${chapter.title}</h2>
              <p>${chapter.objective}</p>
            </div>
          `;

          chapter.sessions.forEach((session, sIdx) => {
            bookHtml += `<div class="session-block">`;
            bookHtml += `<h3><span class="session-number">${cIdx + 1}.${sIdx + 1}</span> ${session.title}</h3>`;

            if (session.content) {
              bookHtml += `<div class="session-content">${session.content}</div>`;
            } else {
              bookHtml += `<div class="session-pending">Conteúdo pendente para esta sessão.</div>`;
            }

            bookHtml += `</div>`;
          });

          bookHtml += `</div>`;
        });
      });

      // Limpar e renderizar
      containerRef.current.innerHTML = '';
      const previewer = new Previewer();
      await previewer.preview(
        bookHtml,
        [{ text: BOOK_PAGED_CSS }] as any,
        containerRef.current
      );
    } catch (err) {
      console.error('Erro ao renderizar BookPreview:', err);
    } finally {
      setIsRendering(false);
    }
  };

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

      {/* Pages Container with paged.js */}
      <div className="flex-1 overflow-y-auto relative">
        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-200/80 z-10">
            <div className="flex items-center bg-white px-6 py-3 rounded-xl shadow-lg text-zinc-600">
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
              Renderizando páginas...
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full" />
      </div>
    </div>
  );
}
