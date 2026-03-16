import React, { useEffect, useRef, useState } from 'react';
import { Book } from '../types';
import { renderLatexInHtml } from '../lib/latex';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import editorStylesRaw from '../index.css?raw';

interface BookPreviewProps {
  book: Book;
  onBack: () => void;
}

const PRINT_STYLE_ID = 'book-preview-print-style';

const IMPORTED_EDITOR_STYLES = editorStylesRaw
  .replace(/@import\s+["'][^"']+["'];?/g, '')
  .trim();

const BOOK_PAGED_CSS = `
@page {
  size: A4;
  margin: 20mm;
}

.pagedjs_page {
  background: white;
  box-shadow: 0 4px 24px rgba(0,0,0,0.12);
  margin: 0 !important;
  border-radius: 2px;
}

.pagedjs_pages {
  display: flex !important;
  flex-direction: column !important;
  align-items: center;
  gap: 28px;
  padding: 32px 0 48px;
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

.session-content [data-type="page-break"] {
  break-after: page;
  page-break-after: always;
  height: 0;
  margin: 0;
  padding: 0;
  border: none;
}

.session-content .spacer-block,
.session-content [data-type="spacer-block"] {
  display: block;
  border: none;
  background: none;
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

function styleStringToObject(style: string): Record<string, string> {
  return style
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, part) => {
      const [property, ...valueParts] = part.split(':');
      if (!property || valueParts.length === 0) return accumulator;
      accumulator[property.trim().toLowerCase()] = valueParts.join(':').trim();
      return accumulator;
    }, {});
}

function styleObjectToString(styleObject: Record<string, string>): string {
  return Object.entries(styleObject)
    .filter(([, value]) => value && value.trim().length > 0)
    .map(([property, value]) => `${property}: ${value}`)
    .join('; ');
}

function mergeInlineStyles(baseStyle: string, overrideStyle: string): string {
  const merged = {
    ...styleStringToObject(baseStyle),
    ...styleStringToObject(overrideStyle)
  };
  return styleObjectToString(merged);
}

function normalizeEditorHtml(content: string): string {
  const parser = new DOMParser();
  const document = parser.parseFromString(`<div id="normalize-root">${content}</div>`, 'text/html');
  const root = document.getElementById('normalize-root');

  if (!root) return renderLatexInHtml(content);

  root.querySelectorAll('img').forEach((imageElement) => {
    const containerStyle = imageElement.getAttribute('containerstyle') || imageElement.getAttribute('containerStyle') || '';
    const inlineStyle = imageElement.getAttribute('style') || '';
    const mergedStyle = mergeInlineStyles(containerStyle, inlineStyle);

    if (mergedStyle) {
      imageElement.setAttribute('style', mergedStyle);
    }

    imageElement.removeAttribute('containerstyle');
    imageElement.removeAttribute('containerStyle');
    imageElement.removeAttribute('wrapperstyle');
    imageElement.removeAttribute('wrapperStyle');

    const widthAttribute = imageElement.getAttribute('width');
    if (widthAttribute && !styleStringToObject(imageElement.getAttribute('style') || '').width) {
      const normalizedWidth = /^\d+$/.test(widthAttribute) ? `${widthAttribute}px` : widthAttribute;
      const mergedWithWidth = mergeInlineStyles(imageElement.getAttribute('style') || '', `width: ${normalizedWidth}; height: auto;`);
      imageElement.setAttribute('style', mergedWithWidth);
    }
  });

  return renderLatexInHtml(root.innerHTML);
}

export function BookPreview({ book, onBack }: BookPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(true);
  const renderVersionRef = useRef(0);

  const handlePrintPdf = () => {
    if (!containerRef.current) return;

    const existingPrintStyle = document.getElementById(PRINT_STYLE_ID);
    if (existingPrintStyle) {
      existingPrintStyle.remove();
    }

    // Adicionar classe aos elementos pais para corrigir o overflow no momento da impressão
    const parents: HTMLElement[] = [];
    let current: HTMLElement | null = containerRef.current.parentElement;
    while (current && current !== document.body) {
      current.classList.add('print-parent');
      parents.push(current);
      current = current.parentElement;
    }

    const printStyle = document.createElement('style');
    printStyle.id = PRINT_STYLE_ID;
    printStyle.textContent = `
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          height: auto !important;
          min-height: auto !important;
          max-height: none !important;
          overflow: visible !important;
        }

        body > *:not(.print-parent) {
          display: none !important;
        }

        .print-parent {
          display: block !important;
          position: static !important;
          height: auto !important;
          min-height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          transform: none !important;
          background: transparent !important;
        }

        .print-parent > *:not(.print-parent):not(#book-preview-print-root) {
          display: none !important;
        }

        #book-preview-print-root {
          display: block !important;
          position: static !important;
          width: 100% !important;
          overflow: visible !important;
          background: #ffffff !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        #book-preview-print-root .pagedjs_pages {
          padding: 0 !important;
          gap: 0 !important;
          display: block !important;
        }

        #book-preview-print-root .pagedjs_page {
          box-shadow: none !important;
          margin: 0 auto !important;
          break-after: page;
          page-break-after: always;
        }
      }
    `;

    document.head.appendChild(printStyle);

    const cleanupPrintStyle = () => {
      const styleNode = document.getElementById(PRINT_STYLE_ID);
      if (styleNode) {
        styleNode.remove();
      }
      parents.forEach(el => el.classList.remove('print-parent'));
    };

    window.addEventListener('afterprint', cleanupPrintStyle, { once: true });

    window.print();

    // Timeout de segurança caso o afterprint não dispare (ex: cancelamento em alguns navegadores antigos)
    setTimeout(cleanupPrintStyle, 5000);
  };

  useEffect(() => {
    const renderVersion = ++renderVersionRef.current;
    let isCancelled = false;

    void renderBook(renderVersion, () => isCancelled || renderVersion !== renderVersionRef.current);

    return () => {
      isCancelled = true;
    };
  }, [book]);

  const renderBook = async (renderVersion: number, shouldAbort: () => boolean) => {
    if (!containerRef.current) return;
    setIsRendering(true);

    try {
      const { Previewer } = await import('pagedjs');

      if (shouldAbort() || !containerRef.current?.isConnected) {
        return;
      }

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
              bookHtml += `<div class="session-content pagedjs_textarea_mimic">${normalizeEditorHtml(session.content)}</div>`;
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

      if (shouldAbort() || !containerRef.current?.isConnected) {
        return;
      }

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      if (shouldAbort() || !containerRef.current?.isConnected) {
        return;
      }

      const previewer = new Previewer();
      await previewer.preview(
        bookHtml,
        [{ text: `${BOOK_PAGED_CSS}\n${IMPORTED_EDITOR_STYLES}` }] as any,
        containerRef.current
      );
    } catch (err) {
      if (!shouldAbort()) {
        console.error('Erro ao renderizar BookPreview:', err);
      }
    } finally {
      if (!shouldAbort() && renderVersion === renderVersionRef.current) {
        setIsRendering(false);
      }
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
          onClick={handlePrintPdf}
          disabled={isRendering}
          className="flex items-center bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div id="book-preview-print-root" ref={containerRef} className="w-full" />
      </div>
    </div>
  );
}
