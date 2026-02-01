
export enum Difficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard'
}

export type Framework = 'react' | 'vue';
export type Language = 'en' | 'zh';

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
}

export interface Attempt {
  id: string;
  questionId: string;
  framework: Framework;
  code: string;
  timestamp: number;
  status: 'passed' | 'working' | 'hinted';
  name?: string; // Added for naming versions
}

export interface UserStats {
  solvedCount: number;
  totalAttempts: number;
  streak: number;
  history: Attempt[];
}
