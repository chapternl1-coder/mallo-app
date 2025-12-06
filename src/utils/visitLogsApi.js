import { supabase } from '../lib/supabaseClient';

/**
 * 방문 기록 1건을 Supabase visit_logs 테이블에 저장
 */
export async function insertVisitLog({
  ownerId,
  customerId,
  reservationId,
  recordedAt,
  serviceDate,
  serviceTime,
  title,
  summaryJson,
  rawText,
  tags,
}) {
  const payload = {
    owner_id: ownerId,
    customer_id: customerId ?? null,
    reservation_id: reservationId ?? null,
    recorded_at: recordedAt ?? new Date().toISOString(),
    service_date: serviceDate ?? null,   // 'YYYY-MM-DD'
    service_time: serviceTime ?? null,   // 'HH:MM' 문자열
    title: title ?? '',
    summary_json: summaryJson ?? null,   // visitData 전체 JSON
    raw_text: rawText ?? '',
    tags: tags ?? [],                    // string[]
  };

  const { data, error } = await supabase
    .from('visit_logs')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('visit_logs INSERT 오류', error, payload);
    throw error;
  }

  return data;
}

