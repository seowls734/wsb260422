import { useEffect, useState } from 'react';
import ModeSelect from './screens/ModeSelect.jsx';
import Chat from './screens/Chat.jsx';

// 라우터 없이 state만으로 화면 전환을 관리합니다.
// screen 값: 'mode' | 'chat'
export default function App() {
  const [screen, setScreen] = useState('mode');
  const [chatConfig, setChatConfig] = useState(null);
  // 오프라인 상태 표시
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

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
        {screen === 'mode' && (
          <ModeSelect
            onStart={(cfg) => {
              setChatConfig(cfg);
              setScreen('chat');
            }}
          />
        )}

        {screen === 'chat' && chatConfig && (
          <Chat config={chatConfig} onBack={() => setScreen('mode')} />
        )}
      </div>
    </div>
  );
}
