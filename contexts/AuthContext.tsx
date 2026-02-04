import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService, type AuthUser, type SignUpResult } from '../services/authService';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signUp(email: string, password: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<void>;
  resendSignUpConfirmation(email: string): Promise<void>;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authService
      .getUser()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const sub = authService.onAuthStateChange((u) => {
      setUser(u);
    });

    return () => {
      cancelled = true;
      sub?.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    return await authService.signUp(email, password);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await authService.signIn(email, password);
  }, []);

  const resendSignUpConfirmation = useCallback(async (email: string) => {
    await authService.resendSignUpConfirmation(email);
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signUp, signIn, resendSignUpConfirmation, signOut }),
    [user, loading, signUp, signIn, resendSignUpConfirmation, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
