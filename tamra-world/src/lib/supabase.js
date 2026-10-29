import { createClient } from "@supabase/supabase-js";

const env = import.meta.env;

// URL 형식이 잘못되면 createClient 가 예외를 던져 화면 전체가 비므로 잡아서 null 로 둔다
function init() {
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) return null;
  try {
    return createClient(env.VITE_SUPABASE_URL.trim(), env.VITE_SUPABASE_ANON_KEY.trim());
  } catch (e) {
    console.error("Supabase 초기화 실패 (VITE_SUPABASE_URL 형식을 확인하세요, 예: https://xxxx.supabase.co):", e);
    return null;
  }
}

export const supa = init();
