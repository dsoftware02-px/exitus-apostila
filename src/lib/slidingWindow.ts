import { Chapter, SlidingWindowPayload, BookMetadata } from '../types';

/**
 * Monta o payload de contexto deslizante (Sliding Window) para a geração de uma nova sessão.
 * Isso evita que o LLM perca o contexto (Lost in the Middle) e foca apenas no que é relevante
 * para a transição fluida do texto.
 */
export function buildSlidingWindowPayload(
  chapter: Chapter,
  currentSessionIndex: number,
  metadata: BookMetadata
): SlidingWindowPayload {
  const previousSessions = chapter.sessions.slice(0, currentSessionIndex);
  const currentSession = chapter.sessions[currentSessionIndex];

  // 1. Objetivo do Capítulo (Norteador)
  const chapterObjective = chapter.objective;

  // 2. Resumo estruturado das sessões anteriores (1 a N-1) contemplando entidades já abordadas
  const validatedSessions = previousSessions.filter((s) => s.status === 'VALIDATED');
  let previousSummaries = 'Nenhum contexto anterior.';
  
  if (validatedSessions.length > 0) {
    const contextList = validatedSessions.map(s => ({
      session_title: s.title,
      content_summary: s.summary || '',
      entities_covered: s.entities || []
    }));
    previousSummaries = JSON.stringify(contextList, null, 2);
  }

  // 3. Últimos 3 parágrafos da Sessão N-1 (Para fluidez e gancho)
  let lastParagraphs = '';
  if (previousSessions.length > 0) {
    const lastSession = previousSessions[previousSessions.length - 1];
    if (lastSession.content) {
      // Divide por quebras de linha duplas para pegar parágrafos
      const paragraphs = lastSession.content
        .split('\n\n')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      
      lastParagraphs = paragraphs.slice(-3).join('\n\n');
    }
  }

  // 4. Parâmetros da Sessão Atual (N)
  const currentObjective = currentSession.objective;
  const pedagogicalApproach = currentSession.approach || 'Abordagem padrão baseada no perfil.';
  const anchors = currentSession.anchors || 'Nenhum conhecimento âncora fornecido.';

  return {
    metadata,
    chapterObjective,
    previousSummaries,
    lastParagraphs,
    currentObjective,
    pedagogicalApproach,
    anchors,
  };
}
