const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const TOKEN_KEY = 'homefix_token';

async function sendAiMessage(path, message, conversation) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ message, conversation })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || 'AI request failed');
  }
  return payload;
}

export function sendReceiverAiMessage(message, conversation = []) {
  return sendAiMessage('/ai/receiver/chat', message, conversation);
}

export function sendManagerAiMessage(message, conversation = []) {
  return sendAiMessage('/ai/manager/chat', message, conversation);
}
