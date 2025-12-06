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
 *      isNew,
 *    }]
 *  - loading: boolean
 *  - error: Error | null
 */
export default function useSupabaseReservations() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);   // ✅ 처음엔 무조건 true
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      // 로그인 안 돼 있으면 빈 상태 + 로딩 종료
      setCustomers([]);
      setReservations([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);   // ✅ 새로 불러올 땐 true
      setError(null);

      try {
        const [customersRes, reservationsRes] = await Promise.all([
          supabase
            .from('customers')
            .select('id, name, phone, created_at')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('reservations')
            .select('id, customer_id, reserved_at, memo, status')
            .eq('owner_id', user.id)
            .order('reserved_at', { ascending: true }),
        ]);

        if (cancelled) return;

        if (customersRes.error || reservationsRes.error) {
          console.error(
            '[SupabaseHook] error',
            customersRes.error || reservationsRes.error
          );
          setError(customersRes.error || reservationsRes.error);
          // 에러여도 배열은 최소한 []로
          setCustomers(customersRes.data ?? []);
          setReservations([]);
        } else {
          const customerRows = customersRes.data ?? [];
          const reservationRows = reservationsRes.data ?? [];

          // 고객 매핑
          const mappedCustomers = customerRows.map((row) => ({
            id: row.id,
            name: row.name || '',
            phone: row.phone || '',
            createdAt: row.created_at,
          }));

          // 고객 id → 객체 맵 (예약에서 빠르게 매칭하기 위해)
          const customerMap = new Map(
            customerRows.map((row) => [row.id, row]),
          );

          // 예약마다 isNew 계산 + Home/예약화면에서 쓰기 좋은 형태로 변환
          const safeReservations = reservationRows ?? [];
          const mappedReservations = safeReservations.map((row) => {
            const customer = customerMap.get(row.customer_id);
            const localDate = formatLocalDate(row.reserved_at);
            const localTime = formatLocalTime(row.reserved_at);

            // 같은 고객(customer_id)의 예약이 딱 1개인 경우 → isNew: true
            const countForThisCustomer = safeReservations.filter(
              (res) => res.customer_id === row.customer_id
            ).length;

            return {
              id: row.id,
              customerId: row.customer_id,
              date: localDate,           // ← 여기 날짜가 KST 기준으로 고정
              time: localTime,
              name: customer?.name || '',
              phone: customer?.phone || '',
              memo: row.memo || '',
              status: row.status || 'scheduled',
              // ✅ 이 값이 홈에서 '신규' 뱃지에 쓰이는 값
              isNew: countForThisCustomer === 1,
            };
          });

          setCustomers(mappedCustomers);
          setReservations(mappedReservations);

          console.log(
            '[SupabaseHook] customers:',
            mappedCustomers.length,
            'reservations:',
            mappedReservations.length
          );
        }
      } catch (e) {
        if (cancelled) return;
        console.error('[SupabaseHook] unexpected error', e);
        setError(e);
      } finally {
        if (!cancelled) {
          setLoading(false);   // ✅ 진짜 끝났을 때만 false
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return {
    customers,
    reservations,
    loading,
    error,
  };
}
