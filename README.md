# AI Chat PWA

GPT와 Gemini 두 AI가 서로 대화하는 것을 관전하는 Progressive Web App입니다.
모바일(iOS/Android) 홈 화면에 설치 가능하고, PC 브라우저에서도 그대로 동작합니다.

## 특징

- 🤖 **두 AI의 대화 관전**: OpenAI GPT와 Google Gemini가 번갈아가며 대화
- 💭 **세 가지 모드**: 자유 대화 / 토론(찬반) / 역할극
- 📱 **PWA**: 홈 화면에 설치해 네이티브 앱처럼 사용
- 🔒 **로컬 저장**: API 키는 브라우저 localStorage에만 저장되고 외부 서버로 전송되지 않음
- ⚡ **최소 의존성**: React + Vite + vite-plugin-pwa만 사용

## 기술 스택

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) (JavaScript)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (manifest + service worker 자동 생성)
- 순수 CSS (프레임워크 없음)
- 라우터 없음(화면은 React state로 전환)

## 시작하기

### 1. 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

기본 주소: <http://localhost:5173>

### 3. 프로덕션 빌드

```bash
npm run build
```

`dist/` 디렉토리에 빌드 결과물이 생성됩니다.
빌드 전 `prebuild` 훅으로 `scripts/gen-icons.mjs`가 자동 실행되어 PWA 아이콘을 생성합니다.

### 4. 빌드 결과 미리보기

```bash
npm run preview
```

기본 주소: <http://localhost:4173>

> PWA / Service Worker는 **빌드된 버전에서만** 동작합니다. 설치 가능 여부는 `npm run preview`에서 확인하세요.

## API 키 발급

앱 최초 실행 시 아래 두 API 키를 입력해야 합니다.

- **OpenAI**: <https://platform.openai.com/api-keys>
- **Google Gemini**: <https://aistudio.google.com/apikey>

키는 브라우저 localStorage에 저장되고, 이 앱의 서버로는 전송되지 않습니다. AI 호출 시 각 제공자(OpenAI / Google)에게 직접 전달됩니다.

> ⚠️ 브라우저에서 API를 직접 호출하는 구조상 키가 네트워크 트래픽에 노출됩니다. **개인 / 로컬 용도로만** 사용하세요. 공용 배포 시에는 백엔드 프록시를 추가하세요.

## PWA로 설치하기

### iOS (Safari)

1. Safari에서 앱 주소 열기
2. 아래 공유 버튼 탭 → **"홈 화면에 추가"**
3. 추가 → 홈 화면의 AI Chat 아이콘으로 실행

### Android (Chrome)

1. Chrome에서 앱 주소 열기
2. 우상단 메뉴(⋮) → **"앱 설치"** 또는 **"홈 화면에 추가"**
3. 설치 → 앱 서랍에서 AI Chat 실행

### 데스크톱 (Chrome / Edge)

1. 주소창 오른쪽의 **설치 아이콘** 클릭 또는 메뉴 → **"앱 설치"**
2. 독립 창에서 실행됨

## Vercel 배포

이 앱은 정적 사이트(SPA)이므로 Vercel에 매우 쉽게 배포할 수 있습니다.
GitHub 저장소에 푸시한 뒤 Vercel에서 **New Project → Import** 해주세요. Framework Preset은 **Vite**로 자동 감지되며 Build Command `npm run build`, Output `dist`가 기본값이므로 추가 설정이 필요 없습니다. 배포 후 제공되는 HTTPS 주소에서 바로 PWA 설치가 가능합니다.

## 프로젝트 구조

```
src/
  App.jsx              # 루트 컴포넌트. screen state로 화면 전환
  main.jsx             # React 렌더 엔트리
  registerSW.js        # Service Worker 등록
  screens/
    Setup.jsx          # API 키 입력 화면 (+ loadKeys, LS_KEYS export)
    ModeSelect.jsx     # 모드 선택 화면
    Chat.jsx           # 채팅/관전 화면 (핵심: runningRef 루프)
  services/
    openai.js          # callGPT - OpenAI Chat Completions 호출
    gemini.js          # callGemini - Google Gemini v1beta 호출 + 모델 폴백
  config/
    modes.js           # 모드 정의 + 시스템 프롬프트 생성
  styles/
    App.css            # 전역 스타일 (iOS 풍)
public/
  icon-192.png         # PWA 아이콘 (자동 생성)
  icon-512.png         # PWA 아이콘 (자동 생성)
scripts/
  gen-icons.mjs        # 순수 Node로 PNG 아이콘 생성
vite.config.js         # Vite + VitePWA 설정
index.html
```

## 트러블슈팅

- **빌드 후 아이콘이 깨져 보여요**: `public/icon-192.png`, `public/icon-512.png` 를 삭제한 뒤 `npm run icons` 로 다시 생성하세요.
- **Gemini 응답이 비어있다고 나와요**: 안전 필터에 걸렸을 수 있습니다. 주제를 바꿔서 다시 시도해보세요.
- **`gemini-2.5-flash` 가 없다고 나와요**: 자동으로 `gemini-1.5-flash`로 폴백됩니다. 로그를 확인하세요.
- **iOS에서 "홈 화면에 추가"가 안 보여요**: 반드시 **Safari**로 열어야 합니다. Chrome iOS는 PWA 설치를 지원하지 않습니다.
- **개발 서버에서 PWA 기능이 동작하지 않아요**: 정상입니다. `vite.config.js` 의 `devOptions.enabled` 가 `false`이기 때문입니다. `npm run preview` 에서 확인하세요.

## 라이선스

개인/학습 용도로 자유롭게 사용하세요.
