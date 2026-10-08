import { createHash, timingSafeEqual } from 'node:crypto';

const json = (status, data) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  }
});

function sameSecret(a, b) {
  const left = createHash('sha256').update(a, 'utf8').digest();
  const right = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(left, right);
}

async function openaiRequest(path, payload, apiKey) {
  const response = await fetch('https://api.openai.com/v1/' + path, {
    method: 'POST',
    headers: {
      'authorization': 'Bearer ' + apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(22000)
  });
  if (!response.ok) {
    if (response.status === 429) {
      const error = new Error('RATE_LIMIT');
      error.status = 429;
      throw error;
    }
    throw new Error('OpenAI request failed: ' + response.status);
  }
  return response.json();
}

const looksLikePersonalInfo = (text) =>
  /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text) ||
  /(?:01[016789])[-. ]?\d{3,4}[-. ]?\d{4}/.test(text) ||
  /\b\d{6}[- ]?[1-4]\d{6}\b/.test(text) ||
  /(?:비밀번호|패스워드|password|주민등록번호|집\s*주소)\s*[:=]/i.test(text);

const guidance = [
  '너는 초등학생과 중학생을 위한 AI 기초 학습 도우미이다.',
  '항상 한국어로 쉽고 짧게, 최대 5문장으로 설명하고 생활 속 예시 1개를 포함한다.',
  '모르는 내용은 모른다고 하고, 중요한 사실은 다른 믿을 만한 자료로 확인하라고 안내한다.',
  '학생의 개인정보를 요청하지 않으며 개인정보가 보이면 반복하거나 활용하지 않는다.',
  '위험하거나 연령에 맞지 않는 요청은 구체적 방법 대신 안전하고 교육적인 설명으로 전환한다.',
  '상담사나 실제 사람이 아님을 명확히 하고, 위급한 상황에서는 보호자 또는 신뢰할 수 있는 어른에게 도움을 요청하도록 한다.',
  '교육용 AI 사용법과 기초 개념 관련 질문에 우선 답한다.'
].join(' ');

export default async function handler(request) {
  if (request.method !== 'POST') return json(405, { error: 'POST 요청만 지원합니다.' });

  // 공개 학생 서비스로 전환하기 전에는 운영자가 직접 활성화해야 합니다.
  if (process.env.AI_CHAT_ENABLED !== 'true') {
    return json(503, { error: 'AI 체험은 아직 준비 중입니다.' });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  const accessCode = process.env.AI_DEMO_ACCESS_CODE;
  if (!apiKey || !accessCode || accessCode.length < 10) {
    return json(503, { error: '운영자의 AI 설정이 아직 완료되지 않았습니다.' });
  }

  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) {
    return json(415, { error: 'JSON 형식으로 요청해 주세요.' });
  }

  try {
    const raw = await request.text();
    if (raw.length > 1500) return json(413, { error: '요청이 너무 깁니다.' });
    let body;
    try { body = JSON.parse(raw); }
    catch { return json(400, { error: '요청 형식을 확인해 주세요.' }); }

    const code = typeof body.accessCode === 'string' ? body.accessCode : '';
    if (!sameSecret(code, accessCode)) {
      return json(403, { error: '테스트 코드를 확인해 주세요.' });
    }

    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (question.length < 2 || question.length > 300) {
      return json(400, { error: '질문은 2~300자로 입력해 주세요.' });
    }
    if (looksLikePersonalInfo(question)) {
      return json(400, { error: '개인정보를 빼고 질문을 다시 적어 주세요.' });
    }

    const moderation = await openaiRequest('moderations', {
      model: 'omni-moderation-latest', input: question
    }, apiKey);
    if (moderation.results?.[0]?.flagged !== false) {
      return json(422, { error: '안전을 위해 이 질문에는 답할 수 없어요. 다른 학습 질문을 해 주세요.' });
    }

    const output = await openaiRequest('responses', {
      model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
      instructions: guidance,
      input: question,
      max_output_tokens: 350,
      reasoning: { effort: 'none' },
      store: false
    }, apiKey);

    const answer = (output.output || [])
      .filter(item => item.type === 'message')
      .flatMap(item => item.content || [])
      .filter(item => item.type === 'output_text')
      .map(item => item.text || '')
      .join('\n').trim();

    if (!answer) return json(502, { error: '답변을 생성하지 못했습니다. 다시 시도해 주세요.' });

    const outgoingCheck = await openaiRequest('moderations', {
      model: 'omni-moderation-latest', input: answer
    }, apiKey);
    if (outgoingCheck.results?.[0]?.flagged !== false) {
      return json(422, { error: '안전을 위해 답변을 표시할 수 없습니다. 다른 질문을 해 주세요.' });
    }

    return json(200, { answer: answer.slice(0, 2000) });
  } catch (error) {
    if (error.status === 429) return json(429, { error: '잠시 요청이 많아요. 조금 뒤에 다시 시도해 주세요.' });
    // 원본 학생 질문 및 비밀 키는 로그에 기록하지 않습니다.
    console.error('AI function error:', error.name, error.message);
    return json(502, { error: 'AI 서버 연결에 문제가 생겼어요. 잠시 뒤에 다시 시도해 주세요.' });
  }
}

export const config = {
  path: '/api/ask-ai',
  rateLimit: {
    windowLimit: 5,
    windowSize: 60,
    aggregateBy: ['ip', 'domain']
  }
};
