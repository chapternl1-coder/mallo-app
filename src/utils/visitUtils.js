// 방문 히스토리 관련 유틸 함수들
// 
// 변경 이력:
// - CustomerDetailScreen.jsx에서 방문 히스토리 관련 순수 함수들을 분리하여 공통화

import { formatRecordDateTime } from './date';

/**
 * "미기재"와 "null"을 실제 고객 정보로 치환
 * @param {string} line - 원본 텍스트 라인
 * @param {Object} customerInfo - 고객 정보 객체 { name, phone }
 * @returns {string} 치환된 텍스트 라인
 */
export function overrideCustomerInfoLine(line, customerInfo) {
  if (!line) return line;
  
  let updated = line;

  // 이름이 미기재나 null로 되어있으면 실제 이름으로 교체
  if (customerInfo?.name) {
    updated = updated.replace(/이름:\s*미기재/g, `이름: ${customerInfo.name}`);
    updated = updated.replace(/이름\s*:\s*미기재/g, `이름: ${customerInfo.name}`);
    updated = updated.replace(/이름:\s*null/gi, `이름: ${customerInfo.name}`);
    updated = updated.replace(/이름\s*:\s*null/gi, `이름: ${customerInfo.name}`);
  }

  // 전화번호가 미기재나 null로 되어있으면 실제 전화번호로 교체
  if (customerInfo?.phone) {
    updated = updated.replace(/전화번호:\s*미기재/g, `전화번호: ${customerInfo.phone}`);
    updated = updated.replace(/전화번호\s*:\s*미기재/g, `전화번호: ${customerInfo.phone}`);
    updated = updated.replace(/전화번호:\s*null/gi, `전화번호: ${customerInfo.phone}`);
    updated = updated.replace(/전화번호\s*:\s*null/gi, `전화번호: ${customerInfo.phone}`);
  }

  return updated;
}

/**
 * 방문 제목에서 고객 이름과 "신규/기존 고객" 텍스트를 제거하여 정리
 * @param {string} title - 원본 제목
 * @param {string} customerName - 고객 이름 (선택)
 * @returns {string} 정리된 제목
 */
export function cleanVisitTitle(title, customerName = null) {
  if (!title) return title || '';
  
  let cleaned = title;
  
  // 고객 이름 제거
  if (customerName && customerName !== '미기재') {
    cleaned = cleaned.replace(new RegExp(customerName, 'g'), '').trim();
  }
  
  // '기존 고객', '신규 고객' 등 제거
  cleaned = cleaned.replace(/기존\s*고객/gi, '').trim();
  cleaned = cleaned.replace(/신규\s*고객/gi, '').trim();
  
  // 연속된 공백 정리
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned || title || '';
}

/**
 * 방문의 날짜/시간을 포맷팅하여 표시용 문자열로 변환
 * @param {Object} visit - 방문 객체
 * @param {string} serviceDateTimeLabel - 서비스 날짜/시간 라벨 (선택)
 * @returns {string} 포맷팅된 날짜/시간 문자열 (예: "2025.12.27 17:30")
 */
export function formatVisitDateTime(visit, serviceDateTimeLabel = null) {
  if (serviceDateTimeLabel) {
    // "2025-12-27 17:30 방문/예약" -> "2025.12.27 17:30"
    const dateTimeMatch = serviceDateTimeLabel.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    if (dateTimeMatch) {
      const [, year, month, day, hour, minute] = dateTimeMatch;
      return `${year}.${month}.${day} ${hour}:${minute}`;
    }
  }
  
  // fallback: recordedAt 사용
  const recordedAt = visit.recordedAt || visit.createdAt || (visit.date && visit.time ? `${visit.date}T${visit.time}:00` : null);
  if (recordedAt) {
    return formatRecordDateTime(recordedAt);
  }
  
  return '';
}

/**
 * 고객 태그를 표시용 배열로 변환 (주의 태그 우선, 방문 횟수에 따른 패턴 태그 처리)
 * @param {Object} customerTags - 고객 태그 객체
 * @param {number} visitCount - 방문 횟수
 * @returns {Array} 표시용 태그 배열 [{ tag: string, type: string }]
 */
export function formatCustomerTagsForDisplay(customerTags = {}, visitCount = 0) {
  const allTags = [];
  const shouldReplaceNewWithExisting = visitCount >= 2;
  
  // 주의 태그 먼저 추가
  if (customerTags.caution && customerTags.caution.length > 0) {
    customerTags.caution.forEach(tag => {
      allTags.push({ tag, type: 'caution' });
    });
  }
  
  // 나머지 태그 추가
  if (customerTags.trait && customerTags.trait.length > 0) {
    customerTags.trait.forEach(tag => {
      allTags.push({ tag, type: 'trait' });
    });
  }
  if (customerTags.payment && customerTags.payment.length > 0) {
    customerTags.payment.forEach(tag => {
      allTags.push({ tag, type: 'payment' });
    });
  }
  if (customerTags.pattern && customerTags.pattern.length > 0) {
    customerTags.pattern.forEach(tag => {
      // 방문 횟수가 2 이상이면 "신규" 태그는 제외하고 "기존" 태그 추가
      if (shouldReplaceNewWithExisting && tag === '신규') {
        // "신규" 태그는 건너뛰고 "기존" 태그가 없으면 추가
        if (!customerTags.pattern.includes('기존')) {
          allTags.push({ tag: '기존', type: 'pattern' });
        }
      } else {
        allTags.push({ tag, type: 'pattern' });
      }
    });
  }
  
  // 방문 횟수가 2 이상이고 "기존" 태그가 없으면 추가
  if (shouldReplaceNewWithExisting && (!customerTags.pattern || !customerTags.pattern.includes('기존'))) {
    // "신규" 태그가 이미 필터링되었는지 확인
    const hasNewTag = customerTags.pattern && customerTags.pattern.includes('신규');
    if (!hasNewTag || allTags.find(t => t.tag === '기존')) {
      // 이미 "기존" 태그가 추가되었거나 "신규" 태그가 없으면 추가하지 않음
    } else {
      allTags.push({ tag: '기존', type: 'pattern' });
    }
  }
  
  return allTags;
}

/**
 * 고객 태그를 ID 배열로 변환
 * @param {Object} customerTags - 고객 태그 객체
 * @param {Array} allCustomerTags - 전체 고객 태그 배열
 * @returns {Array} 태그 ID 배열
 */
export function convertCustomerTagsToIds(customerTags = {}, allCustomerTags = []) {
  const tagLabels = [];
  Object.values(customerTags).forEach(categoryTags => {
    if (Array.isArray(categoryTags)) {
      categoryTags.forEach(tag => {
        const label = typeof tag === 'string' ? tag : tag.label || tag;
        tagLabels.push(label);
      });
    }
  });
  
  return tagLabels
    .map(label => {
      const tag = allCustomerTags.find(t => t.label === label);
      return tag ? tag.id : null;
    })
    .filter(id => id !== null);
}

/**
 * 방문 태그를 ID 배열로 변환
 * @param {Array} visitTagLabels - 방문 태그 레이블 배열
 * @param {Array} allVisitTags - 전체 방문 태그 배열
 * @returns {Array} 태그 ID 배열
 */
export function convertVisitTagsToIds(visitTagLabels = [], allVisitTags = []) {
  return visitTagLabels
    .map(label => {
      const tag = allVisitTags.find(t => t.label === label);
      return tag ? tag.id : null;
    })
    .filter(id => id !== null);
}

