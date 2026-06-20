exports.handler = async (event) => {
  const key = process.env.ai_api_key;

  // Health check — no external call, just confirms key is configured
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: !!key })
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  if (!key) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: 'AI key not configured — set ai_api_key in Netlify env vars' } })
    };
  }

  try {
    const { messages, system, max_tokens } = JSON.parse(event.body || '{}');
    const res = await fetch('https://aki.io/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: max_tokens || 1000,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          ...messages
        ]
      })
    });
    const data = await res.json();
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: { message: e.message } })
    };
  }
};
