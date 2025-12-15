import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

// 과도한 콘솔 로그를 막기 위한 토글
const ENABLE_RESERVATION_DEBUG = false; // 디버깅 비활성화 (문제 해결 후)
const resLog = (...args) => {
  if (ENABLE_RESERVATION_DEBUG) console.log(...args);
};

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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

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
      // 세션 확인 (로그아웃 직후 방지)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !user) {
        // 로그아웃 상태에서는 데이터 요청하지 않음 (정상 동작)
        setCustomers([]);
        setReservations([]);
        setLoading(false);
        return;
      }

      // 🔹 Stale-while-revalidate: 데이터가 이미 있으면 로딩 상태를 유지하지 않음
      const hasExistingData = customers.length > 0 || reservations.length > 0;
      const shouldShowLoading = !hasLoadedOnce && !hasExistingData;
      
      if (shouldShowLoading) {
        setLoading(true);   // ✅ 데이터가 없을 때만 로딩 true
      }
      setError(null);

      try {
        // customer_tags 컬럼이 있을 수도 있으므로 시도해보고, 없으면 기본 필드만 사용
        console.log('[DEBUG] 현재 사용자 ID:', user.id);
        console.log('[DEBUG] RLS 정책 확인을 위한 쿼리 실행...');

        // RLS 정책 테스트: 다른 사용자의 데이터가 있는지 확인
        const allCustomersRes = await supabase
          .from('customers')
          .select('id, name, phone, owner_id')
          .limit(100); // 최대 100개만 확인

        console.log('[DEBUG] 전체 customers 조회 결과 (RLS 정책 테스트):', allCustomersRes);

        let customersRes = await supabase
          .from('customers')
          .select('id, name, phone, created_at, memo, customer_tags, owner_id')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: true });

        console.log('[DEBUG] 필터링된 Customers 쿼리 결과:', customersRes);

        // customer_tags 컬럼이 없으면 기본 필드만 다시 조회
        if (customersRes.error && customersRes.error.message && customersRes.error.message.includes('customer_tags')) {
          console.warn('[SupabaseHook] customer_tags 컬럼이 없어서 기본 필드만 조회');
          customersRes = await supabase
            .from('customers')
            .select('id, name, phone, created_at, memo')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: true });
        }

        // reservations는 별도로 가져오기
        const reservationsRes = await supabase
          .from('reservations')
          .select('id, customer_id, reserved_at, memo, status, owner_id')
          .eq('owner_id', user.id)
          .order('reserved_at', { ascending: true });

        console.log('[DEBUG] Reservations 쿼리 결과:', reservationsRes);

        if (cancelled) return;

        // customers와 reservations를 각각 독립적으로 처리
        const customerRows = customersRes.error ? [] : (customersRes.data ?? []);
        const reservationRows = reservationsRes.error ? [] : (reservationsRes.data ?? []);

        // 🚨 RLS 정책 확인: 다른 사용자의 데이터가 포함되어 있는지 체크
        const invalidCustomers = customerRows.filter(c => c.owner_id !== user.id);
        const invalidReservations = reservationRows.filter(r => r.owner_id !== user.id);

        if (invalidCustomers.length > 0) {
          console.error('🚨 보안 위험: 다른 사용자의 고객 데이터가 포함됨!', invalidCustomers);
        }
        if (invalidReservations.length > 0) {
          console.error('🚨 보안 위험: 다른 사용자의 예약 데이터가 포함됨!', invalidReservations);
        }

        // 에러가 있으면 로그만 남기고 계속 진행
        if (customersRes.error) {
          console.error('[SupabaseHook] customers 에러:', customersRes.error);
        }
        if (reservationsRes.error) {
          console.error('[SupabaseHook] reservations 에러:', reservationsRes.error);
        }
        if (customersRes.error || reservationsRes.error) {
          setError(customersRes.error || reservationsRes.error);
        }

        // 데이터 처리 (에러가 있어도 성공한 데이터는 사용)
        // 고객 매핑
        const mappedCustomers = customerRows.map((row) => ({
            id: row.id,
            name: row.name || '',
            phone: row.phone || '',
            createdAt: row.created_at,
            customerTags: (row.customer_tags || {
              feature: [],
              caution: [],
              trait: [],
              payment: [],
              pattern: [],
            }),
            visitCount: row.visit_count || 0,
            lastVisit: row.last_visit || null,
            memo: row.memo || null,
          }));

        // 고객 id → 객체 맵 (예약에서 빠르게 매칭하기 위해)
        const customerMap = new Map(
          customerRows.map((row) => [row.id, row]),
        );

        // 예약마다 isNew 계산 + Home/예약화면에서 쓰기 좋은 형태로 변환
        const safeReservations = reservationRows ?? [];

        // ✅ 고객별 가장 빠른 reserved_at 계산
        const firstReservedAtByCustomer = new Map();
        safeReservations.forEach((row) => {
          if (!row.customer_id) return;
          const currentFirst = firstReservedAtByCustomer.get(row.customer_id);
          if (!currentFirst || new Date(row.reserved_at) < new Date(currentFirst)) {
            firstReservedAtByCustomer.set(row.customer_id, row.reserved_at);
          }
        });

        const mappedReservations = safeReservations.map((row) => {
          const customer = customerMap.get(row.customer_id);
          const localDate = formatLocalDate(row.reserved_at);
          const localTime = formatLocalTime(row.reserved_at);

          // ✅ isNew 계산
          let isNew = false;
          if (!row.customer_id) {
            // 고객 프로필이 안 묶인 예약 → 일단 '신규' 취급
            isNew = true;
          } else {
            const first = firstReservedAtByCustomer.get(row.customer_id);
            isNew = !!first && first === row.reserved_at;
          }

          return {
            id: row.id,
            customerId: row.customer_id,
            date: localDate,           // ← 여기 날짜가 KST 기준으로 고정
            time: localTime,
            name: customer?.name || '',
            phone: customer?.phone || '',
            memo: row.memo || '',
            status: row.status || 'scheduled',
            reserved_at: row.reserved_at, // 예약 생성 시간 (정렬용)
            // ✅ 이 값이 홈에서 '신규' 뱃지에 쓰이는 값
            isNew,
          };
        });

        setCustomers(mappedCustomers);
        setReservations(mappedReservations);

        resLog(
          '[SupabaseHook] customers:',
          mappedCustomers.length,
          'reservations:',
          mappedReservations.length
        );
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
  }, [user, refreshTrigger]);

  // 실시간 구독으로 reservations 테이블 변경 감지
  useEffect(() => {
    if (!user || !user.id) return undefined;

    const channel = supabase
      .channel('reservations_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE 모두 감지
          schema: 'public',
          table: 'reservations',
          filter: `owner_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[실시간 구독] reservations 변경 감지:', payload);
          // 데이터 변경 시 즉시 새로고침
          setRefreshTrigger((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // customers 테이블 실시간 구독도 추가
  useEffect(() => {
    if (!user || !user.id) return undefined;

    const channel = supabase
      .channel('customers_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE 모두 감지
          schema: 'public',
          table: 'customers',
          filter: `owner_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[실시간 구독] customers 변경 감지:', payload);
          // 데이터 변경 시 즉시 새로고침
          setRefreshTrigger((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // 기존 15초 폴링은 백업으로 유지 (실시간 구독 실패 시 대비)
  useEffect(() => {
    if (!user || !user.id) return undefined;

    const intervalId = setInterval(() => {
      setRefreshTrigger((prev) => prev + 1);
    }, 15000);

    return () => clearInterval(intervalId);
  }, [user?.id]);

  // 수동으로 데이터를 다시 불러오는 함수
  const refresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return {
    customers,
    reservations,
    loading,
    error,
    refresh,
  };
}
