import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

/**
 * 현재 로그인한 원장님 계정 기준으로
 * - customers 테이블
 * - reservations 테이블
 * 데이터를 한 번에 불러오는 훅
 *
 * UI는 전혀 건드리지 않고, 로직에서만 사용 가능하게 만든다.
 */
export function useSupabaseReservations() {
  const { user } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [reservations, setReservations] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 아직 로그인 안 되어 있으면 아무 것도 안 함
    if (!user) {
      setCustomers([]);
      setReservations([]);
      setLoading(false);
      setError(null);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) 고객 목록
        const {
          data: customerRows,
          error: customerError,
        } = await supabase
          .from('customers')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: true });

        if (customerError) {
          throw customerError;
        }

        // 2) 예약 목록
        const {
          data: reservationRows,
          error: reservationError,
        } = await supabase
          .from('reservations')
          .select('*')
          .eq('owner_id', user.id)
          .order('reserved_at', { ascending: true });

        if (reservationError) {
          throw reservationError;
        }

        setCustomers(customerRows ?? []);
        setReservations(reservationRows ?? []);

        // 디버깅용 로그 (나중에 필요 없으면 지워도 됨)
        console.log('[SupabaseHook] customers:', customerRows);
        console.log('[SupabaseHook] reservations:', reservationRows);
      } catch (err) {
        console.error('[SupabaseHook] 로딩 에러:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  return { customers, reservations, loading, error };
}

