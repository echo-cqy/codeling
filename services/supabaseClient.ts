import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error("Supabase 配置错误:", { url: !!url, key: !!anonKey });

    // 如果发现了数据库连接串但没有 API URL，给出明确指引
    if (!url && (import.meta.env as any).VITE_SUPABASE_DATABASE_URL) {
      console.warn(
        "提示：Netlify 提供了 VITE_SUPABASE_DATABASE_URL，但前端需要 VITE_SUPABASE_URL (API 地址)。请手动在 Netlify 后台添加该变量。",
      );
    }

    cached = null;
    return cached;
  }

  cached = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return cached;
}
