import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

/**
 * selectedDate 기준으로
 * - Supabase customers / reservations 불러오고
 * - 홈 예약 카드에서 바로 쓸 수 있는 형태로 변환해서 돌려주는 훅
 *
 * UI는 전혀 건들지 않고, 데이터 구조만 맞춰준다.
 */
export default function useSupabaseReservations(selectedDate) {
  const { user } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1) 로그인한 원장님(owner_id = user.id) 기준으로 customers / reservations 불러오기
  useEffect(() => {
    if (!user) {
      console.log('[SupabaseHook] user 없음, 스킵');
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // customers
        const { data: customerRows, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: true });

        if (customerError) throw customerError;

        // reservations
        const { data: reservationRows, error: reservationError } = await supabase
          .from('reservations')
          .select('*')
          .eq('owner_id', user.id)
          .order('reserved_at', { ascending: true });

        if (reservationError) throw reservationError;

        console.log('[SupabaseHook] customers:', customerRows);
        console.log('[SupabaseHook] reservations:', reservationRows);

        setCustomers(customerRows ?? []);
        setReservations(reservationRows ?? []);
      } catch (err) {
        console.error('[SupabaseHook] 로드 에러:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  // 2) 선택된 날짜에 해당하는 예약만 필터링 + 홈 카드에서 바로 쓸 수 있는 형태로 변환
  const reservationsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];

    // selectedDate는 Date 객체라고 가정
    // (이미 홈 상태에서 날짜를 이렇게 관리하고 있을 가능성이 큼)
    const dateKey = selectedDate.toISOString().slice(0, 10); // 'YYYY-MM-DD'

    const customerMap = new Map(customers.map((c) => [c.id, c]));

    return reservations
      .filter((r) => {
        if (!r.reserved_at) return false;

        // reserved_at이 '2025-12-06T10:10:00+09:00' 같은 형태라고 가정
        return r.reserved_at.startsWith(dateKey);
      })
      .map((r) => {
        const customer = customerMap.get(r.customer_id);

        const reservedAt = r.reserved_at ? new Date(r.reserved_at) : null;
        let timeLabel = '--:--';

        if (!Number.isNaN(reservedAt?.getTime())) {
          const hh = String(reservedAt.getHours()).padStart(2, '0');
          const mm = String(reservedAt.getMinutes()).padStart(2, '0');
          timeLabel = `${hh}:${mm}`; // 예: "14:03"
        }

        return {
          // 👇 아래 구조는 기존 홈 예약 카드에서 쓰던 값들에 맞춰줌
          id: r.id,
          timeLabel, // 시간 레이블
          time: timeLabel, // 기존 코드 호환성 (reservation.time 사용)
          name: customer?.name ?? '(이름 없음)',
          phone: customer?.phone ?? '',
          memo: r.memo ?? '',
          note: r.memo ?? '', // 기존 코드 호환성 (reservation.note 사용)
          customerId: r.customer_id || null, // 기존 코드 호환성
          date: dateKey, // 기존 코드 호환성 (YYYY-MM-DD 형식)
          // 기존 UI에 "친구" 뱃지 / 첫 방문 여부 등 넣을 때 확장할 수 있게 플래그만 잡아둠
          isFirstVisit: false,
          isNew: false, // 기존 코드 호환성
          // 필요하면 나중에 status 같은 것도 같이 넘기기 쉽게 포함
          status: r.status ?? 'scheduled',
        };
      })
      .sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));
  }, [customers, reservations, selectedDate]);

  return {
    loading,
    error,
    customers,
    reservations,
    reservationsForSelectedDate,
  };
}
