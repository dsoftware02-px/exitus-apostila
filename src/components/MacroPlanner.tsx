import React, { useState } from 'react';
import { Book, Part, Chapter, Session } from '../types';
import { generateMacroStructure, refineMacroStructure } from '../lib/gemini';
import { 
  Loader2, CheckCircle2, ChevronRight, GripVertical, Sparkles, Wand2, 
  BookOpen, Target, Trophy, ChevronDown, ChevronUp, Users, 
  Building2, ListChecks, Palette, Plus, Trash2, Maximize2, X, FileText, ChevronLeft
} from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'motion/react';

interface MacroPlannerProps {
  book: Book;
  onUpdateBook: (book: Book) => void;
  onApprove: () => void;
  onBack: () => void;
}

export function MacroPlanner({ book, onUpdateBook, onApprove, onBack }: MacroPlannerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [showFullContext, setShowFullContext] = useState(false);
  const [showPacModal, setShowPacModal] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState('');
  
  const [selectedChapter, setSelectedChapter] = useState<{ partId: string, chapter: Chapter } | null>(null);


  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      let parts = await generateMacroStructure(book.metadata);
      // Automatically assign initial tags
      const { assignSectionTags } = await import('../lib/gemini');
      parts = await assignSectionTags(book.metadata, parts);
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

  const updateSession = async (pId: string, cId: string, sId: string, field: 'title' | 'objective', value: string) => {
    const updatedParts = book.parts.map(p => p.id === pId ? {
      ...p,
      chapters: p.chapters.map(c => c.id === cId ? {
        ...c,
        sessions: c.sessions.map(s => s.id === sId ? { ...s, [field]: value } : s)
      } : c)
    } : p);

    onUpdateBook({
      ...book,
      parts: updatedParts
    });

    // Re-analyze tags after modification
    if (value.length > 10) { // Tiny delay or check to avoid constant calls
      const { assignSectionTags } = await import('../lib/gemini');
      const partsWithNewTags = await assignSectionTags(book.metadata, updatedParts);
      onUpdateBook({ ...book, parts: partsWithNewTags });
    }
  };

  const addPart = () => {
    const newPart: Part = {
      id: crypto.randomUUID(),
      title: 'Nova Unidade',
      chapters: []
    };
    onUpdateBook({ ...book, parts: [...book.parts, newPart] });
  };

  const removePart = (pId: string) => {
    if (!confirm('Tem certeza que deseja remover esta unidade?')) return;
    onUpdateBook({ ...book, parts: book.parts.filter(p => p.id !== pId) });
  };

  const addChapter = (pId: string) => {
    const newChapter: Chapter = {
      id: crypto.randomUUID(),
      title: 'Novo Capítulo',
      objective: '',
      sessions: [],
      status: 'draft'
    };
    onUpdateBook({
      ...book,
      parts: book.parts.map(p => p.id === pId ? { ...p, chapters: [...p.chapters, newChapter] } : p)
    });
  };

  const removeChapter = (pId: string, cId: string) => {
    if (!confirm('Remover este capítulo?')) return;
    onUpdateBook({
      ...book,
      parts: book.parts.map(p => p.id === pId ? { ...p, chapters: p.chapters.filter(c => c.id !== cId) } : p)
    });
  };

  const addSession = async (pId: string, cId: string) => {
    const newSession: Session = {
      id: crypto.randomUUID(),
      title: 'Nova Sessão',
      objective: '',
      status: 'PENDING',
      content: '',
      summary: '',
      approach: '',
      anchors: '',
      entities: [],
      pacObjectives: []
    };
    
    const updatedParts = book.parts.map(p => p.id === pId ? {
      ...p,
      chapters: p.chapters.map(c => c.id === cId ? { ...c, sessions: [...c.sessions, newSession] } : c)
    } : p);

    onUpdateBook({
      ...book,
      parts: updatedParts
    });

    // Automatically assign tags for new session
    const { assignSectionTags } = await import('../lib/gemini');
    const partsWithNewTags = await assignSectionTags(book.metadata, updatedParts);
    onUpdateBook({ ...book, parts: partsWithNewTags });
  };

  const removeSession = (pId: string, cId: string, sId: string) => {
    onUpdateBook({
      ...book,
      parts: book.parts.map(p => p.id === pId ? {
        ...p,
        chapters: p.chapters.map(c => c.id === cId ? { ...c, sessions: c.sessions.filter(s => s.id !== sId) } : c)
      } : p)
    });
  };

  const reorderParts = (newParts: Part[]) => {
    onUpdateBook({ ...book, parts: newParts });
  };

  const reorderChapters = (pId: string, newChapters: Chapter[]) => {
    onUpdateBook({
      ...book,
      parts: book.parts.map(p => p.id === pId ? { ...p, chapters: newChapters } : p)
    });
  };

  const reorderSessions = (pId: string, cId: string, newSessions: Session[]) => {
    onUpdateBook({
      ...book,
      parts: book.parts.map(p => p.id === pId ? {
        ...p,
        chapters: p.chapters.map(c => c.id === cId ? { ...c, sessions: newSessions } : c)
      } : p)
    });
  };

  const AutoExpandingTextarea = ({ value, onChange, label, placeholder, className = "" }: any) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    React.useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      }
    }, [value]);

    return (
      <div className="flex items-start">
        {label && <span className="text-zinc-400 mr-2 text-xs mt-2 w-16 text-right shrink-0">{label}:</span>}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={1}
            className={`w-full bg-transparent border border-transparent hover:border-zinc-300 focus:border-zinc-400 focus:bg-white rounded px-2 py-1 text-sm text-zinc-600 outline-none transition-all resize-none overflow-hidden ${className}`}
          />
        </div>
      </div>
    );
  };

  const LocalRefineIA = ({ onRefine, placeholder = "Como você quer refinar este item?" }: { onRefine: (p: string) => void, placeholder?: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLocalRefine = async () => {
      if (!prompt.trim()) return;
      setLoading(true);
      try {
        await onRefine(prompt);
        setPrompt('');
        setIsOpen(false);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`p-1.5 rounded-lg transition-all ${isOpen ? 'bg-blue-100 text-blue-600' : 'text-zinc-400 hover:text-blue-500 hover:bg-blue-50'}`}
          title="Refinar com IA"
        >
          <Wand2 className="w-4 h-4" />
        </button>
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-blue-100 p-3 z-50"
              >
                <textarea
                  autoFocus
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-zinc-50 border border-blue-100 rounded-lg p-2 text-xs text-zinc-700 outline-none focus:ring-2 focus:ring-blue-500 mb-2 resize-none"
                  rows={3}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleLocalRefine()}
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-1 text-[10px] font-bold text-zinc-400 hover:text-zinc-600 uppercase"
                  >
                    Cancelar
                  </button>
                  <button 
                    disabled={loading || !prompt.trim()}
                    onClick={handleLocalRefine}
                    className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Refinar
                  </button>
                </div>
              </motion.div>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const PacViewModal = () => {
    if (!book.metadata.pacContent) return null;
    
    // Parse the CSV/pipe separated content
    const lines = book.metadata.pacContent.split('\n').filter(line => line.trim().length > 0);
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim()));

    return (
      <AnimatePresence>
        {showPacModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPacModal(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-6xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-zinc-900">Plano Anual do Curso (PAC) importado</h3>
                </div>
                <button 
                  onClick={() => setShowPacModal(false)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-0 bg-white">
                <table className="w-full text-left text-sm text-zinc-600">
                  <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0">
                    <tr>
                      {headers.map((header, i) => (
                        <th key={i} className="px-4 py-3 font-semibold text-zinc-900 whitespace-nowrap">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-zinc-50/50 transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-3 max-w-[400px] whitespace-pre-wrap break-words align-top text-sm">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={headers.length || 1} className="px-4 py-8 text-center text-zinc-400">
                          Conteúdo indisponível ou em formato não tabular.
                          <div className="mt-4 max-w-2xl mx-auto whitespace-pre-wrap text-left bg-zinc-50 p-4 rounded-lg border border-zinc-100 font-mono text-xs">{book.metadata.pacContent}</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  const chapterStartIndices = React.useMemo(() => {
    let count = 0;
    return book.parts.map(p => {
      const start = count;
      count += p.chapters.length;
      return start;
    });
  }, [book.parts]);

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
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-all flex items-center border border-zinc-200 bg-white shadow-sm"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Voltar ao Setup
            </button>
            <button
              onClick={onApprove}
              className="bg-zinc-900 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-zinc-800 transition-colors flex items-center shadow-sm"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Aprovar Estrutura Macro
            </button>
          </div>
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
            <div className="flex-1 flex justify-end gap-3">
              {book.metadata.pacContent && (
                <button
                  onClick={() => setShowPacModal(true)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center transition-colors bg-blue-50 px-3 py-1.5 rounded-lg"
                >
                  <FileText className="w-3.5 h-3.5 mr-1" />
                  Ver PAC Original
                </button>
              )}
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

        {/* Estrutura Editável */}
        <div className="flex flex-col gap-6 w-full">
            <Reorder.Group axis="y" values={book.parts} onReorder={reorderParts} className="space-y-6">
              {book.parts.map((part, pIdx) => (
                <Reorder.Item 
                  key={part.id} 
                  value={part}
                  className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden"
                >
                  <div className="bg-zinc-100/50 px-4 py-3 border-b border-zinc-200 flex items-center group">
                    <GripVertical className="w-5 h-5 text-zinc-400 mr-2 cursor-grab shrink-0" />
                    <span className="font-medium text-zinc-500 mr-2 shrink-0">{book.metadata.style.structureLevel1 || 'Parte'} {pIdx + 1}:</span>
                    <input
                      value={part.title}
                      onChange={(e) => updatePart(part.id, e.target.value)}
                      className="flex-1 bg-transparent border border-transparent hover:border-zinc-300 focus:border-zinc-400 focus:bg-white rounded px-2 py-1 font-medium text-zinc-900 outline-none transition-colors"
                    />
                    <div className="flex items-center gap-1 ml-2">
                       <LocalRefineIA 
                        onRefine={(p) => refineMacroStructure(book.parts, book.metadata, `No módulo "${part.title}": ${p}`).then(parts => onUpdateBook({...book, parts}))} 
                        placeholder="Ex: Torne esta unidade mais focada em prática..." 
                      />
                      <button 
                        onClick={() => removePart(part.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <Reorder.Group axis="y" values={part.chapters} onReorder={(newChapters) => reorderChapters(part.id, newChapters)} className="space-y-6">
                      {part.chapters.map((chapter, cIdx) => (
                        <Reorder.Item 
                          key={chapter.id} 
                          value={chapter}
                          className="border border-zinc-100 rounded-2xl p-4 bg-zinc-50/50 relative group"
                        >
                          <div className="flex items-start mb-4">
                            <div className="mt-2 mr-2 text-zinc-300 shrink-0 cursor-grab">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center flex-1">
                                  <span className="font-medium text-zinc-400 mr-2 text-sm">{book.metadata.style.structureLevel2 || 'Capítulo'} {chapterStartIndices[pIdx] + cIdx + 1}:</span>
                                  <input
                                    value={chapter.title}
                                    onChange={(e) => updateChapter(part.id, chapter.id, 'title', e.target.value)}
                                    className="flex-1 bg-transparent border border-transparent hover:border-zinc-300 focus:border-zinc-400 focus:bg-white rounded px-2 py-1 font-semibold text-zinc-900 outline-none transition-colors mr-4"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setSelectedChapter({ partId: part.id, chapter })}
                                    className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    title="Expandir capítulo"
                                  >
                                    <Maximize2 className="w-4 h-4" />
                                  </button>
                                  <LocalRefineIA 
                                    onRefine={(p) => refineMacroStructure(book.parts, book.metadata, `No capítulo "${chapter.title}": ${p}`).then(parts => onUpdateBook({...book, parts}))}
                                    placeholder="Ex: Mude este capítulo para ser mais introdutório..."
                                  />
                                  <button 
                                    onClick={() => removeChapter(part.id, chapter.id)}
                                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              
                              <AutoExpandingTextarea 
                                value={chapter.objective}
                                onChange={(val: string) => updateChapter(part.id, chapter.id, 'objective', val)}
                                label="Objetivo"
                                placeholder="Descreva o que o aluno deve aprender neste capítulo..."
                              />
                            </div>
                          </div>
                          
                          <div className="ml-8 pl-4 border-l-2 border-zinc-200 space-y-3">
                            <Reorder.Group axis="y" values={chapter.sessions} onReorder={(newSessions) => reorderSessions(part.id, chapter.id, newSessions)} className="space-y-3">
                              {chapter.sessions.map((session, sIdx) => (
                                <Reorder.Item 
                                  key={session.id} 
                                  value={session}
                                  className="bg-white p-3 rounded-xl border border-zinc-100 shadow-sm flex items-start group/session"
                                >
                                  <div className="w-6 h-6 rounded bg-zinc-50 text-zinc-400 flex items-center justify-center shrink-0 mt-1 cursor-grab">
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="flex-1 space-y-2 ml-1">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center flex-1">
                                        <span className="text-[10px] uppercase font-bold text-zinc-400 mr-2">{sIdx + 1}</span>
                                          <input
                                            value={session.title}
                                            onChange={(e) => updateSession(part.id, chapter.id, session.id, 'title', e.target.value)}
                                            className="w-full bg-transparent border border-transparent hover:border-zinc-300 focus:border-zinc-400 focus:bg-zinc-50 rounded px-2 py-0.5 text-sm font-medium text-zinc-800 outline-none transition-colors"
                                            placeholder="Título da Sessão"
                                          />
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <LocalRefineIA 
                                            onRefine={(p) => refineMacroStructure(book.parts, book.metadata, `Na sessão "${session.title}" (Cap. ${chapter.title}): ${p}`).then(parts => onUpdateBook({...book, parts}))}
                                            placeholder="Ex: Melhore o objetivo desta sessão..."
                                          />
                                          <button 
                                            onClick={() => removeSession(part.id, chapter.id, session.id)}
                                            className="opacity-0 group-hover/session:opacity-100 p-1 text-zinc-300 hover:text-red-500 transition-all"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    <AutoExpandingTextarea 
                                      value={session.objective}
                                      onChange={(val: string) => updateSession(part.id, chapter.id, session.id, 'objective', val)}
                                      label="Objetivo"
                                      placeholder="O que será abordado?"
                                    />
                                    {session.pacObjectives && session.pacObjectives.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mt-2 pl-[4.5rem]">
                                        {session.pacObjectives.map((obj, oIdx) => (
                                          <span key={oIdx} className="bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center line-clamp-1 max-w-full" title={obj}>
                                            <Target className="w-3 h-3 mr-1 shrink-0" />
                                            <span className="truncate">{obj}</span>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </Reorder.Item>
                              ))}
                            </Reorder.Group>
                            <button
                              onClick={() => addSession(part.id, chapter.id)}
                              className="w-full py-2 border-2 border-dashed border-zinc-100 rounded-xl text-zinc-400 text-xs font-medium hover:border-zinc-300 hover:text-zinc-600 hover:bg-white transition-all flex items-center justify-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Adicionar Sessão
                            </button>
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                    <button
                      onClick={() => addChapter(part.id)}
                      className="w-full mt-4 py-3 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-500 font-medium hover:border-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Novo Capítulo
                    </button>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
            
            <button
              onClick={addPart}
              className="w-full py-6 border-2 border-dashed border-zinc-300 rounded-3xl text-zinc-400 font-bold text-lg hover:border-zinc-500 hover:text-zinc-700 hover:bg-zinc-100/50 transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              Clique para adicionar uma nova Unidade/Parte
            </button>
        </div>
      </div>

      {/* Chapter Detail Modal */}
      <AnimatePresence>
        {selectedChapter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedChapter(null)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex-1 mr-4">
                  <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    Edição Detalhada do Capítulo
                  </div>
                  <input
                    value={selectedChapter.chapter.title}
                    onChange={(e) => {
                      updateChapter(selectedChapter.partId, selectedChapter.chapter.id, 'title', e.target.value);
                      setSelectedChapter({
                        ...selectedChapter,
                        chapter: { ...selectedChapter.chapter, title: e.target.value }
                      });
                    }}
                    className="text-2xl font-bold text-zinc-900 bg-transparent border-none focus:ring-0 w-full p-0"
                  />
                </div>
                <button 
                  onClick={() => setSelectedChapter(null)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-zinc-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Objetivo Pedagógico do Capítulo
                    </h3>
                  </div>
                  <AutoExpandingTextarea
                    value={selectedChapter.chapter.objective}
                    onChange={(val: string) => {
                      updateChapter(selectedChapter.partId, selectedChapter.chapter.id, 'objective', val);
                      setSelectedChapter({
                        ...selectedChapter,
                        chapter: { ...selectedChapter.chapter, objective: val }
                      });
                    }}
                    className="text-blue-800 leading-relaxed !p-0"
                    placeholder="Defina o objective principal deste capítulo..."
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-zinc-400" />
                    Sessões e Estrutura de Aula
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {selectedChapter.chapter.sessions.map((session, idx) => (
                      <div key={session.id} className="p-5 border border-zinc-100 rounded-2xl bg-zinc-50/30 flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-zinc-100 shadow-sm flex items-center justify-center font-bold text-zinc-400 shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 space-y-2">
                          <input
                            value={session.title}
                            onChange={(e) => {
                              updateSession(selectedChapter.partId, selectedChapter.chapter.id, session.id, 'title', e.target.value);
                              const newSessions = [...selectedChapter.chapter.sessions];
                              newSessions[idx] = { ...session, title: e.target.value };
                              setSelectedChapter({
                                ...selectedChapter,
                                chapter: { ...selectedChapter.chapter, sessions: newSessions }
                              });
                            }}
                            className="font-bold text-zinc-900 text-lg bg-transparent border-none focus:ring-0 w-full p-0"
                          />
                          <AutoExpandingTextarea
                            value={session.objective}
                            onChange={(val: string) => {
                              updateSession(selectedChapter.partId, selectedChapter.chapter.id, session.id, 'objective', val);
                              const newSessions = [...selectedChapter.chapter.sessions];
                              newSessions[idx] = { ...session, objective: val };
                              setSelectedChapter({
                                ...selectedChapter,
                                chapter: { ...selectedChapter.chapter, sessions: newSessions }
                              });
                            }}
                            className="text-zinc-600 text-sm leading-relaxed !p-0"
                            placeholder="Objetivo da sessão..."
                          />
                          {session.pacObjectives && session.pacObjectives.length > 0 && (
                            <div className="flex flex-col gap-1.5 mt-2">
                              <span className="text-[10px] uppercase font-bold text-blue-600">Objetivos Relacionados:</span>
                              {session.pacObjectives.map((obj: string, oIdx: number) => (
                                <div key={oIdx} className="bg-blue-50 border border-blue-100 text-blue-700 text-xs px-2.5 py-1.5 rounded-lg flex items-start">
                                  <Target className="w-3.5 h-3.5 mr-1.5 shrink-0 mt-0.5" />
                                  <span>{obj}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {selectedChapter.chapter.sessions.length === 0 && (
                      <div className="text-center py-12 text-zinc-400 border-2 border-dashed border-zinc-100 rounded-2xl">
                        Nenhuma sessão cadastrada.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-8 py-4 border-t border-zinc-100 flex justify-end bg-zinc-50/50">
                <button 
                  onClick={() => setSelectedChapter(null)}
                  className="bg-zinc-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200"
                >
                  Salvar e Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PacViewModal />
    </div>
  );
}
