// OpenAI Chat Completions API 호출 모듈.
// - 모델 폴백: gpt-4.1-mini → gpt-4o-mini (4.1-mini가 계정에서 접근 불가할 때 대비)
// - max_tokens: 400
// - Tavily 키가 있으면 web_search 함수 도구 활성화(function calling 루프)
// - 503/429 에러는 자동 재시도(라운드별로 독립 withRetry).

import { withRetry } from './retry.js';
import { tavilySearch } from './tavily.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL_FALLBACK_CHAIN = ['gpt-4.1-mini', 'gpt-4o-mini'];
const MAX_TOKENS = 400;
const MAX_TOOL_ROUNDS = 3; // tool_call 무한 루프 가드

/**
 * GPT에게 응답을 요청합니다.
 * @param {string} apiKey - OpenAI API 키 (sk-...)
 * @param {string} systemPrompt - 시스템 프롬프트
 * @param {Array<{speaker: 'gpt'|'gemini'|'user', text: string}>} history - 지금까지의 대화 이력
 * @param {{ onRetry?: Function, tavilyKey?: string }} [options]
 * @returns {Promise<string>} - GPT의 최종 응답 텍스트
 */
export async function callGPT(apiKey, systemPrompt, history, options = {}) {
  if (!apiKey) {
    throw new Error('OpenAI API 키가 설정되어 있지 않습니다.');
  }

  const { onRetry, tavilyKey } = options;

  // 1) 초기 messages 빌드
  // role 매핑: self(gpt)=assistant, 그 외('user'/'gemini')=user
  const messages = [{ role: 'system', content: systemPrompt }];
  for (const m of history) {
    messages.push({
      role: m.speaker === 'gpt' ? 'assistant' : 'user',
      content: m.text,
    });
  }
  const last = messages[messages.length - 1];
  if (last.role === 'system' || last.role === 'assistant') {
    messages.push({ role: 'user', content: '대화를 시작하거나 이어가주세요.' });
  }

  // 2) tools 정의 (Tavily 키 있을 때만)
  const tools = tavilyKey ? buildTools() : undefined;

  // 3) 모델 폴백 루프: 각 모델에 대해 tool_call 루프 실행
  let lastErr;
  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      return await runToolLoop({
        model,
        apiKey,
        messages,
        tools,
        tavilyKey,
        onRetry,
      });
    } catch (err) {
      lastErr = err;
      if (!isModelUnavailableError(err)) {
        throw err;
      }
      // 다음 모델로 폴백
    }
  }
  throw lastErr || new Error('OpenAI 모든 모델 폴백 실패');
}

// ─────────────────────────────────────────────────────────────
// function calling 루프
// ─────────────────────────────────────────────────────────────
async function runToolLoop({ model, apiKey, messages, tools, tavilyKey, onRetry }) {
  // messages는 이 함수 내에서만 계속 push하므로 원본 보호를 위해 얕은 복사
  const workingMessages = [...messages];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // 라운드별 독립 withRetry — 재시도 시 앞서 쌓인 tool 결과가 날아가지 않음
    const data = await withRetry(
      () => doRequestRaw(model, apiKey, workingMessages, tools),
      { onRetry },
    );

    const msg = data?.choices?.[0]?.message;
    if (!msg) {
      throw new Error('OpenAI 응답이 비어 있습니다.');
    }

    const toolCalls = msg.tool_calls || [];

    // 3a) tool_calls 없으면 최종 답변
    if (toolCalls.length === 0) {
      const text = msg.content?.trim();
      if (!text) {
        throw new Error('OpenAI 응답이 비어 있습니다.');
      }
      return text;
    }

    // 3b) tool_calls 있으면: assistant 메시지 + 각 호출 실행 결과 push
    workingMessages.push({
      role: 'assistant',
      content: msg.content ?? null,
      tool_calls: toolCalls,
    });

    for (const tc of toolCalls) {
      const result = await executeToolCall(tc, tavilyKey);
      workingMessages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: result,
      });
    }
    // 다음 라운드로
  }

  throw new Error('OpenAI 도구 호출 루프 최대 횟수 초과');
}

async function executeToolCall(toolCall, tavilyKey) {
  const name = toolCall?.function?.name;
  if (name === 'web_search') {
    let args = {};
    try {
      args = JSON.parse(toolCall.function.arguments || '{}');
    } catch {
      return JSON.stringify({ error: '인자 파싱 실패' });
    }
    return tavilySearch(tavilyKey, args.query || '');
  }
  return JSON.stringify({ error: `알 수 없는 도구: ${name}` });
}

function buildTools() {
  return [
    {
      type: 'function',
      function: {
        name: 'web_search',
        description:
          '최신 정보나 사실을 웹에서 검색합니다. 오늘 날짜, 날씨, 최근 뉴스, 실시간 가격 등 모델이 모를 수 있는 정보가 필요할 때 사용하세요.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '검색어 (한국어 또는 영어)',
            },
          },
          required: ['query'],
        },
      },
    },
  ];
}

// ─────────────────────────────────────────────────────────────
// 하위 API 호출 (원본 응답 반환)
// ─────────────────────────────────────────────────────────────
async function doRequestRaw(model, apiKey, messages, tools) {
  const body = {
    model,
    messages,
    max_tokens: MAX_TOKENS,
  };
  if (tools) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  let response;
  try {
    response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    throw new Error(`네트워크 오류: ${networkErr.message}`);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data?.error?.message || `HTTP ${response.status}`;
    const err = new Error(`OpenAI 오류 (${model}): ${msg}`);
    err.status = response.status;
    err.apiMessage = msg;
    throw err;
  }

  return data;
}

// "모델을 사용할 수 없음" 계열 오류 판정 (gemini.js와 동일 패턴)
function isModelUnavailableError(err) {
  if (!err) return false;
  const status = err.status;
  const msg = (err.apiMessage || err.message || '').toLowerCase();
  if (status === 404) return true;
  if (msg.includes('model') && (msg.includes('not found') || msg.includes('does not exist'))) {
    return true;
  }
  if (status === 400 && msg.includes('model')) return true;
  return false;
}
