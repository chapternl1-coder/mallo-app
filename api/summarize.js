export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY not set');
      res.status(500).json({ error: 'OPENAI_API_KEY is not set on the server' });
      return;
    }

    const { sourceText } = req.body || {};
    if (!sourceText || typeof sourceText !== 'string') {
      res.status(400).json({ error: 'sourceText(요약할 텍스트)가 필요합니다.' });
      return;
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              '너는 30년 경력의 뷰티샵(네일/왁싱/속눈썹/헤어/피부관리) 시술 기록 및 고객 히스토리 작성 전문가야.\n\n' +
              '**중요: 입력된 텍스트를 그대로 반환하지 말고, 반드시 요약하고 정리해서 돌려줘.**\n\n' +
              '입력 텍스트를 분석해서 실제 뷰티샵 업무에서 바로 사용할 수 있는 "고객별 시술 히스토리 로그" 형식으로 상세하게 정리해줘.\n\n' +
              '반드시 다음 JSON 형식으로만 응답해야 해:\n' +
              '{\n' +
              '  "title": "시술 내용 요약 (고객 이름 제외, 순수 시술 행위만)",\n' +
              '  "customerInfo": {\n' +
              '    "name": "고객 이름 (없으면 null)",\n' +
              '    "phone": "전화번호 (없으면 null)"\n' +
              '  },\n' +
              '  "sections": [\n' +
              '    {\n' +
              '      "title": "섹션 제목",\n' +
              '      "content": ["항목 1", "항목 2", "항목 3"]\n' +
              '    }\n' +
              '  ]\n' +
              '}\n\n' +
              '**필수 섹션 구성 (입력 텍스트에 관련 내용이 있으면 반드시 포함):**\n\n' +
              '1. "고객 기본 정보" (있으면):\n' +
              '   content: ["이름: ○○○ / 전화번호: 010-0000-0000", "구분: 신규/기존", "고객 특징: ..."]\n\n' +
              '2. "방문·예약 정보" (있으면):\n' +
              '   content: ["2025년 12월 1일 (월) 15:00 예약 후 제시간 방문", "지각/변경 여부 등"]\n\n' +
              '3. "현재 상태·고객 고민" (있으면):\n' +
              '   content: ["모발/피부/손톱 상태", "고객이 말한 불편/고민"]\n\n' +
              '4. "시술·관리 상세" (필수 - 가장 중요):\n' +
              '   content: ["진행한 시술 단계, 부위", "사용 제품/약제", "컬러/호수", "도포 시간 등 상세 내용"]\n\n' +
              '5. "시술 후 상태·고객 반응" (있으면):\n' +
              '   content: ["만족도", "통증/붓기/트러블", "추가 요청/수정 사항"]\n\n' +
              '6. "주의사항·홈 케어" (있으면):\n' +
              '   content: ["피해야 할 행동", "안내한 홈케어/제품"]\n\n' +
              '7. "다음 방문·추천" (있으면):\n' +
              '   content: ["다음 방문 권장 주기", "다음 시술 아이디어", "리터치 계획"]\n\n' +
              '8. "결제/매출" (있으면):\n' +
              '   content: ["결제 방식", "금액", "특이사항"]\n\n' +
              '9. "참고 메모" (있으면):\n' +
              '   content: ["시술 시 유의할 습관/특이사항", "다음번 시술자가 꼭 알아야 할 정보"]\n\n' +
              '**중요 규칙:**\n' +
              '1. 각 섹션은 입력 텍스트에 관련 내용이 있으면 반드시 포함해야 해. 내용이 없으면 섹션을 생략하지 말고, 가능한 한 정보를 추출해서 작성해줘.\n' +
              '2. 각 섹션의 content는 최소 1개, 많아도 5개 항목까지 작성 가능해. 핵심 정보를 빠뜨리지 말고 상세하게 작성해줘.\n' +
              '3. sections의 content 배열은 반드시 문자열 배열이어야 해. 객체, 배열, 중첩 구조를 절대 넣지 마.\n' +
              '4. 각 content 항목은 반드시 평문 문자열이어야 해. JSON 객체나 JSON 문자열을 넣지 마.\n' +
              '5. 예시: content: ["C컬 9mm 시술", "자연 속눈썹 느낌으로 작업", "롤 크게 사용"] (O)\n' +
              '6. 절대 안 됨: content: [{"curls": "C컬", ...}] 또는 content: ["{\\"curls\\": ...}"] (X)\n' +
              '7. 말버릇, 추임새, 잡담은 모두 제거하고 핵심 사실만 요약해줘.\n' +
              '8. "다음에 이 손님이 왔을 때 보고 싶을 정보" 위주로 정리해줘.',
          },
          {
            role: 'user',
            content: sourceText,
          },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      console.error('OpenAI API error:', openaiRes.status, errorText);
      res.status(500).json({ error: 'Failed to call OpenAI API', detail: errorText });
      return;
    }

    const data = await openaiRes.json();
    let summaryJson = data?.choices?.[0]?.message?.content || '{}';

    // content 배열의 객체를 문자열로 변환하는 헬퍼 함수
    const normalizeContentArray = (content) => {
      if (!Array.isArray(content)) {
        return [];
      }
      
      const result = [];
      content.forEach((item) => {
        if (typeof item === 'string') {
          if (item.trim()) {
            result.push(item);
          }
        } else if (typeof item === 'object' && item !== null) {
          // 객체인 경우 각 키-값을 개별 문자열 항목으로 변환
          Object.entries(item).forEach(([key, value]) => {
            const valStr = typeof value === 'object' && value !== null 
              ? JSON.stringify(value) 
              : String(value || '');
            result.push(`${key}: ${valStr}`);
          });
        } else {
          const str = String(item || '');
          if (str.trim()) {
            result.push(str);
          }
        }
      });
      
      return result;
    };

    // JSON 파싱 및 content 배열 정리
    try {
      const parsed = JSON.parse(summaryJson);
      if (parsed.sections && Array.isArray(parsed.sections)) {
        // sections의 각 content 배열을 정리
        parsed.sections = parsed.sections.map((section) => ({
          ...section,
          content: normalizeContentArray(section.content || []),
        }));
        // 정리된 결과를 다시 JSON 문자열로 변환
        summaryJson = JSON.stringify(parsed);
      }
    } catch (e) {
      // JSON 파싱 실패 시 원본 사용
      console.warn('Failed to normalize summary JSON:', e);
    }

    res.status(200).json({
      ok: true,
      summaryJson,
    });
  } catch (err) {
    console.error('Server summarize error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
