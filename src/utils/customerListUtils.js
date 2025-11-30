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
 * 검색어로 고객 리스트를 필터링
 * 이름과 전화번호로 검색 지원 (전화번호는 하이픈/공백 무시)
 * 
 * 사용처:
 * - HomeScreen.jsx: 고객 검색 기능
 * 
 * @param {Array} customers - 고객 리스트
 * @param {string} searchQuery - 검색어
 * @returns {Array} 필터링된 고객 리스트
 */
export function filterCustomersBySearch(customers, searchQuery) {
  if (!searchQuery || !searchQuery.trim()) {
    return customers;
  }

  const query = searchQuery.toLowerCase();
  const normalizedQuery = normalizePhone(query);

  return customers.filter(customer => {
    // 이름 검색
    const nameMatch = customer.name.toLowerCase().includes(query);
    
    // 전화번호 검색 (하이픈과 공백 제거 후 비교)
    const normalizedCustomerPhone = normalizePhone(customer.phone || '');
    const phoneMatch = normalizedCustomerPhone.includes(normalizedQuery);
    
    return nameMatch || phoneMatch;
  });
}

