
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { storageService } from './services/storageService';
import { aiService } from './services/aiService';
import { Question, UserStats, Framework, Difficulty, Language, UserProfile, AIModelConfig, AIProvider } from './types';
import EditorPane from './components/EditorPane';
import StatsView from './components/StatsView';
import { translations } from './i18n';

const DEFAULT_REACT_INITIAL = `import React from 'react';\n\nexport default function App() {\n  return (\n    <div className="p-10">\n      <h1 className="text-2xl font-bold text-pink-500">Hello React</h1>\n    </div>\n  );\n}`;
const DEFAULT_VUE_INITIAL = `<script setup>\nimport { ref } from 'vue';\nconst msg = ref('Hello Vue');\n</script>\n\n<template>\n  <div class="p-10">\n    <h1 class="text-2xl font-bold text-pink-500">{{ msg }}</h1>\n  </div>\n</template>`;

function App() {
  const [lang, setLang] = useState<Language>(storageService.getLanguage());
  const [questions, setQuestions] = useState<Question[]>(storageService.getQuestions());
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [framework, setFramework] = useState<Framework>('react');
  const [view, setView] = useState<'editor' | 'stats'>('editor');
  const [magicTopic, setMagicTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState<UserStats>(storageService.getStats());
  const [showSettings, setShowSettings] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  
  // Support Modal State
  const [showSupport, setShowSupport] = useState(false);
  const [supportStep, setSupportStep] = useState<'select' | 'pay'>('select');
  const [selectedSupportAmount, setSelectedSupportAmount] = useState<number>(0);

  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'delete'} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Manual Add Form State
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    title: '',
    difficulty: Difficulty.EASY,
    category: '',
    description: '',
    react: { initial: DEFAULT_REACT_INITIAL, solution: '' },
    vue: { initial: DEFAULT_VUE_INITIAL, solution: '' },
    tags: []
  });
  const [manualTab, setManualTab] = useState<'info' | 'react' | 'vue'>('info');

  const t = translations[lang];

  const categories = useMemo(() => {
    const cats = new Set(questions.map(q => q.category));
    return ['All', ...Array.from(cats)].filter(Boolean);
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchesSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          q.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = activeCategory === 'All' || q.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [questions, searchTerm, activeCategory]);

  useEffect(() => {
    if (!selectedQuestion && questions.length > 0) {
      setSelectedQuestion(questions[0]);
    }
  }, [questions, selectedQuestion]);

  useEffect(() => {
    storageService.setLanguage(lang);
  }, [lang]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'delete' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

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
    showToast(lang === 'zh' ? '已保存 ✨' : 'Saved ✨');
  };

  const handleDeleteQuestion = (id: string) => {
    if (!confirm(t.deleteConfirm)) return;
    storageService.deleteQuestion(id);
    handleRefreshStats();
    if (selectedQuestion?.id === id) setSelectedQuestion(null);
    showToast(lang === 'zh' ? '已移除 🗑️' : 'Removed 🗑️', 'delete');
  };

  const handleMagicGenerate = async () => {
    if (!magicTopic.trim()) return;
    setIsGenerating(true);
    try {
      const generated = await aiService.generateQuestion(magicTopic, lang);
      storageService.addQuestion(generated);
      handleRefreshStats();
      setSelectedQuestion(generated);
      setMagicTopic('');
      showToast(lang === 'zh' ? '魔法生效！🪄' : 'Magic! 🪄');
    } catch (e) {
      showToast(t.magicFail, 'error');
    }
    setIsGenerating(false);
  };

  const handleManualSave = () => {
    if (!newQuestion.title || !newQuestion.description) {
      showToast(lang === 'zh' ? '请填写完整标题和描述' : 'Please fill title and description', 'error');
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
    showToast(lang === 'zh' ? '题目已创建！' : 'Challenge Created!');
    
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

  const selectSupportOption = (amount: number) => {
    setSelectedSupportAmount(amount);
    setSupportStep('pay');
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ffb6c1', '#ffc0cb', '#ff69b4']
    });
  };

  return (
    <div className="flex h-screen w-screen bg-[#fffafa] text-gray-800 p-4 gap-4 overflow-hidden fixed inset-0 font-['Quicksand']">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-xl border animate-toast-in ${
          toast.type === 'success' ? 'bg-white text-pink-500 border-pink-100' : 
          toast.type === 'delete' ? 'bg-gray-800 text-white border-gray-700' : 'bg-red-50 text-red-500 border-red-100'
        }`}>
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* Reorganized Sidebar */}
      <aside className="w-84 bg-white border border-pink-50 flex flex-col shadow-xl rounded-[2.5rem] overflow-hidden shrink-0">
        
        {/* 1. Brand & Profile (Fixed Top) */}
        <div className="p-6 border-b border-pink-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl hover:rotate-12 transition-transform cursor-pointer">🧁</span>
            <h1 className="text-xl font-black text-pink-500 tracking-tighter uppercase">Codeling</h1>
          </div>
          <button 
            onClick={() => { setShowSettings(true); }}
            className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-xl hover:bg-pink-100 transition shadow-sm border border-pink-100"
          >
            {stats.profile?.avatar || '🍭'}
          </button>
        </div>

        {/* 2. Unified Content Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
          
          {/* Filters & Search */}
          <div className="space-y-3">
            <div className="relative">
              <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-pink-50/20 border border-pink-100 rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none focus:ring-2 ring-pink-100 transition shadow-inner"
              />
              <span className="absolute left-3.5 top-3.5 text-pink-200 text-xs">🔍</span>
            </div>
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

          {/* Creation Tools (No longer fixed) */}
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
            <button 
              onClick={() => { setShowManualAdd(true); setManualTab('info'); }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-dashed border-gray-100 text-gray-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-pink-200 hover:text-pink-400 transition-all active:scale-95 shadow-sm"
            >
              <span className="text-base font-normal">+</span> {t.manualAdd}
            </button>
          </div>

          {/* Challenge List */}
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
                      <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{q.category}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. Support Author (Back to Bottom) */}
        <div className="p-6 border-t border-pink-50 shrink-0">
          <button 
            onClick={() => { setShowSupport(true); setSupportStep('select'); }}
            className="w-full flex items-center justify-center gap-2 py-4 bg-pink-500 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-pink-600 transition-all active:scale-95 shadow-lg shadow-pink-100"
          >
            <span className="text-lg">☕</span> {t.buyMeCoffee}
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">
        <header className="bg-white h-20 px-8 rounded-[2rem] shadow-sm border border-pink-50 flex items-center justify-between shrink-0">
          <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100 shadow-inner">
            <button onClick={() => setView('editor')} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all ${view === 'editor' ? 'bg-white text-pink-500 shadow-md scale-105' : 'text-gray-400 hover:text-gray-600'}`}>{t.workshop}</button>
            <button onClick={() => setView('stats')} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all ${view === 'stats' ? 'bg-white text-pink-500 shadow-md scale-105' : 'text-gray-400 hover:text-gray-600'}`}>{t.dashboard}</button>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none mb-1">{t.mastery}</span>
              <span className="text-sm font-black text-pink-500">{questions.length > 0 ? Math.round((stats.solvedCount / questions.length) * 100) : 0}%</span>
            </div>
            <button onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')} className="w-12 h-12 border border-pink-100 text-pink-400 rounded-xl text-[10px] font-black hover:bg-pink-50 transition uppercase shadow-sm">
              {lang}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          {view === 'editor' && selectedQuestion ? (
            <div className="h-full flex flex-col gap-4 animate-fade-in overflow-hidden">
              <div className="bg-white p-6 px-8 rounded-[2rem] border border-pink-50 flex items-center justify-between shadow-sm shrink-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-black text-gray-800 truncate tracking-tight">{selectedQuestion.title}</h2>
                    <span className="text-[9px] px-2 py-0.5 bg-pink-50 text-pink-400 rounded-md font-black uppercase tracking-widest">{selectedQuestion.category}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-1 font-medium">{selectedQuestion.description}</p>
                </div>
                
                <div className="flex items-center gap-4 ml-4">
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
              <p className="text-sm font-black uppercase tracking-[0.2em]">{lang === 'zh' ? '请选择一个挑战开始练习' : 'Select a challenge to start'}</p>
            </div>
          )}
        </div>
      </main>

      {/* Manual Create Modal (Restored) */}
      {showManualAdd && (
        <div className="fixed inset-0 bg-pink-900/10 backdrop-blur-md z-[150] flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-pink-100 max-w-4xl w-full relative h-[90vh] flex flex-col overflow-hidden">
              <button onClick={() => setShowManualAdd(false)} className="absolute top-8 right-10 w-10 h-10 flex items-center justify-center text-gray-300 hover:text-pink-400 transition-colors bg-gray-50 rounded-2xl">✕</button>
              <h2 className="text-2xl font-black text-gray-800 mb-8 tracking-tighter">{t.addChallenge}</h2>
              <div className="flex gap-2 mb-8 bg-gray-50 p-1.5 rounded-2xl shrink-0 shadow-inner">
                <button onClick={() => setManualTab('info')} className={`flex-1 py-3 rounded-xl text-[11px] font-black transition-all ${manualTab === 'info' ? 'bg-white text-pink-500 shadow-md' : 'text-gray-400'}`}>1. {lang === 'zh' ? '基础信息' : 'INFO'}</button>
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
                      <textarea value={newQuestion.description} onChange={e => setNewQuestion(p => ({ ...p, description: e.target.value }))} rows={6} className="w-full bg-pink-50/20 border border-pink-50 rounded-2xl px-5 py-4 text-sm outline-none shadow-inner focus:border-pink-300 transition-all resize-none" />
                    </div>
                  </div>
                )}
                {manualTab === 'react' && (
                  <div className="animate-fade-in">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1 mb-3 block">Initial React Template</label>
                    <textarea value={newQuestion.react?.initial} onChange={e => setNewQuestion(p => ({ ...p, react: { ...p.react!, initial: e.target.value } }))} rows={12} className="w-full bg-gray-900 text-pink-50 font-mono rounded-2xl px-6 py-5 text-xs outline-none shadow-2xl" />
                  </div>
                )}
                {manualTab === 'vue' && (
                  <div className="animate-fade-in">
                    <label className="text-[10px] font-black text-green-400 uppercase tracking-widest ml-1 mb-3 block">Initial Vue SFC Template</label>
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

      {/* Support Modal (3-tiers restored) */}
      {showSupport && (
        <div className="fixed inset-0 bg-pink-900/10 backdrop-blur-md z-[180] flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-pink-100 max-w-sm w-full text-center relative overflow-hidden flex flex-col items-center">
              <button onClick={() => setShowSupport(false)} className="absolute top-6 right-8 text-gray-300 hover:text-pink-400 text-xl font-bold transition-colors">✕</button>
              
              {supportStep === 'select' ? (
                <div className="animate-fade-in w-full">
                  <div className="text-5xl mb-6 animate-bounce">🧁</div>
                  <h2 className="text-xl font-black text-gray-800 mb-2">{t.supportTitle}</h2>
                  <p className="text-gray-400 text-[10px] mb-8 font-bold uppercase tracking-widest">{t.donationOptions}</p>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={() => selectSupportOption(10)}
                      className="w-full flex items-center justify-between px-6 py-4 bg-pink-50 rounded-2xl border-2 border-transparent hover:border-pink-200 transition-all group active:scale-95"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl group-hover:rotate-12 transition-transform">🧋</span>
                        <span className="text-xs font-black text-gray-700">{t.coffee}</span>
                      </div>
                      <span className="text-sm font-black text-pink-500">￥10</span>
                    </button>
                    
                    <button 
                      onClick={() => selectSupportOption(20)}
                      className="w-full flex items-center justify-between px-6 py-4 bg-pink-50 rounded-2xl border-2 border-transparent hover:border-pink-200 transition-all group active:scale-95"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl group-hover:rotate-12 transition-transform">🍰</span>
                        <span className="text-xs font-black text-gray-700">{t.cupcake}</span>
                      </div>
                      <span className="text-sm font-black text-pink-500">￥20</span>
                    </button>

                    <button 
                      onClick={() => selectSupportOption(50)}
                      className="w-full flex items-center justify-between px-6 py-4 bg-pink-50 rounded-2xl border-2 border-transparent hover:border-pink-200 transition-all group active:scale-95"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl group-hover:rotate-12 transition-transform">🍲</span>
                        <span className="text-xs font-black text-gray-700">{t.iceCream}</span>
                      </div>
                      <span className="text-sm font-black text-pink-500">￥50</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in w-full flex flex-col items-center py-4">
                  <h3 className="text-lg font-black text-gray-800 mb-6">{t.scanPrompt}</h3>
                  <div className="w-48 h-48 bg-gray-50 rounded-3xl border-4 border-pink-100 flex flex-col items-center justify-center mb-6 relative overflow-hidden group">
                     <div className="grid grid-cols-4 gap-2 opacity-20">
                        {Array.from({length: 16}).map((_, i) => (
                          <div key={i} className={`w-6 h-6 rounded-sm ${Math.random() > 0.5 ? 'bg-pink-400' : 'bg-pink-100'}`} />
                        ))}
                     </div>
                     <span className="absolute inset-0 flex items-center justify-center text-4xl group-hover:scale-125 transition-transform">📱</span>
                  </div>
                  <p className="text-[10px] font-black text-pink-400 uppercase tracking-[0.2em] mb-8">{t.thankYou}</p>
                  <button 
                    onClick={() => setSupportStep('select')}
                    className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-pink-400 transition-colors underline"
                  >
                    ← {lang === 'zh' ? '重新选择' : 'Back'}
                  </button>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Settings Modal (Unchanged) */}
      {showSettings && (
        <div className="fixed inset-0 bg-pink-900/10 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-pink-100 max-w-xl w-full">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-800 tracking-tighter">{t.settings}</h2>
              <button onClick={() => setShowSettings(false)} className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-400 rounded-2xl hover:text-pink-500 transition-all">✕</button>
            </div>
            <div className="space-y-8">
              <div>
                <label className="text-[10px] font-black text-gray-400 block mb-4 uppercase tracking-widest ml-1">Avatar</label>
                <div className="flex flex-wrap gap-3">
                  {['🍭', '🧁', '🍦', '🍩', '🍪', '🍰', '🍓', '🍑', '🍒', '🍉', '🍋', '🥑'].map(icon => (
                    <button key={icon} onClick={() => { storageService.saveProfile({ ...stats.profile!, avatar: icon }); handleRefreshStats(); }} className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border-2 transition-all ${stats.profile?.avatar === icon ? 'border-pink-300 bg-pink-50 shadow-md scale-110' : 'border-gray-50 hover:border-pink-100'}`}>{icon}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 block mb-3 uppercase tracking-widest ml-1">{t.userName}</label>
                <input defaultValue={stats.profile?.name} onBlur={e => { storageService.saveProfile({ ...stats.profile!, name: e.target.value }); handleRefreshStats(); }} className="w-full bg-pink-50/20 border border-pink-50 rounded-2xl px-5 py-4 text-sm outline-none shadow-inner" />
              </div>
              <button onClick={() => { if(confirm(t.clearConfirm)) storageService.clearAllData(); }} className="text-[10px] font-black text-red-300 hover:text-red-500 uppercase tracking-widest underline decoration-2 underline-offset-8 transition-all">{t.clearData}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
