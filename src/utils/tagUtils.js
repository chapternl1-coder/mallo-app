// 태그 관련 유틸 함수들

export function migrateTagsToObjects(tags) {
  if (!tags || typeof tags !== 'object') return tags;
  
  const migrated = {};
  Object.keys(tags).forEach(category => {
    const categoryTags = tags[category];
    if (Array.isArray(categoryTags)) {
      migrated[category] = categoryTags.map((tag, index) => {
        // 이미 객체인 경우 그대로 사용
        if (typeof tag === 'object' && tag.label) {
          return tag;
        }
        // 문자열인 경우 객체로 변환
        if (typeof tag === 'string') {
          return {
            id: `${category}-${Date.now()}-${index}`,
            label: tag,
            keywords: []
          };
        }
        return tag;
      });
    } else {
      migrated[category] = categoryTags;
    }
  });
  
  return migrated;
}

export function normalize(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/\s+/g, '')      // 모든 공백 제거
    .replace(/[#\-,.]/g, '')  // #, -, , . 같은 기호 제거
    .trim();
}

export function generateAutoKeywords(normalizedLabel) {
  const len = normalizedLabel.length;
  const results = new Set();

  // 너무 짧은 단어는 건드리지 않는다.
  if (len >= 3) {
    // 마지막 글자 하나 뗀 버전
    results.add(normalizedLabel.slice(0, len - 1));
  }
  if (len >= 4) {
    // 마지막 글자 두 개 뗀 버전
    results.add(normalizedLabel.slice(0, len - 2));
  }

  return Array.from(results);
}

export function parseKeywords(input) {
  if (!input || typeof input !== 'string') return [];
  return input
    .split(',')
    .map((kw) => kw.trim())
    .filter((kw) => kw.length > 0);
}

export function convertVisitTagsToArray(tags) {
  const result = [];
  Object.keys(tags).forEach(category => {
    tags[category].forEach((label, index) => {
      // 이미 객체인 경우와 문자열인 경우 모두 처리
      if (typeof label === 'object' && label.label) {
        result.push({
          id: label.id || `${category}-${index}`,
          label: label.label,
          category: category,
          keywords: label.keywords || []
        });
      } else {
        result.push({
          id: `${category}-${index}-${label}`,
          label: label,
          category: category,
          keywords: []
        });
      }
    });
  });
  return result;
}

export function convertCustomerTagsToArray(tags) {
  const result = [];
  Object.keys(tags).forEach(category => {
    tags[category].forEach((label, index) => {
      if (typeof label === 'object' && label.label) {
        result.push({
          id: label.id || `${category}-${index}`,
          label: label.label,
          category: category,
          keywords: label.keywords || []
        });
      } else {
        result.push({
          id: `${category}-${index}-${label}`,
          label: label,
          category: category,
          keywords: []
        });
      }
    });
  });
  return result;
}

export function extractTagsFromContent(content, managedTags = null) {
  if (!content) return [];
  const tags = [];
  // 한국어와 영문 대소문자 모두 처리
  const contentLower = content.toLowerCase();
  const contentOriginal = content;
  
  // visitTags에서 등록된 모든 태그 가져오기
  const allManagedTags = [];
  if (managedTags) {
    Object.values(managedTags).forEach(categoryTags => {
      if (Array.isArray(categoryTags)) {
        categoryTags.forEach(tagObj => {
          if (typeof tagObj === 'object' && tagObj.label) {
            allManagedTags.push(tagObj.label);
          } else if (typeof tagObj === 'string') {
            allManagedTags.push(tagObj);
          }
        });
      }
    });
  }
  
  // 기본 키워드 매핑 (하드코딩된 키워드 - 호환성 유지)
  const keywordMap = {
    'D컬': ['d컬', '디컬', 'd 컬', 'D컬', '디 컬'],
    'C컬': ['c컬', '씨컬', 'c 컬', 'C컬', '씨 컬'],
    '리터치': ['리터치', '리 터치', '리터'],
    '연장': ['연장'],
    '제거': ['제거', '리무버', '리무'],
    '젤네일': ['젤', '젤네일', '젤 네일', '젤 네일'],
    '아트': ['아트', '네일아트', '네일 아트', '네일아'],
    '영양': ['영양', '영양케어', '영양 케어', '케어'],
    '회원권': ['회원권', '멤버십', '멤버']
  };
  
  // 등록된 태그들을 키워드로 매칭
  allManagedTags.forEach(tagLabel => {
    // 태그 라벨 자체가 포함되어 있는지 확인
    if (contentLower.includes(tagLabel.toLowerCase()) || contentOriginal.includes(tagLabel)) {
      if (!tags.includes(tagLabel)) {
        tags.push(tagLabel);
      }
    }
  });
  
  // 기본 키워드 매핑도 확인 (등록된 태그와 중복되지 않는 경우만)
  Object.keys(keywordMap).forEach(tag => {
    if (!tags.includes(tag)) {
      const keywords = keywordMap[tag];
      const found = keywords.some(keyword => {
        const keywordLower = keyword.toLowerCase();
        return contentLower.includes(keywordLower) || contentOriginal.includes(keyword);
      });
      if (found) {
        tags.push(tag);
      }
    }
  });
  
  return tags;
}

export function matchTagsFromSummary(sourceText, tags) {
  if (!sourceText || !tags || tags.length === 0) return [];
  
  // 빈 텍스트나 공백만 있는 경우 매칭하지 않음
  const trimmedText = sourceText.trim();
  if (!trimmedText || trimmedText.length === 0) return [];
  
  const normSummary = normalize(sourceText);
  
  // 정규화된 텍스트도 비어있으면 매칭하지 않음
  if (!normSummary || normSummary.length === 0) return [];
  
  console.log('[태그 매칭] 정규화된 텍스트:', normSummary.substring(0, 200));
  console.log('[태그 매칭] 전체 태그 개수:', tags.length);
  
  const matched = tags
    .filter((tag) => {
      // 1) 기본 키(라벨 + 수동 키워드)
      const baseKeys = [tag.label, ...(tag.keywords || [])];

      // 2) 기본 키들을 정규화
      const normalizedKeys = baseKeys
        .map((key) => normalize(key))
        .filter((k) => k.length > 0);

      // 3) 각 키에서 자동으로 어근 키워드를 생성
      const autoKeys = normalizedKeys
        .flatMap((nk) => generateAutoKeywords(nk))
        .filter((k) => k.length > 0);

      // 4) 최종적으로 비교에 사용할 모든 키
      const allKeys = [...normalizedKeys, ...autoKeys];

      // 5) 요약/원본 안에 어느 하나라도 포함되면 매칭
      const isMatched = allKeys.some((normKey) => {
        const found = normSummary.includes(normKey);
        if (found) {
          console.log('[태그 매칭] 매칭 성공:', tag.label, '-> 키워드:', normKey, '(어근 포함)');
        }
        return found;
      });
      
      return isMatched;
    })
    .map((tag) => tag.id);
  
  console.log('[태그 매칭] 최종 매칭된 태그 ID:', matched);
  return matched;
}


