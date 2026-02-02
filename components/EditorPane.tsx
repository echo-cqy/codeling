
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  onDeleteAttempt: (id: string) => void;
}

declare const require: any;
declare const monaco: any;

type ViewSource = 'draft' | 'solution' | 'history';

const HistorySidebarItem: React.FC<{
  attempt: Attempt;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (id: string, updates: Partial<Attempt>) => void;
  onDelete: (id: string) => void;
  lang: Language;
}> = ({ attempt, isActive, onSelect, onUpdate, onDelete, lang }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(attempt.name || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleRename = () => {
    const finalName = tempName.trim();
    if (finalName !== (attempt.name || '')) {
      onUpdate(attempt.id, { name: finalName });
    }
    setIsEditing(false);
  };

  return (
    <div className={`relative group p-3 rounded-2xl transition-all duration-300 border mb-2 ${
      isActive ? 'bg-white border-pink-200 shadow-md scale-[1.02]' : 'bg-white/40 border-transparent hover:border-pink-100 hover:bg-white'
    }`}>
      <div className="flex flex-col gap-1 cursor-pointer" onClick={() => !isEditing && onSelect()}>
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[8px] font-black text-pink-300 opacity-60">
            {new Date(attempt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {attempt.isStarred && <span className="text-amber-400 text-[10px]">★</span>}
        </div>
        {isEditing ? (
          <input
            ref={inputRef}
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') { setIsEditing(false); setTempName(attempt.name || ''); }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-pink-50 border-none rounded-lg px-2 py-1 text-[11px] font-bold text-gray-700 outline-none ring-2 ring-pink-300"
          />
        ) : (
          <div className={`text-[11px] font-bold truncate ${isActive ? 'text-pink-600' : 'text-gray-600'}`}>
            {attempt.name || (lang === 'zh' ? '未命名版本' : 'Untitled')}
          </div>
        )}
      </div>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onUpdate(attempt.id, { isStarred: !attempt.isStarred }); }} className={`p-1 rounded-lg transition ${attempt.isStarred ? 'text-amber-400' : 'text-gray-300'}`}>
          <svg className="w-3.5 h-3.5" fill={attempt.isStarred ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
        </button>
        <button onClick={(e) => { e.stopPropagation(); if(confirm(lang==='zh'?'确定删除此历史版本？':'Delete this version?')) onDelete(attempt.id); }} className="p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    </div>
  );
};

const EditorPane: React.FC<EditorPaneProps> = ({ question, framework, lang, onSave, onDeleteAttempt }) => {
  const t = translations[lang];
  const [activeSource, setActiveSource] = useState<ViewSource>('draft');
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [showSaveNaming, setShowSaveNaming] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [history, setHistory] = useState<Attempt[]>([]);
  const [isDrafting, setIsDrafting] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'both' | 'editor' | 'preview'>('both');

  const editorRef = useRef<any>(null);
  const monacoContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const refreshHistory = useCallback(() => {
    const list = storageService.getHistoryByQuestion(question.id, framework);
    if (isMounted.current) setHistory(list);
    return list;
  }, [question.id, framework]);

  useEffect(() => { refreshHistory(); }, [refreshHistory]);

  const updatePreview = useCallback((codeToRun?: string) => {
    const code = codeToRun || (editorRef.current?.getValue());
    if (!iframeRef.current || !code) return;
    
    const htmlContent = playgroundService.generateHtml(code, framework);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const prevUrl = iframeRef.current.src;
    iframeRef.current.src = url;
    
    if (prevUrl.startsWith('blob:')) {
      setTimeout(() => URL.revokeObjectURL(prevUrl), 100);
    }
  }, [framework]);

  const debouncedUpdatePreview = useRef((() => {
    let t_ref: any;
    return (code?: string) => {
      clearTimeout(t_ref);
      t_ref = setTimeout(() => updatePreview(code), 300);
    };
  })()).current;

  const debouncedAutoSave = useRef((() => {
    let t_ref: any;
    return () => {
      clearTimeout(t_ref);
      t_ref = setTimeout(() => {
        if (!isMounted.current || !editorRef.current) return;
        const code = editorRef.current.getValue();
        if (code && activeSource === 'draft') {
          storageService.saveDraft(question.id, framework, code);
          setIsDrafting(false);
        }
      }, 1000);
    };
  })()).current;

  const activeCode = useMemo(() => {
    if (activeSource === 'draft') {
      return storageService.getDraft(question.id, framework) || question[framework].initial;
    } else if (activeSource === 'solution') {
      return question[framework].solution;
    } else {
      const item = history.find(h => h.id === selectedHistoryId);
      if (item) return item.code;
      if (history.length > 0) return history[0].code;
      return "// " + (lang === 'zh' ? '暂无历史版本' : 'No history yet');
    }
  }, [activeSource, selectedHistoryId, question, framework, history, lang]);

  const isReadOnly = useMemo(() => activeSource !== 'draft', [activeSource]);

  useEffect(() => {
    updatePreview(activeCode); 
    if (editorRef.current) {
      if (editorRef.current.getValue() !== activeCode) {
        editorRef.current.setValue(activeCode);
      }
      editorRef.current.updateOptions({ readOnly: isReadOnly });
    }
  }, [activeCode, isReadOnly, updatePreview]);

  useEffect(() => {
    if (!monacoContainerRef.current) return;
    
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], () => {
      if (!isMounted.current || !monacoContainerRef.current) return;
      
      if (!editorRef.current) {
        editorRef.current = monaco.editor.create(monacoContainerRef.current, {
          value: activeCode,
          language: framework === 'vue' ? 'html' : 'javascript',
          theme: 'vs',
          fontSize: 14,
          fontFamily: "'Fira Code', monospace",
          minimap: { enabled: false },
          automaticLayout: true,
          readOnly: isReadOnly,
          padding: { top: 20, bottom: 20 },
          tabSize: 2,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
        });

        updatePreview(activeCode);

        editorRef.current.onDidChangeModelContent(() => {
          if (activeSource === 'draft') {
            setIsDrafting(true);
            debouncedUpdatePreview();
            debouncedAutoSave();
          }
        });
      }
    });

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, [question.id, framework]);

  useEffect(() => {
    if (editorRef.current) {
      const timer = setTimeout(() => editorRef.current.layout(), 350);
      return () => clearTimeout(timer);
    }
  }, [activeSource, layoutMode]);

  const handleSaveAttempt = () => {
    if (!editorRef.current) return;
    const code = editorRef.current.getValue();
    onSave(code, versionName);
    setVersionName('');
    setShowSaveNaming(false);
    refreshHistory();
  };

  const applyToDraft = () => {
    if (!editorRef.current) return;
    const code = editorRef.current.getValue();
    if (confirm(lang === 'zh' ? '确定覆盖当前草稿？' : 'Overwrite your current draft?')) {
      storageService.saveDraft(question.id, framework, code);
      setActiveSource('draft');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[2.5rem] shadow-2xl border border-pink-100 overflow-hidden relative">
      <div className="flex items-center justify-between px-6 py-3 border-b border-pink-50 bg-white z-10 shrink-0">
        <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-2xl border border-gray-100 shadow-inner">
          {(['draft', 'solution', 'history'] as ViewSource[]).map(src => (
            <button 
              key={src}
              onClick={() => setActiveSource(src)}
              className={`px-6 py-2 rounded-xl text-[11px] font-black transition-all ${
                activeSource === src ? 'bg-white text-pink-500 shadow-sm' : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              {src === 'draft' ? (lang === 'zh' ? '草稿' : 'DRAFT') : 
               src === 'solution' ? (lang === 'zh' ? '参考' : 'SOLUTION') : 
               (lang === 'zh' ? '历史' : 'HISTORY')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {activeSource === 'draft' ? (
            <button onClick={() => setShowSaveNaming(true)} className="px-6 py-2 bg-pink-400 text-white rounded-xl text-[11px] font-black hover:bg-pink-500 transition shadow-lg shadow-pink-100 active:scale-95">
              {t.save}
            </button>
          ) : (
            <button onClick={applyToDraft} className="px-6 py-2 bg-pink-50 text-pink-500 border border-pink-100 rounded-xl text-[11px] font-black hover:bg-pink-100 transition active:scale-95">
              {lang === 'zh' ? '恢复到草稿' : 'RESTORE'}
            </button>
          )}

          <div className="h-6 w-px bg-gray-100 mx-2" />
          
          <div className="flex bg-gray-50 p-1 rounded-xl">
             <button onClick={() => setLayoutMode('both')} className={`p-1.5 rounded-lg transition ${layoutMode === 'both' ? 'bg-white text-pink-400 shadow-sm' : 'text-gray-300'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg></button>
             <button onClick={() => setLayoutMode('editor')} className={`p-1.5 rounded-lg transition ${layoutMode === 'editor' ? 'bg-white text-pink-400 shadow-sm' : 'text-gray-300'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg></button>
             <button onClick={() => setLayoutMode('preview')} className={`p-1.5 rounded-lg transition ${layoutMode === 'preview' ? 'bg-white text-pink-400 shadow-sm' : 'text-gray-300'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0 relative bg-white">
        <div 
          className="shrink-0 border-r border-pink-50 bg-pink-50/10 flex flex-col transition-all duration-300 ease-in-out overflow-hidden" 
          style={{ width: activeSource === 'history' ? '256px' : '0px', opacity: activeSource === 'history' ? 1 : 0 }}
        >
          <div className="w-64 flex flex-col h-full shrink-0">
            <div className="p-4 border-b border-pink-50 bg-white/50 flex items-center justify-between">
              <h4 className="text-[10px] font-black text-pink-300 uppercase tracking-widest">{t.pastVersions}</h4>
              <span className="px-2 py-0.5 bg-pink-100 text-pink-500 rounded-full text-[9px] font-black">{history.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
              {history.length === 0 ? (
                <div className="text-center py-12 text-[10px] text-gray-300 font-bold uppercase">{t.noHistory}</div>
              ) : history.map(h => (
                <HistorySidebarItem 
                  key={h.id}
                  attempt={h}
                  isActive={selectedHistoryId === h.id}
                  lang={lang}
                  onSelect={() => setSelectedHistoryId(h.id)}
                  onUpdate={(id, up) => { storageService.updateAttempt(id, up); refreshHistory(); }}
                  onDelete={(id) => { onDeleteAttempt(id); refreshHistory(); if(selectedHistoryId===id) setSelectedHistoryId(null); }}
                />
              ))}
            </div>
          </div>
        </div>

        <div 
          className={`h-full overflow-hidden transition-all duration-300 ${layoutMode === 'preview' ? 'w-0 opacity-0' : 'opacity-100'}`} 
          style={{ width: layoutMode === 'both' ? `50%` : (layoutMode === 'editor' ? '100%' : '0%') }}
        >
          <div ref={monacoContainerRef} className="w-full h-full" />
        </div>

        <div 
          className={`h-full transition-all duration-300 overflow-hidden border-l border-pink-50 ${layoutMode === 'editor' ? 'w-0 opacity-0' : 'opacity-100'}`}
          style={{ width: layoutMode === 'both' ? `50%` : (layoutMode === 'preview' ? '100%' : '0%') }}
        >
          <iframe ref={iframeRef} className="w-full h-full bg-white" title="Preview" />
        </div>

        {isDrafting && activeSource === 'draft' && (
          <div className="absolute bottom-6 left-6 px-4 py-2 bg-white/90 backdrop-blur border border-pink-100 rounded-full shadow-lg z-20 flex items-center gap-2 animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Saving Draft...</span>
          </div>
        )}

        {showSaveNaming && (
          <div 
            className="absolute inset-0 bg-pink-900/10 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-fade-in"
            onClick={(e) => { if(e.target === e.currentTarget) setShowSaveNaming(false); }}
          >
             <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-pink-100 max-sm:w-full max-w-sm text-center animate-sweet-pop" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-black text-gray-800 mb-6">{t.save}</h3>
                <input 
                  autoFocus
                  value={versionName} 
                  onChange={e => setVersionName(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleSaveAttempt()}
                  placeholder={t.placeholderVersion} 
                  className="w-full bg-pink-50/30 border-2 border-pink-50 rounded-2xl px-6 py-4 text-sm mb-6 outline-none focus:border-pink-300 transition-all shadow-inner" 
                />
                <div className="flex gap-4">
                   <button onClick={handleSaveAttempt} className="flex-1 py-4 bg-pink-400 text-white rounded-[1.5rem] font-black text-xs hover:bg-pink-500 shadow-xl transition active:scale-95">OK</button>
                   <button onClick={() => setShowSaveNaming(false)} className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-[1.5rem] font-black text-xs hover:bg-gray-200 transition uppercase active:scale-95">Cancel</button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorPane;
