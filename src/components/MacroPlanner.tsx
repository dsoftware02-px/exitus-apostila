import React, { useState } from 'react';
import { Book, Part, Chapter } from '../types';
import { generateMacroStructure, refineMacroStructure } from '../lib/gemini';
import { Loader2, CheckCircle2, ChevronRight, GripVertical, Sparkles, Wand2, BookOpen, Target, Trophy, ChevronDown, ChevronUp, Users, Building2, BrainCircuit, ListChecks, CheckSquare, Square, Palette } from 'lucide-react';

interface MacroPlannerProps {
  book: Book;
  onUpdateBook: (book: Book) => void;
  onApprove: () => void;
}

export function MacroPlanner({ book, onUpdateBook, onApprove }: MacroPlannerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [showFullContext, setShowFullContext] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState('');
  
  // BNCC Coverage State
  const guidelinesList = book.metadata.discipline.learningObjectives.split('\n').filter(g => g.trim().length > 0);
  const [coveredGuidelines, setCoveredGuidelines] = useState<Record<number, boolean>>({});

  const toggleGuideline = (index: number) => {
    setCoveredGuidelines(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const updateChapterStatus = (pId: string, cId: string, status: Chapter['status']) => {
    onUpdateBook({
      ...book,
      parts: book.parts.map(p => p.id === pId ? {
        ...p,
        chapters: p.chapters.map(c => c.id === cId ? { ...c, status } : c)
      } : p)
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const parts = await generateMacroStructure(book.metadata);
      onUpdateBook({ ...book, parts });
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar estrutura.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!refinePrompt.trim()) return;
    setIsRefining(true);
    try {
      const parts = await refineMacroStructure(book.parts, book.metadata, refinePrompt);
      onUpdateBook({ ...book, parts });
      setRefinePrompt('');
    } catch (error) {
      console.error(error);
      alert('Erro ao refinar estrutura.');
    } finally {
      setIsRefining(false);
    }
  };

  const updatePart = (pId: string, title: string) => {
    onUpdateBook({
      ...book,
      parts: book.parts.map(p => p.id === pId ? { ...p, title } : p)
    });
  };

  const updateChapter = (pId: string, cId: string, field: 'title' | 'objective', value: string) => {
    onUpdateBook({
      ...book,
      parts: book.parts.map(p => p.id === pId ? {
        ...p,
        chapters: p.chapters.map(c => c.id === cId ? { ...c, [field]: value } : c)
      } : p)
    });
  };

  const updateSession = (pId: string, cId: string, sId: string, field: 'title' | 'objective', value: string) => {
    onUpdateBook({
      ...book,
      parts: book.parts.map(p => p.id === pId ? {
        ...p,
        chapters: p.chapters.map(c => c.id === cId ? {
          ...c,
          sessions: c.sessions.map(s => s.id === sId ? { ...s, [field]: value } : s)
        } : c)
      } : p)
    });
  };

  if (book.parts.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className={`w-8 h-8 text-zinc-400 ${isGenerating ? 'animate-spin' : ''}`} />
          </div>
          <h2 className="text-2xl font-semibold text-zinc-900 mb-2">Estrutura Macro</h2>
          <p className="text-zinc-500 mb-8">
            O EduCopilot irá gerar uma proposta de índice baseada na disciplina de {book.metadata.discipline.subject} para o {book.metadata.discipline.grade}.
          </p>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Gerando Espinha de Peixe...
              </>
            ) : (
              'Gerar Estrutura'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-zinc-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Índice Proposto</h1>
            <p className="text-zinc-500 text-sm mt-1">Revise, edite livremente ou peça ajuda à IA para refinar a estrutura.</p>
          </div>
          <button
            onClick={onApprove}
            className="bg-zinc-900 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-zinc-800 transition-colors flex items-center shadow-sm"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Aprovar Estrutura Macro
          </button>
        </div>

        {/* Metadados */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 mb-6">
          <div className="flex flex-wrap gap-6 items-center text-sm">
            <div className="flex items-center text-zinc-700">
              <BookOpen className="w-4 h-4 mr-2 text-zinc-400" />
              <span className="font-medium mr-1">Disciplina:</span> {book.metadata.discipline.subject}
            </div>
            <div className="flex items-center text-zinc-700">
              <Target className="w-4 h-4 mr-2 text-zinc-400" />
              <span className="font-medium mr-1">Série:</span> {book.metadata.discipline.grade}
            </div>
            <div className="flex items-center text-zinc-700">
              <Sparkles className="w-4 h-4 mr-2 text-zinc-400" />
              <span className="font-medium mr-1">Perfil:</span> {book.metadata.institutional.pedagogicalEthos}
            </div>
            <div className="flex items-center text-zinc-700">
              <Trophy className="w-4 h-4 mr-2 text-zinc-400" />
              <span className="font-medium mr-1">Rigor:</span> {book.metadata.course.rigorLevel}
            </div>
            <div className="flex-1 flex justify-end">
              <button 
                onClick={() => setShowFullContext(!showFullContext)}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-900 flex items-center transition-colors"
              >
                {showFullContext ? 'Ocultar Contexto' : 'Ver Contexto Completo'}
                {showFullContext ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
              </button>
            </div>
          </div>

          {showFullContext && (
            <div className="mt-6 pt-6 border-t border-zinc-100 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-zinc-900 flex items-center mb-1">
                    <Building2 className="w-4 h-4 mr-1.5 text-zinc-400" /> Contexto Institucional
                  </h4>
                  <p className="text-zinc-600"><span className="font-medium">PPP:</span> {book.metadata.institutional.pppContext}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 flex items-center mb-1">
                    <Users className="w-4 h-4 mr-1.5 text-zinc-400" /> Perfil do Aluno
                  </h4>
                  <p className="text-zinc-600 mb-1"><span className="font-medium">Público-Alvo:</span> {book.metadata.course.targetAudience}</p>
                  <p className="text-zinc-600"><span className="font-medium">Maturidade:</span> {book.metadata.course.cognitiveMaturity}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-zinc-900 flex items-center mb-1">
                    <ListChecks className="w-4 h-4 mr-1.5 text-zinc-400" /> Escopo e Objetivos
                  </h4>
                  <p className="text-zinc-600 mb-2"><span className="font-medium">Objetivos:</span> {book.metadata.discipline.learningObjectives}</p>
                  <p className="text-zinc-600"><span className="font-medium">Metodologia:</span> {book.metadata.discipline.methodology}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 flex items-center mb-1">
                    <Palette className="w-4 h-4 mr-1.5 text-zinc-400" /> Estética do Material
                  </h4>
                  <p className="text-zinc-600 mb-1"><span className="font-medium">Tom Visual:</span> {book.metadata.visual.visualTone}</p>
                  <p className="text-zinc-600 mb-1"><span className="font-medium">Imagens:</span> {book.metadata.visual.imageStyle} ({book.metadata.visual.imageDensity})</p>
                  <p className="text-zinc-600"><span className="font-medium">Layout:</span> {book.metadata.visual.layoutStyle}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Refinar com IA */}
        <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-5 mb-8 flex gap-4 items-start">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Wand2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-blue-900 mb-1">Refinar com IA</h3>
            <p className="text-sm text-blue-700 mb-3">Quer adicionar um capítulo? Mudar o foco de alguma sessão? Peça para a IA ajustar o índice inteiro.</p>
            <div className="flex gap-3">
              <input
                type="text"
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                placeholder="Ex: Adicione um capítulo sobre Física Moderna no final..."
                className="flex-1 px-4 py-2 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
              />
              <button
                onClick={handleRefine}
                disabled={isRefining || !refinePrompt.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {isRefining ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Atualizar Índice
              </button>
            </div>
          </div>
        </div>

        {/* Estrutura Editável & BNCC Panel */}
        <div className="flex gap-6 items-start">
          <div className="flex-1 space-y-6">
            {book.parts.map((part, pIdx) => (
              <div key={part.id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="bg-zinc-100/50 px-4 py-3 border-b border-zinc-200 flex items-center">
                  <GripVertical className="w-5 h-5 text-zinc-400 mr-2 cursor-grab shrink-0" />
                  <span className="font-medium text-zinc-500 mr-2">{book.metadata.style.structureLevel1 || 'Parte'} {pIdx + 1}:</span>
                  <input
                    value={part.title}
                    onChange={(e) => updatePart(part.id, e.target.value)}
                    className="flex-1 bg-transparent border border-transparent hover:border-zinc-300 focus:border-zinc-400 focus:bg-white rounded px-2 py-1 font-medium text-zinc-900 outline-none transition-colors"
                  />
                </div>
                <div className="p-6 space-y-6">
                  {part.chapters.map((chapter, cIdx) => (
                    <div key={chapter.id} className="border border-zinc-100 rounded-xl p-4 bg-zinc-50/50">
                      <div className="flex items-start mb-4">
                        <div className="mt-2 mr-2 text-zinc-400 shrink-0">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center flex-1">
                              <span className="font-medium text-zinc-500 mr-2 text-sm">{book.metadata.style.structureLevel2 || 'Capítulo'} {cIdx + 1}:</span>
                              <input
                                value={chapter.title}
                                onChange={(e) => updateChapter(part.id, chapter.id, 'title', e.target.value)}
                                className="flex-1 bg-transparent border border-transparent hover:border-zinc-300 focus:border-zinc-400 focus:bg-white rounded px-2 py-1 font-medium text-zinc-900 outline-none transition-colors"
                              />
                            </div>
                            <select
                              value={chapter.status || 'draft'}
                              onChange={(e) => updateChapterStatus(part.id, chapter.id, e.target.value as Chapter['status'])}
                              className={`ml-4 text-xs font-medium px-2.5 py-1 rounded-lg border outline-none transition-colors ${
                                chapter.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                chapter.status === 'review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-zinc-100 text-zinc-600 border-zinc-200'
                              }`}
                            >
                              <option value="draft">Rascunho</option>
                              <option value="review">Em Revisão</option>
                              <option value="approved">Aprovado</option>
                            </select>
                          </div>
                        <div className="flex items-start">
                          <span className="text-zinc-400 mr-2 text-xs mt-2 w-16 text-right">Objetivo:</span>
                          <textarea
                            value={chapter.objective}
                            onChange={(e) => updateChapter(part.id, chapter.id, 'objective', e.target.value)}
                            rows={2}
                            className="flex-1 bg-transparent border border-transparent hover:border-zinc-300 focus:border-zinc-400 focus:bg-white rounded px-2 py-1 text-sm text-zinc-600 outline-none transition-colors resize-none"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-8 pl-4 border-l-2 border-zinc-200 space-y-3">
                      {chapter.sessions.map((session, sIdx) => (
                        <div key={session.id} className="bg-white p-3 rounded-xl border border-zinc-100 shadow-sm flex items-start">
                          <span className="w-6 h-6 rounded bg-zinc-100 text-zinc-500 flex items-center justify-center text-xs font-medium mr-3 shrink-0 mt-1">
                            {sIdx + 1}
                          </span>
                          <div className="flex-1 space-y-2">
                            <input
                              value={session.title}
                              onChange={(e) => updateSession(part.id, chapter.id, session.id, 'title', e.target.value)}
                              className="w-full bg-transparent border border-transparent hover:border-zinc-300 focus:border-zinc-400 focus:bg-zinc-50 rounded px-2 py-1 text-sm font-medium text-zinc-800 outline-none transition-colors"
                              placeholder="Título da Sessão"
                            />
                            <div className="flex items-start">
                              <span className="text-zinc-400 mr-2 text-xs mt-1.5">Objetivo:</span>
                              <input
                                value={session.objective}
                                onChange={(e) => updateSession(part.id, chapter.id, session.id, 'objective', e.target.value)}
                                className="flex-1 bg-transparent border border-transparent hover:border-zinc-300 focus:border-zinc-400 focus:bg-zinc-50 rounded px-2 py-1 text-xs text-zinc-500 outline-none transition-colors"
                                placeholder="Objetivo da Sessão"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          </div>

          {/* BNCC Coverage Panel */}
          <div className="w-80 shrink-0 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden sticky top-6">
            <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-medium text-white flex items-center text-sm">
                <Target className="w-4 h-4 mr-2 text-blue-400" />
                Matriz de Cobertura
              </h3>
              <span className="text-xs font-medium bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">
                {Object.values(coveredGuidelines).filter(Boolean).length} / {guidelinesList.length}
              </span>
            </div>
            <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <p className="text-xs text-zinc-500 mb-4">
                Marque as diretrizes (BNCC) que já foram contempladas na estrutura ao lado.
              </p>
              {guidelinesList.length > 0 ? (
                <div className="space-y-3">
                  {guidelinesList.map((guideline, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                        coveredGuidelines[idx] ? 'bg-emerald-50 border-emerald-100' : 'bg-zinc-50 border-zinc-100 hover:border-zinc-200'
                      }`}
                      onClick={() => toggleGuideline(idx)}
                    >
                      <button className={`mt-0.5 shrink-0 ${coveredGuidelines[idx] ? 'text-emerald-600' : 'text-zinc-400'}`}>
                        {coveredGuidelines[idx] ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                      <span className={`text-xs leading-relaxed ${coveredGuidelines[idx] ? 'text-emerald-800 line-through opacity-70' : 'text-zinc-700'}`}>
                        {guideline.replace(/^[-*]\s*/, '')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-400 text-sm">
                  Nenhuma diretriz cadastrada no Setup.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
