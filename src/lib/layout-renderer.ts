import { renderLatexInHtml } from './latex';
import { getLayoutFile, hasLayoutTemplate, resolveLayoutId, STANDARD_MARGINS, TEMPLATE_OUTER_PADDING, TEMPLATE_INNER_PADDING } from './layouts';

// ──────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────

export interface LayoutContentBlocks {
  title: string;
  introText: string;
  heroImageHtml: string;
  mainContentHtml: string;
  sidebarContentHtml: string;
}

// ──────────────────────────────────────────────
// Utilidades de estilo inline
// ──────────────────────────────────────────────

export function styleStringToObject(style: string): Record<string, string> {
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

export function styleObjectToString(styleObject: Record<string, string>): string {
  return Object.entries(styleObject)
    .filter(([, value]) => value && value.trim().length > 0)
    .map(([property, value]) => `${property}: ${value}`)
    .join('; ');
}

export function mergeInlineStyles(baseStyle: string, overrideStyle: string): string {
  const merged = {
    ...styleStringToObject(baseStyle),
    ...styleStringToObject(overrideStyle)
  };
  return styleObjectToString(merged);
}

// ──────────────────────────────────────────────
// Normalização de HTML do editor
// ──────────────────────────────────────────────

export function normalizeEditorHtml(content: string): string {
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

// ──────────────────────────────────────────────
// Escape HTML
// ──────────────────────────────────────────────

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ──────────────────────────────────────────────
// Imagem Hero (fallback)
// ──────────────────────────────────────────────

export function buildHeroFallback(): string {
  return `
    <div style="
      width:100%;
      height:100%;
      min-height:40mm;
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

// ──────────────────────────────────────────────
// Extração de blocos de conteúdo para templates
// ──────────────────────────────────────────────

export function extractLayoutBlocks(content: string, sessionTitle?: string): LayoutContentBlocks {
  const parser = new DOMParser();
  const document = parser.parseFromString(`<div id="layout-root">${content}</div>`, 'text/html');
  const root = document.getElementById('layout-root');

  if (!root) {
    return {
      title: escapeHtml(sessionTitle || 'Aula'),
      introText: 'Escreva um parágrafo inicial para apresentar este conteúdo.',
      heroImageHtml: buildHeroFallback(),
      mainContentHtml: content,
      sidebarContentHtml: '<p>Adicione uma lista ou observação para preencher esta caixa.</p>'
    };
  }

  // Extrair título (primeiro heading)
  const firstHeading = root.querySelector('h1, h2, h3');
  const extractedTitle = firstHeading?.textContent?.trim() || '';
  if (firstHeading) {
    firstHeading.remove();
  }

  // Extrair introdução (primeiro parágrafo)
  const firstParagraph = root.querySelector('p');
  const extractedIntro = firstParagraph?.textContent?.trim() || '';
  if (firstParagraph) {
    firstParagraph.remove();
  }

  // Extrair imagem principal (primeira imagem)
  // CUIDADO: imagens são contidas com max-height e object-fit para evitar distorção
  const firstImage = root.querySelector('img');
  let heroImageHtml = buildHeroFallback();
  if (firstImage) {
    const src = firstImage.getAttribute('src') || '';
    const alt = escapeHtml(firstImage.getAttribute('alt') || 'Ilustração didática');
    if (src) {
      // Usar object-fit:contain para garantir que a imagem inteira seja exibida
      // sem distorção, independente do tamanho original
      heroImageHtml = `<img src="${src}" alt="${alt}" style="
        width: 100%;
        max-height: 50mm;
        object-fit: contain;
        display: block;
        margin: auto;
      " />`;
    }
    firstImage.remove();
  }

  // Extrair sidebar (primeira lista ou blockquote)
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
    title: escapeHtml(extractedTitle || sessionTitle || 'Aula'),
    introText: escapeHtml(extractedIntro || 'Use o primeiro parágrafo para introduzir o tema de forma simples e divertida.'),
    heroImageHtml,
    mainContentHtml,
    sidebarContentHtml: sidebarContentHtml || '<p>Inclua tópicos importantes para destacar aqui.</p>'
  };
}

// ──────────────────────────────────────────────
// Aplicação de template
// ──────────────────────────────────────────────

export function applyLayoutTemplate(template: string, blocks: LayoutContentBlocks): string {
  return template
    .replaceAll('{{SESSION_TITLE}}', blocks.title)
    .replaceAll('{{INTRO_TEXT}}', blocks.introText)
    .replaceAll('{{HERO_IMAGE}}', blocks.heroImageHtml)
    .replaceAll('{{MAIN_CONTENT}}', blocks.mainContentHtml)
    .replaceAll('{{SIDEBAR_CONTENT}}', blocks.sidebarContentHtml);
}

// ──────────────────────────────────────────────
// Cache e carregamento de templates
// ──────────────────────────────────────────────

const templateCache: Record<string, string> = {};

export async function loadLayoutTemplate(layoutId: string): Promise<string | null> {
  const layoutFile = getLayoutFile(layoutId);
  if (!layoutFile) return null;

  if (templateCache[layoutFile]) {
    return templateCache[layoutFile];
  }

  try {
    const response = await fetch(layoutFile);
    if (!response.ok) {
      console.warn(`Falha ao carregar template de layout: ${layoutFile}`);
      return null;
    }

    const template = await response.text();
    if (!template.trim()) {
      console.warn(`Template vazio para ${layoutFile}.`);
      return null;
    }

    templateCache[layoutFile] = template;
    return template;
  } catch (err) {
    console.error(`Erro ao carregar template ${layoutFile}:`, err);
    return null;
  }
}

// ──────────────────────────────────────────────
// CSS para imagens em templates (protege contra overflow/distorção)
// ──────────────────────────────────────────────

export const TEMPLATE_IMAGE_SAFETY_CSS = `
  /* Proteção de imagens dentro de templates */
  section img {
    max-width: 100%;
    height: auto;
  }

  section [style*="max-height"] img {
    max-height: inherit;
    object-fit: contain;
  }
`;

// ──────────────────────────────────────────────
// Fallback template inline
// ──────────────────────────────────────────────

export const FALLBACK_TEMPLATE = `
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
  box-decoration-break:clone;
  -webkit-box-decoration-break:clone;
">
  <h1 style="margin:0 0 8mm;color:#b45309;font-size:24pt;text-align:center;line-height:1.2;">{{SESSION_TITLE}}</h1>

  <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:8mm;align-items:start;">
    <div style="min-height:40mm;border:3px solid #f97316;border-radius:14px;overflow:hidden;background:#ffedd5;">{{HERO_IMAGE}}</div>
    <div style="min-height:40mm;border:3px dashed #fb7185;border-radius:14px;padding:12px 14px;background:#fff1f2;">
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
