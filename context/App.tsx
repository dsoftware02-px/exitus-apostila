/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, 
  Upload, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  FileText, 
  Settings, 
  Layout, 
  PenTool, 
  Download,
  Save,
  Plus,
  Trash2,
  GripVertical,
  AlertCircle,
  Sparkles,
  Printer,
  Eye,
  Info
} from "lucide-react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { BookPDF } from "./components/BookPDF";
import { PACPDF } from "./components/PACPDF";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { Course, TextbookProject, Unit, Chapter, Topic, PACAnalysis, Suggestion } from "./types";
import { analyzePAC, generateIndex, generateUnitContent, generateChapterContent, generateTopicContent } from "./services/gemini";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COURSES: Course[] = [
  "Infantil 1", "Infantil 2", "Infantil 3",
  "1º Ano/EF", "2º Ano/EF", "3º Ano/EF", "4º Ano/EF", "5º Ano/EF",
  "6º Ano/EF", "7º Ano/EF", "8º Ano/EF", "9º Ano/EF",
  "1ª Série/EM", "2ª Série/EM", "3ª Série/EM"
];

export default function App() {
  const [step, setStep] = useState(1);
  const [project, setProject] = useState<TextbookProject>({
    institution: "",
    course: "1º Ano/EF",
    discipline: "",
    units: []
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingIndex, setIsGeneratingIndex] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [activeUnitIndex, setActiveUnitIndex] = useState(0);
  const [showImprovedPAC, setShowImprovedPAC] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Persistence: Load from localStorage on mount
  React.useEffect(() => {
    const savedProject = localStorage.getItem("edueditor_project");
    const savedStep = localStorage.getItem("edueditor_step");
    if (savedProject) {
      try {
        setProject(JSON.parse(savedProject));
      } catch (e) {
        console.error("Failed to parse saved project", e);
      }
    }
    if (savedStep) {
      setStep(parseInt(savedStep, 10));
    }
  }, []);

  // Persistence: Save to localStorage on change
  React.useEffect(() => {
    localStorage.setItem("edueditor_project", JSON.stringify(project));
    localStorage.setItem("edueditor_step", step.toString());
  }, [project, step]);

  const handleSaveProject = () => {
    setSaveStatus("saving");
    localStorage.setItem("edueditor_project", JSON.stringify(project));
    localStorage.setItem("edueditor_step", step.toString());
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 800);
  };

  const handleNewProject = () => {
    setProject({
      institution: "",
      discipline: "",
      course: "1º Ano/EF",
      pacContent: "",
      units: [],
    });
    setStep(1);
    localStorage.removeItem("edueditor_project");
    localStorage.removeItem("edueditor_step");
    setShowResetConfirm(false);
  };

  const handleNext = () => setStep(s => Math.min(s + 1, 5));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const updateProject = (updates: Partial<TextbookProject>) => {
    setProject(prev => ({ ...prev, ...updates }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      updateProject({ pacContent: text });
      
      setIsAnalyzing(true);
      setError(null);
      try {
        const analysis = await analyzePAC(text, project.course, project.discipline);
        updateProject({ analysis });
      } catch (err: any) {
        console.error("Erro na análise:", err);
        if (err?.message?.includes("429") || err?.status === 429) {
          setError("Limite de cota atingido. Por favor, aguarde um momento e tente novamente.");
        } else {
          setError("Ocorreu um erro ao analisar o PAC. Verifique o arquivo e tente novamente.");
        }
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsText(file);
  };

  const handleGenerateIndex = async () => {
    if (!project.pacContent) return;
    setIsGeneratingIndex(true);
    setError(null);
    try {
      const units = await generateIndex(project.pacContent, project.course, project.discipline);
      updateProject({ units });
      handleNext();
    } catch (err: any) {
      console.error("Erro ao gerar índice:", err);
      if (err?.message?.includes("429") || err?.status === 429) {
        setError("Limite de cota atingido ao gerar o índice. Tente novamente em instantes.");
      } else {
        setError("Erro ao gerar a estrutura do livro. Tente novamente.");
      }
    } finally {
      setIsGeneratingIndex(false);
    }
  };

  const handleGenerateContent = async (index: number) => {
    setIsGeneratingContent(true);
    setError(null);
    try {
      const content = await generateUnitContent(project.units[index], project.course, project.discipline);
      const newUnits = [...project.units];
      newUnits[index] = { ...newUnits[index], content };
      updateProject({ units: newUnits });
    } catch (err: any) {
      console.error("Erro ao gerar conteúdo:", err);
      if (err?.message?.includes("429") || err?.status === 429) {
        setError("Limite de cota atingido ao gerar o conteúdo. Tente novamente em instantes.");
      } else {
        setError("Erro ao gerar o conteúdo da unidade.");
      }
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleGenerateChapterContent = async (uIdx: number, cIdx: number) => {
    setIsGeneratingContent(true);
    setError(null);
    try {
      const chapter = project.units[uIdx].chapters[cIdx];
      const content = await generateChapterContent(chapter, project.course, project.discipline);
      const newUnits = [...project.units];
      const currentContent = newUnits[uIdx].content || "";
      newUnits[uIdx].content = currentContent + (currentContent ? "<hr/>" : "") + content;
      updateProject({ units: newUnits });
    } catch (err: any) {
      console.error("Erro ao gerar conteúdo do capítulo:", err);
      setError("Erro ao gerar o conteúdo do capítulo.");
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleGenerateTopicContent = async (uIdx: number, cIdx: number, tIdx: number) => {
    setIsGeneratingContent(true);
    setError(null);
    try {
      const chapter = project.units[uIdx].chapters[cIdx];
      const topic = chapter.topics[tIdx];
      const content = await generateTopicContent(topic, chapter.title, project.course, project.discipline);
      const newUnits = [...project.units];
      const currentContent = newUnits[uIdx].content || "";
      newUnits[uIdx].content = currentContent + (currentContent ? "<br/>" : "") + content;
      updateProject({ units: newUnits });
    } catch (err: any) {
      console.error("Erro ao gerar conteúdo do tópico:", err);
      setError("Erro ao gerar o conteúdo do tópico.");
    } finally {
      setIsGeneratingContent(false);
    }
  };

  // Scroll to suggestion logic
  React.useEffect(() => {
    if (showImprovedPAC && !editMode && selectedSuggestion && contentRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const targetId = selectedSuggestion.targetSection.toLowerCase().replace(/\s+/g, '-');
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetEl.classList.add('bg-edu-yellow/20', 'p-2', 'rounded-lg', 'transition-all', 'duration-500');
          setTimeout(() => targetEl.classList.remove('bg-edu-yellow/20'), 3000);
        }
      }, 300);
    }
  }, [showImprovedPAC, editMode, selectedSuggestion]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-edu-navy text-white py-4 px-8 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-edu-cyan" />
          <h1 className="text-xl font-bold tracking-tight">EduEditor <span className="text-edu-light-blue font-normal text-sm ml-2">Gestão Pedagógica</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-xs font-medium text-white/60 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Auto-salvamento ativo
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div 
                key={s} 
                className={cn(
                  "w-3 h-3 rounded-full transition-all duration-300",
                  step >= s ? "bg-edu-cyan scale-110" : "bg-white/20"
                )} 
              />
            ))}
          </div>
          <span className="text-sm font-medium opacity-80">Passo {step} de 5</span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-8">
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <p className="font-medium">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-full transition-all">
              <Plus className="w-5 h-5 rotate-45" />
            </button>
          </motion.div>
        )}
        <AnimatePresence mode="wait">
          {/* Step 1: Identification */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-xl p-10 border border-slate-200"
            >
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-edu-navy mb-2">Identificação do Projeto</h2>
                <p className="text-slate-500">Inicie informando os dados básicos da instituição e disciplina.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-edu-navy uppercase tracking-wider">Nome da Instituição</label>
                  <input 
                    type="text" 
                    value={project.institution}
                    onChange={(e) => updateProject({ institution: e.target.value })}
                    placeholder="Ex: Colégio Dom Bosco"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-edu-cyan outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-edu-navy uppercase tracking-wider">Disciplina</label>
                  <input 
                    type="text" 
                    value={project.discipline}
                    onChange={(e) => updateProject({ discipline: e.target.value })}
                    placeholder="Ex: Matemática, História..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-edu-cyan outline-none transition-all"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-edu-navy uppercase tracking-wider">Curso / Ano</label>
                  <select
                    value={project.course}
                    onChange={(e) => updateProject({ course: e.target.value as Course })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-edu-cyan outline-none transition-all appearance-none cursor-pointer font-medium text-slate-700"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23071D49'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.5em' }}
                  >
                    {COURSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1 italic">Selecione o nível de ensino correspondente ao material.</p>
                </div>
              </div>

              <div className="mt-12 flex justify-end">
                <button 
                  disabled={!project.institution || !project.discipline}
                  onClick={handleNext}
                  className="bg-edu-navy text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Continuar <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: PAC Upload & Analysis */}
          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="bg-white rounded-2xl shadow-xl p-10 border border-slate-200">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-edu-navy mb-2">Plano Anual do Curso (PAC)</h2>
                  <p className="text-slate-500">Faça o upload do seu plano anual para análise de alinhamento com a BNCC.</p>
                </div>

                {!project.pacContent ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-16 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer relative">
                    <input 
                      type="file" 
                      accept=".txt,.doc,.docx,.pdf,.tsv,.csv"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="w-12 h-12 text-edu-cyan mb-4" />
                    <p className="text-lg font-medium text-slate-700">Clique ou arraste o arquivo aqui</p>
                    <p className="text-sm text-slate-400 mt-2">Formatos aceitos: PDF, DOCX, TXT, TSV, CSV</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-edu-light-blue/20 rounded-xl border border-edu-light-blue">
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-edu-navy" />
                        <span className="font-medium text-edu-navy">Plano Carregado com Sucesso</span>
                      </div>
                      <button 
                        onClick={() => updateProject({ pacContent: undefined, analysis: undefined })}
                        className="text-edu-red text-sm font-bold hover:underline"
                      >
                        Substituir Arquivo
                      </button>
                    </div>

                    {isAnalyzing ? (
                      <div className="p-12 flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-edu-cyan border-t-transparent rounded-full animate-spin" />
                        <p className="text-edu-navy font-medium animate-pulse">Analisando alinhamento com a BNCC...</p>
                      </div>
                    ) : project.analysis && (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                          <div className="bg-white border border-slate-200 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-edu-navy mb-4 flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-edu-yellow" /> Sugestões de Melhoria
                            </h3>
                            <div className="space-y-4 mb-6">
                              {project.analysis.suggestions.map((s) => (
                                <div key={s.id} className={cn(
                                  "p-4 rounded-xl border transition-all",
                                  s.accepted ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100 opacity-60"
                                )}>
                                  <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-edu-cyan bg-edu-light-blue/20 px-2 py-0.5 rounded">
                                          Contexto: {s.context}
                                        </span>
                                      </div>
                                      <p className={cn("text-sm text-slate-700", !s.accepted && "line-through")}>{s.text}</p>
                                      
                                      {s.accepted && (
                                        <div className="mt-2 flex items-center gap-1.5">
                                          <div className="w-1.5 h-1.5 rounded-full bg-edu-cyan animate-pulse" />
                                          <span className="text-[10px] font-medium text-slate-500">
                                            Será implementado em: <span className="font-bold text-edu-navy">{s.targetSection}</span>
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <button 
                                      onClick={() => {
                                        if (!project.analysis) return;
                                        const newSuggestions = project.analysis.suggestions.map(sug => 
                                          sug.id === s.id ? { ...sug, accepted: !sug.accepted } : sug
                                        );
                                        updateProject({ 
                                          analysis: { ...project.analysis, suggestions: newSuggestions } 
                                        });
                                      }}
                                      className={cn(
                                        "px-3 py-1 rounded-lg text-xs font-bold transition-all border",
                                        s.accepted 
                                          ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100" 
                                          : "bg-slate-200 text-slate-500 border-slate-300 hover:bg-slate-300"
                                      )}
                                    >
                                      {s.accepted ? "Aceito" : "Recusado"}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <div className="pt-6 border-t border-slate-100 flex gap-4">
                              <button 
                                onClick={() => setShowImprovedPAC(true)}
                                className="flex-1 bg-edu-light-blue/20 text-edu-navy py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-edu-light-blue/40 transition-all"
                              >
                                <FileText className="w-4 h-4" /> Visualizar PAC Melhorado
                              </button>
                              <PDFDownloadLink
                                document={<PACPDF project={project} />}
                                fileName={`PAC_Melhorado_${project.discipline}.pdf`}
                                className="flex-1 border border-edu-navy text-edu-navy py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                              >
                                {/* @ts-ignore */}
                                {({ loading }) => (
                                  <>
                                    <Printer className="w-4 h-4" />
                                    {loading ? "Gerando..." : "Imprimir PAC"}
                                  </>
                                )}
                              </PDFDownloadLink>
                            </div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-edu-navy mb-4">Referências BNCC Identificadas</h3>
                            <div className="flex flex-wrap gap-2">
                              {project.analysis.bnccReferences.map((r, i) => (
                                <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-mono border border-slate-200">
                                  {r}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="bg-edu-navy text-white rounded-xl p-8 flex flex-col items-center justify-center text-center">
                            <div className="text-5xl font-bold mb-2 text-edu-yellow">{project.analysis.alignmentScore}%</div>
                            <div className="text-sm uppercase tracking-widest opacity-70">Alinhamento BNCC</div>
                            <div className="mt-4 w-full bg-white/10 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-edu-cyan h-full transition-all duration-1000" 
                                style={{ width: `${project.analysis.alignmentScore}%` }} 
                              />
                            </div>
                          </div>
                          <button 
                            onClick={handleGenerateIndex}
                            disabled={isGeneratingIndex}
                            className="w-full bg-edu-cyan text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all shadow-lg"
                          >
                            {isGeneratingIndex ? "Gerando..." : "Gerar Estrutura do Livro"}
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex justify-between">
                <button onClick={handleBack} className="flex items-center gap-2 text-slate-500 font-bold hover:text-edu-navy transition-all">
                  <ChevronLeft className="w-5 h-5" /> Voltar
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Index Editor */}
          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="bg-white rounded-2xl shadow-xl p-10 border border-slate-200">
                <div className="mb-8 flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-bold text-edu-navy mb-2">Estrutura do Livro</h2>
                    <p className="text-slate-500">Revise e organize as unidades, capítulos e tópicos gerados.</p>
                  </div>
                  <button 
                    onClick={() => {
                      const newUnits = [...project.units, { id: Date.now().toString(), title: "Nova Unidade", chapters: [] }];
                      updateProject({ units: newUnits });
                    }}
                    className="bg-edu-navy text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Unidade
                  </button>
                </div>

                <div className="space-y-4">
                  {project.units.map((unit, uIdx) => (
                    <div key={unit.id} className="border border-slate-200 rounded-xl overflow-hidden group">
                      <div className="bg-slate-50 p-4 flex items-center gap-4 border-bottom border-slate-200">
                        <GripVertical className="w-5 h-5 text-slate-300 cursor-move" />
                        <input 
                          type="text" 
                          value={unit.title}
                          onChange={(e) => {
                            const newUnits = [...project.units];
                            newUnits[uIdx].title = e.target.value;
                            updateProject({ units: newUnits });
                          }}
                          className="flex-1 bg-transparent font-bold text-xl text-edu-navy outline-none focus:text-edu-cyan"
                        />
                        <button 
                          onClick={() => {
                            const newUnits = project.units.filter((_, i) => i !== uIdx);
                            updateProject({ units: newUnits });
                          }}
                          className="text-slate-300 hover:text-edu-red transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-4 space-y-4 bg-white">
                        {unit.chapters.map((chapter, cIdx) => (
                          <div key={chapter.id} className="ml-8 pl-4 border-l-2 border-slate-100 space-y-3 relative group/chapter">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-edu-cyan uppercase tracking-tighter shrink-0">Capítulo {cIdx + 1}</span>
                              <input 
                                type="text" 
                                value={chapter.title}
                                onChange={(e) => {
                                  const newUnits = [...project.units];
                                  newUnits[uIdx].chapters[cIdx].title = e.target.value;
                                  updateProject({ units: newUnits });
                                }}
                                className="flex-1 text-lg font-bold text-slate-700 outline-none focus:text-edu-navy bg-transparent"
                              />
                              <button 
                                onClick={() => {
                                  const newUnits = [...project.units];
                                  newUnits[uIdx].chapters.splice(cIdx, 1);
                                  updateProject({ units: newUnits });
                                }}
                                className="opacity-0 group-hover/chapter:opacity-100 text-slate-300 hover:text-edu-red transition-all p-1"
                                title="Excluir Capítulo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="ml-4 space-y-2">
                              {chapter.topics.map((topic, tIdx) => (
                                <div key={topic.id} className="group/topic space-y-1">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                                    <input 
                                      type="text" 
                                      value={topic.title}
                                      onChange={(e) => {
                                        const newUnits = [...project.units];
                                        newUnits[uIdx].chapters[cIdx].topics[tIdx].title = e.target.value;
                                        updateProject({ units: newUnits });
                                      }}
                                      className="flex-1 text-base font-semibold text-slate-700 outline-none focus:text-edu-navy bg-transparent"
                                      placeholder="Título do Tópico"
                                    />
                                    <button 
                                      onClick={() => {
                                        const newUnits = [...project.units];
                                        newUnits[uIdx].chapters[cIdx].topics.splice(tIdx, 1);
                                        updateProject({ units: newUnits });
                                      }}
                                      className="opacity-0 group-hover/topic:opacity-100 text-slate-300 hover:text-edu-red transition-all p-1"
                                      title="Excluir Tópico"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="ml-3 flex items-start gap-1.5">
                                    <Sparkles className="w-3 h-3 text-edu-yellow shrink-0 mt-0.5 opacity-60" />
                                    <textarea
                                      value={topic.learningObjective || ""}
                                      onChange={(e) => {
                                        const newUnits = [...project.units];
                                        newUnits[uIdx].chapters[cIdx].topics[tIdx].learningObjective = e.target.value;
                                        updateProject({ units: newUnits });
                                      }}
                                      placeholder="Objetivo de aprendizagem..."
                                      className="flex-1 text-sm text-slate-400 italic bg-transparent border-none focus:ring-0 p-0 resize-none overflow-hidden min-h-[1.2rem] focus:text-slate-600 transition-colors"
                                      rows={1}
                                      onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = target.scrollHeight + 'px';
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                              <button 
                                onClick={() => {
                                  const newUnits = [...project.units];
                                  newUnits[uIdx].chapters[cIdx].topics.push({ 
                                    id: Date.now().toString(), 
                                    title: "Novo Tópico",
                                    learningObjective: "" 
                                  });
                                  updateProject({ units: newUnits });
                                }}
                                className="text-[10px] font-bold text-edu-cyan/60 hover:text-edu-cyan flex items-center gap-1 mt-1 transition-colors"
                              >
                                <Plus className="w-3 h-3" /> Adicionar Tópico
                              </button>
                            </div>
                          </div>
                        ))}
                        <button 
                          onClick={() => {
                            const newUnits = [...project.units];
                            newUnits[uIdx].chapters.push({ id: Date.now().toString(), title: "Novo Capítulo", topics: [] });
                            updateProject({ units: newUnits });
                          }}
                          className="ml-8 text-xs font-bold text-edu-navy/40 hover:text-edu-navy flex items-center gap-1.5 py-2 transition-colors"
                        >
                          <Plus className="w-4 h-4" /> Adicionar Capítulo
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <button onClick={handleBack} className="flex items-center gap-2 text-slate-500 font-bold hover:text-edu-navy transition-all">
                  <ChevronLeft className="w-5 h-5" /> Voltar
                </button>
                <button onClick={handleNext} className="bg-edu-navy text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-opacity-90 transition-all">
                  Confirmar Estrutura <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Content Editor */}
          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex gap-8 h-[calc(100vh-200px)]"
            >
              {/* Sidebar Units */}
              <div className="w-72 bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-edu-navy text-sm uppercase tracking-wider">Unidades do Livro</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {project.units.map((u, i) => (
                    <div key={u.id} className="space-y-1">
                      <button
                        onClick={() => setActiveUnitIndex(i)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg text-sm transition-all flex items-center justify-between group",
                          activeUnitIndex === i 
                            ? "bg-edu-light-blue/20 text-edu-navy font-bold border border-edu-light-blue/50" 
                            : "text-slate-500 hover:bg-slate-50"
                        )}
                      >
                        <span className="truncate">{i + 1}. {u.title}</span>
                        {u.content && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </button>
                      
                      {activeUnitIndex === i && (
                        <div className="ml-4 pl-2 border-l border-slate-200 space-y-2 py-2 animate-in slide-in-from-left-2 duration-200">
                          <div className="flex items-center justify-between mb-1 pr-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gerar por Partes</p>
                            <Info className="w-3 h-3 text-slate-300 cursor-help" title="Clique para gerar e anexar conteúdo ao editor" />
                          </div>
                          {u.chapters.map((chapter, cIdx) => (
                            <div key={chapter.id} className="space-y-1">
                              <button 
                                onClick={() => handleGenerateChapterContent(i, cIdx)}
                                disabled={isGeneratingContent}
                                className="w-full text-left p-1.5 rounded text-[11px] text-slate-600 hover:bg-slate-100 flex items-center justify-between group/chapter transition-colors"
                                title={`Gerar conteúdo para o capítulo: ${chapter.title}`}
                              >
                                <span className="truncate font-medium">Cap: {chapter.title}</span>
                                <Sparkles className="w-3 h-3 text-edu-yellow opacity-40 group-hover/chapter:opacity-100 transition-opacity" />
                              </button>
                              <div className="ml-2 space-y-1">
                                {chapter.topics.map((topic, tIdx) => (
                                  <button 
                                    key={topic.id}
                                    onClick={() => handleGenerateTopicContent(i, cIdx, tIdx)}
                                    disabled={isGeneratingContent}
                                    className="w-full text-left p-1 rounded text-[10px] text-slate-400 hover:bg-slate-50 flex items-center justify-between group/topic transition-colors"
                                    title={`Gerar conteúdo para o tópico: ${topic.title}`}
                                  >
                                    <span className="truncate">Tóp: {topic.title}</span>
                                    <Sparkles className="w-2.5 h-2.5 text-edu-yellow opacity-0 group-hover/topic:opacity-100 transition-opacity" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Editor Area */}
              <div className="flex-1 bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-edu-cyan uppercase">Unidade {activeUnitIndex + 1}</span>
                    <h2 className="text-xl font-bold text-edu-navy">{project.units[activeUnitIndex].title}</h2>
                  </div>
                  <div className="flex gap-3">
                    {!project.units[activeUnitIndex].content && (
                      <button 
                        onClick={() => handleGenerateContent(activeUnitIndex)}
                        disabled={isGeneratingContent}
                        className="bg-edu-navy text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-opacity-90 transition-all"
                      >
                        {isGeneratingContent ? "Gerando..." : <><Sparkles className="w-4 h-4" /> Gerar Conteúdo Base</>}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {isGeneratingContent ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-edu-cyan border-t-transparent rounded-full animate-spin" />
                      <p className="text-edu-navy font-medium">Redigindo conteúdo pedagógico...</p>
                    </div>
                  ) : project.units[activeUnitIndex].content ? (
                    <ReactQuill 
                      theme="snow" 
                      value={project.units[activeUnitIndex].content} 
                      onChange={(val) => {
                        const newUnits = [...project.units];
                        newUnits[activeUnitIndex].content = val;
                        updateProject({ units: newUnits });
                      }}
                      modules={{
                        toolbar: [
                          [{ 'header': [1, 2, 3, false] }],
                          ['bold', 'italic', 'underline', 'strike'],
                          [{'list': 'ordered'}, {'list': 'bullet'}],
                          ['link', 'image'],
                          ['clean']
                        ],
                      }}
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-12">
                      <PenTool className="w-16 h-16 text-slate-200 mb-4" />
                      <h3 className="text-lg font-bold text-slate-400">Nenhum conteúdo ainda</h3>
                      <p className="text-slate-400 max-w-xs mt-2">Utilize o botão acima para gerar o conteúdo base com IA ou comece a escrever agora.</p>
                      <button 
                        onClick={() => {
                          const newUnits = [...project.units];
                          newUnits[activeUnitIndex].content = "<h1>Nova Unidade</h1><p>Comece a escrever aqui...</p>";
                          updateProject({ units: newUnits });
                        }}
                        className="mt-6 text-edu-cyan font-bold hover:underline"
                      >
                        Criar documento em branco
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                  <button onClick={handleBack} className="flex items-center gap-2 text-slate-500 font-bold hover:text-edu-navy transition-all">
                    <ChevronLeft className="w-5 h-5" /> Voltar para Estrutura
                  </button>
                  <button 
                    onClick={handleNext}
                    className="bg-edu-navy text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-opacity-90 transition-all"
                  >
                    Finalizar Livro <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 5: Finalization */}
          {step === 5 && (
            <motion.div 
              key="step5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                <div className="bg-edu-navy p-12 text-white text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute -top-24 -left-24 w-64 h-64 bg-edu-cyan rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-edu-red rounded-full blur-3xl" />
                  </div>
                  <BookOpen className="w-16 h-16 text-edu-cyan mx-auto mb-6" />
                  <h2 className="text-4xl font-bold mb-2">{project.discipline}</h2>
                  <p className="text-xl text-edu-light-blue">{project.course}</p>
                  <div className="mt-8 pt-8 border-t border-white/10">
                    <p className="text-sm uppercase tracking-widest opacity-60">Instituição</p>
                    <p className="text-lg font-medium">{project.institution}</p>
                  </div>
                </div>
                
                <div className="p-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div>
                      <h3 className="text-xl font-bold text-edu-navy mb-6 flex items-center gap-2">
                        <Layout className="w-5 h-5" /> Resumo da Estrutura
                      </h3>
                      <div className="space-y-4">
                        {project.units.map((u, i) => (
                          <div key={u.id} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-edu-light-blue/30 text-edu-navy text-xs font-bold flex items-center justify-center shrink-0">
                              {i + 1}
                            </div>
                            <div>
                              <p className="font-bold text-slate-700 leading-tight">{u.title}</p>
                              <p className="text-xs text-slate-400">{u.chapters.length} capítulos • {u.content ? "Conteúdo pronto" : "Sem conteúdo"}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center mb-6">
                        <Printer className="w-10 h-10 text-edu-navy" />
                      </div>
                      <h3 className="text-xl font-bold text-edu-navy mb-2">Pronto para Impressão</h3>
                      <p className="text-slate-500 text-sm mb-8">Seu livro didático foi montado e revisado. Agora você pode exportar o arquivo final em PDF de alta qualidade.</p>
                      
                      <div className="w-full space-y-3">
                        <PDFDownloadLink
                          document={<BookPDF project={project} />}
                          fileName={`Livro_${project.discipline}_${project.course}.pdf`}
                          className="w-full bg-edu-navy text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-opacity-90 transition-all shadow-xl"
                        >
                          {/* @ts-ignore */}
                          {({ loading }) => (
                            <>
                              <Download className="w-5 h-5" />
                              {loading ? "Gerando PDF..." : "Baixar Livro em PDF"}
                            </>
                          )}
                        </PDFDownloadLink>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={handleSaveProject}
                            className="flex items-center justify-center gap-2 p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                          >
                            {saveStatus === "saving" ? (
                              <div className="w-4 h-4 border-2 border-edu-navy border-t-transparent rounded-full animate-spin" />
                            ) : saveStatus === "saved" ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            {saveStatus === "saved" ? "Salvo!" : "Salvar Projeto"}
                          </button>
                          
                          <button 
                            onClick={() => setStep(4)}
                            className="flex items-center justify-center gap-2 p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                          >
                            <PenTool className="w-4 h-4" /> Editar Conteúdo
                          </button>
                        </div>

                        {showResetConfirm ? (
                          <div className="w-full p-4 bg-red-50 border border-red-100 rounded-xl space-y-3 animate-in fade-in zoom-in duration-200">
                            <p className="text-[10px] text-red-600 font-medium text-center">
                              Tem certeza? Todo o progresso será perdido.
                            </p>
                            <div className="flex gap-2">
                              <button 
                                onClick={handleNewProject}
                                className="flex-1 py-2 bg-red-500 text-white text-[10px] font-bold rounded-lg hover:bg-red-600 transition-all"
                              >
                                Sim, Reiniciar
                              </button>
                              <button 
                                onClick={() => setShowResetConfirm(false)}
                                className="flex-1 py-2 bg-white text-slate-500 text-[10px] font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-all"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setShowResetConfirm(true)}
                            className="w-full py-3 text-slate-400 text-xs font-medium hover:text-red-500 transition-all flex items-center justify-center gap-2"
                          >
                            <Plus className="w-3 h-3 rotate-45" /> Iniciar Novo Livro
                          </button>
                        )}
                      </div>

                      <button 
                        onClick={() => window.print()}
                        className="mt-6 text-edu-navy font-bold text-sm hover:underline flex items-center gap-2 opacity-60 hover:opacity-100"
                      >
                        <Printer className="w-4 h-4" /> Imprimir diretamente
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-center">
                <button onClick={handleBack} className="flex items-center gap-2 text-slate-500 font-bold hover:text-edu-navy transition-all">
                  <ChevronLeft className="w-5 h-5" /> Voltar para Edição
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Improved PAC Modal */}
      <AnimatePresence>
        {showImprovedPAC && project.analysis && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-edu-navy/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-xl font-bold text-edu-navy">PAC - Versão Otimizada (BNCC)</h3>
                  <div className="flex gap-4 mt-2">
                    <button 
                      onClick={() => setEditMode(false)}
                      className={cn(
                        "text-xs font-bold pb-1 border-b-2 transition-all",
                        !editMode ? "text-edu-cyan border-edu-cyan" : "text-slate-400 border-transparent hover:text-slate-600"
                      )}
                    >
                      Visualização
                    </button>
                    <button 
                      onClick={() => setEditMode(true)}
                      className={cn(
                        "text-xs font-bold pb-1 border-b-2 transition-all",
                        editMode ? "text-edu-cyan border-edu-cyan" : "text-slate-400 border-transparent hover:text-slate-600"
                      )}
                    >
                      Editar Texto
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowImprovedPAC(false);
                    setSelectedSuggestion(null);
                  }}
                  className="p-2 hover:bg-slate-200 rounded-full transition-all"
                >
                  <Plus className="w-6 h-6 rotate-45 text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                <div className="mb-6 p-4 bg-edu-light-blue/10 border border-edu-light-blue/20 rounded-xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-edu-cyan shrink-0 mt-0.5" />
                  <p className="text-xs text-edu-navy leading-relaxed">
                    <strong>Nota Pedagógica:</strong> Este plano foi reorganizado por <strong>Unidades Temáticas</strong> para garantir uma progressão lógica de conhecimento, removendo a rigidez dos bimestres e focando no domínio das habilidades BNCC.
                  </p>
                </div>

                {editMode ? (
                  <ReactQuill 
                    theme="snow" 
                    value={project.analysis.improvedPACContent} 
                    onChange={(val) => {
                      if (!project.analysis) return;
                      updateProject({ 
                        analysis: { ...project.analysis, improvedPACContent: val } 
                      });
                    }}
                    className="h-full"
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{'list': 'ordered'}, {'list': 'bullet'}],
                        ['clean']
                      ],
                    }}
                  />
                ) : (
                  <div 
                    ref={contentRef}
                    className="prose prose-slate max-w-none improved-pac-preview"
                    dangerouslySetInnerHTML={{ __html: project.analysis.improvedPACContent }}
                  />
                )}
              </div>
              <div className="p-6 border-t border-slate-100 flex justify-end gap-4 bg-slate-50">
                <button 
                  onClick={() => {
                    setShowImprovedPAC(false);
                    setSelectedSuggestion(null);
                  }}
                  className="px-8 py-2 bg-edu-navy text-white rounded-xl font-bold hover:bg-opacity-90 transition-all"
                >
                  Salvar e Fechar
                </button>
                <PDFDownloadLink
                  document={<PACPDF project={project} />}
                  fileName={`PAC_Melhorado_${project.discipline}.pdf`}
                  className="bg-edu-navy text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-opacity-90 transition-all"
                >
                  {/* @ts-ignore */}
                  {({ loading }) => (
                    <>
                      <Download className="w-4 h-4" />
                      {loading ? "Gerando..." : "Baixar PDF"}
                    </>
                  )}
                </PDFDownloadLink>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer className="py-6 px-8 border-t border-slate-200 bg-white flex justify-between items-center text-slate-400 text-xs">
        <div className="flex gap-6">
          <span>&copy; 2026 EduEditor - Sistema de Apoio ao Professor</span>
          <a href="#" className="hover:text-edu-navy transition-all">Termos de Uso</a>
          <a href="#" className="hover:text-edu-navy transition-all">Privacidade</a>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Servidor de IA Online</span>
        </div>
      </footer>
    </div>
  );
}
