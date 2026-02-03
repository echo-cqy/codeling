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

const STATS_KEY = "codeling_user_stats";
const QUESTIONS_KEY = "codeling_questions";
const LANG_KEY = "codeling_lang";
const DRAFT_PREFIX = "codeling_draft_";

const DEFAULT_STATS: UserStats = {
  solvedCount: 0,
  totalAttempts: 0,
  streak: 0,
  history: [],
  profile: { name: "Sweet Coder", avatar: "🍭", joinedAt: Date.now() },
  aiConfig: { provider: "gemini", model: "gemini-3-flash-preview", apiKey: "" },
};

export const storageService = {
  getLanguage: (): Language => {
    return (localStorage.getItem(LANG_KEY) as Language) || "en";
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
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error("Failed to parse questions", e);
      return MOCK_QUESTIONS;
    }
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
    const updated = questions.filter((q) => q.id !== questionId);
    storageService.saveQuestions(updated);

    // Also clean up history related to this question
    const stats = storageService.getStats();
    stats.history = stats.history.filter((a) => a.questionId !== questionId);
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));

    // Clean up drafts
    storageService.clearDraft(questionId, "react");
    storageService.clearDraft(questionId, "vue");
  },

  saveAttempt: (attempt: Attempt) => {
    const stats = storageService.getStats();
    stats.history.push(attempt);
    stats.totalAttempts += 1;
    const uniqueSolved = new Set(stats.history.map((h) => h.questionId));
    stats.solvedCount = uniqueSolved.size;
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    storageService.saveDraft(
      attempt.questionId,
      attempt.framework,
      attempt.code,
    );
  },

  updateAttempt: (attemptId: string, updates: Partial<Attempt>) => {
    const stats = storageService.getStats();
    stats.history = stats.history.map((a) =>
      a.id === attemptId ? { ...a, ...updates } : a,
    );
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  },

  deleteAttempt: (attemptId: string) => {
    const stats = storageService.getStats();
    stats.history = stats.history.filter((a) => a.id !== attemptId);
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  },

  getStats: (): UserStats => {
    const data = localStorage.getItem(STATS_KEY);
    if (!data) {
      return DEFAULT_STATS;
    }
    try {
      const parsed = JSON.parse(data);
      // Merge with default stats to ensure all fields exist (handling migration from older versions)
      return {
        ...DEFAULT_STATS,
        ...parsed,
        profile: { ...DEFAULT_STATS.profile, ...(parsed.profile || {}) },
        aiConfig: { ...DEFAULT_STATS.aiConfig, ...(parsed.aiConfig || {}) },
      };
    } catch (e) {
      console.error("Failed to parse stats", e);
      return DEFAULT_STATS;
    }
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
      .filter((a) => a.questionId === questionId && a.framework === framework)
      .sort((a, b) => b.timestamp - a.timestamp);
  },

  getLatestCode: (questionId: string, framework: string): string | null => {
    const draft = storageService.getDraft(questionId, framework);
    if (draft) return draft;

    const history = storageService.getHistoryByQuestion(questionId, framework);
    return history.length > 0 ? history[0].code : null;
  },

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
        localStorage.removeItem(key);
      }
    });
    window.location.reload();
  },
};
