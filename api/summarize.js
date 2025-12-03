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

    const { sourceText, systemPrompt, today } = req.body || {};
    if (!sourceText || typeof sourceText !== 'string') {
      res.status(400).json({ error: 'sourceText(요약할 텍스트)가 필요합니다.' });
      return;
    }

    // 클라이언트에서 보낸 systemPrompt 사용, 없으면 기본 프롬프트 사용
    const finalSystemPrompt = systemPrompt || 
      '너는 30년 경력의 뷰티샵(네일/왁싱/속눈썹/헤어/피부관리) 시술 기록 및 고객 히스토리 작성 전문가야.\n\n' +
      '입력 텍스트를 분석해서 실제 뷰티샵 업무에서 바로 사용할 수 있는 "고객별 시술 히스토리 로그" 형식으로 상세하게 정리해줘.';

    // today 값이 있으면 user message에 포함
    const userMessage = today 
      ? `오늘 날짜: ${today}\n\n원문 텍스트:\n${sourceText}`
      : sourceText;

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
            content: finalSystemPrompt,
          },
          {
            role: 'user',
            content: userMessage,
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
      
      // null 값을 확인하는 헬퍼 함수
      const isNullValue = (value) => {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') {
          const trimmed = value.trim().toLowerCase();
          return trimmed === '' || trimmed === 'null' || trimmed === 'undefined';
        }
        return false;
      };
      
      // 문자열에서 "키: null" 형태를 필터링하는 함수
      const cleanNullFromString = (str) => {
        // "이름: null", "전화번호: null" 같은 패턴 제거
        const parts = str.split('/').map(part => part.trim()).filter(part => {
          // "키: null" 형태를 체크
          if (part.includes(':')) {
            const [, value] = part.split(':').map(s => s.trim());
            return !isNullValue(value);
          }
          return !isNullValue(part);
        });
        
        return parts.length > 0 ? parts.join(' / ') : null;
      };
      
      const result = [];
      content.forEach((item) => {
        if (typeof item === 'string') {
          // 빈 문자열이나 null 문자열이면 스킵
          if (isNullValue(item)) {
            return;
          }
          
          // "키: null" 형태가 포함된 경우 정리
          const cleaned = cleanNullFromString(item);
          if (!cleaned || isNullValue(cleaned)) {
            return;
          }
          
          result.push(cleaned);
        } else if (typeof item === 'object' && item !== null) {
          // 객체인 경우 각 키-값을 개별 문자열 항목으로 변환 (null 값 필터링)
          Object.entries(item).forEach(([key, value]) => {
            if (isNullValue(value)) return;
            const valStr = typeof value === 'object' && value !== null 
              ? JSON.stringify(value) 
              : String(value);
            result.push(`${key}: ${valStr}`);
          });
        } else {
          // 그 외의 경우 문자열로 변환
          if (!isNullValue(item)) {
            const str = String(item);
            if (!isNullValue(str)) {
              result.push(str);
            }
          }
        }
      });
      
      return result.filter(item => item && !isNullValue(item)); // 빈 항목 및 null 제거
    };

    // JSON 파싱 및 content 배열 정리
    try {
      const parsed = JSON.parse(summaryJson);
      if (parsed.sections && Array.isArray(parsed.sections)) {
        // sections의 각 content 배열을 정리하고 빈 섹션 필터링
        parsed.sections = parsed.sections
          .map((section) => ({
            ...section,
            content: normalizeContentArray(section.content || []),
          }))
          .filter(section => section.content && section.content.length > 0); // 빈 섹션 제거
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
