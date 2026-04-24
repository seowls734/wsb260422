// Google Gemini (Generative Language API v1beta) 호출 모듈.
// - 모델 폴백: gemini-2.5-flash → gemini-1.5-flash
// - 2.5-flash에는 googleSearch grounding 활성화(실시간 검색 내장).
//   1.5-flash는 tools 스키마가 다르므로(googleSearchRetrieval) 단순화를 위해 tools 제외.
// - API 키는 URL 쿼리스트링으로 전달(표준)
// - 503/429 에러는 자동 재시도(2→4→8초, 최대 3회). 404 등은 즉시 다음 모델로 폴백.

import { withRetry } from './retry.js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL_FALLBACK_CHAIN = [
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash',
];
const MAX_OUTPUT_TOKENS = 400;

/**
 * Gemini에게 응답을 요청합니다.
 * @param {string} apiKey
 * @param {string} systemPrompt
 * @param {Array<{speaker: 'gpt'|'gemini'|'user', text: string}>} history
 * @param {{ onRetry?: Function }} [options]
 * @returns {Promise<{text: string, usedSearch: boolean, sources: Array<{title?: string, url: string}>}>}
 */
export async function callGemini(apiKey, systemPrompt, history, options = {}) {
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되어 있지 않습니다.');
  }

  // 대화 이력 변환: self(gemini)=model, 그 외('user'/'gpt')=user
  const contents = history.map((m) => ({
    role: m.speaker === 'gemini' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));

  // Gemini v1beta 규칙:
  // 1) contents는 반드시 user로 시작
  if (contents.length === 0 || contents[0].role !== 'user') {
    contents.unshift({
      role: 'user',
      parts: [{ text: '대화를 시작해주세요.' }],
    });
  }
  // 2) 마지막이 model이면 user 스텁 추가
  const last = contents[contents.length - 1];
  if (last.role === 'model') {
    contents.push({
      role: 'user',
      parts: [{ text: '계속해주세요.' }],
    });
  }

  let lastErr;
  // 각 모델 호출은 withRetry로 감쌈(503/429 재시도). 404는 즉시 폴백.
  for (const model of MODEL_FALLBACK_CHAIN) {
    const body = buildBody(model, systemPrompt, contents);
    try {
      return await withRetry(() => callGeminiModel(model, apiKey, body), {
        onRetry: options.onRetry,
      });
    } catch (err) {
      lastErr = err;
      if (!isModelUnavailableError(err)) {
        throw err;
      }
    }
  }
  throw lastErr || new Error('Gemini 모든 모델 폴백 실패');
}

// 모델별 request body 구성. 2.5-flash에만 googleSearch grounding 추가.
function buildBody(model, systemPrompt, contents) {
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
  };

  if (model.startsWith('gemini-2')) {
    // Gemini 2.x 계열: googleSearch 도구 내장(검색 그라운딩)
    body.tools = [{ googleSearch: {} }];
  }
  // 1.5 계열은 tools 스펙이 다르고 기본 grounding이 없음 → tools 생략

  return body;
}

async function callGeminiModel(model, apiKey, body) {
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    throw new Error(`네트워크 오류: ${networkErr.message}`);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data?.error?.message || `HTTP ${response.status}`;
    const err = new Error(`Gemini 오류 (${model}): ${msg}`);
    err.status = response.status;
    err.apiMessage = msg;
    throw err;
  }

  // SAFETY 차단 등으로 content가 없을 수 있음
  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts;
  const text = parts?.map((p) => p.text).filter(Boolean).join('') || '';

  if (!text) {
    const reason = candidate?.finishReason || 'unknown';
    throw new Error(`Gemini 응답이 비어 있습니다 (finishReason: ${reason}).`);
  }

  // 그라운딩 메타데이터에서 검색 사용 여부 + 소스 추출
  const grounding = candidate?.groundingMetadata;
  const chunks = grounding?.groundingChunks || [];
  const rawSources = chunks
    .map((c) => c?.web)
    .filter((w) => w && w.uri)
    .map((w) => ({ title: w.title || undefined, url: w.uri }));
  const sources = dedupeSources(rawSources).slice(0, 5);
  const usedSearch = sources.length > 0 || (grounding?.webSearchQueries?.length || 0) > 0;

  return { text: text.trim(), usedSearch, sources };
}

function dedupeSources(sources) {
  const seen = new Set();
  const out = [];
  for (const s of sources) {
    if (!s?.url || seen.has(s.url)) continue;
    seen.add(s.url);
    out.push(s);
  }
  return out;
}

function isModelUnavailableError(err) {
  if (!err) return false;
  const status = err.status;
  const msg = (err.apiMessage || err.message || '').toLowerCase();
  if (status === 404) return true;
  if (status === 400 && (msg.includes('not found') || msg.includes('not supported'))) {
    return true;
  }
  return false;
}
