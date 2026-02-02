
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { storageService } from './services/storageService';
import { aiService } from './services/aiService';
import { markdownService } from './services/markdownService';
import { Question, UserStats, Framework, Difficulty, Language, UserProfile, AIModelConfig, AIProvider } from './types';
import EditorPane from './components/EditorPane';
import StatsView from './components/StatsView';
import MarkdownViewer from './components/MarkdownViewer';
import ImportModal from './components/ImportModal';
import { translations } from './i18n';

const DEFAULT_REACT_INITIAL = `import React from 'react';\n\nexport default function App() {\n  return (\n    <div className="p-10">\n      <h1 className="text-2xl font-bold text-pink-500">Hello React</h1>\n    </div>\n  );\n}`;
const DEFAULT_VUE_INITIAL = `<script setup>\nimport { ref } from 'vue';\nconst msg = ref('Hello Vue');\n</script>\n\n<template>\n  <div class="p-10">\n    <h1 class="text-2xl font-bold text-pink-500">{{ msg }}</h1>\n  </div>\n</template>`;

const PROVIDERS: { id: AIProvider; name: string }[] = [
  { id: 'gemini', name: 'Google Gemini' },
  { id: 'openai', name: 'OpenAI' },
  { id: 'deepseek', name: 'DeepSeek' },
  { id: 'anthropic', name: 'Anthropic' },
  { id: 'groq', name: 'Groq' },
  { id: 'moonshot', name: 'Moonshot (Kimi)' },
  { id: 'qianwen', name: 'Qwen' },
  { id: 'hunyuan', name: 'Hunyuan' },
];

const FeedbackAnimation = ({ onComplete, message, type = 'success' }: { onComplete: () => void, message?: string, type?: 'success' | 'error' }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1800);
    if (type === 'success') {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f472b6', '#fb7185', '#fda4af', '#f9a8d4']
      });
    }
    return () => clearTimeout(timer);
  }, [onComplete, type]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-white/40 backdrop-blur-md animate-fade-in">
      <div className={`success-bg bg-white p-12 rounded-[4rem] shadow-2xl border flex flex-col items-center animate-sweet-pop ${type === 'success' ? 'border-pink-100' : 'border-red-100'}`}>
        {type === 'success' ? (
          <svg className="success-checkmark" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="25" fill="none" />
            <path fill="none" stroke="#f472b6" strokeWidth="4" strokeLinecap="round" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        ) : (
          <svg className="success-checkmark failure-cross" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="25" fill="none" />
            <path fill="none" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" d="M16 16L36 36M36 16L16 36" />
          </svg>
        )}
        <p className={`mt-6 text-xl font-black tracking-tighter uppercase ${type === 'success' ? 'text-pink-500' : 'text-red-500'}`}>
          {message || (type === 'success' ? 'Success ✨' : 'Failed ❌')}
        </p>
      </div>
    </div>
  );
};

function App() {
  const [lang, setLang] = useState<Language>(storageService.getLanguage());
  const [questions, setQuestions] = useState<Question[]>(storageService.getQuestions());
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [framework, setFramework] = useState<Framework>('react');
  const [view, setView] = useState<'editor' | 'stats'>('editor');
  const [magicTopic, setMagicTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState<UserStats>(storageService.getStats());
  const [showSettings, setShowSettings] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [feedback, setFeedback] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  
  const t = translations[lang];

  const categories = useMemo(() => {
    const cats = new Set(questions.map(q => q.category));
    return ['All', ...Array.from(cats)].filter(Boolean);
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    const term = magicTopic.toLowerCase(); 
    return questions.filter(q => {
      const matchesSearch = q.title.toLowerCase().includes(term) || 
                          q.tags.some(tag => tag.toLowerCase().includes(term));
      const matchesCategory = activeCategory === 'All' || q.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [questions, magicTopic, activeCategory]);

  useEffect(() => {
    if (!selectedQuestion && questions.length > 0) {
      setSelectedQuestion(questions[0]);
    }
  }, [questions, selectedQuestion]);

  useEffect(() => {
    storageService.setLanguage(lang);
  }, [lang]);

  const handleRefreshStats = useCallback(() => {
    const s = storageService.getStats();
    const q = storageService.getQuestions();
    setStats(s);
    setQuestions(q);
    return { s, q };
  }, []);

  const handleSave = (code: string, versionName?: string) => {
    if (!selectedQuestion) return;
    storageService.saveAttempt({
      id: Math.random().toString(36).substr(2, 9),
      questionId: selectedQuestion.id,
      framework,
      code,
      timestamp: Date.now(),
      status: 'passed',
      name: versionName
    });
    handleRefreshStats();
    setFeedback({ message: 'SAVED ✨', type: 'success' });
  };

  const handleTestConnection = async () => {
    if (!stats.aiConfig?.apiKey) {
      setFeedback({ message: lang === 'zh' ? '请填写 API Key' : 'Fill API Key', type: 'error' });
      return;
    }
    setTestStatus('testing');
    const result = await aiService.testConnection(stats.aiConfig);
    if (result) {
      setTestStatus('success');
      setFeedback({ message: 'CONNECTED ✨', type: 'success' });
    } else {
      setTestStatus('failed');
      setFeedback({ message: t.testFailed, type: 'error' });
    }
    setTimeout(() => setTestStatus('idle'), 3000);
  };

  const handleManualSave = () => {
    if (!newQuestion.title || !newQuestion.description) {
      setFeedback({ message: lang === 'zh' ? '标题和描述必填' : 'Title & Desc Required', type: 'error' });
      return;
    }
    const q: Question = {
      id: Math.random().toString(36).substr(2, 9),
      title: newQuestion.title!,
      difficulty: newQuestion.difficulty!,
      description: newQuestion.description!,
      category: newQuestion.category || 'General',
      tags: newQuestion.tags || [],
      react: newQuestion.react as any,
      vue: newQuestion.vue as any,
      createdAt: Date.now()
    };
    storageService.addQuestion(q);
    handleRefreshStats();
    setSelectedQuestion(q);
    setShowManualAdd(false);
    setFeedback({ message: 'CREATED ✨', type: 'success' });
    
    setNewQuestion({
      title: '',
      difficulty: Difficulty.EASY,
      category: '',
      description: '',
      react: { initial: DEFAULT_REACT_INITIAL, solution: '' },
      vue: { initial: DEFAULT_VUE_INITIAL, solution: '' },
      tags: []
    });
  };

  const handleImportSuccess = (count: number) => {
    handleRefreshStats();
    setFeedback({ message: `${count} IMPORTED ✨`, type: 'success' });
    const updated = storageService.getQuestions();
    if (updated.length > 0) setSelectedQuestion(updated[0]);
  };

  const handleImportFailure = (msg: string) => {
    setFeedback({ message: msg, type: 'error' });
  };

  const handleDeleteQuestion = useCallback((id: string) => {
    if (confirm(t.deleteConfirm)) {
      storageService.deleteQuestion(id);
      handleRefreshStats();
      const updated = storageService.getQuestions();
      setQuestions(updated);
      if (selectedQuestion?.id === id) {
        setSelectedQuestion(updated.length > 0 ? updated[0] : null);
      }
      setFeedback({ message: 'DELETED 🗑️', type: 'success' });
    }
  }, [selectedQuestion, t.deleteConfirm, handleRefreshStats]);

  const handleMagicGenerate = async () => {
    if (!magicTopic.trim()) return;
    setIsGenerating(true);
    try {
      const q = await aiService.generateQuestion(magicTopic, lang);
      storageService.addQuestion(q);
      handleRefreshStats();
      setSelectedQuestion(q);
      setMagicTopic('');
      setFeedback({ message: 'GENERATED ✨', type: 'success' });
    } catch (e) {
      setFeedback({ message: t.magicFail, type: 'error' });
    }
    setIsGenerating(false);
  };

  const [manualTab, setManualTab] = useState<'info' | 'react' | 'vue'>('info');
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    title: '',
    difficulty: Difficulty.EASY,
    category: '',
    description: '',
    react: { initial: DEFAULT_REACT_INITIAL, solution: '' },
    vue: { initial: DEFAULT_VUE_INITIAL, solution: '' },
    tags: []
  });

  const closeModalOnBackdrop = (e: React.MouseEvent, closeFn: () => void) => {
    if (e.target === e.currentTarget) {
      closeFn();
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#fffafa] text-gray-800 p-4 gap-4 overflow-hidden fixed inset-0 font-['Quicksand']">
      
      {feedback && <FeedbackAnimation message={feedback.message} type={feedback.type} onComplete={() => setFeedback(null)} />}

      <ImportModal 
        isOpen={showImport} 
        onClose={() => setShowImport(false)} 
        onSuccess={handleImportSuccess}
        onFailure={handleImportFailure}
        lang={lang}
      />

      <aside className="w-84 bg-white border border-pink-50 flex flex-col shadow-xl rounded-[2.5rem] overflow-hidden shrink-0">
        <div className="p-6 border-b border-pink-50 flex items-center shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl hover:rotate-12 transition-transform cursor-pointer">🧁</span>
            <h1 className="text-xl font-black text-pink-500 tracking-tighter uppercase">Codeling</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
          <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap border ${
                    activeCategory === cat ? 'bg-pink-400 text-white border-pink-400 shadow-sm' : 'bg-white text-pink-300 border-pink-50 hover:bg-pink-50'
                  }`}
                >
                  {cat === 'All' ? t.allCategories : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-50/50 p-4 rounded-[2rem] border border-gray-100 space-y-3">
            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest px-1">{t.aiCreator}</p>
            <div className="relative">
              <input 
                value={magicTopic} 
                onChange={e => setMagicTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleMagicGenerate()}
                placeholder={t.magicPlaceholder}
                className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-[10px] outline-none focus:ring-2 ring-pink-100 transition shadow-sm"
              />
              <button 
                onClick={handleMagicGenerate}
                disabled={isGenerating}
                className="absolute right-1.5 top-1.5 w-8 h-8 bg-pink-400 text-white rounded-lg flex items-center justify-center hover:bg-pink-500 transition disabled:opacity-50"
              >
                {isGenerating ? '...' : '🪄'}
              </button>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => { setShowManualAdd(true); setManualTab('info'); }}
                className="flex-1 flex items-center justify-center gap-1 py-3 bg-white border-2 border-dashed border-gray-100 text-gray-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-pink-200 hover:text-pink-400 transition-all active:scale-95 shadow-sm"
              >
                <span className="text-base font-normal">+</span> {lang === 'zh' ? '新建' : 'New'}
              </button>
              <button 
                onClick={() => setShowImport(true)}
                className="flex-1 flex items-center justify-center gap-1 py-3 bg-white border-2 border-dashed border-gray-100 text-gray-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-blue-200 hover:text-blue-400 transition-all active:scale-95 shadow-sm"
              >
                <span className="text-base font-normal">📂</span> {lang === 'zh' ? '导入' : 'Import'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest px-1">{t.challenges}</p>
            {filteredQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-30">
                <span className="text-3xl mb-2">🍪</span>
                <p className="text-[9px] font-black uppercase tracking-widest">{t.noResults}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQuestions.map(q => (
                  <button
                    key={q.id}
                    onClick={() => { setSelectedQuestion(q); setView('editor'); }}
                    className={`w-full text-left p-4 rounded-2xl transition-all border-2 ${
                      selectedQuestion?.id === q.id 
                      ? 'border-pink-200 bg-pink-50/30 scale-[1.02] shadow-sm' 
                      : 'border-transparent bg-gray-50/30 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-bold text-gray-700 text-sm mb-2 line-clamp-1">{q.title}</div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${
                        q.difficulty === Difficulty.EASY ? 'bg-green-100 text-green-600' :
                        q.difficulty === Difficulty.MEDIUM ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {t.difficulty[q.difficulty]}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">
        <header className="bg-white h-20 px-8 rounded-[2rem] shadow-sm border border-pink-50 flex items-center justify-between shrink-0">
          <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100 shadow-inner">
            <button onClick={() => setView('editor')} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all ${view === 'editor' ? 'bg-white text-pink-500 shadow-md scale-105' : 'text-gray-400 hover:text-gray-600'}`}>{t.workshop}</button>
            <button onClick={() => setView('stats')} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all ${view === 'stats' ? 'bg-white text-pink-500 shadow-md scale-105' : 'text-gray-400 hover:text-gray-600'}`}>{t.dashboard}</button>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')} className="w-12 h-12 border border-pink-100 text-pink-400 rounded-xl text-[10px] font-black hover:bg-pink-50 transition uppercase shadow-sm">
              {lang}
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center hover:bg-pink-100 transition shadow-sm border border-pink-100 text-pink-400"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          {view === 'editor' && selectedQuestion ? (
            <div className="h-full flex flex-col gap-4 animate-fade-in overflow-hidden">
              <div className="bg-white p-6 px-8 rounded-[2rem] border border-pink-50 flex items-center justify-between shadow-sm shrink-0">
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-black text-gray-800 truncate tracking-tight">{selectedQuestion.title}</h2>
                    <span className="text-[9px] px-2 py-0.5 bg-pink-50 text-pink-400 rounded-md font-black uppercase tracking-widest">{selectedQuestion.category}</span>
                  </div>
                  <MarkdownViewer content={selectedQuestion.description} />
                </div>
                
                <div className="flex items-center gap-4 ml-4 shrink-0 self-start">
                  <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 shadow-inner">
                    <button onClick={() => setFramework('react')} className={`px-5 py-1.5 rounded-lg text-[10px] font-black transition-all ${framework === 'react' ? 'bg-white text-blue-500 shadow-sm' : 'text-gray-400'}`}>REACT</button>
                    <button onClick={() => setFramework('vue')} className={`px-5 py-1.5 rounded-lg text-[10px] font-black transition-all ${framework === 'vue' ? 'bg-white text-green-500 shadow-sm' : 'text-gray-400'}`}>VUE</button>
                  </div>
                  <button onClick={() => handleDeleteQuestion(selectedQuestion.id)} className="p-2 text-gray-300 hover:text-red-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              
              <div className="flex-1 min-h-0">
                <EditorPane 
                  key={`${selectedQuestion.id}-${framework}`}
                  question={selectedQuestion}
                  onSave={handleSave}
                  onDeleteAttempt={() => handleRefreshStats()}
                  onQuestionUpdate={() => {}}
                  framework={framework}
                  lang={lang}
                />
              </div>
            </div>
          ) : view === 'stats' ? (
            <div className="h-full bg-white rounded-[2.5rem] p-10 overflow-y-auto custom-scrollbar shadow-sm border border-pink-50 animate-fade-in">
               <StatsView stats={stats} lang={lang} onRefresh={handleRefreshStats} onDeleteAttempt={() => handleRefreshStats()} />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-200 animate-fade-in opacity-50">
              <span className="text-7xl mb-6">🍭</span>
              <p className="text-sm font-black uppercase tracking-[0.2em]">{lang === 'zh' ? '请选择一个挑战' : 'Select a challenge'}</p>
            </div>
          )}
        </div>
      </main>

      {showManualAdd && (
        <div 
          className="fixed inset-0 bg-pink-900/10 backdrop-blur-md z-[150] flex items-center justify-center p-6 animate-fade-in"
          onClick={(e) => closeModalOnBackdrop(e, () => setShowManualAdd(false))}
        >
           <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-pink-100 max-w-4xl w-full relative h-[90vh] flex flex-col overflow-hidden animate-sweet-pop" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowManualAdd(false)} className="absolute top-8 right-10 w-10 h-10 flex items-center justify-center text-gray-300 hover:text-pink-400 transition-colors bg-gray-50 rounded-2xl">✕</button>
              <h2 className="text-2xl font-black text-gray-800 mb-8 tracking-tighter">{t.addChallenge}</h2>
              <div className="flex gap-2 mb-8 bg-gray-50 p-1.5 rounded-2xl shrink-0 shadow-inner">
                <button onClick={() => setManualTab('info')} className={`flex-1 py-3 rounded-xl text-[11px] font-black transition-all ${manualTab === 'info' ? 'bg-white text-pink-500 shadow-md' : 'text-gray-400'}`}>1. {lang === 'zh' ? '信息' : 'INFO'}</button>
                <button onClick={() => setManualTab('react')} className={`flex-1 py-3 rounded-xl text-[11px] font-black transition-all ${manualTab === 'react' ? 'bg-white text-blue-500 shadow-md' : 'text-gray-400'}`}>2. REACT</button>
                <button onClick={() => setManualTab('vue')} className={`flex-1 py-3 rounded-xl text-[11px] font-black transition-all ${manualTab === 'vue' ? 'bg-white text-green-500 shadow-md' : 'text-gray-400'}`}>3. VUE</button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
                {manualTab === 'info' && (
                  <div className="space-y-8 animate-fade-in">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.formTitle}</label>
                        <input value={newQuestion.title} onChange={e => setNewQuestion(p => ({ ...p, title: e.target.value }))} className="w-full bg-pink-50/20 border border-pink-50 rounded-2xl px-5 py-4 text-sm outline-none shadow-inner focus:border-pink-300 transition-all" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.formCategory}</label>
                        <input value={newQuestion.category} onChange={e => setNewQuestion(p => ({ ...p, category: e.target.value }))} className="w-full bg-pink-50/20 border border-pink-50 rounded-2xl px-5 py-4 text-sm outline-none shadow-inner focus:border-pink-300 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.formDifficulty}</label>
                      <div className="flex gap-4">
                        {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map(d => (
                          <button key={d} onClick={() => setNewQuestion(p => ({ ...p, difficulty: d }))} className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase transition-all border-2 ${newQuestion.difficulty === d ? 'bg-pink-50 border-pink-300 text-pink-500 shadow-sm' : 'bg-white border-pink-50 text-gray-300'}`}>{t.difficulty[d]}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.formDesc}</label>
                      <textarea placeholder="Markdown supported..." value={newQuestion.description} onChange={e => setNewQuestion(p => ({ ...p, description: e.target.value }))} rows={6} className="w-full bg-pink-50/20 border border-pink-50 rounded-2xl px-5 py-4 text-sm outline-none shadow-inner focus:border-pink-300 transition-all resize-none font-mono" />
                    </div>
                  </div>
                )}
                {manualTab === 'react' && (
                  <div className="animate-fade-in">
                    <textarea value={newQuestion.react?.initial} onChange={e => setNewQuestion(p => ({ ...p, react: { ...p.react!, initial: e.target.value } }))} rows={12} className="w-full bg-gray-900 text-pink-50 font-mono rounded-2xl px-6 py-5 text-xs outline-none shadow-2xl" />
                  </div>
                )}
                {manualTab === 'vue' && (
                  <div className="animate-fade-in">
                    <textarea value={newQuestion.vue?.initial} onChange={e => setNewQuestion(p => ({ ...p, vue: { ...p.vue!, initial: e.target.value } }))} rows={12} className="w-full bg-gray-900 text-green-50 font-mono rounded-2xl px-6 py-5 text-xs outline-none shadow-2xl" />
                  </div>
                )}
              </div>
              <div className="mt-8 pt-8 border-t border-pink-50 flex gap-4 shrink-0">
                <button onClick={() => setShowManualAdd(false)} className="px-10 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</button>
                <button onClick={handleManualSave} className="flex-1 py-4 bg-pink-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-pink-100 hover:bg-pink-500 transition-all">Create Challenge</button>
              </div>
           </div>
        </div>
      )}

      {showSettings && (
        <div 
          className="fixed inset-0 bg-pink-900/10 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fade-in"
          onClick={(e) => closeModalOnBackdrop(e, () => { setShowSettings(false); handleRefreshStats(); })}
        >
          <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-pink-100 max-w-2xl w-full h-[85vh] flex flex-col overflow-hidden relative animate-sweet-pop" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8 shrink-0">
              <h2 className="text-2xl font-black text-gray-800 tracking-tighter">{t.settings}</h2>
              <button onClick={() => { setShowSettings(false); handleRefreshStats(); }} className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-400 rounded-2xl hover:text-pink-500 transition-all">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-10">
              <div className="space-y-6">
                <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest ml-1">{t.profile}</p>
                <div>
                  <label className="text-[10px] font-black text-gray-400 block mb-3 uppercase tracking-widest ml-1">{t.userName}</label>
                  <input 
                    defaultValue={stats.profile?.name} 
                    onBlur={e => { storageService.saveProfile({ ...stats.profile!, name: e.target.value }); handleRefreshStats(); }} 
                    className="w-full bg-pink-50/20 border border-pink-50 rounded-2xl px-5 py-4 text-sm outline-none shadow-inner focus:border-pink-200" 
                  />
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-pink-50">
                <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest ml-1">{t.configKey}</p>
                   <button 
                    onClick={handleTestConnection}
                    disabled={testStatus === 'testing'}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      testStatus === 'testing' ? 'bg-gray-100 text-gray-400' : 
                      testStatus === 'success' ? 'bg-green-100 text-green-500' :
                      testStatus === 'failed' ? 'bg-red-100 text-red-500' :
                      'bg-pink-50 text-pink-500 hover:bg-pink-100 shadow-sm border border-pink-100'
                    }`}
                   >
                     {testStatus === 'testing' ? t.testing : 
                      testStatus === 'success' ? t.testSuccess : 
                      testStatus === 'failed' ? 'Failed' : t.testConnection}
                   </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Provider</label>
                    <select 
                      value={stats.aiConfig?.provider || 'gemini'}
                      onChange={e => { storageService.saveAIConfig({ ...stats.aiConfig!, provider: e.target.value as AIProvider }); handleRefreshStats(); }}
                      className="w-full bg-pink-50/20 border border-pink-50 rounded-2xl px-5 py-4 text-sm outline-none shadow-inner appearance-none cursor-pointer focus:border-pink-200"
                    >
                      {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">API Key</label>
                  <input 
                    type="password"
                    placeholder="sk-..."
                    defaultValue={stats.aiConfig?.apiKey}
                    onBlur={e => { storageService.saveAIConfig({ ...stats.aiConfig!, apiKey: e.target.value }); handleRefreshStats(); }}
                    className="w-full bg-pink-50/20 border border-pink-50 rounded-2xl px-5 py-4 text-sm outline-none shadow-inner focus:border-pink-200"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-pink-50">
                <button 
                  onClick={() => { if(confirm(t.clearConfirm)) storageService.clearAllData(); }} 
                  className="text-[10px] font-black text-red-300 hover:text-red-500 uppercase tracking-widest underline decoration-2 underline-offset-8 transition-all"
                >
                  {t.clearData}
                </button>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-pink-50 flex justify-center shrink-0">
               <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Codeling v2.2 - Made with ❤️</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
