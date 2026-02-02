
import React, { useState, useRef, useEffect } from 'react';
import { UserStats, Attempt, Language, Question } from '../types';
import { translations } from '../i18n';
import { storageService } from '../services/storageService';

interface StatsViewProps {
  stats: UserStats;
  lang: Language;
  onRefresh: () => void;
  onDeleteAttempt: (id: string) => void;
}

const TimelineItem: React.FC<{ 
  attempt: Attempt; 
  lang: Language; 
  onUpdate: (id: string, updates: Partial<Attempt>) => void;
  onDelete: (id: string) => void;
  questionTitle?: string;
}> = ({ attempt, lang, onUpdate, onDelete, questionTitle }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(attempt.name || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const finalName = tempName.trim();
    if (finalName !== (attempt.name || '')) {
      onUpdate(attempt.id, { name: finalName });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setTempName(attempt.name || '');
      setIsEditing(false);
    }
  };

  return (
    <div className={`group flex items-center justify-between p-4 bg-white rounded-2xl border transition-all duration-300 ${
      attempt.isStarred ? 'border-amber-200 shadow-md shadow-amber-50' : 'border-pink-50 hover:border-pink-200'
    }`}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`w-2 h-10 rounded-full shrink-0 ${
          attempt.isStarred ? 'bg-amber-400' : 
          attempt.status === 'passed' ? 'bg-green-300' : 'bg-orange-300'
        }`} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
             <span className="text-[9px] font-black text-pink-300 uppercase tracking-widest">{attempt.framework}</span>
             <span className="text-[9px] text-gray-300">•</span>
             <span className="text-[9px] text-gray-400 font-bold truncate">{questionTitle || `Code v.${attempt.id.slice(0, 4)}`}</span>
          </div>

          {isEditing ? (
            <input
              ref={inputRef}
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="w-full bg-pink-50 border-none rounded-lg px-2 py-1 text-sm font-black text-gray-700 outline-none focus:ring-2 ring-pink-300 transition-all shadow-inner"
            />
          ) : (
            <h5 
              onDoubleClick={() => setIsEditing(true)}
              className="text-sm font-black text-gray-700 truncate cursor-text hover:bg-pink-50/50 rounded-lg px-2 -ml-2 py-1 transition-colors"
              title="Double click to rename"
            >
              {attempt.name || (lang === 'zh' ? '未命名版本' : 'Untitled Version')}
            </h5>
          )}
          
          <p className="text-[10px] text-gray-400 font-medium px-2 -ml-2">
            {new Date(attempt.timestamp).toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => onUpdate(attempt.id, { isStarred: !attempt.isStarred })}
          className={`p-2 rounded-xl transition-all hover:scale-110 active:scale-90 ${
            attempt.isStarred ? 'text-amber-400 bg-amber-50' : 'text-gray-300 hover:text-amber-300 hover:bg-amber-50'
          }`}
        >
          <svg className="w-5 h-5" fill={attempt.isStarred ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
        <button 
          onClick={() => { if(confirm(lang === 'zh' ? '确定删除此记录吗？' : 'Delete this attempt?')) onDelete(attempt.id); }}
          className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all hover:scale-110 active:scale-90"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const StatsView: React.FC<StatsViewProps> = ({ stats, lang, onRefresh, onDeleteAttempt }) => {
  const t = translations[lang];
  const questions = storageService.getQuestions();

  const handleUpdateAttempt = (id: string, updates: Partial<Attempt>) => {
    storageService.updateAttempt(id, updates);
    onRefresh();
  };

  const handleDeleteAttempt = (id: string) => {
    onDeleteAttempt(id);
    onRefresh();
  };

  const groupedHistory = stats.history.reduce((acc: any, attempt: Attempt) => {
    const date = new Date(attempt.timestamp);
    const day = date.toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric' 
    });
    if (!acc[day]) acc[day] = [];
    acc[day].push(attempt);
    return acc;
  }, {});

  const days = Object.keys(groupedHistory).reverse();

  return (
    <div className="flex flex-col gap-10">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-pink-100/50 border border-pink-50 text-center group hover:scale-105 transition-all">
          <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 group-hover:rotate-12 transition-transform">🏆</div>
          <p className="text-pink-300 text-[10px] font-black uppercase tracking-widest mb-1">{t.statsSolved}</p>
          <p className="text-4xl font-black text-gray-800">{stats.solvedCount}</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-blue-100/50 border border-blue-50 text-center group hover:scale-105 transition-all">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 group-hover:rotate-12 transition-transform">⚡</div>
          <p className="text-blue-300 text-[10px] font-black uppercase tracking-widest mb-1">{t.statsAttempts}</p>
          <p className="text-4xl font-black text-gray-800">{stats.totalAttempts}</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-purple-100/50 border border-purple-50 text-center group hover:scale-105 transition-all">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 group-hover:rotate-12 transition-transform">🔥</div>
          <p className="text-purple-300 text-[10px] font-black uppercase tracking-widest mb-1">{t.statsStreak}</p>
          <p className="text-4xl font-black text-gray-800">{stats.streak}d</p>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-pink-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
           <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm1 12v-6h-2v8h7v-2h-5z"/></svg>
        </div>

        <h3 className="text-2xl font-black text-gray-800 mb-10 flex items-center gap-4">
          <span className="w-12 h-12 bg-pink-400 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-pink-100">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </span> 
          {t.timeline}
        </h3>
        
        {days.length === 0 ? (
          <div className="text-center py-24">
             <div className="text-6xl mb-6">🏜️</div>
             <p className="text-gray-400 font-black text-lg uppercase tracking-widest">{t.startSolving}</p>
          </div>
        ) : (
          <div className="space-y-12">
            {days.map(day => (
              <div key={day} className="relative pl-10">
                {/* Day Vertical Line */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-pink-100 via-pink-50 to-transparent rounded-full" />
                <div className="absolute -left-[6px] top-0 w-4 h-4 bg-white border-4 border-pink-400 rounded-full shadow-sm" />
                
                <h4 className="text-xs font-black text-pink-300 mb-6 uppercase tracking-[0.2em]">{day}</h4>
                
                <div className="grid grid-cols-1 gap-4">
                  {groupedHistory[day].reverse().map((attempt: Attempt) => (
                    <TimelineItem 
                      key={attempt.id} 
                      attempt={attempt} 
                      lang={lang}
                      onUpdate={handleUpdateAttempt}
                      onDelete={handleDeleteAttempt}
                      questionTitle={questions.find(q => q.id === attempt.questionId)?.title}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsView;
