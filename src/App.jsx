import { useEffect, useState } from 'react';
import Setup, { loadKeys } from './screens/Setup.jsx';
import ModeSelect from './screens/ModeSelect.jsx';
import Chat from './screens/Chat.jsx';

// 라우터 없이 state만으로 화면 전환을 관리합니다.
// screen 값: 'setup' | 'mode' | 'chat'
export default function App() {
  const [screen, setScreen] = useState('setup');
  const [chatConfig, setChatConfig] = useState(null);
  // 오프라인 상태 표시
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  // 초기 마운트: 저장된 키가 있으면 바로 mode 화면으로
  useEffect(() => {
    const k = loadKeys();
    if (k.openai && k.gemini) {
      setScreen('mode');
    }
  }, []);

  // 온/오프라인 상태 추적
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <div className="app">
      <div style={{ width: '100%', maxWidth: 600 }}>
        {!online && (
          <div className="offline-banner">
            오프라인 상태입니다. AI 응답을 받으려면 인터넷 연결이 필요합니다.
          </div>
        )}
        {screen === 'setup' && <Setup onDone={() => setScreen('mode')} />}

        {screen === 'mode' && (
          <ModeSelect
            onStart={(cfg) => {
              setChatConfig(cfg);
              setScreen('chat');
            }}
            onGoSetup={() => setScreen('setup')}
          />
        )}

        {screen === 'chat' && chatConfig && (
          <Chat config={chatConfig} onBack={() => setScreen('mode')} />
        )}
      </div>
    </div>
  );
}
