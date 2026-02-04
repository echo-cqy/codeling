import type { Subscription } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';

export type AuthUser = {
  id: string;
  email: string | null;
};

export type SignUpResult = {
  emailConfirmationRequired: boolean;
};

function requireSupabase() {
  const sb = getSupabaseClient();
  if (!sb) {
    throw new Error('Supabase 未配置：请设置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY');
  }
  return sb;
}

export const authService = {
  async getUser(): Promise<AuthUser | null> {
    const sb = getSupabaseClient();
    if (!sb) return null;

    const { data } = await sb.auth.getUser();
    if (!data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  },

  async signUp(email: string, password: string): Promise<SignUpResult> {
    const sb = requireSupabase();
    const emailRedirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo } });
    if (error) throw error;
    return { emailConfirmationRequired: !data.session };
  },

  async signIn(email: string, password: string) {
    const sb = requireSupabase();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  async resendSignUpConfirmation(email: string) {
    const sb = requireSupabase();
    const emailRedirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo } });
    if (error) throw error;
  },

  async signOut() {
    const sb = getSupabaseClient();
    if (!sb) return;
    await sb.auth.signOut();
  },

  onAuthStateChange(callback: (user: AuthUser | null) => void): { unsubscribe: () => void } | null {
    const sb = getSupabaseClient();
    if (!sb) return null;

    const { data } = sb.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ? { id: session.user.id, email: session.user.email ?? null } : null;
      callback(u);
    });

    const sub: Subscription = data.subscription;
    return { unsubscribe: () => sub.unsubscribe() };
  }
};
