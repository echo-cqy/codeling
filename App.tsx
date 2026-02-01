
import React, { useState, useEffect } from 'react';
import { storageService } from './services/storageService';
import { geminiService } from './services/geminiService';
import { Question, UserStats, Framework, Difficulty, Language } from './types';
import EditorPane from './components/EditorPane';
import StatsView from './components/StatsView';
import { translations } from './i18n';

function App() {
  const [lang, setLang] = useState<Language>(storageService.getLanguage());
  const [questions, setQuestions] = useState<Question[]>(storageService.getQuestions());
  const [selectedQuestion, setSelectedQuestion] = useState<Question>(questions[0]);
  const [framework, setFramework] = useState<Framework>('react');
  const [view, setView] = useState<'editor' | 'stats'>('editor');
  const [magicTopic, setMagicTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [stats, setStats] = useState<UserStats>(storageService.getStats());

  const t = translations[lang];

  const initialNewQ = {
    title: '',
    description: '',
    category: 'Component',
    difficulty: Difficulty.EASY,
    react: { 
      initial: 'export default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <div className="p-8 bg-gradient-to-br from-pink-50 to-white rounded-3xl shadow-xl border border-pink-100 text-center">\n      <h1 className="text-4xl font-black text-pink-500 mb-6">{count}</h1>\n      <div className="flex gap-4 justify-center">\n        <button \n          onClick={() => setCount(c => c + 1)}\n          className="px-8 py-3 bg-pink-400 text-white rounded-2xl font-black hover:bg-pink-500 transition shadow-lg shadow-pink-100 active:scale-95"\n        >\n          +\n        </button>\n        <button \n          onClick={() => setCount(c => Math.max(0, c - 1))}\n          className="px-8 py-3 bg-gray-100 text-gray-500 rounded-2xl font-black hover:bg-gray-200 transition active:scale-95"\n        >\n          -\n        </button>\n      </div>\n    </div>\n  );\n}', 
      solution: 'export default function App() {\n  return <div>Solution</div>\n}' 
    },
    vue: { 
      initial: '<script setup>\nconst msg = ref("Hello Codeling!");\n</script>\n\n<template>\n  <div class="p-8 bg-green-50 rounded-3xl border border-green-100 text-center">\n    <h1 class="text-2xl font-bold text-green-600 mb-4">{{ msg }}</h1>\n    <input v-model="msg" class="px-4 py-2 rounded-xl border border-green-200 outline-none focus:ring-2 ring-green-300 transition" />\n  </div>\n</template>', 
      solution: '<script setup></script>\n<template><div>Solution</div></template>' 
    }
  };

  const [newQ, setNewQ] = useState<Partial<Question>>(initialNewQ);

  useEffect(() => {
    storageService.setLanguage(lang);
  }, [lang]);

  const handleSave = (code: string, versionName?: string) => {
    storageService.saveAttempt({
      id: Math.random().toString(36).substr(2, 9),
      questionId: selectedQuestion.id,
      framework,
      code,
      timestamp: Date.now(),
      status: 'passed',
      name: versionName
    });
    setStats(storageService.getStats());
  };

  const handleQuestionUpdate = (updates: Partial<Question>) => {
    const updated = storageService.updateQuestion(selectedQuestion.id, updates);
    setQuestions(updated);
    const updatedSelected = updated.find(q => q.id === selectedQuestion.id);
    if (updatedSelected) setSelectedQuestion(updatedSelected);
  };

  const handleManualAddSubmit = () => {
    if(!newQ.title) return;
    const finalQ: Question = {
      ...newQ as Question,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      isStarred: false,
      tags: []
    };
    storageService.addQuestion(finalQ);
    const updated = storageService.getQuestions();
    setQuestions(updated);
    setSelectedQuestion(finalQ);
    setShowManualAdd(false);
    setView('editor');
    setNewQ(initialNewQ);
  };

  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = storageService.toggleStar(id);
    setQuestions(updated);
  };

  const deleteQuestion = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm(t.deleteConfirm)) {
      storageService.deleteQuestion(id);
      const remaining = storageService.getQuestions();
      setQuestions(remaining);
      if (remaining.length > 0) {
        setSelectedQuestion(remaining[0]);
      }
    }
  };

  const handleMagicGenerate = async () => {
    if (!magicTopic.trim()) return;
    setIsGenerating(true);
    try {
      const generated = await geminiService.generateQuestion(magicTopic, lang);
      storageService.addQuestion(generated);
      setQuestions(storageService.getQuestions());
      setSelectedQuestion(generated);
      setMagicTopic('');
      alert(t.magicSuccess);
    } catch (e) { alert(t.magicFail); }
    setIsGenerating(false);
  };

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'zh' : 'en');
  };

  return (
    <div className="flex h-screen bg-[#fff9f9] text-gray-800 p-4 gap-4 font-['Quicksand']">
      {/* 侧边栏 */}
      <aside className="w-80 bg-white border border-pink-50 flex flex-col shadow-xl rounded-[3rem] overflow-hidden">
        <div className="p-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl hover:rotate-12 transition-transform cursor-pointer">🧁</span>
            <h1 className="text-3xl font-black text-pink-500 tracking-tighter">Codeling</h1>
          </div>
        </div>

        {/* AI 生成部分 */}
        <div className="px-6 mb-4">
          <div className="bg-pink-50/50 p-4 rounded-[2rem] border border-pink-100/50">
             <div className="text-[10px] font-black text-pink-400 uppercase tracking-widest mb-3 px-1">{t.aiCreator}</div>
             <div className="relative">
                <input 
                  value={magicTopic} 
                  onChange={e => setMagicTopic(e.target.value)}
                  placeholder={t.magicPlaceholder}
                  className="w-full bg-white border border-pink-100 rounded-2xl px-4 py-2.5 text-xs outline-none focus:ring-2 ring-pink-200 transition"
                  onKeyDown={e => e.key === 'Enter' && handleMagicGenerate()}
                />
                <button 
                  onClick={handleMagicGenerate}
                  disabled={isGenerating}
                  className="absolute right-2 top-1.5 w-7 h-7 bg-pink-400 text-white rounded-xl flex items-center justify-center hover:bg-pink-500 transition disabled:opacity-50"
                >
                  {isGenerating ? '...' : '🪄'}
                </button>
             </div>
          </div>
        </div>

        {/* 新增题目入口 */}
        <div className="px-6 mb-6">
           <button 
             onClick={() => setShowManualAdd(true)}
             className="w-full py-3 bg-white border-2 border-dashed border-pink-100 text-pink-400 rounded-2xl text-[11px] font-black hover:bg-pink-50 hover:border-pink-300 transition"
           >
             + {t.addChallenge}
           </button>
        </div>

        {/* 题目列表 */}
        <div className="flex-1 overflow-y-auto px-6 pb-8 custom-scrollbar">
          <div className="flex justify-between items-center px-2 mb-4">
             <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{t.challenges}</p>
             <span className="text-[10px] font-black text-pink-300">{questions.length}题</span>
          </div>
          <div className="space-y-3">
            {questions.map(q => (
              <button
                key={q.id}
                onClick={() => { setSelectedQuestion(q); setView('editor'); }}
                className={`group relative w-full text-left p-4 rounded-[2rem] transition border-2 ${selectedQuestion.id === q.id ? 'border-pink-200 bg-pink-50/30' : 'border-transparent hover:bg-gray-50'}`}
              >
                <div className="flex justify-between items-start mb-1">
                   <div className="font-black text-gray-700 text-sm leading-tight pr-6">{q.title}</div>
                   <div className="flex gap-1 absolute top-4 right-4">
                      <span onClick={(e) => toggleStar(e, q.id)} className={`cursor-pointer transition hover:scale-125 ${q.isStarred ? 'text-yellow-400' : 'text-gray-200 group-hover:text-gray-300'}`}>★</span>
                      <span onClick={(e) => deleteQuestion(e, q.id)} className="cursor-pointer text-gray-200 hover:text-red-400 transition opacity-0 group-hover:opacity-100">✕</span>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${
                     q.difficulty === 'Easy' ? 'bg-green-100 text-green-600' : 
                     q.difficulty === 'Medium' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                   }`}>{t.difficulty[q.difficulty]}</span>
                   <span className="text-[8px] text-gray-400 font-bold">{q.category}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* 主界面 */}
      <main className="flex-1 flex flex-col overflow-hidden gap-4">
        
        {/* 顶部导航与状态条 */}
        <header className="bg-white px-10 h-20 rounded-[2.5rem] shadow-sm border border-pink-50 flex items-center justify-between">
           <div className="flex bg-gray-100/50 p-1.5 rounded-[1.5rem] border border-gray-100">
              <button 
                onClick={() => setView('editor')} 
                className={`px-8 py-2 rounded-2xl text-xs font-black transition-all duration-300 ${view === 'editor' ? 'bg-white text-pink-500 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {t.workshop}
              </button>
              <button 
                onClick={() => setView('stats')} 
                className={`px-8 py-2 rounded-2xl text-xs font-black transition-all duration-300 ${view === 'stats' ? 'bg-white text-pink-500 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {t.dashboard}
              </button>
           </div>

           <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                 <div className="text-right">
                    <p className="text-[10px] font-black text-gray-300 uppercase leading-none mb-1">{t.mastery}</p>
                    <p className="text-sm font-black text-gray-700 leading-none">{Math.round((stats.solvedCount / (questions.length || 1)) * 100)}%</p>
                 </div>
                 <div className="w-24 h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                    <div className="h-full bg-pink-400 transition-all duration-1000" style={{ width: `${(stats.solvedCount / (questions.length || 1)) * 100}%` }}></div>
                 </div>
              </div>

              <button 
                onClick={toggleLanguage}
                className="w-10 h-10 flex items-center justify-center bg-white border border-pink-100 text-pink-500 rounded-2xl text-[10px] font-black hover:bg-pink-50 transition shadow-sm"
              >
                {lang.toUpperCase()}
              </button>
           </div>
        </header>

        {/* 内容区 */}
        <div className="flex-1 overflow-hidden relative">
          {view === 'editor' && selectedQuestion ? (
            <div className="flex flex-col h-full gap-4 animate-fade-in">
              <div className="bg-white p-10 rounded-[3rem] border border-pink-50 flex items-center justify-between shadow-xl">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                     <h2 className="text-3xl font-black text-gray-800 tracking-tight">{selectedQuestion.title}</h2>
                     {selectedQuestion.isStarred && <span className="text-yellow-400 text-xl animate-bounce">★</span>}
                  </div>
                  <p className="text-sm text-gray-400 font-medium max-w-2xl leading-relaxed">{selectedQuestion.description}</p>
                </div>

                <div className="flex bg-pink-50/30 p-1.5 rounded-3xl border border-pink-100/30">
                  <button onClick={() => setFramework('react')} className={`px-8 py-3 rounded-2xl text-xs font-black transition ${framework === 'react' ? 'bg-white text-blue-500 shadow-md scale-105' : 'text-gray-400 hover:text-gray-600'}`}>REACT</button>
                  <button onClick={() => setFramework('vue')} className={`px-8 py-3 rounded-2xl text-xs font-black transition ${framework === 'vue' ? 'bg-white text-green-500 shadow-md scale-105' : 'text-gray-400 hover:text-gray-600'}`}>VUE</button>
                </div>
              </div>

              <div className="flex-1 relative">
                <EditorPane 
                  key={`${selectedQuestion.id}-${framework}-${lang}`}
                  question={selectedQuestion}
                  onSave={handleSave}
                  onQuestionUpdate={handleQuestionUpdate}
                  framework={framework}
                  lang={lang}
                />
              </div>
            </div>
          ) : view === 'stats' ? (
            <div className="h-full bg-white rounded-[3rem] p-12 overflow-y-auto custom-scrollbar shadow-xl border border-pink-50 animate-fade-in">
               <div className="max-w-4xl mx-auto">
                  <h2 className="text-4xl font-black text-gray-800 tracking-tight mb-2">{t.journey}</h2>
                  <p className="text-gray-400 font-medium mb-12">{t.journeySub}</p>
                  <StatsView stats={stats} lang={lang} />
               </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-[3rem] shadow-xl border border-pink-50">
               <div className="text-6xl mb-6 grayscale opacity-30">🧁</div>
               <p className="text-gray-300 font-black tracking-widest text-sm uppercase">Choose a Challenge to start</p>
            </div>
          )}
        </div>
      </main>

      {/* 手动新增弹窗 */}
      {showManualAdd && (
        <div className="fixed inset-0 bg-pink-900/10 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white rounded-[3rem] shadow-2xl border border-pink-100 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-12 custom-scrollbar">
              <div className="flex justify-between items-center mb-10">
                 <h3 className="text-3xl font-black text-gray-800">{t.manualAdd}</h3>
                 <button onClick={() => setShowManualAdd(false)} className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-full text-gray-400 p-2 hover:bg-pink-50 transition">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-10">
                 <div className="space-y-8">
                    <div>
                       <label className="text-[10px] font-black text-pink-400 uppercase tracking-widest block mb-2 px-1">{t.formTitle}</label>
                       <input value={newQ.title} onChange={e => setNewQ({...newQ, title: e.target.value})} className="w-full bg-pink-50/30 border-2 border-pink-50 rounded-2xl px-5 py-4 text-sm focus:border-pink-300 outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[10px] font-black text-pink-400 uppercase tracking-widest block mb-2 px-1">{t.formCategory}</label>
                          <input value={newQ.category} onChange={e => setNewQ({...newQ, category: e.target.value})} className="w-full bg-pink-50/30 border-2 border-pink-50 rounded-2xl px-5 py-4 text-sm focus:border-pink-300 outline-none" />
                       </div>
                       <div>
                          <label className="text-[10px] font-black text-pink-400 uppercase tracking-widest block mb-2 px-1">{t.formDifficulty}</label>
                          <select value={newQ.difficulty} onChange={e => setNewQ({...newQ, difficulty: e.target.value as Difficulty})} className="w-full bg-pink-50/30 border-2 border-pink-50 rounded-2xl px-5 py-4 text-sm focus:border-pink-300 outline-none appearance-none">
                             <option value={Difficulty.EASY}>Easy</option>
                             <option value={Difficulty.MEDIUM}>Medium</option>
                             <option value={Difficulty.HARD}>Hard</option>
                          </select>
                       </div>
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-pink-400 uppercase tracking-widest block mb-2 px-1">{t.formDesc}</label>
                       <textarea rows={6} value={newQ.description} onChange={e => setNewQ({...newQ, description: e.target.value})} className="w-full bg-pink-50/30 border-2 border-pink-50 rounded-2xl px-5 py-4 text-sm focus:border-pink-300 outline-none resize-none" />
                    </div>
                 </div>
                 <div className="space-y-8">
                    <div>
                       <label className="text-[10px] font-black text-pink-400 uppercase tracking-widest block mb-2 px-1">React {t.formInitial}</label>
                       <textarea rows={5} value={newQ.react?.initial} onChange={e => setNewQ({...newQ, react: {...newQ.react!, initial: e.target.value}})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 text-[11px] font-mono focus:border-pink-200 outline-none resize-none" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-pink-400 uppercase tracking-widest block mb-2 px-1">Vue {t.formInitial}</label>
                       <textarea rows={5} value={newQ.vue?.initial} onChange={e => setNewQ({...newQ, vue: {...newQ.vue!, initial: e.target.value}})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 text-[11px] font-mono focus:border-pink-200 outline-none resize-none" />
                    </div>
                 </div>
              </div>
              <div className="mt-12 flex gap-4">
                 <button onClick={handleManualAddSubmit} className="px-12 py-5 bg-pink-400 text-white rounded-3xl font-black shadow-xl shadow-pink-200 hover:bg-pink-500 transition-all active:scale-95">{t.addChallenge}</button>
                 <button onClick={() => setShowManualAdd(false)} className="px-12 py-5 bg-gray-100 text-gray-500 rounded-3xl font-black hover:bg-gray-200 transition-all active:scale-95">{t.close}</button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
      `}</style>
    </div>
  );
}

export default App;
