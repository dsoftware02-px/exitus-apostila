import React, { useState, useEffect } from 'react';
import { Session, Chapter, Book } from '../types';
import { suggestApproach, generateSessionContent, generateQuestion, generateImage } from '../lib/gemini';
import { renderLatexInHtml } from '../lib/latex';
import { buildSlidingWindowPayload } from '../lib/slidingWindow';
import { LAYOUT_OPTIONS, resolveLayoutId } from '../lib/layouts';
import { Sparkles, Anchor, Play, CheckCircle2, Loader2, MessageSquarePlus, Image as ImageIcon, HelpCircle, Maximize2, X, Columns, FileText, Eye, Settings2 } from 'lucide-react';

import { LiveA4Page } from './LiveA4Page';
import { RichEditor } from './RichEditor';

type ViewMode = 'WRITE' | 'SPLIT' | 'PREVIEW';

interface EditorProps {
  book: Book;
  chapter: Chapter | null;
  session: Session | null;
  onUpdateSession: (chapterId: string, sessionId: string, updates: Partial<Session>) => void;
  onUpdateBookLayout: (layoutId: string) => void;
  onDiscussText: (text: string) => void;
}

export function Editor({ book, chapter, session, onUpdateSession, onUpdateBookLayout, onDiscussText }: EditorProps) {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAsset, setIsGeneratingAsset] = useState(false);
  const [expandedField, setExpandedField] = useState<'approach' | 'anchors' | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<ViewMode>('SPLIT');
  const selectedLayoutId = resolveLayoutId(book.layoutId);

  // Auto-suggest approach when a pending session is selected
  useEffect(() => {
    if (session && session.status === 'PENDING' && !session.approach && !isSuggesting) {
      handleSuggestApproach();
    }
  }, [session?.id]);

  const handleSuggestApproach = async () => {
    if (!session || !chapter) return;
    setIsSuggesting(true);
    try {
      // Find previous session content if available
      const sessionIndex = chapter.sessions.findIndex(s => s.id === session.id);
      let prevContent = '';
      if (sessionIndex > 0) {
        prevContent = chapter.sessions[sessionIndex - 1].content;
      }

      const approach = await suggestApproach(session.objective, prevContent);
      onUpdateSession(chapter.id, session.id, { approach });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleGenerate = async () => {
    if (!session || !chapter) return;
    setIsGenerating(true);
    onUpdateSession(chapter.id, session.id, { status: 'GENERATING' });

    try {
      const sessionIndex = chapter.sessions.findIndex(s => s.id === session.id);
      const payload = buildSlidingWindowPayload(chapter, sessionIndex, book.metadata);

      const { content, summary } = await generateSessionContent(payload);

      onUpdateSession(chapter.id, session.id, {
        content,
        summary,
        status: 'PENDING' // Still pending until user approves
      });
    } catch (e) {
      console.error(e);
      onUpdateSession(chapter.id, session.id, { status: 'PENDING' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = () => {
    if (!session || !chapter) return;
    onUpdateSession(chapter.id, session.id, { status: 'VALIDATED' });
  };

  const handleLayoutChange = (layoutId: string) => {
    onUpdateBookLayout(resolveLayoutId(layoutId));
  };

  // Handle text selection for Highlight & Discuss
  const handleMouseUp = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (text && text.length > 10) {
      setSelectedText(text);
      setTooltipPos({ x: e.clientX, y: e.clientY - 40 });
    } else {
      setSelectedText('');
    }
  };

  const handleDiscussClick = () => {
    onDiscussText(selectedText);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
  };

  const handleGenerateQuestion = async () => {
    if (!session || !chapter || !selectedText) return;
    setIsGeneratingAsset(true);
    try {
      const question = await generateQuestion(selectedText, book.metadata.course.rigorLevel);
      // Converter markdown básico da questão para HTML
      const questionHtml = question
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      const renderedQuestionHtml = renderLatexInHtml(questionHtml);
      const newContent = session.content + `\n<hr>\n<h3>Questão Proposta</h3>\n<div>${renderedQuestionHtml}</div>\n`;
      onUpdateSession(chapter.id, session.id, { content: newContent });
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar questão.');
    } finally {
      setIsGeneratingAsset(false);
      setSelectedText('');
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleGenerateImage = async () => {
    if (!session || !chapter || !selectedText) return;
    setIsGeneratingAsset(true);
    try {
      const imageUrl = await generateImage(selectedText);
      if (imageUrl) {
        const newContent = session.content + `\n<figure style="text-align:center;margin:16px 0;">\n  <img src="${imageUrl}" alt="Ilustração Didática" style="max-width:100%;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.10);" />\n  <figcaption class="img-caption">Ilustração gerada por IA com base no texto: "${selectedText.substring(0, 50)}..."</figcaption>\n</figure>\n`;
        onUpdateSession(chapter.id, session.id, { content: newContent });
      } else {
        alert('Não foi possível gerar a imagem.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar imagem.');
    } finally {
      setIsGeneratingAsset(false);
      setSelectedText('');
      window.getSelection()?.removeAllRanges();
    }
  };

  if (!session || !chapter) {
    return (
      <div className="h-full flex items-center justify-center bg-white text-zinc-400">
        Selecione uma sessão no mapa para começar.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white relative">
      {/* Header */}
      <div className="p-6 border-b border-zinc-200 flex justify-between items-start shrink-0">
        <div>
          <div className="flex items-center mb-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              {chapter.title}
            </span>
            {session.status === 'VALIDATED' && (
              <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full ml-3">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Validado
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900">{session.title}</h1>
          <p className="text-sm text-zinc-500 mt-2">Objetivo: {session.objective}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toolbar */}
          {session.content && (
            <div className="flex items-center bg-zinc-100 p-1 rounded-xl shadow-sm border border-zinc-200">
              <button
                onClick={() => setViewMode('WRITE')}
                className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'WRITE' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                title="Modo Foco (Apenas Editor)"
              >
                <FileText className="w-4 h-4 mr-1.5" />
                Escrever
              </button>
              <button
                onClick={() => setViewMode('SPLIT')}
                className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'SPLIT' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                title="Tela Dividida (Editor + A4)"
              >
                <Columns className="w-4 h-4 mr-1.5" />
                Dividido
              </button>
              <button
                onClick={() => setViewMode('PREVIEW')}
                className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'PREVIEW' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                title="Modo Impressão (Apenas A4)"
              >
                <Eye className="w-4 h-4 mr-1.5" />
                Visualizar
              </button>
            </div>
          )}

          <div className="flex items-center bg-zinc-100 p-1 rounded-xl shadow-sm border border-zinc-200">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide px-2">Layout</span>
            <select
              value={selectedLayoutId}
              onChange={(e) => handleLayoutChange(e.target.value)}
              className="bg-white text-sm text-zinc-700 border border-zinc-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-zinc-900"
              title="Escolha um layout visual para a página"
            >
              {LAYOUT_OPTIONS.map((layout) => (
                <option key={layout.id} value={layout.id}>
                  {layout.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex" onMouseUp={handleMouseUp}>
        {session.content ? (
          <>
            {/* Markdown Editor */}
            {(viewMode === 'WRITE' || viewMode === 'SPLIT') && (
              <div className={`h-full flex flex-col ${viewMode === 'SPLIT' ? 'w-1/2 border-r border-zinc-200' : 'w-full mx-auto'}`}>
                <RichEditor
                  content={session.content}
                  onChange={(html) => onUpdateSession(chapter.id, session.id, { content: html })}
                  placeholder="Escreva o conteúdo da sessão aqui (HTML aceito)..."
                />
              </div>
            )}

            {/* Live A4 Preview */}
            {(viewMode === 'PREVIEW' || viewMode === 'SPLIT') && (
              <div className={`h-full ${viewMode === 'SPLIT' ? 'w-1/2' : 'w-full'} bg-zinc-200/50`}>
                <LiveA4Page content={session.content} layoutId={selectedLayoutId} sessionTitle={session.title} />
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-8 mt-8">
              {/* Step 1: Approach */}
              <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="font-medium text-zinc-900">Abordagem Pedagógica</h3>
                  </div>
                  <button
                    onClick={handleSuggestApproach}
                    disabled={isSuggesting || isGenerating}
                    className="text-xs flex items-center text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors font-medium"
                  >
                    {isSuggesting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    {session.approach ? 'Regerar com IA' : 'Sugerir com IA'}
                  </button>
                </div>
                {isSuggesting ? (
                  <div className="flex items-center text-zinc-500 text-sm">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analisando contexto e sugerindo abordagem...
                  </div>
                ) : (
                  <div className="relative group">
                    <textarea
                      className="w-full bg-white border border-zinc-200 rounded-xl p-4 pr-12 text-sm text-zinc-700 outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
                      rows={4}
                      value={session.approach}
                      onChange={(e) => onUpdateSession(chapter.id, session.id, { approach: e.target.value })}
                      placeholder="Descreva como este tópico deve ser ensinado..."
                    />
                    <button
                      onClick={() => setExpandedField('approach')}
                      className="absolute top-3 right-3 p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Expandir"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: Anchors */}
              <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-200">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mr-3">
                    <Anchor className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-zinc-900">Ancorar Conhecimento</h3>
                    <p className="text-xs text-zinc-500">Insira tópicos, anotações ou referências específicas.</p>
                  </div>
                </div>
                <div className="relative group">
                  <textarea
                    className="w-full bg-white border border-zinc-200 rounded-xl p-4 pr-12 text-sm text-zinc-700 outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
                    rows={4}
                    value={session.anchors}
                    onChange={(e) => onUpdateSession(chapter.id, session.id, { anchors: e.target.value })}
                    placeholder="Ex: Não esquecer de mencionar a analogia da caixa d'água para explicar potencial elétrico..."
                  />
                  <button
                    onClick={() => setExpandedField('anchors')}
                    className="absolute top-3 right-3 p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Expandir"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Step 3: Generate */}
              <div className="flex justify-end">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || isSuggesting}
                  className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center shadow-sm"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Gerando Conteúdo...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Gerar Sessão
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {session.content && session.status !== 'VALIDATED' && (
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex justify-end space-x-3">
          <button
            onClick={() => onUpdateSession(chapter.id, session.id, { content: '' })}
            className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Descartar e Refazer
          </button>
          <button
            onClick={handleApprove}
            className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Aprovar Sessão
          </button>
        </div>
      )}

      {/* Highlight Tooltip */}
      {/*selectedText && (
        <div
          className="fixed z-50 bg-zinc-900 text-white px-3 py-2 rounded-lg shadow-xl flex items-center space-x-4 animate-in fade-in slide-in-from-bottom-2"
          style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translate(-50%, -100%)' }}
        >
          <button
            onClick={handleDiscussClick}
            className="flex items-center text-sm font-medium hover:text-blue-300 transition-colors"
          >
            <MessageSquarePlus className="w-4 h-4 mr-1.5" />
            Discutir
          </button>
          <div className="w-px h-4 bg-zinc-700"></div>
          <button
            onClick={handleGenerateQuestion}
            disabled={isGeneratingAsset}
            className="flex items-center text-sm font-medium hover:text-emerald-300 transition-colors disabled:opacity-50"
          >
            {isGeneratingAsset ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <HelpCircle className="w-4 h-4 mr-1.5" />}
            Criar Questão
          </button>
          <div className="w-px h-4 bg-zinc-700"></div>
          <button
            onClick={handleGenerateImage}
            disabled={isGeneratingAsset}
            className="flex items-center text-sm font-medium hover:text-purple-300 transition-colors disabled:opacity-50"
          >
            {isGeneratingAsset ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-1.5" />}
            Gerar Imagem
          </button>
        </div>
      )}/*

      {/* Expanded Textarea Modal */}
      {expandedField && (
        <div className="fixed inset-0 z-100 bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${expandedField === 'approach' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                  {expandedField === 'approach' ? <Sparkles className="w-4 h-4" /> : <Anchor className="w-4 h-4" />}
                </div>
                <h3 className="font-semibold text-zinc-900 text-lg">
                  {expandedField === 'approach' ? 'Abordagem Pedagógica' : 'Ancorar Conhecimento'}
                </h3>
              </div>
              <button
                onClick={() => setExpandedField(null)}
                className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <div className="flex-1 p-6 bg-white">
              <textarea
                className="w-full h-full bg-transparent resize-none outline-none text-zinc-700 text-lg leading-relaxed placeholder:text-zinc-300"
                value={expandedField === 'approach' ? session.approach : session.anchors}
                onChange={(e) => onUpdateSession(chapter.id, session.id, { [expandedField]: e.target.value })}
                placeholder={expandedField === 'approach' ? "Descreva como este tópico deve ser ensinado..." : "Insira tópicos, anotações ou referências específicas..."}
                autoFocus
              />
            </div>
            <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex justify-end">
              <button
                onClick={() => setExpandedField(null)}
                className="bg-zinc-900 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-zinc-800 transition-colors"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
