import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { generateImage, generateQuestion } from '../lib/gemini';
import { renderLatexInHtml } from '../lib/latex';
import ImageResize from 'tiptap-extension-resize-image';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { Node, mergeAttributes } from '@tiptap/core';
import {
    ColumnLayout, Column, CalloutBox, PageBreak, SpacerBlock,
    insertColumnLayout, insertCalloutBox, insertPageBreak, insertSpacer,
    type CalloutType,
} from '../lib/tiptap-layout-extensions';
import {
    Type,
    Bold,
    Italic,
    Underline as UnderlineIcon,
    AlignCenter,
    AlignLeft,
    AlignRight,
    AlignJustify,
    Upload,
    List,
    ListOrdered,
    Image as ImageIcon,
    HelpCircle,
    Loader2,
    LayoutGrid,
    Info,
    Lightbulb,
    AlertTriangle,
    BookOpen,
    ScissorsLineDashed,
    Space,
    ChevronDown,
    Columns3,
    Columns2,
    Palette,
    Highlighter,
} from 'lucide-react';

// Extensão Customizada para <img_req>
const ImgReq = Node.create({
    name: 'imgReq',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            desc: {
                default: '',
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'img_req',
            },
            {
                tag: 'img-req',
            }
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['img_req', mergeAttributes(HTMLAttributes)];
    },

    addNodeView() {
        return ReactNodeViewRenderer(({ node, updateAttributes, getPos, editor }) => {
            const [isGenerating, setIsGenerating] = useState(false);
            const [desc, setDesc] = useState(node.attrs.desc);

            const handleGenerate = async () => {
                if (!desc) return;
                setIsGenerating(true);
                try {
                    const imageUrl = await generateImage(desc);
                    if (imageUrl) {
                        setTimeout(() => {
                            editor.chain()
                                .focus()
                                .setNodeSelection(getPos() ?? 0)
                                .deleteSelection()
                                .insertContent({
                                    type: 'imageResize',
                                    attrs: {
                                        src: imageUrl,
                                        alt: 'Ilustração Didática'
                                    }
                                })
                                .run();
                        }, 0);
                    } else {
                        alert('Não foi possível gerar a imagem.');
                    }
                } catch (e) {
                    console.error(e);
                    alert('Erro ao gerar imagem.');
                } finally {
                    setIsGenerating(false);
                }
            };

            return (
                <NodeViewWrapper>
                    <div
                        className="bg-purple-50 border border-purple-200 rounded-lg p-4 my-4 flex flex-col space-y-3 shadow-sm"
                        contentEditable={false}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start space-x-3">
                            <div className="bg-purple-100 text-purple-600 p-2 rounded-lg shrink-0">
                                <ImageIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center pb-2">
                                    <h4 className="text-purple-900 font-bold text-sm mb-1 uppercase tracking-wider">Editor de Imagem IA</h4>
                                    <button
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={handleGenerate}
                                        disabled={isGenerating || !desc}
                                        className="bg-purple-600 text-white text-sm px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center"
                                    >
                                        {isGenerating ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</>
                                        ) : (
                                            <><ImageIcon className="w-4 h-4 mr-2" /> Gerar Imagem</>
                                        )}
                                    </button>
                                </div>
                                <textarea
                                    className="w-full text-purple-700 bg-white border border-purple-200 rounded p-2 text-sm italic outline-none focus:ring-1 focus:ring-purple-400 resize-none"
                                    rows={3}
                                    value={desc}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                    onFocus={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                        setDesc(e.target.value);
                                        updateAttributes({ desc: e.target.value });
                                    }}
                                    placeholder="Descreva a imagem que deseja gerar..."
                                />
                            </div>
                        </div>
                    </div>
                </NodeViewWrapper>
            );
        });
    },
});

// Extensão Customizada para <q_req>
const QReq = Node.create({
    name: 'qReq',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            desc: {
                default: '',
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'q_req',
            },
            {
                tag: 'q-req',
            }
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['q_req', mergeAttributes(HTMLAttributes)];
    },

    addNodeView() {
        return ReactNodeViewRenderer(({ node, updateAttributes, getPos, editor }) => {
            const [isGenerating, setIsGenerating] = useState(false);
            const [desc, setDesc] = useState(node.attrs.desc);

            const handleGenerate = async () => {
                if (!desc) return;
                setIsGenerating(true);
                try {
                    // Manda gerar usando nível intermediário como padrão, pois não temos metadata do componente aqui
                    const questionTxt = await generateQuestion(desc, 'INTERMEDIARIO');
                    if (questionTxt) {
                        // Converter markdown básico da questão para HTML
                        const questionHtml = questionTxt
                            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\n/g, '<br>');

                        const renderedQuestionHtml = renderLatexInHtml(questionHtml);

                        // Criar o HTML da questão
                        const htmlContent = `<hr><h3>Questão Proposta</h3><div>${renderedQuestionHtml}</div>`;

                        let blockPosition: number;
                        try {
                            blockPosition = getPos() ?? 0;
                        } catch {
                            editor.chain().focus().insertContent(htmlContent).run();
                            return;
                        }

                        editor.chain().focus().insertContentAt({
                            from: blockPosition,
                            to: blockPosition + node.nodeSize,
                        }, htmlContent).run();
                    } else {
                        alert('Não foi possível gerar a questão.');
                    }
                } catch (e) {
                    console.error(e);
                    alert('Erro ao gerar questão.');
                } finally {
                    setIsGenerating(false);
                }
            };

            return (
                <NodeViewWrapper>
                    <div
                        className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4 flex flex-col space-y-3 shadow-sm select-none"
                        contentEditable={false}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start space-x-3">
                            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg shrink-0">
                                <HelpCircle className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center pb-2">
                                    <h4 className="text-blue-900 font-bold text-sm mb-1 uppercase tracking-wider">Editor de Questão IA</h4>
                                    <button
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={handleGenerate}
                                        disabled={isGenerating || !desc}
                                        className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
                                    >
                                        {isGenerating ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</>
                                        ) : (
                                            <><HelpCircle className="w-4 h-4 mr-2" /> Gerar Questão</>
                                        )}
                                    </button>
                                </div>
                                <textarea
                                    className="w-full text-blue-700 bg-white border border-blue-200 rounded p-2 text-sm italic outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                                    rows={3}
                                    value={desc}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                    onFocus={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                        setDesc(e.target.value);
                                        updateAttributes({ desc: e.target.value });
                                    }}
                                    placeholder="Descreva a questão a ser gerada..."
                                />
                            </div>
                        </div>
                    </div>
                </NodeViewWrapper>
            );
        });
    },
});


type RichEditorProps = {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
};

const FONTS = [
    { name: 'Nenhuma', value: '' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Menlo', value: 'Menlo, Monaco, monospace' },
];

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

function normalizeWidthValue(width: unknown): string {
    if (typeof width === 'number') return `${width}px`;
    if (typeof width !== 'string' || !width.trim()) return '';
    const trimmed = width.trim();
    if (/\d(px|%|rem|em|vw|vh)$/.test(trimmed)) return trimmed;
    if (/^\d+$/.test(trimmed)) return `${trimmed}px`;
    return trimmed;
}

export function RichEditor({ content, onChange, placeholder }: RichEditorProps) {
    const [isFocused, setIsFocused] = useState(false);
    const [showLayoutMenu, setShowLayoutMenu] = useState(false);
    const [showCalloutMenu, setShowCalloutMenu] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const layoutMenuRef = useRef<HTMLDivElement>(null);
    const calloutMenuRef = useRef<HTMLDivElement>(null);
    const colorPickerRef = useRef<HTMLDivElement>(null);
    const highlightPickerRef = useRef<HTMLDivElement>(null);
    const lastEditorHtmlRef = useRef(content || '');

    // Tratamento do conteúdo: o tiptap já recebe HTML e renderiza. Se o conteúdo vazio for passado e tiveros um placeholder, vamos usar o CSS do Tiptap depois.
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4] },
            }),
            TextStyle,
            FontFamily,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Color,
            Highlight.configure({
                multicolor: true,
            }),
            ImageResize.configure({
                allowBase64: true,
                inline: true
            } as any),
            ColumnLayout,
            Column,
            CalloutBox,
            PageBreak,
            SpacerBlock,
            ImgReq,
            QReq,
        ],
        content: content,
        onUpdate: ({ editor }) => {
            // Passa o HTML formatado de volta
            const html = editor.getHTML();
            lastEditorHtmlRef.current = html;
            onChange(html);
        },
        editorProps: {
            attributes: {
                class: 'focus:outline-none min-h-full pagedjs_textarea_mimic',
            },
        },
    });

    // Atualizar conteúdo externo apenas se houver uma grande dessincronização 
    // (ex: ao trocar de sessão, o content prop muda bruscamente)
    useEffect(() => {
        if (!editor) return;

        const currentEditorHtml = editor.getHTML();
        const isExternalUpdate = content !== lastEditorHtmlRef.current && content !== currentEditorHtml;

        if (isExternalUpdate && !editor.isFocused) {
            editor.commands.setContent(content, { emitUpdate: false });
            lastEditorHtmlRef.current = content;
        }
    }, [content, editor]);

    // Close dropdown menus on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as globalThis.Node;
            if (layoutMenuRef.current && !layoutMenuRef.current.contains(target)) {
                setShowLayoutMenu(false);
            }
            if (calloutMenuRef.current && !calloutMenuRef.current.contains(target)) {
                setShowCalloutMenu(false);
            }
            if (colorPickerRef.current && !colorPickerRef.current.contains(target)) {
                setShowColorPicker(false);
            }
            if (highlightPickerRef.current && !highlightPickerRef.current.contains(target)) {
                setShowHighlightPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!editor) {
        return null;
    }

    const activeImageType = editor.isActive('imageResize') ? 'imageResize' : editor.isActive('image') ? 'image' : null;
    const activeImageAttributes = activeImageType ? editor.getAttributes(activeImageType) : null;
    const activeImageStyle = String(activeImageAttributes?.containerStyle || activeImageAttributes?.style || '');
    const activeImageStyleObject = styleStringToObject(activeImageStyle);
    const isImageCentered = activeImageStyleObject['margin-left'] === 'auto' && activeImageStyleObject['margin-right'] === 'auto';

    const handleCenterImage = () => {
        if (!activeImageType) return;

        const currentStyleObject = styleStringToObject(activeImageStyle);
        delete currentStyleObject.float;
        delete currentStyleObject['padding-left'];
        delete currentStyleObject['padding-right'];
        delete currentStyleObject.margin;

        currentStyleObject.display = 'block';
        currentStyleObject['margin-left'] = 'auto';
        currentStyleObject['margin-right'] = 'auto';

        if (!currentStyleObject.width) {
            const normalizedWidth = normalizeWidthValue(activeImageAttributes?.width);
            if (normalizedWidth) {
                currentStyleObject.width = normalizedWidth;
            }
        }

        if (!currentStyleObject['max-width']) {
            currentStyleObject['max-width'] = '100%';
        }

        if (!currentStyleObject.height) {
            currentStyleObject.height = 'auto';
        }

        const centeredStyle = styleObjectToString(currentStyleObject);

        if (activeImageType === 'imageResize') {
            editor.chain().focus().updateAttributes('imageResize', { containerStyle: centeredStyle }).run();
            return;
        }

        editor.chain().focus().updateAttributes('image', { style: centeredStyle }).run();
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleUploadImage = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Selecione um arquivo de imagem válido.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const src = typeof reader.result === 'string' ? reader.result : '';
            if (!src) return;

            editor.chain().focus().insertContent({
                type: 'imageResize',
                attrs: {
                    src,
                    alt: file.name,
                    containerStyle: 'display: block; margin-left: auto; margin-right: auto; max-width: 100%; height: auto;'
                }
            }).run();
        };

        reader.onerror = () => {
            alert('Não foi possível carregar a imagem selecionada.');
        };

        reader.readAsDataURL(file);
    };

    return (
        <div className="flex flex-col h-full bg-white border-r border-zinc-200 overflow-hidden mx-auto w-full">
            {/* Editor Toolbar */}
            <div className="relative z-50 flex items-center border-b border-zinc-200 bg-zinc-50/80 px-3 py-1.5 shrink-0 flex-wrap gap-0.5"
                 style={{ backdropFilter: 'blur(8px)' }}
            >

                {/* Font Family Selector */}
                <div className="flex items-center space-x-1 px-1 border-r border-zinc-300 pr-2 mr-1">
                    <Type className="w-4 h-4 text-zinc-500 mr-1" />
                    <select
                        className="bg-transparent text-sm text-zinc-700 outline-none cursor-pointer py-1"
                        onChange={e => {
                            if (e.target.value === '') {
                                editor.chain().focus().unsetFontFamily().run();
                            } else {
                                editor.chain().focus().setFontFamily(e.target.value).run();
                            }
                        }}
                        value={editor.getAttributes('textStyle').fontFamily || ''}
                    >
                        {FONTS.map(font => (
                            <option key={font.value} value={font.value}>{font.name}</option>
                        ))}
                    </select>
                </div>

                {/* Text Formatting */}
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-1.5 rounded-md transition-colors ${editor.isActive('bold') ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-200'}`}
                    title="Negrito"
                >
                    <Bold className="w-4 h-4" />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-1.5 rounded-md transition-colors ${editor.isActive('italic') ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-200'}`}
                    title="Itálico"
                >
                    <Italic className="w-4 h-4" />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`p-1.5 rounded-md transition-colors ${editor.isActive('underline') ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-200'}`}
                    title="Sublinhado"
                >
                    <UnderlineIcon className="w-4 h-4" />
                </button>

                {/* Text Color */}
                <div className="relative" ref={colorPickerRef}>
                    <button
                        onClick={() => { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false); }}
                        className={`p-1.5 rounded-md transition-colors ${showColorPicker ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-200'}`}
                        title="Cor do texto"
                    >
                        <Palette className="w-4 h-4" />
                    </button>
                    {showColorPicker && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl p-2 z-9999 flex flex-wrap gap-1 w-35">
                            {['#000000', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#be185d'].map(color => (
                                <button
                                    key={color}
                                    onClick={() => { editor.chain().focus().setColor(color).run(); setShowColorPicker(false); }}
                                    className="w-6 h-6 rounded-md border border-zinc-200 hover:scale-110 transition-transform"
                                    style={{ background: color }}
                                    title={color}
                                />
                            ))}
                            <button
                                onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorPicker(false); }}
                                className="w-full text-xs text-zinc-500 hover:text-zinc-800 py-1 mt-1 border-t border-zinc-100"
                            >
                                Remover cor
                            </button>
                        </div>
                    )}
                </div>

                {/* Highlight */}
                <div className="relative" ref={highlightPickerRef}>
                    <button
                        onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); }}
                        className={`p-1.5 rounded-md transition-colors ${showHighlightPicker ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-200'}`}
                        title="Destaque (marca-texto)"
                    >
                        <Highlighter className="w-4 h-4" />
                    </button>
                    {showHighlightPicker && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl p-2 z-9999 flex flex-wrap gap-1 w-35">
                            {['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff', '#fed7aa'].map(color => (
                                <button
                                    key={color}
                                    onClick={() => { editor.chain().focus().toggleHighlight({ color }).run(); setShowHighlightPicker(false); }}
                                    className="w-6 h-6 rounded-md border border-zinc-200 hover:scale-110 transition-transform"
                                    style={{ background: color }}
                                    title={color}
                                />
                            ))}
                            <button
                                onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlightPicker(false); }}
                                className="w-full text-xs text-zinc-500 hover:text-zinc-800 py-1 mt-1 border-t border-zinc-100"
                            >
                                Remover destaque
                            </button>
                        </div>
                    )}
                </div>

                <div className="w-px h-5 bg-zinc-300 mx-0.5"></div>

                {/* Headings */}
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`p-1.5 rounded-md text-sm font-bold transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-200'}`}
                    title="Título 1"
                >
                    H1
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`p-1.5 rounded-md text-sm font-bold transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-200'}`}
                    title="Título 2"
                >
                    H2
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`p-1.5 rounded-md text-sm font-bold transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-200'}`}
                    title="Título 3"
                >
                    H3
                </button>

                <div className="w-px h-5 bg-zinc-300 mx-0.5"></div>

                {/* Text Alignment */}
                <button
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={`p-1.5 rounded-md transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-200'}`}
                    title="Alinhar à esquerda"
                >
                    <AlignLeft className="w-4 h-4" />
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={`p-1.5 rounded-md transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-200'}`}
                    title="Centralizar"
                >
                    <AlignCenter className="w-4 h-4" />
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={`p-1.5 rounded-md transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-200'}`}
                    title="Alinhar à direita"
                >
                    <AlignRight className="w-4 h-4" />
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                    className={`p-1.5 rounded-md transition-colors ${editor.isActive({ textAlign: 'justify' }) ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-200'}`}
                    title="Justificar"
                >
                    <AlignJustify className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-zinc-300 mx-0.5"></div>

                {/* Lists */}
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-1.5 rounded-md transition-colors ${editor.isActive('bulletList') ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-200'}`}
                    title="Lista"
                >
                    <List className="w-4 h-4" />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-1.5 rounded-md transition-colors ${editor.isActive('orderedList') ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-200'}`}
                    title="Lista Numerada"
                >
                    <ListOrdered className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-zinc-300 mx-0.5"></div>

                {/* Image Tools */}
                <button
                    onClick={handleCenterImage}
                    disabled={!activeImageType}
                    className={`p-1.5 rounded-md transition-colors ${isImageCentered ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-200'} disabled:opacity-40 disabled:cursor-not-allowed`}
                    title="Centralizar imagem selecionada"
                >
                    <AlignCenter className="w-4 h-4" />
                </button>
                <button
                    onClick={handleUploadClick}
                    className="p-1.5 rounded-md text-zinc-600 hover:bg-zinc-200 transition-colors"
                    title="Adicionar imagem do computador"
                >
                    <Upload className="w-4 h-4" />
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadImage}
                />

                <div className="w-px h-5 bg-zinc-300 mx-0.5"></div>

                {/* Layout Blocks Dropdown */}
                <div className="relative" ref={layoutMenuRef}>
                    <button
                        onClick={() => { setShowLayoutMenu(!showLayoutMenu); setShowCalloutMenu(false); setShowColorPicker(false); setShowHighlightPicker(false); }}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${showLayoutMenu ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-200'}`}
                        title="Inserir bloco de diagramação"
                    >
                        <LayoutGrid className="w-4 h-4" />
                        <span className="text-xs">Layout</span>
                        <ChevronDown className="w-3 h-3" />
                    </button>
                    {showLayoutMenu && (
                        <div className="layout-dropdown-menu">
                            <button
                                className="layout-dropdown-item"
                                onClick={() => { insertColumnLayout(editor, 2); setShowLayoutMenu(false); }}
                            >
                                <div className="icon bg-blue-100 text-blue-600"><Columns2 className="w-4 h-4" /></div>
                                <div>
                                    <div className="label">2 Colunas</div>
                                    <div className="desc">Dividir conteúdo lado a lado</div>
                                </div>
                            </button>
                            <button
                                className="layout-dropdown-item"
                                onClick={() => { insertColumnLayout(editor, 3); setShowLayoutMenu(false); }}
                            >
                                <div className="icon bg-indigo-100 text-indigo-600"><Columns3 className="w-4 h-4" /></div>
                                <div>
                                    <div className="label">3 Colunas</div>
                                    <div className="desc">Layout em três colunas</div>
                                </div>
                            </button>
                            <div className="layout-dropdown-separator" />
                            <button
                                className="layout-dropdown-item"
                                onClick={() => { insertCalloutBox(editor, 'info'); setShowLayoutMenu(false); }}
                            >
                                <div className="icon bg-blue-100 text-blue-600"><Info className="w-4 h-4" /></div>
                                <div>
                                    <div className="label">Caixa Informação</div>
                                    <div className="desc">Destaque informações importantes</div>
                                </div>
                            </button>
                            <button
                                className="layout-dropdown-item"
                                onClick={() => { insertCalloutBox(editor, 'tip'); setShowLayoutMenu(false); }}
                            >
                                <div className="icon bg-green-100 text-green-600"><Lightbulb className="w-4 h-4" /></div>
                                <div>
                                    <div className="label">Caixa Dica</div>
                                    <div className="desc">Dicas e sugestões para o leitor</div>
                                </div>
                            </button>
                            <button
                                className="layout-dropdown-item"
                                onClick={() => { insertCalloutBox(editor, 'warning'); setShowLayoutMenu(false); }}
                            >
                                <div className="icon bg-amber-100 text-amber-600"><AlertTriangle className="w-4 h-4" /></div>
                                <div>
                                    <div className="label">Caixa Atenção</div>
                                    <div className="desc">Alertas e advertências</div>
                                </div>
                            </button>
                            <button
                                className="layout-dropdown-item"
                                onClick={() => { insertCalloutBox(editor, 'example'); setShowLayoutMenu(false); }}
                            >
                                <div className="icon bg-purple-100 text-purple-600"><BookOpen className="w-4 h-4" /></div>
                                <div>
                                    <div className="label">Caixa Exemplo</div>
                                    <div className="desc">Exemplos e exercícios</div>
                                </div>
                            </button>
                            <div className="layout-dropdown-separator" />
                            <button
                                className="layout-dropdown-item"
                                onClick={() => { insertPageBreak(editor); setShowLayoutMenu(false); }}
                            >
                                <div className="icon bg-slate-100 text-slate-600"><ScissorsLineDashed className="w-4 h-4" /></div>
                                <div>
                                    <div className="label">Quebra de Página</div>
                                    <div className="desc">Forçar início de nova página</div>
                                </div>
                            </button>
                            <button
                                className="layout-dropdown-item"
                                onClick={() => { insertSpacer(editor); setShowLayoutMenu(false); }}
                            >
                                <div className="icon bg-zinc-100 text-zinc-500"><Space className="w-4 h-4" /></div>
                                <div>
                                    <div className="label">Espaçamento</div>
                                    <div className="desc">Inserir espaço vertical ajustável</div>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Content */}
            <div
                className="flex-1 overflow-y-auto w-full cursor-text bg-white"
                onClick={(event) => {
                    const target = event.target as HTMLElement;

                    if (target.closest('[contenteditable="false"]')) {
                        return;
                    }

                    if (!isFocused) {
                        editor.commands.focus();
                        setIsFocused(true);
                    }
                }}
                onBlur={() => setIsFocused(false)}
            >
                <div className="px-8 py-6 max-w-none">
                    <EditorContent editor={editor} className="min-h-full" />
                </div>
            </div>
        </div>
    );
}
