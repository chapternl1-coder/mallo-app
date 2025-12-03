// 포맷 관련 유틸 함수들

export function formatPhoneNumber(value) {
  // 숫자가 아닌 문자 모두 제거
  const numbers = value.replace(/[^0-9]/g, '');
  
  // 길이에 따라 포맷팅
  if (numbers.length <= 3) {
    return numbers;
  } else if (numbers.length <= 7) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  } else if (numbers.length <= 11) {
    // 010-XXXX-XXXX 형식
    if (numbers.startsWith('010') || numbers.startsWith('011') || numbers.startsWith('016') || numbers.startsWith('017') || numbers.startsWith('018') || numbers.startsWith('019')) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    } else {
      // 지역번호 (02, 031, 032 등)
      if (numbers.startsWith('02')) {
        return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`;
      } else {
        return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
      }
    }
  } else {
    // 11자리 초과 시 앞 11자리만 사용
    const limited = numbers.slice(0, 11);
    if (limited.startsWith('010') || limited.startsWith('011') || limited.startsWith('016') || limited.startsWith('017') || limited.startsWith('018') || limited.startsWith('019')) {
      return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`;
    } else if (limited.startsWith('02')) {
      return `${limited.slice(0, 2)}-${limited.slice(2, 6)}-${limited.slice(6)}`;
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`;
    }
  }
}








