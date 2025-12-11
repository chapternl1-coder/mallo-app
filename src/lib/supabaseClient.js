import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] 환경변수(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)가 설정되지 않았습니다.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 디버깅을 위해 window 객체에도 노출
if (typeof window !== 'undefined') {
  window.supabase = supabase;
  console.log('[Supabase] 클라이언트 초기화 완료');
}

