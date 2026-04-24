import { useEffect, useRef, useState } from 'react';
import { callGPT } from '../services/openai.js';
import { callGemini } from '../services/gemini.js';
import { buildSystemPrompt, modeTitle } from '../config/modes.js';
import { loadKeys } from './Setup.jsx';
import { historyStore } from '../services/historyStore.js';

// 사용자 → GPT → Gemini 순차 진행. GPT 답변 후 Gemini 호출 전 대기 시간.
const INTER_TURN_DELAY = 1000;

export default function Chat({ config, onBack }) {
  const { mode, topic } = config;

  // 대화 이력: [{ speaker: 'gpt'|'gemini'|'user', text, error? }]
  const [messages, setMessages] = useState([]);
  // 지금 응답 대기 중인 화자(한 번에 1명). 'gpt' | 'gemini' | null
  const [pendingSpeaker, setPendingSpeaker] = useState(null);
  // 재시도 상태 텍스트 맵. { gpt?: string, gemini?: string }
  const [retryStatus, setRetryStatus] = useState({});
  // 입력값
  const [input, setInput] = useState('');
  // 전송 중(입력창 잠금)
  const [busy, setBusy] = useState(false);

  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 자동 스크롤 기준점
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, pendingSpeaker]);

  // ── 이력 복원: 마운트 시 mode+topic 일치하면 이어서 ──
  // StrictMode에서 2회 실행되지만 같은 값을 setMessages → React가 dedupe
  useEffect(() => {
    const saved = historyStore.load();
    if (saved && saved.mode === mode && (saved.topic || '') === (topic || '')) {
      setMessages(saved.messages || []);
    }
    // eslint 기준에서 mode/topic 의존성 경고 가능하지만 의도적으로 1회만 로드
    // (중간에 mode/topic이 바뀌는 시나리오 없음 - Chat 화면은 mount당 고정)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 이력 저장: messages 변할 때마다 저장 ──
  useEffect(() => {
    historyStore.save({ mode, topic: topic || '', messages });
  }, [messages, mode, topic]);

  async function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // ── 재시도 상태 유틸 ──
  function makeRetryHandler(speaker) {
    return ({ attempt, maxAttempts, delayMs }) => {
      const name = speaker === 'gpt' ? 'GPT' : 'Gemini';
      const sec = Math.round(delayMs / 1000);
      setRetryStatus((prev) => ({
        ...prev,
        [speaker]: `⏳ ${name} 재시도 중... (${attempt}/${maxAttempts}, ${sec}초 후)`,
      }));
    };
  }
  function clearRetryStatus(speaker) {
    setRetryStatus((prev) => {
      const next = { ...prev };
      delete next[speaker];
      return next;
    });
  }

  // ── 메인: 사용자 메시지 전송 → GPT → Gemini ──
  async function handleSend() {
    const text = input.trim();
    if (!text || busy) return;

    const { openai, gemini, tavily } = loadKeys();
    if (!openai || !gemini) {
      alert('API 키가 설정되어 있지 않습니다. 먼저 API 키를 입력해주세요.');
      return;
    }

    // 1) 사용자 메시지 추가
    const userMsg = { speaker: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setBusy(true);

    try {
      // 2) GPT 턴
      setPendingSpeaker('gpt');
      const gptSys = buildSystemPrompt(mode, topic, 'gpt');
      const historyForGpt = [...messagesRef.current, userMsg];
      let gptResult;
      try {
        gptResult = await callGPT(openai, gptSys, historyForGpt, {
          onRetry: makeRetryHandler('gpt'),
          tavilyKey: tavily || null,
        });
      } finally {
        clearRetryStatus('gpt');
      }
      setMessages((prev) => [
        ...prev,
        {
          speaker: 'gpt',
          text: gptResult.text,
          usedSearch: gptResult.usedSearch,
          sources: gptResult.sources,
        },
      ]);

      // 3) 턴 사이 딜레이
      setPendingSpeaker(null);
      await sleep(INTER_TURN_DELAY);

      // 4) Gemini 턴 - 사용자 + GPT 답변 전체 이력 전달
      setPendingSpeaker('gemini');
      const geminiSys = buildSystemPrompt(mode, topic, 'gemini');
      const historyForGemini = messagesRef.current;
      let geminiResult;
      try {
        geminiResult = await callGemini(gemini, geminiSys, historyForGemini, {
          onRetry: makeRetryHandler('gemini'),
        });
      } finally {
        clearRetryStatus('gemini');
      }
      setMessages((prev) => [
        ...prev,
        {
          speaker: 'gemini',
          text: geminiResult.text,
          usedSearch: geminiResult.usedSearch,
          sources: geminiResult.sources,
        },
      ]);
    } catch (err) {
      // 현재 대기 중인 화자의 자리에 에러 버블
      const speaker = pendingSpeakerRef.current || 'gpt';
      setMessages((prev) => [
        ...prev,
        { speaker, text: `⚠️ ${err.message}`, error: true },
      ]);
      alert(err.message);
    } finally {
      setPendingSpeaker(null);
      setBusy(false);
    }
  }

  // pendingSpeaker를 catch에서 참조하기 위한 ref 동기화
  const pendingSpeakerRef = useRef(pendingSpeaker);
  useEffect(() => {
    pendingSpeakerRef.current = pendingSpeaker;
  }, [pendingSpeaker]);

  function handleInputKeyDown(e) {
    // Enter 전송, Shift+Enter 줄바꿈
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleReset() {
    if (busy) {
      if (!confirm('응답 대기 중입니다. 그래도 초기화할까요?')) return;
    }
    setMessages([]);
    setPendingSpeaker(null);
    setRetryStatus({});
    setInput('');
    setBusy(false);
    historyStore.clear();
  }

  function handleBack() {
    onBack();
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="screen chat">
      <div className="chat-header">
        <button className="icon-btn" onClick={handleBack} aria-label="뒤로">
          ←
        </button>
        <div className="title">{modeTitle(mode)}</div>
        <button className="icon-btn" onClick={handleReset} aria-label="초기화">
          🗑
        </button>
      </div>

      <div className="chat-body">
        {isEmpty && !pendingSpeaker && (
          <p className="subtext" style={{ textAlign: 'center', marginTop: 40 }}>
            아래 입력창에 메시지를 보내면 GPT와 Gemini가 차례로 답변합니다.
          </p>
        )}

        {messages.map((m, i) => (
          <Bubble
            key={i}
            speaker={m.speaker}
            text={m.text}
            error={m.error}
            usedSearch={m.usedSearch}
            sources={m.sources}
          />
        ))}

        {pendingSpeaker && (
          <Bubble
            speaker={pendingSpeaker}
            text={
              retryStatus[pendingSpeaker] ||
              (pendingSpeaker === 'gpt'
                ? '🟢 GPT 답변 중...'
                : '🔵 Gemini 답변 중...')
            }
            loading
          />
        )}

        <div ref={endRef} />
      </div>

      <div className="chat-footer">
        <div className="inner">
          <div className="ask-input-row">
            <textarea
              className="textarea ask-input"
              placeholder={
                busy
                  ? '답변 받는 중...'
                  : '메시지 보내기 (Enter 전송, Shift+Enter 줄바꿈)'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              rows={1}
              disabled={busy}
            />
            <button
              className="btn ask-send"
              onClick={handleSend}
              disabled={busy || input.trim().length === 0}
            >
              {busy ? '…' : '전송'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ speaker, text, error, loading, usedSearch, sources }) {
  const labelMap = { gpt: '🟢 GPT', gemini: '🔵 Gemini', user: '🧑 나' };
  const label = labelMap[speaker] || speaker;
  const classes = ['bubble', speaker];
  if (error) classes.push('error');
  if (loading) classes.push('loading');

  const showFooter = !loading && !error && (usedSearch || (sources && sources.length > 0));

  return (
    <div className={`bubble-row ${speaker}`}>
      <div className="bubble-label">{label}</div>
      <div className={classes.join(' ')}>{text}</div>
      {showFooter && (
        <div className={`bubble-footer ${speaker}`}>
          {usedSearch && <span className="search-badge">🔍 웹 검색 사용</span>}
          {sources && sources.length > 0 && (
            <div className="source-links">
              {sources.map((s, i) => (
                <a
                  key={i}
                  className="source-link"
                  href={s.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={s.title || s.url}
                >
                  {hostOf(s.url)}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// URL에서 호스트명만 추출 (실패 시 원본 반환)
function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
