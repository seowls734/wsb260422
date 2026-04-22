// Worker 프록시 베이스 URL.
// 빌드 시 VITE_WORKER_URL 환경변수로 주입됩니다.
// 개발 중에는 .env.local, 배포 시에는 GitHub Actions env로.

const raw = import.meta.env.VITE_WORKER_URL;

if (!raw) {
  // 빌드에 섞이지만 경고 용도로만 사용. 호출 시점에 에러를 던져 디버깅 쉽게.
  console.warn('[apiBase] VITE_WORKER_URL이 설정되지 않았습니다.');
}

export const WORKER_URL = (raw || '').replace(/\/$/, '');

export function requireWorkerUrl() {
  if (!WORKER_URL) {
    throw new Error('VITE_WORKER_URL이 설정되지 않아 API를 호출할 수 없습니다.');
  }
  return WORKER_URL;
}
