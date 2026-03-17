export type AppState = 'SETUP' | 'MACRO_PLANNING' | 'WORKSPACE' | 'PREVIEW';
export type ItemStatus = 'PENDING' | 'GENERATING' | 'VALIDATED';

export interface BookMetadata {
  // Fase I: Causa Formal (Institucional)
  institutional: {
    schoolName: string;
    pedagogicalEthos: string; // Ex: Humanista Clássico, Construtivista, Técnico
    pppContext: string; // Contexto do Projeto Político Pedagógico
    regionality: string; // Regionalismos, contexto socioeconômico
  };
  
  // Fase II: Causa Material (O Sujeito - Curso/Turma)
  course: {
    targetAudience: string;
    cognitiveMaturity: string; // Descrição da maturidade da faixa etária
    rigorLevel: 'BASICO' | 'INTERMEDIARIO' | 'AVANCADO' | 'OLIMPICO' | 'ITA_IME';
    courseGoal: string; // Ex: Aprovação ENEM, Formação Humanística, Alfabetização Científica
  };
  
  // Fase III: Causa Final (A Disciplina e a Didática)
  discipline: {
    subject: string;
    grade: string;
    learningObjectives: string;
    methodology: 'EXPOSITIVA' | 'PBL' | 'SALA_INVERTIDA' | 'DIALOGO_SOCRATICO';
    evaluationArchitecture: string; // Como o conhecimento será cobrado
    interdisciplinaryHooks: string; // Conexões com outras áreas
  };
  
  // Fase IV: Causa Eficiente (Voz e Tom)
  style: {
    authorTone: string; // Ex: Mentor Socrático, Mestre Rigoroso, Facilitador
    languageComplexity: string; // Nível de vocabulário
    structureLevel1: string; // Unidade, Bloco, etc.
    structureLevel2: string; // Capítulo, Aula, etc.
  };

  // Fase V: Estética do Material (Visual e Estrutural)
  visual: {
    exercisePlacement: 'SESSAO' | 'CAPITULO';
    visualTone: 'SOBRIO' | 'LUDICO';
    imageDensity: 'ALTA' | 'MEDIA' | 'BAIXA';
    imageStyle: string; // Ex: Ilustrações realistas, Flat design, Fotos
    layoutStyle: string; // Ex: Duas colunas, Bloco único, Estilo revista
  };

  pacContent?: string;
}

export interface Session {
  id: string;
  title: string;
  objective: string;
  status: ItemStatus;
  content: string;
  summary: string;
  approach: string;
  anchors: string;
  entities?: string[];
  pacObjectives?: string[];
  layoutId?: string;
}

export interface Chapter {
  id: string;
  title: string;
  objective: string;
  sessions: Session[];
  status?: 'draft' | 'review' | 'approved';
}

export interface Part {
  id: string;
  title: string;
  chapters: Chapter[];
}

export interface Book {
  metadata: BookMetadata;
  parts: Part[];
  layoutId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  context?: string;
}

export interface SlidingWindowPayload {
  metadata: BookMetadata;
  chapterObjective: string;
  previousSummaries: string;
  lastParagraphs: string;
  currentObjective: string;
  pedagogicalApproach: string;
  anchors: string;
}
