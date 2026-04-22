// Tavily 검색 호출 (Cloudflare Worker 경유).
// - 실제 API 키는 Worker의 TAVILY_API_KEY secret에 저장.
// - 실패해도 throw하지 않고 에러 정보를 JSON 문자열로 반환하여 GPT가 상황을 인식하도록 함.

import { WORKER_URL } from './apiBase.js';

/**
 * 웹 검색을 수행하고 OpenAI tool 응답으로 쓸 JSON 문자열을 반환합니다.
 * @param {string} query - 검색어
 * @returns {Promise<string>} - tool 메시지 content로 들어갈 JSON 문자열
 */
export async function tavilySearch(query) {
  if (!WORKER_URL) {
    return JSON.stringify({ error: 'Worker URL 미설정' });
  }
  if (!query || !query.trim()) {
    return JSON.stringify({ error: '빈 검색어' });
  }

  let response;
  try {
    response = await fetch(`${WORKER_URL}/tavily`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
  } catch (err) {
    return JSON.stringify({ error: `네트워크 오류: ${err.message}` });
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return JSON.stringify({
      error: data?.detail || data?.error || `Tavily HTTP ${response.status}`,
    });
  }

  // GPT가 바로 읽을 수 있는 간결한 형태로 정리
  return JSON.stringify({
    query,
    answer: data.answer || null,
    results: (data.results || []).slice(0, 5).map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
    })),
  });
}
