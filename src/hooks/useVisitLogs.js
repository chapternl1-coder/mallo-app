import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const normalizePhone = (phone) => {
  if (!phone) return '';
  return String(phone).replace(/[^0-9]/g, '');
};

/**
 * 방문 기록을 저장하기 전에, Supabase customers에서
 * "이 방문이 어떤 고객 프로필에 붙을지"를 결정해주는 함수.
 *
 * 규칙:
 *  1) 전화번호가 있으면, **전화번호로 먼저** 찾는다.
 *  2) 같은 전화번호가 없으면, 같은 이름의 고객들을 조회한다.
 *     2-1) 같은 이름 + 전화번호가 비어 있는 고객이 있으면 → 그 고객의 전화번호를 채우고 사용.
 *     2-2) 같은 이름 + 이미 다른 전화번호가 있는 고객만 있으면 → 동명이인으로 보고 **새 고객 생성**.
 *  3) 이름이 완전 처음이면 → 새 고객 생성.
 */
export async function ensureCustomerForVisit({
  supabaseClient,
  ownerId,
  name,
  phone,
}) {
  if (!supabaseClient || !ownerId || !name) {
    console.warn('[ensureCustomerForVisit] ownerId 또는 name이 없어 고객을 만들지 않습니다.', {
      ownerId,
      name,
      phone,
    });
    return null;
  }

  const trimmedName = name.trim();
  const normalizedPhone = normalizePhone(phone);

  try {
    // ─────────────────────────────────────────────
    // 1단계: 전화번호가 있으면 "전화번호"로 먼저 찾기
    // ─────────────────────────────────────────────
    if (normalizedPhone) {
      const { data: allCustomersByOwner, error: byOwnerError } =
        await supabaseClient
          .from('customers')
          .select('id, name, phone')
          .eq('owner_id', ownerId);

      if (byOwnerError) {
        console.error('[ensureCustomerForVisit] 전화번호 검색용 customers 조회 에러', byOwnerError);
      } else if (allCustomersByOwner && allCustomersByOwner.length > 0) {
        const phoneMatch = allCustomersByOwner.find((c) => {
          return normalizePhone(c.phone) === normalizedPhone;
        });

        if (phoneMatch) {
          console.log('[ensureCustomerForVisit] 전화번호로 기존 고객 매칭 성공:', phoneMatch);
          return phoneMatch.id;
        }
      }
    }

    // ─────────────────────────────────────────────
    // 2단계: 같은 이름 고객들 조회
    // ─────────────────────────────────────────────
    const { data: sameNameCustomers, error: sameNameError } =
      await supabaseClient
        .from('customers')
        .select('id, name, phone')
        .eq('owner_id', ownerId)
        .ilike('name', trimmedName);

    if (sameNameError) {
      console.error('[ensureCustomerForVisit] 이름 기준 customers 조회 에러', sameNameError);
    }

    if (sameNameCustomers && sameNameCustomers.length > 0) {
      // 2-1) 같은 이름 중에서 "전화번호가 비어 있는" 고객이 있으면 → 그 고객에 전화번호 채우고 사용
      const emptyPhoneCustomer = sameNameCustomers.find((c) => !normalizePhone(c.phone));

      if (emptyPhoneCustomer && normalizedPhone) {
        console.log(
          '[ensureCustomerForVisit] 같은 이름 + 전화번호 비어있는 고객 발견 → 이 고객의 번호를 업데이트해서 사용:',
          emptyPhoneCustomer,
        );

        const { error: updateError } = await supabaseClient
          .from('customers')
          .update({ phone })
          .eq('id', emptyPhoneCustomer.id);

        if (updateError) {
          console.error('[ensureCustomerForVisit] 고객 전화번호 업데이트 에러', updateError);
        }

        return emptyPhoneCustomer.id;
      }

      // 2-2) 같은 이름인데, 모두 전화번호가 "다른 번호"를 가지고 있으면 → 동명이인으로 판단해서 새 고객 생성
      if (normalizedPhone) {
        const hasDifferentPhone = sameNameCustomers.some((c) => {
          const existing = normalizePhone(c.phone);
          return existing && existing !== normalizedPhone;
        });

        if (hasDifferentPhone) {
          console.log(
            '[ensureCustomerForVisit] 같은 이름 + 다른 전화번호 고객이 이미 있어 동명이인으로 간주, 새 고객 생성 예정. name:',
            trimmedName,
            'phone:',
            phone,
          );
          // 아래 새 고객 생성 로직으로 진행
        } else {
          // 이 경우는 이론상 거의 없지만, 안전망: 이름만 같은 고객이 있고 모두 전화번호 없음
          // 첫 번째 고객을 재사용하도록 처리 (위 emptyPhoneCustomer 에서 이미 잡혔을 가능성이 큼)
          const fallback = sameNameCustomers[0];
          console.log(
            '[ensureCustomerForVisit] 같은 이름 고객만 존재하고 번호 정보가 특별히 구분되지 않아 첫 고객 재사용:',
            fallback,
          );
          return fallback.id;
        }
      } else {
        // 전화번호가 아예 없는 케이스 → 같은 이름 고객 중 첫 번째를 재사용
        const fallback = sameNameCustomers[0];
        console.log(
          '[ensureCustomerForVisit] 전화번호 없이 이름만 있는 케이스 → 같은 이름 고객 중 첫 번째 사용:',
          fallback,
        );
        return fallback.id;
      }
    }

    // ─────────────────────────────────────────────
    // 3단계: 여기까지 왔다 = 완전 신규 고객이므로 새로 생성
    // ─────────────────────────────────────────────
    console.log(
      '[ensureCustomerForVisit] 기존 고객 없음 → 새 고객 생성:',
      { ownerId, name: trimmedName, phone },
    );

    const insertPayload = {
      owner_id: ownerId,
      name: trimmedName,
      phone: phone || null,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertError } = await supabaseClient
      .from('customers')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError) {
      console.error('[ensureCustomerForVisit] 새 고객 생성 실패', insertError);
      return null;
    }

    console.log('[ensureCustomerForVisit] 새 고객 생성 성공, id:', inserted.id);
    return inserted.id;
  } catch (e) {
    console.error('[ensureCustomerForVisit] 예외 발생', e);
    return null;
  }
}

export default function useVisitLogs() {
  const { user } = useAuth();
  const [visitLogsByCustomer, setVisitLogsByCustomer] = useState({});
  const [allVisitLogs, setAllVisitLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // ✅ 처음 한 번만 로딩 표시용 상태
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // ✅ 1) 한 번만 정의해두고, 어디서든 다시 쓸 수 있는 fetch 함수
  const fetchVisitLogs = useCallback(async () => {
    // 로그인 안 된 상태면 비워두기
    if (!user) {
      setVisitLogsByCustomer({});
      setAllVisitLogs([]);
      setLoading(false);
      return;
    }

    // 🔹 Stale-while-revalidate: 데이터가 이미 있으면 로딩 상태를 유지하지 않음
    const hasExistingData = allVisitLogs.length > 0 || Object.keys(visitLogsByCustomer).length > 0;
    // ✅ 처음 한 번 fetch할 때만 로딩 true로 (데이터가 없을 때만)
    const shouldShowLoading = !hasLoadedOnce && !hasExistingData;

    try {
      if (shouldShowLoading) {
    setLoading(true);
      }
    setError(null);

    const { data, error } = await supabase
      .from('visit_logs')
      .select(`
        id,
        owner_id,
        customer_id,
        reservation_id,
        recorded_at,
        service_date,
        service_time,
        title,
        summary_json,
        raw_text,
        tags
      `)
      .eq('owner_id', user.id)
      .order('recorded_at', { ascending: false });

    if (error) {
      console.error('visit_logs 불러오기 오류', error);
      setError(error);
      setVisitLogsByCustomer({});
      setAllVisitLogs([]);
        if (shouldShowLoading) {
      setLoading(false);
        }
      return;
    }

    const mappedVisitLogs = (data || []).map((row) => ({
      id: row.id,
      customerId: row.customer_id,           // uuid
      reservationId: row.reservation_id,     // uuid 또는 null
      serviceDate: row.service_date,         // 'YYYY-MM-DD' (date 컬럼)
      serviceTime: row.service_time || '',   // 'HH:MM' (text 컬럼)
      title: row.title || '',
      summaryJson: row.summary_json || null,
      rawText: row.raw_text || '',
      tags: row.tags || [],                  // text[]
      // 고객 이름/전화는 join 안 되어 있으면 나중에 customers랑 매칭해서 씀
      // 하위 호환성을 위한 필드들
      ownerId: row.owner_id,
      recordedAt: row.recorded_at,
      detail: row.summary_json || { sections: [] },
    }));

    // 고객별로 그룹핑 (CustomerDetailScreen, HomeScreen용)
    const byCustomer = mappedVisitLogs.reduce((acc, visit) => {
      const key =
        visit.customerId !== null && visit.customerId !== undefined
          ? String(visit.customerId)
          : 'no_customer';

      if (!acc[key]) acc[key] = [];
      acc[key].push(visit);
      return acc;
    }, {});

    setVisitLogsByCustomer(byCustomer);
    setAllVisitLogs(mappedVisitLogs);

      // ✅ 한 번이라도 성공적으로 데이터를 받았으면 플래그 세우기
      if (!hasLoadedOnce) {
        setHasLoadedOnce(true);
      }
    } finally {
      if (shouldShowLoading) {
    setLoading(false);
      }
    }
  }, [user, hasLoadedOnce]);

  // ✅ 2) 처음 마운트/유저 변경될 때 자동으로 한 번 실행
  useEffect(() => {
    fetchVisitLogs();
  }, [fetchVisitLogs]);

  // ✅ 3) refetchVisitLogs 를 외부에서도 쓸 수 있게 리턴
  return {
    visitLogsByCustomer,
    visitLogs: allVisitLogs,  // visitLogs 이름으로 반환
    allVisitLogs,             // 하위 호환성 유지
    loading,
    error,
    refresh: fetchVisitLogs,  // 하위 호환성 유지
    refetchVisitLogs: fetchVisitLogs,  // 수동으로 새로고침하는 함수 추가
  };
}

