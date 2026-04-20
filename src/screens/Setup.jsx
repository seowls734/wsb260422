import { useEffect, useState } from 'react';

// localStorage 키 상수(오타 방지)
export const LS_KEYS = {
  openai: 'ai_chat_pwa_openai_key',
  gemini: 'ai_chat_pwa_gemini_key',
  tavily: 'ai_chat_pwa_tavily_key',
};

// 저장된 키 읽기 유틸(다른 화면에서도 사용)
export function loadKeys() {
  return {
    openai: localStorage.getItem(LS_KEYS.openai) || '',
    gemini: localStorage.getItem(LS_KEYS.gemini) || '',
    tavily: localStorage.getItem(LS_KEYS.tavily) || '',
  };
}

export default function Setup({ onDone }) {
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [tavilyKey, setTavilyKey] = useState('');

  useEffect(() => {
    const k = loadKeys();
    setOpenaiKey(k.openai);
    setGeminiKey(k.gemini);
    setTavilyKey(k.tavily);
  }, []);

  // OpenAI + Gemini만 필수. Tavily는 선택(없으면 GPT 웹 검색만 비활성화).
  const canSave = openaiKey.trim().length > 0 && geminiKey.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    localStorage.setItem(LS_KEYS.openai, openaiKey.trim());
    localStorage.setItem(LS_KEYS.gemini, geminiKey.trim());

    const tv = tavilyKey.trim();
    if (tv) {
      localStorage.setItem(LS_KEYS.tavily, tv);
    } else {
      localStorage.removeItem(LS_KEYS.tavily);
    }

    onDone();
  }

  return (
    <div className="screen setup">
      <h1 className="heading">AI Chat 설정</h1>
      <p className="subtext">
        나와 GPT, Gemini 셋이서 채팅하는 앱입니다. 사용하려면 아래 API 키가 필요합니다.
      </p>

      <div className="field">
        <label className="label" htmlFor="openai-key">
          OpenAI API 키 (필수)
        </label>
        <input
          id="openai-key"
          className="input"
          type="password"
          autoComplete="off"
          placeholder="sk-..."
          value={openaiKey}
          onChange={(e) => setOpenaiKey(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="gemini-key">
          Google Gemini API 키 (필수)
        </label>
        <input
          id="gemini-key"
          className="input"
          type="password"
          autoComplete="off"
          placeholder="AIza..."
          value={geminiKey}
          onChange={(e) => setGeminiKey(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="tavily-key">
          Tavily API 키 (선택)
        </label>
        <input
          id="tavily-key"
          className="input"
          type="password"
          autoComplete="off"
          placeholder="tvly-..."
          value={tavilyKey}
          onChange={(e) => setTavilyKey(e.target.value)}
        />
        <p className="subtext" style={{ marginTop: 6, fontSize: 12 }}>
          없으면 GPT의 웹 검색 기능만 비활성화됩니다. Gemini는 Google 검색이 내장되어 있어 영향 없음.
        </p>
      </div>

      <hr className="divider" />

      <div className="info-box">
        키는 브라우저(localStorage)에만 저장되고, 이 앱의 서버로 전송되지 않습니다. AI
        API 호출 시에만 각 제공자(OpenAI / Google / Tavily)에게 직접 전달됩니다.
      </div>

      <div className="field">
        <p className="label">API 키 발급</p>
        <ul className="link-list">
          <li>
            OpenAI:{' '}
            <a
              className="link"
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noreferrer noopener"
            >
              platform.openai.com/api-keys
            </a>
          </li>
          <li>
            Gemini:{' '}
            <a
              className="link"
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer noopener"
            >
              aistudio.google.com/apikey
            </a>
          </li>
          <li>
            Tavily:{' '}
            <a
              className="link"
              href="https://tavily.com"
              target="_blank"
              rel="noreferrer noopener"
            >
              tavily.com
            </a>{' '}
            (무료 1000회/월)
          </li>
        </ul>
      </div>

      <div className="field">
        <button className="btn" onClick={handleSave} disabled={!canSave}>
          저장하고 시작하기
        </button>
      </div>
    </div>
  );
}
