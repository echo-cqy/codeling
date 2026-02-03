
export enum Difficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard'
}

export type Framework = 'react' | 'vue';
export type Language = 'en' | 'zh';

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'groq' | 'mistral' | 'moonshot' | 'qianwen' | 'hunyuan';

export interface AIModelConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

export interface QuestionCode {
  initial: string;
  solution: string;
}

export interface Question {
  id: string;
  title: string;
  difficulty: Difficulty;
  description: string;
  category: string;
  tags: string[];
  react: QuestionCode;
  vue: QuestionCode;
  isStarred?: boolean;
  createdAt: number;
  // 新增字段：支持内容修改
  originalDescription?: string;
  originalReact?: QuestionCode;
  originalVue?: QuestionCode;
}

export interface QuestionStats {
  questionId: string;
  completedCount: number;
  hasCompleted: boolean;
  isStarred: boolean;
}

export interface Attempt {
  id: string;
  questionId: string;
  framework: Framework;
  code: string;
  timestamp: number;
  status: 'passed' | 'working' | 'hinted';
  name?: string;
  isStarred?: boolean;
}

export interface UserProfile {
  name: string;
  avatar: string;
  joinedAt: number;
}

export interface UserStats {
  solvedCount: number;
  totalAttempts: number;
  streak: number;
  history: Attempt[];
  profile?: UserProfile;
  aiConfig?: AIModelConfig;
}
