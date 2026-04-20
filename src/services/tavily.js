// Tavily 검색 API 호출.
// - 엔드포인트: POST https://api.tavily.com/search
// - 무료 티어 1000회/월. API 키는 사용자가 Setup 화면에서 입력.
// - 실패해도 throw하지 않고 에러 정보를 JSON 문자열로 반환하여 GPT가 상황을 인식하도록 함.

const TAVILY_URL = 'https://api.tavily.com/search';

/**
 * 웹 검색을 수행하고 OpenAI tool 응답으로 쓸 JSON 문자열을 반환합니다.
 * @param {string} apiKey - Tavily API 키
 * @param {string} query - 검색어
 * @returns {Promise<string>} - tool 메시지 content로 들어갈 JSON 문자열
 */
export async function tavilySearch(apiKey, query) {
  if (!apiKey) {
    return JSON.stringify({ error: 'Tavily API 키 없음' });
  }
  if (!query || !query.trim()) {
    return JSON.stringify({ error: '빈 검색어' });
  }

  let response;
  try {
    response = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: 5,
        search_depth: 'basic',
        include_answer: true,
      }),
    });
  } catch (err) {
    return JSON.stringify({ error: `네트워크 오류: ${err.message}` });
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return JSON.stringify({
      error: data?.detail || `Tavily HTTP ${response.status}`,
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
