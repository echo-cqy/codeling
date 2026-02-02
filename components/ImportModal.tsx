
import React, { useRef, useState } from 'react';
import { markdownService } from '../services/markdownService';
import { storageService } from '../services/storageService';
import { Language } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  onFailure: (msg: string) => void;
  lang: Language;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onSuccess, onFailure, lang }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadExample = () => {
    const content = markdownService.generateExample();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codeling_challenge_template.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setError(null);

    let importedCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
          const text = await file.text();
          const q = markdownService.parse(text);
          if (q) {
            storageService.addQuestion(q);
            importedCount++;
          }
        }
      }

      if (importedCount > 0) {
        onSuccess(importedCount);
        onClose();
      } else {
        const msg = lang === 'zh' ? '未识别到有效的 Markdown 题目文件' : 'No valid Markdown challenge files found';
        setError(msg);
        onFailure(msg);
      }
    } catch (e) {
      const msg = lang === 'zh' ? '解析过程中发生错误' : 'An error occurred during parsing';
      setError(msg);
      onFailure(msg);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (dirInputRef.current) dirInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-pink-900/10 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-pink-100 max-w-2xl w-full relative animate-sweet-pop overflow-hidden" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-8 right-10 text-gray-300 hover:text-pink-400 transition-colors bg-gray-50 p-2 rounded-xl">✕</button>
        
        <h2 className="text-2xl font-black text-gray-800 mb-6 tracking-tighter">
          {lang === 'zh' ? '批量导入挑战' : 'Bulk Import Challenges'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-pink-400 uppercase tracking-widest">{lang === 'zh' ? '导入规则' : 'IMPORT RULES'}</h3>
            <ul className="text-xs text-gray-500 space-y-2 list-disc pl-4">
              <li>{lang === 'zh' ? '必须是 .md 结尾的 Markdown 文件' : 'Must be a .md file'}</li>
              <li>{lang === 'zh' ? '# 后跟标题作为题目名' : '# Title as the challenge name'}</li>
              <li>{lang === 'zh' ? '## Meta 包含 Difficulty, Category, Tags' : '## Meta includes Difficulty, Category, Tags'}</li>
              <li>{lang === 'zh' ? '## React / ## Vue 后跟代码块' : '## React / ## Vue followed by code blocks'}</li>
            </ul>
            <button 
              onClick={handleDownloadExample}
              className="flex items-center gap-2 text-[10px] font-black text-blue-400 hover:text-blue-500 transition-colors uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-xl"
            >
              <span>📥</span> {lang === 'zh' ? '下载模版示例' : 'Download Template'}
            </button>
          </div>

          <div className="space-y-4 flex flex-col justify-center">
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full py-4 bg-pink-50 border-2 border-dashed border-pink-100 rounded-2xl flex flex-col items-center justify-center gap-1 hover:border-pink-300 hover:bg-pink-100 transition-all active:scale-95 group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">📄</span>
                <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest">
                  {isProcessing ? 'Processing...' : (lang === 'zh' ? '选择文件' : 'Select Files')}
                </span>
              </button>

              <button 
                onClick={() => dirInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full py-4 bg-blue-50 border-2 border-dashed border-blue-100 rounded-2xl flex flex-col items-center justify-center gap-1 hover:border-blue-300 hover:bg-blue-100 transition-all active:scale-95 group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">📂</span>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                  {isProcessing ? 'Processing...' : (lang === 'zh' ? '选择文件夹' : 'Select Folder')}
                </span>
              </button>
            </div>
            
            {error && (
              <p className="text-[10px] font-bold text-red-400 text-center animate-shake">{error}</p>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">{lang === 'zh' ? '关于文件夹导入' : 'ABOUT FOLDER IMPORT'}</p>
           <p className="text-[11px] text-gray-500 leading-relaxed">
             {lang === 'zh' 
               ? '选择文件夹后，系统会扫描其中的所有 .md 文件。这种方式非常适合从 GitHub 仓库或本地题库迁移数据。' 
               : 'Selecting a folder will scan for all .md files inside. This is perfect for migrating from a question bank.'}
           </p>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          multiple 
          accept=".md,.markdown" 
          className="hidden" 
          onChange={(e) => processFiles(e.target.files)} 
        />
        <input 
          type="file" 
          ref={dirInputRef} 
          {...({ webkitdirectory: "", directory: "" } as any)} 
          className="hidden" 
          onChange={(e) => processFiles(e.target.files)} 
        />
      </div>
    </div>
  );
};

export default ImportModal;
