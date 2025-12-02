// 녹음 기록 관련 유틸 함수들
// 
// 변경 이력:
// - RecordScreen.jsx에서 순수 함수들을 분리하여 공통화

/**
 * 녹음 일시를 포맷팅 (예: "2025년 1월 15일 오전 10:30")
 * @param {Date} recordingDate - 녹음 일시
 * @returns {string} 포맷팅된 날짜 문자열
 */
export function formatRecordingDateTime(recordingDate) {
  if (!recordingDate || !(recordingDate instanceof Date)) {
    return '';
  }

  const year = recordingDate.getFullYear();
  const month = recordingDate.getMonth() + 1;
  const day = recordingDate.getDate();
  const hours = recordingDate.getHours();
  const minutes = recordingDate.getMinutes();
  const ampm = hours >= 12 ? '오후' : '오전';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  
  return `${year}년 ${month}월 ${day}일 ${ampm} ${displayHours}:${displayMinutes}`;
}

/**
 * 오늘 날짜와 시간을 문자열로 반환
 * @returns {Object} { dateStr: "YYYY-MM-DD", timeStr: "HH:mm", recordedAt: ISO string }
 */
export function createDateTimeStrings() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
  const recordedAt = today.toISOString();
  
  return { dateStr, timeStr, recordedAt };
}

/**
 * 제목에서 고객 이름과 "신규 고객", "기존 고객" 텍스트를 제거하여 정리
 * @param {string} title - 원본 제목
 * @param {string} customerName - 고객 이름 (선택)
 * @returns {string} 정리된 제목
 */
export function cleanTitle(title, customerName = null) {
  if (!title) return title;
  
  let cleaned = title;
  
  // 고객 이름 제거
  if (customerName) {
    cleaned = cleaned.replace(new RegExp(customerName, 'g'), '').trim();
  }
  
  // "신규 고객", "기존 고객" 제거
  cleaned = cleaned.replace(/신규\s*고객/gi, '').trim();
  cleaned = cleaned.replace(/기존\s*고객/gi, '').trim();
  
  // 연속된 공백 정리
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned || title;
}

/**
 * 방문 기록 객체 생성
 * @param {Object} params - 방문 기록 생성 파라미터
 * @param {string} params.dateStr - 날짜 문자열 (YYYY-MM-DD)
 * @param {string} params.timeStr - 시간 문자열 (HH:mm)
 * @param {string} params.recordedAt - ISO 문자열
 * @param {string} params.serviceDate - 시술 날짜
 * @param {string} params.title - 제목
 * @param {string} params.summary - 요약
 * @param {string} params.rawTranscript - 원본 텍스트
 * @param {Array} params.sections - 섹션 배열
 * @param {Array} params.selectedTagIds - 선택된 태그 ID 배열
 * @param {Array} params.allVisitTags - 전체 방문 태그 배열
 * @param {Array} params.serviceTags - 서비스 태그 배열
 * @returns {Object} 방문 기록 객체
 */
export function createVisitRecord({
  dateStr,
  timeStr,
  recordedAt,
  serviceDate,
  title,
  summary,
  rawTranscript,
  sections,
  selectedTagIds,
  allVisitTags,
  serviceTags = []
}) {
  const newVisitId = Date.now();
  
  // 선택된 태그 레이블 추출
  const selectedTagLabels = selectedTagIds
    .map(id => {
      const tag = allVisitTags.find(t => t.id === id);
      return tag ? tag.label : null;
    })
    .filter(label => label !== null);
  
  // 모든 태그 합치기 (중복 제거)
  const allTags = [...new Set([...serviceTags, ...selectedTagLabels])];
  
  return {
    id: newVisitId,
    date: dateStr,
    time: timeStr,
    recordedAt: recordedAt,
    serviceDate: serviceDate,
    title: title,
    summary: summary,
    rawTranscript: rawTranscript,
    detail: {
      sections: sections
    },
    tags: allTags
  };
}

/**
 * 고객 태그를 업데이트 (방문 횟수에 따른 패턴 태그, 내용 분석으로 주의사항 태그 추가)
 * @param {Object} params - 태그 업데이트 파라미터
 * @param {Object} params.existingCustomerTags - 기존 고객 태그 객체
 * @param {Array} params.selectedCustomerTagIds - 선택된 고객 태그 ID 배열
 * @param {Array} params.allCustomerTags - 전체 고객 태그 배열
 * @param {number} params.visitCount - 방문 횟수
 * @param {string} params.resultTitle - 결과 제목
 * @param {Array} params.resultSections - 결과 섹션 배열
 * @returns {Object} 업데이트된 고객 태그 객체
 */
export function updateCustomerTags({
  existingCustomerTags = {
    caution: [],
    trait: [],
    payment: [],
    pattern: []
  },
  selectedCustomerTagIds,
  allCustomerTags,
  visitCount,
  resultTitle = '',
  resultSections = []
}) {
  // 기존 태그 복사
  const updatedCustomerTags = { ...existingCustomerTags };
  
  // 선택된 태그 추가
  selectedCustomerTagIds.forEach(tagId => {
    const tag = allCustomerTags.find(t => t.id === tagId);
    if (tag) {
      const category = tag.category;
      if (updatedCustomerTags[category]) {
        const existingLabels = new Set(
          updatedCustomerTags[category].map(t => 
            typeof t === 'string' ? t : t.label || t
          )
        );
        if (!existingLabels.has(tag.label)) {
          updatedCustomerTags[category] = [...updatedCustomerTags[category], tag.label];
        }
      } else {
        updatedCustomerTags[category] = [tag.label];
      }
    }
  });
  
  // 방문 횟수에 따른 패턴 태그 업데이트
  if (visitCount >= 2) {
    const patternTags = updatedCustomerTags.pattern || [];
    updatedCustomerTags.pattern = patternTags.filter(tag => tag !== '신규');
    if (!updatedCustomerTags.pattern.includes('기존')) {
      updatedCustomerTags.pattern = [...updatedCustomerTags.pattern, '기존'];
    }
  } else {
    const patternTags = updatedCustomerTags.pattern || [];
    if (!patternTags.includes('신규')) {
      updatedCustomerTags.pattern = [...patternTags, '신규'];
    }
  }
  
  // 내용 분석으로 주의사항 태그 자동 추가
  const allContent = [
    resultTitle || '',
    ...resultSections.flatMap(section => 
      (section.content || []).join(' ')
    )
  ].join(' ').toLowerCase();
  
  if (allContent.includes('임산부')) {
    const cautionTags = updatedCustomerTags.caution || [];
    if (!cautionTags.includes('임산부')) {
      updatedCustomerTags.caution = [...cautionTags, '임산부'];
    }
  }
  
  if (allContent.includes('글루알러지') || allContent.includes('글루 알러지')) {
    const cautionTags = updatedCustomerTags.caution || [];
    if (!cautionTags.includes('글루알러지')) {
      updatedCustomerTags.caution = [...cautionTags, '글루알러지'];
    }
  }
  
  if (allContent.includes('눈물많음') || allContent.includes('눈물 많음') || allContent.includes('눈물이 많')) {
    const cautionTags = updatedCustomerTags.caution || [];
    if (!cautionTags.includes('눈물많음')) {
      updatedCustomerTags.caution = [...cautionTags, '눈물많음'];
    }
  }
  
  return updatedCustomerTags;
}

/**
 * 신규 고객 객체 생성
 * @param {Object} params - 고객 생성 파라미터
 * @param {string} params.name - 고객 이름
 * @param {string} params.phone - 전화번호
 * @param {string} params.dateStr - 날짜 문자열
 * @param {Array} params.customers - 기존 고객 배열 (ID 생성용)
 * @param {Object} params.customerTags - 고객 태그 객체
 * @returns {Object} 신규 고객 객체
 */
export function createNewCustomer({
  name,
  phone,
  dateStr,
  customers,
  customerTags
}) {
  const newCustomerId = Math.max(...customers.map(c => c.id), 0) + 1;
  
  return {
    id: newCustomerId,
    name: name.trim(),
    phone: phone.trim(),
    visitCount: 1,
    lastVisit: dateStr,
    avatar: '👤',
    tags: [],
    customerTags: customerTags
  };
}



