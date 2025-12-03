// Vercel Edge Runtime 사용 (FormData 지원)
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[Transcribe API] OPENAI_API_KEY not set');
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY is not set on the server' }),
        { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Transcribe API] 음성 인식 요청 받음');

    // FormData 받기
    const formData = await req.formData();
    const audioFile = formData.get('audio');

    if (!audioFile) {
      console.error('[Transcribe API] 오디오 파일이 없음');
      return new Response(
        JSON.stringify({ error: '오디오 파일이 필요합니다.' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Transcribe API] 오디오 파일 크기:', audioFile.size, 'bytes');

    // OpenAI Whisper API에 FormData 전송
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile, 'audio.webm');
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', 'ko'); // 한국어로 지정

    console.log('[Transcribe API] OpenAI Whisper API 호출 시작');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: whisperFormData,
    });

    console.log('[Transcribe API] Whisper API 응답 상태:', whisperResponse.status);

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('[Transcribe API] Whisper API 오류:', whisperResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to transcribe audio', detail: errorText }),
        { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    const whisperData = await whisperResponse.json();
    const transcript = whisperData.text || '';

    console.log('[Transcribe API] 변환된 텍스트:', transcript.substring(0, 100) + '...');
    console.log('[Transcribe API] 텍스트 길이:', transcript.length);

    return new Response(
      JSON.stringify({
        ok: true,
        transcript,
      }),
      { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[Transcribe API] 서버 오류:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: err.message }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }
}

