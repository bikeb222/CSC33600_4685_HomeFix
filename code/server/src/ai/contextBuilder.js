function trimRows(rows = [], limit = 10) {
  return Array.isArray(rows) ? rows.slice(0, limit) : rows;
}

function deepTrim(value, limit = 10) {
  if (Array.isArray(value)) {
    return value.slice(0, limit).map((item) => deepTrim(item, limit));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, deepTrim(item, limit)])
    );
  }
  return value;
}

function buildContext({ role, intent, faqMatches = [], data = {}, metrics = null }) {
  const safeData = {};
  Object.entries(data || {}).forEach(([key, value]) => {
    safeData[key] = deepTrim(value);
  });

  return {
    role,
    intent,
    faq_matches: faqMatches.map((faq) => ({
      id: faq.id,
      category: faq.category,
      answer: faq.answer,
      related_actions: faq.related_actions || []
    })),
    ...(role === 'receiver' ? { receiver_data: safeData } : { analytics: safeData }),
    ...(metrics ? { metrics } : {}),
    rules: role === 'receiver'
      ? [
        'Only answer about the current receiver data included here.',
        'receiver_context contains the receiver own safe account snapshot and public provider/service information.',
        'If the classified intent is fallback, still answer from receiver_context when it contains relevant data.',
        'Do not reveal other receivers private data.',
        'Do not invent appointments, payments, addresses, or reviews.'
      ]
      : [
        'Summarize only based on the analytics object included here.',
        'manager_context contains a safe operational snapshot for common manager questions.',
        'If the classified intent is fallback, still answer from manager_context when it contains relevant data.',
        'Do not invent missing metrics.',
        'Do not claim to update the database.'
      ]
  };
}

function compactConversation(conversation = []) {
  return conversation
    .filter((item) => ['user', 'assistant'].includes(item?.role) && typeof item.content === 'string')
    .slice(-8)
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, 1200)
    }));
}

module.exports = {
  deepTrim,
  buildContext,
  compactConversation
};
