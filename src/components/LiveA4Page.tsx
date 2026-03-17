import React, { useEffect, useRef, useState } from 'react';
import { hasLayoutTemplate, resolveLayoutId, STANDARD_MARGINS } from '../lib/layouts';
import {
  normalizeEditorHtml,
  extractLayoutBlocks,
  applyLayoutTemplate,
  loadLayoutTemplate,
  FALLBACK_TEMPLATE,
  TEMPLATE_IMAGE_SAFETY_CSS,
} from '../lib/layout-renderer';

interface LiveA4PageProps {
  content: string;
  layoutId?: string;
  sessionTitle?: string;
}

const TEMPLATE_EDITOR_CSS = `
.pagedjs_page_content {
  font-size: 11pt;
  line-height: 1.6;
  color: #1f2937;
  padding: 0;
  box-sizing: border-box;
}
`;

import editorStylesRaw from '../index.css?raw';
const IMPORTED_EDITOR_STYLES = editorStylesRaw
  .replace(/@import\s+["'][^"']+["'];?/g, '')
  .trim();

function getPagedCss(useTemplateLayout: boolean): string {
  const m = STANDARD_MARGINS;
  return `
@page {
  size: A4;
  margin: ${useTemplateLayout ? '0' : `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`};
}

html,
body {
  margin: 0;
  padding: 0;
}

.pagedjs_page {
  background: white;
  box-shadow: 0 4px 24px rgba(0,0,0,0.12);
  margin-bottom: 32px;
  border-radius: 2px;
  position: relative;
}

.pagedjs_pages {
  display: flex !important;
  flex-direction: column !important;
  align-items: center;
  padding: 32px 0;
}

.pagedjs_page::after {
  content: attr(data-page-number);
  position: absolute;
  right: ${useTemplateLayout ? '8mm' : '10mm'};
  bottom: ${useTemplateLayout ? '8mm' : '7mm'};
  z-index: 20;
  font-size: 10pt;
  font-weight: 700;
  line-height: 1;
  padding: ${useTemplateLayout ? '4px 9px' : '2px 8px'};
  border-radius: 999px;
  color: ${useTemplateLayout ? '#ffffff' : '#52525b'};
  background: ${useTemplateLayout ? '#f2a65a' : 'rgba(255,255,255,0.85)'};
  border: 1px solid ${useTemplateLayout ? '#f2a65a' : '#d4d4d8'};
}

${useTemplateLayout ? TEMPLATE_EDITOR_CSS : ''}
${useTemplateLayout ? TEMPLATE_IMAGE_SAFETY_CSS : ''}
${IMPORTED_EDITOR_STYLES}
`;
}

export function LiveA4Page({ content, layoutId, sessionTitle }: LiveA4PageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderVersionRef = useRef(0);

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
  }, [content, layoutId, sessionTitle]);

  const renderPaged = async () => {
    const renderVersion = ++renderVersionRef.current;

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
    const resolvedLayoutId = resolveLayoutId(layoutId);
    const useTemplateLayout = hasLayoutTemplate(resolvedLayoutId);
    const normalizedContent = normalizeEditorHtml(content);
    let composedHtml = normalizedContent;

    try {
      if (useTemplateLayout) {
        const layoutTemplate = await loadLayoutTemplate(resolvedLayoutId);
        if (!containerRef.current || renderVersion !== renderVersionRef.current) {
          return;
        }
        if (!layoutTemplate) {
          throw new Error(`Template não encontrado para layout: ${resolvedLayoutId}`);
        }

        const blocks = extractLayoutBlocks(normalizedContent, sessionTitle);
        composedHtml = applyLayoutTemplate(layoutTemplate, blocks);
      } else {
        // Envolver o HTML para herdar as mesmas classes nativas do editor em index.css
        composedHtml = `<div class="pagedjs_textarea_mimic">${composedHtml}</div>`;
      }

      const pagedCss = getPagedCss(useTemplateLayout);

      // Importação dinâmica do paged.js
      const { Previewer } = await import('pagedjs');

      if (!containerRef.current || renderVersion !== renderVersionRef.current) {
        return;
      }

      // Limpar conteúdo anterior
      containerRef.current.innerHTML = '';

      const previewer = new Previewer();

      // O paged.js vai processar o HTML e criar páginas A4
      await previewer.preview(
        composedHtml,
        [{ text: pagedCss }] as any, // Estilos CSS inline para paged.js
        containerRef.current
      );
    } catch (err) {
      console.error('Erro ao renderizar paged.js:', err);
      if (!containerRef.current) return;

      if (useTemplateLayout) {
        const fallbackBlocks = extractLayoutBlocks(normalizedContent, sessionTitle);
        const fallbackHtml = applyLayoutTemplate(FALLBACK_TEMPLATE, fallbackBlocks);
        containerRef.current.innerHTML = `
          <div style="padding:0;background:white;min-height:297mm;width:210mm;margin:32px auto;box-shadow:0 4px 24px rgba(0,0,0,0.12);box-sizing:border-box;">
            ${fallbackHtml}
          </div>
        `;
      } else {
        containerRef.current.innerHTML = `
          <div style="padding:${STANDARD_MARGINS.top}mm ${STANDARD_MARGINS.right}mm ${STANDARD_MARGINS.bottom}mm ${STANDARD_MARGINS.left}mm;background:white;min-height:297mm;width:210mm;margin:32px auto;box-shadow:0 4px 24px rgba(0,0,0,0.12);font-family:Georgia,serif;font-size:12pt;line-height:1.7;box-sizing:border-box;">
            ${normalizedContent}
          </div>
        `;
      }
    } finally {
      if (renderVersion === renderVersionRef.current) {
        setIsRendering(false);
      }
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
