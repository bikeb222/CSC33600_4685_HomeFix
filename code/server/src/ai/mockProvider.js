const { parseAiJson } = require('./promptBuilder');

function summarizeValue(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return 'No matching records were found.';
    return value.slice(0, 5).map((row) => Object.entries(row).map(([key, item]) => `${key}: ${item}`).join(', ')).join('\n');
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([key, item]) => `${key}: ${item}`).join(', ');
  }
  return String(value ?? 'No data found.');
}

function answerFromContext(context) {
  const sections = context.role === 'manager' ? context.analytics : context.receiver_data;
  const entries = Object.entries(sections || {});
  if (entries.length > 0) {
    const [name, value] = entries[0];
    return `Here is what I found for ${name.replaceAll('_', ' ')}:\n${summarizeValue(value)}`;
  }
  if (context.faq_matches?.length) {
    return context.faq_matches[0].answer;
  }
  return context.role === 'manager'
    ? 'I could not match that to a supported analytics question. Try asking about revenue, appointments, providers, services, payments, or reviews.'
    : 'I could not find a specific answer. Try asking about bookings, appointments, payments, addresses, providers, services, or reviews.';
}

async function generate({ context, fallbackActions = [] }) {
  return {
    answer: answerFromContext(context),
    suggested_actions: fallbackActions,
    provider: 'mock',
    model: 'local-template'
  };
}

module.exports = {
  generate,
  parseAiJson
};
