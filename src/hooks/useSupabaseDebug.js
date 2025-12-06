import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

/**
 * 로그인한 원장님 계정 기준으로
 * customers / reservations 테이블 내용을 콘솔에 찍어 보는 디버그용 훅
 */
export default function useSupabaseDebug() {
  const { user } = useAuth();

  useEffect(() => {
    // 아직 로그인 안 했으면 아무 것도 안 함
    if (!user) {
      console.log('[SupabaseDebug] user 없음, 스킵');
      return;
    }

    const load = async () => {
      console.log('[SupabaseDebug] 현재 로그인 user.id:', user.id);

      // 1) customers 불러오기
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true });

      if (customersError) {
        console.error('[SupabaseDebug] customers 에러:', customersError);
      } else {
        console.log('[SupabaseDebug] customers 데이터:', customers);
      }

      // 2) reservations 불러오기
      const { data: reservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('*')
        .eq('owner_id', user.id)
        .order('reserved_at', { ascending: true });

      if (reservationsError) {
        console.error('[SupabaseDebug] reservations 에러:', reservationsError);
      } else {
        console.log('[SupabaseDebug] reservations 데이터:', reservations);
      }
    };

    load();
  }, [user]);
}

