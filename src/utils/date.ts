/**
 * 녹음 기록 일시를 포맷팅하는 함수
 * 형식: "2025.11.28 04:31"
 */
export function formatRecordDateTime(value?: string | number | Date): string {
  if (!value) return '';

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');

  // 최종 포맷: 2025.11.28 04:31
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
}

/**
 * 방문 예약 정보를 포맷팅하는 함수
 * 형식: "11/28 · 09:00 예약 (신규)"
 */
export function formatVisitReservation(
  value?: string | number | Date,
  visitType?: string,
): string {
  if (!value) return '';

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');

  // 예: 11/28 · 09:00 예약 (신규)
  if (visitType) {
    return `${mm}/${dd} · ${hh}:${mi} 예약 (${visitType})`;
  }
  return `${mm}/${dd} · ${hh}:${mi} 예약`;
}

/**
 * 방문 예약 정보를 전체 형식으로 포맷팅하는 함수
 * 형식: "2025.11.28 09:00 방문 예약"
 */
export function formatVisitReservationFull(value?: string | number | Date): string {
  if (!value) return '';

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');

  // 예: "2025.11.28 09:00 방문 예약"
  return `${yyyy}.${mm}.${dd} ${hh}:${mi} 방문 예약`;
}

/**
 * 방문 예약 시간을 포맷팅하는 함수 (공통 util)
 * 형식: "2025.11.28 09:00 방문 예약"
 * 전체 기록 화면에서는 시간 부분만 잘라서 사용 가능
 */
export function formatVisitReservationTime(value?: string | number | Date): string {
  if (!value) return '';

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');

  // 고객 상세 VisitSummaryCard에서는 전체 날짜+시간,
  // 전체 기록 화면 카드에서는 이 함수에서 시간 부분만 잘라 써도 됩니다.
  return `${yyyy}.${mm}.${dd} ${hh}:${mi} 방문 예약`;
}

