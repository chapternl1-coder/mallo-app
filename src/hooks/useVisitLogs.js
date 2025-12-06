import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

// 고객 자동 생성/연결 helper 함수
export async function ensureCustomerForVisit({ supabaseClient, ownerId, name, phone }) {
  // 이름/번호 둘 다 없으면 그냥 null 리턴
  if (!name && !phone) return null;

  // 공백 제거
  const cleanName = name ? String(name).trim() : null;
  const cleanPhone = phone ? String(phone).trim() : null;

  try {
    // 1) 전화번호로 기존 고객 찾기 (같은 점주/원장(owner) 안에서만)
    if (cleanPhone) {
      const { data: existByPhone, error: findError } = await supabaseClient
        .from('customers')
        .select('id, name, phone')
        .eq('owner_id', ownerId)
        .eq('phone', cleanPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!findError && existByPhone) {
        return existByPhone.id;
      }
    }

    // 2) 전화번호는 없고 이름만 있는 경우, 이름으로만 찾는 건 위험해서 "새 고객"으로 취급
    //    (원장님이 말한 것처럼 이름만으로 매칭하면 시술 횟수가 꼬이는 문제가 있음)

    // 3) 새 고객 생성
    const { data: inserted, error: insertError } = await supabaseClient
      .from('customers')
      .insert({
        owner_id: ownerId,
        name: cleanName || '이름 미입력',
        phone: cleanPhone || null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[ensureCustomerForVisit] 고객 생성 중 오류:', insertError);
      return null;
    }

    return inserted.id;
  } catch (e) {
    console.error('[ensureCustomerForVisit] 예외 발생:', e);
    return null;
  }
}

export default function useVisitLogs() {
  const { user } = useAuth();
  const [visitLogsByCustomer, setVisitLogsByCustomer] = useState({});
  const [allVisitLogs, setAllVisitLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVisitLogs = async () => {
    // 로그인 안 된 상태면 비워두기
    if (!user) {
      setVisitLogsByCustomer({});
      setAllVisitLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
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
      setLoading(false);
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
    setLoading(false);
  };

  useEffect(() => {
    fetchVisitLogs();
  }, [user]);

  return {
    visitLogsByCustomer,
    visitLogs: allVisitLogs,  // visitLogs 이름으로 반환
    allVisitLogs,             // 하위 호환성 유지
    loading,
    error,
    refresh: fetchVisitLogs,  // 수동으로 새로고침하는 함수 추가
  };
}

