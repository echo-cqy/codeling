
import { Attempt, UserStats, Question, Language, Framework } from '../types';
import { MOCK_QUESTIONS } from '../constants';

const STATS_KEY = 'codeling_user_stats';
const QUESTIONS_KEY = 'codeling_questions';
const LANG_KEY = 'codeling_lang';

export const storageService = {
  getLanguage: (): Language => {
    return (localStorage.getItem(LANG_KEY) as Language) || 'en';
  },

  setLanguage: (lang: Language) => {
    localStorage.setItem(LANG_KEY, lang);
  },

  getQuestions: (): Question[] => {
    const data = localStorage.getItem(QUESTIONS_KEY);
    if (!data) {
      localStorage.setItem(QUESTIONS_KEY, JSON.stringify(MOCK_QUESTIONS));
      return MOCK_QUESTIONS;
    }
    return JSON.parse(data);
  },

  saveQuestions: (questions: Question[]) => {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
  },

  addQuestion: (q: Question) => {
    const questions = storageService.getQuestions();
    storageService.saveQuestions([q, ...questions]);
  },

  updateQuestion: (id: string, updates: Partial<Question>) => {
    const questions = storageService.getQuestions();
    const updated = questions.map(q => q.id === id ? { ...q, ...updates } : q);
    storageService.saveQuestions(updated);
    return updated;
  },

  deleteQuestion: (id: string) => {
    const questions = storageService.getQuestions();
    storageService.saveQuestions(questions.filter(q => q.id !== id));
  },

  toggleStar: (id: string) => {
    const questions = storageService.getQuestions();
    const updated = questions.map(q => q.id === id ? { ...q, isStarred: !q.isStarred } : q);
    storageService.saveQuestions(updated);
    return updated;
  },

  saveAttempt: (attempt: Attempt) => {
    const stats = storageService.getStats();
    stats.history.push(attempt);
    stats.totalAttempts += 1;
    const uniqueSolved = new Set(stats.history.map(h => h.questionId));
    stats.solvedCount = uniqueSolved.size;
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  },

  getStats: (): UserStats => {
    const data = localStorage.getItem(STATS_KEY);
    if (!data) {
      return { solvedCount: 0, totalAttempts: 0, streak: 0, history: [] };
    }
    return JSON.parse(data);
  },

  getHistoryByQuestion: (questionId: string, framework: string): Attempt[] => {
    const stats = storageService.getStats();
    return stats.history
      .filter(a => a.questionId === questionId && a.framework === framework)
      .sort((a, b) => b.timestamp - a.timestamp);
  },

  getLatestCode: (questionId: string, framework: string): string | null => {
    const history = storageService.getHistoryByQuestion(questionId, framework);
    return history.length > 0 ? history[0].code : null;
  }
};
