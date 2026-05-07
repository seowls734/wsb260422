// Vercel 서버리스 프록시 — OpenAI API 호출을 서버 사이드에서 대신 수행합니다.
// 브라우저가 직접 api.openai.com 을 호출하면 모바일에서 CORS/네트워크 차단이 발생하기 때문에
// 브라우저 → 이 함수 → OpenAI 로 중계합니다. apiKey는 body에 담아 보내고 여기서 꺼냅니다.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const { apiKey, ...body } = req.body ?? {};
  if (!apiKey) {
    res.status(400).json({ error: { message: 'apiKey required' } });
    return;
  }

  let upstream;
  try {
    upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    res.status(502).json({ error: { message: err.message } });
    return;
  }

  const data = await upstream.json().catch(() => ({}));
  res.status(upstream.status).json(data);
};
