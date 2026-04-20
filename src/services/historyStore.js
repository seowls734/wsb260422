// 대화 이력 로컬 저장 유틸.
// 마지막 세션 하나만 저장하며, Chat 진입 시 mode+topic이 일치할 때만 복원합니다.

const KEY = 'ai_chat_pwa_last_session';

export const historyStore = {
  /**
   * @param {{mode: string, topic: string, messages: Array}} session
   */
  save(session) {
    try {
      const payload = {
        mode: session.mode,
        topic: session.topic ?? '',
        messages: session.messages ?? [],
        savedAt: Date.now(),
      };
      localStorage.setItem(KEY, JSON.stringify(payload));
    } catch {
      // QuotaExceededError 등은 무시(이력 저장은 부가 기능)
    }
  },

  /**
   * @returns {null | {mode: string, topic: string, messages: Array, savedAt: number}}
   */
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (!Array.isArray(parsed.messages)) return null;
      return parsed;
    } catch {
      return null;
    }
  },

  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // 무시
    }
  },
};
