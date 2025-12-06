import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

function formatLocalDate(dateString) {
  if (!dateString) return '';

  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '';

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${y}-${m}-${day}`; // 예: 2025-12-06
}

function formatLocalTime(dateString) {
  if (!dateString) return '';

  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '';

  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  return `${h}:${min}`; // 예: 01:02
}

/**
 * Supabase customers / reservations 읽어오는 훅
 *
 * 반환 형태:
 *  - customers: [{ id, name, phone, createdAt }]
 *  - reservations: [{
 *      id,
 *      customerId,
 *      date,        // 'YYYY-MM-DD' (로컬 기준)
 *      time,        // 'HH:MM'      (로컬 기준)
 *      name,
 *      phone,
 *      memo,
 *      status,
 *    }]
 *
 * 화면 JSX는 이 구조 그대로 쓰고 있으니, UI 수정 필요 없음.
 */
export default function useSupabaseReservations() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      console.log('[SupabaseHook] user 없음, 스킵');
      setCustomers([]);
      setReservations([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        console.log('[SupabaseHook] 로드 시작, user.id:', user.id);

        // 1) 고객 목록
        const {
          data: customerRows,
          error: customerError,
        } = await supabase
          .from('customers')
          .select('id, name, phone, created_at')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: true });

        if (customerError) {
          console.error('[SupabaseHook] customers 에러:', customerError);
          setCustomers([]);
        } else {
          const mappedCustomers =
            (customerRows ?? []).map((row) => ({
              id: row.id,
              name: row.name || '',
              phone: row.phone || '',
              createdAt: row.created_at,
            })) ?? [];

          setCustomers(mappedCustomers);
        }

        // 고객 id → 객체 맵 (예약에서 빠르게 매칭하기 위해)
        const customerMap = new Map(
          (customerRows ?? []).map((row) => [row.id, row]),
        );

        // 2) 예약 목록
        const {
          data: reservationRows,
          error: reservationError,
        } = await supabase
          .from('reservations')
          .select('id, customer_id, reserved_at, memo, status')
          .eq('owner_id', user.id)
          .order('reserved_at', { ascending: true });

        if (reservationError) {
          console.error('[SupabaseHook] reservations 에러:', reservationError);
          setReservations([]);
        } else {
          const mappedReservations =
            (reservationRows ?? []).map((row) => {
              const customer = customerMap.get(row.customer_id);
              const localDate = formatLocalDate(row.reserved_at);
              const localTime = formatLocalTime(row.reserved_at);

              return {
                id: row.id,
                customerId: row.customer_id,
                date: localDate,           // ← 여기 날짜가 KST 기준으로 고정
                time: localTime,
                name: customer?.name || '',
                phone: customer?.phone || '',
                memo: row.memo || '',
                status: row.status || 'scheduled',
              };
            }) ?? [];

          setReservations(mappedReservations);
        }

        console.log(
          '[SupabaseHook] customers:',
          customers.length,
          'reservations:',
          reservations.length,
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  return {
    customers,
    reservations,
    loading,
  };
}
