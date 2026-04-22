# wsb260422-api (Cloudflare Worker)

프론트엔드(GitHub Pages)가 API 키 없이 호출할 수 있도록 OpenAI / Gemini / Tavily를 중계하는 Worker입니다.

## 초기 배포

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put TAVILY_API_KEY   # 선택
npx wrangler deploy
```

배포 후 출력되는 URL(예: `https://wsb260422-api.<subdomain>.workers.dev`)을 프론트엔드 빌드 환경변수 `VITE_WORKER_URL` 로 지정하세요. GitHub Actions 워크플로우(`.github/workflows/deploy.yml`) 의 env에 하드코딩하거나 repo secret에 넣어 사용합니다.

## 엔드포인트

- `POST /openai` — OpenAI Chat Completions로 전달 (Authorization 헤더 자동 주입)
- `POST /gemini/{model}` — Gemini `generateContent`로 전달 (API 키 쿼리 주입)
- `POST /tavily` — Tavily search로 전달 (`api_key` 주입)

Origin이 `seowls734.github.io` / `localhost:5173,4173` 이 아니면 403 반환.

## 보안 참고

- CORS는 Origin 기반 허용. 브라우저 외 클라이언트(curl 등)는 Origin을 위조 가능하므로, 본격적인 악용 방지를 위해서는 Cloudflare WAF 레이트 리밋 / Turnstile / KV 기반 per-IP 카운터 등을 추가로 붙여야 합니다.
