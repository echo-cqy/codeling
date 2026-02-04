import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AuthModal({
  lang,
  onClose
}: {
  lang: 'en' | 'zh';
  onClose: () => void;
}) {
  const { signIn, signUp, resendSignUpConfirmation } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const title = useMemo(() => {
    if (lang === 'zh') return mode === 'login' ? '登录' : '注册';
    return mode === 'login' ? 'Sign In' : 'Sign Up';
  }, [lang, mode]);

  const switchText = useMemo(() => {
    if (lang === 'zh') return mode === 'login' ? '没有账号？去注册' : '已有账号？去登录';
    return mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in';
  }, [lang, mode]);

  const submitText = useMemo(() => {
    if (lang === 'zh') return mode === 'login' ? '登录' : '创建账号';
    return mode === 'login' ? 'Sign In' : 'Create Account';
  }, [lang, mode]);

  const emailLabel = lang === 'zh' ? '邮箱' : 'Email';
  const passwordLabel = lang === 'zh' ? '密码' : 'Password';
  const passwordHint =
    lang === 'zh' ? '至少 6 位，建议字母 + 数字组合' : 'At least 6 characters, ideally letters + numbers';

  const normalizedEmail = email.trim();
  const showResend =
    mode === 'login' &&
    normalizedEmail.length > 0 &&
    !!error &&
    /not confirmed|confirm/i.test(error);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signIn(normalizedEmail, password);
        onClose();
      } else {
        const result = await signUp(normalizedEmail, password);
        if (result.emailConfirmationRequired) {
          setPassword('');
          setMode('login');
          setNotice(
            lang === 'zh'
              ? `已发送验证邮件到 ${normalizedEmail}，请完成验证后再登录。`
              : `We sent a verification email to ${normalizedEmail}. Please confirm it, then sign in.`,
          );
          return;
        }
        onClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/not confirmed|confirm/i.test(msg)) {
        setError(
          lang === 'zh'
            ? '邮箱未验证：请先去邮箱点击验证链接，再回来登录。'
            : 'Email not confirmed: please click the verification link in your inbox, then sign in.',
        );
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchMode = () => {
    setError(null);
    setNotice(null);
    setPassword('');
    setMode((m) => (m === 'login' ? 'register' : 'login'));
  };

  const handleResend = async () => {
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await resendSignUpConfirmation(normalizedEmail);
      setNotice(
        lang === 'zh'
          ? `已重新发送验证邮件到 ${normalizedEmail}。`
          : `Verification email resent to ${normalizedEmail}.`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-pink-900/10 backdrop-blur-md z-[250] flex items-center justify-center p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[3rem] p-10 shadow-2xl border border-pink-100 max-w-md w-full relative animate-sweet-pop overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-8 right-10 text-gray-300 hover:text-pink-400 transition-colors bg-gray-50 p-2 rounded-xl"
        >
          ✕
        </button>

        <h2 className="text-2xl font-black text-gray-800 mb-2 tracking-tighter">{title}</h2>
        <p className="text-xs text-gray-400 mb-8">
          {lang === 'zh' ? '用于同步你的题库与做题记录' : 'Sync your challenges and progress across devices'}
        </p>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 block uppercase tracking-widest ml-1">
              {emailLabel}
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-pink-50/20 border border-pink-50 rounded-2xl px-5 py-4 text-sm outline-none shadow-inner focus:border-pink-200"
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 block uppercase tracking-widest ml-1">
              {passwordLabel}
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-pink-50/20 border border-pink-50 rounded-2xl px-5 py-4 text-sm outline-none shadow-inner focus:border-pink-200"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
            />
            <div className="text-[10px] text-gray-400 px-1">{passwordHint}</div>
          </div>

          {notice ? (
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-[11px] text-blue-500">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-[11px] text-red-500">{error}</div>
          ) : null}

          {showResend ? (
            <button
              type="button"
              onClick={handleResend}
              disabled={submitting}
              className={`w-full text-[10px] font-black uppercase tracking-widest transition ${
                submitting ? 'text-gray-300' : 'text-blue-400 hover:text-blue-500'
              }`}
            >
              {lang === 'zh' ? '重新发送验证邮件' : 'Resend verification email'}
            </button>
          ) : null}

          <button
            disabled={submitting}
            type="submit"
            className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              submitting
                ? 'bg-gray-100 text-gray-400'
                : 'bg-pink-400 text-white hover:bg-pink-500 shadow-sm'
            }`}
          >
            {submitting ? (lang === 'zh' ? '处理中...' : 'Working...') : submitText}
          </button>

          <button
            type="button"
            onClick={handleSwitchMode}
            className="w-full text-[10px] font-black uppercase tracking-widest text-pink-400 hover:text-pink-500 transition"
          >
            {switchText}
          </button>
        </form>
      </div>
    </div>
  );
}
