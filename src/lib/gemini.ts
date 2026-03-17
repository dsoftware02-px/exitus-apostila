import { GoogleGenAI, Type } from '@google/genai';
import { BookMetadata, Part, SlidingWindowPayload } from '../types';
import { DEFAULT_LAYOUT_ID } from './layouts';

// Inicialização Lazy para evitar crash se a chave não estiver presente no load
let aiClient: GoogleGenAI | null = null;

function getAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

async function getSummarizedContext(text: string | undefined, objectiveContext: string): Promise<string> {
  if (!text) return '';
  if (text.length < 20000) return text;
  
  const ai = getAI();
  let safeText = text;
  if (text.length > 100000) {
     safeText = text.substring(0, 50000) + "\n\n...[TRECHO EXCLUÍDO POR LIMITE DE ESPAÇO]...\n\n" + text.substring(text.length - 50000);
  }
  
  const prompt = `
    Abaixo há um documento de referência muito longo.
    
    TEXTO ORIGINAL:
    ${safeText}
    
    Por favor, faça um resumo focando EXCLUSIVAMENTE nos contextos e tópicos mais relevantes sobre: "${objectiveContext}".
    Preserve conceitos importantes, diretrizes e informações cruciais.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || safeText.substring(0, 15000);
  } catch (e) {
    console.error('Failed to summarize long text:', e);
    return safeText.substring(0, 15000) + '... (texto truncado por erro ao resumir)';
  }
}

export async function generateMacroStructure(metadata: BookMetadata): Promise<Part[]> {
  const ai = getAI();
  
  const summarizedPac = await getSummarizedContext(metadata.pacContent, `Estrutura macro do livro, índice e ementa para a disciplina de ${metadata.discipline.subject}`);

  const prompt = `
    Atue como um Engenheiro Pedagógico Especialista com formação em Ivy League.
    Crie uma estrutura de livro didático (Índice / Espinha de Peixe) com base nas Quatro Causas Pedagógicas:
    
    [FASE I: CAUSA FORMAL - IDENTIDADE INSTITUCIONAL]
    - Escola: ${metadata.institutional.schoolName}
    - Ethos Pedagógico: ${metadata.institutional.pedagogicalEthos}
    - Contexto do PPP: ${metadata.institutional.pppContext}
    - Regionalidade: ${metadata.institutional.regionality}

    [FASE II: CAUSA MATERIAL - O SUJEITO]
    - Público-Alvo: ${metadata.course.targetAudience}
    - Maturidade Cognitiva: ${metadata.course.cognitiveMaturity}
    - Nível de Rigor (Ascese): ${metadata.course.rigorLevel}
    - Objetivo Final (Teleologia): ${metadata.course.courseGoal}

    [FASE III: CAUSA FINAL - DISCIPLINA E DIDÁTICA]
    - Disciplina: ${metadata.discipline.subject}
    - Série/Ano: ${metadata.discipline.grade}
    - Objetivos de Aprendizado: ${metadata.discipline.learningObjectives}
    - Metodologia: ${metadata.discipline.methodology}
    - Ganchos Interdisciplinares: ${metadata.discipline.interdisciplinaryHooks}

    [FASE IV: CAUSA EFICIENTE - VOZ E TOM]
    - Tom de Voz: ${metadata.style.authorTone}
    - Complexidade da Linguagem: ${metadata.style.languageComplexity}

    [FASE V: ESTÉTICA DO MATERIAL - VISUAL E ESTRUTURAL]
    - Frequência de Exercícios: ${metadata.visual.exercisePlacement}
    - Tom Visual: ${metadata.visual.visualTone}
    - Densidade de Imagens: ${metadata.visual.imageDensity}
    - Estilo de Imagens: ${metadata.visual.imageStyle}
    - Layout das Páginas: ${metadata.visual.layoutStyle}

    ${summarizedPac ? `[PLANO ANUAL DO CURSO (PAC)]\nConsidere o seguinte Plano Anual do Curso fornecido como base obrigatória para a estrutura e tópicos abordados:\n${summarizedPac}\n\n[MUITO IMPORTANTE - ORDEM E PROGRESSÃO]: A estrutura gerada DEVE seguir ESTRITAMENTE a ordem cronológica, temas e progressão apresentados no PAC. Não inverta a ordem dos conteúdos.` : ''}

    [MUITO IMPORTANTE - TAGS DE APRENDIZADO]: Para cada sessão criada, identifique quais objetivos de aprendizado da lista DE ENTRADA ("${metadata.discipline.learningObjectives}") são tratados.
    REGRAS ESTRITAS PARA TAGS:
    1. Se os objetivos de entrada contiverem códigos BNCC (ex: (EF05CO01)), as tags para essas competências DEVEM ser APENAS o código (ex: "EF05CO01"). REMOVA toda e qualquer descrição textual.
    2. Se a entrada consistir exclusivamente de competências codificadas, as tags DEVEM ser exclusivamente os códigos.
    3. Para objetivos puramente textuais (sem código), use fragmentos literais e curtíssimos do texto original, garantindo assimilação direta sem resumos interpretativos.
    Extraia esses tópicos para o array 'pacObjectives'.

    A estrutura deve conter Partes, Capítulos e Sessões. Exige-se que os títulos e objetivos sejam ALTAMENTE EXAUSTIVOS, DETALHADOS E RICOS EM CONTEÚDO, englobando sub-tópicos e detalhando o que será abordado (não seja genérico).
    Para cada Sessão, defina um título e um objetivo claro que respeite o Rigor e a Maturidade Cognitiva definidos.
    
    ${metadata.visual.exercisePlacement === 'CAPITULO' ? `[MUITO IMPORTANTE - EXERCÍCIOS MACRO]: O professor escolheu a frequência de exercícios como 'Por Capítulo'. Portanto, você DEVE CRIAR OBRIGATORIAMENTE uma última sessão em TODO Capítulo chamada EXATAMENTE "Exercícios". O objetivo dessa sessão deve ser: "Resolução de exercícios que abrangem todo o conteúdo deste capítulo".` : ''}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        description: 'Lista de partes do livro',
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  objective: { type: Type.STRING },
                  sessions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        objective: { type: Type.STRING },
                        pacObjectives: { 
                          type: Type.ARRAY, 
                          items: { type: Type.STRING },
                          description: 'Objetivos de aprendizagem do PAC que são cobertos nesta sessão'
                        }
                      },
                      required: ['id', 'title', 'objective']
                    }
                  }
                },
                required: ['id', 'title', 'objective', 'sessions']
              }
            }
          },
          required: ['id', 'title', 'chapters']
        }
      }
    }
  });

  try {
    const parts = JSON.parse(response.text || '[]');
    // Adiciona campos default
    return parts.map((p: any) => ({
      ...p,
      chapters: p.chapters.map((c: any) => ({
        ...c,
        status: 'PENDING',
        sessions: c.sessions.map((s: any) => ({
          ...s,
          status: 'PENDING',
          content: '',
          summary: '',
          approach: '',
          anchors: '',
          entities: [],
          pacObjectives: s.pacObjectives || [],
          layoutId: DEFAULT_LAYOUT_ID
        }))
      }))
    }));
  } catch (e) {
    console.error('Failed to parse macro structure', e);
    return [];
  }
}

export async function refineMacroStructure(currentParts: Part[], metadata: BookMetadata, userPrompt: string): Promise<Part[]> {
  const ai = getAI();
  
  const summarizedPac = await getSummarizedContext(metadata.pacContent, `Adaptações ou análise de estrutura para o índice do livro focando na instrução: ${userPrompt}`);

  const prompt = `
    Atue como um Engenheiro Pedagógico Especialista.
    Aqui está a estrutura atual do livro didático (em JSON):
    ${JSON.stringify(currentParts)}

    Parâmetros do livro (As Quatro Causas):
    [CAUSA FORMAL] Ethos: ${metadata.institutional.pedagogicalEthos}, PPP: ${metadata.institutional.pppContext}
    [CAUSA MATERIAL] Público: ${metadata.course.targetAudience}, Rigor: ${metadata.course.rigorLevel}, Maturidade: ${metadata.course.cognitiveMaturity}
    [CAUSA FINAL] Disciplina: ${metadata.discipline.subject}, Objetivos: ${metadata.discipline.learningObjectives}, Metodologia: ${metadata.discipline.methodology}
    [CAUSA EFICIENTE] Tom: ${metadata.style.authorTone}, Linguagem: ${metadata.style.languageComplexity}
    [ESTÉTICA] Visual: ${metadata.visual.visualTone}, Imagens: ${metadata.visual.imageStyle}, Exercícios: ${metadata.visual.exercisePlacement}

    ${summarizedPac ? `[PLANO ANUAL DO CURSO (PAC) - RESUMO]\nConsidere o seguinte PAC fornecido como base obrigatória:\n${summarizedPac}\n\n[MUITO IMPORTANTE - ORDEM E PROGRESSÃO]: A estrutura DEVE continuar seguindo ESTRITAMENTE a ordem e progressão ditadas pelo PAC.` : ''}

    [MUITO IMPORTANTE - TAGS DE APRENDIZADO]: Para cada sessão criada/atualizada, identifique quais objetivos de aprendizado da lista DE ENTRADA ("${metadata.discipline.learningObjectives}") são tratados.
    REGRAS ESTRITAS PARA TAGS:
    1. Se os objetivos de entrada contiverem códigos BNCC (ex: (EF05CO01)), as tags para essas competências DEVEM ser APENAS o código (ex: "EF05CO01"). REMOVA toda e qualquer descrição textual.
    2. Se a entrada consistir exclusivamente de competências codificadas, as tags DEVEM ser exclusivamente os códigos.
    3. Para objetivos puramente textuais (sem código), use fragmentos literais e curtíssimos do texto original, garantindo assimilação direta sem resumos interpretativos.
    Extraia esses tópicos para o array 'pacObjectives'.

    O professor solicitou a seguinte alteração no índice: "${userPrompt}"

    Retorne a estrutura completa atualizada em JSON. Mantenha os IDs existentes para os itens que não foram removidos.
    A estrutura deve conter Partes, Capítulos e Sessões. Exige-se que os objetivos e sub-tópicos sejam MUITO DETALHADOS e densos, usando amplamente o PAC.
    
    ${metadata.visual.exercisePlacement === 'CAPITULO' ? `[MUITO IMPORTANTE - EXERCÍCIOS MACRO]: Nunca remova a sessão final "Exercícios" dos capítulos, a menos que o professor explicitamente peça. Todo capítulo deve terminar com a sessão "Exercícios".` : ''}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        description: 'Lista de partes do livro',
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  objective: { type: Type.STRING },
                  sessions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        objective: { type: Type.STRING },
                        pacObjectives: { 
                          type: Type.ARRAY, 
                          items: { type: Type.STRING }
                        }
                      },
                      required: ['id', 'title', 'objective']
                    }
                  }
                },
                required: ['id', 'title', 'objective', 'sessions']
              }
            }
          },
          required: ['id', 'title', 'chapters']
        }
      }
    }
  });

  try {
    const parts = JSON.parse(response.text || '[]');

    // Helper to find existing item to preserve content
    const findExisting = (arr: any[], id: string) => arr.find((item: any) => item.id === id) || {};

    return parts.map((p: any) => {
      const existingPart = findExisting(currentParts, p.id);
      return {
        ...existingPart,
        ...p,
        chapters: p.chapters.map((c: any) => {
          const existingChapter = existingPart.chapters ? findExisting(existingPart.chapters, c.id) : {};
          return {
            status: 'PENDING',
            ...existingChapter,
            ...c,
            sessions: c.sessions.map((s: any) => {
              const existingSession = existingChapter.sessions ? findExisting(existingChapter.sessions, s.id) : {};
              return {
                status: 'PENDING',
                content: '',
                summary: '',
                approach: '',
                anchors: '',
                entities: [],
                pacObjectives: s.pacObjectives || [],
                layoutId: DEFAULT_LAYOUT_ID,
                ...existingSession,
                ...s,
              };
            })
          };
        })
      };
    });
  } catch (e) {
    console.error('Failed to parse refined macro structure', e);
    throw e;
  }
}

export async function suggestMetadataField(field: string, metadata: BookMetadata, userPrompt?: string, currentValue?: string): Promise<string> {
  const ai = getAI();
  const context = `
    Escola: ${metadata.institutional.schoolName}
    Ethos: ${metadata.institutional.pedagogicalEthos}
    Disciplina: ${metadata.discipline.subject}
    Série: ${metadata.discipline.grade}
    Rigor: ${metadata.course.rigorLevel}
    Maturidade: ${metadata.course.cognitiveMaturity}
    Objetivos: ${metadata.discipline.learningObjectives}
  `;

  const actionInstruction = currentValue
    ? `O usuário forneceu o seguinte rascunho ou comando base:\n"${currentValue}"\n\nSua tarefa é expandir, aprimorar e formatar este texto adequadamente para o campo solicitado. Se o texto for apenas uma instrução curta (ex: "focar em metodologias ativas"), gere o texto completo baseado nessa instrução e no contexto.`
    : `Sua tarefa é CRIAR um novo texto. ${userPrompt ? `Siga esta diretriz específica do usuário: "${userPrompt}"` : ''}`;

  let prompt = '';
  switch (field) {
    case 'pedagogicalEthos':
      prompt = `Atue como um especialista em filosofia da educação.\nCom base no contexto abaixo, escreva/aprimore o "Ethos Pedagógico" (a alma da escola, seus valores fundamentais e visão de mundo).\n\n${actionInstruction}\n\nContexto:\n${context}`;
      break;
    case 'pppContext':
      prompt = `Atue como um especialista em gestão escolar.\nCom base no contexto abaixo, escreva/aprimore o "Contexto do PPP" (como este livro se insere no Projeto Político Pedagógico da instituição).\n\n${actionInstruction}\n\nContexto:\n${context}`;
      break;
    case 'targetAudience':
      prompt = `Atue como um especialista em psicologia educacional.\nCom base no contexto abaixo, escreva/aprimore o "Público-Alvo" (perfil socioeconômico, interesses, desafios e características dos alunos).\n\n${actionInstruction}\n\nContexto:\n${context}`;
      break;
    case 'cognitiveMaturity':
      prompt = `Atue como um especialista em desenvolvimento cognitivo.\nCom base no contexto abaixo, descreva a "Maturidade Cognitiva" esperada (estágio de desenvolvimento de Piaget/Vygotsky, capacidade de abstração, pré-requisitos).\n\n${actionInstruction}\n\nContexto:\n${context}`;
      break;
    case 'learningObjectives':
      prompt = `Atue como um engenheiro pedagógico.\nCom base no contexto abaixo, escreva/aprimore os "Objetivos de Aprendizado" (habilidades, competências, o que o aluno deve ser capaz de fazer ao final).\n\n${actionInstruction}\n\nContexto:\n${context}`;
      break;
    case 'methodology':
      prompt = `Atue como um especialista em metodologias ativas e tradicionais.\nCom base no contexto abaixo, descreva a "Metodologia" de ensino (como o conteúdo será abordado: socrático, PBL, aula expositiva, etc).\n\n${actionInstruction}\n\nContexto:\n${context}`;
      break;
    case 'authorTone':
      prompt = `Atue como um editor de livros didáticos.\nCom base no contexto abaixo, defina o "Tom de Voz" do autor (ex: acolhedor, rigoroso, desafiador, narrativo).\n\n${actionInstruction}\n\nContexto:\n${context}`;
      break;
    case 'imageStyle':
      prompt = `Atue como um diretor de arte editorial.\nCom base no contexto abaixo, descreva o "Estilo de Imagens" ideal para o material (ex: ilustrações minimalistas, fotos históricas, diagramas técnicos).\n\n${actionInstruction}\n\nContexto:\n${context}`;
      break;
    case 'layoutStyle':
      prompt = `Atue como um designer gráfico editorial.\nCom base no contexto abaixo, descreva o "Layout das Páginas" (ex: clean com margens largas, denso estilo enciclopédia, dinâmico com boxes).\n\n${actionInstruction}\n\nContexto:\n${context}`;
      break;
    case 'evaluationArchitecture':
      prompt = `Atue como um especialista em avaliação educacional.\nCom base no contexto abaixo, descreva a "Arquitetura de Avaliação" (como o progresso será medido, tipos de questões, frequência).\n\n${actionInstruction}\n\nContexto:\n${context}`;
      break;
    case 'interdisciplinaryHooks':
      prompt = `Atue como um coordenador pedagógico.\nCom base no contexto abaixo, sugira "Ganchos Interdisciplinares" (conexões com outras matérias e temas transversais).\n\n${actionInstruction}\n\nContexto:\n${context}`;
      break;
    case 'regionality':
      prompt = `Atue como um sociólogo da educação.\nCom base no contexto abaixo, descreva a "Regionalidade" e contexto socioeconômico que deve permear o material.\n\n${actionInstruction}\n\nContexto:\n${context}`;
      break;
    default:
      prompt = `Atue como um especialista em educação.\nCom base no contexto abaixo, escreva/aprimore o campo "${field}".\n\n${actionInstruction}\n\nContexto:\n${context}`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text?.trim() || '';
}

export async function suggestApproach(objective: string, previousContent?: string): Promise<string> {
  const ai = getAI();
  const prompt = `
    Com base no objetivo da sessão: "${objective}"
    ${previousContent ? `E considerando o contexto anterior: "${previousContent.substring(0, 500)}..."` : ''}
    Sugira uma abordagem pedagógica (1 parágrafo curto) para ensinar este tópico.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text || '';
}

export async function generateSessionContent(payload: SlidingWindowPayload): Promise<{ content: string, summary: string, entities: string[] }> {
  const ai = getAI();
  
  const summarizedPac = await getSummarizedContext(
    payload.metadata.pacContent, 
    `Ensino do tópico: '${payload.currentObjective}' no capítulo '${payload.chapterObjective}'`
  );
  
  let prevSum = payload.previousSummaries || 'Nenhum contexto anterior.';
  if (prevSum.length > 15000) prevSum = '... ' + prevSum.substring(prevSum.length - 15000);
  
  let lastPars = payload.lastParagraphs || 'Início do capítulo.';
  if (lastPars.length > 5000) lastPars = '... ' + lastPars.substring(lastPars.length - 5000);

  const prompt = `
Você é um co-piloto e autor especialista em materiais didáticos de altíssima qualidade.
Sua missão é escrever o conteúdo da sessão atual garantindo que ele seja engajador, pedagogicamente correto e EXATAMENTE ajustado para o público-alvo definido.

[PÚBLICO-ALVO E TOM DE VOZ - DIRETRIZ ESTRITA]
Público-alvo: ${payload.metadata.course.targetAudience} (Série: ${payload.metadata.discipline.grade})
Tom e Complexidade: ${payload.metadata.style.authorTone} (${payload.metadata.style.languageComplexity})
Maturidade Cognitiva: ${payload.metadata.course.cognitiveMaturity}
Regra de Vocabulário: Ajuste a sintaxe, o tamanho das frases e a complexidade das palavras para que sejam perfeitamente compreensíveis pelo público-alvo acima. Use analogias adequadas a esta faixa etária.

[CONTEXTO MACRO]
Objetivo do Capítulo: ${payload.chapterObjective}

[SESSÕES ANTERIORES - ESTADO E CONEXÃO]
Abaixo está o resumo JSON das sessões já cobertas e os conceitos-chave (entities) introduzidos.
${prevSum}

Regra de Continuidade: Seu texto deve avançar no conteúdo. Como estamos escrevendo para o ${payload.metadata.course.targetAudience} (${payload.metadata.discipline.grade}), você pode fazer breves recapitulações (pontes didáticas) desses conceitos se ajudar na compreensão do novo assunto, mas NUNCA repita blocos inteiros de texto ou crie seções redundantes. Avance o aprendizado de forma fluida.

[GANCHO DE TRANSIÇÃO (Últimos parágrafos da sessão anterior)]
${lastPars}

[DIRETRIZES PARA ESTA SESSÃO]
Objetivo Específico: ${payload.currentObjective}
Abordagem Pedagógica: ${payload.pedagogicalApproach}
Conhecimento Âncora (Anotações do Professor): ${payload.anchors}

[ESTILO VISUAL ESPERADO]
Tom Visual: ${payload.metadata.visual.visualTone}
Densidade de Imagens: ${payload.metadata.visual.imageDensity}
Estilo de Imagens: ${payload.metadata.visual.imageStyle}

${summarizedPac ? `[PLANO ANUAL DO CURSO (PAC) - RESUMO]\nCertifique-se de que o conteúdo desenvolva os tópicos do PAC relacionados a esta sessão:\n${summarizedPac}\n` : ''}

[INSTRUÇÕES DE SAÍDA]
Escreva o texto didático em HTML de forma clara, impecável, alinhada à abordagem sugerida e absolutamente sem inserir emojis.
Se necessário, insira placeholders de media como <img_req desc="descrição da imagem"></img_req>.

${payload.metadata.visual.exercisePlacement === 'SESSAO' ? `[EXERCÍCIOS DE SESSÃO]: OBRIGATORIAMENTE ao final do HTML retornado, adicione uma sub-seção (Fixação) contendo uma tag de exercício prático sugerido e adequado à faixa etária, no modelo: \`<q_req desc="Questão de [tipo de questão] sobre {foco prático do que foi ensinado}"></q_req>\`.` : ''}

Retorne um objeto JSON estrito contendo:
- 'content': O texto didático completo em HTML.
- 'summary': Um resumo conciso (2 frases) do que foi abordado nesta sessão específica.
- 'entities': Um array de strings com as entidades/conceitos PRINCIPAIS abordados APENAS nesta sessão (ex: ["Fotossíntese", "Clorofila"]).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          content: { type: Type.STRING, description: 'Texto didático estruturado e profundo formatado em HTML' },
          summary: { type: Type.STRING, description: 'Resumo curto da sessão' },
          entities: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: 'Lista de conceitos-chave ensinados nesta sessão' 
          }
        },
        required: ['content', 'summary', 'entities']
      }
    }
  });

  try {
    return JSON.parse(response.text || '{"content": "", "summary": "", "entities": []}');
  } catch (e) {
    return { content: response.text || '', summary: '', entities: [] };
  }
}

export async function chatWithAssistant(messages: { role: string, content: string }[], metadata: BookMetadata, context?: string): Promise<string> {
  const ai = getAI();

  let systemInstruction = `
    Você é um Assistente Cognitivo Pedagógico Especialista (formação Ivy League).
    Seu objetivo é auxiliar o professor na autoria de um livro didático de alta qualidade.
    
    [CONTEXTO DO LIVRO - AS QUATRO CAUSAS]
    - Escola: ${metadata.institutional.schoolName} (${metadata.institutional.pedagogicalEthos})
    - Público: ${metadata.course.targetAudience} (Maturidade: ${metadata.course.cognitiveMaturity})
    - Disciplina: ${metadata.discipline.subject} (${metadata.discipline.grade})
    - Rigor Acadêmico: ${metadata.course.rigorLevel}
    - Tom do Autor: ${metadata.style.authorTone}
    - Estética Visual: ${metadata.visual.visualTone} (${metadata.visual.imageStyle})
    
    Ajude a debater conceitos, simplificar explicações, criar analogias ou sugerir atividades que respeitem este contexto.
  `;

  if (context) {
    systemInstruction += `\n\nO professor selecionou o seguinte trecho do texto para discutir:\n"${context}"`;
  }

  const chat = ai.chats.create({
    model: 'gemini-3.1-pro-preview',
    config: {
      systemInstruction,
    }
  });

  // Replay history
  for (let i = 0; i < messages.length - 1; i++) {
    await chat.sendMessage({ message: messages[i].content });
  }

  const lastMessage = messages[messages.length - 1];
  const response = await chat.sendMessage({ message: lastMessage.content });

  return response.text || '';
}


/** Fast cheap agent: returns true when ALL objectives are BNCC-coded lines */
async function detectOnlyBncc(learningObjectives: string): Promise<boolean> {
  const ai = getAI();
  const prompt = `
    Analyze the following text. The text is a list of learning objectives.
    Your ONLY job is to determine whether EVERY objective line is a BNCC competency code (e.g. EF05CO01, EM13MAT01) optionally followed by its description.
    If ALL lines follow the pattern "<code> <optional description>" where the code starts with letters followed by digits, answer true.
    If there is at least one line that is a free-text objective with NO associated code, answer false.

    Text to analyze:
    """
    ${learningObjectives}
    """

    Respond ONLY with a JSON object: { "onlyBncc": true } or { "onlyBncc": false }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    const result = JSON.parse(response.text || '{"onlyBncc": false}');
    return result.onlyBncc === true;
  } catch {
    return false;
  }
}

/** Deterministically extract BNCC codes from the objectives text using a regex */
function extractBnccCodes(learningObjectives: string): string[] {
  const bnccRegex = /\b([A-Z]{2}\d{2}[A-Z]{2}\d{2,})\b/g;
  const codes: string[] = [];
  let match;
  while ((match = bnccRegex.exec(learningObjectives)) !== null) {
    if (!codes.includes(match[1])) {
      codes.push(match[1]);
    }
  }
  return codes;
}

/** Map each session id to the BNCC codes relevant to it by asking the AI to match */
async function mapBnccCodesToSessions(
  codes: string[],
  parts: Part[]
): Promise<Record<string, string[]>> {
  const ai = getAI();
  const sessions = parts.flatMap(p =>
    p.chapters.flatMap(c =>
      c.sessions.map(s => ({ id: s.id, title: s.title, objective: s.objective }))
    )
  );

  const prompt = `
    You have a list of BNCC competency codes: ${JSON.stringify(codes)}
    And a list of book sessions (id, title, objective): ${JSON.stringify(sessions)}

    For each session, determine which BNCC codes are related to its content.
    Return ONLY a JSON object where keys are session IDs and values are arrays of BNCC code strings.
    Example: { "uuid-123": ["EF05CO01", "EF05CO03"] }
    If a session doesn't match any code, use an empty array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
  } catch {
    return {};
  }
}

export async function assignSectionTags(metadata: BookMetadata, parts: Part[]): Promise<Part[]> {
  const ai = getAI();

  // Stage 1: Detect if objectives are purely BNCC codes
  const onlyBncc = await detectOnlyBncc(metadata.discipline.learningObjectives);

  let tagsMap: Record<string, string[]>;

  if (onlyBncc) {
    // Stage 2a: Extract BNCC codes deterministically and map to sessions
    const codes = extractBnccCodes(metadata.discipline.learningObjectives);
    tagsMap = await mapBnccCodesToSessions(codes, parts);
  } else {
    // Stage 2b: Use AI to generate tags from free-text objectives
    const prompt = `
      Atue como um Especialista em Taxonomia Educacional.
      Seu objetivo é extrair tags concisas para cada sessão, baseando-se nos Objetivos de Aprendizado fornecidos.

      [OBJETIVOS DE APRENDIZADO]
      ${metadata.discipline.learningObjectives}

      [ESTRUTURA DO LIVRO]
      ${JSON.stringify(parts.map(p => ({
        title: p.title,
        chapters: p.chapters.map(c => ({
          title: c.title,
          sessions: c.sessions.map(s => ({ id: s.id, title: s.title, objective: s.objective }))
        }))
      })))}

      [REGRA]: As tags devem ser fragmentos RECONHECÍVEIS e LITERAIS do texto de objetivos. Não invente categorias.
      Retorne um objeto JSON onde as chaves são os IDs das sessões e os valores são arrays de strings (as tags, máximo 3).
      Exemplo: { "uuid-123": ["Reconhecer objetos representados por listas", "Manipulações simples sobre sequências"] }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    try {
      tagsMap = JSON.parse(response.text || '{}');
    } catch {
      tagsMap = {};
    }
  }

  return parts.map(part => ({
    ...part,
    chapters: part.chapters.map(chapter => ({
      ...chapter,
      sessions: chapter.sessions.map(session => ({
        ...session,
        pacObjectives: tagsMap[session.id] || session.pacObjectives || []
      }))
    }))
  }));
}

export async function generateQuestion(context: string, difficulty: string): Promise<string> {
  const ai = getAI();
  const prompt = `
    Atue como um elaborador de questões de provas (banca examinadora).
    Com base no seguinte trecho de conteúdo:
    "${context}"

    Crie uma questão de múltipla escolha (com 5 alternativas, A a E) adequada para o nível de dificuldade: ${difficulty}.
    A questão deve ser contextualizada e avaliar a compreensão do conceito.
    Forneça a resposta correta e uma breve resolução/justificativa.
    
    Formate a saída em HTML, usando negrito para a pergunta e listas para as alternativas. Inclua a tag **Gabarito:** no final.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
  });

  return response.text || '';
}


export async function generateImage(context: string): Promise<string> {
  const ai = getAI();

  // First, generate a good prompt for the image model based on the educational context
  const promptForImage = `
    Crie um prompt em inglês, curto e descritivo (máximo 2 frases), para gerar uma ilustração didática sobre o seguinte trecho:
    "${context}"
    
    O estilo deve ser "clean, flat vector illustration, educational, textbook style, white background".
    Retorne APENAS o prompt em inglês, sem aspas ou explicações.
  `;

  const promptResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: promptForImage,
  });

  const imagePrompt = promptResponse.text?.trim() || 'educational illustration';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          { text: imagePrompt }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        if (!base64EncodeString) {
          continue;
        }
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }
  } catch (e) {
    console.error('Failed to generate image', e);
  }

  return '';
}
