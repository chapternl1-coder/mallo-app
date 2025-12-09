import { formatServiceDateTimeLabel } from './date';

// 요약 텍스트에서 방문·예약 날짜를 파싱하는 helper 함수
export function extractServiceDateFromSummary(resultData) {
  if (!resultData || !resultData.sections) {
    console.log('[extractServiceDateFromSummary] resultData 또는 sections 없음');
    return undefined;
  }

  // "방문·예약 정보" 섹션 찾기
  const visitSection = resultData.sections.find(
    section => section.title && section.title.includes('방문·예약 정보')
  );

  if (!visitSection) {
    console.log('[extractServiceDateFromSummary] 방문·예약 정보 섹션 없음');
    return undefined;
  }

  if (!visitSection.content || !Array.isArray(visitSection.content)) {
    console.log('[extractServiceDateFromSummary] content가 배열이 아님');
    return undefined;
  }

  console.log('[extractServiceDateFromSummary] 방문·예약 정보 섹션 찾음:', visitSection);

  // 섹션의 content 배열에서 날짜 패턴 찾기
  // 🎯 예약 날짜가 맨 앞에 있으므로 첫 번째로 발견되는 날짜를 사용 (예약 우선)
  for (const line of visitSection.content) {
    if (!line || typeof line !== 'string') continue;

    console.log('[extractServiceDateFromSummary] 검사 중인 줄:', line);

    // "2025년 12월 27일" 패턴 찾기 (앞에 "- " 또는 다른 문자가 있어도 매칭)
    // 예: "2025년 12월 27일 (금) 17:30 예약"
    const match = line.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (match) {
      const [, year, month, day] = match;
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      
      const serviceDate = `${year}-${mm}-${dd}`;
      console.log('[extractServiceDateFromSummary] 첫 번째 날짜 발견 (예약 우선):', serviceDate, '줄:', line);
      return serviceDate;
    }
  }

  console.log('[extractServiceDateFromSummary] 날짜 패턴을 찾지 못함');
  return undefined;
}

// serviceDateTimeLabel 생성 함수
export function extractServiceDateTimeLabel(record) {
  // "방문·예약 정보" 섹션에서 날짜 + 시간 파싱
  if (record.detail && record.detail.sections) {
    const visitSection = record.detail.sections.find(
      section => section.title && section.title.includes('방문·예약 정보')
    );
    
    if (visitSection && visitSection.content && Array.isArray(visitSection.content)) {
      for (const line of visitSection.content) {
        if (!line || typeof line !== 'string') continue;
        
        // "2025년 12월 27일 (금) 17:30 예약 후 제시간 방문" 패턴 찾기
        // 날짜와 시간을 모두 추출
        const dateMatch = line.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
        const timeMatch = line.match(/(\d{1,2}):(\d{2})/);
        
        if (dateMatch && timeMatch) {
          const [, year, month, day] = dateMatch;
          const [, hour, minute] = timeMatch;
          const mm = String(month).padStart(2, '0');
          const dd = String(day).padStart(2, '0');
          const hh = String(hour).padStart(2, '0');
          const mi = String(minute).padStart(2, '0');
          
          // 형식: "2025-12-27 17:30 방문/예약"
          return `${year}-${mm}-${dd} ${hh}:${mi} 방문/예약`;
        }
      }
    }
  }
  
  // 섹션에서 찾지 못하면 recordedAt 또는 createdAt 사용
  const recordedAt = record.recordedAt || record.createdAt;
  if (recordedAt) {
    return formatServiceDateTimeLabel(recordedAt);
  }
  
  // date와 time 조합 시도
  if (record.date && record.time) {
    const dateTimeStr = `${record.date}T${record.time}:00`;
    return formatServiceDateTimeLabel(dateTimeStr);
  }
  
  return '';
}

















