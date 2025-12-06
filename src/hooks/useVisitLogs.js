import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function useVisitLogs() {
  const { user } = useAuth();
  const [visitLogsByCustomer, setVisitLogsByCustomer] = useState({});
  const [allVisitLogs, setAllVisitLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 로그인 안 된 상태면 비워두기
    if (!user) {
      setVisitLogsByCustomer({});
      setAllVisitLogs([]);
      setLoading(false);
      return;
    }

    const fetchVisitLogs = async () => {
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

      const normalized = (data || []).map((row) => ({
        id: row.id,
        ownerId: row.owner_id,
        customerId: row.customer_id,
        reservationId: row.reservation_id,
        recordedAt: row.recorded_at,
        serviceDate: row.service_date,       // YYYY-MM-DD
        time: row.service_time || null,      // "HH:MM"
        title: row.title || '',
        // 요약 전체 JSON (sections 포함) – 없으면 빈 구조
        detail: row.summary_json || { sections: [] },
        rawText: row.raw_text || '',
        tags: row.tags || [],               // text[] → string[]
      }));

      // 고객별로 그룹핑 (CustomerDetailScreen, HomeScreen용)
      const byCustomer = normalized.reduce((acc, visit) => {
        const key =
          visit.customerId !== null && visit.customerId !== undefined
            ? String(visit.customerId)
            : 'no_customer';

        if (!acc[key]) acc[key] = [];
        acc[key].push(visit);
        return acc;
      }, {});

      setVisitLogsByCustomer(byCustomer);
      setAllVisitLogs(normalized);
      setLoading(false);
    };

    fetchVisitLogs();
  }, [user]);

  return {
    visitLogsByCustomer,
    allVisitLogs,
    loading,
    error,
  };
}

