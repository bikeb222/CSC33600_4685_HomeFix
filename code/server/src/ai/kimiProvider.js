const { buildUserPrompt, parseAiJson } = require('./promptBuilder');

function temperatureForModel(model) {
  return model.startsWith('kimi-k2.5') ? 1 : 0.2;
}

async function generate({ userMessage, systemPrompt, context, conversationHistory = [], fallbackActions = [] }) {
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'moonshot-v1-8k';
  const baseUrl = process.env.AI_BASE_URL || 'https://api.moonshot.ai/v1';
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map((item) => ({ role: item.role, content: item.content })),
    { role: 'user', content: buildUserPrompt({ userMessage, context }) }
  ];
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: temperatureForModel(model)
    })
  });
  if (!response.ok) {
    throw new Error(`Kimi request failed with ${response.status}`);
  }
  const payload = await response.json();
  const text = payload.choices?.[0]?.message?.content || '';
  return {
    ...parseAiJson(text, fallbackActions),
    provider: 'kimi',
    model
  };
}

module.exports = {
  generate
};
