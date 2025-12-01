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
              '너는 뷰티샵(네일/왁싱/속눈썹/헤어/피부관리) 원장님을 위한 시술 기록 요약 전문가야. ' +
              '입력된 텍스트를 실제 뷰티샵 업무에서 바로 사용할 수 있는 "고객별 시술 히스토리 로그" 형식으로 정리해줘. ' +
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
              '}\n' +
              '중요 규칙 (절대 위반 금지):\n' +
              '1. sections의 content 배열은 반드시 문자열 배열이어야 해. 객체, 배열, 중첩 구조를 절대 넣지 마.\n' +
              '2. 각 content 항목은 반드시 평문 문자열이어야 해. JSON 객체나 JSON 문자열을 넣지 마.\n' +
              '3. 예시: content: ["컬러: 딥 그린", "스타일: 단색, 아트 없음", "손톱 상태: 좋음"] (O)\n' +
              '4. 절대 안 됨: content: [{"color": "딥 그린", ...}] 또는 content: ["{\\"color\\": ...}"] (X)\n' +
              '5. 객체 정보가 필요하면 "키: 값" 형식의 평문 문자열로 변환해서 넣어.\n' +
              '6. 가능한 섹션: "고객 기본 정보", "방문·예약 정보", "시술·관리 상세", "주의사항·홈 케어", "다음 방문·추천", "결제/매출" 등.\n' +
              '7. "고객 기본 정보" 섹션의 content는 ["이름: ○○○ / 전화번호: 010-0000-0000", "구분: 신규/기존", "고객 특징: ..."] 형식으로 3개 항목으로 구성.\n' +
              '8. "주의사항·홈 케어" 섹션의 content는 각 항목을 "키: 값" 형식의 평문 문자열로 작성. 예: ["컬러: 딥 그린", "스타일: 단색, 아트 없음", "손톱 상태: 좋음", "다음 방문: 3주 뒤 같은 시간", "특수 상황: 임산부"]',
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
    const summaryJson = data?.choices?.[0]?.message?.content || '{}';

    res.status(200).json({
      ok: true,
      summaryJson,
    });
  } catch (err) {
    console.error('Server summarize error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
