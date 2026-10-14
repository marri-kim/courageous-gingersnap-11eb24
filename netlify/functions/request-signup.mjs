import { createHash, timingSafeEqual } from 'node:crypto';

const projectUrl = 'https://xknxkvyockyirgffendt.supabase.co';
const defaultRedirect = 'https://courageous-gingersnap-11eb24.netlify.app/?invite=1';

function reply(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

function equalsSafely(first, second) {
  const a = createHash('sha256').update(first).digest();
  const b = createHash('sha256').update(second).digest();
  return timingSafeEqual(a, b);
}

export default async function handler(request) {
  if (request.method !== 'POST') return reply(405, { error: 'POST 요청만 지원합니다.' });
  // Disable registration unless explicitly configured by site operator.
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const code = process.env.SIGNUP_APPROVAL_CODE;
  if (process.env.SIGNUP_ENABLED !== 'true' || !secretKey || !code) {
    return reply(503, { error: '회원가입 준비 중입니다. 관리자 설정을 확인해 주세요.' });
  }
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return reply(403, { error: '허용되지 않은 요청입니다.' });
  }
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) {
    return reply(415, { error: 'JSON 요청만 지원합니다.' });
  }

  try {
    const raw = await request.text();
    if (raw.length > 600) return reply(413, { error: '요청이 너무 깁니다.' });
    const body = JSON.parse(raw);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const providedCode = typeof body.approvalCode === 'string' ? body.approvalCode : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || providedCode.length > 100) {
      return reply(400, { error: '이메일과 승인번호 입력 내용을 확인해 주세요.' });
    }
    if (!equalsSafely(providedCode, code)) {
      return reply(403, { error: '관리자 허가번호가 올바르지 않습니다.' });
    }

    const redirect = process.env.SIGNUP_REDIRECT_URL || defaultRedirect;
    if (!redirect.startsWith('https://')) return reply(503, { error: '가입 링크 설정에 문제가 있습니다.' });
    const endpoint = new URL(projectUrl + '/auth/v1/invite');
    endpoint.searchParams.set('redirect_to', redirect);
    // Secret stays on the server. "apikey" is required for modern sb_secret keys.
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: secretKey,
        Authorization: 'Bearer ' + secretKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(14000)
    });
    if (!response.ok) {
      // Do not expose Supabase's response body or email-account existence.
      console.error('Signup invite error HTTP', response.status);
      if (response.status === 429) {
        return reply(429, { error: '초대 메일 요청이 너무 많습니다. 나중에 다시 시도해 주세요.' });
      }
      return reply(503, { error: '초대 메일을 보내지 못했습니다. 관리자에게 확인해 주세요.' });
    }
    return reply(200, {
      message: '가입 안내 메일을 보냈습니다. 이메일에서 초대 링크를 열고 비밀번호를 설정해 주세요.'
    });
  } catch (error) {
    console.error('Signup invite exception:', error.name);
    return reply(502, { error: '회원가입 연결에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
  }
}

export const config = {
  path: '/api/request-signup',
  rateLimit: { windowSize: 60, windowLimit: 3, aggregateBy: ['ip', 'domain'] }
};
