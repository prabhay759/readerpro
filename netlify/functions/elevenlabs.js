exports.handler = async (event) => {
  const key = process.env.eleven_api_key;
  const { ep = '', vid = '' } = event.queryStringParameters || {};

  // Health check — no external call
  if (ep === 'health') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: !!key })
    };
  }

  if (!key) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'ElevenLabs not configured — set eleven_api_key in Netlify env vars' })
    };
  }

  let url, method, reqHeaders, body;

  if (ep === 'models') {
    url = 'https://api.elevenlabs.io/v1/models';
    method = 'GET';
    reqHeaders = { 'xi-api-key': key };

  } else if (ep === 'tts' && vid) {
    url = `https://api.elevenlabs.io/v1/text-to-speech/${vid}`;
    method = 'POST';
    reqHeaders = { 'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' };
    body = event.body;

  } else if (ep === 'add') {
    // FormData voice clone upload — forward raw multipart body
    url = 'https://api.elevenlabs.io/v1/voices/add';
    method = 'POST';
    const ct = event.headers['content-type'] || event.headers['Content-Type'] || '';
    reqHeaders = { 'xi-api-key': key, 'Content-Type': ct };
    body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;

  } else if (ep === 'del' && vid) {
    url = `https://api.elevenlabs.io/v1/voices/${vid}`;
    method = 'DELETE';
    reqHeaders = { 'xi-api-key': key };

  } else {
    return { statusCode: 400, body: 'Unknown endpoint' };
  }

  try {
    const res = await fetch(url, { method, headers: reqHeaders, body });
    const contentType = res.headers.get('content-type') || 'application/json';

    if (contentType.includes('audio') || contentType.includes('octet-stream')) {
      const buf = Buffer.from(await res.arrayBuffer());
      return {
        statusCode: res.status,
        headers: { 'Content-Type': contentType },
        body: buf.toString('base64'),
        isBase64Encoded: true
      };
    }

    const text = await res.text();
    return {
      statusCode: res.status,
      headers: { 'Content-Type': contentType },
      body: text
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
