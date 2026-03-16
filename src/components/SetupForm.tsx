import React, { useState } from 'react';
import { BookMetadata } from '../types';
import { 
  BookOpen, Target, Users, BookMarked, Sparkles, Loader2, 
  Building2, BrainCircuit, ListChecks, X, ChevronRight, 
  ChevronLeft, Check, Info, Quote, Palette, GraduationCap,
  Image as ImageIcon, Layout, Wand2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { suggestMetadataField } from '../lib/gemini';

interface SetupFormProps {
  onSubmit: (metadata: BookMetadata) => void;
  initialData?: BookMetadata;
}

export function SetupForm({ onSubmit, initialData }: SetupFormProps) {
  const [metadata, setMetadata] = useState<BookMetadata>(initialData || {
    institutional: {
      schoolName: '',
      pedagogicalEthos: 'Humanista Clássico',
      pppContext: '',
      regionality: ''
    },
    course: {
      targetAudience: '',
      cognitiveMaturity: '',
      rigorLevel: 'INTERMEDIARIO',
      courseGoal: ''
    },
    discipline: {
      subject: '',
      grade: '',
      learningObjectives: '',
      methodology: 'EXPOSITIVA',
      evaluationArchitecture: '',
      interdisciplinaryHooks: ''
    },
    style: {
      authorTone: 'Mentor Socrático',
      languageComplexity: 'Adequado à faixa etária',
      structureLevel1: 'Unidade',
      structureLevel2: 'Capítulo'
    },
    visual: {
      exercisePlacement: 'SESSAO',
      visualTone: 'SOBRIO',
      imageDensity: 'MEDIA',
      imageStyle: '',
      layoutStyle: ''
    }
  });

  const [step, setStep] = useState(1);
  const [suggestingField, setSuggestingField] = useState<string | null>(null);
  const totalSteps = 5;

  const handleSuggest = async (section: keyof BookMetadata, field: string) => {
    setSuggestingField(field);
    try {
      const currentValue = (metadata[section] as any)[field];
      const suggestion = await suggestMetadataField(field, metadata, undefined, currentValue);
      updateMetadata(section, field, suggestion);
    } catch (e) {
      console.error('Erro ao sugerir campo:', e);
    } finally {
      setSuggestingField(null);
    }
  };

  const SuggestButton = ({ section, field }: { section: keyof BookMetadata, field: string }) => (
    <button
      type="button"
      onClick={() => handleSuggest(section, field)}
      disabled={suggestingField !== null}
      className="flex items-center gap-1.5 text-[10px] font-bold text-blue-500 hover:text-blue-600 transition-colors uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg"
    >
      {suggestingField === field ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Wand2 className="w-3 h-3" />
      )}
      {metadata[section as keyof BookMetadata] && (metadata[section as keyof BookMetadata] as any)[field] ? 'Aprimorar com IA' : 'Gerar com IA'}
    </button>
  );

  const updateMetadata = (section: keyof BookMetadata, field: string, value: any) => {
    setMetadata(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onSubmit(metadata);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-12 relative px-4">
      {[1, 2, 3, 4, 5].map((s) => (
        <div key={s} className="flex flex-col items-center relative z-10">
          <motion.div 
            initial={false}
            animate={{ 
              backgroundColor: step >= s ? '#18181b' : '#f4f4f5',
              color: step >= s ? '#ffffff' : '#a1a1aa',
              scale: step === s ? 1.1 : 1
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border border-zinc-200"
          >
            {step > s ? <Check className="w-5 h-5" /> : s}
          </motion.div>
          <span className={`text-[10px] mt-2 font-bold uppercase tracking-widest ${step >= s ? 'text-zinc-900' : 'text-zinc-400'}`}>
            {s === 1 ? 'Institucional' : s === 2 ? 'Sujeito' : s === 3 ? 'Didática' : s === 4 ? 'Voz' : 'Estética'}
          </span>
        </div>
      ))}
      <div className="absolute top-5 left-0 w-full h-[1px] bg-zinc-200 -z-0">
        <motion.div 
          className="h-full bg-zinc-900" 
          animate={{ width: `${((step - 1) / 4) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-[#F9F9F8] flex flex-col items-center py-12 px-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl bg-white rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-zinc-100 overflow-hidden"
      >
        {/* Header */}
        <div className="px-12 pt-12 pb-8 border-b border-zinc-50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Configuração do Material</h1>
                <p className="text-zinc-500 text-sm italic serif">Definindo o DNA ontológico e pedagógico da obra.</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Fase {step} de {totalSteps}</span>
              <div className="text-sm font-medium text-zinc-900">
                {step === 1 && "Causa Formal"}
                {step === 2 && "Causa Material"}
                {step === 3 && "Causa Final"}
                {step === 4 && "Causa Eficiente (Voz)"}
                {step === 5 && "Causa Eficiente (Estética)"}
              </div>
            </div>
          </div>
          {renderStepIndicator()}
        </div>

        <form onSubmit={handleSubmit} className="p-12">
          <AnimatePresence mode="wait">
            {/* Step 1: Institucional */}
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <Building2 className="w-3 h-3" /> Nome da Instituição
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all placeholder:text-zinc-300"
                      placeholder="Ex: Colégio Santo Agostinho"
                      value={metadata.institutional.schoolName}
                      onChange={(e) => updateMetadata('institutional', 'schoolName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <Palette className="w-3 h-3" /> Ethos Pedagógico
                    </label>
                    <select
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all appearance-none"
                      value={metadata.institutional.pedagogicalEthos}
                      onChange={(e) => updateMetadata('institutional', 'pedagogicalEthos', e.target.value)}
                    >
                      <option value="Humanista Clássico">Humanista Clássico</option>
                      <option value="Sociointeracionista">Sociointeracionista</option>
                      <option value="Tradicional Rigoroso">Tradicional Rigoroso</option>
                      <option value="Construtivista">Construtivista</option>
                      <option value="Montessoriano">Montessoriano</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <Quote className="w-3 h-3" /> Contexto do PPP (Projeto Político Pedagógico)
                    </label>
                    <SuggestButton section="institutional" field="pppContext" />
                  </div>
                  <textarea
                    rows={3}
                    className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all placeholder:text-zinc-300 resize-none"
                    placeholder="Descreva os valores centrais e a visão de mundo da escola..."
                    value={metadata.institutional.pppContext}
                    onChange={(e) => updateMetadata('institutional', 'pppContext', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <Info className="w-3 h-3" /> Regionalidade e Perfil Socioeconômico
                    </label>
                    <SuggestButton section="institutional" field="regionality" />
                  </div>
                  <textarea
                    rows={2}
                    className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all placeholder:text-zinc-300 resize-none"
                    placeholder="Ex: Localização urbana, classe média-alta, forte apelo tecnológico..."
                    value={metadata.institutional.regionality}
                    onChange={(e) => updateMetadata('institutional', 'regionality', e.target.value)}
                  />
                </div>
              </motion.div>
            )}

            {/* Step 2: Sujeito */}
            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <Users className="w-3 h-3" /> Público-Alvo Detalhado
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all placeholder:text-zinc-300"
                      placeholder="Ex: Alunos do 9º ano, pré-vestibulandos..."
                      value={metadata.course.targetAudience}
                      onChange={(e) => updateMetadata('course', 'targetAudience', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <BrainCircuit className="w-3 h-3" /> Nível de Rigor (Ascese)
                    </label>
                    <select
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all appearance-none"
                      value={metadata.course.rigorLevel}
                      onChange={(e) => updateMetadata('course', 'rigorLevel', e.target.value)}
                    >
                      <option value="BASICO">Básico (Introdução)</option>
                      <option value="INTERMEDIARIO">Intermediário (Regular)</option>
                      <option value="AVANCADO">Avançado (Aprofundamento)</option>
                      <option value="OLIMPICO">Olímpico</option>
                      <option value="ITA_IME">ITA / IME / Medicina</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <BrainCircuit className="w-3 h-3" /> Maturidade Cognitiva e Antropológica
                    </label>
                    <SuggestButton section="course" field="cognitiveMaturity" />
                  </div>
                  <textarea
                    rows={3}
                    className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all placeholder:text-zinc-300 resize-none"
                    placeholder="Descreva a fase de desenvolvimento do aluno (ex: transição concreto-abstrato)..."
                    value={metadata.course.cognitiveMaturity}
                    onChange={(e) => updateMetadata('course', 'cognitiveMaturity', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <Target className="w-3 h-3" /> Objetivo Final (Teleologia)
                    </label>
                    <SuggestButton section="course" field="courseGoal" />
                  </div>
                  <textarea
                    rows={2}
                    className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all placeholder:text-zinc-300 resize-none"
                    placeholder="O que o aluno deve ser capaz de fazer ao fim deste material?"
                    value={metadata.course.courseGoal}
                    onChange={(e) => updateMetadata('course', 'courseGoal', e.target.value)}
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: Didática */}
            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <BookOpen className="w-3 h-3" /> Disciplina
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all placeholder:text-zinc-300"
                      placeholder="Ex: Filosofia, Física, Literatura..."
                      value={metadata.discipline.subject}
                      onChange={(e) => updateMetadata('discipline', 'subject', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <GraduationCap className="w-3 h-3" /> Série / Ano
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all placeholder:text-zinc-300"
                      placeholder="Ex: 1ª Série do Ensino Médio"
                      value={metadata.discipline.grade}
                      onChange={(e) => updateMetadata('discipline', 'grade', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <ListChecks className="w-3 h-3" /> Objetivos de Aprendizado (Detalhado)
                    </label>
                    <SuggestButton section="discipline" field="learningObjectives" />
                  </div>
                  <textarea
                    rows={4}
                    className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all placeholder:text-zinc-300 resize-none"
                    placeholder="Liste as competências e habilidades (BNCC ou Próprias)..."
                    value={metadata.discipline.learningObjectives}
                    onChange={(e) => updateMetadata('discipline', 'learningObjectives', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      Metodologia de Entrega
                    </label>
                    <select
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all appearance-none"
                      value={metadata.discipline.methodology}
                      onChange={(e) => updateMetadata('discipline', 'methodology', e.target.value)}
                    >
                      <option value="EXPOSITIVA">Aula Expositiva Dialógica</option>
                      <option value="PBL">Problem Based Learning (PBL)</option>
                      <option value="SALA_INVERTIDA">Sala de Aula Invertida</option>
                      <option value="DIALOGO_SOCRATICO">Diálogo Socrático / Seminário</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      Ganchos Interdisciplinares
                    </label>
                    <input
                      type="text"
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all placeholder:text-zinc-300"
                      placeholder="Ex: Conexão com História e Ética..."
                      value={metadata.discipline.interdisciplinaryHooks}
                      onChange={(e) => updateMetadata('discipline', 'interdisciplinaryHooks', e.target.value)}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Voz */}
            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        Tom de Voz (Persona)
                      </label>
                      <SuggestButton section="style" field="authorTone" />
                    </div>
                    <input
                      required
                      type="text"
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all placeholder:text-zinc-300"
                      placeholder="Ex: Mentor Socrático, Mestre Rigoroso..."
                      value={metadata.style.authorTone}
                      onChange={(e) => updateMetadata('style', 'authorTone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      Complexidade da Linguagem
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all placeholder:text-zinc-300"
                      placeholder="Ex: Vocabulário erudito, Linguagem direta..."
                      value={metadata.style.languageComplexity}
                      onChange={(e) => updateMetadata('style', 'languageComplexity', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      Nível 1 (Macro Estrutura)
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                      value={metadata.style.structureLevel1}
                      onChange={(e) => updateMetadata('style', 'structureLevel1', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      Nível 2 (Micro Estrutura)
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                      value={metadata.style.structureLevel2}
                      onChange={(e) => updateMetadata('style', 'structureLevel2', e.target.value)}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Estética */}
            {step === 5 && (
              <motion.div 
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <ListChecks className="w-3 h-3" /> Frequência de Exercícios
                    </label>
                    <select
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all appearance-none"
                      value={metadata.visual.exercisePlacement}
                      onChange={(e) => updateMetadata('visual', 'exercisePlacement', e.target.value)}
                    >
                      <option value="SESSAO">Após cada Sessão (Micro)</option>
                      <option value="CAPITULO">Após cada Capítulo (Macro)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <Palette className="w-3 h-3" /> Tom Visual
                    </label>
                    <select
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all appearance-none"
                      value={metadata.visual.visualTone}
                      onChange={(e) => updateMetadata('visual', 'visualTone', e.target.value)}
                    >
                      <option value="SOBRIO">Sóbrio / Acadêmico</option>
                      <option value="LUDICO">Lúdico / Engajador</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <ImageIcon className="w-3 h-3" /> Densidade de Imagens
                    </label>
                    <select
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all appearance-none"
                      value={metadata.visual.imageDensity}
                      onChange={(e) => updateMetadata('visual', 'imageDensity', e.target.value)}
                    >
                      <option value="ALTA">Alta (Visualmente rico)</option>
                      <option value="MEDIA">Média (Equilibrado)</option>
                      <option value="BAIXA">Baixa (Foco no texto)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles className="w-3 h-3" /> Estilo das Imagens
                      </label>
                      <SuggestButton section="visual" field="imageStyle" />
                    </div>
                    <input
                      type="text"
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all placeholder:text-zinc-300"
                      placeholder="Ex: Ilustrações flat, fotos realistas..."
                      value={metadata.visual.imageStyle}
                      onChange={(e) => updateMetadata('visual', 'imageStyle', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <Layout className="w-3 h-3" /> Estilo de Página / Layout
                    </label>
                    <SuggestButton section="visual" field="layoutStyle" />
                  </div>
                  <input
                    type="text"
                    className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none transition-all placeholder:text-zinc-300"
                    placeholder="Ex: Duas colunas com boxes laterais, Estilo revista..."
                    value={metadata.visual.layoutStyle}
                    onChange={(e) => updateMetadata('visual', 'layoutStyle', e.target.value)}
                  />
                </div>

                <div className="bg-zinc-900 rounded-3xl p-8 text-white flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-lg mb-1">Tudo pronto para a Geração</h4>
                    <p className="text-zinc-400 text-sm">A IA usará estas diretrizes como o DNA do material.</p>
                  </div>
                  <Sparkles className="w-10 h-10 text-blue-400" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-12 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(Math.max(1, step - 1))}
              className={`flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-all ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-zinc-400 hover:text-zinc-900'}`}
            >
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
            <button
              type="submit"
              className="bg-zinc-900 text-white px-10 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all shadow-lg hover:shadow-zinc-200 flex items-center gap-2"
            >
              {step === totalSteps ? (
                <>Finalizar Setup <Check className="w-4 h-4" /></>
              ) : (
                <>Próximo <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </form>
      </motion.div>
      
      <p className="mt-8 text-zinc-400 text-[10px] uppercase tracking-[0.2em] font-bold">
        Sistema de Inteligência Pedagógica v2.0 • Rigor & Tradição
      </p>
    </div>
  );
}

const Trophy = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);
