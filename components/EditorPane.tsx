
import React, { useState, useEffect, useRef } from 'react';
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

const EditorPane: React.FC<EditorPaneProps> = ({ question, framework, lang, onSave }) => {
  const t = translations[lang];
  const [showSolution, setShowSolution] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSaveNaming, setShowSaveNaming] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [history, setHistory] = useState<Attempt[]>([]);

  // Layout States
  const [splitRatio, setSplitRatio] = useState(50);
  const [layoutMode, setLayoutMode] = useState<'both' | 'editor' | 'preview'>('both');
  const [isResizing, setIsResizing] = useState(false);

  const editorRef = useRef<any>(null);
  const monacoContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialCode = storageService.getLatestCode(question.id, framework) || question[framework].initial;

  // Monaco Initialization & Configuration
  useEffect(() => {
    if (!monacoContainerRef.current) return;
    
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], () => {
      // --- 配置 React/JSX 支持 ---
      // 1. 设置编译器选项，启用 JSX 和 ESNext
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        allowNonTsExtensions: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        jsxFactory: 'React.createElement',
        reactNamespace: 'React',
        allowJs: true,
        typeRoots: ["node_modules/@types"]
      });

      // 2. 注入模拟的 React 类型定义，消除 className 等属性报错
      const reactLibContent = `
        declare namespace React {
          function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
          function useEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void;
          function useMemo<T>(factory: () => T, deps: ReadonlyArray<any> | undefined): T;
          function useCallback<T extends (...args: any[]) => any>(callback: T, deps: ReadonlyArray<any>): T;
          function useRef<T>(initialValue: T): { current: T };
          interface ReactElement<P = any, T = any> { type: T; props: P; key: string | null; }
          interface DOMAttributes<T> { children?: any; onClick?: any; className?: string; style?: any; }
          interface HTMLAttributes<T> extends DOMAttributes<T> { [prop: string]: any; }
        }
        declare namespace JSX {
          interface IntrinsicElements { [elemName: string]: any; }
        }
      `;
      
      // 仅添加一次
      const libUri = "ts:filename/react.d.ts";
      if (!monaco.languages.typescript.javascriptDefaults.getExtraLibs()[libUri]) {
        monaco.languages.typescript.javascriptDefaults.addExtraLib(reactLibContent, libUri);
      }

      // 3. 配置诊断选项
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false, // 开启语义验证以提供更好的提示
        noSyntaxValidation: false,
        // 忽略某些不必要的错误代码 (例如: 'React' refers to a UMD global)
        diagnosticCodesToIgnore: [2686, 1108] 
      });

      if (!editorRef.current) {
        editorRef.current = monaco.editor.create(monacoContainerRef.current, {
          value: initialCode,
          language: framework === 'vue' ? 'html' : 'javascript',
          theme: 'vs',
          fontSize: 14,
          fontFamily: "'Fira Code', monospace",
          minimap: { enabled: false },
          automaticLayout: true,
          padding: { top: 20, bottom: 20 },
          tabSize: 2,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          fixedOverflowWidgets: true,
          lineNumbers: 'on',
          roundedSelection: true,
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          }
        });

        editorRef.current.onDidChangeModelContent(() => {
          debouncedUpdatePreview();
        });
      } else {
        editorRef.current.setValue(initialCode);
        const langId = framework === 'vue' ? 'html' : 'javascript';
        monaco.editor.setModelLanguage(editorRef.current.getModel(), langId);
      }
      updatePreview(initialCode);
    });
  }, [question.id, framework]);

  // Resizing Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const offset = e.clientX - rect.left;
      const percentage = (offset / rect.width) * 100;
      if (percentage > 10 && percentage < 90) {
        setSplitRatio(percentage);
      }
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const updatePreview = (codeToRun?: string) => {
    const code = codeToRun || (editorRef.current?.getValue() || initialCode);
    if (!iframeRef.current) return;
    const htmlContent = playgroundService.generateHtml(code, framework);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    iframeRef.current.src = URL.createObjectURL(blob);
  };

  const debouncedUpdatePreview = (() => {
    let t_ref: any;
    return () => {
      clearTimeout(t_ref);
      t_ref = setTimeout(() => updatePreview(), 400); // 缩短延迟
    };
  })();

  const handleSaveAttempt = () => {
    const code = editorRef.current?.getValue();
    onSave(code, versionName);
    setVersionName('');
    setShowSaveNaming(false);
    setHistory(storageService.getHistoryByQuestion(question.id, framework));
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[2rem] shadow-2xl border border-pink-100 overflow-hidden relative">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-pink-50 bg-white z-10 shrink-0">
        <div className="flex gap-3">
          <button onClick={() => setShowSaveNaming(true)} className="px-5 py-2 bg-pink-400 text-white rounded-xl text-xs font-black hover:bg-pink-500 transition shadow-lg shadow-pink-100 active:scale-95">{t.save}</button>
          <button onClick={() => { setHistory(storageService.getHistoryByQuestion(question.id, framework)); setShowHistory(!showHistory); }} className="px-5 py-2 bg-pink-50 text-pink-400 rounded-xl text-xs font-black hover:bg-pink-100 transition active:scale-95">{t.history}</button>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex bg-gray-100/50 p-1.5 rounded-2xl mr-2 border border-gray-100">
            <button onClick={() => setLayoutMode('editor')} className={`p-1.5 rounded-xl transition ${layoutMode === 'editor' ? 'bg-white text-pink-400 shadow-sm scale-110' : 'text-gray-300 hover:text-gray-400'}`} title="Code Only">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            </button>
            <button onClick={() => setLayoutMode('both')} className={`p-1.5 rounded-xl transition ${layoutMode === 'both' ? 'bg-white text-pink-400 shadow-sm scale-110' : 'text-gray-300 hover:text-gray-400'}`} title="Split View">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
            </button>
            <button onClick={() => setLayoutMode('preview')} className={`p-1.5 rounded-xl transition ${layoutMode === 'preview' ? 'bg-white text-pink-400 shadow-sm scale-110' : 'text-gray-300 hover:text-gray-400'}`} title="Preview Only">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </button>
          </div>
          <button onClick={() => setShowSolution(!showSolution)} className="text-[11px] font-black text-gray-400 hover:text-pink-500 transition uppercase tracking-widest">{showSolution ? t.hideSolution : t.solution}</button>
        </div>
      </div>

      {/* 主工作区 - 占据 100% 剩余空间 */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative" ref={containerRef}>
        {/* 编辑器 */}
        <div 
          className={`h-full overflow-hidden transition-[width] duration-75 ${layoutMode === 'preview' ? 'w-0 hidden' : ''}`} 
          style={{ width: layoutMode === 'both' ? `${splitRatio}%` : '100%' }}
        >
          <div ref={monacoContainerRef} className="w-full h-full" />
        </div>

        {/* 强化后的分割线 */}
        {layoutMode === 'both' && (
          <div 
            onMouseDown={() => setIsResizing(true)}
            className={`w-2 h-full cursor-col-resize z-20 flex items-center justify-center transition-all ${isResizing ? 'bg-pink-400' : 'bg-pink-50 hover:bg-pink-200'} group`}
          >
            <div className="flex flex-col gap-1.5">
               <div className={`w-1 h-1 rounded-full ${isResizing ? 'bg-white' : 'bg-pink-300'}`} />
               <div className={`w-1 h-1 rounded-full ${isResizing ? 'bg-white' : 'bg-pink-300'}`} />
               <div className={`w-1 h-1 rounded-full ${isResizing ? 'bg-white' : 'bg-pink-300'}`} />
            </div>
            {isResizing && <div className="fixed inset-0 cursor-col-resize z-50" />}
          </div>
        )}

        {/* 预览 */}
        <div 
          className={`h-full transition-[width] duration-75 overflow-hidden ${layoutMode === 'editor' ? 'w-0 hidden' : ''}`}
          style={{ width: layoutMode === 'both' ? `${100 - splitRatio}%` : '100%' }}
        >
          <iframe ref={iframeRef} className="w-full h-full bg-white" title="Preview" />
        </div>

        {/* 覆盖层组件 */}
        {showHistory && (
          <div className="absolute inset-y-0 right-0 w-80 bg-white/95 backdrop-blur-sm shadow-2xl z-30 border-l border-pink-50 animate-slide-left p-6 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-black text-gray-800 text-sm">{t.pastVersions}</h4>
              <button onClick={() => setShowHistory(false)} className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full text-gray-300 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-3">
              {history.length === 0 ? <p className="text-xs text-gray-400 italic text-center py-10">{t.noHistory}</p> : history.map(h => (
                <button key={h.id} onClick={() => { editorRef.current?.setValue(h.code); setShowHistory(false); }} className="w-full text-left p-4 rounded-2xl bg-gray-50 hover:bg-pink-50 transition border border-transparent hover:border-pink-200">
                  <div className="text-[10px] font-black text-pink-300 mb-1">{new Date(h.timestamp).toLocaleString()}</div>
                  <div className="text-[11px] text-gray-500 font-mono truncate">{h.code.substring(0, 40)}...</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {showSaveNaming && (
          <div className="absolute inset-0 bg-pink-900/10 backdrop-blur-sm z-40 flex items-center justify-center p-6 animate-fade-in">
             <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-pink-100 max-w-sm w-full">
                <h3 className="text-xl font-black text-gray-800 mb-6 text-center">{t.save}</h3>
                <input value={versionName} onChange={e => setVersionName(e.target.value)} placeholder={t.placeholderVersion} className="w-full bg-pink-50/50 border-2 border-pink-50 rounded-2xl px-5 py-4 text-sm mb-6 outline-none focus:border-pink-300 transition-all" />
                <div className="flex gap-3">
                   <button onClick={handleSaveAttempt} className="flex-1 py-4 bg-pink-400 text-white rounded-2xl font-black text-sm hover:bg-pink-500 shadow-lg shadow-pink-100 transition">OK</button>
                   <button onClick={() => setShowSaveNaming(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-sm hover:bg-gray-200 transition">CANCEL</button>
                </div>
             </div>
          </div>
        )}

        {showSolution && (
          <div className="absolute inset-0 bg-white/98 backdrop-blur-md z-40 p-10 overflow-hidden animate-fade-in flex flex-col">
             <div className="max-w-5xl mx-auto w-full h-full flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                   <div>
                     <h3 className="text-2xl font-black text-pink-500">{t.correctImpl}</h3>
                     <p className="text-xs text-gray-400 font-medium">Standard solution for reference</p>
                   </div>
                   <button onClick={() => setShowSolution(false)} className="px-8 py-3 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs hover:bg-gray-200 transition">CLOSE</button>
                </div>
                <div className="flex-1 bg-gray-900 rounded-[2.5rem] p-8 shadow-inner overflow-hidden flex flex-col">
                   <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 font-mono text-[13px] text-green-400">
                      <pre className="whitespace-pre-wrap">{question[framework].solution}</pre>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-left { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-left { animation: slide-left 0.4s cubic-bezier(0.19, 1, 0.22, 1); }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default EditorPane;
