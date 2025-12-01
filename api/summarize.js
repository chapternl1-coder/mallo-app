module.exports = async (req, res) => {
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
              '너는 뷰티샵(속눈썹, 헤어, 네일 등) 원장님을 위한 시술 기록 요약 도우미야. ' +
              '입력된 텍스트를 기반으로, 시술 내용/주의사항/결제 정보를 중심으로 한국어로 요약해줘. ' +
              'JSON 객체 형태로 name, service, price, note 같은 필드를 포함해서 돌려줘.',
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
      summary: JSON.parse(summaryJson),
    });
  } catch (error) {
    console.error('Summarize API error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

