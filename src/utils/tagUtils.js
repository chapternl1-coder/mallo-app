// 태그 관련 유틸 함수들

export function migrateTagsToObjects(tags) {
  if (!tags || typeof tags !== 'object') return tags;
  
  // 속눈썹 관련 태그의 명시적 키워드 정의
  const eyelashKeywords = {
    '속눈썹연장': ['속눈썹연장', '속눈썹 연장'],
    '속눈썹펌': ['속눈썹펌', '속눈썹 펌']
  };
  
  const migrated = {};
  Object.keys(tags).forEach(category => {
    const categoryTags = tags[category];
    if (Array.isArray(categoryTags)) {
      migrated[category] = categoryTags.map((tag, index) => {
        // 이미 객체인 경우
        if (typeof tag === 'object' && tag.label) {
          // 속눈썹 관련 태그인데 키워드가 없거나 비어있으면 추가
          if (eyelashKeywords[tag.label] && (!tag.keywords || tag.keywords.length === 0)) {
            return {
              ...tag,
              keywords: eyelashKeywords[tag.label]
            };
          }
          return tag;
        }
        // 문자열인 경우 객체로 변환
        if (typeof tag === 'string') {
          // 속눈썹 관련 태그면 키워드 추가
          const keywords = eyelashKeywords[tag] || [];
          return {
            id: `${category}-${Date.now()}-${index}`,
            label: tag,
            keywords: keywords
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
  // 속눈썹 관련 태그는 명시적 키워드 설정으로 대체하므로 여기서는 제외
  // '리터치', '연장' 같은 포괄적 키워드는 제거하고 구체적인 키워드만 사용
  const keywordMap = {
    'D컬': ['d컬', '디컬', 'd 컬', 'D컬', '디 컬'],
    'C컬': ['c컬', '씨컬', 'c 컬', 'C컬', '씨 컬'],
    '제거': ['제거', '리무버', '리무'],
    '젤네일': ['젤네일', '젤 네일'],
    '아트': ['아트', '네일아트', '네일 아트', '네일아'],
    '영양': ['영양', '영양케어', '영양 케어'],
    '회원권': ['회원권', '멤버십', '멤버']
  };
  
  // 등록된 태그들을 키워드로 매칭 (더 엄격하게)
  allManagedTags.forEach(tagLabel => {
    // 태그 라벨 자체가 포함되어 있는지 확인 (기존 호환성 유지)
    // 하지만 속눈썹 관련 태그는 키워드 기반 매칭으로 이미 처리되므로 제외
    if (!tagLabel.includes('속눈썹') && (contentLower.includes(tagLabel.toLowerCase()) || contentOriginal.includes(tagLabel))) {
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
      // 1) 키워드가 명시적으로 설정된 경우 키워드만 사용
      const hasExplicitKeywords = tag.keywords && tag.keywords.length > 0;
      let searchKeys = [];
      if (hasExplicitKeywords) {
        searchKeys = tag.keywords;
      } else {
        // 키워드가 없는 경우에만 라벨 사용 (기존 호환성 유지)
        searchKeys = [tag.label];
      }

      // 2) 검색 키들을 정규화
      const normalizedKeys = searchKeys
        .map((key) => normalize(key))
        .filter((k) => k.length > 0);

      // 3) 어근 키워드 생성 - 명시적 키워드가 있는 경우 어근 생성 안 함
      let autoKeys = [];
      if (!hasExplicitKeywords) {
        autoKeys = normalizedKeys
          .filter((nk) => nk.length >= 3)
          .flatMap((nk) => generateAutoKeywords(nk))
          .filter((k) => k.length > 0);
      }

      // 4) 최종적으로 비교에 사용할 모든 키
      const allKeys = [...normalizedKeys, ...autoKeys];

      // 5) 요약/원본 안에 어느 하나라도 포함되면 매칭
      const isMatched = allKeys.some((normKey) => {
        const found = normSummary.includes(normKey);
        if (found) {
          console.log('[태그 매칭] 매칭 성공:', tag.label, '-> 키워드:', normKey, hasExplicitKeywords ? '(명시적 키워드)' : '(어근 포함)');
        }
        return found;
      });

      return isMatched;
    })
    .map((tag) => tag.id);

  console.log('[태그 매칭] 최종 매칭된 태그 ID:', matched);
  return matched;
}





















