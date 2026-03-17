import React, { useState, useEffect } from 'react';
import localforage from 'localforage';
import { AppState, Book, BookMetadata, Session, Chapter } from './types';
import { SetupForm } from './components/SetupForm';
import { MacroPlanner } from './components/MacroPlanner';
import { BookMap } from './components/BookMap';
import { Editor } from './components/Editor';
import { Assistant } from './components/Assistant';
import { BookPreview } from './components/BookPreview';
import { RotateCcw, Sparkles, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Loader2 } from 'lucide-react';

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('edtech_appState');
    return (saved as AppState) || 'SETUP';
  });
  
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  
  const [book, setBook] = useState<Book>({
    metadata: { 
      institutional: { schoolName: '', pedagogicalEthos: '', pppContext: '', regionality: '' },
      course: { targetAudience: '', cognitiveMaturity: '', rigorLevel: 'INTERMEDIARIO', courseGoal: '' },
      discipline: { subject: '', grade: '', learningObjectives: '', methodology: 'EXPOSITIVA', evaluationArchitecture: '', interdisciplinaryHooks: '' },
      style: { authorTone: '', languageComplexity: '', structureLevel1: 'Unidade', structureLevel2: 'Capítulo' },
      visual: { exercisePlacement: 'SESSAO', visualTone: 'SOBRIO', imageDensity: 'MEDIA', imageStyle: '', layoutStyle: '' }
    },
    parts: []
  });
  
  const [activeChapterId, setActiveChapterId] = useState<string | null>(() => localStorage.getItem('edtech_activeChapterId'));
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => localStorage.getItem('edtech_activeSessionId'));
  const [assistantContext, setAssistantContext] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [lastGeneratedMetadata, setLastGeneratedMetadata] = useState<BookMetadata | null>(() => {
    const saved = localStorage.getItem('edtech_lastGeneratedMetadata');
    return saved ? JSON.parse(saved) : null;
  });

  // Initial Load from localforage
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedBook = await localforage.getItem<Book>('edtech_book');
        if (savedBook) {
          setBook(savedBook);
        }
      } catch (err) {
        console.error('Failed to load book from IndexedDB:', err);
      } finally {
        setIsDataLoaded(true);
      }
    };
    loadSavedData();
  }, []);

  // Auto-save
  useEffect(() => {
    localStorage.setItem('edtech_appState', appState);
  }, [appState]);

  useEffect(() => {
    if (lastGeneratedMetadata) {
      localStorage.setItem('edtech_lastGeneratedMetadata', JSON.stringify(lastGeneratedMetadata));
    }
  }, [lastGeneratedMetadata]);

  useEffect(() => {
    if (isDataLoaded) {
      localforage.setItem('edtech_book', book);
    }
  }, [book, isDataLoaded]);

  useEffect(() => {
    if (activeChapterId) localStorage.setItem('edtech_activeChapterId', activeChapterId);
    else localStorage.removeItem('edtech_activeChapterId');
  }, [activeChapterId]);

  useEffect(() => {
    if (activeSessionId) localStorage.setItem('edtech_activeSessionId', activeSessionId);
    else localStorage.removeItem('edtech_activeSessionId');
  }, [activeSessionId]);

  const handleReset = () => {
    setIsResetModalOpen(true);
  };

  const confirmReset = () => {
    localStorage.clear();
    localforage.clear();
    setAppState('SETUP');
    setBook({
      metadata: { 
        institutional: { schoolName: '', pedagogicalEthos: '', pppContext: '', regionality: '' },
        course: { targetAudience: '', cognitiveMaturity: '', rigorLevel: 'INTERMEDIARIO', courseGoal: '' },
        discipline: { subject: '', grade: '', learningObjectives: '', methodology: 'EXPOSITIVA', evaluationArchitecture: '', interdisciplinaryHooks: '' },
        style: { authorTone: '', languageComplexity: '', structureLevel1: 'Unidade', structureLevel2: 'Capítulo' },
        visual: { exercisePlacement: 'SESSAO', visualTone: 'SOBRIO', imageDensity: 'MEDIA', imageStyle: '', layoutStyle: '' }
      },
      parts: []
    });
    setActiveChapterId(null);
    setActiveSessionId(null);
    setAssistantContext(null);
    setResetKey(prev => prev + 1);
    setIsResetModalOpen(false);
  };

  const handleSetupSubmit = (metadata: BookMetadata) => {
    // Check if metadata changed
    const metadataChanged = JSON.stringify(metadata) !== JSON.stringify(lastGeneratedMetadata);
    
    if (metadataChanged) {
      // If metadata changed, we force a new macro planning state by clearing current parts
      setBook({ ...book, metadata, parts: [] });
      setLastGeneratedMetadata(metadata);
    } else {
      setBook({ ...book, metadata });
    }
    
    setAppState('MACRO_PLANNING');
  };

  const handleMacroApprove = () => {
    setAppState('WORKSPACE');
    // Auto-select first session if available
    if (book.parts.length > 0 && book.parts[0].chapters.length > 0 && book.parts[0].chapters[0].sessions.length > 0) {
      setActiveChapterId(book.parts[0].chapters[0].id);
      setActiveSessionId(book.parts[0].chapters[0].sessions[0].id);
    }
  };

  const handleUpdateSession = (chapterId: string, sessionId: string, updates: Partial<Session>) => {
    setBook(prevBook => {
      const newParts = prevBook.parts.map(part => ({
        ...part,
        chapters: part.chapters.map(chapter => {
          if (chapter.id !== chapterId) return chapter;
          return {
            ...chapter,
            sessions: chapter.sessions.map(session => {
              if (session.id !== sessionId) return session;
              return { ...session, ...updates };
            })
          };
        })
      }));
      return { ...prevBook, parts: newParts };
    });
  };

  const getActiveChapter = (): Chapter | null => {
    if (!activeChapterId) return null;
    for (const part of book.parts) {
      const chapter = part.chapters.find(c => c.id === activeChapterId);
      if (chapter) return chapter;
    }
    return null;
  };

  const getActiveSession = (): Session | null => {
    const chapter = getActiveChapter();
    if (!chapter || !activeSessionId) return null;
    return chapter.sessions.find(s => s.id === activeSessionId) || null;
  };

  const renderContent = () => {
    if (appState === 'SETUP') {
      return <SetupForm key={resetKey} initialData={book.metadata} onSubmit={handleSetupSubmit} />;
    }

    if (appState === 'MACRO_PLANNING') {
      return (
        <MacroPlanner 
          book={book} 
          onUpdateBook={setBook} 
          onApprove={handleMacroApprove}
          onBack={() => setAppState('SETUP')}
        />
      );
    }

    if (appState === 'PREVIEW') {
      return <BookPreview book={book} onBack={() => setAppState('WORKSPACE')} />;
    }

    return (
      <div className="h-full w-full flex overflow-hidden bg-zinc-100 relative">
        {/* Left Panel */}
        <div 
          className={`h-full shadow-sm z-10 transition-all duration-300 ease-in-out flex shrink-0 ${
            isLeftPanelOpen ? 'w-1/4 min-w-[250px] max-w-[350px]' : 'w-0 overflow-hidden'
          }`}
        >
          <div className="w-full min-w-[250px] h-full">
            <BookMap 
              book={book} 
              activeSessionId={activeSessionId}
              onSelectSession={(chapterId, session) => {
                setActiveChapterId(chapterId);
                setActiveSessionId(session.id);
              }}
              onPreview={() => setAppState('PREVIEW')}
            />
          </div>
        </div>

        {/* Center Panel */}
        <div className="flex-1 h-full shadow-xl z-20 relative flex flex-col min-w-0">
          {/* Panel Toggle Buttons */}
          <div className="absolute top-4 left-0 -ml-4 z-50">
            <button 
              onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
              className="bg-white border border-zinc-200 shadow-md rounded-full p-1.5 text-zinc-500 hover:text-zinc-900 transition-colors"
              title={isLeftPanelOpen ? "Recolher Mapa" : "Expandir Mapa"}
            >
              {isLeftPanelOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
          </div>
          <div className="absolute top-4 right-0 -mr-4 z-50">
            <button 
              onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
              className="bg-white border border-zinc-200 shadow-md rounded-full p-1.5 text-zinc-500 hover:text-zinc-900 transition-colors"
              title={isRightPanelOpen ? "Recolher Assistente" : "Expandir Assistente"}
            >
              {isRightPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          </div>

          <Editor 
            book={book}
            chapter={getActiveChapter()}
            session={getActiveSession()}
            onUpdateSession={handleUpdateSession}
            onUpdateBook={setBook}
            onBackToMacro={() => setAppState('MACRO_PLANNING')}
            activeChapterId={activeChapterId}
            onSelectSession={(chapterId, sessionId) => {
              setActiveChapterId(chapterId);
              setActiveSessionId(sessionId);
            }}
            onDiscussText={(text) => {
              setAssistantContext(text);
              if (!isRightPanelOpen) setIsRightPanelOpen(true);
            }}
          />
        </div>

        {/* Right Panel */}
        <div 
          className={`h-full shadow-sm z-10 transition-all duration-300 ease-in-out flex shrink-0 ${
            isRightPanelOpen ? 'w-1/4 min-w-[300px] max-w-[400px]' : 'w-0 overflow-hidden'
          }`}
        >
          <div className="w-full min-w-[300px] h-full">
            <Assistant 
              contextText={assistantContext}
              metadata={book.metadata}
              onClearContext={() => setAssistantContext(null)}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-zinc-100">
      {!isDataLoaded ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-12 h-12 text-zinc-400 animate-spin" />
          <p className="text-zinc-500 font-medium">Carregando dados...</p>
        </div>
      ) : (
        <>
          {/* Global Header */}
          <header className="h-14 bg-zinc-900 text-white flex items-center justify-between px-6 shrink-0 z-50 border-b border-zinc-800">
            <div className="flex items-center font-semibold text-lg tracking-tight">
              <Sparkles className="w-5 h-5 mr-2 text-blue-400" />
              EduCopilot
            </div>
            <button
              onClick={handleReset}
              className="text-sm flex items-center text-zinc-300 hover:text-white bg-zinc-800 hover:bg-red-600 px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Novo Projeto
            </button>
          </header>
          
          {/* Main Content */}
          <div className="flex-1 overflow-hidden relative">
             {renderContent()}
          </div>
        </>
      )}

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <RotateCcw className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-2">Começar Novo Projeto?</h2>
              <p className="text-zinc-600 mb-6">
                Tem certeza que deseja apagar todo o progresso atual? Esta ação não pode ser desfeita e todos os dados não salvos externamente serão perdidos.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmReset}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Sim, apagar tudo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
