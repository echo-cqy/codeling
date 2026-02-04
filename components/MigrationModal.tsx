import React from 'react';

export default function MigrationModal({
  lang,
  onImport,
  onSkip,
  importing
}: {
  lang: 'en' | 'zh';
  onImport: () => void;
  onSkip: () => void;
  importing: boolean;
}) {
  return (
    <div
      className="fixed inset-0 bg-pink-900/10 backdrop-blur-md z-[260] flex items-center justify-center p-6 animate-fade-in"
      onClick={onSkip}
    >
      <div
        className="bg-white rounded-[3rem] p-10 shadow-2xl border border-pink-100 max-w-xl w-full relative animate-sweet-pop overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onSkip}
          className="absolute top-8 right-10 text-gray-300 hover:text-pink-400 transition-colors bg-gray-50 p-2 rounded-xl"
        >
          ✕
        </button>

        <h2 className="text-2xl font-black text-gray-800 mb-2 tracking-tighter">
          {lang === 'zh' ? '导入本地数据？' : 'Import local data?'}
        </h2>
        <p className="text-xs text-gray-400 mb-8">
          {lang === 'zh'
            ? '检测到你本地有题库/历史记录，但云端是空的。是否导入到账号以便跨设备同步？'
            : 'We found local challenges/progress, but your cloud storage is empty. Import it to sync across devices?'}
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onSkip}
            disabled={importing}
            className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition border ${
              importing ? 'bg-gray-50 text-gray-300 border-gray-100' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
            }`}
          >
            {lang === 'zh' ? '跳过' : 'Skip'}
          </button>
          <button
            onClick={onImport}
            disabled={importing}
            className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition ${
              importing ? 'bg-gray-100 text-gray-400' : 'bg-pink-400 text-white hover:bg-pink-500 shadow-sm'
            }`}
          >
            {importing ? (lang === 'zh' ? '导入中...' : 'Importing...') : lang === 'zh' ? '导入并同步' : 'Import & Sync'}
          </button>
        </div>
      </div>
    </div>
  );
}

