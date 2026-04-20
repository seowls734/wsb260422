// API 호출용 공용 재시도 헬퍼.
// - 지수 백오프: 2초 → 4초 → 8초 (최대 3회 재시도)
// - 재시도 대상: 503/429, 또는 "overloaded/high demand/unavailable/quota/rate limit" 메시지
// - onRetry 콜백으로 각 재시도 시도마다 상태를 알릴 수 있음(UI 표시용)

const RETRY_DELAYS = [2000, 4000, 8000]; // 재시도 3회

/**
 * 비동기 함수를 재시도 래퍼로 감쌉니다.
 *
 * @param {() => Promise<any>} fn - 실행할 비동기 함수
 * @param {Object} [opts]
 * @param {(info: {attempt:number, maxAttempts:number, delayMs:number, error:Error}) => void} [opts.onRetry]
 *        재시도 직전에 호출되는 콜백. attempt는 1부터.
 * @param {(err: Error) => boolean} [opts.isRetryable] - 재시도 여부 판정(기본: 아래 defaultIsRetryable)
 * @returns {Promise<any>}
 */
export async function withRetry(fn, opts = {}) {
  const { onRetry, isRetryable = defaultIsRetryable } = opts;
  let lastErr;

  // 총 시도 횟수 = 1(최초) + RETRY_DELAYS.length(재시도)
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const hasMore = attempt < RETRY_DELAYS.length;
      // 재시도 불가 에러이거나, 마지막 시도였다면 즉시 전파
      if (!hasMore || !isRetryable(err)) {
        throw err;
      }
      const delayMs = RETRY_DELAYS[attempt];
      onRetry?.({
        attempt: attempt + 1,
        maxAttempts: RETRY_DELAYS.length,
        delayMs,
        error: err,
      });
      await sleep(delayMs);
    }
  }
  // 이론상 도달 불가(루프 마지막에서 throw됨)
  throw lastErr;
}

// 503/429 또는 관련 키워드 포함 시 재시도
function defaultIsRetryable(err) {
  if (!err) return false;
  const status = err.status;
  if (status === 503 || status === 429) return true;

  const msg = (err.apiMessage || err.message || '').toLowerCase();
  if (msg.includes('high demand')) return true;
  if (msg.includes('overloaded')) return true;
  if (msg.includes('unavailable')) return true;
  if (msg.includes('quota')) return true;
  if (msg.includes('rate limit')) return true;
  return false;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
