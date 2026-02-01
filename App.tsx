
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

  const handleMagicGenerate = async () => {
    if (!magicTopic.trim()) return;
    setIsGenerating(true);
    try {
      const generated = await geminiService.generateQuestion(magicTopic, lang);
      storageService.addQuestion(generated);
      setQuestions(storageService.getQuestions());
      setSelectedQuestion(generated);
      setMagicTopic('');
    } catch (e) {
      console.error(e);
      alert(t.magicFail);
    }
    setIsGenerating(false);
  };

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'zh' : 'en');
  };

  return (
    <div className="flex h-screen w-screen bg-[#fffafa] text-gray-800 p-4 gap-4 font-['Quicksand'] overflow-hidden fixed inset-0">
      {/* 侧边栏 */}
      <aside className="w-80 bg-white border border-pink-50 flex flex-col shadow-xl rounded-[3rem] overflow-hidden shrink-0">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-4xl hover:rotate-12 transition-transform cursor-pointer">🧁</span>
            <h1 className="text-3xl font-black text-pink-500 tracking-tighter">Codeling</h1>
          </div>
          
          <div className="bg-pink-50/50 p-4 rounded-[2rem] border border-pink-100/50 mb-6">
             <div className="text-[10px] font-black text-pink-400 uppercase tracking-widest mb-3 px-1">{t.aiCreator}</div>
             <div className="relative">
                <input 
                  value={magicTopic} 
                  onChange={e => setMagicTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleMagicGenerate()}
                  placeholder={t.magicPlaceholder}
                  className="w-full bg-white border border-pink-100 rounded-2xl px-4 py-2.5 text-xs outline-none focus:ring-2 ring-pink-200 transition"
                />
                <button 
                  onClick={handleMagicGenerate}
                  disabled={isGenerating}
                  className="absolute right-2 top-1.5 w-7 h-7 bg-pink-400 text-white rounded-xl flex items-center justify-center hover:bg-pink-500 transition disabled:opacity-50"
                >{isGenerating ? '...' : '🪄'}</button>
             </div>
          </div>

          <button 
             onClick={() => setShowManualAdd(true)}
             className="w-full py-3 bg-white border-2 border-dashed border-pink-100 text-pink-400 rounded-2xl text-[11px] font-black hover:bg-pink-50 transition mb-2"
          >+ {t.addChallenge}</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-8 custom-scrollbar">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest px-2 mb-4">{t.challenges}</p>
          <div className="space-y-3">
            {questions.map(q => (
              <button
                key={q.id}
                onClick={() => { setSelectedQuestion(q); setView('editor'); }}
                className={`group relative w-full text-left p-5 rounded-[2.2rem] transition border-2 ${selectedQuestion.id === q.id ? 'border-pink-200 bg-pink-50/30' : 'border-transparent hover:bg-gray-50'}`}
              >
                <div className="font-black text-gray-700 text-sm leading-tight mb-1.5">{q.title}</div>
                <div className="flex items-center gap-2">
                   <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase bg-pink-100 text-pink-500">{t.difficulty[q.difficulty]}</span>
                   <span className="text-[8px] text-gray-400 font-bold">{q.category}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* 主界面 */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 gap-4 h-full">
        {/* 顶部 Header */}
        <header className="bg-white h-20 px-10 rounded-[2.5rem] shadow-sm border border-pink-50 flex items-center justify-between shrink-0">
           <div className="flex bg-gray-100/50 p-1.5 rounded-2xl border border-gray-100">
              <button 
                onClick={() => setView('editor')} 
                className={`px-8 py-2.5 rounded-xl text-xs font-black transition ${view === 'editor' ? 'bg-white text-pink-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {t.workshop}
              </button>
              <button 
                onClick={() => setView('stats')} 
                className={`px-8 py-2.5 rounded-xl text-xs font-black transition ${view === 'stats' ? 'bg-white text-pink-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {t.dashboard}
              </button>
           </div>

           <div className="flex items-center gap-8">
              <div className="flex items-center gap-4">
                 <div className="text-right">
                    <p className="text-[10px] font-black text-gray-300 uppercase leading-none mb-1.5">{t.mastery}</p>
                    <p className="text-sm font-black text-gray-700 leading-none">{Math.round((stats.solvedCount / (questions.length || 1)) * 100)}%</p>
                 </div>
                 <div className="w-36 h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                    <div className="h-full bg-pink-400 transition-all duration-1000" style={{ width: `${(stats.solvedCount / (questions.length || 1)) * 100}%` }}></div>
                 </div>
              </div>
              <button onClick={toggleLanguage} className="w-12 h-12 bg-white border border-pink-100 text-pink-400 rounded-2xl text-[11px] font-black hover:bg-pink-50 transition shadow-sm">{lang.toUpperCase()}</button>
           </div>
        </header>

        {/* 内容区 - 核心工作区，必须占据 100% 高度 */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
          {view === 'editor' ? (
            <div className="h-full flex flex-col gap-4 animate-fade-in overflow-hidden">
              <div className="bg-white p-6 px-10 rounded-[2.5rem] border border-pink-50 flex items-center justify-between shadow-lg shrink-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-black text-gray-800 tracking-tight truncate">{selectedQuestion.title}</h2>
                    <span className="text-[10px] px-2 py-0.5 bg-pink-50 text-pink-400 rounded-lg font-black">{selectedQuestion.category}</span>
                  </div>
                  <p className="text-xs text-gray-400 max-w-3xl truncate font-medium">{selectedQuestion.description}</p>
                </div>
                <div className="flex bg-pink-50/50 p-1.5 rounded-xl border border-pink-100/30 ml-8 shrink-0">
                  <button onClick={() => setFramework('react')} className={`px-6 py-2 rounded-lg text-[11px] font-black transition ${framework === 'react' ? 'bg-white text-blue-500 shadow-md scale-105' : 'text-gray-400 hover:text-gray-500'}`}>REACT</button>
                  <button onClick={() => setFramework('vue')} className={`px-6 py-2 rounded-lg text-[11px] font-black transition ${framework === 'vue' ? 'bg-white text-green-500 shadow-md scale-105' : 'text-gray-400 hover:text-gray-500'}`}>VUE</button>
                </div>
              </div>
              
              {/* 这里是 EditorPane 所在，必须 min-h-0 以确保其能占满 flex-1 的高度 */}
              <div className="flex-1 min-h-0 relative">
                <EditorPane 
                  key={`${selectedQuestion.id}-${framework}`}
                  question={selectedQuestion}
                  onSave={handleSave}
                  onQuestionUpdate={() => {}}
                  framework={framework}
                  lang={lang}
                />
              </div>
            </div>
          ) : (
            <div className="h-full bg-white rounded-[3rem] p-12 overflow-y-auto custom-scrollbar shadow-xl border border-pink-50 animate-fade-in">
               <div className="max-w-4xl mx-auto">
                 <StatsView stats={stats} lang={lang} />
               </div>
            </div>
          )}
        </div>
      </main>
      
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ffcfd2; border-radius: 10px; }
      `}</style>
    </div>
  );
}

export default App;
