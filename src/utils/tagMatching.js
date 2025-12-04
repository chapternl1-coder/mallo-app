// 태그 매칭 유틸 함수

/**
 * 요약 섹션 배열을 받아 방문/프로필 태그를 다시 계산하는 공용 함수
 * @param {Object} params
 * @param {Array} params.summarySections - 요약 섹션 배열 [{ title, content }]
 * @param {Array} params.allTags - 전체 태그 배열 [{ id, label, patterns, scope }]
 * @returns {Object} { visitTags: [tagId], profileTags: [tagId] }
 */
export function runAutoTagMatchingForVisit({ summarySections, allTags }) {
  const normalizedText = summarySections
    .map((section) => `${section.title || ''}\n${section.content || ''}`)
    .join('\n\n')
    .toLowerCase();

  console.log('[태그 매칭] 정규화 텍스트:', normalizedText);

  const visitTags = [];
  const profileTags = [];

  allTags.forEach((tag) => {
    // patterns가 없으면 keywords를 사용 (기존 구조 호환)
    const patterns = tag.patterns || tag.keywords || [];
    if (patterns.length === 0) return;

    const isMatched = patterns.some((pattern) =>
      normalizedText.includes(pattern.toLowerCase())
    );

    if (isMatched) {
      // scope가 있으면 scope로 판단, 없으면 category나 태그 타입으로 판단
      if (tag.scope === 'visit') {
        visitTags.push(tag.id);
      } else if (tag.scope === 'profile') {
        profileTags.push(tag.id);
      } else {
        // scope가 없으면 기본적으로 visit 태그로 처리
        // (기존 코드베이스 구조에 맞춤)
        visitTags.push(tag.id);
      }
    }
  });

  console.log('[태그 매칭] 최종 방문 태그 ID:', visitTags);
  console.log('[태그 매칭] 최종 프로필 태그 ID:', profileTags);

  return { visitTags, profileTags };
}

