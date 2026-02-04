import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error(
      "Supabase 配置缺失！\n" +
        "1. 本地开发：请检查 .env 文件中是否有 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。\n" +
        "2. Netlify 部署：请确保在 Netlify 的 Supabase 扩展设置中选择了 'Vite' 框架，或手动在 Site Settings -> Environment variables 中添加这两个变量。",
    );
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
