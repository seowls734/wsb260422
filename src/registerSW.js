// vite-plugin-pwa가 제공하는 가상 모듈로 Service Worker를 등록합니다.
// autoUpdate 모드에서는 새 SW가 감지되면 자동으로 활성화됩니다.
import { registerSW } from 'virtual:pwa-register';

registerSW({
  immediate: true,
  onRegisteredSW(swUrl) {
    // 개발 시 로그 확인용
    console.log('[PWA] Service Worker 등록됨:', swUrl);
  },
  onOfflineReady() {
    console.log('[PWA] 오프라인 사용 준비 완료');
  },
});
