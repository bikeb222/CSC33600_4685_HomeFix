const { buildUserPrompt, parseAiJson } = require('./promptBuilder');

async function generate({ userMessage, systemPrompt, context, conversationHistory = [], fallbackActions = [] }) {
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'gemini-1.5-flash';
  const baseUrl = process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
  const url = `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const contents = [
    ...conversationHistory.map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content }]
    })),
    {
      role: 'user',
      parts: [{ text: buildUserPrompt({ userMessage, context }) }]
    }
  ];
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { temperature: 0.2 }
    })
  });
  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}`);
  }
  const payload = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n') || '';
  return {
    ...parseAiJson(text, fallbackActions),
    provider: 'gemini',
    model
  };
}

module.exports = {
  generate
};
