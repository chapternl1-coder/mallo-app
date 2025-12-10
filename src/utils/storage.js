// localStorage 관련 유틸 함수들

export function loadFromLocalStorage(key, defaultValue) {
  try {
    const item = localStorage.getItem(key);
    if (item) {
      return JSON.parse(item);
    }
  } catch (error) {
    console.error(`localStorage에서 ${key} 불러오기 실패:`, error);
  }
  return defaultValue;
}

export function saveToLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`localStorage에 ${key} 저장 실패:`, error);
  }
}




















