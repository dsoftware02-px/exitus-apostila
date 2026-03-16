import katex from 'katex';

const LATEX_TOKEN_REGEX = /(\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;

function extractLatexExpression(token: string): { expression: string; displayMode: boolean } {
  if (token.startsWith('$$') && token.endsWith('$$')) {
    return {
      expression: token.slice(2, -2).trim(),
      displayMode: true
    };
  }

  if (token.startsWith('\\[') && token.endsWith('\\]')) {
    return {
      expression: token.slice(2, -2).trim(),
      displayMode: true
    };
  }

  if (token.startsWith('\\(') && token.endsWith('\\)')) {
    return {
      expression: token.slice(2, -2).trim(),
      displayMode: false
    };
  }

  return {
    expression: token.slice(1, -1).trim(),
    displayMode: false
  };
}

function shouldSkipTextNode(textNode: Text): boolean {
  const parentElement = textNode.parentElement;
  if (!parentElement) return true;

  return Boolean(parentElement.closest('code, pre, script, style, textarea, .katex, .katex-display'));
}

function renderLatexToken(document: Document, token: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const { expression, displayMode } = extractLatexExpression(token);

  if (!expression) {
    fragment.appendChild(document.createTextNode(token));
    return fragment;
  }

  try {
    const rendered = katex.renderToString(expression, {
      displayMode,
      throwOnError: false,
      strict: 'ignore'
    });

    const container = document.createElement('span');
    container.innerHTML = rendered;

    while (container.firstChild) {
      fragment.appendChild(container.firstChild);
    }

    return fragment;
  } catch {
    fragment.appendChild(document.createTextNode(token));
    return fragment;
  }
}

function renderLatexInTextNode(textNode: Text, document: Document): void {
  const rawText = textNode.nodeValue || '';
  LATEX_TOKEN_REGEX.lastIndex = 0;
  if (!rawText || !LATEX_TOKEN_REGEX.test(rawText)) {
    return;
  }

  LATEX_TOKEN_REGEX.lastIndex = 0;

  const fragment = document.createDocumentFragment();
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = LATEX_TOKEN_REGEX.exec(rawText)) !== null) {
    const [token] = match;
    const start = match.index;

    if (start > cursor) {
      fragment.appendChild(document.createTextNode(rawText.slice(cursor, start)));
    }

    const latexNode = renderLatexToken(document, token);
    fragment.appendChild(latexNode);
    cursor = start + token.length;
  }

  if (cursor < rawText.length) {
    fragment.appendChild(document.createTextNode(rawText.slice(cursor)));
  }

  textNode.replaceWith(fragment);
}

export function renderLatexInHtml(html: string): string {
  if (!html || !html.trim()) return html;

  const parser = new DOMParser();
  const document = parser.parseFromString(`<div id="latex-root">${html}</div>`, 'text/html');
  const root = document.getElementById('latex-root');

  if (!root) return html;

  const textNodes: Text[] = [];
  const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  let currentNode = treeWalker.nextNode();
  while (currentNode) {
    textNodes.push(currentNode as Text);
    currentNode = treeWalker.nextNode();
  }

  for (const textNode of textNodes) {
    if (shouldSkipTextNode(textNode)) continue;
    renderLatexInTextNode(textNode, document);
  }

  return root.innerHTML;
}
