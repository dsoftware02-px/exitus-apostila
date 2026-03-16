import React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { ScissorsLineDashed } from 'lucide-react';

// ============================================
// Column Layout (2, 3, or 4 columns)
// ============================================
export const ColumnLayout = Node.create({
  name: 'columnLayout',
  group: 'block',
  content: 'column+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      columns: {
        default: 2,
        parseHTML: (element: HTMLElement) => parseInt(element.getAttribute('data-columns') || '2'),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="column-layout"]' }];
  },

  renderHTML({ HTMLAttributes, node }: any) {
    const cols = node.attrs.columns || 2;
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-type': 'column-layout',
      'data-columns': String(cols),
      class: `column-layout cols-${cols}`,
    }), 0];
  },
});

export const Column = Node.create({
  name: 'column',
  content: 'block+',
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },

  renderHTML({ HTMLAttributes }: any) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-type': 'column',
      class: 'column-item',
    }), 0];
  },
});

// ============================================
// Callout Box (info, tip, warning, example)
// ============================================

export type CalloutType = 'info' | 'tip' | 'warning' | 'example';

export const CALLOUT_LABELS: Record<CalloutType, string> = {
  info: 'Informação',
  tip: 'Dica',
  warning: 'Atenção',
  example: 'Exemplo',
};

export const CALLOUT_ICONS: Record<CalloutType, string> = {
  info: 'ℹ️',
  tip: '💡',
  warning: '⚠️',
  example: '📝',
};

export const CalloutBox = Node.create({
  name: 'calloutBox',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-callout') || 'info',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout-box"]' }];
  },

  renderHTML({ HTMLAttributes, node }: any) {
    const type = node.attrs.type || 'info';
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-type': 'callout-box',
      'data-callout': type,
      class: `callout-box callout-${type}`,
    }), 0];
  },
});

// ============================================
// Page Break
// ============================================
export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'div[data-type="page-break"]' }];
  },

  renderHTML({ HTMLAttributes }: any) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-type': 'page-break',
      class: 'page-break-marker',
    })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(() => (
      <NodeViewWrapper>
        <div
          className="page-break-editor"
          contentEditable={false}
        >
          <div className="page-break-line" />
          <span className="page-break-label">
            <ScissorsLineDashed className="w-4 h-4 inline-block mr-1 align-middle" />
            Quebra de Página
          </span>
          <div className="page-break-line" />
        </div>
      </NodeViewWrapper>
    ));
  },
});

// ============================================
// Spacer Block (vertical spacing)
// ============================================
export const SpacerBlock = Node.create({
  name: 'spacerBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      height: {
        default: '16',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-height') || '16',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="spacer-block"]' }];
  },

  renderHTML({ HTMLAttributes, node }: any) {
    const height = node.attrs.height || '16';
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-type': 'spacer-block',
      'data-height': height,
      class: 'spacer-block',
      style: `height: ${height}mm;`,
    })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(({ node, updateAttributes }) => {
      const height = node.attrs.height || '16';
      return (
        <NodeViewWrapper>
          <div
            className="spacer-block-editor"
            contentEditable={false}
            style={{ height: `${Math.max(8, parseInt(height))}px` }}
          >
            <div className="spacer-block-inner">
              <span className="spacer-label">Espaçamento: {height}mm</span>
              <div className="spacer-controls">
                <button
                  onClick={() => updateAttributes({ height: String(Math.max(2, parseInt(height) - 2)) })}
                  className="spacer-btn"
                >−</button>
                <button
                  onClick={() => updateAttributes({ height: String(Math.min(80, parseInt(height) + 2)) })}
                  className="spacer-btn"
                >+</button>
              </div>
            </div>
          </div>
        </NodeViewWrapper>
      );
    });
  },
});

// ============================================
// Helper: Insert commands
// ============================================
export function insertColumnLayout(editor: any, columns: number) {
  const cols = Array.from({ length: columns }, () => ({
    type: 'column',
    content: [{ type: 'paragraph' }],
  }));

  editor.chain().focus().insertContent({
    type: 'columnLayout',
    attrs: { columns },
    content: cols,
  }).run();
}

export function insertCalloutBox(editor: any, type: CalloutType) {
  editor.chain().focus().insertContent({
    type: 'calloutBox',
    attrs: { type },
    content: [{ type: 'paragraph' }],
  }).run();
}

export function insertPageBreak(editor: any) {
  editor.chain().focus().insertContent({
    type: 'pageBreak',
  }).run();
}

export function insertSpacer(editor: any, height = '16') {
  editor.chain().focus().insertContent({
    type: 'spacerBlock',
    attrs: { height },
  }).run();
}
