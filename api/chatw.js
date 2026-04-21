export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  const apiKey = process.env.GEMINI_API_KEY;
  
  // Debug: log what we have
  console.log('API Key present:', !!apiKey);
  console.log('API Key prefix:', apiKey ? apiKey.substring(0, 8) + '...' : 'MISSING');
  console.log('Request body keys:', Object.keys(req.body || {}));

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not found in environment' });
  }

  try {
    const { system, messages, max_tokens } = req.body;

    console.log('Messages count:', messages?.length);
    console.log('System prompt length:', system?.length);

    const geminiContents = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const body = {
      system_instruction: system ? { parts: [{ text: system }] } : undefined,
      contents: geminiContents,
      generationConfig: {
        maxOutputTokens: max_tokens || 1000,
        temperature: 0.9
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    console.log('Calling Gemini URL (no key):', url.split('?')[0]);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    console.log('Gemini status:', response.status);

    const data = await response.json();
    console.log('Gemini response:', JSON.stringify(data).substring(0, 300));

    if (!response.ok) {
      return res.status(500).json({ 
        error: 'Gemini API error', 
        status: response.status,
        detail: data 
      });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, can you say that again?";
    return res.status(200).json({
      content: [{ type: 'text', text }]
    });

  } catch (err) {
    console.error('Proxy catch error:', err);
    return res.status(500).json({ error: 'Proxy error', detail: err.message, stack: err.stack });
  }
}
