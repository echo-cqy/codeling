import {
  Attempt,
  UserStats,
  Question,
  Language,
  Framework,
  UserProfile,
  AIModelConfig,
  QuestionStats,
} from "../types";
import { MOCK_QUESTIONS } from "../constants";

import { Attempt, UserStats, Question, Language, Framework, UserProfile, AIModelConfig } from '../types';
import { MOCK_QUESTIONS } from '../constants';
import { RemoteStorageService, type RemoteSnapshot } from './remoteStorageService';

const STATS_KEY = 'codeling_user_stats';
const QUESTIONS_KEY = 'codeling_questions';
const LANG_KEY = 'codeling_lang';
const DRAFT_PREFIX = 'codeling_draft_';

const DEFAULT_STATS: UserStats = {
  solvedCount: 0,
  totalAttempts: 0,
  streak: 0,
  history: [],
  profile: { name: "Sweet Coder", avatar: "🍭", joinedAt: Date.now() },
  aiConfig: { provider: "gemini", model: "gemini-3-flash-preview", apiKey: "" },
};

export interface IStorageService {
  getLanguage(): Language;
  setLanguage(lang: Language): void;
  getQuestions(): Question[];
  saveQuestions(questions: Question[]): void;
  addQuestion(q: Question): void;
  deleteQuestion(questionId: string): void;
  saveAttempt(attempt: Attempt): void;
  updateAttempt(attemptId: string, updates: Partial<Attempt>): void;
  deleteAttempt(attemptId: string): void;
  getStats(): UserStats;
  saveProfile(profile: UserProfile): void;
  saveAIConfig(config: AIModelConfig): void;
  saveDraft(questionId: string, framework: Framework, code: string): void;
  getDraft(questionId: string, framework: Framework): string | null;
  clearDraft(questionId: string, framework: Framework): void;
  getHistoryByQuestion(questionId: string, framework: Framework): Attempt[];
  getLatestCode(questionId: string, framework: Framework): string | null;
  clearAllData(): void;
  setRemoteUserId(userId: string | null): void;
  pullRemote(): Promise<{ hasAnyRemoteData: boolean; questionsCount: number; attemptsCount: number }>;
  exportLocalData(): {
    language: Language;
    questions: Question[];
    stats: UserStats;
    drafts: Array<{ questionId: string; framework: Framework; code: string }>;
  };
  pushLocalDataToRemote(data: {
    language: Language;
    questions: Question[];
    stats: UserStats;
    drafts: Array<{ questionId: string; framework: Framework; code: string }>;
  }): Promise<void>;
}

export class LocalStorageService implements IStorageService {
  getLanguage(): Language {
    return (localStorage.getItem(LANG_KEY) as Language) || 'en';
  }

  setLanguage(lang: Language) {
    localStorage.setItem(LANG_KEY, lang);
  }

  getQuestions(): Question[] {
    const data = localStorage.getItem(QUESTIONS_KEY);
    if (!data) {
      localStorage.setItem(QUESTIONS_KEY, JSON.stringify(MOCK_QUESTIONS));
      return MOCK_QUESTIONS;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse questions', e);
      return MOCK_QUESTIONS;
    }
  }

  saveQuestions(questions: Question[]) {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
  }

  addQuestion(q: Question) {
    const questions = this.getQuestions();
    this.saveQuestions([q, ...questions]);
  }

  deleteQuestion(questionId: string) {
    const questions = this.getQuestions();
    const updated = questions.filter((q) => q.id !== questionId);
    this.saveQuestions(updated);

    const stats = this.getStats();
    stats.history = stats.history.filter((a) => a.questionId !== questionId);
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));

    this.clearDraft(questionId, 'react');
    this.clearDraft(questionId, 'vue');
  }

  saveAttempt(attempt: Attempt) {
    const stats = this.getStats();
    stats.history.push(attempt);
    stats.totalAttempts += 1;
    const uniqueSolved = new Set(stats.history.map((h) => h.questionId));
    stats.solvedCount = uniqueSolved.size;
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    this.saveDraft(attempt.questionId, attempt.framework, attempt.code);
  }

  updateAttempt(attemptId: string, updates: Partial<Attempt>) {
    const stats = this.getStats();
    stats.history = stats.history.map((a) => (a.id === attemptId ? { ...a, ...updates } : a));
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }

  deleteAttempt(attemptId: string) {
    const stats = this.getStats();
    stats.history = stats.history.filter((a) => a.id !== attemptId);
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }

  getStats(): UserStats {
    const data = localStorage.getItem(STATS_KEY);
    if (!data) return DEFAULT_STATS;

    try {
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_STATS,
        ...parsed,
        profile: { ...DEFAULT_STATS.profile, ...(parsed.profile || {}) },
        aiConfig: { ...DEFAULT_STATS.aiConfig, ...(parsed.aiConfig || {}) },
      };
    } catch (e) {
      console.error('Failed to parse stats', e);
      return DEFAULT_STATS;
    }
  }

  saveProfile(profile: UserProfile) {
    const stats = this.getStats();
    stats.profile = profile;
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }

  saveAIConfig(config: AIModelConfig) {
    const stats = this.getStats();
    stats.aiConfig = config;
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }

  saveDraft(questionId: string, framework: Framework, code: string) {
    localStorage.setItem(`${DRAFT_PREFIX}${questionId}_${framework}`, code);
  }

  getDraft(questionId: string, framework: Framework): string | null {
    return localStorage.getItem(`${DRAFT_PREFIX}${questionId}_${framework}`);
  }

  clearDraft(questionId: string, framework: Framework) {
    localStorage.removeItem(`${DRAFT_PREFIX}${questionId}_${framework}`);
  }

  getHistoryByQuestion(questionId: string, framework: Framework): Attempt[] {
    const stats = this.getStats();
    return stats.history
      .filter((a) => a.questionId === questionId && a.framework === framework)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getLatestCode(questionId: string, framework: Framework): string | null {
    const draft = this.getDraft(questionId, framework);
    if (draft) return draft;

    const history = this.getHistoryByQuestion(questionId, framework);
    return history.length > 0 ? history[0].code : null;
  }

  getQuestionStats: (questionId: string): QuestionStats => {
    const stats = storageService.getStats();
    const attempts = stats.history.filter((a) => a.questionId === questionId);
    const completedCount = attempts.length;
    const hasCompleted = completedCount > 0;
    const isStarred = attempts.some((a) => a.isStarred);

    return {
      questionId,
      completedCount,
      hasCompleted,
      isStarred,
    };
  },

  getQuestionStatsAll: (): QuestionStats[] => {
    const stats = storageService.getStats();
    const questionIds = [...new Set(stats.history.map((a) => a.questionId))];

    return questionIds.map((questionId) => {
      const attempts = stats.history.filter((a) => a.questionId === questionId);
      return {
        questionId,
        completedCount: attempts.length,
        hasCompleted: attempts.length > 0,
        isStarred: attempts.some((a) => a.isStarred),
      };
    });
  },

  clearQuestionListStats: (questionIds: string[]) => {
    const stats = storageService.getStats();
    // 过滤掉选定题目的尝试记录，从而清除统计状态
    stats.history = stats.history.filter(
      (a) => !questionIds.includes(a.questionId),
    );

    // 重新计算已解决题目数量
    const uniqueSolved = new Set(stats.history.map((h) => h.questionId));
    stats.solvedCount = uniqueSolved.size;

    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  },

  resetQuestionListStats: (questionIds: string[]) => {
    // 这里如果不再需要隐藏逻辑，可以简单调用清除统计
    storageService.clearQuestionListStats(questionIds);
  },

  getDisplayPreferences: (): { hiddenQuestions: Set<string> } => {
    const data = localStorage.getItem("codeling_display_prefs");
    if (!data) {
      return { hiddenQuestions: new Set() };
    }
    try {
      const parsed = JSON.parse(data);
      return {
        hiddenQuestions: new Set(parsed.hiddenQuestions || []),
      };
    } catch (e) {
      return { hiddenQuestions: new Set() };
    }
  },

  saveDisplayPreferences: (prefs: { hiddenQuestions: Set<string> }) => {
    localStorage.setItem(
      "codeling_display_prefs",
      JSON.stringify({
        hiddenQuestions: Array.from(prefs.hiddenQuestions),
      }),
    );
  },

  updateQuestionContent: (
    questionId: string,
    updates: Partial<Pick<Question, "description" | "react" | "vue">>,
  ) => {
    const questions = storageService.getQuestions();
    const updatedQuestions = questions.map((q) => {
      if (q.id === questionId) {
        const updatedQuestion = { ...q, ...updates };

        if (!q.originalDescription) {
          updatedQuestion.originalDescription = q.description;
        }
        if (!q.originalReact) {
          updatedQuestion.originalReact = { ...q.react };
        }
        if (!q.originalVue) {
          updatedQuestion.originalVue = { ...q.vue };
        }

        return updatedQuestion;
      }
      return q;
    });

    storageService.saveQuestions(updatedQuestions);
    return updatedQuestions.find((q) => q.id === questionId);
  },

  clearAllData: () => {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith("codeling_")) {
  clearAllData() {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith('codeling_')) {
        localStorage.removeItem(key);
      }
    });
    window.location.reload();
  }

  setRemoteUserId(_userId: string | null) {}

  async pullRemote() {
    return { hasAnyRemoteData: false, questionsCount: 0, attemptsCount: 0 };
  }

  exportLocalData() {
    const drafts: Array<{ questionId: string; framework: Framework; code: string }> = [];
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(DRAFT_PREFIX)) continue;
      const rest = key.slice(DRAFT_PREFIX.length);
      const idx = rest.lastIndexOf('_');
      if (idx <= 0) continue;
      const questionId = rest.slice(0, idx);
      const framework = rest.slice(idx + 1) as Framework;
      if (framework !== 'react' && framework !== 'vue') continue;
      const code = localStorage.getItem(key);
      if (code == null) continue;
      drafts.push({ questionId, framework, code });
    }
    return { language: this.getLanguage(), questions: this.getQuestions(), stats: this.getStats(), drafts };
  }

  async pushLocalDataToRemote(_data: {
    language: Language;
    questions: Question[];
    stats: UserStats;
    drafts: Array<{ questionId: string; framework: Framework; code: string }>;
  }) {}
}

class HybridStorageService extends LocalStorageService {
  private remote: RemoteStorageService | null = null;
  private remoteUserId: string | null = null;

  setRemoteUserId(userId: string | null) {
    this.remoteUserId = userId;
    this.remote = userId ? new RemoteStorageService(userId) : null;
  }

  async pullRemote(): Promise<{ hasAnyRemoteData: boolean; questionsCount: number; attemptsCount: number }> {
    if (!this.remote) return { hasAnyRemoteData: false, questionsCount: 0, attemptsCount: 0 };

    const snapshot: RemoteSnapshot = await this.remote.fetchAll();

    const hasAnyRemoteData =
      !!snapshot.profile ||
      !!snapshot.aiConfig ||
      snapshot.questions.length > 0 ||
      snapshot.attempts.length > 0 ||
      snapshot.drafts.length > 0;

    if (snapshot.profile || snapshot.aiConfig || snapshot.attempts.length > 0) {
      const current = super.getStats();
      const history = snapshot.attempts.slice().sort((a, b) => a.timestamp - b.timestamp);
      const uniqueSolved = new Set(history.map((h) => h.questionId));

      const merged: UserStats = {
        ...DEFAULT_STATS,
        ...current,
        history,
        totalAttempts: history.length,
        solvedCount: uniqueSolved.size,
        profile: snapshot.profile ? snapshot.profile : current.profile,
        aiConfig: snapshot.aiConfig ? snapshot.aiConfig : current.aiConfig
      };
      localStorage.setItem(STATS_KEY, JSON.stringify(merged));
    }

    if (snapshot.questions.length > 0) {
      super.saveQuestions(snapshot.questions);
    }

    if (snapshot.drafts.length > 0) {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(DRAFT_PREFIX)) localStorage.removeItem(key);
      }
      for (const d of snapshot.drafts) {
        localStorage.setItem(`${DRAFT_PREFIX}${d.questionId}_${d.framework}`, d.code);
      }
    }

    return {
      hasAnyRemoteData,
      questionsCount: snapshot.questions.length,
      attemptsCount: snapshot.attempts.length
    };
  }

  async pushLocalDataToRemote(data: {
    language: Language;
    questions: Question[];
    stats: UserStats;
    drafts: Array<{ questionId: string; framework: Framework; code: string }>;
  }) {
    if (!this.remote || !this.remoteUserId) return;

    if (data.stats.profile) {
      await this.remote.upsertProfile(data.stats.profile);
    }
    if (data.stats.aiConfig) {
      await this.remote.upsertAIConfig(data.stats.aiConfig);
    }

    if (data.questions.length > 0) {
      await this.remote.upsertQuestions(data.questions);
    }

    if (data.stats.history.length > 0) {
      await Promise.all(data.stats.history.map((a) => this.remote!.upsertAttempt(a)));
    }

    if (data.drafts.length > 0) {
      const now = Date.now();
      await Promise.all(
        data.drafts.map((d) => this.remote!.upsertDraft(d.questionId, d.framework, d.code, now)),
      );
    }
  }

  override addQuestion(q: Question) {
    super.addQuestion(q);
    this.remote?.upsertQuestions([q]).catch(() => {});
  }

  override deleteQuestion(questionId: string) {
    super.deleteQuestion(questionId);
    this.remote?.deleteQuestion(questionId).catch(() => {});
  }

  override saveAttempt(attempt: Attempt) {
    super.saveAttempt(attempt);
    this.remote?.upsertAttempt(attempt).catch(() => {});
  }

  override updateAttempt(attemptId: string, updates: Partial<Attempt>) {
    super.updateAttempt(attemptId, updates);
    this.remote?.updateAttempt(attemptId, updates).catch(() => {});
  }

  override deleteAttempt(attemptId: string) {
    super.deleteAttempt(attemptId);
    this.remote?.deleteAttempt(attemptId).catch(() => {});
  }

  override saveProfile(profile: UserProfile) {
    super.saveProfile(profile);
    this.remote?.upsertProfile(profile).catch(() => {});
  }

  override saveAIConfig(config: AIModelConfig) {
    super.saveAIConfig(config);
    this.remote?.upsertAIConfig(config).catch(() => {});
  }

  override saveDraft(questionId: string, framework: Framework, code: string) {
    super.saveDraft(questionId, framework, code);
    this.remote?.upsertDraft(questionId, framework, code, Date.now()).catch(() => {});
  }

  override clearDraft(questionId: string, framework: Framework) {
    super.clearDraft(questionId, framework);
    this.remote?.deleteDraft(questionId, framework).catch(() => {});
  }
}

export const storageService: IStorageService = new HybridStorageService();
