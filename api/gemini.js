// Vercel 서버리스 프록시 — Gemini API 호출을 서버 사이드에서 대신 수행합니다.
// 브라우저 → 이 함수 → generativelanguage.googleapis.com 로 중계합니다.
// apiKey와 model은 body에 담아 보내고 여기서 꺼냅니다.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const { apiKey, model, ...body } = req.body ?? {};
  if (!apiKey || !model) {
    res.status(400).json({ error: { message: 'apiKey and model required' } });
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let upstream;
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    res.status(502).json({ error: { message: err.message } });
    return;
  }

  const data = await upstream.json().catch(() => ({}));
  res.status(upstream.status).json(data);
};
