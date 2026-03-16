import React, { useEffect, useRef, useState } from 'react';

interface LiveA4PageProps {
  content: string;
}

// CSS para paged.js com páginas A4
const PAGED_CSS = `
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

/* estilo do conteúdo dentro das páginas */
.pagedjs_page_content {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 12pt;
  line-height: 1.7;
  color: #1a1a1a;
}

.pagedjs_page_content h1 {
  font-size: 24pt;
  font-weight: 700;
  margin-bottom: 16px;
  color: #111;
}

.pagedjs_page_content h2 {
  font-size: 20pt;
  font-weight: 700;
  margin-bottom: 12px;
  color: #222;
}

.pagedjs_page_content h3 {
  font-size: 16pt;
  font-weight: 600;
  margin-bottom: 10px;
  color: #333;
}

.pagedjs_page_content h4 {
  font-size: 13pt;
  font-weight: 600;
  margin-bottom: 8px;
  color: #444;
}

.pagedjs_page_content p {
  margin-bottom: 10px;
  text-align: justify;
}

.pagedjs_page_content ul,
.pagedjs_page_content ol {
  margin-bottom: 10px;
  padding-left: 24px;
}

.pagedjs_page_content li {
  margin-bottom: 4px;
}

.pagedjs_page_content img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 12px 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
}

.pagedjs_page_content blockquote {
  border-left: 4px solid #d4d4d8;
  padding-left: 16px;
  margin: 12px 0;
  color: #52525b;
  font-style: italic;
}

.pagedjs_page_content hr {
  border: none;
  border-top: 1px solid #e4e4e7;
  margin: 20px 0;
}

.pagedjs_page_content table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}

.pagedjs_page_content th,
.pagedjs_page_content td {
  border: 1px solid #d4d4d8;
  padding: 8px 12px;
  text-align: left;
  font-size: 10pt;
}

.pagedjs_page_content th {
  background: #f4f4f5;
  font-weight: 600;
}

.pagedjs_page_content strong {
  font-weight: 700;
}

.pagedjs_page_content em {
  font-style: italic;
}

.pagedjs_page_content code {
  background: #f4f4f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10pt;
  font-family: 'Fira Code', monospace;
}

.pagedjs_page_content pre {
  background: #18181b;
  color: #e4e4e7;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 10pt;
  margin: 12px 0;
}

.pagedjs_page_content pre code {
  background: none;
  padding: 0;
  color: inherit;
}

.pagedjs_page_content .img-caption {
  text-align: center;
  font-size: 9pt;
  color: #71717a;
  font-style: italic;
  margin-top: -8px;
  margin-bottom: 12px;
}
`;

export function LiveA4Page({ content }: LiveA4PageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Debounce para evitar re-renderizações excessivas ao digitar
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      renderPaged();
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [content]);

  const renderPaged = async () => {
    if (!containerRef.current || !content.trim()) {
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#a1a1aa;font-size:14px;">
            O preview aparecerá aqui conforme você escreve HTML à esquerda.
          </div>
        `;
      }
      return;
    }

    setIsRendering(true);

    try {
      // Importação dinâmica do paged.js
      const { Previewer } = await import('pagedjs');

      // Limpar conteúdo anterior
      containerRef.current.innerHTML = '';

      const previewer = new Previewer();

      // O paged.js vai processar o HTML e criar páginas A4
      await previewer.preview(
        content,
        [{ text: PAGED_CSS }] as any, // Estilos CSS inline para paged.js
        containerRef.current
      );
    } catch (err) {
      console.error('Erro ao renderizar paged.js:', err);
      // Fallback: renderizar como HTML simples
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div style="padding:20mm;background:white;min-height:297mm;width:210mm;margin:32px auto;box-shadow:0 4px 24px rgba(0,0,0,0.12);font-family:Georgia,serif;font-size:12pt;line-height:1.7;">
            ${content}
          </div>
        `;
      }
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="w-full h-full bg-zinc-200/50 overflow-y-auto relative">
      {isRendering && (
        <div className="absolute top-4 right-4 z-10 bg-white/90 text-zinc-500 text-xs px-3 py-1.5 rounded-full shadow-sm flex items-center">
          <svg className="animate-spin w-3 h-3 mr-2" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Renderizando páginas...
        </div>
      )}
      <div ref={containerRef} className="w-full min-h-full" />
    </div>
  );
}
