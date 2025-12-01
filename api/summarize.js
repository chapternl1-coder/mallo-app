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
              '너는 뷰티샵(네일/왁싱/속눈썹/헤어/피부관리) 원장님을 위한 시술 기록 요약 전문가야.\n\n' +
              '**중요: 입력된 텍스트를 그대로 반환하지 말고, 반드시 요약하고 정리해서 돌려줘.**\n\n' +
              '입력 텍스트를 분석해서 다음을 추출해야 해:\n' +
              '1. 고객 이름, 전화번호\n' +
              '2. 시술 내용 (무엇을 했는지)\n' +
              '3. 주의사항이나 특이사항\n' +
              '4. 결제 정보\n' +
              '5. 다음 방문 예정\n\n' +
              '이 정보들을 실제 뷰티샵 업무에서 바로 사용할 수 있는 "고객별 시술 히스토리 로그" 형식으로 **요약하고 정리**해줘.\n\n' +
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
              '섹션 구성 예시:\n' +
              '- "시술·관리 상세": 실제로 어떤 시술을 했는지 요약\n' +
              '- "주의사항·홈 케어": 고객에게 안내한 주의사항 요약\n' +
              '- "결제/매출": 결제 방법, 금액 등\n' +
              '- "다음 방문·추천": 다음 예약 정보\n\n' +
              '중요 규칙 (절대 위반 금지):\n' +
              '1. 입력 텍스트를 그대로 복사하지 말고 반드시 요약해서 정리해줘.\n' +
              '2. sections의 content 배열은 반드시 문자열 배열이어야 해. 객체, 배열, 중첩 구조를 절대 넣지 마.\n' +
              '3. 각 content 항목은 반드시 평문 문자열이어야 해. JSON 객체나 JSON 문자열을 넣지 마.\n' +
              '4. 예시: content: ["C컬 9mm 시술", "자연 속눈썹 느낌으로 작업"] (O)\n' +
              '5. 절대 안 됨: content: [{"curls": "C컬", ...}] 또는 content: ["{\\"curls\\": ...}"] (X)\n' +
              '6. 객체 정보가 필요하면 "키: 값" 형식의 평문 문자열로 변환해서 넣어.\n' +
              '7. 가능한 섹션: "고객 기본 정보", "방문·예약 정보", "시술·관리 상세", "주의사항·홈 케어", "다음 방문·추천", "결제/매출" 등.\n' +
              '8. "주의사항·홈 케어" 섹션의 content는 각 항목을 평문 문자열로 작성. 예: ["시술 후 눈 비비지 말 것", "오늘은 렌즈 빼고 자도록 안내"]',
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
