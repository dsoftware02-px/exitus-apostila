import { GoogleGenAI, Type } from '@google/genai';
import { BookMetadata, Part, SlidingWindowPayload } from '../types';

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

export async function generateMacroStructure(metadata: BookMetadata): Promise<Part[]> {
  const ai = getAI();

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

    A estrutura deve conter Partes, Capítulos e Sessões.
    Para cada Sessão, defina um título e um objetivo claro que respeite o Rigor e a Maturidade Cognitiva definidos.
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
                        objective: { type: Type.STRING }
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
          anchors: ''
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

    O professor solicitou a seguinte alteração no índice: "${userPrompt}"

    Retorne a estrutura completa atualizada em JSON. Mantenha os IDs existentes para os itens que não foram removidos.
    A estrutura deve conter Partes, Capítulos e Sessões. Para cada Sessão, defina um título e um objetivo claro.
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
                        objective: { type: Type.STRING }
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

export async function generateSessionContent(payload: SlidingWindowPayload): Promise<{ content: string, summary: string }> {
  const ai = getAI();

  const prompt = `
    Você é um co-piloto de autoria de livros didáticos. Escreva o conteúdo para a sessão atual.
    
    [CONTEXTO MACRO]
    Objetivo do Capítulo: ${payload.chapterObjective}
    
    [CONTEXTO ANTERIOR (Resumo)]
    ${payload.previousSummaries || 'Nenhum contexto anterior.'}
    
    [GANCHO DE TRANSIÇÃO (Últimos parágrafos da sessão anterior)]
    ${payload.lastParagraphs || 'Início do capítulo.'}
    
    [DIRETRIZES PARA ESTA SESSÃO]
    Objetivo: ${payload.currentObjective}
    Abordagem Pedagógica: ${payload.pedagogicalApproach}
    Conhecimento Âncora (Tópicos/Anotações do Professor): ${payload.anchors}
    
    [ESTILO VISUAL ESPERADO]
    Tom Visual: ${payload.metadata.visual.visualTone}
    Densidade de Imagens: ${payload.metadata.visual.imageDensity}
    Estilo de Imagens: ${payload.metadata.visual.imageStyle}
    
    Escreva o texto didático de forma clara, engajadora e alinhada à abordagem sugerida.
    **MUITO IMPORTANTE:** O texto gerado DEVE SER EM HTML VÁLIDO (usando <h1>, <h2>, <p>, <strong>, <ul>, etc). NÃO use Markdown.
    Se necessário, insira placeholders exatamente como estas tags HTML customizadas (com um espaço antes de fechá-las caso necessário):
    <img_req desc="descrição detalhada da imagem necessária"></img_req>
    <q_req desc="descrição do exercício ou reflexão socrática"></q_req>
    
    Retorne um JSON com o 'content' (o texto gerado em HTML) e um 'summary' (um resumo de 2 frases do que foi abordado, para ser usado no contexto das próximas sessões).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          content: { type: Type.STRING, description: 'Texto didático formatado em HTML' },
          summary: { type: Type.STRING, description: 'Resumo curto da sessão' }
        },
        required: ['content', 'summary']
      }
    }
  });

  try {
    return JSON.parse(response.text || '{"content": "", "summary": ""}');
  } catch (e) {
    return { content: response.text || '', summary: '' };
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

export async function generateQuestion(context: string, difficulty: string): Promise<string> {
  const ai = getAI();
  const prompt = `
    Atue como um elaborador de questões de provas (banca examinadora).
    Com base no seguinte trecho de conteúdo:
    "${context}"

    Crie uma questão de múltipla escolha (com 5 alternativas, A a E) adequada para o nível de dificuldade: ${difficulty}.
    A questão deve ser contextualizada e avaliar a compreensão do conceito.
    Forneça a resposta correta e uma breve resolução/justificativa.
    
    Formate a saída em Markdown, usando negrito para a pergunta e listas para as alternativas. Inclua a tag **Gabarito:** no final.
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
        const base64EncodeString: string = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }
  } catch (e) {
    console.error('Failed to generate image', e);
  }

  return '';
}
