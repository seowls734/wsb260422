// AI Chat PWA — Cloudflare Worker API proxy.
// 프론트엔드(GitHub Pages)에서 API 키 없이 호출할 수 있도록
// OpenAI / Gemini / Tavily 요청을 중계합니다. 키는 Worker secret에 저장.

const ALLOWED_ORIGINS = new Set([
  'https://seowls734.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
]);

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const TAVILY_URL = 'https://api.tavily.com/search';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const corsHeaders = buildCorsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (!ALLOWED_ORIGINS.has(origin)) {
      return json({ error: 'origin not allowed' }, 403, corsHeaders);
    }

    const url = new URL(request.url);
    try {
      if (url.pathname === '/openai' && request.method === 'POST') {
        return await proxyOpenAI(request, env, corsHeaders);
      }
      if (url.pathname.startsWith('/gemini/') && request.method === 'POST') {
        const model = url.pathname.slice('/gemini/'.length);
        return await proxyGemini(request, env, model, corsHeaders);
      }
      if (url.pathname === '/tavily' && request.method === 'POST') {
        return await proxyTavily(request, env, corsHeaders);
      }
      return json({ error: 'not found' }, 404, corsHeaders);
    } catch (err) {
      return json({ error: err.message || 'internal error' }, 500, corsHeaders);
    }
  },
};

function buildCorsHeaders(origin) {
  const h = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (ALLOWED_ORIGINS.has(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
  }
  return h;
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

async function proxyOpenAI(request, env, corsHeaders) {
  if (!env.OPENAI_API_KEY) {
    return json({ error: { message: 'OPENAI_API_KEY not configured' } }, 500, corsHeaders);
  }
  const body = await request.text();
  const upstream = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body,
  });
  return passthrough(upstream, corsHeaders);
}

async function proxyGemini(request, env, model, corsHeaders) {
  if (!env.GEMINI_API_KEY) {
    return json({ error: { message: 'GEMINI_API_KEY not configured' } }, 500, corsHeaders);
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) {
    return json({ error: { message: 'invalid model' } }, 400, corsHeaders);
  }
  const body = await request.text();
  const upstream = await fetch(
    `${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    },
  );
  return passthrough(upstream, corsHeaders);
}

async function proxyTavily(request, env, corsHeaders) {
  if (!env.TAVILY_API_KEY) {
    return json({ error: 'TAVILY_API_KEY not configured' }, 500, corsHeaders);
  }
  const incoming = await request.json().catch(() => ({}));
  const upstream = await fetch(TAVILY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: env.TAVILY_API_KEY,
      query: incoming.query || '',
      max_results: 5,
      search_depth: 'basic',
      include_answer: true,
    }),
  });
  return passthrough(upstream, corsHeaders);
}

async function passthrough(upstream, corsHeaders) {
  const headers = new Headers(corsHeaders);
  headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json');
  return new Response(upstream.body, { status: upstream.status, headers });
}
