
import React, { useState, useEffect, useRef } from 'react';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { playgroundService } from '../services/playgroundService';
import { Framework, Attempt, Language, Question } from '../types';
import { translations } from '../i18n';

interface EditorPaneProps {
  question: Question;
  framework: Framework;
  lang: Language;
  onQuestionUpdate: (updates: Partial<Question>) => void;
  onSave: (code: string, versionName?: string) => void;
}

declare const require: any;
declare const monaco: any;

const EditorPane: React.FC<EditorPaneProps> = ({ question, framework, lang, onSave, onQuestionUpdate }) => {
  const t = translations[lang];
  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSaveNaming, setShowSaveNaming] = useState(false);
  const [showEditMeta, setShowEditMeta] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [history, setHistory] = useState<Attempt[]>([]);
  
  // Local state for editing question
  const [editTitle, setEditTitle] = useState(question.title);
  const [editDesc, setEditDesc] = useState(question.description);
  const [editSolution, setEditSolution] = useState(question[framework].solution);

  const editorRef = useRef<any>(null);
  const monacoContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const initialCode = storageService.getLatestCode(question.id, framework) || question[framework].initial;

  useEffect(() => {
    if (!monacoContainerRef.current) return;
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], () => {
      if (!editorRef.current) {
        editorRef.current = monaco.editor.create(monacoContainerRef.current, {
          value: initialCode,
          language: framework === 'vue' ? 'html' : 'javascript',
          theme: 'vs',
          fontSize: 14,
          fontFamily: 'Fira Code',
          minimap: { enabled: false },
          automaticLayout: true,
          padding: { top: 16 },
          tabSize: 2,
          wordWrap: 'on'
        });
        editorRef.current.onDidChangeModelContent(() => debouncedUpdatePreview());
      } else {
        editorRef.current.setValue(initialCode);
      }
      updatePreview(initialCode);
    });
  }, [question.id, framework]);

  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      monaco.editor.setModelLanguage(model, framework === 'vue' ? 'html' : 'javascript');
      setHistory(storageService.getHistoryByQuestion(question.id, framework));
      
      // Sync edit inputs
      setEditTitle(question.title);
      setEditDesc(question.description);
      setEditSolution(question[framework].solution);
    }
  }, [question.id, framework, initialCode]);

  const updatePreview = (codeToRun?: string) => {
    const code = codeToRun || (editorRef.current?.getValue() || initialCode);
    if (!iframeRef.current) return;
    
    const htmlContent = playgroundService.generateHtml(code, framework);
    iframeRef.current.src = URL.createObjectURL(new Blob([htmlContent], { type: 'text/html' }));
  };

  const debouncedUpdatePreview = (() => {
    let t_ref: any; return () => { clearTimeout(t_ref); t_ref = setTimeout(() => updatePreview(), 800); };
  })();

  const handleSaveAttempt = () => {
    const code = editorRef.current?.getValue();
    onSave(code, versionName);
    setVersionName('');
    setShowSaveNaming(false);
    setHistory(storageService.getHistoryByQuestion(question.id, framework));
  };

  const handleHintRequest = async () => {
    setLoadingHint(true);
    const h = await geminiService.getHint(question.description, editorRef.current.getValue(), lang);
    setHint(h);
    setLoadingHint(false);
  };

  const handleQuestionUpdateSubmit = () => {
    onQuestionUpdate({
      title: editTitle,
      description: editDesc,
      [framework]: {
        ...question[framework],
        solution: editSolution
      }
    });
    setShowEditMeta(false);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[2.5rem] shadow-sm border border-pink-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-pink-50">
        <div className="flex gap-2">
          <button onClick={() => setShowSaveNaming(true)} className="px-5 py-2 bg-pink-400 text-white rounded-2xl text-xs font-black hover:bg-pink-500 transition shadow-sm">{t.save}</button>
          <button onClick={() => setShowHistory(!showHistory)} className="px-5 py-2 bg-pink-50 text-pink-400 rounded-2xl text-xs font-black hover:bg-pink-100 transition">{t.history}</button>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={handleHintRequest} className="text-xs font-black text-pink-300 hover:text-pink-500">{loadingHint ? t.thinking : `💡 ${t.hint}`}</button>
          <button onClick={() => setShowSolution(!showSolution)} className="text-xs font-black text-gray-400 hover:text-gray-600 ml-4">{showSolution ? t.hideSolution : t.solution}</button>
          <button onClick={() => setShowEditMeta(true)} className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-400 rounded-full hover:bg-pink-50 hover:text-pink-400 transition ml-2">✎</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div className="w-1/2 h-full border-r border-pink-50" ref={monacoContainerRef} />
        <div className="w-1/2 h-full bg-[#fffcfd] relative">
           <iframe ref={iframeRef} className="w-full h-full border-none" title="Preview" />
        </div>

        {/* History Overlay */}
        {showHistory && (
          <div className="absolute top-0 right-0 w-80 h-full bg-white/95 backdrop-blur-md shadow-2xl z-20 p-6 overflow-y-auto animate-slide-left border-l border-pink-50">
             <div className="flex items-center justify-between mb-6">
                <h4 className="font-black text-gray-800">{t.pastVersions}</h4>
                <button onClick={() => setShowHistory(false)} className="text-gray-400 p-2">✕</button>
             </div>
             <div className="space-y-3">
                {history.length === 0 && <p className="text-xs text-gray-400 italic text-center py-8">{t.noHistory}</p>}
                {history.map(h => (
                  <button key={h.id} onClick={() => { editorRef.current?.setValue(h.code); setShowHistory(false); }} className="w-full text-left p-4 rounded-3xl bg-gray-50 hover:bg-pink-50 transition border border-transparent hover:border-pink-200 group">
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-[10px] font-black text-pink-300 group-hover:text-pink-400">{new Date(h.timestamp).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US')}</div>
                      {h.name && <div className="text-[9px] px-2 py-0.5 bg-pink-100 text-pink-600 rounded-full font-black uppercase tracking-tighter">{h.name}</div>}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono truncate bg-white/50 p-1.5 rounded-lg border border-gray-100">{h.code.substring(0, 60)}...</div>
                  </button>
                ))}
             </div>
          </div>
        )}

        {/* Save Naming Dialog */}
        {showSaveNaming && (
          <div className="absolute inset-0 bg-pink-900/10 backdrop-blur-md z-30 flex items-center justify-center animate-fade-in p-6">
             <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-pink-100 max-w-sm w-full">
                <div className="flex flex-col items-center mb-6">
                  <div className="w-16 h-16 bg-pink-50 text-pink-400 rounded-3xl flex items-center justify-center text-3xl mb-4">💾</div>
                  <h3 className="text-xl font-black text-gray-800">{t.save}</h3>
                </div>
                <label className="block text-[10px] font-black text-pink-300 uppercase tracking-widest mb-2 px-1">{t.versionName}</label>
                <input 
                  autoFocus
                  value={versionName}
                  onChange={e => setVersionName(e.target.value)}
                  placeholder={t.placeholderVersion}
                  className="w-full bg-pink-50/30 border-2 border-pink-50 rounded-2xl px-5 py-4 text-sm mb-6 focus:ring-4 ring-pink-100 focus:border-pink-200 outline-none transition-all"
                  onKeyDown={e => e.key === 'Enter' && handleSaveAttempt()}
                />
                <div className="flex gap-3">
                   <button onClick={handleSaveAttempt} className="flex-1 py-4 bg-pink-400 text-white rounded-2xl font-black text-sm shadow-xl shadow-pink-200/50 hover:bg-pink-500 transition-colors">{t.save}</button>
                   <button onClick={() => setShowSaveNaming(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-sm hover:bg-gray-200 transition-colors">{t.close}</button>
                </div>
             </div>
          </div>
        )}

        {/* Edit Question Dialog */}
        {showEditMeta && (
          <div className="absolute inset-0 bg-white z-40 p-12 overflow-y-auto animate-fade-in custom-scrollbar">
             <div className="max-w-3xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                   <div>
                      <h3 className="text-3xl font-black text-gray-800 tracking-tight">{t.editQuestion}</h3>
                      <p className="text-gray-400 text-sm mt-1">Review and refine the challenge details.</p>
                   </div>
                   <button onClick={() => setShowEditMeta(false)} className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-400 rounded-full hover:bg-pink-50 hover:text-pink-400 transition">✕</button>
                </div>
                
                <div className="space-y-8">
                   <div>
                      <label className="text-[10px] font-black text-pink-300 uppercase tracking-widest block mb-2 px-1">Title</label>
                      <input 
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-3xl px-6 py-4 text-sm font-bold focus:ring-4 ring-pink-50 focus:border-pink-200 outline-none transition-all"
                      />
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-pink-300 uppercase tracking-widest block mb-2 px-1">Description</label>
                      <textarea 
                        rows={5}
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                        className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-3xl px-6 py-4 text-sm font-medium focus:ring-4 ring-pink-50 focus:border-pink-200 outline-none resize-none transition-all"
                      />
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-pink-300 uppercase tracking-widest block mb-2 px-1">Answer Solution ({framework.toUpperCase()})</label>
                      <textarea 
                        rows={12}
                        value={editSolution}
                        onChange={e => setEditSolution(e.target.value)}
                        className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-3xl px-6 py-4 text-xs font-mono focus:ring-4 ring-pink-50 focus:border-pink-200 outline-none resize-none transition-all"
                      />
                   </div>
                   <div className="pt-6 flex gap-4">
                      <button onClick={handleQuestionUpdateSubmit} className="px-12 py-4 bg-pink-400 text-white rounded-3xl font-black text-sm shadow-xl shadow-pink-200 hover:bg-pink-500 transition-colors">{t.saveChanges}</button>
                      <button onClick={() => setShowEditMeta(false)} className="px-12 py-4 bg-gray-100 text-gray-500 rounded-3xl font-black text-sm hover:bg-gray-200 transition-colors">{t.close}</button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Reference Solution View */}
        {showSolution && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-30 p-12 overflow-auto animate-fade-in custom-scrollbar">
             <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-2xl font-black text-pink-500">{t.correctImpl}</h3>
                   <button onClick={() => setShowSolution(false)} className="px-6 py-2 bg-gray-100 text-gray-500 rounded-full font-bold text-xs hover:bg-gray-200 transition-colors">{t.close}</button>
                </div>
                <div className="bg-gray-900 rounded-[2.5rem] p-10 overflow-hidden shadow-2xl">
                   <pre className="text-green-400 font-mono text-xs leading-relaxed whitespace-pre-wrap">{question[framework].solution}</pre>
                </div>
             </div>
          </div>
        )}

        {hint && (
          <div className="absolute bottom-10 left-10 right-10 bg-pink-500 text-white p-6 rounded-3xl shadow-2xl animate-slide-up z-40 flex justify-between items-center border-b-4 border-pink-700">
            <div className="flex items-center gap-4">
              <span className="text-3xl">💡</span>
              <p className="text-sm font-bold leading-relaxed">{hint}</p>
            </div>
            <button onClick={() => setHint(null)} className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30 transition">✕</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-left { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-left { animation: slide-left 0.4s cubic-bezier(0.19, 1, 0.22, 1); }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.19, 1, 0.22, 1); }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default EditorPane;
