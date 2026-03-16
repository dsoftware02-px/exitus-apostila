import React, { useEffect, useRef, useState } from 'react';
import { getLayoutFile, hasLayoutTemplate, resolveLayoutId, STANDARD_MARGINS, TEMPLATE_OUTER_PADDING, TEMPLATE_INNER_PADDING } from '../lib/layouts';
import { renderLatexInHtml } from '../lib/latex';

interface LiveA4PageProps {
  content: string;
  layoutId?: string;
  sessionTitle?: string;
}

const LEGACY_EDITOR_CSS = `
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
  box-shadow: 0 2px 8px rgba(0,0,0,0.10);
}

.pagedjs_page_content img:not([style*="float"]) {
  margin: 12px 0;
}

.pagedjs_page_content img[style*="float: left"] {
  margin: 0 12px 8px 0 !important;
}

.pagedjs_page_content img[style*="float: right"] {
  margin: 0 0 8px 12px !important;
}

.pagedjs_page_content img[style*="margin-left: auto"][style*="margin-right: auto"] {
  display: block;
  margin: 12px auto !important;
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

const TEMPLATE_EDITOR_CSS = `
.pagedjs_page_content {
  font-size: 11pt;
  line-height: 1.6;
  color: #1f2937;
  padding: 0;
  box-sizing: border-box;
}
`;

const KATEX_PREVIEW_CSS = `
.pagedjs_page_content .katex {
  font-size: 1.02em;
}

.pagedjs_page_content .katex-display {
  margin: 0.85em 0;
  overflow-x: auto;
  overflow-y: hidden;
}
`;

const LAYOUT_BLOCKS_CSS = `
/* ============================================
   Layout Blocks - Paged Preview Styles
   ============================================ */

/* Column Layout */
.pagedjs_page_content .column-layout {
  display: grid;
  gap: 6mm;
  margin: 4mm 0;
}

.pagedjs_page_content .column-layout.cols-2 {
  grid-template-columns: 1fr 1fr;
}

.pagedjs_page_content .column-layout.cols-3 {
  grid-template-columns: 1fr 1fr 1fr;
}

.pagedjs_page_content .column-layout.cols-4 {
  grid-template-columns: 1fr 1fr 1fr 1fr;
}

.pagedjs_page_content .column-item {
  min-height: 10mm;
}

/* Callout Box */
.pagedjs_page_content .callout-box {
  border-radius: 8px;
  padding: 4mm 5mm;
  margin: 4mm 0;
  border-left: 4px solid;
  page-break-inside: avoid;
}

.pagedjs_page_content .callout-box::before {
  font-size: 11pt;
  font-weight: 700;
  display: block;
  margin-bottom: 2mm;
}

.pagedjs_page_content .callout-info {
  background: #eff6ff;
  border-left-color: #3b82f6;
}

.pagedjs_page_content .callout-info::before {
  content: "ℹ️ Informação";
  color: #1d4ed8;
}

.pagedjs_page_content .callout-tip {
  background: #f0fdf4;
  border-left-color: #22c55e;
}

.pagedjs_page_content .callout-tip::before {
  content: "💡 Dica";
  color: #16a34a;
}

.pagedjs_page_content .callout-warning {
  background: #fffbeb;
  border-left-color: #f59e0b;
}

.pagedjs_page_content .callout-warning::before {
  content: "⚠️ Atenção";
  color: #d97706;
}

.pagedjs_page_content .callout-example {
  background: #faf5ff;
  border-left-color: #a855f7;
}

.pagedjs_page_content .callout-example::before {
  content: "📝 Exemplo";
  color: #9333ea;
}

/* Page Break */
.pagedjs_page_content [data-type="page-break"] {
  break-after: page;
  page-break-after: always;
  height: 0;
  margin: 0;
  padding: 0;
  border: none;
}

/* Spacer Block */
.pagedjs_page_content .spacer-block,
.pagedjs_page_content [data-type="spacer-block"] {
  display: block;
  border: none;
  background: none;
}

/* Text Alignment */
.pagedjs_page_content [style*="text-align: center"],
.pagedjs_page_content .text-center {
  text-align: center;
}

.pagedjs_page_content [style*="text-align: right"],
.pagedjs_page_content .text-right {
  text-align: right;
}

.pagedjs_page_content [style*="text-align: justify"],
.pagedjs_page_content .text-justify {
  text-align: justify;
}
`;

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
  display: flex;
  flex-direction: column;
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

${useTemplateLayout ? TEMPLATE_EDITOR_CSS : LEGACY_EDITOR_CSS}
${KATEX_PREVIEW_CSS}
${LAYOUT_BLOCKS_CSS}
`;
}

const FALLBACK_TEMPLATE = `
<section style="
  min-height:297mm;
  width:100%;
  margin:0;
  border:8px solid #f59e0b;
  border-radius:22px;
  background:linear-gradient(180deg,#fef3c7 0%,#ffffff 100%);
  padding:${STANDARD_MARGINS.top}mm ${STANDARD_MARGINS.right}mm ${STANDARD_MARGINS.bottom}mm ${STANDARD_MARGINS.left}mm;
  box-sizing:border-box;
  font-family:'Trebuchet MS','Segoe UI',sans-serif;
  color:#1f2937;
  break-inside:auto;
  page-break-inside:auto;
">
  <h1 style="margin:0 0 8mm;color:#b45309;font-size:24pt;text-align:center;line-height:1.2;">{{SESSION_TITLE}}</h1>

  <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:8mm;align-items:start;">
    <div style="min-height:72mm;border:3px solid #f97316;border-radius:14px;overflow:hidden;background:#ffedd5;">{{HERO_IMAGE}}</div>
    <div style="min-height:72mm;border:3px dashed #fb7185;border-radius:14px;padding:12px 14px;background:#fff1f2;">
      <h3 style="margin:0 0 8px;color:#be123c;font-size:13pt;">Começo da história</h3>
      <p style="margin:0;font-size:10.8pt;line-height:1.6;">{{INTRO_TEXT}}</p>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:8mm;align-items:start;margin-top:7mm;">
    <article style="background:#fff;border:3px solid #fbbf24;border-radius:14px;padding:14px;">{{MAIN_CONTENT}}</article>
    <aside style="background:#ecfeff;border:3px solid #22d3ee;border-radius:14px;padding:12px 14px;">
      <h3 style="margin:0 0 8px;color:#0369a1;font-size:12pt;">Detalhes rápidos</h3>
      {{SIDEBAR_CONTENT}}
    </aside>
  </div>
</section>
`;

interface LayoutContentBlocks {
  title: string;
  introText: string;
  heroImageHtml: string;
  mainContentHtml: string;
  sidebarContentHtml: string;
}

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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildHeroFallback(): string {
  return `
    <div style="
      width:100%;
      height:100%;
      min-height:72mm;
      display:flex;
      align-items:center;
      justify-content:center;
      text-align:center;
      background:linear-gradient(135deg,#e0f2fe 0%,#fce7f3 100%);
      color:#475569;
      font-size:10.5pt;
      padding:14px;
      box-sizing:border-box;
    ">Adicione uma imagem no conteúdo para preencher este espaço ilustrado.</div>
  `;
}

function extractLayoutBlocks(content: string, sessionTitle?: string): LayoutContentBlocks {
  const parser = new DOMParser();
  const document = parser.parseFromString(`<div id="layout-root">${content}</div>`, 'text/html');
  const root = document.getElementById('layout-root');

  if (!root) {
    return {
      title: escapeHtml(sessionTitle || 'Aula Lúdica'),
      introText: 'Escreva um parágrafo inicial para apresentar este conteúdo.',
      heroImageHtml: buildHeroFallback(),
      mainContentHtml: content,
      sidebarContentHtml: '<p>Adicione uma lista ou observação para preencher esta caixa.</p>'
    };
  }

  const firstHeading = root.querySelector('h1, h2, h3');
  const extractedTitle = firstHeading?.textContent?.trim() || '';
  if (firstHeading) {
    firstHeading.remove();
  }

  const firstParagraph = root.querySelector('p');
  const extractedIntro = firstParagraph?.textContent?.trim() || '';
  if (firstParagraph) {
    firstParagraph.remove();
  }

  const firstImage = root.querySelector('img');
  let heroImageHtml = buildHeroFallback();
  if (firstImage) {
    const src = firstImage.getAttribute('src') || '';
    const alt = escapeHtml(firstImage.getAttribute('alt') || 'Ilustração didática');
    if (src) {
      heroImageHtml = `<img src="${src}" alt="${alt}" style="width:100%;height:100%;min-height:72mm;object-fit:cover;display:block;" />`;
    }
    firstImage.remove();
  }

  const sideCandidate = root.querySelector('ul, ol, blockquote');
  let sidebarContentHtml = '';
  if (sideCandidate) {
    sidebarContentHtml = sideCandidate.outerHTML;
    sideCandidate.remove();
  } else {
    const sideParagraph = root.querySelector('p');
    if (sideParagraph) {
      sidebarContentHtml = `<p>${escapeHtml(sideParagraph.textContent?.trim() || '')}</p>`;
      sideParagraph.remove();
    }
  }

  const mainContentHtml = root.innerHTML.trim() || '<p>Continue escrevendo para preencher o corpo principal desta página.</p>';

  return {
    title: escapeHtml(extractedTitle || sessionTitle || 'Aula Lúdica'),
    introText: escapeHtml(extractedIntro || 'Use o primeiro parágrafo para introduzir o tema de forma simples e divertida.'),
    heroImageHtml,
    mainContentHtml,
    sidebarContentHtml: sidebarContentHtml || '<p>Inclua tópicos importantes para destacar aqui.</p>'
  };
}

function applyLayoutTemplate(template: string, blocks: LayoutContentBlocks): string {
  return template
    .replaceAll('{{SESSION_TITLE}}', blocks.title)
    .replaceAll('{{INTRO_TEXT}}', blocks.introText)
    .replaceAll('{{HERO_IMAGE}}', blocks.heroImageHtml)
    .replaceAll('{{MAIN_CONTENT}}', blocks.mainContentHtml)
    .replaceAll('{{SIDEBAR_CONTENT}}', blocks.sidebarContentHtml);
}

export function LiveA4Page({ content, layoutId, sessionTitle }: LiveA4PageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const templateCacheRef = useRef<Record<string, string>>({});
  const renderVersionRef = useRef(0);

  const loadLayoutTemplate = async (currentLayoutId: string): Promise<string> => {
    const layoutFile = getLayoutFile(currentLayoutId);
    if (!layoutFile) {
      throw new Error(`Layout sem template: ${currentLayoutId}`);
    }

    if (templateCacheRef.current[layoutFile]) {
      return templateCacheRef.current[layoutFile];
    }

    const response = await fetch(layoutFile);
    if (!response.ok) {
      throw new Error(`Falha ao carregar template de layout: ${layoutFile}`);
    }

    const template = await response.text();
    if (!template.trim()) {
      console.warn(`Template vazio para ${layoutFile}. Usando template fallback.`);
      templateCacheRef.current[layoutFile] = FALLBACK_TEMPLATE;
      return FALLBACK_TEMPLATE;
    }

    templateCacheRef.current[layoutFile] = template;
    return template;
  };

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

        const blocks = extractLayoutBlocks(normalizedContent, sessionTitle);
        composedHtml = applyLayoutTemplate(layoutTemplate, blocks);
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
