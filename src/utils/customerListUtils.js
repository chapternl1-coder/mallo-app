// 고객 리스트 관련 유틸 함수들
// 
// 변경 이력:
// - 모든 고객 검색/필터 로직을 이 파일로 통합
// - HomeScreen.jsx에서 사용 중

/**
 * 전화번호에서 하이픈과 공백을 제거하여 정규화
 * @param {string} phone - 전화번호 문자열
 * @returns {string} 정규화된 전화번호
 */
export function normalizePhone(phone) {
  return phone.replace(/[-\s]/g, '');
}

/**
 * 검색어로 고객 리스트를 필터링 및 정렬
 * 이름과 전화번호로 검색 지원 (전화번호는 하이픈/공백 무시)
 * 정확 일치 우선 정렬 적용
 * 
 * 사용처:
 * - HomeScreen.jsx: 고객 검색 기능
 * - ReservationScreen.jsx: 고객 자동완성 기능
 * 
 * @param {Array} customers - 고객 리스트
 * @param {string} searchQuery - 검색어
 * @param {number} maxResults - 최대 결과 개수 (기본값: 무제한)
 * @returns {Array} 필터링 및 정렬된 고객 리스트
 */
export function filterCustomersBySearch(customers, searchQuery, maxResults = null) {
  if (!searchQuery || !searchQuery.trim()) {
    return customers;
  }

  const query = searchQuery.toLowerCase().trim();
  const normalizedQuery = normalizePhone(query);

  // 필터링
  const filtered = customers.filter(customer => {
    // 이름 검색
    const nameMatch = customer.name.toLowerCase().includes(query);
    
    // 전화번호 검색 (하이픈과 공백 제거 후 비교)
    const normalizedCustomerPhone = normalizePhone(customer.phone || '');
    const phoneMatch = normalizedCustomerPhone.includes(normalizedQuery);
    
    return nameMatch || phoneMatch;
  });

  // 정확 일치 우선 정렬
  const sorted = filtered.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    
    // 정확 일치 우선
    const aExactMatch = aName === query;
    const bExactMatch = bName === query;
    if (aExactMatch && !bExactMatch) return -1;
    if (!aExactMatch && bExactMatch) return 1;
    
    // 시작 일치 우선
    const aStartsWith = aName.startsWith(query);
    const bStartsWith = bName.startsWith(query);
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    
    // 그 외는 원본 순서 유지
    return 0;
  });

  // 최대 결과 개수 제한
  if (maxResults && maxResults > 0) {
    return sorted.slice(0, maxResults);
  }

  return sorted;
}

