import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { generateImage, generateQuestion } from '../lib/gemini';
import ImageResize from 'tiptap-extension-resize-image';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Underline from '@tiptap/extension-underline';
import { Node, mergeAttributes } from '@tiptap/core';
import {
    Type,
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    Image as ImageIcon,
    HelpCircle,
    Loader2
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
                                .setNodeSelection(getPos())
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
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 my-4 flex flex-col space-y-3 shadow-sm" contentEditable={false}>
                        <div className="flex items-start space-x-3">
                            <div className="bg-purple-100 text-purple-600 p-2 rounded-lg shrink-0">
                                <ImageIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center pb-2">
                                    <h4 className="text-purple-900 font-bold text-sm mb-1 uppercase tracking-wider">Editor de Imagem IA</h4>
                                    <button
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

                        // Criar o HTML da questão
                        const htmlContent = `<hr><h3>Questão Proposta</h3><p>${questionHtml}</p>`;

                        // O Tiptap lida melhor com inserção HTML via comando insertContent,
                        // mas para substituir o nó exato atual e forçar o onChange, vamos criar uma transação limpa
                        setTimeout(() => {
                            const transaction = editor.state.tr.replaceWith(
                                getPos(),
                                getPos() + node.nodeSize,
                                editor.schema.nodeFromJSON(
                                    {
                                        "type": "paragraph",
                                        "content": [
                                            {
                                                "type": "text",
                                                "text": `[Questão Gerada]`
                                            }
                                        ]
                                    }
                                )
                            );
                            editor.view.dispatch(transaction);
                            editor.chain().focus().setNodeSelection(getPos()).deleteSelection().insertContent(htmlContent).run();
                        }, 0);
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
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4 flex flex-col space-y-3 shadow-sm select-none" contentEditable={false}>
                        <div className="flex items-start space-x-3">
                            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg shrink-0">
                                <HelpCircle className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center pb-2">
                                    <h4 className="text-blue-900 font-bold text-sm mb-1 uppercase tracking-wider">Editor de Questão IA</h4>
                                    <button
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

export function RichEditor({ content, onChange, placeholder }: RichEditorProps) {
    const [isFocused, setIsFocused] = useState(false);

    // Tratamento do conteúdo: o tiptap já recebe HTML e renderiza. Se o conteúdo vazio for passado e tiveros um placeholder, vamos usar o CSS do Tiptap depois.
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4] },
            }),
            TextStyle,
            FontFamily,
            Underline,
            ImageResize.configure({
                allowBase64: true,
                inline: true
            } as any),
            ImgReq,
            QReq,
        ],
        content: content,
        onUpdate: ({ editor }) => {
            // Passa o HTML formatado de volta
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] font-sans p-6 text-zinc-800 leading-relaxed pagedjs_textarea_mimic',
            },
        },
    });

    // Atualizar conteúdo externo apenas se houver uma grande dessincronização 
    // (ex: ao trocar de sessão, o content prop muda bruscamente)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            // Evita loop infinito ou sobrescrever edições em andamento.
            // A comparação exata é difícil por causa de espaços, então faremos uma checagem simples de tamanho
            // ou verificaremos se o editor está completamente vazio quando não deveria.
            if (!editor.isFocused) {
                editor.commands.setContent(content);
            }
        }
    }, [content, editor]);

    if (!editor) {
        return null;
    }

    return (
        <div className="flex flex-col h-full bg-white border border-zinc-200 shadow-inner overflow-hidden mx-auto w-full">
            {/* Editor Toolbar */}
            <div className="flex items-center space-x-2 border-b border-zinc-200 bg-zinc-50 p-2 shrink-0 flex-wrap gap-y-2">

                {/* Font Family Selector */}
                <div className="flex items-center space-x-1 mr-2 px-1 border-r border-zinc-300">
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

                <div className="w-px h-5 bg-zinc-300 mx-1"></div>

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

                <div className="w-px h-5 bg-zinc-300 mx-1"></div>

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
            </div>

            {/* Editor Content */}
            <div
                className="flex-1 overflow-y-auto w-full cursor-text bg-transparent"
                onClick={() => {
                    if (!isFocused) {
                        editor.commands.focus();
                        setIsFocused(true);
                    }
                }}
                onBlur={() => setIsFocused(false)}
            >
                <EditorContent editor={editor} className="min-h-full" />
            </div>
        </div>
    );
}
