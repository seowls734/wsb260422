import { useState } from 'react';
import { MODES } from '../config/modes.js';

export default function ModeSelect({ onStart }) {
  const [selectedId, setSelectedId] = useState(null);
  const [topic, setTopic] = useState('');

  const selected = MODES.find((m) => m.id === selectedId);

  // 시작 가능 조건: 모드 선택됐고, 토픽 필요 시 입력됨
  const canStart =
    !!selected && (!selected.requiresTopic || topic.trim().length > 0);

  function handleStart() {
    if (!canStart) return;
    onStart({
      mode: selected.id,
      topic: selected.requiresTopic ? topic.trim() : '',
    });
  }

  return (
    <div className="screen mode">
      <h1 className="heading">모드 선택</h1>
      <p className="subtext">두 AI가 어떤 방식으로 대화할지 골라주세요.</p>

      <div className="mode-grid">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`mode-card${selectedId === m.id ? ' selected' : ''}`}
            onClick={() => setSelectedId(m.id)}
          >
            <span className="emoji">{m.emoji}</span>
            <span className="title">{m.title}</span>
            <div className="desc">{m.desc}</div>
          </button>
        ))}
      </div>

      {selected?.requiresTopic && (
        <div className="field">
          <label className="label" htmlFor="topic">
            {selected.topicLabel}
          </label>
          <textarea
            id="topic"
            className="textarea"
            placeholder={selected.topicPlaceholder}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
          />
        </div>
      )}

      <div className="field">
        <button className="btn" onClick={handleStart} disabled={!canStart}>
          대화 시작
        </button>
      </div>
    </div>
  );
}
