import { getSupabaseClient } from './supabaseClient';
import type { AIModelConfig, Attempt, Question, UserProfile } from '../types';

export type RemoteSnapshot = {
  profile: UserProfile | null;
  aiConfig: AIModelConfig | null;
  questions: Question[];
  attempts: Attempt[];
  drafts: Array<{ questionId: string; framework: 'react' | 'vue'; code: string; updatedAt: number }>;
};

export class RemoteStorageService {
  constructor(private readonly userId: string) {}

  private sb() {
    const sb = getSupabaseClient();
    if (!sb) throw new Error('Supabase 未配置：请设置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY');
    return sb;
  }

  async fetchAll(): Promise<RemoteSnapshot> {
    const sb = this.sb();

    const [profileRes, aiRes, questionsRes, attemptsRes, draftsRes] = await Promise.all([
      sb.from('codeling_profiles').select('*').eq('user_id', this.userId).maybeSingle(),
      sb.from('codeling_ai_config').select('*').eq('user_id', this.userId).maybeSingle(),
      sb.from('codeling_questions').select('*').eq('user_id', this.userId),
      sb.from('codeling_attempts').select('*').eq('user_id', this.userId),
      sb.from('codeling_drafts').select('*').eq('user_id', this.userId)
    ]);

    if (profileRes.error) throw profileRes.error;
    if (aiRes.error) throw aiRes.error;
    if (questionsRes.error) throw questionsRes.error;
    if (attemptsRes.error) throw attemptsRes.error;
    if (draftsRes.error) throw draftsRes.error;

    const profile = profileRes.data
      ? {
          name: profileRes.data.name ?? 'Sweet Coder',
          avatar: profileRes.data.avatar ?? '🍭',
          joinedAt: Number(profileRes.data.joined_at ?? Date.now())
        }
      : null;

    const aiConfig = aiRes.data
      ? {
          provider: aiRes.data.provider,
          model: aiRes.data.model,
          apiKey: aiRes.data.api_key ?? '',
          baseUrl: aiRes.data.base_url ?? undefined
        }
      : null;

    const questions: Question[] = (questionsRes.data || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      difficulty: r.difficulty,
      description: r.description,
      category: r.category,
      tags: Array.isArray(r.tags) ? r.tags : r.tags ? JSON.parse(r.tags) : [],
      react: r.react,
      vue: r.vue,
      isStarred: r.is_starred ?? undefined,
      createdAt: Number(r.created_at ?? Date.now())
    }));

    const attempts: Attempt[] = (attemptsRes.data || []).map((r: any) => ({
      id: r.id,
      questionId: r.question_id,
      framework: r.framework,
      code: r.code,
      timestamp: Number(r.timestamp ?? Date.now()),
      status: r.status,
      name: r.name ?? undefined,
      isStarred: r.is_starred ?? undefined
    }));

    const drafts: RemoteSnapshot['drafts'] = (draftsRes.data || []).map((r: any) => ({
      questionId: r.question_id,
      framework: r.framework,
      code: r.code,
      updatedAt: Number(r.updated_at ?? Date.now())
    }));

    return { profile, aiConfig, questions, attempts, drafts };
  }

  async upsertProfile(profile: UserProfile) {
    const sb = this.sb();
    const { error } = await sb.from('codeling_profiles').upsert(
      {
        user_id: this.userId,
        name: profile.name,
        avatar: profile.avatar,
        joined_at: profile.joinedAt
      },
      { onConflict: 'user_id' },
    );
    if (error) throw error;
  }

  async upsertAIConfig(config: AIModelConfig) {
    const sb = this.sb();
    const { error } = await sb.from('codeling_ai_config').upsert(
      {
        user_id: this.userId,
        provider: config.provider,
        model: config.model,
        api_key: config.apiKey,
        base_url: config.baseUrl ?? null
      },
      { onConflict: 'user_id' },
    );
    if (error) throw error;
  }

  async upsertDraft(questionId: string, framework: 'react' | 'vue', code: string, updatedAt: number) {
    const sb = this.sb();
    const { error } = await sb.from('codeling_drafts').upsert(
      {
        user_id: this.userId,
        question_id: questionId,
        framework,
        code,
        updated_at: updatedAt
      },
      { onConflict: 'user_id,question_id,framework' },
    );
    if (error) throw error;
  }

  async deleteDraft(questionId: string, framework: 'react' | 'vue') {
    const sb = this.sb();
    const { error } = await sb
      .from('codeling_drafts')
      .delete()
      .eq('user_id', this.userId)
      .eq('question_id', questionId)
      .eq('framework', framework);
    if (error) throw error;
  }

  async upsertQuestions(questions: Question[]) {
    const sb = this.sb();
    const payload = questions.map((q) => ({
      id: q.id,
      user_id: this.userId,
      title: q.title,
      difficulty: q.difficulty,
      description: q.description,
      category: q.category,
      tags: q.tags,
      react: q.react,
      vue: q.vue,
      is_starred: q.isStarred ?? null,
      created_at: q.createdAt
    }));
    const { error } = await sb.from('codeling_questions').upsert(payload, { onConflict: 'user_id,id' });
    if (error) throw error;
  }

  async deleteQuestion(questionId: string) {
    const sb = this.sb();
    const [{ error: qErr }, { error: aErr }, { error: dErr }] = await Promise.all([
      sb.from('codeling_questions').delete().eq('user_id', this.userId).eq('id', questionId),
      sb.from('codeling_attempts').delete().eq('user_id', this.userId).eq('question_id', questionId),
      sb.from('codeling_drafts').delete().eq('user_id', this.userId).eq('question_id', questionId)
    ]);
    if (qErr) throw qErr;
    if (aErr) throw aErr;
    if (dErr) throw dErr;
  }

  async upsertAttempt(attempt: Attempt) {
    const sb = this.sb();
    const { error } = await sb.from('codeling_attempts').upsert(
      {
        id: attempt.id,
        user_id: this.userId,
        question_id: attempt.questionId,
        framework: attempt.framework,
        code: attempt.code,
        timestamp: attempt.timestamp,
        status: attempt.status,
        name: attempt.name ?? null,
        is_starred: attempt.isStarred ?? null
      },
      { onConflict: 'user_id,id' },
    );
    if (error) throw error;
  }

  async updateAttempt(attemptId: string, updates: Partial<Attempt>) {
    const sb = this.sb();
    const payload: Record<string, any> = {};
    if (updates.code !== undefined) payload.code = updates.code;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.isStarred !== undefined) payload.is_starred = updates.isStarred;
    if (updates.timestamp !== undefined) payload.timestamp = updates.timestamp;
    if (Object.keys(payload).length === 0) return;

    const { error } = await sb
      .from('codeling_attempts')
      .update(payload)
      .eq('user_id', this.userId)
      .eq('id', attemptId);
    if (error) throw error;
  }

  async deleteAttempt(attemptId: string) {
    const sb = this.sb();
    const { error } = await sb.from('codeling_attempts').delete().eq('user_id', this.userId).eq('id', attemptId);
    if (error) throw error;
  }
}
