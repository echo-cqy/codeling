
import { Attempt, UserStats, Question, Language, Framework, UserProfile, AIModelConfig } from '../types';
import { MOCK_QUESTIONS } from '../constants';

const STATS_KEY = 'codeling_user_stats';
const QUESTIONS_KEY = 'codeling_questions';
const LANG_KEY = 'codeling_lang';
const DRAFT_PREFIX = 'codeling_draft_';

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

  deleteQuestion: (questionId: string) => {
    const questions = storageService.getQuestions();
    const updated = questions.filter(q => q.id !== questionId);
    storageService.saveQuestions(updated);
    
    // Also clean up history related to this question
    const stats = storageService.getStats();
    stats.history = stats.history.filter(a => a.questionId !== questionId);
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));

    // Clean up drafts
    storageService.clearDraft(questionId, 'react');
    storageService.clearDraft(questionId, 'vue');
  },

  saveAttempt: (attempt: Attempt) => {
    const stats = storageService.getStats();
    stats.history.push(attempt);
    stats.totalAttempts += 1;
    const uniqueSolved = new Set(stats.history.map(h => h.questionId));
    stats.solvedCount = uniqueSolved.size;
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    storageService.saveDraft(attempt.questionId, attempt.framework, attempt.code);
  },

  updateAttempt: (attemptId: string, updates: Partial<Attempt>) => {
    const stats = storageService.getStats();
    stats.history = stats.history.map(a => a.id === attemptId ? { ...a, ...updates } : a);
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  },

  deleteAttempt: (attemptId: string) => {
    const stats = storageService.getStats();
    stats.history = stats.history.filter(a => a.id !== attemptId);
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  },

  getStats: (): UserStats => {
    const data = localStorage.getItem(STATS_KEY);
    if (!data) {
      return { 
        solvedCount: 0, 
        totalAttempts: 0, 
        streak: 0, 
        history: [],
        profile: { name: 'Sweet Coder', avatar: '🍭', joinedAt: Date.now() },
        aiConfig: { provider: 'gemini', model: 'gemini-3-flash-preview', apiKey: '' }
      };
    }
    return JSON.parse(data);
  },

  saveProfile: (profile: UserProfile) => {
    const stats = storageService.getStats();
    stats.profile = profile;
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  },

  saveAIConfig: (config: AIModelConfig) => {
    const stats = storageService.getStats();
    stats.aiConfig = config;
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  },

  saveDraft: (questionId: string, framework: string, code: string) => {
    localStorage.setItem(`${DRAFT_PREFIX}${questionId}_${framework}`, code);
  },

  getDraft: (questionId: string, framework: string): string | null => {
    return localStorage.getItem(`${DRAFT_PREFIX}${questionId}_${framework}`);
  },

  clearDraft: (questionId: string, framework: string) => {
    localStorage.removeItem(`${DRAFT_PREFIX}${questionId}_${framework}`);
  },

  getHistoryByQuestion: (questionId: string, framework: string): Attempt[] => {
    const stats = storageService.getStats();
    return stats.history
      .filter(a => a.questionId === questionId && a.framework === framework)
      .sort((a, b) => b.timestamp - a.timestamp);
  },

  getLatestCode: (questionId: string, framework: string): string | null => {
    const draft = storageService.getDraft(questionId, framework);
    if (draft) return draft;
    
    const history = storageService.getHistoryByQuestion(questionId, framework);
    return history.length > 0 ? history[0].code : null;
  },

  clearAllData: () => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('codeling_')) {
        localStorage.removeItem(key);
      }
    });
    window.location.reload();
  }
};
