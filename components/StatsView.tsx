
import React from 'react';
import { UserStats, Attempt, Language } from '../types';
import { translations } from '../i18n';

interface StatsViewProps {
  stats: UserStats;
  lang: Language;
}

const StatsView: React.FC<StatsViewProps> = ({ stats, lang }) => {
  const t = translations[lang];
  const groupedHistory = stats.history.reduce((acc: any, attempt: Attempt) => {
    const date = new Date(attempt.timestamp);
    const month = date.toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(attempt);
    return acc;
  }, {});

  const months = Object.keys(groupedHistory).reverse();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-pink-100 text-center">
          <p className="text-pink-400 text-xs font-bold uppercase tracking-wider">{t.statsSolved}</p>
          <p className="text-3xl font-bold text-gray-800">{stats.solvedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 text-center">
          <p className="text-blue-400 text-xs font-bold uppercase tracking-wider">{t.statsAttempts}</p>
          <p className="text-3xl font-bold text-gray-800">{stats.totalAttempts}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-100 text-center">
          <p className="text-purple-400 text-xs font-bold uppercase tracking-wider">{t.statsStreak}</p>
          <p className="text-3xl font-bold text-gray-800">{stats.streak}d</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-pink-100">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span className="text-pink-400">📅</span> {t.timeline}
        </h3>
        
        {months.length === 0 ? (
          <p className="text-center text-gray-400 py-10 italic">{t.startSolving}</p>
        ) : (
          <div className="space-y-8">
            {months.map(month => (
              <div key={month} className="relative pl-6 border-l-2 border-pink-100">
                <div className="absolute -left-[9px] top-0 w-4 h-4 bg-pink-200 rounded-full border-4 border-white shadow-sm" />
                <h4 className="text-sm font-bold text-gray-500 mb-4">{month}</h4>
                <div className="space-y-3">
                  {groupedHistory[month].reverse().map((attempt: Attempt) => (
                    <div key={attempt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-pink-50 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700">Question #{attempt.questionId}</span>
                        <span className="text-[10px] text-gray-400">{new Date(attempt.timestamp).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US')}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        attempt.status === 'passed' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                      }`}>
                        {attempt.status}
                      </span>
                    </div>
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
